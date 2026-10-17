"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RecruiterDetail = {
  error?: string;
  candidate: { fullName: string; email: string | null };
  attempt: {
    status: string;
    startedAt: string;
    deadlineAt: string;
    submittedAt: string | null;
    expiredAt: string | null;
    questionSetVersion: string;
  };
  result: null | {
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
    behavioral_answered_count: number;
    behavioral_unanswered_count: number;
    scoring_rule_version: string;
    calculated_at: string;
  };
  items: Array<{
    question_id: string;
    round_number: number;
    question_format: string;
    question_snapshot: {
      prompt: string;
      options: Array<{ id: string; label: string }> | null;
      scoringType?: "objective" | "behavioral";
      game: unknown;
      visual?: unknown;
    };
    candidate_response: unknown;
    key_response: unknown;
    scoring_type: "objective" | "behavioral";
    is_correct: boolean | null;
    points: number | null;
    scoring_explanation: string;
  }>;
};

function formatResponse(
  response: unknown,
  options: Array<{ id: string; label: string }> | null,
) {
  if (
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    (response as Record<string, unknown>).unanswered === true
  ) {
    return "No response";
  }
  if (typeof response === "string") {
    const option = options?.find((candidate) => candidate.id === response);
    return option ? `${option.id}: ${option.label}` : response;
  }
  return JSON.stringify(response);
}

export function RecruiterAttemptDetail({ attemptId }: { attemptId: string }) {
  const [detail, setDetail] = useState<RecruiterDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data: { session }, error: authError } =
            await getSupabaseBrowserClient().auth.getSession();
          if (authError) throw authError;
          if (!session) throw new Error("Sign in with an authorised recruiter account.");

          const response = await fetch(`/api/recruiter/results/${attemptId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          const payload = (await response.json()) as RecruiterDetail;
          if (!response.ok) {
            throw new Error(payload.error ?? "Attempt details could not be loaded.");
          }
          if (!cancelled) setDetail(payload);
        } catch (loadError) {
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Attempt details could not be loaded.",
            );
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attemptId]);

  return (
    <main className="recruiter-page">
      <div className="demo-data-banner">
        TEMPORARY DEMO DATA — not CEO-approved or validated for hiring
      </div>
      <p><Link href="/recruiter/sign-in">Recruiter sign in</Link></p>
      <p><Link href="/recruiter">← Candidate results</Link></p>
      {error && <p className="demo-error" role="alert">{error}</p>}
      {!detail && !error && <p role="status">Loading attempt details…</p>}
      {detail && (
        <>
          <h1>{detail.candidate.fullName}</h1>
          <p>{detail.candidate.email ?? "Email unavailable"} · Attempt {detail.attempt.status}</p>
          {detail.result ? (
            <section className="recruiter-summary">
              <h2>Objective section scores</h2>
              {[
                detail.result.round_1_correct,
                detail.result.round_2_correct,
                detail.result.round_3_correct,
                detail.result.round_4_correct,
                detail.result.round_5_correct,
              ].map((score, index) => ({ round: index + 1, score })).map(({ round, score }) => (
                <span className="recruiter-round-score" key={round}>
                  Round {round}: {score}/10
                </span>
              ))}
              <h2>
                {detail.result.total_correct}/50 · {detail.result.percentage}% · {detail.result.outcome}
              </h2>
              <p>Question set: {detail.attempt.questionSetVersion}</p>
              <p>Scoring rule: {detail.result.scoring_rule_version}</p>
              <p>
                {detail.result.answered_count} answered · {detail.result.unanswered_count} unanswered ·
                calculated {new Date(detail.result.calculated_at).toLocaleString()}
              </p>
              {detail.attempt.questionSetVersion === "mustarred-assessment-2026-10-v2" && (
                <p>
                  {detail.result.behavioral_answered_count}/5 work-style responses recorded ·
                  {" "}{detail.result.behavioral_unanswered_count}/5 unanswered
                </p>
              )}
            </section>
          ) : (
            <p>This attempt has no final result yet.</p>
          )}
          <h2>Question-level detail</h2>
          <ol className="recruiter-item-list">
            {detail.items.map((item) => (
              <li key={item.question_id}>
                <h3>
                  {item.question_id} · Round {item.round_number} · {item.question_format}
                  {item.scoring_type === "behavioral"
                    ? " · Unscored work-style response"
                    : ` · ${item.points ?? 0}/1 point`}
                </h3>
                <p>{item.question_snapshot.prompt}</p>
                {item.question_snapshot.options && (
                  <ul>
                    {item.question_snapshot.options.map((option) => (
                      <li key={option.id}>{option.id}: {option.label}</li>
                    ))}
                  </ul>
                )}
                <p>
                  <strong>Candidate response:</strong>{" "}
                  {formatResponse(item.candidate_response, item.question_snapshot.options)}
                </p>
                {item.scoring_type === "objective" && (
                  <>
                    <p><strong>Scoring key:</strong> {JSON.stringify(item.key_response)}</p>
                    <p><strong>Scored:</strong> {item.is_correct ? "Correct" : "Not correct"}</p>
                  </>
                )}
                <p>{item.scoring_explanation}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
