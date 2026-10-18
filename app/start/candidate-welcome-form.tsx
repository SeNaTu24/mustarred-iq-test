"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/supabase/auth-urls";
import { PENDING_CONFIRMATION_EMAIL_KEY } from "@/lib/supabase/email-confirmation";

const GENERIC_REGISTRATION_ERROR =
  "We couldn’t create your account. Check your details and try again. If the problem continues, contact support.";

function getDevelopmentDiagnostic(
  error: unknown,
  sensitiveValues: string[],
): string | undefined {
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  const details =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown; code?: unknown })
      : undefined;
  const message =
    typeof details?.message === "string" ? details.message : undefined;
  const code =
    typeof details?.code === "string" &&
    /^[A-Za-z0-9_.-]{1,80}$/.test(details.code)
      ? details.code
      : undefined;

  if (!message && !code) {
    return "No Supabase error details were returned. Check the browser Network panel for the signup request.";
  }

  let safeMessage = message ?? "No error message returned.";
  const valuesToRedact = sensitiveValues.filter((value) => value.length > 0);
  for (const value of valuesToRedact) {
    safeMessage = safeMessage.replaceAll(value, "[redacted]");
  }
  safeMessage = safeMessage
    .replace(
      /\b(?:bearer\s+)?eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gi,
      "[redacted token]",
    )
    .replace(
      /\b(?:access[_-]?token|refresh[_-]?token|password|(?:service[_-]?role|publishable|anon|api)[ _-]?(?:key|token))\b\s*[:=]\s*[^\s,;]+/gi,
      "[redacted credential]",
    )
    .replace(/https?:\/\/\S+/gi, "[redacted URL]")
    .slice(0, 300);

  return `Supabase signup${code ? ` (${code})` : ""}: ${safeMessage}`;
}

function getSafeAuthErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }
  const code = error.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(code)
    ? code
    : "";
}

