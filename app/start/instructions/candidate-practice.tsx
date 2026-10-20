"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const choices = [
  {
    id: "pilot",
    label:
      "Check customer feedback and try a small pilot with clear success measures.",
    feedback:
      "Start with evidence: test demand on a small scale and decide how you will measure success.",
  },
  {
    id: "full-investment",
    label: "Commit the full budget to the product line straight away.",
    feedback:
      "Before committing the full budget, look for evidence of demand and consider the investment risk.",
  },
  {
    id: "ignore",
    label: "Ignore the requests until customers stop asking.",
    feedback:
      "Understand what customers are asking for before deciding whether to act.",
  },
];

export function CandidatePractice() {
  const router = useRouter();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [startMessage, setStartMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [attempt, setAttempt] = useState<{
    status: string;
    deadline_at: string;
    alreadyStarted: boolean;
  } | null>(null);
  const feedback = choices.find((choice) => choice.id === selectedChoice);

  async function beginAssessment() {
    setStartMessage("");
    setIsStarting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await getSupabaseBrowserClient().auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error("Sign in and verify your email before beginning.");
      }

      const response = await fetch("/api/assessment/begin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = (await response.json()) as {
        error?: string;
        alreadyStarted?: boolean;
        attempt?: { status: string; deadline_at: string };
      };

      if (!response.ok) {
        throw new Error(result.error ?? "We couldn’t start your assessment. Please try again.");
      }

      if (!result.attempt) {
        throw new Error("We couldn’t confirm your assessment status. Please reload the page.");
      }

      setAttempt({
        ...result.attempt,
        alreadyStarted: result.alreadyStarted ?? false,
      });
      router.push("/assessment");
    } catch (error) {
      setStartMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t start your assessment. Please try again.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      <div className="practice-card">
        <div className="practice-question-header">
          <span className="practice-question-number">PRACTICE · 1</span>
          <span className="practice-unscored-badge">Not scored</span>
        </div>
        <fieldset className="practice-fieldset">
          <legend>
            Customers are asking about a new product, but demand is uncertain.
            What would be a sensible next step?
          </legend>
          <div className="practice-choices">
            {choices.map((choice, index) => (
              <label
                className={`practice-choice${selectedChoice === choice.id ? " is-selected" : ""}`}
                key={choice.id}
              >
                <input
                  checked={selectedChoice === choice.id}
                  name="practice-choice"
                  onChange={() => setSelectedChoice(choice.id)}
                  type="radio"
                  value={choice.id}
                />
                <span className="practice-choice-letter" aria-hidden="true">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="practice-choice-label">{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div
          className={`practice-feedback${feedback ? " is-visible" : ""}`}
          aria-live="polite"
          role="status"
        >
          {feedback ? (
            <>
              <span className="feedback-mark" aria-hidden="true">
                ✳
              </span>
              <p>{feedback.feedback}</p>
            </>
          ) : (
            <p>Select an answer to see feedback.</p>
          )}
        </div>
      </div>

      <div className="assessment-continue">
        <div className="assessment-continue-copy">
          <span className="continue-step">UP NEXT</span>
          <p>
            You have one attempt. The timer starts when you begin; existing attempts keep their original deadline.
          </p>
          {!attempt && (
            <p className="continue-status" role="status" aria-live="polite">
              {startMessage || "Register and verify your email before beginning."}
            </p>
          )}
          {attempt && (
            <p className="continue-status" role="status" aria-live="polite">
              {attempt.alreadyStarted
                ? "Your existing attempt has been opened. A second attempt cannot be created."
                : "Your attempt has started."}{" "}
              Deadline: {new Date(attempt.deadline_at).toLocaleString()}.
            </p>
          )}
          <Link className="text-link" href="/start">
            Sign in or create an account
          </Link>
        </div>
        <button
          className="button button-primary continue-button"
          disabled={isStarting || attempt !== null}
          onClick={() => void beginAssessment()}
          type="button"
        >
          {isStarting
            ? "Starting…"
            : attempt
              ? "Attempt started"
              : "Begin assessment"}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </>
  );
}
