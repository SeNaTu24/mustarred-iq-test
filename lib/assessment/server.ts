import "server-only";

import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAssessmentItemResult } from "./item-result";
import { getAssessmentQuestionSet } from "./question-sets";
import { DEMO_QUESTION_SET_VERSION as V2_QUESTION_SET_VERSION } from "./demo-question-bank";

type PersistedAssessmentResult = {
  total_correct: number;
  percentage: number;
  outcome: "PASS" | "FAIL";
  round_1_correct: number;
  round_2_correct: number;
  round_3_correct: number;
  round_4_correct: number;
  round_5_correct: number;
  answered_count: number;
  unanswered_count: number;
  behavioral_answered_count?: number;
  behavioral_unanswered_count?: number;
  question_set_version: string;
  scoring_rule_version: string;
  calculated_at: string;
};

function presentAssessmentResult(data: PersistedAssessmentResult) {
  return {
    totalCorrect: data.total_correct,
    percentage: data.percentage,
    outcome: data.outcome,
    answeredCount: data.answered_count,
    unansweredCount: data.unanswered_count,
    behavioralAnsweredCount: data.behavioral_answered_count ?? 0,
    behavioralUnansweredCount: data.behavioral_unanswered_count ?? 0,
    questionSetVersion: data.question_set_version,
    scoringRuleVersion: data.scoring_rule_version,
    calculatedAt: data.calculated_at,
    rounds: [
      { round: 1, correct: data.round_1_correct },
      { round: 2, correct: data.round_2_correct },
      { round: 3, correct: data.round_3_correct },
      { round: 4, correct: data.round_4_correct },
      { round: 5, correct: data.round_5_correct },
    ],
  };
}

export async function authenticateCandidate(request: Request): Promise<
  | { user: User; error?: never }
  | { user?: never; error: Response }
> {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return {
      error: Response.json(
        { error: "Register and verify your email before continuing." },
        { status: 401 },
      ),
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    return {
      error: Response.json(
        { error: "Your session is invalid or expired. Sign in again." },
        { status: 401 },
      ),
    };
  }
  if (!data.user.email_confirmed_at) {
    return {
      error: Response.json(
        { error: "Verify your email before continuing." },
        { status: 403 },
      ),
    };
  }
  return { user: data.user };
}

export async function authenticateRecruiter(request: Request): Promise<
  | { user: User; error?: never }
  | { user?: never; error: Response }
> {
  const auth = await authenticateCandidate(request);
  if (auth.error) return auth;
  const roles = auth.user.app_metadata?.roles;
  if (
    auth.user.app_metadata?.role !== "recruiter" &&
    !(Array.isArray(roles) && roles.includes("recruiter"))
  ) {
    return {
      error: Response.json(
        { error: "Recruiter access is required." },
        { status: 403 },
      ),
    };
  }
  return { user: auth.user };
}

