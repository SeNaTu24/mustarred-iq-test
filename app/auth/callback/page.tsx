"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  PENDING_CONFIRMATION_EMAIL_KEY,
  processEmailConfirmation,
  type EmailConfirmationOutcome,
} from "@/lib/supabase/email-confirmation";

type CallbackOutcome = EmailConfirmationOutcome;
let callbackProcessing: Promise<CallbackOutcome> | null = null;

async function processCandidateEmailCallback(): Promise<CallbackOutcome> {
  const supabase = getSupabaseBrowserClient();
  let expectedEmail: string | null = null;
  try {
    expectedEmail = window.localStorage.getItem(PENDING_CONFIRMATION_EMAIL_KEY);
  } catch {
    // A successful first-use callback still works when browser storage is unavailable.
  }

  const outcome = await processEmailConfirmation({
    callbackUrl: window.location.href,
    expectedEmail,
    auth: {
      exchangeCodeForSession: (code) =>
        supabase.auth.exchangeCodeForSession(code),
      verifyOtp: (params) => supabase.auth.verifyOtp(params),
      setSession: (tokens) => supabase.auth.setSession(tokens),
      getSession: () => supabase.auth.getSession(),
      getUser: () => supabase.auth.getUser(),
    },
    ensureCandidateProfile: async (accessToken) => {
      const response = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      let code: string | undefined;
      try {
        const result = (await response.json()) as { code?: unknown };
        code = typeof result.code === "string" ? result.code : undefined;
      } catch {
        // The retry below safely rechecks the profile through the idempotent endpoint.
      }
      return { ok: response.ok, status: response.status, code };
    },
  });

  const currentUrl = new URL(window.location.href);
  if (currentUrl.search || currentUrl.hash) {
    window.history.replaceState({}, document.title, currentUrl.pathname);
  }

  if (outcome.kind === "success" && !outcome.recovery) {
    try {
      window.localStorage.removeItem(PENDING_CONFIRMATION_EMAIL_KEY);
    } catch {
      // Profile setup has succeeded; local storage cleanup is best-effort only.
    }
  }
  return outcome;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email…");
  const [hasError, setHasError] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  async function submitMissingName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (name.length < 1 || name.length > 120) {
      setMessage("Enter a name between 1 and 120 characters.");
      setHasError(true);
      return;
    }

    setIsSavingName(true);
    setHasError(false);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Your verified session is unavailable. Reopen the confirmation link.");
      }
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user?.email_confirmed_at) {
        throw new Error("Email verification could not be confirmed.");
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        let response: Response;
        try {
          response = await fetch("/api/candidate/profile", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fullName: name }),
          });
        } catch (error) {
          if (attempt === 0) continue;
          throw error;
        }

        let result: { error?: string; code?: string } = {};
        try {
          result = (await response.json()) as { error?: string; code?: string };
        } catch {
          // An empty/malformed response may follow a successful insert; retry idempotently.
        }
        if (response.ok) {
          router.replace("/start/instructions?registration=complete");
          return;
        }
        if (response.status >= 500 && attempt === 0) continue;

        const errorCode =
          typeof result.code === "string" &&
          /^[A-Za-z0-9_.-]{1,80}$/.test(result.code)
            ? result.code
            : "";
        if (process.env.NODE_ENV === "development") {
          console.warn("Candidate profile request failed:", {
            status: response.status,
            ...(errorCode ? { code: errorCode } : {}),
          });
        }
        throw new Error(result.error ?? "Candidate profile creation failed.");
      }

      throw new Error("Candidate profile setup could not be confirmed.");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Candidate profile setup failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
      }
      setHasError(true);
      setMessage(
        "We couldn’t finish setting up your profile. Please try again or return to sign in.",
      );
    } finally {
      setIsSavingName(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const operation =
      callbackProcessing ??
      (callbackProcessing = processCandidateEmailCallback());

    void operation.then((outcome) => {
      if (cancelled) return;
      if (outcome.kind === "success") {
        router.replace(
          outcome.recovery
            ? "/auth/update-password"
            : "/start/instructions?registration=complete",
        );
        return;
      }

      if (outcome.kind === "needs_name") {
        setNeedsName(true);
        setMessage("Your email is verified. Enter your name to finish setting up your account.");
        if (process.env.NODE_ENV === "development") {
          console.warn("Verified account is missing a valid full_name value.");
        }
        return;
      }

      setHasError(true);
      if (process.env.NODE_ENV === "development") {
        console.warn("Candidate verification callback did not complete:", {
          outcome: outcome.kind,
          ...(outcome.code ? { code: outcome.code } : {}),
          ...("status" in outcome && outcome.status
            ? { status: outcome.status }
            : {}),
        });
      }

      if (outcome.kind === "invalid_link") {
  setMessage(
    "Your email may already be verified. Please try signing in. If you cannot sign in, request a new confirmation link.",
  );
} else if (outcome.kind === "session_unavailable") {
        setMessage(
          "The confirmation link could not be used in this browser. Return to candidate sign-in and finish setup there, or request a new link in the browser where you registered.",
        );
      } else if (outcome.kind === "not_verified") {
        setMessage(
          "Your email is not confirmed yet. Request a new confirmation link before signing in.",
        );
      } else {
        setMessage(
          "Your email is verified, but we couldn’t confirm that account setup finished. Sign in to retry setup; your account history is unchanged.",
        );
      }
    }).finally(() => {
      if (callbackProcessing === operation) callbackProcessing = null;
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="welcome-main" id="main-content">
      <section className="welcome-panel" aria-labelledby="callback-title">
        <div className="welcome-intro">
          <p className="eyebrow">Candidate registration</p>
          <h1 id="callback-title">One moment.</h1>
          <p
            className="welcome-description"
            role={hasError ? "alert" : "status"}
            aria-live={hasError ? "assertive" : "polite"}
          >
            {message}
          </p>
          {needsName && (
            <form className="welcome-form" onSubmit={submitMissingName}>
              <label htmlFor="verified-candidate-name">Full name</label>
              <input
                autoComplete="name"
                id="verified-candidate-name"
                maxLength={120}
                onChange={(event) => setFullName(event.target.value)}
                required
                value={fullName}
              />
              <button
                className="button button-primary"
                disabled={isSavingName}
                type="submit"
              >
                {isSavingName ? "Saving…" : "Finish registration"}
              </button>
            </form>
          )}
          {message !== "Verifying your email…" && (
            <Link className="button button-primary" href="/start">
              Return to registration
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
