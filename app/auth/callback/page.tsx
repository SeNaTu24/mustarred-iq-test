"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackOutcome =
  | { success: true; recovery?: boolean }
  | { success: false; stage: string; detail: string; needsName?: boolean };

let callbackProcessing: Promise<CallbackOutcome> | null = null;
const CALLBACK_TIMEOUT_MS = 20_000;

function getSafeErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }
  const code = error.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(code)
    ? code
    : "";
}

async function processCandidateEmailCallback(): Promise<CallbackOutcome> {
  let stage = "reading the verification response";
  let detail = "";
  let callbackPath = "";
  try {
    const callbackUrl = new URL(window.location.href);
    callbackPath = callbackUrl.pathname;
    const fragment = new URLSearchParams(callbackUrl.hash.slice(1));
    const callbackError =
      callbackUrl.searchParams.get("error") ?? fragment.get("error");
    if (callbackError) {
      const errorCode =
        callbackUrl.searchParams.get("error_code") ??
        fragment.get("error_code") ??
        "";
      detail = /^[A-Za-z0-9_.-]{1,80}$/.test(errorCode) ? errorCode : "";
      throw new Error("The email verification link is invalid or has expired.");
    }

    const code = callbackUrl.searchParams.get("code") ?? fragment.get("code");
    const tokenHash =
      callbackUrl.searchParams.get("token_hash") ?? fragment.get("token_hash");
    const accessToken =
      callbackUrl.searchParams.get("access_token") ??
      fragment.get("access_token");
    const refreshToken =
      callbackUrl.searchParams.get("refresh_token") ??
      fragment.get("refresh_token");
    const verificationType =
      callbackUrl.searchParams.get("type") ?? fragment.get("type");
    const isRecovery =
      verificationType === "recovery" ||
      callbackUrl.searchParams.get("flow") === "recovery";
    if (
      Number(Boolean(code)) +
        Number(Boolean(tokenHash)) +
        Number(Boolean(accessToken || refreshToken)) >
      1
    ) {
      throw new Error("The email verification link is invalid.");
    }

    const supabase = getSupabaseBrowserClient();
    if (code) {
      stage = "exchanging the verification code";
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        detail = getSafeErrorCode(error);
        throw new Error("The email verification link is invalid or has expired.");
      }
    } else if (tokenHash) {
      if (
        verificationType !== "signup" &&
        verificationType !== "email" &&
        verificationType !== "recovery"
      ) {
        throw new Error("The email verification link is invalid.");
      }
      stage = "verifying the confirmation token";
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: verificationType,
      });
      if (error) {
        detail = getSafeErrorCode(error);
        throw new Error("The email verification link is invalid or has expired.");
      }
    } else if (accessToken || refreshToken) {
      if (!accessToken || !refreshToken) {
        throw new Error("The email verification link is invalid.");
      }
      stage = "restoring the verification session";
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        detail = getSafeErrorCode(error);
        throw new Error("The email verification link is invalid or has expired.");
      }
    }

    stage = "restoring the Supabase session";
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      detail = getSafeErrorCode(sessionError);
      throw sessionError;
    }
    if (!session) {
      throw new Error(
        "No verified session was returned. The link may have expired or already been used.",
      );
    }

    stage = "confirming the verified email";
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.email_confirmed_at) {
      detail = getSafeErrorCode(userError);
      throw new Error(
        "Email verification could not be confirmed. Try the verification link again.",
      );
    }

    if (window.location.pathname === callbackUrl.pathname) {
      window.history.replaceState({}, document.title, callbackUrl.pathname);
    }

    if (isRecovery) {
      return { success: true, recovery: true };
    }

    stage = "creating the candidate profile";
    const response = await fetch("/api/candidate/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const result = (await response.json()) as {
      error?: string;
      code?: string;
    };
    if (
      response.status === 422 &&
      result.code === "candidate_name_required"
    ) {
      return {
        success: false,
        stage: "creating the candidate profile",
        detail: "candidate_name_required",
        needsName: true,
      };
    }
    if (!response.ok) {
      const errorCode =
        typeof result.code === "string" &&
        /^[A-Za-z0-9_.-]{1,80}$/.test(result.code)
          ? result.code
          : "";
      detail = `HTTP ${response.status}${errorCode ? ` (${errorCode})` : ""}`;
      throw new Error(result.error ?? "Candidate profile creation failed.");
    }

    return { success: true };
  } catch (error) {
    if (!detail && typeof error === "object" && error !== null && "name" in error) {
      const name = error.name;
      detail =
        typeof name === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(name)
          ? name
          : "";
    }
    if (callbackPath && window.location.pathname === callbackPath) {
      window.history.replaceState({}, document.title, callbackPath);
    }
    return { success: false, stage, detail };
  }
}

function withCallbackTimeout(
  operation: Promise<CallbackOutcome>,
): Promise<CallbackOutcome> {
  let timeoutId: number | undefined;
  const timeout = new Promise<CallbackOutcome>((resolve) => {
    timeoutId = window.setTimeout(
      () =>
        resolve({
          success: false,
          stage: "waiting for the verification response",
          detail: "timed_out",
        }),
      CALLBACK_TIMEOUT_MS,
    );
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
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

      const response = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName: name }),
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
      };
      if (!response.ok) {
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

      router.replace("/start/instructions?registration=complete");
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
      (callbackProcessing = withCallbackTimeout(
        processCandidateEmailCallback(),
      ));

    void operation.then((outcome) => {
      if (cancelled) return;
      if (outcome.success) {
        router.replace(
          outcome.recovery
            ? "/auth/update-password"
            : "/start/instructions?registration=complete",
        );
        return;
      }

      if (outcome.needsName) {
        setNeedsName(true);
        setMessage("Your email is verified. Enter your name to finish setting up your account.");
        if (process.env.NODE_ENV === "development") {
          console.warn("Verified account is missing a valid full_name value.");
        }
        return;
      }

      if (outcome.detail === "timed_out") {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
      setHasError(true);
      if (process.env.NODE_ENV === "development") {
        console.warn("Candidate verification failed:", {
          stage: outcome.stage,
          ...(outcome.detail ? { detail: outcome.detail } : {}),
        });
      }
      setMessage(
        outcome.detail === "timed_out"
          ? "Verification is taking longer than expected. Check your connection and try again. If you opened the email on another device, open the latest link in the browser where you registered."
          : "We couldn’t verify your email or finish setting up your account. The link may have expired or already been used. Try the latest link or sign in.",
      );
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
