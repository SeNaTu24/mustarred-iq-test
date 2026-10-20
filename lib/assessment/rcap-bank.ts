import "server-only";

import ExcelJS from "exceljs";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  downloadRcapBankFromPrivateStorage,
  RcapBankSourceError,
  resolveRcapBankSource,
} from "./rcap-bank-source";
import { RCAP_QUESTION_SET_VERSION, parseRcapQuestionRows } from "./rcap-assignment";

let cachedBank: Promise<ReturnType<typeof parseRcapQuestionRows>> | null = null;

async function loadBankFromWorkbook() {
  const sourceConfig = resolveRcapBankSource(
    process.env,
    path.join(
      process.cwd(),
      "assessment-data",
      "Mustarred_RCAP_200_Abstract_Hybrid_Bank_Examiner.xlsx",
    ),
  );
  const source = sourceConfig.kind === "private-storage"
    ? await downloadRcapBankFromPrivateStorage(
        getSupabaseAdminClient().storage,
        sourceConfig.bucket,
        sourceConfig.object,
      )
    : await readFile(/* turbopackIgnore: true */ sourceConfig.path);
  const zip = await JSZip.loadAsync(source);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml")) continue;
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async("string");
    zip.file(name, xml.replace(/<(\/?)([A-Za-z][A-Za-z0-9_.-]*):/g, "<$1"));
  }
  const normalizedWorkbook = await zip.generateAsync({ type: "arraybuffer" });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(normalizedWorkbook);
  const sheet = workbook.getWorksheet("MASTER BANK");
  if (!sheet) {
    throw new Error("The private RCAP bank is unavailable in this environment.");
  }

  const headerValues = sheet.getRow(1).values;
  const headers = Array.isArray(headerValues) ? headerValues.slice(1) : [];
  const rows = sheet
    .getRows(2, Math.max(0, sheet.rowCount - 1))
    ?.map((row) => {
      const values = row.values;
      return Array.isArray(values) ? values.slice(1) : [];
    }) ?? [];

  return parseRcapQuestionRows(headers, rows);
}

export async function loadRcapQuestionBank() {
  if (!cachedBank) {
    cachedBank = loadBankFromWorkbook().catch((error: unknown) => {
      cachedBank = null;
      if (error instanceof RcapBankSourceError) throw error;
      throw new RcapBankSourceError(
        `The private question bank for ${RCAP_QUESTION_SET_VERSION} is unavailable in this environment.`,
      );
    });
  }
  return cachedBank;
}
