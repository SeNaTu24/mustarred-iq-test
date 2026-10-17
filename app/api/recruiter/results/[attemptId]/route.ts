import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRecruiter } from "@/lib/assessment/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const auth = await authenticateRecruiter(request);
  if (auth.error) return auth.error;

  const { attemptId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) {
    return Response.json({ error: "Invalid attempt ID." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: attempt, error: attemptError } = await supabase
      .from("assessment_attempts")
      .select("id, candidate_id, status, started_at, deadline_at, submitted_at, expired_at, question_set_version")
      .eq("id", attemptId)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) {
      return Response.json({ error: "Attempt not found." }, { status: 404 });
    }

    const [
      { data: candidate, error: candidateError },
      { data: result, error: resultError },
      { data: itemResults, error: itemError },
      { data: authUser, error: userError },
    ] = await Promise.all([
      supabase
        .from("candidates")
        .select("id, full_name, created_at")
        .eq("id", attempt.candidate_id)
        .single(),
      supabase
        .from("assessment_results")
        .select("*")
        .eq("attempt_id", attempt.id)
        .maybeSingle(),
      supabase
        .from("assessment_item_results")
        .select("*")
        .eq("attempt_id", attempt.id)
        .order("round_number")
        .order("question_id"),
      supabase.auth.admin.getUserById(attempt.candidate_id),
    ]);

    if (candidateError) throw candidateError;
    if (resultError) throw resultError;
    if (itemError) throw itemError;
    if (userError) throw userError;

    return Response.json({
      candidate: {
        id: candidate.id,
        fullName: candidate.full_name,
        email: authUser.user.email ?? null,
        registeredAt: candidate.created_at,
      },
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.started_at,
        deadlineAt: attempt.deadline_at,
        submittedAt: attempt.submitted_at,
        expiredAt: attempt.expired_at,
        questionSetVersion: attempt.question_set_version,
      },
      result,
      items: itemResults ?? [],
    });
  } catch (error) {
    console.error(
      "Recruiter attempt detail failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "Attempt details could not be loaded." },
      { status: 500 },
    );
  }
}
