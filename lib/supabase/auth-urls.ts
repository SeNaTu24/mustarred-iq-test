export function getAuthRedirectUrl(path: string): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredSiteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured.");
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(configuredSiteUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  }

  if (
    (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") ||
    siteUrl.username ||
    siteUrl.password
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL.");
  }

  const hostname = siteUrl.hostname.toLowerCase();
  if (
    process.env.NODE_ENV === "production" &&
    (hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use the public app host in production.",
    );
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Authentication redirect paths must be app-relative.");
  }

  return new URL(path, siteUrl.origin).toString();
}
