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
const { saveAllPendingDrafts, saveIfDraftIsCurrent } = await import(
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

test("a manual save does not mark a newer draft as saved", async () => {
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

test("a failed required save stops submission before finalization", async () => {
  let finalized = false;
  await assert.rejects(
    saveAllPendingDrafts({
      getDrafts: () => new Map([["Q1", "selection"]]),
      getVersion: () => 1,
      getSavedVersion: () => undefined,
      save: async () => {
        throw new Error("save failed");
      },
    }).then(() => {
      finalized = true;
    }),
    /save failed/,
  );
  assert.equal(finalized, false);
});

test("assessment UI locks edits/navigation and waits for in-flight saves", async () => {
  const client = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(client, /isSubmittingRef\.current = true/);
  assert.match(client, /if \(!currentQuestion \|\| isSubmittingRef\.current\) return/);
  assert.match(client, /await Promise\.allSettled\(\[\.\.\.inFlightSavesRef\.current\]\)/);
  assert.match(client, /await saveAllPendingDrafts\(/);
  assert.match(client, /disabled=\{isSubmitting \|\| currentIndex === 0\}/);
  assert.match(client, /disabled=\{isSubmitting \|\| currentIndex === session\.questions\.length - 1\}/);
});
