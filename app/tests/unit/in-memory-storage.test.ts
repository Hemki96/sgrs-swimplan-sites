import { beforeEach, describe, expect, it } from "vitest";
import type { Mesocycle, Season } from "../../src/lib/domain/types";
import {
  InMemoryStorageAdapter,
  VersionConflictError,
} from "../../src/lib/storage/InMemoryStorageAdapter";

const season: Season = {
  id: "season-1",
  name: "2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  status: "draft",
  version: 0,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

describe("InMemoryStorageAdapter", () => {
  let timestampIndex: number;
  let revisionIndex: number;
  let storage: InMemoryStorageAdapter;

  beforeEach(() => {
    timestampIndex = 0;
    revisionIndex = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revisionIndex}`,
      now: () => `2026-08-09T10:00:0${timestampIndex++}.000Z`,
    });
  });

  it("creates and updates copies with increasing versions and revisions", async () => {
    const created = await storage.put("seasons", season);
    const updated = await storage.put(
      "seasons",
      { ...created, name: "Season 2026/27" },
      { expectedVersion: 1, revision: { seasonId: season.id } },
    );

    created.name = "mutated outside storage";
    expect(updated.version).toBe(2);
    expect(updated.updatedAt).toBe("2026-08-09T10:00:01.000Z");
    await expect(
      storage.get<Season>("seasons", season.id),
    ).resolves.toMatchObject({ name: "Season 2026/27", version: 2 });

    const revisions = await storage.listRevisions(season.id);
    expect(
      revisions.map(({ revisionNumber, operation }) => [
        revisionNumber,
        operation,
      ]),
    ).toEqual([
      [1, "create"],
      [2, "update"],
    ]);
    expect(revisions[1].beforeJson).toMatchObject({
      name: "2026/27",
      version: 1,
    });
    expect(revisions[1].afterJson).toMatchObject({
      name: "Season 2026/27",
      version: 2,
    });
  });

  it("rejects stale or unguarded updates without changing data or history", async () => {
    await storage.put("seasons", season);

    await expect(
      storage.put("seasons", { ...season, name: "stale" }),
    ).rejects.toBeInstanceOf(VersionConflictError);
    await expect(
      storage.put(
        "seasons",
        { ...season, name: "also stale" },
        { expectedVersion: 7 },
      ),
    ).rejects.toMatchObject({ expectedVersion: 7, actualVersion: 1 });

    await expect(
      storage.get<Season>("seasons", season.id),
    ).resolves.toMatchObject({ name: "2026/27", version: 1 });
    await expect(storage.listRevisions(season.id)).resolves.toHaveLength(1);
  });

  it("soft deletes with a version guard and hides deleted entities by default", async () => {
    const created = await storage.put("seasons", season);
    await storage.softDelete("seasons", created.id, { expectedVersion: 1 });

    await expect(storage.list<Season>("seasons")).resolves.toEqual([]);
    const includingDeleted = await storage.list<Season>("seasons", {
      includeDeleted: true,
    });
    expect(includingDeleted[0]).toMatchObject({ version: 2 });
    expect(includingDeleted[0].deletedAt).toBe("2026-08-09T10:00:01.000Z");
    await expect(storage.listRevisions(season.id)).resolves.toMatchObject([
      { revisionNumber: 1, operation: "create" },
      { revisionNumber: 2, operation: "soft_delete" },
    ]);
  });

  it("requires season context for nested entities", async () => {
    const mesocycle: Mesocycle = {
      id: "meso-1",
      macrocycleId: "macro-1",
      name: "Base",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      version: 0,
    };

    await expect(storage.put("mesocycles", mesocycle)).rejects.toThrow(
      "Revision context with seasonId required for mesocycles",
    );
    const stored = await storage.put("mesocycles", mesocycle, {
      revision: { seasonId: season.id, editorLabel: "public" },
    });

    expect(stored.version).toBe(1);
    await expect(storage.listRevisions(season.id)).resolves.toMatchObject([
      { entityType: "mesocycles", editorLabel: "public" },
    ]);
  });

  it("hydrates a new adapter from an isolated snapshot", async () => {
    await storage.put("seasons", season);
    const snapshot = await storage.exportAll();
    const reloaded = new InMemoryStorageAdapter();
    await reloaded.hydrate(snapshot);

    const rows = snapshot.seasons as Season[];
    rows[0].name = "changed snapshot";
    await expect(
      reloaded.get<Season>("seasons", season.id),
    ).resolves.toMatchObject({ name: "2026/27", version: 1 });
    await expect(reloaded.listRevisions(season.id)).resolves.toHaveLength(1);
  });
});
