import { describe, expect, it } from "vitest";
import {
  buildExcelExportFilename,
  buildExcelExportSheets,
} from "../../src/lib/excel/excelExport";
import {
  EXCEL_CELL_SEPARATOR,
  EXCEL_HEADER,
} from "../../src/lib/excel/excelFormat";
import type { StorageSnapshot } from "../../src/lib/storage/StorageAdapter";

const snapshot: StorageSnapshot = {
  seasons: [
    {
      id: "s1",
      name: "Saison 2026/27",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      description: "",
      mainGoal: "",
      status: "draft",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      version: 1,
    },
  ],
  macrocycles: [
    {
      id: "m1",
      seasonId: "s1",
      name: "Grundlagen",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      goal: "",
      notes: "",
      version: 1,
    },
  ],
  mesocycles: [
    {
      id: "me1",
      seasonId: "s1",
      macrocycleId: "m1",
      name: "Basis",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      goal: "",
      notes: "",
      version: 1,
    },
  ],
  microcycles: [
    {
      id: "mi1",
      mesocycleId: "me1",
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      targetRpe: 5,
      goal: "",
      version: 1,
    },
    {
      id: "mi2",
      mesocycleId: "me1",
      name: "KW 33",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      targetRpe: 6,
      goal: "",
      version: 1,
    },
  ],
  periodization_dimensions: [
    {
      id: "d-str",
      seasonId: "s1",
      name: "Strength",
      code: "STRENGTH",
      sortOrder: 0,
      active: true,
      version: 1,
    },
    {
      id: "d-aero",
      seasonId: "s1",
      name: "Aerobic",
      code: "AEROBIC",
      sortOrder: 1,
      active: true,
      version: 1,
    },
  ],
  focus_definitions: [
    {
      id: "f-kraft",
      seasonId: "s1",
      dimensionId: "d-str",
      name: "Kraft",
      code: "KRAFT",
      active: true,
      version: 1,
    },
    {
      id: "f-ausdauer",
      seasonId: "s1",
      dimensionId: "d-aero",
      name: "Ausdauer",
      code: "AUSDAUER",
      active: true,
      version: 1,
    },
    {
      id: "f-main",
      seasonId: "s1",
      dimensionId: "d-aero",
      name: "Aerobic Base",
      code: "AEROBIC_BASE",
      active: true,
      version: 1,
    },
    {
      id: "f-tech",
      seasonId: "s1",
      dimensionId: "d-str",
      name: "Starts",
      code: "STARTS",
      active: true,
      version: 1,
    },
  ],
  focus_segments: [
    {
      id: "seg-aero",
      seasonId: "s1",
      dimensionId: "d-aero",
      focusDefinitionId: "f-ausdauer",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      notes: "",
      version: 1,
    },
  ],
  event_tracks: [
    {
      id: "t1",
      seasonId: "s1",
      name: "WK",
      sortOrder: 0,
      visible: true,
      version: 1,
    },
  ],
  events: [
    {
      id: "e1",
      seasonId: "s1",
      trackId: "t1",
      name: "Saisonhöhepunkt",
      startDate: "2026-08-08",
      endDate: "2026-08-08",
      priority: "A",
      version: 1,
    },
  ],
  calendar_constraints: [
    {
      id: "c1",
      seasonId: "s1",
      type: "Ferien",
      name: "Sommerferien",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      version: 1,
    },
    {
      id: "c2",
      seasonId: "s1",
      type: "Badschließung",
      name: "Sommerpause Bad",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      version: 1,
    },
  ],
  training_days: [
    {
      id: "day1",
      seasonId: "s1",
      date: "2026-08-03",
      dayContext: "Wochenauftakt",
      version: 1,
    },
    {
      id: "day2",
      seasonId: "s1",
      date: "2026-08-04",
      dayContext: "Wochenauftakt",
      version: 1,
    },
    {
      id: "day3",
      seasonId: "s1",
      date: "2026-08-10",
      dayContext: "Belastung",
      version: 1,
    },
  ],
  training_sessions: [
    {
      id: "ses1",
      trainingDayId: "day1",
      mainFocusId: "f-main",
      technicalFocusId: "f-tech",
      keySession: false,
      version: 1,
    },
    {
      id: "ses2",
      trainingDayId: "day2",
      mainFocusId: "f-main",
      keySession: false,
      version: 1,
    },
  ],
};

