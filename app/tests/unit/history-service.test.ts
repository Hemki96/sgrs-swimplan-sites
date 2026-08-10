import { beforeEach, describe, expect, it } from "vitest";
import type {
  Macrocycle,
  Season,
  TrainingSession,
} from "../../src/lib/domain/types";
import {
  HistoryService,
  RestoreConflictError,
} from "../../src/lib/domain/history";
import {
  InMemoryStorageAdapter,
  VersionConflictError,
} from "../../src/lib/storage/InMemoryStorageAdapter";
import type {
  PutOptions,
  StoredEntity,
} from "../../src/lib/storage/StorageAdapter";

function makeSeason(): Season {
  return {
    id: "season-1",
    name: "2026/27",
    startDate: "2026-08-01",
    endDate: "2027-07-31",
    description: "Gemeinsame Saisonplanung",
    mainGoal: "Saisonhöhepunkt",
    status: "draft",
    version: 0,
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
  };
}

class ConcurrentAdapter extends InMemoryStorageAdapter {
  raceOnce: (() => Promise<void>) | null = null;

  async put<T extends StoredEntity>(
    collection: Parameters<InMemoryStorageAdapter["put"]>[0],
    entity: T,
    options: PutOptions = {},
  ): Promise<T> {
    const race = this.raceOnce;
    if (race) {
      this.raceOnce = null;
      await race();
    }
    return super.put(collection, entity, options);
  }
}

