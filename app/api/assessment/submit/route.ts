import {
  authenticateCandidate,
  calculateAndSaveResult,
  getOwnedAttempt,
  isDemoAttempt,
} from "@/lib/assessment/server";
import { getAssessmentQuestionSet } from "@/lib/assessment/question-sets";
import { finalizeAndGetResult } from "@/lib/assessment/submission";

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

    const { status: terminalStatus, result } = await finalizeAndGetResult(
      attempt.status,
      async () => {
        const { data, error } = await supabase.rpc(
          "finalize_or_get_assessment_attempt",
          { requested_attempt_id: attempt.id },
        );
        if (error || (data !== "submitted" && data !== "expired")) {
          throw new Error(
            `Attempt finalization failed: ${error?.message ?? "unexpected status"}`,
          );
        }
        return data;
      },
      () => calculateAndSaveResult(supabase, attempt.id),
    );
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
      { error: "We couldn’t confirm the submission. Please retry; no result is shown until the server confirms it." },
      { status: 500 },
    );
  }
}
