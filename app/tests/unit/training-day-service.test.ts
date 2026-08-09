import { beforeEach, describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import type { Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

const season: Season = {
  id: "season-1",
  name: "Saison 2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "Gemeinsame Planung",
  mainGoal: "Saisonhöhepunkt",
  status: "active",
  version: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("TrainingDay", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonPlanningService;

  beforeEach(async () => {
    let revision = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revision}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    await storage.hydrate({ seasons: [season] });
    service = new SeasonPlanningService(storage, {
      createId: () => "training-day-1",
    });
  });

  it("creates, lists and updates a day with a revision per mutation", async () => {
    const created = await service.createTrainingDay(season.id, {
      date: "2026-08-10",
      dayContext: "  Recovery  ",
      notes: "  Easy day  ",
    });
    const updated = await service.updateTrainingDay(created, {
      date: "2026-08-11",
      dayContext: "Race Pace Day",
      notes: "Main preparation day",
    });

    expect(updated).toMatchObject({
      version: 2,
      date: "2026-08-11",
      dayContext: "Race Pace Day",
      notes: "Main preparation day",
    });
    await expect(service.listTrainingDays(season.id)).resolves.toEqual([
      updated,
    ]);
    await expect(storage.listRevisions(season.id)).resolves.toMatchObject([
      { operation: "create", entityType: "training_days" },
      { operation: "update", entityType: "training_days" },
    ]);
  });

  it.each(["2026-07-31", "2027-08-01"])(
    "rejects a day outside the season (%s)",
    async (date) => {
      await expect(
        service.createTrainingDay(season.id, {
          date,
          dayContext: "Travel",
          notes: "",
        }),
      ).rejects.toThrow("vollständig innerhalb der Saison");
      await expect(service.listTrainingDays(season.id)).resolves.toEqual([]);
    },
  );

  it("soft deletes a day and records the deletion", async () => {
    const created = await service.createTrainingDay(season.id, {
      date: season.startDate,
      dayContext: "Test Day",
      notes: "Season opener",
    });

    await service.deleteTrainingDay(created);

    await expect(service.listTrainingDays(season.id)).resolves.toEqual([]);
    await expect(
      storage.list("training_days", { includeDeleted: true }),
    ).resolves.toMatchObject([
      { id: created.id, version: 2, deletedAt: "2026-08-09T12:00:00.000Z" },
    ]);
    await expect(storage.listRevisions(season.id)).resolves.toMatchObject([
      { operation: "create" },
      { operation: "soft_delete" },
    ]);
  });
});
