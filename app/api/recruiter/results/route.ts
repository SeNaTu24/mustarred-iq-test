import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRecruiter } from "@/lib/assessment/server";

type AttemptRow = {
  id: string;
  candidate_id: string;
  status: string;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  expired_at: string | null;
  question_set_version: string;
};

type ResultRow = {
  attempt_id: string;
  total_correct: number;
  percentage: number;
  outcome: string;
  round_1_correct: number;
  round_2_correct: number;
  round_3_correct: number;
  round_4_correct: number;
  round_5_correct: number;
  answered_count: number;
  unanswered_count: number;
  question_set_version: string;
  scoring_rule_version: string;
  calculated_at: string;
  marks_earned: number | null;
  marks_possible: number | null;
};

type Stats = {
  totalRegistered: number;
  passed: number;
  failed: number;
  inProgress: number;
};

export async function GET(request: Request) {
  const auth = await authenticateRecruiter(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const filter = url.searchParams.get("filter") ?? "all";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);

  try {
    const supabase = getSupabaseAdminClient();

    // --- Statistics across all candidates ---
    const [allCandidatesRes, allAttemptsRes, allResultsRes] = await Promise.all([
      supabase.from("candidates").select("id"),
      supabase.from("assessment_attempts").select("id, candidate_id, status"),
      supabase.from("assessment_results").select("attempt_id, outcome"),
    ]);

    if (allCandidatesRes.error) throw allCandidatesRes.error;
    if (allAttemptsRes.error) throw allAttemptsRes.error;
    if (allResultsRes.error) throw allResultsRes.error;

    const allCandidates = allCandidatesRes.data ?? [];
    const allAttemptsStats = allAttemptsRes.data ?? [];
    const allResultsStats = allResultsRes.data ?? [];

    const attemptByCandidate = new Map<string, { id: string; status: string }>();
    for (const a of allAttemptsStats) {
      attemptByCandidate.set(a.candidate_id, { id: a.id, status: a.status });
    }
    const outcomeByAttempt = new Map<string, string>();
    for (const r of allResultsStats) {
      outcomeByAttempt.set(r.attempt_id, r.outcome);
    }

    let totalRegistered = 0;
    let passed = 0;
    let failed = 0;
    let inProgress = 0;
    for (const candidate of allCandidates) {
      totalRegistered += 1;
      const attempt = attemptByCandidate.get(candidate.id);
      const outcome = attempt ? outcomeByAttempt.get(attempt.id) : undefined;
      if (outcome === "PASS") {
        passed += 1;
      } else if (outcome === "FAIL") {
        failed += 1;
      }
      if (attempt?.status === "in_progress") {
        inProgress += 1;
      }
    }

    const stats: Stats = { totalRegistered, passed, failed, inProgress };

    // --- Candidate query (with name search) ---
    let candidateQuery = supabase
      .from("candidates")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      candidateQuery = candidateQuery.ilike("full_name", `%${search}%`);
    }

    const { data: nameMatchedCandidates, error: candidatesError } =
      await candidateQuery;
    if (candidatesError) throw candidatesError;

    // --- Candidate ID matching (name OR email) ---
    const matchedCandidateIds = new Set<string>();
    if (nameMatchedCandidates) {
      for (const c of nameMatchedCandidates) {
        matchedCandidateIds.add(c.id);
      }
    }
    if (search) {
      const { data: users } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });
      const emailMatchedIds = new Set(
        (users?.users ?? [])
          .filter(
            (u) =>
              u.email?.toLowerCase().includes(search.toLowerCase()) === true
          )
          .map((u) => u.id)
      );
      for (const id of emailMatchedIds) {
        matchedCandidateIds.add(id);
      }
    }
    const candidateIds = [...matchedCandidateIds];

    // --- Attempts for matching candidates ---
    const attemptsByCandidate = new Map<string, AttemptRow>();
    if (candidateIds.length > 0) {
      const { data: attempts, error: attemptsError } = await supabase
        .from("assessment_attempts")
        .select(
          "id, candidate_id, status, started_at, deadline_at, submitted_at, expired_at, question_set_version"
        )
        .in("candidate_id", candidateIds);
      if (attemptsError) throw attemptsError;
      for (const attempt of attempts ?? []) {
        attemptsByCandidate.set(attempt.candidate_id, attempt);
      }
    }

    // --- Results for matching attempts ---
    const attemptIds = [...attemptsByCandidate.values()].map((a) => a.id);
    const resultsByAttempt = new Map<string, ResultRow>();
    if (attemptIds.length > 0) {
      const { data: results, error: resultsError } = await supabase
        .from("assessment_results")
        .select(
          "attempt_id, total_correct, percentage, outcome, round_1_correct, round_2_correct, round_3_correct, round_4_correct, round_5_correct, answered_count, unanswered_count, question_set_version, scoring_rule_version, calculated_at, marks_earned, marks_possible"
        )
        .in("attempt_id", attemptIds);
      if (resultsError) throw resultsError;
      for (const result of results ?? []) {
        resultsByAttempt.set(result.attempt_id, result);
      }
    }

    // --- Emails for matching candidates ---
    const emailById = new Map<string, string | null>();
    if (candidateIds.length > 0) {
      const userResults = await Promise.all(
        candidateIds.map(async (id) => {
          const { data, error } = await supabase.auth.admin.getUserById(id);
          if (error) return { id, email: null as string | null };
          return { id, email: data.user.email ?? null };
        })
      );
      for (const u of userResults) {
        emailById.set(u.id, u.email);
      }
    }

    // --- Pass/fail/in_progress filter ---
    let filteredIds = candidateIds;
    if (filter === "pass") {
      filteredIds = candidateIds.filter((id) => {
        const attempt = attemptsByCandidate.get(id);
        if (!attempt) return false;
        return resultsByAttempt.get(attempt.id)?.outcome === "PASS";
      });
    } else if (filter === "fail") {
      filteredIds = candidateIds.filter((id) => {
        const attempt = attemptsByCandidate.get(id);
        if (!attempt) return false;
        return resultsByAttempt.get(attempt.id)?.outcome === "FAIL";
      });
    } else if (filter === "in_progress") {
      filteredIds = candidateIds.filter((id) => {
        const attempt = attemptsByCandidate.get(id);
        return attempt?.status === "in_progress";
      });
    }

    // --- Pagination ---
    const total = filteredIds.length;
    const pageIds = filteredIds.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    const pageCandidateRecords = pageIds.length > 0
      ? await supabase
          .from("candidates")
          .select("id, full_name, created_at")
          .in("id", pageIds)
          .order("created_at", { ascending: false })
      : { data: null, error: null };

    if (pageCandidateRecords.error) throw pageCandidateRecords.error;

    const candidateMap = new Map(
      (pageCandidateRecords.data ?? []).map((c) => [c.id, c])
    );
    const pageCandidates = pageIds
      .map((id) => candidateMap.get(id))
      .filter(
        (c): c is { id: string; full_name: string; created_at: string } =>
          c !== undefined
      );

    return Response.json({
      candidates: pageCandidates.map((candidate) => {
        const attempt = attemptsByCandidate.get(candidate.id) ?? null;
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
                result: resultsByAttempt.get(attempt.id) ?? null,
              }
            : null,
        };
      }),
      total,
      offset,
      limit,
      hasMore,
      stats,
    });
  } catch (error) {
    console.error(
      "Recruiter results list failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return Response.json(
      { error: "Candidate results could not be loaded." },
      { status: 500 }
    );
  }
}
