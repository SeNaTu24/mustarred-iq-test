import type { Metadata } from "next";
import { CandidatePractice } from "./candidate-practice";
import { RegistrationNotice } from "./registration-notice";
import { CandidateFooter, CandidateHeader } from "../candidate-brand";

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
            "Business decisions, commercial contribution, and constraints.",
        tone: "peach",
    },
    {
        number: "02",
        title: "Risk awareness and judgement",
        description:
            "Risk assessment, impact, and the selection of practical controls.",
        tone: "lavender",
    },
    {
        number: "03",
        title: "Creativity, problem-solving and adaptability",
        description:
            "Abstract reasoning and practical problem-solving under constraints.",
        tone: "mint",
    },
    {
        number: "04",
        title: "Personality, drive and execution",
        description:
            "Execution, critical paths, and prioritising work to meet goals.",
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
        <div className="candidate-flow">
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>

            <CandidateHeader logoClickable={false} />

            <main className="instructions-main" id="main-content">
                <RegistrationNotice />
                <section
                    className="instructions-hero"
                    aria-labelledby="instructions-title"
                >
                    <p className="eyebrow">
                        <span className="eyebrow-dot" aria-hidden="true" />
                        A few things to note
                    </p>
                    <h1 id="instructions-title">
                        One attempt.
                        <br />
                        <span>Make it count.</span>
                    </h1>
                    <p className="instructions-lede" style={{ color: "#000" }}>
                        This assessment explores how you approach decisions, solve
                        problems and work with others. Read each question carefully
                        and select the response that best reflects your judgement
                        and approach.
                    </p>
                    <div
                        className="assessment-facts"
                        aria-label="Assessment format"
                    >
                        <div className="assessment-fact">
                                                        <span>
                                <strong>12 minutes</strong>
                                <small>Starts when you begin</small>
                            </span>
                        </div>
                        <div className="assessment-fact">
                            <span>
                                <strong>30 questions</strong>
                                <small>5 competencies, 6 each</small>
                            </span>
                        </div>
                        <div className="assessment-fact">
                                                        <span>
                                <strong>24 / 30</strong>
                                <small>Provisional pass (80%)</small>
                            </span>
                        </div>
                        <div className="assessment-fact">
                                                        <span>
                                <strong>One attempt</strong>
                                <small>Original deadline preserved</small>
                            </span>
                        </div>
                    </div>
                </section>

                <section
                    className="rounds-section"
                    aria-labelledby="rounds-title"
                >
                    <div className="instructions-section-heading">
                        <div>
                            <h2 id="rounds-title">
                                A wider view of how you think.
                            </h2>
                        </div>
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
                            <span
                                className="practice-indicator"
                                aria-hidden="true"
                            />
                            Practice · Not scored
                        </p>
                        <h2 id="practice-title">Try a practice question.</h2>
                        <p>
                            Try a sample workplace scenario before you begin.
                            Your answer here is not scored.
                        </p>
                    </div>
                    <CandidatePractice />
                </section>

            </main>

            <CandidateFooter label="" />
        </div>
    );
}
