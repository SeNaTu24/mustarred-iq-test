export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <a className="wordmark" href="#overview" aria-label="Mustarred home">
          <span className="wordmark-icon" aria-hidden="true">
            m
          </span>
          <span>mustarred</span>
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
              A 50-question assessment focused on work-related decisions,
              reasoning, and problem-solving.
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

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <a className="wordmark footer-wordmark" href="#overview">
            <span className="wordmark-icon" aria-hidden="true">
              m
            </span>
            <span>mustarred</span>
          </a>
          <a
            className="footer-year"
            href="https://www.mustarred.com/privacy-policy"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mustarred Privacy Policy
          </a>
          <a className="footer-year" href="/recruiter/sign-in">
            Recruiter sign in
          </a>
        </div>
      </footer>
    </>
  );
}
