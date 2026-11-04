"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CandidateResultRow = {
  id: string;
  fullName: string;
  email: string | null;
  registeredAt: string;
  attempt: null | {
    id: string;
    status: string;
    startedAt: string;
    deadlineAt: string;
    submittedAt: string | null;
    expiredAt: string | null;
    questionSetVersion: string;
    result: null | {
      question_set_version: string;
      total_correct: number;
      percentage: number;
      outcome: string;
      round_1_correct: number;
      round_2_correct: number;
      round_3_correct: number;
      round_4_correct: number;
      round_5_correct: number;
      unanswered_count: number;
      scoring_rule_version: string;
      marks_earned: number | null;
      marks_possible: number | null;
    };
  };
};

type Stats = {
  totalRegistered: number;
  passed: number;
  failed: number;
  inProgress: number;
};

type FilterValue = "all" | "pass" | "fail" | "in_progress";

const PAGE_SIZE = 50;

export function RecruiterResults() {
  const [rows, setRows] = useState<CandidateResultRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchPageData = useCallback(
    async (pageNum: number) => {
      const offset = pageNum * PAGE_SIZE;
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);

      const { data: { session }, error: authError } =
        await getSupabaseBrowserClient().auth.getSession();
      if (authError) throw authError;
      if (!session) throw new Error("Sign in with an authorised recruiter account.");

      const response = await fetch(`/api/recruiter/results?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Recruiter results could not be loaded.");
      }
      return payload;
    },
    [search, filter]
  );

  // Initial load / reset when search or filter changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError("");
        setPage(0);
        const payload = await fetchPageData(0);
        if (!cancelled) {
          setRows(payload.candidates ?? []);
          setHasMore(payload.hasMore ?? false);
          setStats(payload.stats ?? null);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Recruiter results could not be loaded."
          );
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, filter, fetchPageData]);

  const loadMore = useCallback(async () => {
    try {
      const payload = await fetchPageData(page + 1);
      setRows((prev) => [...prev, ...(payload.candidates ?? [])]);
      setHasMore(payload.hasMore ?? false);
      setPage((prev) => prev + 1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Load more failed."
      );
    }
  }, [page, fetchPageData]);

  return (
    <main className="recruiter-page">
      <div className="demo-data-banner">
        Candidate assessment results — restricted to authorised recruiters
      </div>
      <p><Link href="/recruiter/sign-in">Recruiter sign in</Link></p>
      <h1>Candidate assessment results</h1>
      <p>
        Restricted to verified Supabase Auth users assigned the recruiter role
        in trusted app metadata.
      </p>

      {stats && (
        <div className="recruiter-stats">
          <div className="recruiter-stat">
            <strong>{stats.totalRegistered}</strong> registered
          </div>
          <div className="recruiter-stat">
            <strong>{stats.passed}</strong> passed
          </div>
          <div className="recruiter-stat">
            <strong>{stats.failed}</strong> failed
          </div>
          <div className="recruiter-stat">
            <strong>{stats.inProgress}</strong> in progress
          </div>
        </div>
      )}

      <div className="recruiter-controls">
        <input
          className="recruiter-search"
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="recruiter-filters">
          <button
            className={filter === "all" ? "recruiter-filter active" : "recruiter-filter"}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "pass" ? "recruiter-filter active" : "recruiter-filter"}
            onClick={() => setFilter("pass")}
          >
            Passed
          </button>
          <button
            className={filter === "fail" ? "recruiter-filter active" : "recruiter-filter"}
            onClick={() => setFilter("fail")}
          >
            Failed
          </button>
          <button
            className={
              filter === "in_progress"
                ? "recruiter-filter active"
                : "recruiter-filter"
            }
            onClick={() => setFilter("in_progress")}
          >
            In progress
          </button>
        </div>
      </div>

      {isLoading && <p role="status">Loading candidate records…</p>}
      {error && <p className="demo-error" role="alert">{error}</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p>No candidate profiles match the current search or filter.</p>
      )}
      {rows.length > 0 && (
        <>
          <div className="recruiter-table-wrap">
            <table className="recruiter-table">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Email</th>
                  <th scope="col">Attempt</th>
                  <th scope="col">Result</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((candidate) => {
                  const attempt = candidate.attempt;
                  let resultText = "Not finalised";
                  if (attempt?.result) {
                    const maxScore =
                      attempt.result.question_set_version ===
                      "mustarred-rcap-200-v1"
                        ? 30
                        : 50;
                    resultText = `${attempt.result.total_correct}/${maxScore} · ${attempt.result.percentage}% · ${attempt.result.outcome}`;
                    if (attempt.result.marks_earned !== null) {
                      resultText += ` · ${attempt.result.marks_earned}/${attempt.result.marks_possible} marks`;
                    }
                  }
                  return (
                    <tr key={candidate.id}>
                      <th scope="row">{candidate.fullName}</th>
                      <td>{candidate.email ?? "Unavailable"}</td>
                      <td>{attempt?.status ?? "Not started"}</td>
                      <td>{resultText}</td>
                      <td>
                        {attempt && (
                          <Link href={`/recruiter/results/${attempt.id}`}>
                            Question details
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <button className="recruiter-load-more" onClick={loadMore}>
              Load more
            </button>
          )}
        </>
      )}
    </main>
  );
}
