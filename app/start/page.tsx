import type { Metadata } from "next";
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

      <CandidateHeader logoClickable={false} />

      <main className="welcome-main" id="main-content">
        <CandidateWelcomeForm />
      </main>

      <CandidateFooter label="CANDIDATE REGISTRATION" />
    </div>
  );
}
