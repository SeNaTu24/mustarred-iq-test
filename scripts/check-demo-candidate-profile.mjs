import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CANDIDATE_AUTH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ERROR_CODE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;

function getSafeErrorCode(error) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }
  const code = error.code;
  return typeof code === "string" && SAFE_ERROR_CODE_PATTERN.test(code)
    ? code
    : "";
}

async function checkCandidateProfile(candidateAuthId) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const adminClientPath = resolve(
    projectRoot,
    "lib",
    "supabase",
    "admin.ts",
  );
  const adminSource = readFileSync(adminClientPath, "utf8");
  const sourceWithoutServerOnlyMarker = adminSource.replace(
    /^import "server-only";\r?\n/,
    "",
  );
  if (sourceWithoutServerOnlyMarker === adminSource) {
    throw new Error("The expected server-only marker was not found.");
  }

  const require = createRequire(import.meta.url);
  const typescript = require("typescript");
  const { Module } = require("node:module");
  const { outputText, diagnostics = [] } = typescript.transpileModule(
    sourceWithoutServerOnlyMarker,
    {
      compilerOptions: {
        module: typescript.ModuleKind.CommonJS,
        target: typescript.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    },
  );
  if (
    diagnostics.some(
      (diagnostic) =>
        diagnostic.category === typescript.DiagnosticCategory.Error,
    )
  ) {
    throw new Error("The server admin client could not be loaded.");
  }

  const adminModule = new Module(adminClientPath);
  adminModule.filename = adminClientPath;
  adminModule.paths = Module._nodeModulePaths(dirname(adminClientPath));
  adminModule._compile(outputText, adminClientPath);

  const { getSupabaseAdminClient } = adminModule.exports;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateAuthId)
    .maybeSingle();

  if (error) {
    const code = getSafeErrorCode(error);
    console.log(
      `profile_exists=false query_failed=true${code ? ` error_code=${code}` : ""}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`profile_exists=${Boolean(data)} query_failed=false`);
}

const candidateAuthId = process.env.CANDIDATE_AUTH_ID;
if (!candidateAuthId || !CANDIDATE_AUTH_ID_PATTERN.test(candidateAuthId)) {
  console.log(
    "profile_exists=false query_failed=true error_code=missing_or_invalid_candidate_id",
  );
  process.exitCode = 1;
} else {
  try {
    await checkCandidateProfile(candidateAuthId);
  } catch (error) {
    const code = getSafeErrorCode(error);
    console.log(
      `profile_exists=false query_failed=true${code ? ` error_code=${code}` : ""}`,
    );
    process.exitCode = 1;
  }
}
