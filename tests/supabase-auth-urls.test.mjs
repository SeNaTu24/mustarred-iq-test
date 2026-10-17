import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadAuthUrlsModule() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const sourcePath = resolve(projectRoot, "lib", "supabase", "auth-urls.ts");
  const source = await readFile(sourcePath, "utf8");
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
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
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

test("auth links use the configured app origin and callback path", async () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  process.env.NODE_ENV = "development";
  try {
    const { getAuthRedirectUrl } = await loadAuthUrlsModule();
    assert.equal(
      getAuthRedirectUrl("/auth/callback"),
      "http://localhost:3000/auth/callback",
    );
    assert.equal(
      getAuthRedirectUrl("/auth/callback?flow=recovery"),
      "http://localhost:3000/auth/callback?flow=recovery",
    );
  } finally {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("auth links reject missing, unsafe, and production-local URLs", async () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    const { getAuthRedirectUrl } = await loadAuthUrlsModule();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.throws(() => getAuthRedirectUrl("/auth/callback"), /must be configured/);

    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    assert.throws(() => getAuthRedirectUrl("/auth/callback"), /valid HTTP\(S\)/);

    process.env.NEXT_PUBLIC_SITE_URL = "https://mustarred.example";
    process.env.NODE_ENV = "production";
    assert.throws(() => getAuthRedirectUrl("//attacker.example/path"), /app-relative/);

    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.throws(() => getAuthRedirectUrl("/auth/callback"), /public app host/);
  } finally {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
