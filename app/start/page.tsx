import type { Metadata } from "next";
import Link from "next/link";
import { CandidateWelcomeForm } from "./candidate-welcome-form";
import { CandidateFooter, CandidateHeader } from "./candidate-brand";

export const metadata: Metadata = {
  title: "Candidate registration | Mustarred",
  description:
    "Create an account or sign in to begin the Mustarred assessment.",
};

export default function CandidateWelcomePage() {
  return (
    <div className="candidate-flow">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <CandidateHeader backHref="/" backLabel="Back to overview" />

      <main className="welcome-main" id="main-content">
        <section className="welcome-panel" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Candidate registration
            </p>
            <h1 id="welcome-title">
              A little about
              <br />
              <span>you.</span>
            </h1>
            <p className="welcome-description">
              Create an account or sign in with your verified email to
              continue.
            </p>
            <div className="welcome-steps" aria-label="What to expect">
              <span>
                <i aria-hidden="true">01</i> Your details
              </span>
              <span aria-hidden="true" className="welcome-step-line" />
              <span>
                <i aria-hidden="true">02</i> Privacy notice
              </span>
              <span aria-hidden="true" className="welcome-step-line" />
              <span className="welcome-step-muted">
                <i aria-hidden="true">03</i> Assessment
              </span>
            </div>
            <p className="welcome-not-live">
              <span aria-hidden="true">✳</span>
              Your timer starts when you begin; existing attempts keep their original deadline.
            </p>
          </div>

          <CandidateWelcomeForm />
        </section>
        <Link className="welcome-instructions-link" href="/start/instructions">
          Review the instructions and optional unscored practice
          <span aria-hidden="true">→</span>
        </Link>
      </main>

      <CandidateFooter label="CANDIDATE REGISTRATION" />
    </div>
  );
}
