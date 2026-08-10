import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  buildExcelExportSheets,
  safeSheetName,
} from "../../src/lib/excel/excelExport";
import {
  buildExcelImportSnapshot,
  parseExcelRows,
  parseExcelWorkbook,
} from "../../src/lib/excel/excelImport";
import { EXCEL_HEADER } from "../../src/lib/excel/excelFormat";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

const week32 = [
  "August 2026",
  32,
  "2026-08-03",
  "WK M Saisonhöhepunkt",
  "Sommerferien",
  "Grundlagen",
  "Kraft",
  "Ausdauer",
  "",
  "",
  "",
  "",
  "Basis",
  5,
  "Wochenauftakt",
  "Aerobic Base",
  "Starts",
];
const week33 = [
  "",
  33,
  "2026-08-10",
  "",
  "",
  "Grundlagen",
  "",
  "Ausdauer",
  "",
  "",
  "",
  "",
  "Basis",
  6,
  "",
  "",
  "",
];
const week34 = [
  "",
  34,
  "2026-08-17",
  "",
  "",
  "Aufbau",
  "",
  "",
  "",
  "Sprint",
  "",
  "",
  "Umfang",
  7,
  "",
  "",
  "",
];
const week35 = [
  "",
  35,
  "2026-08-24",
  "",
  "",
  "Aufbau",
  "",
  "",
  "",
  "",
  "",
  "",
  "Umfang",
  8,
  "",
  "",
  "",
];

function workbookFromRows(
  name: string,
  rows: readonly unknown[][],
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows as unknown[][]);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(name));
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
}

function rowsFromWorkbook(data: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(new Uint8Array(data), { cellDates: true });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
}

describe("Excel roundtrip", () => {
  it("imports an exported workbook back into the same planning data", async () => {
    const source = parseExcelRows(
      [EXCEL_HEADER, week32, week33, week34, week35],
      "Saison 2026/27",
    );
    const first = buildExcelImportSnapshot(source);
    const storage = new InMemoryStorageAdapter();
    await storage.applyImport(first.snapshot);

    const exported = buildExcelExportSheets(await storage.exportAll());
    expect(exported).toHaveLength(1);
    const buffer = workbookFromRows(exported[0].name, exported[0].rows);
    const preview = parseExcelWorkbook(buffer);
    expect(preview.errors).toEqual([]);
    const sheet = preview.sheets[0];
    expect(sheet.errors).toEqual([]);
    expect(sheet.weeks).toHaveLength(4);

    const second = buildExcelImportSnapshot(sheet);
    const target = new InMemoryStorageAdapter();
    await target.applyImport(second.snapshot);

    const seasons = (await target.list("seasons")) as Array<{
      startDate: string;
      endDate: string;
    }>;
    expect(seasons[0].startDate).toBe("2026-08-03");
    expect(seasons[0].endDate).toBe("2026-08-30");
    expect(await target.list("microcycles")).toHaveLength(4);
    expect(await target.list("macrocycles")).toHaveLength(2);
    expect(await target.list("mesocycles")).toHaveLength(2);

    const events = (await target.list("events")) as Array<{
      name: string;
      priority: string;
    }>;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ name: "Saisonhöhepunkt", priority: "A" });

    const focusSegments = (await target.list("focus_segments")) as Array<{
      focusDefinitionId: string;
    }>;
    const focusDefinitions = (await target.list("focus_definitions")) as Array<{
      id: string;
      name: string;
    }>;
    const names = new Set(
      focusDefinitions.map((definition) => definition.name),
    );
    expect(names.has("Kraft")).toBe(true);
    expect(names.has("Ausdauer")).toBe(true);
    expect(names.has("Sprint")).toBe(true);
    expect(names.has("Aerobic Base")).toBe(true);
    expect(focusSegments.length).toBeGreaterThanOrEqual(3);

    const sessions = (await target.list("training_sessions")) as Array<{
      mainFocusId?: string;
    }>;
    expect(sessions.length).toBeGreaterThan(0);
    const mainName = sessions
      .map(
        (session) =>
          focusDefinitions.find(
            (definition) => definition.id === session.mainFocusId,
          )?.name,
      )
      .find(Boolean);
    expect(mainName).toBe("Aerobic Base");

    const constraints = (await target.list("calendar_constraints")) as Array<{
      name: string;
      type: string;
    }>;
    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toMatchObject({
      name: "Sommerferien",
      type: "Ferien",
    });
  });

  it("re-reads a workbook written by the export into the same grid", () => {
    const source = parseExcelRows([EXCEL_HEADER, week32, week33], "Roundtrip");
    const first = buildExcelImportSnapshot(source);
    const sheets = buildExcelExportSheets(first.snapshot);
    const buffer = workbookFromRows(sheets[0].name, sheets[0].rows);
    const reread = rowsFromWorkbook(buffer);
    expect(reread[0]).toEqual([...EXCEL_HEADER]);
    expect(reread[1][EXCEL_HEADER.indexOf("KW")]).toBe(32);
    expect(reread[1][EXCEL_HEADER.indexOf("Datum")]).toBe("2026-08-03");
    expect(reread[1][EXCEL_HEADER.indexOf("Macro")]).toBe("Grundlagen");
    expect(reread[1][EXCEL_HEADER.indexOf("Mic RPE")]).toBe(5);
  });
});
