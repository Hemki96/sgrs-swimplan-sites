import { beforeEach, describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("equipment planning", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonPlanningService;
  let seasonId: string;
  let id = 0;

  beforeEach(async () => {
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++id}`,
    });
    const season = await new SeasonService(storage, {
      createId: () => "season-1",
    }).create({
      name: "Saison 2026/27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    seasonId = season.id;
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++id}`,
    });
  });

  it("initializes exactly the nine requested equipment items", async () => {
    await service.initializeStandardEquipment(seasonId);
    await service.initializeStandardEquipment(seasonId);
    await expect(service.listEquipment(seasonId)).resolves.toMatchObject([
      { name: "Wettkampfanzug" },
      { name: "Kurzflossen" },
      { name: "Paddles" },
      { name: "Schnorchel" },
      { name: "Pullkick" },
      { name: "Brett" },
      { name: "Fallschirm" },
      { name: "Pulssensor" },
      { name: "Trinkflasche" },
    ]);
  });

  it("freely creates and edits catalog items with revisions", async () => {
    const item = await service.createEquipmentItem(seasonId, {
      name: "Monoflosse",
      code: "MONOFLOSSE",
      active: true,
      sortOrder: 3,
    });
    const updated = await service.updateEquipmentItem(item, {
      name: "Große Monoflosse",
      code: "MONOFLOSSE",
      active: false,
      sortOrder: 4,
    });
    expect(updated).toMatchObject({
      name: "Große Monoflosse",
      active: false,
      version: 2,
    });
    expect(await storage.listRevisions(seasonId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "equipment_items",
          operation: "create",
        }),
        expect.objectContaining({
          entityType: "equipment_items",
          operation: "update",
        }),
      ]),
    );
  });

  it.each(["required", "recommended", "optional"] as const)(
    "stores %s per session and protects the used item",
    async (level) => {
      const item = await service.createEquipmentItem(seasonId, {
        name: `Item ${level}`,
        code: `ITEM_${level.toUpperCase()}`,
        active: true,
        sortOrder: 0,
      });
      const day = await service.createTrainingDay(seasonId, {
        date: "2026-08-10",
        dayContext: "",
        notes: "",
      });
      const session = await storage.put(
        "training_sessions",
        {
          id: `session-${level}`,
          trainingDayId: day.id,
          keySession: false,
          version: 0,
        },
        { expectedVersion: 0, revision: { seasonId } },
      );
      await service.setSessionEquipment(seasonId, session.id, item.id, level);
      await expect(
        service.listSessionEquipment(session.id),
      ).resolves.toMatchObject([{ requirementLevel: level }]);
      await expect(service.deleteEquipmentItem(item)).rejects.toThrow(
        "Deaktiviere es stattdessen",
      );
      await service.setSessionEquipment(seasonId, session.id, item.id, null);
      await expect(service.listSessionEquipment(session.id)).resolves.toEqual(
        [],
      );
    },
  );
});
