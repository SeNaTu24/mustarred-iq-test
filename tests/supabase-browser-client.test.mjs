import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

test("browser Supabase client uses PKCE with manual callback code exchange", async () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const sourcePath = resolve(projectRoot, "lib", "supabase", "client.ts");
  const source = await readFile(sourcePath, "utf8");
  const importStatement =
    'import { createClient, type SupabaseClient } from "@supabase/supabase-js";';
  assert.ok(source.includes(importStatement));

  const testableSource = source.replace(
    importStatement,
    "const createClient = globalThis.__mockSupabaseCreateClient;",
  );
  const { outputText, diagnostics = [] } = ts.transpileModule(testableSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert.equal(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.category === ts.DiagnosticCategory.Error,
    ),
    false,
  );

  let receivedOptions;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const previousFactory = globalThis.__mockSupabaseCreateClient;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  globalThis.__mockSupabaseCreateClient = (_url, _key, options) => {
    receivedOptions = options;
    return {};
  };

  try {
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
    const browserClientModule = await import(moduleUrl);
    browserClientModule.getSupabaseBrowserClient();

    assert.equal(receivedOptions.auth.flowType, "pkce");
    assert.equal(receivedOptions.auth.detectSessionInUrl, false);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
    }
    if (previousFactory === undefined) delete globalThis.__mockSupabaseCreateClient;
    else globalThis.__mockSupabaseCreateClient = previousFactory;
  }
});
