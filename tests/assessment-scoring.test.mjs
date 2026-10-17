import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("candidate instructions state the time, attempt, pass mark, and actual v1 question formats", async () => {
  const source = await readFile(
    resolve(projectRoot, "app", "start", "instructions", "page.tsx"),
    "utf8",
  );
  assert.match(source, /20 minutes/);
  assert.match(source, /one attempt/i);
  assert.match(source, /40\/50 \(80%\)/);
  assert.match(source, /multiple-choice workplace\s+scenarios/i);
  assert.match(source, /number and pattern sequences/i);
  assert.match(source, /ordering actions, prioritising work, and allocating\s+resources/i);
});

test("candidate only sees results after confirmed terminal submission and requests time out", async () => {
  const source = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(source, /window\.setTimeout\(\(\) => controller\.abort\(\), 30_000\)/);
  assert.match(source, /payload\.status !== "submitted".*payload\.status !== "expired"/s);
  assert.match(source, /!payload\.result/);
  assert.match(source, /setResult\(payload\.result\)/);
  assert.match(source, /Submission confirmed\./);
});

async function loadBank(fileName) {
  const bankPath = resolve(projectRoot, "lib", "assessment", fileName);
  const source = await readFile(bankPath, "utf8");
  const testableSource = source.replace(/^import "server-only";\r?\n/, "");
  if (fileName.includes("demo-question-bank")) {
    assert.notEqual(testableSource, source, `Expected server-only marker in ${fileName}.`);
  }
  const { outputText, diagnostics = [] } = ts.transpileModule(testableSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const compileErrors = diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    compileErrors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    ),
    [],
    `${fileName} should transpile for in-memory tests.`,
  );
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const current = await loadBank("demo-question-bank.ts");
const legacy = await loadBank("demo-question-bank-v1.ts");
const { createAssessmentItemResult } = await loadBank("item-result.ts");

function correctResponses(questions) {
  return new Map(
    questions
      .filter((question) => question.scoringType !== "behavioral")
      .map((question) => [question.id, question.key]),
  );
}

function firstUiResponse(question) {
  if (question.scoringType === "behavioral") return question.options[0].id;
  if (question.game?.type === "sudoku") {
    return question.game.puzzle.flat().map((value) => value ? String(value) : "");
  }
  if (question.game?.type === "block-placement") {
    return { x: 0, y: 0, rotation: 0 };
  }
  if (question.game?.type === "rotation") return 0;
  return question.options?.[0]?.id;
}

test("v2 bank has 50 objective questions and five separate work-style prompts", () => {
  const { demoQuestions, validateDemoBank } = current;
  validateDemoBank();
  assert.equal(demoQuestions.length, 55);
  assert.equal(new Set(demoQuestions.map((question) => question.id)).size, 55);
  assert.equal(demoQuestions.filter((question) => question.scoringType === "objective").length, 50);
  assert.equal(demoQuestions.filter((question) => question.scoringType === "behavioral").length, 5);
  for (const round of [1, 2, 3, 4, 5]) {
    assert.equal(
      demoQuestions.filter((question) => question.round === round && question.scoringType === "objective").length,
      10,
    );
  }
});

test("public question data contains visual/game instructions but never scoring keys or rationales", () => {
  for (const question of current.demoQuestions) {
    const publicQuestion = current.getPublicDemoQuestion(question);
    assert.equal("key" in publicQuestion, false, `${question.id} key is private`);
    assert.equal("rationale" in publicQuestion, false, `${question.id} rationale is private`);
    assert.equal("scoringType" in publicQuestion, false, `${question.id} internal scoring type is private`);
    assert.equal(
      "responseType" in publicQuestion,
      true,
      `${question.id} only exposes whether a prompt is a work-style response`,
    );
  }
  assert.equal(current.demoQuestions.filter((question) => question.visual).length, 10);
  assert.ok(current.demoQuestions.filter((question) => question.visual).every(
    (question) => question.visual.tiles.length >= 4 && question.visual.choices.length === 4,
  ));
});

test("candidate UI answer shapes for all 55 questions pass server validation", () => {
  for (const question of current.demoQuestions) {
    const response = firstUiResponse(question);
    assert.notEqual(response, undefined, `${question.id} should have a candidate UI response`);
    assert.equal(
      current.isValidDemoResponse(question, response),
      true,
      `${question.id} candidate-generated answer should be accepted`,
    );
  }
});