export async function getOwnedAttempt(candidateId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Candidate lookup failed: ${candidateError.message}`);
  }
  if (!candidate) return { supabase, attempt: null, error: null };

  const { data: attempt, error } = await supabase
    .from("assessment_attempts")
    .select("id, candidate_id, status, started_at, deadline_at, question_set_version")
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (error) {
    throw new Error(`Attempt lookup failed: ${error.message}`);
  }
  return { supabase, attempt, error: null };
}

export async function finalizeAttempt(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  attemptId: string,
  status: "submitted" | "expired",
) {
  const { data, error } = await supabase.rpc("finalize_assessment_attempt", {
    requested_attempt_id: attemptId,
    requested_terminal_status: status,
  });
  if (error || typeof data !== "string") {
    throw new Error(
      `Attempt finalization failed: ${error?.message ?? "unexpected result"}`,
    );
  }
}

export async function calculateAndSaveResult(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  attemptId: string,
) {
  const { data: attempt, error: attemptError } = await supabase
    .from("assessment_attempts")
    .select("question_set_version")
    .eq("id", attemptId)
    .single();
  if (attemptError || !attempt) {
    throw new Error(`Attempt version lookup failed: ${attemptError?.message ?? "no attempt"}`);
  }
  const questionSet = getAssessmentQuestionSet(attempt.question_set_version);
  if (!questionSet) {
    throw new Error(`Unsupported assessment question set: ${attempt.question_set_version}`);
  }
  const usesV2Schema = questionSet.version === V2_QUESTION_SET_VERSION;

  const { error: unansweredError } = await supabase.rpc(
    "record_unanswered_demo_items",
    {
      requested_attempt_id: attemptId,
      requested_question_ids: questionSet.questions.map((question) => question.id),
    },
  );
  if (unansweredError) {
    throw new Error(`Unanswered-item persistence failed: ${unansweredError.message}`);
  }

  const { data: existingResult, error: existingResultError } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  if (existingResultError) {
    throw new Error(`Existing result lookup failed: ${existingResultError.message}`);
  }
  if (existingResult) {
    return presentAssessmentResult(existingResult as PersistedAssessmentResult);
  }

  const { data: answerRows, error: answerError } = await supabase
    .from("assessment_answers")
    .select("question_id, response")
    .eq("attempt_id", attemptId);
  if (answerError) {
    throw new Error(`Answer retrieval failed: ${answerError.message}`);
  }

  const responses = new Map<string, unknown>();
  for (const row of answerRows ?? []) {
    responses.set(row.question_id, row.response);
  }
  const scored = questionSet.scoreResponses(responses);
  const itemResults = questionSet.questions.map((question) => {
    const response = responses.get(question.id) ?? { unanswered: true };
    const isUnanswered =
      typeof response === "object" &&
      response !== null &&
      !Array.isArray(response) &&
      (response as Record<string, unknown>).unanswered === true;
    const isBehavioral = question.scoringType === "behavioral";
    const correct = !isBehavioral && !isUnanswered &&
      questionSet.scoreResponse(question.id, response);
    return createAssessmentItemResult({
      attemptId,
      question,
      response,
      isCorrect: correct,
      scoringExplanation: isBehavioral
        ? "Unscored work-style response. Recorded for descriptive review only."
        : questionSet.explanation(question.id),
      questionSetVersion: questionSet.version,
      scoringRuleVersion: questionSet.scoringRuleVersion,
      includeScoringType: usesV2Schema,
    });
  });
  const hasResponse = (questionId: string) => {
    const response = responses.get(questionId);
    return response !== undefined &&
      !(
        typeof response === "object" &&
        response !== null &&
        !Array.isArray(response) &&
        (response as Record<string, unknown>).unanswered === true
      );
  };
  const answeredCount = questionSet.questions.filter(
    (question) => question.scoringType === "objective" && hasResponse(question.id),
  ).length;
  const behavioralAnsweredCount = questionSet.questions.filter(
    (question) => question.scoringType === "behavioral" && hasResponse(question.id),
  ).length;
  const objectiveQuestionCount = questionSet.questions.filter(
    (question) => question.scoringType === "objective",
  ).length;
  const behavioralQuestionCount = questionSet.questions.filter(
    (question) => question.scoringType === "behavioral",
  ).length;
  const { error: itemResultError } = await supabase
    .from("assessment_item_results")
    .upsert(itemResults, {
      onConflict: "attempt_id,question_id",
      ignoreDuplicates: true,
    });
  if (itemResultError) {
    throw new Error(`Question-level result persistence failed: ${itemResultError.message}`);
  }

  const resultInsert = {
    attempt_id: attemptId,
    question_set_version: questionSet.version,
    scoring_rule_version: questionSet.scoringRuleVersion,
    answered_count: answeredCount,
    unanswered_count: objectiveQuestionCount - answeredCount,
    total_correct: scored.totalCorrect,
    round_1_correct: scored.rounds[0].correct,
    round_2_correct: scored.rounds[1].correct,
    round_3_correct: scored.rounds[2].correct,
    round_4_correct: scored.rounds[3].correct,
    round_5_correct: scored.rounds[4].correct,
    percentage: scored.percentage,
    outcome: scored.outcome,
    ...(usesV2Schema
      ? {
          behavioral_answered_count: behavioralAnsweredCount,
          behavioral_unanswered_count:
            behavioralQuestionCount - behavioralAnsweredCount,
        }
      : {}),
  };
  const { error: insertResultError } = await supabase
    .from("assessment_results")
    .insert(resultInsert);
  if (insertResultError && insertResultError.code !== "23505") {
    throw new Error(`Result persistence failed: ${insertResultError.message}`);
  }

  const { data, error } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("attempt_id", attemptId)
    .single();
  if (error || !data) {
    throw new Error(`Saved result retrieval failed: ${error?.message ?? "no result"}`);
  }
  return presentAssessmentResult(data as PersistedAssessmentResult);
}

export function isDemoAttempt(attempt: { question_set_version: string }) {
  return getAssessmentQuestionSet(attempt.question_set_version) !== null;
}
