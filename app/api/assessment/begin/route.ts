import { randomInt } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadRcapQuestionBank } from "@/lib/assessment/rcap-bank";
import { RcapBankSourceError } from "@/lib/assessment/rcap-bank-source";
import {
  allocateUniqueRcapAssignment,
  type RcapAssignment,
} from "@/lib/assessment/rcap-assignment";

const MAX_ASSIGNMENT_ATTEMPTS = 40;

type AttemptSummary = {
  id: string;
  status: string;
  started_at: string;
  deadline_at: string;
  question_set_version: string;
};

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isAssignmentFingerprintCollision(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("assessment_attempts_assignment_fingerprint_unique");
}

async function reserveRcapAttempt(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  candidateId: string,
  assignment: RcapAssignment,
  fingerprint: string,
) {
  const { data: attemptId, error: beginError } = await supabase.rpc(
    "begin_rcap_assessment_attempt",
    {
      requested_candidate_id: candidateId,
      requested_question_ids: assignment.questionIds,
      requested_option_orders: assignment.optionOrders,
      requested_assignment_fingerprint: fingerprint,
    },
  );

  if (beginError?.code === "23505") {
    const { data: existingAttempt, error: lookupError } = await supabase
      .from("assessment_attempts")
      .select("id, status, started_at, deadline_at, question_set_version")
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (lookupError) {
      console.error("Existing candidate attempt lookup failed:", lookupError.message);
      throw new Error("Existing assessment attempt lookup failed.");
    }
    if (existingAttempt) {
      return { kind: "existing" as const, value: existingAttempt as AttemptSummary };
    }
    if (isAssignmentFingerprintCollision(beginError)) {
      return { kind: "duplicate" as const };
    }
    throw new Error("Assessment attempt creation failed.");
  }

  if (beginError || typeof attemptId !== "string") {
    console.error(
      "Assessment attempt creation failed:",
      beginError?.code ?? "unexpected RPC result",
    );
    throw new Error("Assessment attempt creation failed.");
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("assessment_attempts")
    .select("id, status, started_at, deadline_at, question_set_version")
    .eq("id", attemptId)
    .eq("candidate_id", candidateId)
    .single();
  if (attemptError || !attempt) {
    console.error(
      "Started attempt lookup failed:",
      attemptError?.message ?? "attempt record missing",
    );
    throw new Error("Started assessment attempt lookup failed.");
  }

  return { kind: "created" as const, value: attempt as AttemptSummary };
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return Response.json({ error: "Sign in and verify your email before beginning." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return Response.json(
        { error: "Your session is invalid or expired. Sign in again." },
        { status: 401 },
      );
    }
    if (!authData.user.email_confirmed_at) {
      return Response.json(
        { error: "Verify your email before beginning." },
        { status: 403 },
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (candidateError) {
      console.error("Candidate lookup failed:", candidateError.message);
      return Response.json(
        { error: "We couldn’t verify your registration. Please sign in again." },
        { status: 500 },
      );
    }
    if (!candidate) {
      return Response.json(
        { error: "Complete your registration before beginning the assessment." },
        { status: 403 },
      );
    }

    const { data: existingAttempt, error: existingAttemptError } = await supabase
      .from("assessment_attempts")
      .select("id, status, started_at, deadline_at, question_set_version")
      .eq("candidate_id", authData.user.id)
      .maybeSingle();
    if (existingAttemptError) {
      console.error("Existing candidate attempt lookup failed:", existingAttemptError.message);
      return Response.json(
        { error: "We couldn’t verify your assessment status. Please sign in again." },
        { status: 500 },
      );
    }
    if (existingAttempt) {
      return Response.json(
        { alreadyStarted: true, attempt: existingAttempt },
        { status: 200 },
      );
    }

    const allocation = await allocateUniqueRcapAssignment(
      await loadRcapQuestionBank(),
      (assignment, fingerprint) =>
        reserveRcapAttempt(supabase, authData.user.id, assignment, fingerprint),
      (maxExclusive) => randomInt(maxExclusive),
      MAX_ASSIGNMENT_ATTEMPTS,
    );
    return Response.json(
      { alreadyStarted: allocation.alreadyStarted, attempt: allocation.value },
      { status: allocation.alreadyStarted ? 200 : 201 },
    );
  } catch (error) {
    const diagnostic = error instanceof RcapBankSourceError
      ? { category: error.category, reasonCode: error.reasonCode }
      : { category: "begin_request", reasonCode: "unexpected_failure" };
    console.error("Assessment begin request failed:", diagnostic);
    return Response.json(
      { error: "We couldn’t start your assessment. Please try again." },
      { status: 500 },
    );
  }
}
