import Image from "next/image";
import Link from "next/link";

type CandidateHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

type CandidateFooterProps = {
  label: string;
};

export function CandidateBrandLogo({ size = "header" }: { size?: "header" | "footer" }) {
  return (
    <span className={`candidate-logo-window candidate-logo-window-${size}`} aria-hidden="true">
      <Image
        className="candidate-logo-image"
        src="/mustarred-logo-image.png"
        width={666}
        height={374}
        alt=""
        sizes={size === "header" ? "336px" : "278px"}
      />
    </span>
  );
}

export function CandidateHeader({ backHref, backLabel }: CandidateHeaderProps) {
  return (
    <header className="candidate-header">
      <Link className="candidate-brand-home" href="/" aria-label="Mustarred home">
        <CandidateBrandLogo />
      </Link>
      {backHref && backLabel && (
        <Link className="candidate-return-link" href={backHref}>
          <span aria-hidden="true">←</span>
          {backLabel}
        </Link>
      )}
    </header>
  );
}

export function CandidateFooter({ label }: CandidateFooterProps) {
  return (
    <footer className="candidate-footer">
      <div className="candidate-footer-inner">
        <Link className="candidate-brand-home" href="/" aria-label="Mustarred home">
          <CandidateBrandLogo size="footer" />
        </Link>
        <p>Thoughtful assessments. Human potential.</p>
        <span>{label}</span>
      </div>
    </footer>
  );
}
