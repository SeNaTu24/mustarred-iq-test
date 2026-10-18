import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(
  resolve(projectRoot, "lib", "assessment", "draft-persistence.ts"),
  "utf8",
);
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
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
const {
  createDebouncedDraftAutosaver,
  saveAllPendingDrafts,
  saveIfDraftIsCurrent,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("autosave marks a scheduled response saved only after its request succeeds", async () => {
  const versions = new Map([["Q1", 1]]);
  const savedVersions = new Map();
  const persisted = [];
  const autosaver = createDebouncedDraftAutosaver({
    delayMs: 60_000,
    getCurrentVersion: (questionId) => versions.get(questionId) ?? 0,
    save: (questionId, response, version) =>
      saveIfDraftIsCurrent(
        questionId,
        response,
        version,
        (id) => versions.get(id) ?? 0,
        async (id, value) => persisted.push([id, value]),
        (id, savedVersion) => savedVersions.set(id, savedVersion),
      ),
  });

  autosaver.schedule("Q1", "selection", 1);
  assert.equal(savedVersions.get("Q1"), undefined);
  await autosaver.flushAll();

  assert.deepEqual(persisted, [["Q1", "selection"]]);
  assert.equal(savedVersions.get("Q1"), 1);
});

test("a failed autosave remains pending and can be retried without marking saved early", async () => {
  const versions = new Map([["Q1", 1]]);
  const savedVersions = new Map();
  const attempts = [];
  let shouldFail = true;
  const autosaver = createDebouncedDraftAutosaver({
    delayMs: 60_000,
    getCurrentVersion: (questionId) => versions.get(questionId) ?? 0,
    save: (questionId, response, version) =>
      saveIfDraftIsCurrent(
        questionId,
        response,
        version,
        (id) => versions.get(id) ?? 0,
        async (id, value) => {
          attempts.push([id, value]);
          if (shouldFail) throw new Error("network unavailable");
        },
        (id, savedVersion) => savedVersions.set(id, savedVersion),
      ),
  });

  autosaver.schedule("Q1", "selection", 1);
  await assert.rejects(autosaver.flushAll(), /network unavailable/);
  assert.equal(savedVersions.get("Q1"), undefined);
  assert.deepEqual(attempts, [["Q1", "selection"]]);

  shouldFail = false;
  await autosaver.flushAll();
  assert.deepEqual(attempts, [["Q1", "selection"], ["Q1", "selection"]]);
  assert.equal(savedVersions.get("Q1"), 1);
});

test("a retry save does not mark a newer draft as saved", async () => {
  const request = deferred();
  let version = 1;
  let savedVersion;
  const save = saveIfDraftIsCurrent(
    "Q1",
    "older selection",
    1,
    () => version,
    () => request.promise,
    (_questionId, saved) => {
      savedVersion = saved;
    },
  );

  version = 2;
  request.resolve();
  await save;
  assert.equal(savedVersion, undefined);
});

test("submission persists an edit made while an earlier save is pending", async () => {
  const drafts = new Map([["Q1", "first selection"]]);
  const versions = new Map([["Q1", 1]]);
  const savedVersions = new Map();
  const firstRequest = deferred();
  const persisted = [];
  let requestCount = 0;
  let finalized = false;
  const submission = (async () => {
    await saveAllPendingDrafts({
      getDrafts: () => drafts,
      getVersion: (id) => versions.get(id) ?? 0,
      getSavedVersion: (id) => savedVersions.get(id),
      save: (id, response, version) => {
        requestCount += 1;
        const request =
          requestCount === 1
            ? firstRequest.promise.then(() => {
                persisted.push("first selection");
              })
            : Promise.resolve().then(() => persisted.push(response));
        return saveIfDraftIsCurrent(
          id,
          response,
          version,
          (questionId) => versions.get(questionId) ?? 0,
          () => request,
          (questionId, savedVersion) =>
            savedVersions.set(questionId, savedVersion),
        );
      },
    });
    finalized = true;
  })();

  drafts.set("Q1", "latest selection");
  versions.set("Q1", 2);
  firstRequest.resolve();
  await submission;

  assert.equal(requestCount, 2);
  assert.deepEqual(persisted, ["first selection", "latest selection"]);
  assert.equal(savedVersions.get("Q1"), 2);
  assert.equal(finalized, true);
});

test("submission flush retries a failed autosave before allowing finalization", async () => {
  const drafts = new Map([["Q1", "selection"]]);
  const versions = new Map([["Q1", 1]]);
  const savedVersions = new Map();
  const attempts = [];
  let shouldFail = true;
  let finalized = false;
  const save = (questionId, response, version) =>
    saveIfDraftIsCurrent(
      questionId,
      response,
      version,
      (id) => versions.get(id) ?? 0,
      async (id, value) => {
        attempts.push([id, value]);
        if (shouldFail) throw new Error("save failed");
      },
      (id, savedVersion) => savedVersions.set(id, savedVersion),
    );
  const autosaver = createDebouncedDraftAutosaver({
    delayMs: 60_000,
    getCurrentVersion: (questionId) => versions.get(questionId) ?? 0,
    save,
  });
  autosaver.schedule("Q1", "selection", 1);

  const submit = async () => {
    await autosaver.flushAll();
    await saveAllPendingDrafts({
      getDrafts: () => drafts,
      getVersion: (id) => versions.get(id) ?? 0,
      getSavedVersion: (id) => savedVersions.get(id),
      save,
    });
    finalized = true;
  };

  await assert.rejects(submit(), /save failed/);
  assert.equal(finalized, false);
  assert.equal(savedVersions.get("Q1"), undefined);

  shouldFail = false;
  await submit();
  assert.equal(finalized, true);
  assert.equal(savedVersions.get("Q1"), 1);
  assert.deepEqual(attempts, [["Q1", "selection"], ["Q1", "selection"]]);
});

test("assessment UI locks edits/navigation and waits for in-flight saves", async () => {
  const client = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(client, /isSubmittingRef\.current = true/);
  assert.match(client, /if \(!currentQuestion \|\| isSubmittingRef\.current\) return/);
  assert.match(client, /await Promise\.allSettled\(\[\.\.\.inFlightSavesRef\.current\]\)/);
  assert.match(client, /await autosaverRef\.current\?\.flushAll\(\)/);
  assert.match(client, /await saveAllPendingDrafts\(/);
  assert.match(client, /autosaver\.flushAll\(\)\.catch/);
  assert.match(client, /warnBeforeLosingUnsavedAnswers/);
  assert.match(client, /window\.addEventListener\("beforeunload"/);
  assert.match(client, /setSaveErrors\(/);
  assert.match(client, /!saveErrors\[currentQuestion\.id\] && savedIds\.has\(currentQuestion\.id\)/);
  assert.match(client, /Review and retry/);
  const actions = client.match(/<div className="demo-actions">([\s\S]*?)<div className="demo-prev-next">/)?.[1];
  assert.ok(actions);
  assert.match(actions, /saveErrors\[currentQuestion\.id\] && \(/);
  assert.match(actions, /Retry save/);
  assert.doesNotMatch(actions, /Save answer/);
  assert.match(client, /disabled=\{isSubmitting \|\| currentIndex === 0\}/);
  assert.match(client, /disabled=\{isSubmitting \|\| currentIndex === session\.questions\.length - 1\}/);
});
