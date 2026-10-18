type AuthSession = { access_token: string };
type AuthUser = { email?: string; email_confirmed_at?: string | null };
type AuthResult<T> = { data: T; error: unknown | null };
type VerificationType = "signup" | "email" | "recovery";

export const PENDING_CONFIRMATION_EMAIL_KEY = "mustarred.pending-confirmation-email";

type ConfirmationAuth = {
  exchangeCodeForSession: (code: string) => Promise<AuthResult<unknown>>;
  verifyOtp: (params: {
    token_hash: string;
    type: VerificationType;
  }) => Promise<AuthResult<unknown>>;
  setSession: (tokens: {
    access_token: string;
    refresh_token: string;
  }) => Promise<AuthResult<unknown>>;
  getSession: () => Promise<
    AuthResult<{ session: AuthSession | null }>
  >;
  getUser: () => Promise<AuthResult<{ user: AuthUser | null }>>;
};

type ProfileSetupResult = {
  ok: boolean;
  status: number;
  code?: string;
};

export type EmailConfirmationOutcome =
  | { kind: "success"; recovery: boolean; alreadyVerified: boolean }
  | { kind: "needs_name" }
  | { kind: "invalid_link"; code?: string }
  | { kind: "session_unavailable"; code?: string }
  | { kind: "not_verified"; code?: string }
  | { kind: "profile_setup_failed"; code?: string; status?: number };

function safeCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(code)
    ? code
    : undefined;
}

function getCallbackParam(
  url: URL,
  hash: URLSearchParams,
  key: string,
): string | null {
  return url.searchParams.get(key) ?? hash.get(key);
}

function sameEmail(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

export async function processEmailConfirmation({
  callbackUrl,
  expectedEmail,
  auth,
  ensureCandidateProfile,
}: {
  callbackUrl: string;
  expectedEmail?: string | null;
  auth: ConfirmationAuth;
  ensureCandidateProfile: (
    accessToken: string,
  ) => Promise<ProfileSetupResult>;
}): Promise<EmailConfirmationOutcome> {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    return { kind: "invalid_link" };
  }

  const hash = new URLSearchParams(url.hash.slice(1));
  const getParam = (key: string) => getCallbackParam(url, hash, key);
  const errorCode = getParam("error_code") ?? undefined;
  const callbackError = getParam("error");
  const verificationType = getParam("type");
  const recovery =
    verificationType === "recovery" || url.searchParams.get("flow") === "recovery";
  const code = getParam("code");
  const tokenHash = getParam("token_hash");
  const accessToken = getParam("access_token");
  const refreshToken = getParam("refresh_token");
  const hasSessionTokens = Boolean(accessToken || refreshToken);
  const hasCallbackMaterial = Boolean(code || tokenHash || hasSessionTokens);

  if (
    Number(Boolean(code)) +
      Number(Boolean(tokenHash)) +
      Number(hasSessionTokens) >
    1
  ) {
    return { kind: "invalid_link", code: errorCode };
  }
  if (hasSessionTokens && (!accessToken || !refreshToken)) {
    return { kind: "invalid_link", code: errorCode };
  }
  if (recovery && (callbackError || !hasCallbackMaterial)) {
    return { kind: "invalid_link", code: errorCode };
  }

  let exchangeError: unknown;
  if (!callbackError) {
    try {
      if (code) {
        exchangeError = (await auth.exchangeCodeForSession(code)).error;
      } else if (tokenHash) {
        if (
          verificationType !== "signup" &&
          verificationType !== "email" &&
          verificationType !== "recovery"
        ) {
          return { kind: "invalid_link", code: errorCode };
        }
        exchangeError = (
          await auth.verifyOtp({ token_hash: tokenHash, type: verificationType })
        ).error;
      } else if (accessToken && refreshToken) {
        exchangeError = (
          await auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        ).error;
      }
    } catch (error) {
      exchangeError = error;
    }
  }

  let session: AuthSession | null = null;
  let sessionError: unknown;
  try {
    const result = await auth.getSession();
    session = result.data.session;
    sessionError = result.error;
  } catch (error) {
    sessionError = error;
  }
  if (!session) {
    const codeValue =
      safeCode(sessionError) ?? safeCode(exchangeError) ?? errorCode;
    return hasCallbackMaterial || callbackError
      ? { kind: "invalid_link", code: codeValue }
      : { kind: "session_unavailable", code: codeValue };
  }

  let user: AuthUser | null = null;
  let userError: unknown;
  try {
    const result = await auth.getUser();
    user = result.data.user;
    userError = result.error;
  } catch (error) {
    userError = error;
  }
  if (userError || !user?.email_confirmed_at) {
    return {
      kind: "not_verified",
      code: safeCode(userError) ?? safeCode(exchangeError) ?? errorCode,
    };
  }

  const exchangeWasRejected = Boolean(callbackError || exchangeError);
  if (
    (expectedEmail && !sameEmail(expectedEmail, user.email)) ||
    (exchangeWasRejected && !sameEmail(expectedEmail, user.email)) ||
    (recovery && exchangeWasRejected)
  ) {
    return {
      kind: "invalid_link",
      code: safeCode(exchangeError) ?? errorCode,
    };
  }

  if (recovery) {
    return { kind: "success", recovery: true, alreadyVerified: false };
  }
  if (exchangeWasRejected && !expectedEmail) {
    return { kind: "invalid_link", code: safeCode(exchangeError) ?? errorCode };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let profile: ProfileSetupResult;
    try {
      profile = await ensureCandidateProfile(session.access_token);
    } catch (error) {
      if (attempt === 0) continue;
      return { kind: "profile_setup_failed", code: safeCode(error) };
    }

    if (profile.ok) {
      return {
        kind: "success",
        recovery: false,
        alreadyVerified: exchangeWasRejected || !hasCallbackMaterial,
      };
    }
    if (profile.status === 422 && profile.code === "candidate_name_required") {
      return { kind: "needs_name" };
    }
    if (profile.status >= 500 && attempt === 0) continue;
    return {
      kind: "profile_setup_failed",
      code: profile.code,
      status: profile.status,
    };
  }

  return { kind: "profile_setup_failed" };
}
