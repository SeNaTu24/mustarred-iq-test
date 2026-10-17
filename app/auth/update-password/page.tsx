"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmation = formData.get("confirmPassword");
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password !== confirmation
    ) {
      setMessage("Enter matching passwords with at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setMessage("Your recovery session is unavailable. Request a new link.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace("/start");
    } catch {
      setMessage("We couldn’t update your password. Request a new recovery link and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="welcome-main" id="main-content">
      <section className="welcome-panel" aria-labelledby="update-password-title">
        <div className="welcome-intro">
          <p className="eyebrow">Candidate account</p>
          <h1 id="update-password-title">Choose a new password</h1>
          <p className="welcome-description">
            Use at least 8 characters. Your existing assessment history will remain unchanged.
          </p>
        </div>
        <form className="welcome-form" onSubmit={handleSubmit}>
          <label htmlFor="new-password">New password</label>
          <input
            autoComplete="new-password"
            id="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            autoComplete="new-password"
            id="confirm-password"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
          {message && <p role="alert" aria-live="assertive">{message}</p>}
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
        <p><Link href="/start">Return to sign in</Link></p>
      </section>
    </main>
  );
}
