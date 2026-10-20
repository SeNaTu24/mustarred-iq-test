import type { Metadata } from "next";
import Link from "next/link";
import { CandidatePractice } from "./candidate-practice";
import { RegistrationNotice } from "./registration-notice";

export const metadata: Metadata = {
  title: "Assessment instructions | Mustarred",
  description:
    "Review the assessment format and try an optional unscored practice question.",
};

const rounds = [
  {
    number: "01",
    title: "Commercial awareness",
    description: "Business decisions, commercial contribution, and constraints.",
    tone: "peach",
  },
  {
    number: "02",
    title: "Risk awareness and judgement",
    description: "Risk assessment, impact, and the selection of practical controls.",
    tone: "lavender",
  },
  {
    number: "03",
    title: "Creativity, problem-solving and adaptability",
    description: "Abstract reasoning and practical problem-solving under constraints.",
    tone: "mint",
  },
  {
    number: "04",
    title: "Personality, drive and execution",
    description: "Execution, critical paths, and prioritising work to meet goals.",
    tone: "blue",
  },
  {
    number: "05",
    title: "Emotional intelligence and professional maturity",
    description: "Evidence-based judgement, accountability, and empathy.",
    tone: "yellow",
  },
];

export default function CandidateInstructionsPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Mustarred home">
          <span className="wordmark-icon" aria-hidden="true">
            m
          </span>
          <span>mustarred</span>
        </Link>
        <Link className="header-link" href="/start">
          <span aria-hidden="true">←</span> Back to welcome
        </Link>
      </header>

      <main className="instructions-main" id="main-content">
        <RegistrationNotice />
        <section className="instructions-hero" aria-labelledby="instructions-title">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Before you begin
          </p>
          <h1 id="instructions-title">
            Take a moment.
            <br />
            <span>Then make it yours.</span>
          </h1>
          <p className="instructions-lede">
            The assessment explores different ways of thinking about work.
            Read each question carefully and choose the response that best
            reflects your approach.
          </p>
          <div className="assessment-facts" aria-label="Assessment format">
            <div className="assessment-fact">
              <span className="assessment-fact-icon" aria-hidden="true">
                ◷
              </span>
              <span>
              <strong>12 minutes</strong>
              <small>Starts when you begin</small>
              </span>
            </div>
            <div className="assessment-fact">
              <span className="assessment-fact-icon fact-icon-lime" aria-hidden="true">
                30
              </span>
              <span>
              <strong>30 questions</strong>
              <small>6 questions in each category</small>
              </span>
            </div>
            <div className="assessment-fact">
              <span className="assessment-fact-icon fact-icon-peach" aria-hidden="true">
                5
              </span>
              <span>
              <strong>5 competencies</strong>
              <small>Balanced questions in each</small>
              </span>
            </div>
          </div>
          <p className="assessment-status-note">
            Each correct answer is worth 4 marks. You have one attempt, with a
            provisional pass threshold of 24 out of 30 (80%). Existing attempts
            keep their original question set and deadline.
          </p>
        </section>

        <section className="rounds-section" aria-labelledby="rounds-title">
          <div className="instructions-section-heading">
            <div>
              <p className="eyebrow section-eyebrow">Five rounds</p>
              <h2 id="rounds-title">A wider view of how you think.</h2>
            </div>
            <p>
              Each competency has six questions. Expect a balanced mix of
              abstract reasoning and practical scenarios.
            </p>
          </div>

          <ol className="rounds-grid">
            {rounds.map((round) => (
              <li className="round-card" key={round.number}>
                <span className={`round-number ${round.tone}`}>
                  {round.number}
                </span>
                <div>
                  <h3>{round.title}</h3>
                  <p>{round.description}</p>
                </div>
                <span className="round-question-count">6 questions</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="practice-section"
          aria-labelledby="practice-title"
          id="practice"
        >
          <div className="practice-intro">
            <p className="eyebrow practice-eyebrow">
              <span className="practice-indicator" aria-hidden="true" />
              Optional · unscored
            </p>
            <h2 id="practice-title">Try a practice question.</h2>
            <p>
              Try a sample workplace scenario before you begin. Your answer
              here is not scored.
            </p>
          </div>
          <CandidatePractice />
        </section>

        <aside className="instructions-reminder" aria-label="Before you begin">
          <span className="reminder-symbol" aria-hidden="true">
            ✳
          </span>
          <p>
            The instructions and practice are untimed. Beginning the assessment
            uses your one permitted attempt and starts the 12-minute timer.
            There are 30 questions, with six from each competency. The provisional
            pass threshold is 24/30 (80%). Save answers as you go, or submit to
            save any unsaved answers. Unanswered questions score zero.
          </p>
          <Link className="reminder-link" href="#instructions-title">
            Back to the top <span aria-hidden="true">↑</span>
          </Link>
        </aside>
      </main>

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <Link className="wordmark footer-wordmark" href="/">
            <span className="wordmark-icon" aria-hidden="true">
              m
            </span>
            <span>mustarred</span>
          </Link>
          <p>Thoughtful assessments. Human potential.</p>
          <span className="footer-year">CANDIDATE INSTRUCTIONS</span>
        </div>
      </footer>
    </>
  );
}
