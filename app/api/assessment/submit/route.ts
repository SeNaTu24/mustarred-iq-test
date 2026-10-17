import {
  authenticateCandidate,
  calculateAndSaveResult,
  getOwnedAttempt,
  isDemoAttempt,
} from "@/lib/assessment/server";
import { getAssessmentQuestionSet } from "@/lib/assessment/question-sets";

export async function POST(request: Request) {
  const auth = await authenticateCandidate(request);
  if (auth.error) return auth.error;

  try {
    const { supabase, attempt } = await getOwnedAttempt(auth.user.id);
    if (!attempt) {
      return Response.json({ error: "No assessment attempt was found for your account." }, { status: 404 });
    }
    if (!isDemoAttempt(attempt)) {
      return Response.json({ error: "This attempt uses a different assessment version." }, { status: 409 });
    }
    const questionSet = getAssessmentQuestionSet(attempt.question_set_version);
    if (!questionSet) {
      return Response.json({ error: "This attempt uses an unsupported assessment version." }, { status: 409 });
    }
    questionSet.validate();

    const { data: terminalStatus, error: finalizeError } = await supabase.rpc(
      "finalize_or_get_assessment_attempt",
      { requested_attempt_id: attempt.id },
    );
    if (
      finalizeError ||
      (terminalStatus !== "submitted" && terminalStatus !== "expired")
    ) {
      throw new Error(
        `Attempt finalization failed: ${finalizeError?.message ?? "unexpected status"}`,
      );
    }

    const result = await calculateAndSaveResult(supabase, attempt.id);
    return Response.json({
      status: terminalStatus,
      result,
    });
  } catch (error) {
    console.error(
      "Assessment submission failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "We couldn’t submit your assessment. Your saved answers are safe; please try again." },
      { status: 500 },
    );
  }
}
