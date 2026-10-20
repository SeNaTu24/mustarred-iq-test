"use client";

import { useEffect, useState } from "react";
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

export function RecruiterResults() {
  const [rows, setRows] = useState<CandidateResultRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data: { session }, error: authError } =
            await getSupabaseBrowserClient().auth.getSession();
          if (authError) throw authError;
          if (!session) throw new Error("Sign in with an authorised recruiter account.");

          const response = await fetch("/api/recruiter/results", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          const payload = (await response.json()) as {
            error?: string;
            candidates?: CandidateResultRow[];
          };
          if (!response.ok) {
            throw new Error(payload.error ?? "Recruiter results could not be loaded.");
          }
          if (!cancelled) setRows(payload.candidates ?? []);
        } catch (loadError) {
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Recruiter results could not be loaded.",
            );
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

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
      {isLoading && <p role="status">Loading candidate records…</p>}
      {error && <p className="demo-error" role="alert">{error}</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p>No candidate profiles have been registered yet.</p>
      )}
      {rows.length > 0 && (
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
              {rows.map((candidate) => (
                <tr key={candidate.id}>
                  <th scope="row">{candidate.fullName}</th>
                  <td>{candidate.email ?? "Unavailable"}</td>
                  <td>{candidate.attempt?.status ?? "Not started"}</td>
                  <td>
                    {candidate.attempt?.result
                      ? `${candidate.attempt.result.total_correct}/${candidate.attempt.result.question_set_version === "mustarred-rcap-200-v1" ? 30 : 50} · ${candidate.attempt.result.percentage}% · ${candidate.attempt.result.outcome}${candidate.attempt.result.marks_earned === null ? "" : ` · ${candidate.attempt.result.marks_earned}/${candidate.attempt.result.marks_possible} marks`}`
                      : "Not finalised"}
                  </td>
                  <td>
                    {candidate.attempt && (
                      <Link href={`/recruiter/results/${candidate.attempt.id}`}>
                        Question details
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
