import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");
const JSZip = require("jszip");

async function moduleUrl(relativePath, rewrite = []) {
  let source = await readFile(resolve(projectRoot, relativePath), "utf8");
  source = source.replace(/^import "server-only";\r?\n/, "");
  for (const [from, to] of rewrite) source = source.replaceAll(from, to);
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    errors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    ),
    [],
    `${relativePath} transpiles for the focused test`,
  );
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const constantsUrl = await moduleUrl("lib/assessment/rcap-constants.ts");
const assignmentUrl = await moduleUrl("lib/assessment/rcap-assignment.ts", [
  ['from "./rcap-constants"', `from "${constantsUrl}"`],
]);
const bankSourceUrl = await moduleUrl("lib/assessment/rcap-bank-source.ts");
const {
  RcapBankSourceError,
  resolveRcapBankSource,
  downloadRcapBankFromPrivateStorage,
} = await import(bankSourceUrl);
const {
  RCAP_COMPETENCIES,
  RCAP_DURATION_SECONDS,
  RCAP_QUESTION_SET_VERSION,
  parseRcapQuestionRows,
  validateRcapBank,
  selectRcapAssignment,
  fingerprintRcapQuestionSet,
  allocateUniqueRcapAssignment,
  createRcapQuestionSet,
} = await import(assignmentUrl);

const headers = [
  "ID",
  "Competency",
  "Question Type",
  "Difficulty",
  "Pattern Family",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Letter",
  "Correct Value",
  "Explanation",
  "Variant",
];

function syntheticRcapRows() {
  const rows = [];
  let id = 1;
  for (const competency of RCAP_COMPETENCIES) {
    for (let familyIndex = 0; familyIndex < 10; familyIndex += 1) {
      const questionType = familyIndex < 7 ? "Abstract" : "Practical";
      for (let variant = 0; variant < 4; variant += 1) {
        const key = ["a", "b", "c", "d"][id % 4];
        const options = ["a", "b", "c", "d"].map((letter) =>
          letter === key ? `Correct text ${id}` : `Distractor ${letter} ${id}`,
        );
        const hard =
          (familyIndex < 6 && variant === 0) ||
          ((familyIndex === 7 || familyIndex === 8) && variant === 0);
        rows.push([
          `RCAP-${String(id).padStart(3, "0")}`,
          competency,
          questionType,
          hard ? "Hard" : "Exceptionally hard",
          `Family ${familyIndex + 1}`,
          `Synthetic question ${id}`,
          ...options,
          key.toUpperCase(),
          `Correct text ${id}`,
          `Private explanation ${id}`,
          variant + 1,
        ]);
        id += 1;
      }
    }
  }
  return rows;
}

function seededRandomIndex(seed) {
  let state = seed >>> 0;
  return (maxExclusive) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % maxExclusive;
  };
}

function makeBank() {
  return parseRcapQuestionRows(headers, syntheticRcapRows());
}

const privateWorkbookPath = resolve(
  projectRoot,
  "assessment-data",
  "Mustarred_RCAP_200_Abstract_Hybrid_Bank_Examiner.xlsx",
);

