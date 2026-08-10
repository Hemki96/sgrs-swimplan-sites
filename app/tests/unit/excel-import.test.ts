import { describe, expect, it } from "vitest";
import {
  buildExcelImportSnapshot,
  parseExcelRows,
} from "../../src/lib/excel/excelImport";
import { EXCEL_HEADER } from "../../src/lib/excel/excelFormat";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

function grid(
  ...rows: (readonly unknown[])[]
): readonly (readonly unknown[])[] {
  return [EXCEL_HEADER, ...rows];
}

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

describe("Excel import", () => {
  it("parses a valid season grid into weekly rows with counts", () => {
    const sheet = parseExcelRows(grid(week32, week33, week34, week35), "Plan");
    expect(sheet.errors).toEqual([]);
    expect(sheet.weeks).toHaveLength(4);
    expect(sheet.startDate).toBe("2026-08-03");
    expect(sheet.endDate).toBe("2026-08-30");
    expect(sheet.weeks[0]).toMatchObject({
      kw: 32,
      monday: "2026-08-03",
      sunday: "2026-08-09",
      rpe: 5,
      wk: "WK M Saisonhöhepunkt",
      ferien: "Sommerferien",
      macro: "Grundlagen",
      meso: "Basis",
      fokus: "Wochenauftakt",
      main: "Aerobic Base",
      tech: "Starts",
      dimensions: { Strength: "Kraft", Aero: "Ausdauer" },
    });
    expect(sheet.counts).toMatchObject({
      Wochen: 4,
      Mikrozyklen: 4,
      Macrozyklen: 2,
      Mesozyklen: 2,
      Wettkämpfe: 1,
      Ferien: 1,
      Fokusdefinitionen: 3,
      Fokussegmente: 3,
      Trainingstage: 5,
      Trainingseinheiten: 5,
    });
  });

  it("rejects a missing header row", () => {
    const sheet = parseExcelRows([["KW", 32]], "Plan");
    expect(sheet.errors).not.toHaveLength(0);
  });

  it("rejects invalid KW and Mic RPE values with row context", () => {
    const sheet = parseExcelRows(
      grid(
        [
          "",
          "bogus",
          "2026-08-03",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          9,
          "",
          "",
          "",
        ],
        [
          "",
          33,
          "2026-08-10",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          11,
          "",
          "",
          "",
        ],
      ),
      "Plan",
    );
    expect(sheet.errors).toContain("Eine Zeile enthält keine gültige KW.");
    expect(sheet.errors).toContain(
      "KW 33: Mic RPE muss eine ganze Zahl zwischen 1 und 10 sein.",
    );
    expect(sheet.weeks).toHaveLength(1);
  });

  it("accepts Excel date serials and German date cells", () => {
    const sheet = parseExcelRows(
      grid(
        ["", 32, 46241, "", "", "", "", "", "", "", "", "", "", 5, "", "", ""],
        [
          "",
          33,
          "10.08.2026",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          6,
          "",
          "",
          "",
        ],
      ),
      "Plan",
    );
    expect(sheet.errors).toEqual([]);
    expect(sheet.weeks[0].monday).toBe("2026-08-03");
    expect(sheet.weeks[1].monday).toBe("2026-08-10");
  });

  it("builds a snapshot with fresh ids and consistent references", () => {
    const week33WithContent = [
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
      "Belastung",
      "Aerobic Base",
      "Starts",
    ];
    const sheet = parseExcelRows(grid(week32, week33WithContent), "Plan");
    const { snapshot } = buildExcelImportSnapshot(sheet);
    const season = snapshot.seasons?.[0] as { id: string };
    const macrocycles = snapshot.macrocycles as Array<{
      id: string;
      name: string;
      seasonId: string;
      startDate: string;
      endDate: string;
    }>;
    const mesocycles = snapshot.mesocycles as Array<{
      id: string;
      macrocycleId: string;
      seasonId: string;
    }>;
    const microcycles = snapshot.microcycles as Array<{
      id: string;
      mesocycleId: string;
      targetRpe: number;
      name: string;
    }>;
    const focusDefinitions = snapshot.focus_definitions as Array<{
      id: string;
      name: string;
      code: string;
      dimensionId: string;
    }>;
    const focusSegments = snapshot.focus_segments as Array<{
      dimensionId: string;
      focusDefinitionId: string;
    }>;
    const events = snapshot.events as Array<{
      trackId: string;
      priority: string;
      name: string;
    }>;
    const eventTracks = snapshot.event_tracks as Array<{ id: string }>;
    const sessions = snapshot.training_sessions as Array<{
      trainingDayId: string;
      mainFocusId?: string;
    }>;
    const days = snapshot.training_days as Array<{ id: string; date: string }>;

    expect(macrocycles).toHaveLength(1);
    expect(macrocycleByName(macrocycles, "Grundlagen").seasonId).toBe(
      season.id,
    );
    expect(mesocycles).toHaveLength(1);
    expect(mesocycles[0].macrocycleId).toBe(macrocycles[0].id);
    expect(microcycles).toHaveLength(2);
    expect(microcycles[0].mesocycleId).toBe(mesocycles[0].id);
    expect(microcycles[0].targetRpe).toBe(5);
    expect(microcycles[1].targetRpe).toBe(6);
    expect(new Set(microcycles.map((micro) => micro.id)).size).toBe(2);

    const strength = snapshot.periodization_dimensions as Array<{
      code: string;
      id: string;
    }>;
    const strengthId = strength.find(
      (dimension) => dimension.code === "STRENGTH",
    )?.id as string;
    const aeroId = strength.find((dimension) => dimension.code === "AEROBIC")
      ?.id as string;
    const kraft = focusDefinitions.find(
      (definition) => definition.name === "Kraft",
    );
    const ausdauer = focusDefinitions.find(
      (definition) => definition.name === "Ausdauer",
    );
    expect(kraft?.dimensionId).toBe(strengthId);
    expect(ausdauer?.dimensionId).toBe(aeroId);
    expect(focusSegments).toHaveLength(2);
    expect(
      focusSegments.some(
        (segment) =>
          segment.focusDefinitionId === kraft?.id &&
          segment.dimensionId === strengthId,
      ),
    ).toBe(true);

    expect(eventTracks).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0].trackId).toBe(eventTracks[0].id);
    expect(events[0].priority).toBe("A");
    expect(events[0].name).toBe("Saisonhöhepunkt");

    expect(days).toHaveLength(10);
    expect(sessions).toHaveLength(10);
    expect(sessions[0].trainingDayId).toBe(days[0].id);
    expect(sessions[0].mainFocusId).toBe(
      focusDefinitions.find((definition) => definition.name === "Aerobic Base")
        ?.id,
    );
  });

  it("applies the built snapshot atomically with revisions", async () => {
    const sheet = parseExcelRows(grid(week32, week33, week34, week35), "Plan");
    const { snapshot } = buildExcelImportSnapshot(sheet);
    const storage = new InMemoryStorageAdapter();
    await storage.applyImport(snapshot);
    expect(await storage.list("seasons")).toHaveLength(1);
    expect(await storage.list("microcycles")).toHaveLength(4);
    const season = (await storage.list("seasons"))[0] as { id: string };
    const revisions = await storage.listRevisions(season.id);
    const operations = revisions.map((revision) => revision.operation);
    expect(operations.every((operation) => operation === "create")).toBe(true);
    expect(revisions.length).toBeGreaterThanOrEqual(5);
  });
});

function macrocycleByName(rows: readonly { name: string }[], name: string) {
  return rows.find((row) => row.name === name) as unknown as {
    id: string;
    seasonId: string;
  };
}
