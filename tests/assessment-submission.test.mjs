import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = resolve(projectRoot, "lib", "assessment", "submission.ts");
const source = await readFile(helperPath, "utf8");
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
const { finalizeAndGetResult } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("retry after a lost submission response skips finalization and returns the existing result", async () => {
  let status = "in_progress";
  let finalizeCalls = 0;
  let resultReads = 0;
  let storedResult;
  const finalizeOrGet = async () => {
    finalizeCalls += 1;
    if (status === "in_progress") status = "submitted";
    return status;
  };
  const getOrCreateResult = async () => {
    resultReads += 1;
    if (!storedResult) {
      storedResult = { totalCorrect: 43, outcome: "PASS" };
    }
    return storedResult;
  };

  const firstResponse = await finalizeAndGetResult(
    status,
    finalizeOrGet,
    getOrCreateResult,
  );
  assert.deepEqual(firstResponse, {
    status: "submitted",
    result: { totalCorrect: 43, outcome: "PASS" },
  });
  assert.equal(finalizeCalls, 1);

  const retryResponse = await finalizeAndGetResult(
    status,
    finalizeOrGet,
    getOrCreateResult,
  );
  assert.equal(retryResponse.status, "submitted");
  assert.equal(retryResponse.result, firstResponse.result);
  assert.equal(finalizeCalls, 1);
  assert.equal(resultReads, 2);
});

test("expired attempts retrieve their result without another finalization", async () => {
  let finalizeCalls = 0;
  const result = { totalCorrect: 0, outcome: "FAIL" };
  const response = await finalizeAndGetResult(
    "expired",
    async () => {
      finalizeCalls += 1;
      return "submitted";
    },
    async () => result,
  );
  assert.equal(response.status, "expired");
  assert.equal(response.result, result);
  assert.equal(finalizeCalls, 0);
});

test("no result is returned when finalization is still unconfirmed", async () => {
  let resultRead = false;
  await assert.rejects(
    finalizeAndGetResult(
      "in_progress",
      async () => "in_progress",
      async () => {
        resultRead = true;
        return { totalCorrect: 50 };
      },
    ),
    /could not be confirmed as finalized/,
  );
  assert.equal(resultRead, false);
});

test("submission route reconciles terminal attempts and the client checks session after a lost response", async () => {
  const route = await readFile(
    resolve(projectRoot, "app", "api", "assessment", "submit", "route.ts"),
    "utf8",
  );
  assert.match(route, /finalizeAndGetResult\(\s*attempt\.status/);
  assert.match(route, /calculateAndSaveResult\(supabase, attempt\.id\)/);
  assert.doesNotMatch(route, /saved answers are safe/i);

  const client = await readFile(
    resolve(projectRoot, "app", "assessment", "assessment-client.tsx"),
    "utf8",
  );
  assert.match(client, /submissionRequestStarted = true/);
  assert.match(client, /const recoveredSession = await loadSession\(\)/);
  assert.match(client, /fetchWithTimeout\("\/api\/assessment\/session"/);
  assert.match(client, /No result is shown until the server confirms it/);
  assert.doesNotMatch(client, /Your saved answers are safe/i);
});