test("actual private RCAP workbook parses to 200 valid bank questions", {
  skip: !existsSync(privateWorkbookPath),
}, async () => {
  const source = await readFile(privateWorkbookPath);
  const zip = await JSZip.loadAsync(source);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml")) continue;
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async("string");
    zip.file(name, xml.replace(/<(\/?)([A-Za-z][A-Za-z0-9_.-]*):/g, "<$1"));
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await zip.generateAsync({ type: "arraybuffer" }));
  const sheet = workbook.getWorksheet("MASTER BANK");
  assert.ok(sheet);
  const headerValues = sheet.getRow(1).values;
  assert.ok(Array.isArray(headerValues));
  const rows = sheet.getRows(2, Math.max(0, sheet.rowCount - 1)) ?? [];
  const bank = parseRcapQuestionRows(
    headerValues.slice(1),
    rows.map((row) => Array.isArray(row.values) ? row.values.slice(1) : []),
  );
  assert.equal(bank.length, 200);
  assert.ok(bank.every((question) => /^RCAP-\d{3}$/.test(question.id)));
  assert.ok(bank.every((question) => question.explanation.length <= 1000));
  for (const competency of RCAP_COMPETENCIES) {
    assert.equal(bank.filter((question) => question.competency === competency).length, 40);
  }
  const familyCounts = new Map(
    bank.map((question) => [
      `${question.competency}:${question.questionType}:${question.patternFamily}`,
      0,
    ]),
  );
  for (let seed = 31; seed < 231; seed += 1) {
    const assignment = selectRcapAssignment(bank, seededRandomIndex(seed));
    const set = createRcapQuestionSet(bank, assignment);
    assert.equal(assignment.questionIds.length, 30);
    assert.equal(set.questions.length, 30);
    const chosen = assignment.questionIds.map((id) => bank.find((question) => question.id === id));
    for (const competency of RCAP_COMPETENCIES) {
      assert.equal(chosen.filter((question) => question.competency === competency).length, 6);
    }
    for (const question of chosen) {
      const key = `${question.competency}:${question.questionType}:${question.patternFamily}`;
      familyCounts.set(key, familyCounts.get(key) + 1);
    }
  }
  for (const competency of RCAP_COMPETENCIES) {
    for (const questionType of ["Abstract", "Practical"]) {
      const counts = [...familyCounts]
        .filter(([key]) => key.startsWith(`${competency}:${questionType}:`))
        .map(([, count]) => count);
      assert.ok(counts.length > 0);
      assert.ok(counts.every((count) => count > 0));
      assert.ok(Math.max(...counts) - Math.min(...counts) < 100);
    }
  }
});

test("RCAP workbook parser validates 200 unique questions and required key fields", () => {
  const bank = makeBank();
  assert.equal(bank.length, 200);
  assert.equal(new Set(bank.map(({ id }) => id)).size, 200);
  assert.deepEqual(
    RCAP_COMPETENCIES.map((competency) =>
      bank.filter((question) => question.competency === competency).length,
    ),
    [40, 40, 40, 40, 40],
  );
  assert.throws(
    () => parseRcapQuestionRows(headers.filter((header) => header !== "Option D"), syntheticRcapRows()),
  );
  const maximumExplanationRows = syntheticRcapRows();
  maximumExplanationRows[0][12] = "🙂".repeat(1000);
  assert.equal(
    Array.from(parseRcapQuestionRows(headers, maximumExplanationRows)[0].explanation).length,
    1000,
  );
  const oversizedExplanationRows = syntheticRcapRows();
  oversizedExplanationRows[0][12] = "🙂".repeat(1001);
  assert.throws(() => parseRcapQuestionRows(headers, oversizedExplanationRows));
  assert.throws(() => validateRcapBank([...bank, bank[0]]));
});

test("each assignment selects six unique families in each competency", () => {
  const bank = makeBank();
  const assignment = selectRcapAssignment(bank, seededRandomIndex(17));
  const chosen = assignment.questionIds.map((id) => bank.find((question) => question.id === id));
  assert.equal(assignment.questionIds.length, 30);
  assert.equal(new Set(assignment.questionIds).size, 30);

  for (const competency of RCAP_COMPETENCIES) {
    const items = chosen.filter((question) => question.competency === competency);
    assert.equal(items.length, 6);
    assert.equal(new Set(items.map((question) => question.patternFamily)).size, 6);
  }
  assert.equal(chosen.filter((question) => question.questionType === "Abstract").length, 18);
  assert.equal(chosen.filter((question) => question.questionType === "Practical").length, 12);
  assert.equal(chosen.filter((question) => question.difficulty === "Hard").length, 6);
});

test("unbalanced candidate draws are rejected before attempt reservation", async () => {
  const bank = makeBank().map((question) =>
    question.competency === RCAP_COMPETENCIES[0]
      ? { ...question, difficulty: "Exceptionally hard" }
      : question,
  );
  let reservationCalls = 0;
  await assert.rejects(
    allocateUniqueRcapAssignment(
      bank,
      async () => {
        reservationCalls += 1;
        return { kind: "created", value: "must-not-reserve" };
      },
      seededRandomIndex(77),
      3,
    ),
    /unique RCAP question set could not be reserved/,
  );
  assert.equal(reservationCalls, 0);
});

