import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperSource = await readFile(
  resolve(projectRoot, "lib", "supabase", "email-confirmation.ts"),
  "utf8",
);
const { outputText, diagnostics = [] } = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
assert.equal(
  diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
  false,
);
const { processEmailConfirmation } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function createAuth({
  exchangeError = null,
  session = { access_token: "test-access-token" },
  user = {
    email: "candidate@example.test",
    email_confirmed_at: "2026-10-18T00:00:00.000Z",
  },
} = {}) {
  const calls = { exchange: [], verify: [], setSession: [], getSession: 0, getUser: 0 };
  return {
    calls,
    auth: {
      exchangeCodeForSession: async (code) => {
        calls.exchange.push(code);
        return { data: {}, error: exchangeError };
      },
      verifyOtp: async (params) => {
        calls.verify.push(params);
        return { data: {}, error: null };
      },
      setSession: async (tokens) => {
        calls.setSession.push(tokens);
        return { data: {}, error: null };
      },
      getSession: async () => {
        calls.getSession += 1;
        return { data: { session }, error: null };
      },
      getUser: async () => {
        calls.getUser += 1;
        return { data: { user }, error: null };
      },
    },
  };
}

const verifiedEmail = "candidate@example.test";

test("a successful confirmation exchanges code, verifies email, and sets up profile", async () => {
  const { auth, calls } = createAuth();
  const profileTokens = [];
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=valid-code",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async (token) => {
      profileTokens.push(token);
      return { ok: true, status: 201 };
    },
  });

  assert.deepEqual(outcome, {
    kind: "success",
    recovery: false,
    alreadyVerified: false,
  });
  assert.deepEqual(calls.exchange, ["valid-code"]);
  assert.deepEqual(profileTokens, ["test-access-token"]);
});

test("an expired link is reported honestly and never creates a profile", async () => {
  const { auth, calls } = createAuth({ session: null });
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl:
      "https://app.example.test/auth/callback?error=access_denied&error_code=otp_expired",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return { ok: true, status: 201 };
    },
  });

  assert.deepEqual(outcome, { kind: "invalid_link", code: "otp_expired" });
  assert.equal(calls.exchange.length, 0);
  assert.equal(profileCalls, 0);
});

test("no link parameters without a usable session gives a recoverable session outcome", async () => {
  const { auth } = createAuth({ session: null });
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => ({ ok: true, status: 201 }),
  });

  assert.deepEqual(outcome, { kind: "session_unavailable", code: undefined });
});

test("a token-hash confirmation validates its type before profile setup", async () => {
  const { auth, calls } = createAuth();
  const outcome = await processEmailConfirmation({
    callbackUrl:
      "https://app.example.test/auth/callback?token_hash=valid-hash&type=signup",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => ({ ok: true, status: 201 }),
  });

  assert.deepEqual(outcome, {
    kind: "success",
    recovery: false,
    alreadyVerified: false,
  });
  assert.deepEqual(calls.verify, [{ token_hash: "valid-hash", type: "signup" }]);
});

test("a reused link succeeds from the matching already-verified session", async () => {
  const { auth, calls } = createAuth({
    exchangeError: { code: "flow_state_not_found" },
  });
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=already-used",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return { ok: true, status: 200 };
    },
  });

  assert.deepEqual(outcome, {
    kind: "success",
    recovery: false,
    alreadyVerified: true,
  });
  assert.deepEqual(calls.exchange, ["already-used"]);
  assert.equal(profileCalls, 1);
});

test("a lost profile response is reconciled by the idempotent retry", async () => {
  const { auth } = createAuth();
  const profileResults = [
    { ok: false, status: 500, code: "server_error" },
    { ok: true, status: 200 },
  ];
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=valid-code",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return profileResults.shift();
    },
  });

  assert.deepEqual(outcome, {
    kind: "success",
    recovery: false,
    alreadyVerified: false,
  });
  assert.equal(profileCalls, 2);
});

test("a persistent profile setup failure is reported without claiming success", async () => {
  const { auth } = createAuth();
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=valid-code",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return { ok: false, status: 500, code: "server_error" };
    },
  });

  assert.deepEqual(outcome, {
    kind: "profile_setup_failed",
    code: "server_error",
    status: 500,
  });
  assert.equal(profileCalls, 2);
});

test("a verified session for another email cannot bypass the failed callback", async () => {
  const { auth } = createAuth({
    exchangeError: { code: "flow_state_not_found" },
    user: {
      email: "different@example.test",
      email_confirmed_at: "2026-10-18T00:00:00.000Z",
    },
  });
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=already-used",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return { ok: true, status: 200 };
    },
  });

  assert.deepEqual(outcome, { kind: "invalid_link", code: "flow_state_not_found" });
  assert.equal(profileCalls, 0);
});

test("an unverified session cannot complete confirmation or create a profile", async () => {
  const { auth } = createAuth({
    user: { email: verifiedEmail, email_confirmed_at: null },
  });
  let profileCalls = 0;
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=valid-code",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => {
      profileCalls += 1;
      return { ok: true, status: 201 };
    },
  });

  assert.equal(outcome.kind, "not_verified");
  assert.equal(profileCalls, 0);
});

test("name-required profile setup remains a separate verified outcome", async () => {
  const { auth } = createAuth();
  const outcome = await processEmailConfirmation({
    callbackUrl: "https://app.example.test/auth/callback?code=valid-code",
    expectedEmail: verifiedEmail,
    auth,
    ensureCandidateProfile: async () => ({
      ok: false,
      status: 422,
      code: "candidate_name_required",
    }),
  });

  assert.deepEqual(outcome, { kind: "needs_name" });
});

test("registration stores the expected email and successful callback gives explicit confirmation", async () => {
  const registration = await readFile(
    resolve(projectRoot, "app", "start", "candidate-welcome-form.tsx"),
    "utf8",
  );
  const callback = await readFile(
    resolve(projectRoot, "app", "auth", "callback", "page.tsx"),
    "utf8",
  );
  const notice = await readFile(
    resolve(projectRoot, "app", "start", "instructions", "registration-notice.tsx"),
    "utf8",
  );
  const profileRoute = await readFile(
    resolve(projectRoot, "app", "api", "candidate", "profile", "route.ts"),
    "utf8",
  );

  assert.match(registration, /PENDING_CONFIRMATION_EMAIL_KEY/);
  assert.match(registration, /emailRedirectTo: redirectTo/);
  assert.match(callback, /processEmailConfirmation\(/);
  assert.match(callback, /outcome\.kind === "success"/);
  assert.match(notice, /Your email is confirmed and your candidate account is ready/);
  assert.match(profileRoute, /if \(!authData\.user\.email_confirmed_at\)/);
});
