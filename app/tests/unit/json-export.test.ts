import { describe, expect, it } from "vitest";
import {
  buildJsonExport,
  buildJsonExportFilename,
} from "../../src/lib/export/jsonExport";
import { STORAGE_COLLECTIONS } from "../../src/lib/storage/StorageAdapter";

const externalKeys = [
  "configurationValues",
  "seasons",
  "eventTracks",
  "events",
  "calendarConstraints",
  "macrocycles",
  "mesocycles",
  "microcycles",
  "microcycleSegments",
  "periodizationDimensions",
  "focusDefinitions",
  "focusSegments",
  "trainingDays",
  "trainingSessions",
  "trainingScheduleTemplates",
  "equipmentItems",
  "sessionEquipment",
  "revisions",
] as const;

describe("JSON export", () => {
  it("emits the versioned portable format and all collections", () => {
    const payload = buildJsonExport(
      {
        seasons: [{ id: "season-1", version: 1 }],
        event_tracks: [],
        training_sessions: [
          { id: "session-1", version: 2, deletedAt: "2026-08-08T10:00:00Z" },
        ],
        revisions: [{ id: "revision-1", version: 0 }],
      },
      "2026-08-09T14:00:00.000Z",
    );
    expect(payload).toMatchObject({
      schemaVersion: "1.0",
      exportedAt: "2026-08-09T14:00:00.000Z",
      seasons: [{ id: "season-1", version: 1 }],
      eventTracks: [],
      trainingSessions: [
        { id: "session-1", version: 2, deletedAt: "2026-08-08T10:00:00Z" },
      ],
      revisions: [{ id: "revision-1", version: 0 }],
      configurationValues: [],
    });
    expect(Object.keys(payload)).toEqual([
      "schemaVersion",
      "exportedAt",
      ...externalKeys,
    ]);
    expect(STORAGE_COLLECTIONS).toHaveLength(externalKeys.length);
  });

  it("builds the documented season and export-date filename", () => {
    expect(
      buildJsonExportFilename(
        {
          seasons: [
            {
              id: "season-1",
              version: 1,
              name: "Saison 2026/27",
              startDate: "2026-08-01",
              endDate: "2027-07-31",
            },
          ],
        },
        "2026-08-09T14:00:00.000Z",
      ),
    ).toBe("sgrs-swimplan-2026-27-2026-08-09.json");
  });

  it("uses a stable aggregate label for multiple season ranges", () => {
    expect(
      buildJsonExportFilename(
        {
          seasons: [
            {
              id: "one",
              version: 1,
              startDate: "2025-08-01",
              endDate: "2026-07-31",
            },
            {
              id: "two",
              version: 1,
              startDate: "2026-08-01",
              endDate: "2027-07-31",
            },
          ],
        },
        "2026-08-09T14:00:00.000Z",
      ),
    ).toBe("sgrs-swimplan-gesamt-2026-08-09.json");
  });
});