test("selection, question order, and option order are randomized", () => {
  const bank = makeBank();
  const first = selectRcapAssignment(bank, seededRandomIndex(1));
  const second = selectRcapAssignment(bank, seededRandomIndex(2));
  assert.notDeepEqual(first.questionIds, second.questionIds);
  assert.notDeepEqual(first.optionOrders, second.optionOrders);
  assert.notDeepEqual(
    first.questionIds,
    [...first.questionIds].sort(),
    "question order should be shuffled rather than bank order",
  );
  for (const optionOrder of Object.values(first.optionOrders)) {
    assert.equal(optionOrder.length, 4);
    assert.deepEqual([...optionOrder].sort(), ["a", "b", "c", "d"]);
  }
});

test("family sampling spreads assignments across each competency and question type", () => {
  const bank = makeBank();
  const familyCounts = new Map();
  for (const question of bank) {
    familyCounts.set(`${question.competency}:${question.questionType}:${question.patternFamily}`, 0);
  }

  for (let seed = 1; seed <= 600; seed += 1) {
    const assignment = selectRcapAssignment(bank, seededRandomIndex(seed));
    assert.equal(assignment.questionIds.length, 30);
    const chosen = assignment.questionIds.map((id) => bank.find((question) => question.id === id));
    for (const competency of RCAP_COMPETENCIES) {
      assert.equal(chosen.filter((question) => question.competency === competency).length, 6);
    }
    for (const question of chosen) {
      const key = `${question.competency}:${question.questionType}:${question.patternFamily}`;
      familyCounts.set(key, familyCounts.get(key) + 1);
    }
  }

  for (const competency of RCAP_COMPETENCIES) {
    for (const questionType of ["Abstract", "Practical"]) {
      const counts = [...familyCounts]
        .filter(([key]) => key.startsWith(`${competency}:${questionType}:`))
        .map(([, count]) => count);
      assert.ok(counts.every((count) => count > 0));
      assert.ok(Math.max(...counts) - Math.min(...counts) < 100);
    }
  }
});

test("assignment fingerprint ignores question order and allocator rejects duplicate sets", async () => {
  const bank = makeBank();
  const first = selectRcapAssignment(bank, seededRandomIndex(42));
  const firstFingerprint = fingerprintRcapQuestionSet(first.questionIds);
  assert.equal(
    fingerprintRcapQuestionSet(first.questionIds),
    fingerprintRcapQuestionSet([...first.questionIds].reverse()),
  );

  let retries = 0;
  const random = seededRandomIndex(43);
  const next = await allocateUniqueRcapAssignment(
    bank,
    async (assignment, fingerprint) => {
      retries += 1;
      if (retries === 1) {
        assert.notEqual(fingerprint, "");
        return { kind: "duplicate" };
      }
      return { kind: "created", value: "fresh-attempt" };
    },
    random,
  );
  assert.notEqual(next.fingerprint, firstFingerprint);
  assert.equal(next.value, "fresh-attempt");
  assert.equal(retries, 2);
});

test("persisted assignments restore ordered public questions without keys or explanations", () => {
  const bank = makeBank();
  const assignment = selectRcapAssignment(bank, seededRandomIndex(19));
  const set = createRcapQuestionSet(bank, assignment);
  const restored = createRcapQuestionSet(bank, structuredClone(assignment));
  assert.equal(set.version, RCAP_QUESTION_SET_VERSION);
  assert.deepEqual(
    restored.publicQuestions.map((question) => question.id),
    assignment.questionIds,
  );
  assert.deepEqual(
    restored.publicQuestions.map((question) => question.options),
    set.publicQuestions.map((question) => question.options),
  );
  for (const question of set.publicQuestions) {
    assert.equal("key" in question, false);
    assert.equal("rationale" in question, false);
    assert.equal("explanation" in question, false);
  }
});

