
import Link from "next/link";
import { CandidateBrandLogo } from "./start/candidate-brand";

export default function Home() {
  return (
    <div className="candidate-flow">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="candidate-header">
        <Link
          className="candidate-brand-home"
          href="/"
          aria-label="Mustarred home"
        >
          <CandidateBrandLogo />
        </Link>
      </header>

      <main id="main-content">
        <section className="hero section-shell" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Mustarred Marketing Assessment
            </p>

            <h1>Your next opportunity starts here.</h1>

            <p className="hero-description">
              Complete this 30-question assessment as the next stage of your application for the Marketing role at Mustarred.
            </p>
            <p className="hero-description">
              The pass mark is 80%. Only candidates who meet or exceed this score will progress to the next stage.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/start">Get Started</a>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-card">
              <div className="art-center">
                <div className="art-ring">
                  <div className="art-ring-inner">
                    <span className="art-ring-star">✳</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="candidate-footer">
        <div className="candidate-footer-inner">
          <Link
            className="candidate-brand-home"
            href="/"
            aria-label="Mustarred home"
          >
            <CandidateBrandLogo size="footer" />
          </Link>

          <p>Thoughtful assessments. Human potential.</p>

          <a
            className="landing-footer-policy"
            href="https://www.mustarred.com/privacy-policy"
            rel="noopener noreferrer"
            target="_blank"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
