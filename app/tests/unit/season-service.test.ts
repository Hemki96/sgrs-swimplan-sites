import { beforeEach, describe, expect, it } from "vitest";

import { SeasonService } from "../../src/lib/domain/seasons";
import type { SeasonInput } from "../../src/lib/validation/domain";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

const input: SeasonInput = {
  name: "Saison 2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "Gemeinsame Planung",
  mainGoal: "Höhepunkt im Juli",
  status: "draft",
};

describe("SeasonService", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonService;

  beforeEach(() => {
    let revisionIndex = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revisionIndex}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    service = new SeasonService(storage, {
      createId: () => "season-id",
      now: () => "2026-08-09T11:00:00.000Z",
    });
  });

  it("creates and lists a validated season through the adapter", async () => {
    const created = await service.create(input);

    expect(created).toMatchObject({ ...input, id: "season-id", version: 1 });
    await expect(service.list()).resolves.toEqual([created]);
    await expect(storage.listRevisions(created.id)).resolves.toMatchObject([
      { operation: "create", entityType: "seasons", editorLabel: "public" },
    ]);
  });

  it("updates with optimistic concurrency and creates a revision", async () => {
    const created = await service.create(input);
    const updated = await service.update(created, {
      ...input,
      status: "active",
      mainGoal: "Aktualisiertes Ziel",
    });

    expect(updated).toMatchObject({
      version: 2,
      status: "active",
      mainGoal: "Aktualisiertes Ziel",
    });
    await expect(storage.listRevisions(created.id)).resolves.toMatchObject([
      { revisionNumber: 1, operation: "create" },
      { revisionNumber: 2, operation: "update" },
    ]);
  });

  it("soft deletes a season and keeps its revision history", async () => {
    const created = await service.create(input);
    await service.delete(created);

    await expect(service.list()).resolves.toEqual([]);
    await expect(
      storage.list("seasons", { includeDeleted: true }),
    ).resolves.toMatchObject([
      { id: created.id, version: 2, deletedAt: "2026-08-09T12:00:00.000Z" },
    ]);
    await expect(storage.listRevisions(created.id)).resolves.toMatchObject([
      { operation: "create" },
      { operation: "soft_delete" },
    ]);
  });

  it("rejects invalid ranges before writing to storage", async () => {
    await expect(
      service.create({ ...input, startDate: "2027-08-01" }),
    ).rejects.toThrow("Das Startdatum muss vor oder am Enddatum liegen.");
    await expect(storage.list("seasons")).resolves.toEqual([]);
  });
});