describe("Excel export", () => {
  it("flattens a season into the documented weekly grid", () => {
    const [sheet] = buildExcelExportSheets(snapshot);
    expect(sheet.name).toBe("Saison 2026/27");
    expect(sheet.rows[0]).toEqual([...EXCEL_HEADER]);
    expect(sheet.rows).toHaveLength(3);

    const week32 = sheet.rows[1];
    expect(week32[EXCEL_HEADER.indexOf("KW")]).toBe(32);
    expect(week32[EXCEL_HEADER.indexOf("Datum")]).toBe("2026-08-03");
    expect(week32[EXCEL_HEADER.indexOf("Monat")]).not.toBe("");
    expect(week32[EXCEL_HEADER.indexOf("Macro")]).toBe("Grundlagen");
    expect(week32[EXCEL_HEADER.indexOf("Meso")]).toBe("Basis");
    expect(week32[EXCEL_HEADER.indexOf("Mic RPE")]).toBe(5);
    expect(week32[EXCEL_HEADER.indexOf("Aero")]).toBe("Ausdauer");
    expect(week32[EXCEL_HEADER.indexOf("Strength")]).toBe("");
    expect(week32[EXCEL_HEADER.indexOf("WK")]).toBe("WK M Saisonhöhepunkt");
    expect(week32[EXCEL_HEADER.indexOf("Ferien")]).toBe("Sommerferien");
    expect(week32[EXCEL_HEADER.indexOf("Fokus")]).toBe("Wochenauftakt");
    expect(week32[EXCEL_HEADER.indexOf("Main")]).toBe("Aerobic Base");
    expect(week32[EXCEL_HEADER.indexOf("daily Tech")]).toBe("Starts");

    const week33 = sheet.rows[2];
    expect(week33[EXCEL_HEADER.indexOf("KW")]).toBe(33);
    expect(week33[EXCEL_HEADER.indexOf("Datum")]).toBe("2026-08-10");
    expect(week33[EXCEL_HEADER.indexOf("Monat")]).toBe("");
    expect(week33[EXCEL_HEADER.indexOf("Mic RPE")]).toBe(6);
    expect(week33[EXCEL_HEADER.indexOf("Aero")]).toBe("Ausdauer");
    expect(week33[EXCEL_HEADER.indexOf("Fokus")]).toBe("Belastung");
  });

  it("only maps Ferien-type constraints into the Ferien column", () => {
    const [sheet] = buildExcelExportSheets(snapshot);
    const week33 = sheet.rows[2];
    expect(week33[EXCEL_HEADER.indexOf("Ferien")]).toBe("");
  });

  it("joins multiple values with the documented separator", () => {
    const multi: StorageSnapshot = {
      ...snapshot,
      training_days: [
        {
          id: "day1",
          seasonId: "s1",
          date: "2026-08-03",
          dayContext: "A",
          version: 1,
        },
        {
          id: "day2",
          seasonId: "s1",
          date: "2026-08-04",
          dayContext: "B",
          version: 1,
        },
      ],
    };
    const [sheet] = buildExcelExportSheets(multi);
    expect(sheet.rows[1][EXCEL_HEADER.indexOf("Fokus")]).toBe(
      ["A", "B"].join(EXCEL_CELL_SEPARATOR),
    );
  });

  it("builds the documented filename", () => {
    expect(buildExcelExportFilename(snapshot, "2026-08-10T10:00:00.000Z")).toBe(
      "sgrs-swimplan-2026-26-2026-08-10.xlsx",
    );
  });
});
