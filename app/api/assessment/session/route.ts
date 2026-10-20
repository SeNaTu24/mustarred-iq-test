import {
  authenticateCandidate,
  calculateAndSaveResult,
  getOwnedAttempt,
} from "@/lib/assessment/server";
import { getQuestionSetForAttempt } from "@/lib/assessment/attempt-question-set";
import { restoreAssessmentResponse } from "@/lib/assessment/item-result";

export async function GET(request: Request) {
  const auth = await authenticateCandidate(request);
  if (auth.error) return auth.error;

  try {
    const { supabase, attempt } = await getOwnedAttempt(auth.user.id);
    if (!attempt) {
      return Response.json(
        { error: "No assessment attempt was found for this account." },
        { status: 404 },
      );
    }
    const questionSet = await getQuestionSetForAttempt(attempt);
    if (!questionSet) {
      return Response.json(
        { error: "This attempt uses an unsupported assessment version." },
        { status: 409 },
      );
    }
    questionSet.validate();

    let status = attempt.status;
    if (status === "in_progress") {
      const { data: deadlineStatus, error: deadlineError } = await supabase.rpc(
        "expire_assessment_attempt_if_due",
        { requested_attempt_id: attempt.id },
      );
      if (
        deadlineError ||
        !["in_progress", "expired", "submitted"].includes(String(deadlineStatus))
      ) {
        throw new Error("Assessment deadline status could not be confirmed.");
      }
      status = deadlineStatus as typeof status;
    }

    const { data: answerRows, error: answersError } = await supabase
      .from("assessment_answers")
      .select("question_id, response")
      .eq("attempt_id", attempt.id);
    if (answersError) {
      throw new Error(`Answer retrieval failed: ${answersError.message}`);
    }
    const answers = Object.fromEntries(
      (answerRows ?? []).map((row) => {
        const question = questionSet.getQuestion(row.question_id);
        return [
          row.question_id,
          question
            ? restoreAssessmentResponse(question, row.response)
            : row.response,
        ];
      }),
    );

    const result =
      status === "in_progress"
        ? null
        : await calculateAndSaveResult(supabase, attempt.id);

    return Response.json({
      demoLabel: questionSet.label,
      serverNow: new Date().toISOString(),
      attempt: {
        id: attempt.id,
        status,
        questionSetVersion: attempt.question_set_version,
        startedAt: attempt.started_at,
        deadlineAt: attempt.deadline_at,
      },
      questions: questionSet.publicQuestions,
      answers,
      result,
    });
  } catch (error) {
    console.error(
      "Assessment session request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        error:
          "We couldn’t load your assessment or saved answers. Please try again.",
      },
      { status: 500 },
    );
  }
}
