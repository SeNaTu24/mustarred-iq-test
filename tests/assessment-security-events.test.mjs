import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = resolve(
  projectRoot,
  "lib",
  "assessment",
  "security-events.ts",
);
const helperSource = await readFile(helperPath, "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
assert.equal(
  diagnostics.some(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ),
  false,
);
const { recordActiveAssessmentSecurityEvent } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const activeAttempt = {
  id: "attempt-owned-by-candidate",
  candidate_id: "candidate-1",
  status: "in_progress",
  deadline_at: "2026-10-18T14:00:00.000Z",
};
const eventTime = Date.parse("2026-10-18T13:00:00.000Z");

test("invalid event types are rejected without persistence", async () => {
  let persisted = false;
  const result = await recordActiveAssessmentSecurityEvent(
    "candidate-1",
    activeAttempt,
    "answer_submitted",
    async () => {
      persisted = true;
      return "event-1";
    },
    eventTime,
  );
  assert.deepEqual(result, { kind: "invalid_event" });
  assert.equal(persisted, false);
});

test("an attempt owned by another candidate is never recorded", async () => {
  let persisted = false;
  const result = await recordActiveAssessmentSecurityEvent(
    "candidate-2",
    activeAttempt,
    "tab_hidden",
    async () => {
      persisted = true;
      return "event-1";
    },
    eventTime,
  );
  assert.deepEqual(result, { kind: "attempt_not_found" });
  assert.equal(persisted, false);
});

test("missing, terminal, and expired attempts reject event recording", async (t) => {
  const attempts = [
    ["missing attempt", null],
    ["submitted attempt", { ...activeAttempt, status: "submitted" }],
    ["expired attempt", { ...activeAttempt, status: "expired" }],
    ["deadline reached", { ...activeAttempt, deadline_at: new Date(eventTime).toISOString() }],
  ];
  for (const [name, attempt] of attempts) {
    await t.test(name, async () => {
      let persisted = false;
      const result = await recordActiveAssessmentSecurityEvent(
        "candidate-1",
        attempt,
        "window_blur",
        async () => {
          persisted = true;
          return "event-1";
        },
        eventTime,
      );
      assert.deepEqual(
        result,
        { kind: attempt ? "attempt_inactive" : "attempt_not_found" },
      );
      assert.equal(persisted, false);
    });
  }
});

test("an active owned attempt records only server-resolved identifiers", async () => {
  let persistedInput;
  const result = await recordActiveAssessmentSecurityEvent(
    "candidate-1",
    activeAttempt,
    "tab_hidden",
    async (...input) => {
      persistedInput = input;
      return "event-123";
    },
    eventTime,
  );
  assert.deepEqual(result, { kind: "recorded", eventId: "event-123" });
  assert.deepEqual(persistedInput, [
    "attempt-owned-by-candidate",
    "candidate-1",
    "tab_hidden",
  ]);
});

test("event API authenticates ownership and does not accept a client attempt ID", async () => {
  const route = await readFile(
    resolve(
      projectRoot,
      "app",
      "api",
      "assessment",
      "security-event",
      "route.ts",
    ),
    "utf8",
  );
  assert.match(route, /authenticateCandidate\(request\)/);
  assert.match(route, /getOwnedAttempt\(auth\.user\.id\)/);
  assert.match(route, /record_assessment_security_event/);
  assert.match(route, /requested_attempt_id:\s*attemptId/);
  assert.doesNotMatch(route, /body\.attemptId|requested_attempt_id:\s*body/);
  assert.match(route, /Unsupported security event type/);
});

test("events are stored separately with RLS and database ownership/lifecycle checks", async () => {
  const migration = await readFile(
    resolve(
      projectRoot,
      "supabase",
      "migrations",
      "20261018125600_assessment_security_events.sql",
    ),
    "utf8",
  );
  assert.match(migration, /create table public\.assessment_security_events/i);
  assert.match(migration, /alter table public\.assessment_security_events enable row level security/i);
  assert.match(migration, /revoke all on table public\.assessment_security_events[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /candidate_id = requested_candidate_id/);
  assert.match(migration, /for update/i);
  assert.match(migration, /attempt_status <> 'in_progress'/);
  assert.match(migration, /statement_timestamp\(\) >= attempt_deadline/);
  assert.match(migration, /to service_role/);
  assert.doesNotMatch(migration, /assessment_answers|assessment_results|assessment_item_results/);
});

test("client records focus and visibility transitions and presents a neutral warning", async () => {
  const client = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(client, /addEventListener\("visibilitychange"/);
  assert.match(client, /addEventListener\("blur"/);
  assert.match(client, /addEventListener\("focus"/);
  assert.match(client, /keepalive: true/);
  assert.match(client, /We noticed the assessment window lost visibility or focus/);
  assert.match(client, /This does not affect your score or\s+submission/);
  assert.match(client, /This activity could not be recorded right now/);
});
