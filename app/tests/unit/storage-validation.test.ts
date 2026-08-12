import { describe, expect, it } from "vitest";

import { seedDemoSeason } from "../../src/lib/domain/seedDemoSeason";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";
import {
  validateStorageEntity,
  validateStorageSnapshot,
} from "../../src/lib/validation/storage";

describe("persisted storage validation", () => {
  it("accepts every collection produced by the complete demo season", async () => {
    const storage = new InMemoryStorageAdapter();
    await seedDemoSeason(storage);
    const snapshot = await storage.exportAll();

    expect(validateStorageSnapshot(snapshot, { allowRevisions: true })).toEqual(
      [],
    );
  });

  it("rejects unknown fields and invalid value ranges", () => {
    const result = validateStorageEntity("training_sessions", {
      id: "session-1",
      version: 0,
      trainingDayId: "day-1",
      keySession: false,
      expectedRpe: 11,
      injected: true,
    });

    expect(result).toMatchObject({
      success: false,
      issue: { code: "INVALID_ENTITY", collection: "training_sessions" },
    });
  });

  it("rejects duplicate IDs, missing parents and cross-season references", () => {
    const baseSeason = {
      name: "Saison",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "",
      mainGoal: "",
      status: "draft",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      version: 0,
    };
    const issues = validateStorageSnapshot({
      seasons: [
        { ...baseSeason, id: "season-1" },
        { ...baseSeason, id: "season-2" },
      ],
      event_tracks: [
        {
          id: "shared-id",
          seasonId: "season-1",
          name: "WK",
          sortOrder: 0,
          visible: true,
          version: 0,
        },
        {
          id: "shared-id",
          seasonId: "season-1",
          name: "WK 2",
          sortOrder: 1,
          visible: true,
          version: 0,
        },
      ],
      events: [
        {
          id: "shared-id",
          seasonId: "season-2",
          trackId: "shared-id",
          name: "Wettkampf",
          startDate: "2026-09-01",
          endDate: "2026-09-01",
          priority: "A",
          version: 0,
        },
        {
          id: "missing-parent",
          seasonId: "season-1",
          trackId: "does-not-exist",
          name: "Wettkampf",
          startDate: "2026-09-01",
          endDate: "2026-09-01",
          priority: "A",
          version: 0,
        },
      ],
    });

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ID",
        "CROSS_SEASON_REFERENCE",
        "MISSING_REFERENCE",
      ]),
    );
  });

  it("rejects revision replay during import", () => {
    expect(
      validateStorageSnapshot({
        revisions: [
          {
            id: "revision-1",
            seasonId: "season-1",
            revisionNumber: 1,
            timestamp: "2026-08-01T00:00:00.000Z",
            operation: "create",
            entityType: "seasons",
            entityId: "season-1",
            beforeJson: null,
            afterJson: {},
          },
        ],
      }),
    ).toMatchObject([{ code: "REVISIONS_NOT_IMPORTABLE" }]);
  });

  it("rejects duplicate normalized season names including soft-deleted rows", () => {
    const base = {
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "",
      mainGoal: "",
      status: "draft",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      version: 1,
    } as const;

    expect(
      validateStorageSnapshot({
        seasons: [
          { ...base, id: "season-1", name: "Saison 2026/27" },
          {
            ...base,
            id: "season-2",
            name: " saison 2026/27 ",
            deletedAt: "2026-08-09T12:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject([
      {
        code: "DUPLICATE_SEASON_NAME",
        collection: "seasons",
        entityId: "season-2",
        path: "name",
      },
    ]);
  });
});