export function CandidateWelcomeForm() {
  const router = useRouter();
  const [nameError, setNameError] = useState(false);
  const [isSignInMode, setIsSignInMode] = useState(false);
  const [needsProfileName, setNeedsProfileName] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fullNameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormFeedback(null);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const fullName = formData.get("fullName");
    const email = formData.get("email");
    const password = formData.get("password");

    if (
      (!isSignInMode || needsProfileName) &&
      (typeof fullName !== "string" || fullName.trim().length === 0)
    ) {
      setNameError(true);
      fullNameRef.current?.focus();
      return;
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      (!isSignInMode && password.length < 8)
    ) {
      setFormFeedback({
        type: "error",
        message:
          "Enter a valid email address and a password of at least 8 characters.",
      });
      return;
    }

    setNameError(false);
    setIsSubmitting(true);

    try {
      if (isSignInMode) {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.session || !data.user) {
          const errorCode = getSafeAuthErrorCode(error);
          if (process.env.NODE_ENV === "development" && errorCode) {
            console.warn("Candidate sign-in failed:", errorCode);
          }
          setFormFeedback({
            type: "error",
            message:
              errorCode === "email_not_confirmed"
                ? "Verify your email using the latest confirmation link, then sign in."
                : "We couldn’t sign you in. Check your email and password and try again.",
          });
          return;
        }
        if (!data.user.email_confirmed_at) {
          setFormFeedback({
            type: "error",
            message:
              "Verify your email using the latest confirmation link, then sign in.",
          });
          return;
        }

        const profileResponse = await fetch("/api/candidate/profile", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          ...(needsProfileName && typeof fullName === "string"
            ? { body: JSON.stringify({ fullName: fullName.trim() }) }
            : {}),
        });
        const profileResult = (await profileResponse.json()) as {
          error?: string;
          code?: string;
        };
        if (
          profileResponse.status === 422 &&
          profileResult.code === "candidate_name_required"
        ) {
          setNeedsProfileName(true);
          setFormFeedback({
            type: "error",
            message:
              "Your email is verified. Enter your name to finish setting up your account.",
          });
          return;
        }
        if (!profileResponse.ok) {
          setFormFeedback({
            type: "error",
            message:
              profileResult.error ??
              "We couldn’t complete your registration. Please try again.",
          });
          return;
        }

        router.replace("/start/instructions?registration=complete");
        return;
      }

      const normalizedEmail = email.trim();
      const redirectTo = getAuthRedirectUrl("/auth/callback");
      const { error } = await getSupabaseBrowserClient().auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: typeof fullName === "string" ? fullName.trim() : "",
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        try {
          if (
            window.localStorage.getItem(PENDING_CONFIRMATION_EMAIL_KEY) ===
            normalizedEmail
          ) {
            window.localStorage.removeItem(PENDING_CONFIRMATION_EMAIL_KEY);
          }
        } catch {
          // Leave registration feedback independent of storage availability.
        }
        const diagnostic = getDevelopmentDiagnostic(error, [
          password,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
        ]);
        if (diagnostic) console.warn(diagnostic);
        setFormFeedback({
          type: "error",
          message: GENERIC_REGISTRATION_ERROR,
        });
        return;
      }

      try {
        window.localStorage.setItem(
          PENDING_CONFIRMATION_EMAIL_KEY,
          normalizedEmail,
        );
      } catch {
        // The first-use confirmation callback does not depend on browser storage.
      }
      setFormFeedback({
        type: "success",
        message:
          "We’ve sent a confirmation link to your email. Open it to verify your account, then return here to sign in.",
      });
      form.reset();
    } catch (error) {
      if (isSignInMode) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Candidate sign-in request failed:",
            error instanceof Error ? error.name : "UnknownError",
          );
        }
        setFormFeedback({
          type: "error",
          message:
            "We couldn’t complete sign-in. Check your connection and try again.",
        });
        return;
      }
      const diagnostic = getDevelopmentDiagnostic(error, [
        password,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      ]);
      if (diagnostic) console.warn(diagnostic);
      setFormFeedback({
        type: "error",
        message:
          error instanceof Error &&
          error.message.includes("NEXT_PUBLIC_SITE_URL")
            ? "We can’t send a verification email right now. Please try again later or contact support."
            : GENERIC_REGISTRATION_ERROR,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="welcome-form-card">
      <form className="welcome-form" onSubmit={handleSubmit}>
        <div className="welcome-form-heading">
          <p className="eyebrow section-eyebrow">
            {isSignInMode ? "Candidate sign in" : "Candidate registration"}
          </p>
          <h2>{isSignInMode ? "Welcome back" : "Your details"}</h2>
          <p>
            {isSignInMode
              ? "Sign in with your verified account. We’ll check your candidate profile and finish setting it up if needed."
              : "Register with an email address you can verify."}
          </p>
        </div>

        {(!isSignInMode || needsProfileName) && (
          <div className="form-field">
            <label htmlFor="candidate-name">Full name</label>
            <input
              ref={fullNameRef}
              autoComplete="name"
              id="candidate-name"
              maxLength={120}
              name="fullName"
              placeholder="e.g. Alex Morgan"
              required
              aria-describedby={nameError ? "candidate-name-error" : undefined}
              aria-invalid={nameError}
              onChange={() => {
                if (nameError) setNameError(false);
              }}
            />
            {nameError && (
              <span
                className="form-error"
                id="candidate-name-error"
                role="alert"
              >
                Enter your name to continue.
              </span>
            )}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="candidate-email">Email address</label>
          <input
            autoComplete="email"
            id="candidate-email"
            maxLength={254}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="candidate-password">Password</label>
          <input
            autoComplete={isSignInMode ? "current-password" : "new-password"}
            id="candidate-password"
            minLength={isSignInMode ? undefined : 8}
            name="password"
            required
            type="password"
          />
        </div>

        {!isSignInMode && (
          <aside className="privacy-notice" aria-labelledby="privacy-heading">
            <div className="privacy-heading-row">
              <span className="privacy-icon" aria-hidden="true">
                ◈
              </span>
              <h3 id="privacy-heading">Important before registering</h3>
            </div>
            <p>
              We use your email to create your account and link your name after
              verification. Beginning the assessment creates your one attempt
              and starts the 20-minute timer.
            </p>
          </aside>
        )}

        {!isSignInMode && (
          <label className="privacy-check">
            <input name="privacyAcknowledged" required type="checkbox" />
            <span>
              I understand my details will be sent to Supabase to create my
              account.
            </span>
          </label>
        )}

        {formFeedback && (
          <div
            className={
              formFeedback.type === "success"
                ? "privacy-notice"
                : "form-error"
            }
            role={formFeedback.type === "success" ? "status" : "alert"}
            aria-live={formFeedback.type === "success" ? "polite" : "assertive"}
          >
            <p>{formFeedback.message}</p>
            {formFeedback.type === "success" && (
              <p>Can’t find the email? Check your spam or junk folder.</p>
            )}
          </div>
        )}

        <button
          className="button button-primary welcome-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? isSignInMode
              ? "Signing in…"
              : "Registering…"
            : isSignInMode
              ? "Sign in"
              : "Register"}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </button>

        <p className="form-footnote">
          {isSignInMode
            ? "Your email must be verified before you can begin."
            : "Verify your email before beginning the assessment."}{" "}
          <Link href="/start/instructions">Review the instructions</Link>.
        </p>
        {!isSignInMode && (
          <Link className="text-link" href="/auth/callback">
            Already verified? Continue
          </Link>
        )}
        {isSignInMode && (
          <Link className="text-link" href="/auth/recover">
            Forgot your password?
          </Link>
        )}
        <button
          className="text-link candidate-auth-toggle"
          onClick={() => {
            setIsSignInMode((current) => !current);
            setNeedsProfileName(false);
            setNameError(false);
            setFormFeedback(null);
          }}
          type="button"
        >
          {isSignInMode
            ? "New candidate? Register"
            : "Already have an account? Sign in and finish setup"}
        </button>
      </form>
    </div>
  );
}
