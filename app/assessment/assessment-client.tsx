"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createDebouncedDraftAutosaver,
  saveAllPendingDrafts,
  saveIfDraftIsCurrent,
} from "@/lib/assessment/draft-persistence";
import type { AssessmentSecurityEventType } from "@/lib/assessment/security-events";

type RoundNumber = 1 | 2 | 3 | 4 | 5;
type PublicQuestion = {
  id: string;
  round: RoundNumber;
  roundTitle: string;
  format: "normal" | "pattern" | "game";
  responseType?: "objective" | "behavioral";
  text: string;
  options?: Array<{ id: string; label: string }>;
  visual?: {
    layout: "sequence" | "matrix";
    tiles: Array<PatternTile | null>;
    choices: Array<{ id: string; tile: PatternTile }>;
  };
  game?: {
    type: "allocation" | "order" | "priority" | "ranking" | "matching" | "sudoku" | "block-placement" | "rotation";
    instruction: string;
    items?: Array<{ id: string; label: string }>;
    extraItem?: { id: string; label: string };
    matches?: Array<{ id: string; label: string }>;
    size?: number;
    puzzle?: number[][];
    boardSize?: number;
    targetCells?: Array<{ x: number; y: number }>;
    pieceCells?: Array<{ x: number; y: number }>;
    shape?: PatternTile;
  };
};
type PatternTile = {
  glyphs: Array<{
    shape: "circle" | "square" | "triangle" | "diamond";
    color: string;
    rotation?: number;
    x?: number;
    y?: number;
    size?: number;
  }>;
};
type RoundResult = { round: number; correct: number };
type AssessmentResult = {
  totalCorrect: number;
  percentage: number;
  outcome: "PASS" | "FAIL";
  rounds: RoundResult[];
  behavioralAnsweredCount?: number;
  behavioralUnansweredCount?: number;
};
type SessionPayload = {
  error?: string;
  serverNow: string;
  attempt: {
    id: string;
    status: "in_progress" | "submitted" | "expired";
    startedAt: string;
    deadlineAt: string;
  };
  questions: PublicQuestion[];
  answers: Record<string, unknown>;
  result: AssessmentResult | null;
};

