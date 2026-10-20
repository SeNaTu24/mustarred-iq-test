"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function RecruiterSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.session) {
        throw new Error("Sign-in did not create a session. Please try again.");
      }

      const response = await fetch("/api/recruiter/results", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await supabase.auth.signOut();
        }
        throw new Error(
          payload.error ?? "This account is not authorised to review results.",
        );
      }

      router.replace("/recruiter");
      router.refresh();
    } catch (signInFailure) {
      setError(
        signInFailure instanceof Error
          ? signInFailure.message
          : "Could not sign in. Check your details and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="recruiter-page">
      
      <h1>Recruiter sign in</h1>
      <p>
        Sign in with a verified Supabase account that has been assigned the
        recruiter role by a trusted administrator. Access is verified by the
        server; candidate-editable profile metadata is not used for roles.
      </p>
      <form className="recruiter-sign-in-form" onSubmit={handleSubmit}>
        <label htmlFor="recruiter-email">Email address</label>
        <input
          autoComplete="username"
          id="recruiter-email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <label htmlFor="recruiter-password">Password</label>
        <input
          autoComplete="current-password"
          id="recruiter-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        {error && <p className="demo-error" role="alert">{error}</p>}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Checking access…" : "Sign in"}
        </button>
      </form>
      <p><Link href="/">Return to Mustarred</Link></p>
    </main>
  );
}