test("RCAP duration is exactly 720 seconds and timer display derives from the saved deadline", async () => {
  assert.equal(RCAP_DURATION_SECONDS, 720);
  const client = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(client, /Date\.parse\(session\.attempt\.deadlineAt\)/);
  assert.match(client, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 250\)/);
  const migration = await readFile(
    resolve(projectRoot, "supabase", "migrations", "20261019143000_add_rcap_30_question_attempts.sql"),
    "utf8",
  );
  assert.match(migration, /duration_seconds = 720/);
  assert.match(migration, /interval '12 minutes'/);
  assert.match(migration, /clock_timestamp\(\) < attempt_deadline/);
  assert.match(migration, /if database_time >= old\.deadline_at/);
  const answerPersistenceMigration = await readFile(
    resolve(projectRoot, "supabase", "migrations", "20261016170000_assessment_demo_answers_and_results.sql"),
    "utf8",
  );
  assert.match(answerPersistenceMigration, /database_time >= attempt_deadline/);

  const [session, answer, submit] = await Promise.all([
    readFile(resolve(projectRoot, "app", "api", "assessment", "session", "route.ts"), "utf8"),
    readFile(resolve(projectRoot, "app", "api", "assessment", "answer", "route.ts"), "utf8"),
    readFile(resolve(projectRoot, "app", "api", "assessment", "submit", "route.ts"), "utf8"),
  ]);
  assert.match(session, /expire_assessment_attempt_if_due/);
  assert.match(answer, /record_assessment_answer/);
  assert.match(answer, /expire_assessment_attempt_if_due/);
  assert.match(submit, /finalize_or_get_assessment_attempt/);
});

test("server scoring applies 4 marks per item and the provisional 80% threshold", () => {
  const bank = makeBank();
  const assignment = selectRcapAssignment(bank, seededRandomIndex(25));
  const set = createRcapQuestionSet(bank, assignment);
  const allCorrect = new Map(
    set.questions.map((question) => [question.id, question.key]),
  );
  const perfect = set.scoreResponses(allCorrect);
  assert.equal(perfect.totalCorrect, 30);
  assert.equal(perfect.maxCorrect, 30);
  assert.equal(perfect.marksEarned, 120);
  assert.equal(perfect.marksPossible, 120);
  assert.equal(perfect.percentage, 100);
  assert.equal(perfect.outcome, "PASS");
  assert.deepEqual(perfect.rounds.map(({ correct }) => correct), [6, 6, 6, 6, 6]);

  const exactlyAtThreshold = new Map([...allCorrect].slice(0, 24));
  assert.equal(set.scoreResponses(exactlyAtThreshold).outcome, "PASS");
  const belowThreshold = new Map([...allCorrect].slice(0, 23));
  assert.equal(set.scoreResponses(belowThreshold).outcome, "FAIL");
});

test("RCAP migration keeps historical versions while enforcing 12-minute 30-item attempts", async () => {
  const migration = await readFile(
    resolve(projectRoot, "supabase", "migrations", "20261019143000_add_rcap_30_question_attempts.sql"),
    "utf8",
  );
  assert.match(migration, /question_set_version = 'mustarred-rcap-200-v1' and duration_seconds = 720/);
  assert.match(migration, /database_start_time \+ interval '12 minutes'/);
  assert.match(migration, /assigned_question_ids/);
  assert.match(migration, /assigned_option_orders/);
  assert.match(migration, /assignment_fingerprint_unique/);
  assert.match(migration, /select count\(\*\) from jsonb_object_keys\(new\.assigned_option_orders\)/);
  assert.match(
    migration,
    /or \(\s*case\s+when jsonb_typeof\(new\.assigned_option_orders\)[\s\S]*?end\s*\)\s+or new\.assignment_fingerprint is null/,
  );
  assert.doesNotMatch(migration, /jsonb_object_length/);
  assert.match(migration, /old\.assigned_question_ids/);
  assert.match(migration, /expected_count := case/);
  assert.match(migration, /then 30/);
  assert.match(migration, /then 720/);
  assert.match(migration, /then case when total_correct >= 24/);
});

