const focusAreas = [
  {
    number: "01",
    title: "Commercial awareness",
    description:
      "Weigh customer needs, business priorities, and the trade-offs behind a decision.",
    tone: "peach",
  },
  {
    number: "02",
    title: "Personality & execution",
    description:
      "Explore how you approach goals, follow-through, initiative, and setbacks.",
    tone: "lavender",
  },
  {
    number: "03",
    title: "Creativity & adaptability",
    description:
      "Look for fresh approaches, solve problems, and respond to changing conditions.",
    tone: "mint",
  },
  {
    number: "04",
    title: "Risk awareness",
    description:
      "Consider uncertainty, potential impact, and ways to make informed choices.",
    tone: "blue",
  },
  {
    number: "05",
    title: "Emotional intelligence",
    description:
      "Think through communication, empathy, and everyday workplace situations.",
    tone: "yellow",
  },
];

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

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#focus-areas">Focus areas</a>
          <a href="#approach">Our approach</a>
        </nav>

        <a className="header-link" href="#preview-note">
          Candidate preview <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="main-content">
        <section className="hero section-shell" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              A more thoughtful talent assessment
            </p>
            <h1>
              Show us how
              <br />
              <span>you think.</span>
            </h1>
            <p className="hero-description">
              Explore how you approach the decisions and situations that shape
              the world of work.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#focus-areas">
                Explore the focus areas
                <span className="button-arrow" aria-hidden="true">
                  →
                </span>
              </a>
              <a className="text-link" href="#approach">
                Our approach
              </a>
            </div>
            <div className="hero-footnote">
              <span className="footnote-mark" aria-hidden="true">
                ✳
              </span>
              <p>
                Not an IQ test. A chance to show more of what you can bring.
              </p>
            </div>
          </div>

          <div className="hero-art" aria-label="Five areas of work potential">
            <div className="art-orbit orbit-one" aria-hidden="true" />
            <div className="art-orbit orbit-two" aria-hidden="true" />
            <span className="art-spark spark-one" aria-hidden="true">
              ✳
            </span>
            <span className="art-spark spark-two" aria-hidden="true">
              ✳
            </span>
            <div className="art-card">
              <div className="art-card-top">
                <span className="art-label">A wider view</span>
                <span className="art-card-mark" aria-hidden="true">
                  m.
                </span>
              </div>
              <div className="art-center">
                <div className="art-ring" aria-hidden="true">
                  <div className="art-ring-inner">
                    <span className="art-ring-star">✳</span>
                  </div>
                </div>
                <span className="art-caption">Potential takes many forms</span>
              </div>
              <div className="art-card-bottom">
                <span>CURIOUS</span>
                <span className="art-bottom-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>CAPABLE</span>
              </div>
            </div>
            <div className="floating-note note-top">
              <span className="note-icon note-icon-peach" aria-hidden="true">
                ↗
              </span>
              <span>
                <strong>5 focus areas</strong>
                <small>A fuller picture</small>
              </span>
            </div>
            <div className="floating-note note-bottom">
              <span className="note-icon note-icon-lime" aria-hidden="true">
                <span />
              </span>
              <span>
                <strong>Real-world thinking</strong>
                <small>Room for your perspective</small>
              </span>
            </div>
          </div>
        </section>

        <section className="intro-band" aria-label="Assessment overview">
          <div className="section-shell intro-band-inner">
            <p>
              <span className="intro-star" aria-hidden="true">
                ✳
              </span>
              A considered look at how people think, respond, and grow.
            </p>
            <span className="intro-side-note">MADE FOR THE WORLD OF WORK</span>
          </div>
        </section>

        <section className="focus-section section-shell" id="focus-areas">
          <div className="section-heading">
            <div>
              <p className="eyebrow section-eyebrow">Focus areas</p>
              <h2>
                There&apos;s more than
                <br />
                <span>one kind of potential.</span>
              </h2>
            </div>
            <p className="section-description">
              The assessment explores five complementary areas of
              work-related thinking and behaviour.
            </p>
          </div>

          <div className="focus-grid">
            {focusAreas.map((area) => (
              <article className="focus-card" key={area.number}>
                <div className={`focus-number ${area.tone}`}>
                  <span>{area.number}</span>
                  <span className="focus-number-star" aria-hidden="true">
                    ✳
                  </span>
                </div>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <span className="card-line" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className="approach-section" id="approach">
          <div className="section-shell approach-grid">
            <div className="approach-heading">
              <p className="eyebrow approach-eyebrow">Our approach</p>
              <h2>
                People are
                <br />
                <span>more than a score.</span>
              </h2>
              <p>
                Good assessment starts with thoughtful questions, respect for
                each person, and a clear understanding of what results can tell
                us.
              </p>
              <a className="approach-link" href="#preview-note">
                Explore the assessment <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="principles-list">
              <article className="principle">
                <span className="principle-number">01</span>
                <div>
                  <h3>Grounded in work</h3>
                  <p>
                    Focus on relevant decisions and situations, not specialist
                    knowledge unrelated to the role.
                  </p>
                </div>
                <span className="principle-symbol" aria-hidden="true">
                  ↗
                </span>
              </article>
              <article className="principle">
                <span className="principle-number">02</span>
                <div>
                  <h3>Thoughtful about people</h3>
                  <p>
                    Work-style responses are considered in context, not used to
                    label someone or diagnose them.
                  </p>
                </div>
                <span className="principle-symbol" aria-hidden="true">
                  ◌
                </span>
              </article>
              <article className="principle">
                <span className="principle-number">03</span>
                <div>
                  <h3>Considered in context</h3>
                  <p>
                    Results are one perspective and should be considered
                    alongside context and conversation.
                  </p>
                </div>
                <span className="principle-symbol" aria-hidden="true">
                  ✳
                </span>
              </article>
            </div>
          </div>
        </section>

        <section className="preview-section section-shell" id="preview-note">
          <div className="preview-panel">
            <div className="preview-icon" aria-hidden="true">
              <span>m.</span>
            </div>
            <div className="preview-copy">
              <p className="eyebrow preview-eyebrow">For candidates</p>
              <h2>Explore the assessment.</h2>
              <p>
                Create an account, verify your email, and complete the
                assessment in one 20-minute sitting. You can review the
                instructions and try an unscored practice question first.
              </p>
            </div>
            <a className="preview-top-link" href="/start">
              Continue <span aria-hidden="true">→</span>
            </a>
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
          <p>Thoughtful assessments. Human potential.</p>
          <a className="footer-year" href="/recruiter/sign-in">
            Recruiter sign in
          </a>
          <span className="footer-year">TALENT ASSESSMENT</span>
        </div>
      </footer>
    </>
  );
}
