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
import { CandidateHeader, CandidateFooter } from "@/app/start/candidate-brand";

type CallbackOutcome = EmailConfirmationOutcome;
let callbackProcessing: Promise<CallbackOutcome> | null = null;

async function processCandidateEmailCallback(): Promise<CallbackOutcome> {
    const supabase = getSupabaseBrowserClient();
    let expectedEmail: string | null = null;
    try {
        expectedEmail = window.localStorage.getItem(
            PENDING_CONFIRMATION_EMAIL_KEY,
        );
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
                code =
                    typeof result.code === "string" ? result.code : undefined;
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

type PageState =
    | { kind: "loading" }
    | { kind: "verified" }
    | { kind: "needs_name" }
    | { kind: "already_verified" }
    | { kind: "error"; message: string };

export default function AuthCallbackPage() {
    const router = useRouter();
    const [state, setState] = useState<PageState>({ kind: "loading" });
    const [fullName, setFullName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameError, setNameError] = useState("");

    async function submitMissingName(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = fullName.trim();
        if (name.length < 1 || name.length > 120) {
            setNameError("Enter a name between 1 and 120 characters.");
            return;
        }

        setIsSavingName(true);
        setNameError("");
        try {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error(
                    "Your verified session is unavailable. Reopen the confirmation link.",
                );
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
                    result = (await response.json()) as {
                        error?: string;
                        code?: string;
                    };
                } catch {
                    // An empty/malformed response may follow a successful insert; retry idempotently.
                }
                if (response.ok) {
                    setState({ kind: "verified" });
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
                throw new Error(
                    result.error ?? "Candidate profile creation failed.",
                );
            }

            throw new Error("Candidate profile setup could not be confirmed.");
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.warn(
                    "Candidate profile setup failed:",
                    error instanceof Error ? error.name : "UnknownError",
                );
            }
            setNameError(
                error instanceof Error
                    ? error.message
                    : "We couldn't finish setting up your profile. Please try again.",
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

        void operation
            .then((outcome) => {
                if (cancelled) return;

                if (outcome.kind === "success") {
                    if (outcome.recovery) {
                        router.replace("/auth/update-password");
                        return;
                    }
                    setState({ kind: "verified" });
                    return;
                }
                if (outcome.kind === "already_verified") {
                    setState({ kind: "already_verified" });
                    return;
                }

                if (outcome.kind === "needs_name") {
                    setState({ kind: "needs_name" });
                    if (process.env.NODE_ENV === "development") {
                        console.warn(
                            "Verified account is missing a valid full_name value.",
                        );
                    }
                    return;
                }

                if (process.env.NODE_ENV === "development") {
                    console.warn(
                        "Candidate verification callback did not complete:",
                        {
                            outcome: outcome.kind,
                            ...(outcome.code ? { code: outcome.code } : {}),
                            ...("status" in outcome && outcome.status
                                ? { status: outcome.status }
                                : {}),
                        },
                    );
                }

                let message: string;
                if (outcome.kind === "invalid_link") {
                    message =
                        "Your registration may already be complete. You can try signing in below to continue to your assessment. If you're unable to sign in, please register again to receive a new confirmation link.";
                } else if (outcome.kind === "session_unavailable") {
                    message =
                        "The confirmation link could not be used in this browser. Try opening the link in the browser where you registered, or register again to receive a new link.";
                } else if (outcome.kind === "not_verified") {
                    message =
                        "Your registration may already be complete. You can try signing in below to continue to your assessment. If you're unable to sign in, please register again to receive a new confirmation link.";
                } else {
                    message =
                        "Your email is verified, but we couldn't finish setting up your account. Please sign in to retry.";
                }
                setState({ kind: "error", message });
            })
            .finally(() => {
                if (callbackProcessing === operation) callbackProcessing = null;
            });

        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <div className="candidate-flow">
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>
            <CandidateHeader />
            <main
                className="welcome-main welcome-main-centered"
                id="main-content"
            >
                <div className="welcome-form-card callback-card">
                    {state.kind === "loading" && (
                        <div className="callback-state">
                            <p className="eyebrow section-eyebrow">
                                Email verification
                            </p>
                            <h1 className="callback-heading">
                                Verifying your email…
                            </h1>
                            <p className="callback-body">
                                Please wait a moment.
                            </p>
                        </div>
                    )}

                    {state.kind === "verified" && (
                        <div className="callback-state">
                            <span
                                className="callback-icon callback-icon-success"
                                aria-hidden="true"
                            >
                                ✓
                            </span>
                            <p className="eyebrow section-eyebrow">
                                Email verified
                            </p>
                            <h1 className="callback-heading">
                                Your email is confirmed
                            </h1>
                            <p className="callback-body">
                                Your account is ready. Continue to the
                                assessment section.
                            </p>
                            <Link
                                className="button button-primary callback-action"
                                href="/start/instructions"
                            >
                                Continue to assessment →
                            </Link>
                        </div>
                    )}
                    {state.kind === "already_verified" && (
                        <div className="callback-state">
                            <span
                                className="callback-icon callback-icon-success"
                                aria-hidden="true"
                            >
                                ✓
                            </span>
                            <h1 className="callback-heading">
                                Your email is already confirmed
                            </h1>
                            <p className="callback-body">
                                Your email has been verified. Sign in to
                                continue to your assessment.
                            </p>
                            <Link
                                className="button button-primary callback-action"
                                href="/start?mode=signin"
                            >
                                Sign in
                            </Link>
                        </div>
                    )}
                    {state.kind === "needs_name" && (
                        <div className="callback-state">
                            <span
                                className="callback-icon callback-icon-success"
                                aria-hidden="true"
                            >
                                ✓
                            </span>
                            <p className="eyebrow section-eyebrow">
                                Email verified
                            </p>
                            <h1 className="callback-heading">One last step.</h1>
                            <p className="callback-body">
                                Your email is verified. Enter your name to
                                finish setting up your account.
                            </p>
                            <form
                                className="callback-name-form"
                                onSubmit={submitMissingName}
                            >
                                <div className="form-field">
                                    <label htmlFor="verified-candidate-name">
                                        Full name
                                    </label>
                                    <input
                                        autoComplete="name"
                                        id="verified-candidate-name"
                                        maxLength={120}
                                        onChange={(event) =>
                                            setFullName(event.target.value)
                                        }
                                        required
                                        value={fullName}
                                    />
                                    {nameError && (
                                        <span
                                            className="form-error"
                                            role="alert"
                                        >
                                            {nameError}
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="button button-primary welcome-submit"
                                    disabled={isSavingName}
                                    type="submit"
                                >
                                    {isSavingName
                                        ? "Saving…"
                                        : "Finish setup →"}
                                </button>
                            </form>
                        </div>
                    )}

                    {state.kind === "error" && (
                        <div className="callback-state">
                            {/* <span
                                className="callback-icon callback-icon-error"
                                aria-hidden="true"
                            >
                                ✕
                            </span>
                            <p className="eyebrow section-eyebrow">
                                Verification failed
                            </p>
                            <h1 className="callback-heading">
                                Something went wrong.
                            </h1> */}
                            <p
                                className="callback-body"
                                role="alert"
                                aria-live="assertive"
                            >
                                {state.message}
                            </p>
                            <Link
                                className="button button-primary callback-action"
                                href="/start?mode=signin"
                            >
                                Sign in
                            </Link>
                        </div>
                    )}
                </div>
            </main>
            <CandidateFooter label="CANDIDATE REGISTRATION" />
        </div>
    );
}
