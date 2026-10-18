"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function RegistrationNotice() {
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("registration") ===
      "complete"
    ) {
      const timeoutId = window.setTimeout(
        () => setIsRegistrationComplete(true),
        0,
      );
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, []);

  if (!isRegistrationComplete) {
    return null;
  }

  return (
    <div className="assessment-status-note">
      <p>
        Your email is confirmed and your candidate account is ready. Sign in on
        the <Link href="/start">candidate page</Link> before you begin.
      </p>
    </div>
  );
}