describe("HistoryService", () => {
  let timestampIndex: number;
  let idIndex: number;
  let storage: InMemoryStorageAdapter;
  let history: HistoryService;

  beforeEach(() => {
    timestampIndex = 0;
    idIndex = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `id-${++idIndex}`,
      now: () => `2026-08-09T10:00:0${timestampIndex++}.000Z`,
    });
    history = new HistoryService(storage);
  });

  it("lists revisions newest first and scoped to the season", async () => {
    const created = await storage.put("seasons", makeSeason());
    await storage.put(
      "seasons",
      { ...created, name: "Saison 2026/27" },
      { expectedVersion: 1, revision: { seasonId: "season-1" } },
    );
    await storage.put("seasons", {
      ...makeSeason(),
      id: "season-2",
      name: "2027/28",
    });

    const revisions = await history.listRevisions("season-1");
    expect(revisions.map((revision) => revision.revisionNumber)).toEqual([
      2, 1,
    ]);
    expect(
      revisions.every((revision) => revision.seasonId === "season-1"),
    ).toBe(true);
  });

  it("filters the entity history by entity type and id", async () => {
    await storage.put("seasons", makeSeason());
    const macrocycle: Macrocycle = {
      id: "macro-1",
      seasonId: "season-1",
      name: "Grundlagenaufbau",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      goal: "Grundlage",
      notes: "",
      version: 0,
    };
    const created = await storage.put("macrocycles", macrocycle, {
      revision: { seasonId: "season-1" },
    });
    await storage.put(
      "macrocycles",
      { ...created, name: "Aufbauphase" },
      {
        expectedVersion: 1,
        revision: { seasonId: "season-1" },
      },
    );

    const entityHistory = await history.listEntityHistory(
      "season-1",
      "macrocycles",
      "macro-1",
    );
    expect(entityHistory).toHaveLength(2);
    expect(entityHistory.map((revision) => revision.operation)).toEqual([
      "update",
      "create",
    ]);
  });

  it("restores a soft-deleted entity from its delete revision", async () => {
    const created = await storage.put("seasons", makeSeason());
    await storage.softDelete("seasons", created.id, {
      expectedVersion: 1,
      revision: { seasonId: created.id },
    });

    await expect(storage.list("seasons")).resolves.toEqual([]);
    const deleteRevision = (await history.listRevisions("season-1")).find(
      (revision) => revision.operation === "soft_delete",
    );
    expect(deleteRevision).toBeDefined();
    await history.restoreRevision(deleteRevision!);

    const restored = await storage.get<Season>("seasons", created.id);
    expect(restored).toMatchObject({ name: "2026/27", version: 3 });
    expect(restored?.deletedAt).toBeNull();
    const revisions = await history.listRevisions("season-1");
    expect(revisions).toHaveLength(3);
  });

  it("restores the state recorded in an earlier revision", async () => {
    const created = await storage.put("seasons", makeSeason());
    await storage.put(
      "seasons",
      { ...created, name: "Zwischenstand" },
      { expectedVersion: 1, revision: { seasonId: created.id } },
    );

    const createRevision = (await history.listRevisions("season-1")).find(
      (revision) => revision.operation === "create",
    );
    await history.restoreRevision(createRevision!);

    const restored = await storage.get<Season>("seasons", created.id);
    expect(restored).toMatchObject({ name: "2026/27", version: 3 });
  });

  it("restores entities through the undo path without a revision", async () => {
    await storage.put("seasons", makeSeason());
    const session: TrainingSession = {
      id: "session-1",
      trainingDayId: "day-1",
      title: "Haupttraining",
      keySession: true,
      version: 0,
    };
    await storage.put("training_sessions", session, {
      revision: { seasonId: "season-1" },
    });
    await storage.softDelete("training_sessions", "session-1", {
      expectedVersion: 1,
      revision: { seasonId: "season-1" },
    });

    await history.restoreEntity("training_sessions", "session-1", "season-1");
    const restored = await storage.get<TrainingSession>(
      "training_sessions",
      "session-1",
    );
    expect(restored).toMatchObject({ title: "Haupttraining" });
    expect(restored?.deletedAt).toBeNull();
  });

  it("infers the season scope from the revision trail when needed", async () => {
    await storage.put("seasons", makeSeason());
    const session: TrainingSession = {
      id: "session-1",
      trainingDayId: "day-1",
      title: "Haupttraining",
      keySession: false,
      version: 0,
    };
    await storage.put("training_sessions", session, {
      revision: { seasonId: "season-1" },
    });
    await storage.softDelete("training_sessions", "session-1", {
      expectedVersion: 1,
      revision: { seasonId: "season-1" },
    });

    await history.restoreEntity("training_sessions", "session-1");
    const restored = await storage.get<TrainingSession>(
      "training_sessions",
      "session-1",
    );
    expect(restored).toMatchObject({ title: "Haupttraining" });
  });

  it("rejects restore when the target state is missing", async () => {
    await storage.put("seasons", makeSeason());
    const revision = {
      id: "revision-x",
      seasonId: "season-1",
      revisionNumber: 2,
      timestamp: "2026-08-09T10:00:01.000Z",
      operation: "soft_delete",
      entityType: "seasons",
      entityId: "season-1",
      beforeJson: null,
      afterJson: null,
    };

    await expect(history.restoreRevision(revision)).rejects.toBeInstanceOf(
      RestoreConflictError,
    );
  });

  it("never silently overwrites a concurrently changed entity", async () => {
    const adapter = new ConcurrentAdapter({
      createId: () => `id-${++idIndex}`,
      now: () => `2026-08-09T10:00:0${timestampIndex++}.000Z`,
    });
    const concurrentHistory = new HistoryService(adapter);
    const created = await adapter.put("seasons", makeSeason());
    await adapter.softDelete("seasons", created.id, {
      expectedVersion: 1,
      revision: { seasonId: created.id },
    });
    const deleteRevision = (
      await concurrentHistory.listRevisions("season-1")
    ).find((revision) => revision.operation === "soft_delete");
    expect(deleteRevision).toBeDefined();

    adapter.raceOnce = async () => {
      const current = (
        await adapter.list<Season>("seasons", { includeDeleted: true })
      )[0];
      await adapter.put(
        "seasons",
        { ...current, deletedAt: null, name: "Parallel geändert" },
        { expectedVersion: current.version },
      );
    };

    await expect(
      concurrentHistory.restoreRevision(deleteRevision!),
    ).rejects.toBeInstanceOf(VersionConflictError);
    const restored = await adapter.get<Season>("seasons", created.id);
    expect(restored).toMatchObject({
      name: "Parallel geändert",
      version: 3,
    });
  });
});
