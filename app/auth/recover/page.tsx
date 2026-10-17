"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getAuthRedirectUrl } from "@/lib/supabase/auth-urls";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    if (typeof email !== "string") {
      setMessage("Enter a valid email address and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getAuthRedirectUrl("/auth/callback?flow=recovery") },
      );
      if (error) throw error;
      setMessage(
        "If an account exists for that email, a password recovery link will be sent. Open it using a browser that can reach this application.",
      );
    } catch {
      setMessage("We couldn’t send a recovery email right now. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="welcome-main" id="main-content">
      <section className="welcome-panel" aria-labelledby="recover-title">
        <div className="welcome-intro">
          <p className="eyebrow">Candidate account</p>
          <h1 id="recover-title">Reset your password</h1>
          <p className="welcome-description">
            Enter the email address associated with your verified candidate account.
          </p>
        </div>
        <form className="welcome-form" onSubmit={handleSubmit}>
          <label htmlFor="recovery-email">Email address</label>
          <input
            autoComplete="email"
            id="recovery-email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
          {message && <p role="status" aria-live="polite">{message}</p>}
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending…" : "Send recovery link"}
          </button>
        </form>
        <p><Link href="/start">Return to sign in</Link></p>
      </section>
    </main>
  );
}
