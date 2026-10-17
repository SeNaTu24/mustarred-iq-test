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
    description:
      "Business judgement, customer needs, priorities, and trade-offs.",
    tone: "peach",
  },
  {
    number: "02",
    title: "Personality and execution",
    description:
      "Work-related approaches to initiative, goals, follow-through, and setbacks.",
    tone: "lavender",
  },
  {
    number: "03",
    title: "Creativity and adaptability",
    description:
      "Flexible thinking, problem-solving, and responding to change.",
    tone: "mint",
  },
  {
    number: "04",
    title: "Risk awareness",
    description:
      "Prioritising uncertainty, potential impact, and practical controls.",
    tone: "blue",
  },
  {
    number: "05",
    title: "Emotional intelligence",
    description:
      "Workplace communication, empathy, and handling different perspectives.",
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
                <strong>20 minutes</strong>
                <small>Starts when you begin</small>
              </span>
            </div>
            <div className="assessment-fact">
              <span className="assessment-fact-icon fact-icon-lime" aria-hidden="true">
                50
              </span>
              <span>
                <strong>50 questions</strong>
                <small>10 questions in each round</small>
              </span>
            </div>
            <div className="assessment-fact">
              <span className="assessment-fact-icon fact-icon-peach" aria-hidden="true">
                5
              </span>
              <span>
                <strong>5 focus areas</strong>
                <small>A varied set of questions</small>
              </span>
            </div>
          </div>
          <p className="assessment-status-note">
            You have one attempt. The pass mark is 40 out of 50 (80%).
          </p>
          <p className="assessment-status-note">
            This assessment preview is for familiarisation and is not used to
            make hiring decisions.
          </p>
        </section>

        <section className="rounds-section" aria-labelledby="rounds-title">
          <div className="instructions-section-heading">
            <div>
              <p className="eyebrow section-eyebrow">Five rounds</p>
              <h2 id="rounds-title">A wider view of how you think.</h2>
            </div>
            <p>
              Each round has 10 questions. Expect multiple-choice workplace
              scenarios, number and pattern sequences, and interactive tasks
              such as ordering actions, prioritising work, and allocating
              resources.
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
                <span className="round-question-count">10 questions</span>
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
            uses your one permitted attempt and starts the 20-minute timer.
            There are 50 questions. The pass mark is 40/50 (80%). Save answers
            as you go, or submit to save any unsaved answers. Unanswered
            questions score zero.
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