test("game questions implement Sudoku, block placement, and rotation interactions", () => {
  const gameTypes = new Set(
    current.demoQuestions.filter((question) => question.game).map((question) => question.game.type),
  );
  assert.deepEqual([...gameTypes].sort(), ["block-placement", "rotation", "sudoku"]);

  const sudoku = current.demoQuestions.find((question) => question.game?.type === "sudoku");
  assert.ok(sudoku);
  const partialGrid = firstUiResponse(sudoku);
  assert.equal(current.isValidDemoResponse(sudoku, partialGrid), true);
  assert.equal(current.scoreDemoResponse(sudoku, partialGrid), false);
  const invalidClue = [...sudoku.key];
  invalidClue[0] = "4";
  assert.equal(current.isValidDemoResponse(sudoku, invalidClue), false);

  const placement = current.demoQuestions.find((question) => question.game?.type === "block-placement");
  assert.ok(placement);
  const legalWrongPlacement = { x: 0, y: 0, rotation: 0 };
  assert.equal(current.isValidDemoResponse(placement, legalWrongPlacement), true);
  assert.equal(current.scoreDemoResponse(placement, legalWrongPlacement), false);
  assert.equal(current.isValidDemoResponse(placement, { x: 5, y: 0, rotation: 0 }), false);

  const rotation = current.demoQuestions.find((question) => question.game?.type === "rotation");
  assert.ok(rotation);
  assert.equal(current.isValidDemoResponse(rotation, 0), true);
  assert.equal(current.isValidDemoResponse(rotation, 4), false);
});

test("all objective answer keys score 50/50 and five unscored responses do not affect score", () => {
  const { demoQuestions, scoreAllDemoResponses } = current;
  const responses = correctResponses(demoQuestions);
  for (const question of demoQuestions.filter((item) => item.scoringType === "behavioral")) {
    responses.set(question.id, question.options[0].id);
  }
  const result = scoreAllDemoResponses(responses);
  assert.equal(result.totalCorrect, 50);
  assert.equal(result.percentage, 100);
  assert.equal(result.outcome, "PASS");
  assert.deepEqual(result.rounds.map(({ correct }) => correct), [10, 10, 10, 10, 10]);

  const workStyle = demoQuestions.find((question) => question.scoringType === "behavioral");
  assert.ok(workStyle);
  assert.equal(current.scoreDemoResponse(workStyle, "not-an-option"), false);
  responses.delete(workStyle.id);
  assert.equal(scoreAllDemoResponses(responses).totalCorrect, 50);
});

test("the 40/50 pass mark and unanswered scoring remain unchanged", () => {
  const objectiveQuestions = current.demoQuestions.filter((question) => question.scoringType === "objective");
  const fortyResponses = new Map(
    objectiveQuestions.filter((_, index) => index < 40).map((question) => [question.id, question.key]),
  );
  const passResult = current.scoreAllDemoResponses(fortyResponses);
  assert.equal(passResult.totalCorrect, 40);
  assert.equal(passResult.percentage, 80);
  assert.equal(passResult.outcome, "PASS");

  fortyResponses.delete(objectiveQuestions[39].id);
  const failResult = current.scoreAllDemoResponses(fortyResponses);
  assert.equal(failResult.totalCorrect, 39);
  assert.equal(failResult.percentage, 78);
  assert.equal(failResult.outcome, "FAIL");

  const emptyResult = current.scoreAllDemoResponses(new Map());
  assert.equal(emptyResult.totalCorrect, 0);
  assert.equal(emptyResult.percentage, 0);
  assert.equal(emptyResult.outcome, "FAIL");
});

test("invalid objective answers explain the expected action", () => {
  const question = current.demoQuestions.find((item) => item.id === "NS-05");
  assert.ok(question);
  assert.match(
    current.getDemoResponseValidationError(question, ["1", "9"]),
    /numbers 1 to 4/,
  );
});

test("legacy v1 attempts retain their original 50-question scoring and public key secrecy", () => {
  const { demoQuestions, getPublicDemoQuestion, scoreAllDemoResponses, scoreDemoResponse } = legacy;
  assert.equal(demoQuestions.length, 50);
  const responses = new Map(
    demoQuestions.map((question) => [
      question.id,
      question.id === "RA-02" ? ["exposure", "shipment", "typo"] : question.key,
    ]),
  );
  assert.equal(scoreAllDemoResponses(responses).totalCorrect, 50);
  for (const question of demoQuestions) {
    assert.equal("key" in getPublicDemoQuestion(question), false);
  }
  const priorGame = demoQuestions.find((question) => question.id === "PE-02");
  assert.ok(priorGame);
  assert.equal(scoreDemoResponse(priorGame, priorGame.key), true);
});