test("begin, session, answer and submit routes use the saved v4 assignment", async () => {
  const read = (path) => readFile(resolve(projectRoot, path), "utf8");
  const [begin, session, answer, submit, server, attemptSet] = await Promise.all([
    read("app/api/assessment/begin/route.ts"),
    read("app/api/assessment/session/route.ts"),
    read("app/api/assessment/answer/route.ts"),
    read("app/api/assessment/submit/route.ts"),
    read("lib/assessment/server.ts"),
    read("lib/assessment/attempt-question-set.ts"),
  ]);
  assert.match(begin, /begin_rcap_assessment_attempt/);
  assert.match(begin, /randomInt\(maxExclusive\)/);
  const existingAttemptLookup = begin.indexOf('.eq("candidate_id", authData.user.id)');
  const privateBankLoad = begin.indexOf("await loadRcapQuestionBank()");
  assert.ok(existingAttemptLookup >= 0 && privateBankLoad > existingAttemptLookup);
  const initialSchema = await read(
    "supabase/migrations/20261016151000_initial_candidate_attempt_schema.sql",
  );
  assert.match(initialSchema, /candidate_id uuid not null unique/);
  assert.doesNotMatch(
    await read("supabase/migrations/20261019143000_add_rcap_30_question_attempts.sql"),
    /drop constraint [^;]*candidate_id/i,
  );
  assert.match(session, /getQuestionSetForAttempt\(attempt\)/);
  assert.match(answer, /getQuestionSetForAttempt\(attempt\)/);
  assert.match(submit, /getQuestionSetForAttempt\(attempt\)/);
  assert.match(server, /assigned_question_ids, assigned_option_orders/);
  assert.match(attemptSet, /attempt\.assigned_question_ids/);
  assert.match(attemptSet, /attempt\.assigned_option_orders/);
  assert.match(session, /select\("question_id, response"\)/);
  assert.match(session, /restoreAssessmentResponse\(question, row\.response\)/);
  assert.match(session, /questions:\s*questionSet\.publicQuestions/);
  assert.doesNotMatch(session, /question\.scoringType === "objective"/);
  assert.match(answer, /serializeAssessmentResponse\(question, body\.response\)/);
  assert.match(begin, /\.eq\("candidate_id", candidateId\)/);
  assert.match(server, /record_unanswered_demo_items/);
  assert.match(server, /finalize/);
});

