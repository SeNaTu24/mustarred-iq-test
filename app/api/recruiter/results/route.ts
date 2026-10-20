import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRecruiter } from "@/lib/assessment/server";

export async function GET(request: Request) {
  const auth = await authenticateRecruiter(request);
  if (auth.error) return auth.error;

  try {
    const supabase = getSupabaseAdminClient();
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (candidatesError) throw candidatesError;

    const candidateIds = (candidates ?? []).map((candidate) => candidate.id);
    if (candidateIds.length === 0) {
      return Response.json({ candidates: [] });
    }

    const [attemptResponse, users] = await Promise.all([
      supabase
        .from("assessment_attempts")
        .select("id, candidate_id, status, started_at, deadline_at, submitted_at, expired_at, question_set_version")
        .in("candidate_id", candidateIds),
      Promise.all(
        candidateIds.map(async (id) => {
          const { data, error } = await supabase.auth.admin.getUserById(id);
          if (error) {
            throw new Error(`Candidate email lookup failed: ${error.message}`);
          }
          return { id, email: data.user.email ?? null };
        }),
      ),
    ]);

    const { data: attempts, error: attemptsError } = attemptResponse;
    if (attemptsError) throw attemptsError;
    const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
    const { data: results, error: resultsError } =
      attemptIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("assessment_results")
            .select("attempt_id, total_correct, percentage, outcome, round_1_correct, round_2_correct, round_3_correct, round_4_correct, round_5_correct, answered_count, unanswered_count, question_set_version, scoring_rule_version, calculated_at, marks_earned, marks_possible")
            .in("attempt_id", attemptIds);
    if (resultsError) throw resultsError;

    const emailById = new Map(users.map((user) => [user.id, user.email]));
    const attemptByCandidate = new Map(
      (attempts ?? []).map((attempt) => [attempt.candidate_id, attempt]),
    );
    const resultByAttempt = new Map(
      (results ?? []).map((result) => [result.attempt_id, result]),
    );

    return Response.json({
      candidates: (candidates ?? []).map((candidate) => {
        const attempt = attemptByCandidate.get(candidate.id) ?? null;
        return {
          id: candidate.id,
          fullName: candidate.full_name,
          email: emailById.get(candidate.id) ?? null,
          registeredAt: candidate.created_at,
          attempt: attempt
            ? {
                id: attempt.id,
                status: attempt.status,
                startedAt: attempt.started_at,
                deadlineAt: attempt.deadline_at,
                submittedAt: attempt.submitted_at,
                expiredAt: attempt.expired_at,
                questionSetVersion: attempt.question_set_version,
                result: resultByAttempt.get(attempt.id) ?? null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error(
      "Recruiter results list failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "Candidate results could not be loaded." },
      { status: 500 },
    );
  }
}