test("persisted objective item payload retains its key, correctness, and points", () => {
  const question = current.demoQuestions.find((item) => item.id === "PR-01");
  assert.ok(question);
  const payload = createAssessmentItemResult({
    attemptId: "attempt-1",
    question,
    response: question.key,
    isCorrect: true,
    scoringExplanation: question.rationale,
    questionSetVersion: current.DEMO_QUESTION_SET_VERSION,
    scoringRuleVersion: current.DEMO_SCORING_RULE_VERSION,
  });
  assert.deepEqual(payload, {
    attempt_id: "attempt-1",
    question_id: "PR-01",
    round_number: 1,
    question_format: "pattern",
    question_snapshot: {
      roundTitle: question.roundTitle,
      prompt: question.text,
      options: question.options,
      visual: question.visual,
      game: null,
      scoringType: "objective",
    },
    candidate_response: "b",
    scoring_type: "objective",
    key_response: "b",
    is_correct: true,
    points: 1,
    scoring_explanation: question.rationale,
    question_set_version: current.DEMO_QUESTION_SET_VERSION,
    scoring_rule_version: current.DEMO_SCORING_RULE_VERSION,
  });
});

test("persisted behavioral item payload explicitly has behavioral type and null score fields", () => {
  const question = current.demoQuestions.find((item) => item.scoringType === "behavioral");
  assert.ok(question);
  const payload = createAssessmentItemResult({
    attemptId: "attempt-2",
    question,
    response: "a",
    isCorrect: false,
    scoringExplanation: "Unscored work-style response. Recorded for descriptive review only.",
    questionSetVersion: current.DEMO_QUESTION_SET_VERSION,
    scoringRuleVersion: current.DEMO_SCORING_RULE_VERSION,
  });
  assert.deepEqual(payload, {
    attempt_id: "attempt-2",
    question_id: "WP-01",
    round_number: 5,
    question_format: "normal",
    question_snapshot: {
      roundTitle: question.roundTitle,
      prompt: question.text,
      options: question.options,
      visual: null,
      game: null,
      scoringType: "behavioral",
    },
    candidate_response: "a",
    scoring_type: "behavioral",
    key_response: null,
    is_correct: null,
    points: null,
    scoring_explanation: "Unscored work-style response. Recorded for descriptive review only.",
    question_set_version: current.DEMO_QUESTION_SET_VERSION,
    scoring_rule_version: current.DEMO_SCORING_RULE_VERSION,
  });
  assert.notEqual(payload.scoring_type, "objective");
});

test("v1 item payload stays compatible with the pre-v2 audit table", () => {
  const question = legacy.demoQuestions.find((item) => item.id === "CA-01");
  assert.ok(question);
  const payload = createAssessmentItemResult({
    attemptId: "attempt-v1",
    question: { ...question, scoringType: "objective" },
    response: question.key,
    isCorrect: true,
    scoringExplanation: "Legacy objective scoring.",
    questionSetVersion: legacy.DEMO_QUESTION_SET_VERSION,
    scoringRuleVersion: "mustarred-demo-scoring-v1",
    includeScoringType: false,
  });
  assert.equal("scoring_type" in payload, false);
  assert.equal(payload.key_response, question.key);
  assert.equal(payload.is_correct, true);
  assert.equal(payload.points, 1);
});

test("migration retains the v1 count and supports v2 behavioral snapshots without score fields", async () => {
  const migration = await readFile(
    resolve(projectRoot, "supabase", "migrations", "20261016180000_assessment_v2_behavioral_responses.sql"),
    "utf8",
  );
  assert.match(migration, /mustarred-demo-2026-10-16-v1' then\s+expected_count := 50/s);
  assert.match(migration, /mustarred-assessment-2026-10-v2' then\s+expected_count := 55/s);
  assert.match(migration, /scoring_type = 'behavioral'[\s\S]*?key_response is null[\s\S]*?is_correct is null[\s\S]*?points is null/);
  const serverSource = await readFile(
    resolve(projectRoot, "lib", "assessment", "server.ts"),
    "utf8",
  );
  assert.match(serverSource, /createAssessmentItemResult\(\{/);
});

test("new attempts use the validated v2 bank and recruiter summary selects only pre-v2 result columns", async () => {
  const beginRoute = await readFile(
    resolve(projectRoot, "app", "api", "assessment", "begin", "route.ts"),
    "utf8",
  );
  assert.match(beginRoute, /from "@\/lib\/assessment\/demo-question-bank"/);
  assert.match(beginRoute, /validateDemoBank\(\)/);
  assert.match(beginRoute, /requested_question_set_version: DEMO_QUESTION_SET_VERSION/);

  const recruiterRoute = await readFile(
    resolve(projectRoot, "app", "api", "recruiter", "results", "route.ts"),
    "utf8",
  );
  assert.doesNotMatch(recruiterRoute, /behavioral_answered_count|behavioral_unanswered_count/);
});
