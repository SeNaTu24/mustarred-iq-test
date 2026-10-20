import { CandidateBrandLogo } from "./start/candidate-brand";

export default function Home() {
  return (
    <div className="candidate-flow">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="candidate-header">
        <a className="candidate-brand-home" href="/" aria-label="Mustarred home">
          <CandidateBrandLogo />
        </a>
      </header>

      <main id="main-content">
        <section className="hero section-shell" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Candidate assessment
            </p>
            <h1>
              Show us how
              <br />
              <span>you think.</span>
            </h1>
            <p className="hero-description">
              A 30-question professional assessment evaluating commercial awareness, risk judgement, problem-solving, execution, and emotional intelligence.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/start">
                Register or sign in
                <span className="button-arrow" aria-hidden="true">
                  →
                </span>
              </a>
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
          <a className="candidate-brand-home" href="/" aria-label="Mustarred home">
            <CandidateBrandLogo size="footer" />
          </a>
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
