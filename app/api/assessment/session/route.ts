import {
  authenticateCandidate,
  calculateAndSaveResult,
  finalizeAttempt,
  getOwnedAttempt,
  isDemoAttempt,
} from "@/lib/assessment/server";
import { getAssessmentQuestionSet } from "@/lib/assessment/question-sets";

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
    if (!isDemoAttempt(attempt)) {
      return Response.json(
        {
          error: "This attempt uses a different assessment version.",
        },
        { status: 409 },
      );
    }
    const questionSet = getAssessmentQuestionSet(attempt.question_set_version);
    if (!questionSet) {
      return Response.json(
        { error: "This attempt uses an unsupported assessment version." },
        { status: 409 },
      );
    }
    questionSet.validate();

    let status = attempt.status;
    if (
      status === "in_progress" &&
      Date.now() >= new Date(attempt.deadline_at).getTime()
    ) {
      await finalizeAttempt(supabase, attempt.id, "expired");
      status = "expired";
    }

    const { data: answerRows, error: answersError } = await supabase
      .from("assessment_answers")
      .select("question_id, response")
      .eq("attempt_id", attempt.id);
    if (answersError) {
      throw new Error(`Answer retrieval failed: ${answersError.message}`);
    }
    const answers = Object.fromEntries(
      (answerRows ?? []).map((row) => [row.question_id, row.response]),
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