test("RCAP candidate round percentages use six-item denominators and expiry flushes pending drafts", async () => {
  const [server, client] = await Promise.all([
    readFile(resolve(projectRoot, "lib", "assessment", "server.ts"), "utf8"),
    readFile(resolve(projectRoot, "app", "assessment", "assessment-client.tsx"), "utf8"),
  ]);
  assert.match(server, /percentage: Number\([\s\S]*?correct \/ RCAP_QUESTIONS_PER_COMPETENCY/);
  assert.match(client, /round\.correct \/ \(result\.maxCorrect === 30 \? 6 : 10\)/);
  assert.match(client, /await autosaverRef\.current\?\.flushAll\(\)[\s\S]*?await saveAllPendingDrafts\(/);
  assert.match(client, /payload\.attempt\.status !== "in_progress" \|\|\s*draftValuesRef\.current\.size === 0/);
});

test("RCAP migration preserves legacy version constraints and checks assigned answers", async () => {
  const migration = await readFile(
    resolve(projectRoot, "supabase/migrations/20261019143000_add_rcap_30_question_attempts.sql"),
    "utf8",
  );
  const [initial, results, audit, v2, v3, previousAnswerRpc, atomicSubmit] = await Promise.all([
    readFile(resolve(projectRoot, "supabase/migrations/20261016151000_initial_candidate_attempt_schema.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261016170000_assessment_demo_answers_and_results.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261016172000_assessment_audit_details.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261016180000_assessment_v2_behavioral_responses.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261018104900_assessment_v3_fifty_question_support.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261016170000_assessment_demo_answers_and_results.sql"), "utf8"),
    readFile(resolve(projectRoot, "supabase/migrations/20261016174000_atomic_attempt_submission.sql"), "utf8"),
  ]);

  const droppedConstraints = [...migration.matchAll(/drop constraint\s+([a-z0-9_]+)/gi)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(droppedConstraints, [
    "assessment_attempts_deadline_matches_duration",
    "assessment_attempts_duration_seconds_check",
    "assessment_item_results_points_check",
    "assessment_item_results_scoring_type_fields",
    "assessment_results_answer_counts_sum_to_50",
    "assessment_results_outcome_matches_threshold",
    "assessment_results_percentage_matches_total",
    "assessment_results_round_1_correct_check",
    "assessment_results_round_2_correct_check",
    "assessment_results_round_3_correct_check",
    "assessment_results_round_4_correct_check",
    "assessment_results_round_5_correct_check",
    "assessment_results_total_correct_check",
  ]);
  assert.match(initial, /candidate_id uuid not null unique/);
  assert.doesNotMatch(migration, /drop constraint [^;]*candidate_id/i);
  assert.match(initial, /duration_seconds integer not null default 1200[\s\S]*?check \(duration_seconds = 1200\)/);
  assert.match(initial, /constraint assessment_attempts_deadline_matches_duration/);
  assert.match(results, /total_correct integer not null check \(total_correct between 0 and 50\)/);
  for (const round of [1, 2, 3, 4, 5]) {
    assert.match(
      results,
      new RegExp(`round_${round}_correct integer not null check \\(round_${round}_correct between 0 and 10\\)`),
    );
  }
  assert.match(results, /constraint assessment_results_rounds_sum_to_total/);
  assert.match(results, /constraint assessment_results_percentage_matches_total/);
  assert.match(results, /constraint assessment_results_outcome_matches_threshold/);
  assert.match(audit, /constraint assessment_results_answer_counts_sum_to_50/);
  assert.match(audit, /points smallint not null check \(points in \(0, 1\)\)/);
  assert.match(v2, /assessment_results_behavioral_counts_match_version/);
  assert.match(v2, /drop constraint assessment_item_results_points_match_correctness[\s\S]*?add constraint assessment_item_results_scoring_type_fields/);
  assert.doesNotMatch(migration, /drop constraint assessment_results_behavioral_counts_match_version/i);
  assert.match(v2, /scoring_type = 'behavioral'[\s\S]*?key_response is null[\s\S]*?is_correct is null[\s\S]*?points is null/);
  assert.match(v3, /mustarred-assessment-2026-10-v3'[\s\S]*?expected_count := 50/);

  const resultChecks = migration.slice(
    migration.indexOf("alter table public.assessment_results"),
    migration.indexOf("create or replace function public.enforce_attempt_lifecycle"),
  );
  assert.match(resultChecks, /question_set_version <> 'mustarred-rcap-200-v1' and total_correct between 0 and 50/);
  assert.match(resultChecks, /question_set_version <> 'mustarred-rcap-200-v1' and answered_count \+ unanswered_count = 50/);
  assert.match(resultChecks, /question_set_version <> 'mustarred-rcap-200-v1'[\s\S]*?round_1_correct between 0 and 10/);
  assert.match(resultChecks, /question_set_version <> 'mustarred-rcap-200-v1'[\s\S]*?total_correct >= 40/);
  assert.match(resultChecks, /question_set_version = 'mustarred-rcap-200-v1'[\s\S]*?marks_earned is not null[\s\S]*?marks_earned = total_correct \* 4[\s\S]*?marks_possible is not null[\s\S]*?marks_possible = 120/);
  assert.match(resultChecks, /question_set_version <> 'mustarred-rcap-200-v1'[\s\S]*?marks_earned is null[\s\S]*?marks_possible is null/);
  assert.match(migration, /when attempt_version in \('mustarred-demo-2026-10-16-v1', 'mustarred-assessment-2026-10-v3'\) then 50/);
  assert.match(migration, /when attempt_version = 'mustarred-assessment-2026-10-v2' then 55/);

  assert.match(migration, /create or replace function public\.enforce_attempt_lifecycle\(\)/);
  assert.doesNotMatch(migration, /drop trigger assessment_attempts_enforce_lifecycle/i);
  assert.match(migration, /if database_time >= old\.deadline_at[\s\S]*?new\.status := 'expired'/);
  assert.match(migration, /if clock_timestamp\(\) < attempt_deadline then\s+return 'in_progress'/);
  assert.match(atomicSubmit, /returning status into finalized_status/);
  assert.match(previousAnswerRpc, /create function public\.record_assessment_answer\(/);

  const answerRpc = migration.slice(
    migration.indexOf("create or replace function public.record_assessment_answer"),
    migration.indexOf("create or replace function public.record_unanswered_demo_items"),
  );
  assert.match(answerRpc, /attempt_version = 'mustarred-rcap-200-v1'[\s\S]*?requested_question_id = any\(assigned_question_ids\)/);
  assert.match(migration, /revoke all on function public\.record_assessment_answer\(uuid, text, jsonb\)\s+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.record_assessment_answer\(uuid, text, jsonb\)\s+to service_role/);
  assert.match(migration, /grant execute on function public\.begin_rcap_assessment_attempt\(uuid, text\[\], jsonb, text\)\s+to service_role/);
});

test("unusable difficulty variants are retried before reserving an RCAP attempt", async () => {
  const bank = makeBank().map((question) =>
    question.competency === RCAP_COMPETENCIES[0] &&
    question.patternFamily === "Family 1"
      ? { ...question, difficulty: "Hard" }
      : question,
  );
  const brokenDrawSeed = Array.from({ length: 1000 }, (_, index) => index + 1).find(
    (seed) => {
      try {
        selectRcapAssignment(bank, seededRandomIndex(seed));
        return false;
      } catch (error) {
        return error instanceof Error && /cannot satisfy the assignment balance/.test(error.message);
      }
    },
  );
  assert.notEqual(brokenDrawSeed, undefined);

  let reservationCalls = 0;
  await assert.rejects(
    allocateUniqueRcapAssignment(
      bank,
      async () => {
        reservationCalls += 1;
        return { kind: "created", value: "must-not-reserve" };
      },
      seededRandomIndex(brokenDrawSeed),
      1,
    ),
    /unique RCAP question set could not be reserved/,
  );
  assert.equal(reservationCalls, 0);
});

test("production requires an explicit private-storage workbook location", () => {
  assert.deepEqual(
    resolveRcapBankSource(
      { NODE_ENV: "development" },
      "assessment-data/private-bank.xlsx",
    ),
    { kind: "local-file", path: "assessment-data/private-bank.xlsx" },
  );
  assert.deepEqual(
    resolveRcapBankSource(
      { NODE_ENV: "development", RCAP_BANK_PATH: "  local/private-bank.xlsx  " },
      "assessment-data/private-bank.xlsx",
    ),
    { kind: "local-file", path: "local/private-bank.xlsx" },
  );
  assert.deepEqual(
    resolveRcapBankSource(
      {
        NODE_ENV: "production",
        RCAP_BANK_STORAGE_BUCKET: "rcap-private",
        RCAP_BANK_STORAGE_OBJECT: "examiner/bank.xlsx",
      },
      "unused-local-path.xlsx",
    ),
    { kind: "private-storage", bucket: "rcap-private", object: "examiner/bank.xlsx" },
  );
  assert.throws(
    () => resolveRcapBankSource({ NODE_ENV: "production" }, "unused-local-path.xlsx"),
    (error) =>
      error instanceof RcapBankSourceError &&
      /required in production/.test(error.message) &&
      error.category === "configuration" &&
      error.reasonCode === "storage_location_missing",
  );
  assert.throws(
    () => resolveRcapBankSource({ NODE_ENV: "production", RCAP_BANK_STORAGE_BUCKET: "rcap-private" }, "unused-local-path.xlsx"),
    (error) =>
      error instanceof RcapBankSourceError &&
      /Set both/.test(error.message) &&
      error.category === "configuration" &&
      error.reasonCode === "storage_location_incomplete",
  );
});

test("private-storage workbook failures use fixed category and reason codes", async () => {
  let downloadCalls = 0;
  const publicStorage = {
    getBucket: async () => ({ data: { public: true }, error: null }),
    from: () => ({
      download: async () => {
        downloadCalls += 1;
        return { data: null, error: null };
      },
    }),
  };
  await assert.rejects(
    downloadRcapBankFromPrivateStorage(publicStorage, "private-bucket", "private-object"),
    (error) =>
      error instanceof RcapBankSourceError &&
      error.category === "bucket" &&
      error.reasonCode === "bucket_not_private",
  );
  assert.equal(downloadCalls, 0);

  const throwingBucketStorage = {
    getBucket: async () => {
      throw new Error("do-not-leak-bucket-error");
    },
    from: () => ({ download: async () => ({ data: null, error: null }) }),
  };
  await assert.rejects(
    downloadRcapBankFromPrivateStorage(throwingBucketStorage, "private-bucket", "private-object"),
    (error) =>
      error instanceof RcapBankSourceError &&
      error.category === "bucket" &&
      error.reasonCode === "bucket_lookup_failed" &&
      !error.message.includes("do-not-leak-bucket-error"),
  );

  const missingBucketStorage = {
    getBucket: async () => ({ data: null, error: new Error("do-not-leak-bucket-error") }),
    from: () => ({ download: async () => ({ data: null, error: null }) }),
  };
  await assert.rejects(
    downloadRcapBankFromPrivateStorage(missingBucketStorage, "private-bucket", "private-object"),
    (error) =>
      error instanceof RcapBankSourceError &&
      error.category === "bucket" &&
      error.reasonCode === "bucket_lookup_failed",
  );

  const brokenStorage = {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      download: async () => ({ data: null, error: new Error("do-not-leak-object-error") }),
    }),
  };
  await assert.rejects(
    downloadRcapBankFromPrivateStorage(brokenStorage, "private-bucket", "private-object"),
    (error) =>
      error instanceof RcapBankSourceError &&
      error.category === "object" &&
      error.reasonCode === "object_download_failed" &&
      !error.message.includes("do-not-leak-object-error"),
  );

  const emptyStorage = {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      download: async () => ({
        data: { arrayBuffer: async () => new ArrayBuffer(0) },
        error: null,
      }),
    }),
  };
  await assert.rejects(
    downloadRcapBankFromPrivateStorage(emptyStorage, "private-bucket", "private-object"),
    (error) =>
      error instanceof RcapBankSourceError &&
      error.category === "object" &&
      error.reasonCode === "object_empty",
  );
});

test("workbook and begin failures log only fixed diagnostics and preserve the response", async () => {
  const loader = await readFile(resolve(projectRoot, "lib/assessment/rcap-bank.ts"), "utf8");
  assert.match(loader, /^import "server-only";/);
  assert.match(loader, /getSupabaseAdminClient\(\)\.storage/);
  assert.match(loader, /downloadRcapBankFromPrivateStorage\(/);
  assert.match(loader, /resolveRcapBankSource\(/);
  assert.match(loader, /"workbook",\s*"workbook_parse_or_validation_failed"/);
  assert.doesNotMatch(loader, /NEXT_PUBLIC_.*(?:BANK|STORAGE)/);

  const begin = await readFile(resolve(projectRoot, "app/api/assessment/begin/route.ts"), "utf8");
  const diagnosticStart = begin.indexOf("const diagnostic = error instanceof RcapBankSourceError");
  const responseStart = begin.indexOf("return Response.json(", diagnosticStart);
  const diagnosticBlock = begin.slice(diagnosticStart, responseStart);
  assert.ok(diagnosticStart >= 0 && responseStart > diagnosticStart);
  assert.match(diagnosticBlock, /category: error\.category/);
  assert.match(diagnosticBlock, /reasonCode: error\.reasonCode/);
  assert.match(diagnosticBlock, /category: "begin_request"/);
  assert.match(diagnosticBlock, /reasonCode: "unexpected_failure"/);
  assert.match(diagnosticBlock, /console\.error\("Assessment begin request failed:", diagnostic\)/);
  assert.doesNotMatch(diagnosticBlock, /error\.(?:message|stack|cause)/);
  assert.match(
    begin,
    /error:\s*"We couldn’t start your assessment\. Please try again\."\s*\},\s*\{\s*status:\s*500/,
  );
});

test("answer RPC correction avoids PL/pgSQL variable-column ambiguity", async () => {
  const migration = await readFile(
    resolve(
      projectRoot,
      "supabase/migrations/20261020100000_fix_rcap_record_answer_variable_ambiguity.sql",
    ),
    "utf8",
  );
  const answerRpc = migration.slice(
    migration.indexOf("create or replace function public.record_assessment_answer"),
    migration.indexOf("$$;", migration.indexOf("create or replace function public.record_assessment_answer")) + 3,
  );

  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(answerRpc, /attempt_question_ids text\[\]/);
  assert.match(
    answerRpc,
    /select a\.status, a\.deadline_at, a\.question_set_version, a\.assigned_question_ids[\s\S]*?into attempt_status, attempt_deadline, attempt_version, attempt_question_ids/,
  );
  assert.match(
    answerRpc,
    /attempt_version = 'mustarred-rcap-200-v1'[\s\S]*?attempt_question_ids is null[\s\S]*?requested_question_id = any\(attempt_question_ids\)/,
  );
  assert.match(answerRpc, /database_time >= attempt_deadline/);
  assert.match(answerRpc, /on conflict \(attempt_id, question_id\)/);
  assert.match(
    migration,
    /revoke all on function public\.record_assessment_answer\(uuid, text, jsonb\)\s+from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.record_assessment_answer\(uuid, text, jsonb\)\s+to service_role/,
  );
});