function responseError(payload: { error?: string }, fallback: string) {
  return payload.error ?? fallback;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The request timed out. Check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function initialGameResponse(question: PublicQuestion): unknown {
  if (!question.game) return "";
  if (question.game.type === "sudoku") {
    return question.game.puzzle?.flat().map((value) => value ? String(value) : "") ?? [];
  }
  if (question.game.type === "block-placement") {
    return { x: 0, y: 0, rotation: 0 };
  }
  if (question.game.type === "rotation") return 0;
  if (question.game.type === "allocation") {
    return { backlog: 0, pilot: 0, reserve: 0 };
  }
  if (question.game.type === "matching") {
    return {};
  }
  if (question.id === "PE-02") {
    return { order: question.game.items?.map((item) => item.id) ?? [], excluded: [] };
  }
  return question.game.items?.map((item) => item.id) ?? [];
}

function orderFromResponse(question: PublicQuestion, response: unknown) {
  if (
    question.id === "PE-02" &&
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    Array.isArray((response as { order?: unknown }).order)
  ) {
    return (response as { order: string[] }).order;
  }
  if (Array.isArray(response)) return response as string[];
  return question.game?.items?.map((item) => item.id) ?? [];
}

export function AssessmentClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [now, setNow] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const draftValuesRef = useRef(new Map<string, unknown>());
  const draftVersionsRef = useRef(new Map<string, number>());
  const savedVersionsRef = useRef(new Map<string, number>());
  const autosaverRef = useRef<{
    schedule: (questionId: string, response: unknown, version: number) => void;
    flush: (questionId: string) => Promise<void>;
    flushAll: () => Promise<void>;
  } | null>(null);
  const inFlightSavesRef = useRef(new Set<Promise<void>>());
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<
    "in_progress" | "submitted" | "expired" | null
  >(null);
  const [securityWarning, setSecurityWarning] = useState(false);
  const [securityEventLoggingFailed, setSecurityEventLoggingFailed] = useState(false);

  const loadSession = useCallback(async () => {
    const {
      data: { session: authSession },
      error: authError,
    } = await getSupabaseBrowserClient().auth.getSession();
    if (authError) throw authError;
    if (!authSession) {
      router.replace("/start");
      throw new Error("Sign in and verify your email to continue.");
    }
    const response = await fetchWithTimeout("/api/assessment/session", {
      headers: { Authorization: `Bearer ${authSession.access_token}` },
      cache: "no-store",
    });
    const payload = (await response.json()) as SessionPayload;
    if (!response.ok) {
      throw new Error(responseError(payload, "Your assessment could not be loaded."));
    }
    setSession(payload);
    setAnswers(payload.answers ?? {});
    setSavedIds(new Set(Object.keys(payload.answers ?? {})));
    setSaveErrors({});
    draftValuesRef.current.clear();
    draftVersionsRef.current.clear();
    savedVersionsRef.current.clear();
    setAttemptStatus(payload.attempt.status);
    setResult(payload.result);
    setServerOffsetMs(Date.parse(payload.serverNow) - Date.now());
    setNow(Date.now());
    return payload;
  }, [router]);

  const reportSecurityEvent = useCallback(
    async (eventType: AssessmentSecurityEventType) => {
      const {
        data: { session: authSession },
        error,
      } = await getSupabaseBrowserClient().auth.getSession();
      if (error) throw error;
      if (!authSession) throw new Error("Your session expired. Sign in again.");

      const response = await fetch("/api/assessment/security-event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventType }),
        keepalive: true,
      });
      if (!response.ok) {
        throw new Error(`Security activity could not be recorded (${response.status}).`);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void loadSession()
        .catch((error: unknown) => {
          if (!cancelled) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Your assessment could not be loaded.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [loadSession]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const activeAttemptId = session?.attempt.id;
    if (!activeAttemptId || attemptStatus !== "in_progress") return;
    let away = false;
    let active = true;

    function record(eventType: AssessmentSecurityEventType) {
      setSecurityWarning(true);
      void reportSecurityEvent(eventType)
        .catch((error: unknown) => {
          console.error(
            "Assessment security event reporting failed:",
            error instanceof Error ? error.message : "Unknown error",
          );
          if (active) {
            setSecurityWarning(true);
            setSecurityEventLoggingFailed(true);
          }
        });
    }

    function markAway(eventType: "tab_hidden" | "window_blur") {
      if (away) return;
      away = true;
      record(eventType);
    }

    function markReturn(eventType: "tab_visible" | "window_focus") {
      if (!away) return;
      away = false;
      record(eventType);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        markAway("tab_hidden");
      } else {
        markReturn("tab_visible");
      }
    }

    function onWindowBlur() {
      if (document.visibilityState === "visible") {
        markAway("window_blur");
      }
    }

    function onWindowFocus() {
      if (document.visibilityState === "visible") {
        markReturn("window_focus");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [attemptStatus, reportSecurityEvent, session?.attempt.id]);

  const currentQuestion = session?.questions[currentIndex];
  const activeResponse = currentQuestion
    ? (drafts[currentQuestion.id] ??
      answers[currentQuestion.id] ??
      initialGameResponse(currentQuestion))
    : undefined;
  const secondsRemaining = useMemo(() => {
    if (!session) return 0;
    return Math.max(
      0,
      Math.ceil(
        (Date.parse(session.attempt.deadlineAt) - (now + serverOffsetMs)) / 1000,
      ),
    );
  }, [now, serverOffsetMs, session]);
  const formattedTime = `${Math.floor(secondsRemaining / 60)
    .toString()
    .padStart(2, "0")}:${(secondsRemaining % 60).toString().padStart(2, "0")}`;
  const answeredCount = session
    ? session.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;

  useEffect(() => {
    if (
      secondsRemaining === 0 &&
      attemptStatus === "in_progress" &&
      session
    ) {
      const timeoutId = window.setTimeout(() => {
        void loadSession().catch((error: unknown) => {
          setMessage(
            error instanceof Error
              ? error.message
              : "Time is up, but we couldn’t load your result. Refresh to try again.",
          );
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [attemptStatus, loadSession, secondsRemaining, session]);

  async function bearerHeaders() {
    const {
      data: { session: authSession },
      error,
    } = await getSupabaseBrowserClient().auth.getSession();
    if (error) throw error;
    if (!authSession) throw new Error("Your session expired. Sign in again.");
    return {
      Authorization: `Bearer ${authSession.access_token}`,
      "Content-Type": "application/json",
    };
  }

  async function saveAnswer() {
    if (
      !currentQuestion ||
      attemptStatus !== "in_progress" ||
      isSubmittingRef.current
    ) return;
    setMessage("");
    setIsSaving(true);
    const questionId = currentQuestion.id;
    const responseValue = activeResponse;
    const version = draftVersionsRef.current.get(questionId) ?? 0;
    const autosaver = autosaverRef.current;
    let saveOperation: Promise<void>;
    if (autosaver) {
      autosaver.schedule(questionId, responseValue, version);
      saveOperation = autosaver.flush(questionId);
    } else {
      saveOperation = saveAnswerResponse(questionId, responseValue, version);
    }
    inFlightSavesRef.current.add(saveOperation);
    try {
      await saveOperation;
    } catch {
      // saveAnswerResponse records the failure beside the affected question.
    } finally {
      inFlightSavesRef.current.delete(saveOperation);
      setIsSaving(false);
    }
  }

  async function saveAnswerResponse(
    questionId: string,
    responseValue: unknown,
    version: number,
  ) {
    try {
      await saveIfDraftIsCurrent(
        questionId,
        responseValue,
        version,
        (id) => draftVersionsRef.current.get(id) ?? 0,
        async (id, value) => {
          const response = await fetchWithTimeout("/api/assessment/answer", {
            method: "PUT",
            headers: await bearerHeaders(),
            body: JSON.stringify({ questionId: id, response: value }),
          });
          const payload = (await response.json()) as {
            error?: string;
            result?: AssessmentResult;
          };
          if (!response.ok) {
            if (response.status === 410 && payload.result) {
              setAttemptStatus("expired");
              setResult(payload.result);
              setMessage("Time is up. Your saved answers have been scored.");
              throw new Error("Time is up. Your saved answers have been scored.");
            }
            throw new Error(
              responseError(payload, "Your answer could not be saved."),
            );
          }
          setAnswers((previous) => ({ ...previous, [id]: value }));
        },
        (id, savedVersion) => {
          savedVersionsRef.current.set(id, savedVersion);
          setSavedIds((previous) => new Set(previous).add(id));
          setSaveErrors((previous) => {
            if (!(id in previous)) return previous;
            const next = { ...previous };
            delete next[id];
            return next;
          });
        },
      );
    } catch (error) {
      if ((draftVersionsRef.current.get(questionId) ?? 0) === version) {
        setSavedIds((previous) => {
          const next = new Set(previous);
          next.delete(questionId);
          return next;
        });
        setSaveErrors((previous) => ({
          ...previous,
          [questionId]: error instanceof Error
            ? error.message
            : "Please check your connection and retry.",
        }));
      }
      throw error;
    }
  }
  const saveAnswerResponseRef = useRef(saveAnswerResponse);
  saveAnswerResponseRef.current = saveAnswerResponse;

  useEffect(() => {
    const autosaver = createDebouncedDraftAutosaver<unknown>({
      delayMs: 600,
      getCurrentVersion: (questionId) =>
        draftVersionsRef.current.get(questionId) ?? 0,
      save: (questionId, response, version) =>
        saveAnswerResponseRef.current(questionId, response, version),
    });

    autosaverRef.current = autosaver;

    return () => {
      autosaverRef.current = null;
      void autosaver.flushAll().catch((error: unknown) => {
        console.error(
          "Assessment autosave cleanup flush failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      });
    };
  }, []);

  useEffect(() => {
    function warnBeforeLosingUnsavedAnswers(event: BeforeUnloadEvent) {
      const hasUnsavedAnswers = [...draftVersionsRef.current].some(
        ([questionId, version]) =>
          savedVersionsRef.current.get(questionId) !== version,
      );
      if (!hasUnsavedAnswers) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLosingUnsavedAnswers);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLosingUnsavedAnswers);
    };
  }, []);

  async function submitAssessment() {
    if (
      !session ||
      attemptStatus !== "in_progress" ||
      isSubmittingRef.current
    ) return;
    if (
      !window.confirm(
        "Submit your assessment now? Unsaved answers will be saved first. Unanswered questions score zero.",
      )
    ) {
      return;
    }
    isSubmittingRef.current = true;
    setMessage("");
    setIsSubmitting(true);
    let savingQuestionNumber: number | null = null;
    let submissionRequestStarted = false;
    try {
      if (inFlightSavesRef.current.size > 0) {
        setMessage("Saving your unsaved answers before submission…");
        await Promise.allSettled([...inFlightSavesRef.current]);
      }

      const latestDrafts = new Map(draftValuesRef.current);
      if (
        [...latestDrafts.keys()].some(
          (questionId) =>
            savedVersionsRef.current.get(questionId) !==
            (draftVersionsRef.current.get(questionId) ?? 0),
        )
      ) {
        setMessage("Saving your unsaved answers before submission…");
      }
      await autosaverRef.current?.flushAll();
      await saveAllPendingDrafts({
        getDrafts: () => draftValuesRef.current,
        getVersion: (questionId) =>
          draftVersionsRef.current.get(questionId) ?? 0,
        getSavedVersion: (questionId) =>
          savedVersionsRef.current.get(questionId),
        save: async (questionId, responseValue, version) => {
          savingQuestionNumber =
            session.questions.findIndex(({ id }) => id === questionId) + 1;
          await saveAnswerResponse(questionId, responseValue, version);
          savingQuestionNumber = null;
        },
      });

      submissionRequestStarted = true;
      const response = await fetchWithTimeout("/api/assessment/submit", {
        method: "POST",
        headers: await bearerHeaders(),
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: "submitted" | "expired";
        result?: AssessmentResult;
      };
      if (
        !response.ok ||
        (payload.status !== "submitted" && payload.status !== "expired") ||
        !payload.result
      ) {
        throw new Error(responseError(payload, "Submission could not be confirmed."));
      }
      setAttemptStatus(payload.status);
      setResult(payload.result);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : "Please check your connection and retry.";
      if (savingQuestionNumber !== null) {
        setMessage(
          detail.startsWith(`Question ${savingQuestionNumber}`)
            ? detail
            : `Question ${savingQuestionNumber} could not be saved. Your answer remains on this page. ${detail}`,
        );
      } else if (submissionRequestStarted) {
        let recovered = false;
        try {
          const recoveredSession = await loadSession();
          recovered =
            recoveredSession.result !== null &&
            (recoveredSession.attempt.status === "submitted" ||
              recoveredSession.attempt.status === "expired");
        } catch (recoveryError) {
          console.error(
            "Submission status recovery failed:",
            recoveryError instanceof Error ? recoveryError.name : "Unknown error",
          );
        }
        if (!recovered) {
          setMessage(
            "Submission is not confirmed. No result is shown until the server confirms it. Please retry.",
          );
        }
      } else {
        setMessage(
          `Submission could not be started. Your answer changes remain on this page; retry when ready. ${detail}`,
        );
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function setDraft(value: unknown) {
    if (!currentQuestion || isSubmittingRef.current) return;

    const questionId = currentQuestion.id;
    const version = (draftVersionsRef.current.get(questionId) ?? 0) + 1;

    draftValuesRef.current.set(questionId, value);
    draftVersionsRef.current.set(questionId, version);

    setDrafts((previous) => ({ ...previous, [questionId]: value }));
    setSavedIds((previous) => {
      const next = new Set(previous);
      next.delete(questionId);
      return next;
    });
    setSaveErrors((previous) => {
      if (!(questionId in previous)) return previous;
      const next = { ...previous };
      delete next[questionId];
      return next;
    });

    autosaverRef.current?.schedule(questionId, value, version);
  }


  if (isLoading) {
    return <main className="demo-assessment"><p role="status">Loading your assessment…</p></main>;
  }

  if (!session) {
    return (
      <main className="demo-assessment">
        <h1>Assessment unavailable</h1>
        <p role="alert">{message}</p>
        <p>
          We couldn’t load your assessment. Please try again or return to the
          instructions.
        </p>
        <button className="button button-primary" onClick={() => router.push("/start/instructions")} type="button">
          Return to instructions
        </button>
      </main>
    );
  }

  if (result) {
    const roundTitles = [
      "Pattern recognition",
      "Reasoning and logic",
      "Numerical and spatial games",
      "Risk management",
      "Workplace judgement",
    ];
    return (
      <main className="demo-assessment">
        <h1>Assessment result</h1>
        <p role="status" aria-live="polite">
          {attemptStatus === "expired"
            ? "Your time expired. The server has saved and scored your submitted answers."
            : "Submission confirmed. The server has saved and scored your answers."}
        </p>
        <p>Objective score</p>
        <p>
          Your score: <strong>{result.totalCorrect}/50</strong> (
          {result.percentage}%)
        </p>
        <p>
          Result: <strong>{result.outcome === "PASS" ? "Pass" : "Below pass mark"}</strong>.
          The pass mark is 40/50. This assessment preview is not used to make
          hiring decisions.
        </p>
        <h2>Section scores</h2>
        <ol className="demo-round-results">
          {result.rounds.map((round) => (
            <li key={round.round}>
              {roundTitles[round.round - 1]}: {round.correct}/10 ({round.correct * 10}%)
            </li>
          ))}
        </ol>
        {(result.behavioralAnsweredCount ?? 0) > 0 && (
          <p>
            Work-style responses recorded: {result.behavioralAnsweredCount}/5. These
            responses are separate from your objective score.
          </p>
        )}
        <p>Attempt status: {attemptStatus === "expired" ? "Time expired" : "Submitted"}</p>
        <button className="button button-primary" onClick={() => router.push("/")} type="button">
          Return to Mustarred
        </button>
      </main>
    );
  }

  if (attemptStatus !== "in_progress" || !currentQuestion) {
    return (
      <main className="demo-assessment">
        <h1>Attempt unavailable</h1>
        <p role="alert">{message || "This attempt is no longer active."}</p>
      </main>
    );
  }

  return (
    <main className="demo-assessment">
      <header className="demo-assessment-header">
        <div>
          <h1>{currentQuestion.roundTitle}</h1>
        </div>
        <div className="demo-timer" aria-label={`Time remaining ${formattedTime}`}>
          {formattedTime}
        </div>
      </header>
      <p className="demo-progress" aria-live="polite">
        Question {currentIndex + 1} of {session.questions.length} · {answeredCount} saved
      </p>
      {securityWarning && (
        <aside className="demo-security-notice" role="status" aria-live="polite">
          <p>
            We noticed the assessment window lost visibility or focus. Please keep
            this window active while you work. This does not affect your score or
            submission.
          </p>
          {securityEventLoggingFailed && (
            <p>
              This activity could not be recorded right now. Your assessment remains
              active; please keep this tab open.
            </p>
          )}
          <button onClick={() => setSecurityWarning(false)} type="button">
            Dismiss notice
          </button>
        </aside>
      )}
      <progress
        aria-label="Assessment progress"
        max={session.questions.length}
        value={answeredCount}
      />
      {Object.entries(saveErrors).length > 0 && (
        <aside className="demo-error" role="alert" aria-live="assertive">
          <p>Some answers could not be saved. Review them and retry before submitting:</p>
          <ul>
            {Object.entries(saveErrors).map(([questionId, error]) => {
              const failedQuestionIndex = session.questions.findIndex(
                (question) => question.id === questionId,
              );
              return (
                <li key={questionId}>
                  Question {failedQuestionIndex + 1}: {error}{" "}
                  {failedQuestionIndex >= 0 && (
                    <button
                      onClick={() => setCurrentIndex(failedQuestionIndex)}
                      type="button"
                    >
                      Review and retry
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      )}
      <nav className="demo-question-nav" aria-label="Question navigation">
        {session.questions.map((question, index) => (
          <button
            aria-current={index === currentIndex ? "step" : undefined}
            aria-label={`Question ${index + 1}${answers[question.id] !== undefined ? ", answered" : ", unanswered"}`}
            className={`${index === currentIndex ? "is-current " : ""}${answers[question.id] !== undefined ? "is-answered" : ""}`}
            key={question.id}
            onClick={() => {
              if (isSubmittingRef.current) return;
              setCurrentIndex(index);
              setMessage("");
            }}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </nav>
      <section className="demo-question-card" aria-labelledby="demo-question-title">
        <div className="demo-question-meta">
          <span>Question {currentIndex + 1}</span>
          <span>
            {currentQuestion.responseType === "behavioral"
              ? "Work-style reflection · not scored"
              : currentQuestion.format === "game"
              ? "Interactive question"
              : currentQuestion.format === "pattern"
                ? "Pattern and logic"
                : "Multiple choice"}
          </span>
        </div>
        <h2 id="demo-question-title">{currentQuestion.text}</h2>
        {currentQuestion.visual && <PatternDiagram visual={currentQuestion.visual} />}
        {currentQuestion.responseType === "behavioral" && (
          <p className="demo-reflection-note">
            There is no right answer. Choose the response that best reflects your usual approach.
          </p>
        )}
        {currentQuestion.format !== "game" && currentQuestion.options && (
          <fieldset className="demo-options">
            <legend>
              {currentQuestion.responseType === "behavioral"
                ? "Choose one response"
                : "Select one answer"}
            </legend>
            {currentQuestion.options.map((option) => (
              <label className="demo-option" key={option.id}>
                <input
                  checked={activeResponse === option.id}
                  disabled={isSubmitting}
                  name={`answer-${currentQuestion.id}`}
                  onChange={() => setDraft(option.id)}
                  type="radio"
                  value={option.id}
                />
                {currentQuestion.visual ? (
                  <span className="demo-visual-option">
                    <strong>{option.label}</strong>
                    <PatternTileView
                      tile={
                        currentQuestion.visual.choices.find(
                          (choice) => choice.id === option.id,
                        )?.tile
                      }
                    />
                  </span>
                ) : (
                  <span>{option.label}</span>
                )}
              </label>
            ))}
          </fieldset>
        )}
        {currentQuestion.format === "game" && currentQuestion.game && (
          <GameEditor
            question={currentQuestion}
            value={activeResponse}
            onChange={setDraft}
            disabled={isSubmitting}
          />
        )}
        <p className="demo-answer-state" aria-live="polite">
          {!saveErrors[currentQuestion.id] && savedIds.has(currentQuestion.id)
            ? "Answer saved"
            : "Answer not saved"}
        </p>
        <div className="demo-actions">
          {saveErrors[currentQuestion.id] && (
            <button
              className="button button-primary"
              disabled={isSubmitting || isSaving || secondsRemaining === 0}
              onClick={() => void saveAnswer()}
              type="button"
            >
              {isSaving ? "Saving…" : "Retry save"}
            </button>
          )}
          <div className="demo-prev-next">
            <button
              className="button"
              disabled={isSubmitting || currentIndex === 0}
              onClick={() => {
                if (isSubmittingRef.current) return;
                setCurrentIndex((index) => Math.max(0, index - 1));
              }}
              type="button"
            >
              Previous
            </button>
            <button
              className="button"
              disabled={isSubmitting || currentIndex === session.questions.length - 1}
              onClick={() => {
                if (isSubmittingRef.current) return;
                setCurrentIndex((index) => Math.min(session.questions.length - 1, index + 1));
              }}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {message && <p className="demo-error" role="alert">{message}</p>}
      <div className="demo-submit-row">
        <p>Unanswered questions score zero. Saved answers remain available if you refresh.</p>
        <button
          className="button button-primary"
          disabled={isSubmitting}
          onClick={() => void submitAssessment()}
          type="button"
        >
          {isSubmitting ? "Submitting…" : "Submit assessment"}
        </button>
      </div>
    </main>
  );
}

function PatternDiagram({
  visual,
}: {
  visual: NonNullable<PublicQuestion["visual"]>;
}) {
  return (
    <div
      className={`demo-pattern-diagram is-${visual.layout}`}
      role="img"
      aria-label={visual.layout === "sequence" ? "Visual shape sequence" : "Visual reasoning matrix"}
    >
      {visual.tiles.map((pattern, index) => (
        <div className={`demo-pattern-cell${pattern ? "" : " is-missing"}`} key={index}>
          {pattern ? <PatternTileView tile={pattern} /> : <span aria-hidden="true">?</span>}
        </div>
      ))}
    </div>
  );
}

function PatternTileView({
  tile,
  rotation = 0,
}: {
  tile?: PatternTile;
  rotation?: number;
}) {
  if (!tile) return <span className="demo-pattern-empty" aria-hidden="true" />;
  return (
    <svg aria-hidden="true" className="demo-pattern-svg" viewBox="0 0 100 100">
      {tile.glyphs.map((shape, index) => {
        const x = shape.x ?? 50;
        const y = shape.y ?? 50;
        const size = shape.size ?? 30;
        const transform = `translate(${x} ${y}) rotate(${(shape.rotation ?? 0) + rotation})`;
        return (
          <g key={`${shape.shape}-${index}`} transform={transform}>
            {shape.shape === "circle" ? (
              <circle cx="0" cy="0" r={size / 2} fill={shape.color} />
            ) : shape.shape === "square" ? (
              <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={shape.color} />
            ) : shape.shape === "triangle" ? (
              <polygon
                points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`}
                fill={shape.color}
              />
            ) : (
              <polygon
                points={`0,${-size / 2} ${size / 2},0 0,${size / 2} ${-size / 2},0`}
                fill={shape.color}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function rotateCells(
  cells: Array<{ x: number; y: number }>,
  rotation: number,
) {
  const rotated = cells.map(({ x, y }) => {
    if (rotation === 90) return { x: -y, y: x };
    if (rotation === 180) return { x: -x, y: -y };
    if (rotation === 270) return { x: y, y: -x };
    return { x, y };
  });
  const minX = Math.min(...rotated.map(({ x }) => x));
  const minY = Math.min(...rotated.map(({ y }) => y));
  return rotated.map(({ x, y }) => ({ x: x - minX, y: y - minY }));
}

function GameEditor({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: PublicQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const game = question.game!;
  const [selectedSudokuCell, setSelectedSudokuCell] = useState(-1);

  if (game.type === "sudoku") {
    const puzzle = game.puzzle ?? [];
    const clues = puzzle.flat();
    const values = Array.isArray(value)
      ? value.map((entry) => typeof entry === "string" ? entry : "")
      : clues.map((entry) => entry ? String(entry) : "");
    const firstEditableCell = clues.findIndex((entry) => entry === 0);
    const activeCell =
      selectedSudokuCell >= 0 && clues[selectedSudokuCell] === 0
        ? selectedSudokuCell
        : firstEditableCell;
    function setCell(nextValue: string) {
      if (activeCell < 0) return;
      const next = [...values];
      next[activeCell] = nextValue;
      onChange(next);
    }
    return (
      <fieldset className="demo-game-controls" disabled={disabled}>
        <legend>{game.instruction}</legend>
        <div className="demo-sudoku-grid" role="grid" aria-label="Four by four number puzzle">
          {puzzle.map((row, rowIndex) => (
            <div className="demo-sudoku-row" role="row" key={rowIndex}>
              {row.map((clue, columnIndex) => {
                const cellIndex = rowIndex * 4 + columnIndex;
                const isSelected = cellIndex === activeCell;
                return (
                  <button
                    aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}${clue ? ", fixed clue" : ""}`}
                    aria-selected={isSelected}
                    className={`demo-sudoku-cell${clue ? " is-clue" : ""}${isSelected ? " is-selected" : ""}`}
                    disabled={clue !== 0}
                    key={columnIndex}
                    onClick={() => setSelectedSudokuCell(cellIndex)}
                    role="gridcell"
                    type="button"
                  >
                    {values[cellIndex] || ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="demo-sudoku-controls" aria-label="Choose a number">
          {[1, 2, 3, 4].map((number) => (
            <button key={number} onClick={() => setCell(String(number))} type="button">
              {number}
            </button>
          ))}
          <button onClick={() => setCell("")} type="button">Clear</button>
        </div>
        <p className="demo-game-hint">Select an empty cell, then choose a number.</p>
      </fieldset>
    );
  }

  if (game.type === "block-placement") {
    const boardSize = game.boardSize ?? 5;
    const position =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as { x?: number; y?: number; rotation?: number }
        : {};
    const x = Number.isInteger(position.x) ? Number(position.x) : 0;
    const y = Number.isInteger(position.y) ? Number(position.y) : 0;
    const rotation = [0, 90, 180, 270].includes(Number(position.rotation))
      ? Number(position.rotation)
      : 0;
    const piece = rotateCells(game.pieceCells ?? [], rotation);
    const placedCells = piece.map((cell) => ({ x: cell.x + x, y: cell.y + y }));
    const targets = new Set((game.targetCells ?? []).map(({ x: targetX, y: targetY }) => `${targetX},${targetY}`));
    const placed = new Set(placedCells.map(({ x: pieceX, y: pieceY }) => `${pieceX},${pieceY}`));
    const hasOutsidePiece = placedCells.some(
      (cell) => cell.x < 0 || cell.y < 0 || cell.x >= boardSize || cell.y >= boardSize,
    );
    return (
      <fieldset className="demo-game-controls" disabled={disabled}>
        <legend>{game.instruction}</legend>
        <div
          className="demo-placement-board"
          role="group"
          aria-label={`Placement board, ${boardSize} rows by ${boardSize} columns`}
          style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: boardSize * boardSize }, (_, index) => {
            const cellX = index % boardSize;
            const cellY = Math.floor(index / boardSize);
            const id = `${cellX},${cellY}`;
            const isTarget = targets.has(id);
            const isPiece = placed.has(id);
            return (
              <button
                aria-label={`Row ${cellY + 1}, column ${cellX + 1}${isTarget ? ", outline" : ""}${isPiece ? ", piece" : ""}`}
                className={`demo-placement-cell${isTarget ? " is-target" : ""}${isPiece ? " is-piece" : ""}`}
                key={id}
                onClick={() => onChange({ x: cellX, y: cellY, rotation })}
                type="button"
              />
            );
          })}
        </div>
        <div className="demo-placement-controls">
          <button
            onClick={() => onChange({ x, y, rotation: (rotation + 270) % 360 })}
            type="button"
          >
            Rotate left
          </button>
          <span aria-live="polite">Orientation: {rotation}°</span>
          <button
            onClick={() => onChange({ x, y, rotation: (rotation + 90) % 360 })}
            type="button"
          >
            Rotate right
          </button>
        </div>
        <p className="demo-game-hint" aria-live="polite">
          {hasOutsidePiece ? "Part of the piece is outside the board." : "Click a board cell to place the piece."}
        </p>
      </fieldset>
    );
  }

  if (game.type === "rotation") {
    const turns = Number.isInteger(value) ? Number(value) : 0;
    return (
      <fieldset className="demo-game-controls" disabled={disabled}>
        <legend>{game.instruction}</legend>
        <div className="demo-rotation-stage">
          <PatternTileView tile={game.shape} rotation={turns * 90} />
        </div>
        <div className="demo-placement-controls">
          <button onClick={() => onChange((turns + 3) % 4)} type="button">Rotate left</button>
          <span aria-live="polite">Turns: {turns}</span>
          <button onClick={() => onChange((turns + 1) % 4)} type="button">Rotate right</button>
        </div>
      </fieldset>
    );
  }

  const items = game.items ?? [];
  if (game.type === "allocation") {
    const current =
      typeof value === "object" && value !== null
        ? (value as Record<string, number>)
        : {};
    return (
      <fieldset className="demo-game-controls" disabled={disabled}>
        <legend>{game.instruction}</legend>
        {items.map((item) => (
          <label className="demo-allocation-row" key={item.id}>
            <span>{item.label}</span>
            <input
              aria-label={`${item.label} tokens`}
              max={10}
              min={0}
              onChange={(event) =>
                onChange({ ...current, [item.id]: Number(event.target.value) })
              }
              type="number"
              value={current[item.id] ?? 0}
            />
          </label>
        ))}
      </fieldset>
    );
  }
  if (game.type === "matching") {
    const current =
      typeof value === "object" && value !== null
        ? (value as Record<string, string>)
        : {};
    return (
      <fieldset className="demo-game-controls" disabled={disabled}>
        <legend>{game.instruction}</legend>
        {items.map((item) => (
          <label className="demo-match-row" key={item.id}>
            <span>{item.label}</span>
            <select
              aria-label={`Control for ${item.label}`}
              onChange={(event) => onChange({ ...current, [item.id]: event.target.value })}
              value={current[item.id] ?? ""}
            >
              <option value="">Choose a control</option>
              {game.matches?.map((match) => (
                <option key={match.id} value={match.id}>{match.label}</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
    );
  }

  const order = orderFromResponse(question, value);
  function moveItem(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    if (question.id === "PE-02") {
      const excluded =
        typeof value === "object" && value !== null && !Array.isArray(value) &&
        Array.isArray((value as { excluded?: unknown }).excluded)
          ? (value as { excluded: string[] }).excluded
          : [];
      onChange({ order: next, excluded });
    } else {
      onChange(next);
    }
  }
  const excluded =
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    Array.isArray((value as { excluded?: unknown }).excluded)
      ? (value as { excluded: string[] }).excluded
      : [];

  if (items.length === 0) {
    return <p role="alert">This interactive question is unavailable. Please refresh the assessment.</p>;
  }

  return (
    <fieldset className="demo-game-controls" disabled={disabled}>
      <legend>{game.instruction}</legend>
      <ol className="demo-sort-list">
        {order.map((id, index) => {
          const item = items.find((entry) => entry.id === id);
          if (!item) return null;
          return (
            <li key={id}>
              <span>{index + 1}. {item.label}</span>
              <button
                aria-label={`Move ${item.label} up`}
                disabled={index === 0}
                onClick={() => moveItem(index, -1)}
                type="button"
              >↑</button>
              <button
                aria-label={`Move ${item.label} down`}
                disabled={index === order.length - 1}
                onClick={() => moveItem(index, 1)}
                type="button"
              >↓</button>
            </li>
          );
        })}
      </ol>
      {question.id === "PE-02" && game.extraItem && (
        <label className="demo-option">
          <input
            checked={excluded.includes(game.extraItem.id)}
            onChange={(event) =>
              onChange({
                order,
                excluded: event.target.checked ? [game.extraItem!.id] : [],
              })
            }
            type="checkbox"
          />
          <span>Exclude optional task: {game.extraItem.label}</span>
        </label>
      )}
    </fieldset>
  );
}
