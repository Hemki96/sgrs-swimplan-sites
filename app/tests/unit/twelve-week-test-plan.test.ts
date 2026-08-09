import { describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { FocusSegment, Microcycle } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";
import { createTwelveWeekTestPlan } from "../fixtures/createTwelveWeekTestPlan";

describe("twelve-week periodization test plan", () => {
  it("covers hierarchy, parallel focuses, persistence, reload, editing and soft delete", async () => {
    let id = 0;
    const storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++id}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    const season = await new SeasonService(storage, {
      createId: () => "test-season",
      now: () => "2026-08-09T11:00:00.000Z",
    }).create({
      name: "12-Wochen-Testplanung",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Fachlicher Integrationstest",
      mainGoal: "Periodisierung prüfen",
      status: "active",
    });
    const plan = await createTwelveWeekTestPlan(
      storage,
      season,
      () => `entity-${++id}`,
    );

    expect(plan.macrocycles).toHaveLength(2);
    expect(plan.mesocycles).toHaveLength(4);
    expect(plan.microcycles).toHaveLength(12);
    expect(
      new Set(plan.microcycles.map((item) => item.targetRpe)).size,
    ).toBeGreaterThan(3);
    expect(plan.dimensions.map((item) => item.name)).toEqual([
      "Strength",
      "Aerobic",
      "Anaerobic",
      "Speed",
      "Tactical",
      "Technical",
    ]);
    expect(plan.focusSegments).toHaveLength(6);
    expect(
      plan.focusSegments.every((left, index) =>
        plan.focusSegments.some(
          (right, otherIndex) =>
            index !== otherIndex &&
            left.dimensionId !== right.dimensionId &&
            left.startDate <= right.endDate &&
            right.startDate <= left.endDate,
        ),
      ),
    ).toBe(true);

    const reloadedStorage = new InMemoryStorageAdapter();
    await reloadedStorage.hydrate(await storage.exportAll());
    const reloadedService = new SeasonPlanningService(reloadedStorage);
    await expect(
      reloadedService.listMacrocycles(season.id),
    ).resolves.toHaveLength(2);
    await expect(
      reloadedService.listMesocycles(season.id),
    ).resolves.toHaveLength(4);
    await expect(
      reloadedService.listMicrocycles(season.id),
    ).resolves.toHaveLength(12);

    const edited = await reloadedService.updateMicrocycle(plan.microcycles[0], {
      mesocycleId: plan.microcycles[0].mesocycleId,
      name: "Testwoche 1 – bearbeitet",
      startDate: plan.microcycles[0].startDate,
      endDate: plan.microcycles[0].endDate,
      targetRpe: 5,
      targetVolumeMeters: 19_000,
      goal: "Bearbeitung und Speicherung prüfen",
    });
    expect(edited).toMatchObject({ version: 2, targetRpe: 5 });

    const deleted = plan.focusSegments[0];
    await reloadedService.deleteFocusSegment(deleted);
    await expect(
      reloadedService.listFocusSegments(season.id),
    ).resolves.toHaveLength(5);
    await expect(
      reloadedStorage.list<FocusSegment>("focus_segments", {
        includeDeleted: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: deleted.id,
          version: 2,
          deletedAt: expect.any(String),
        }),
      ]),
    );
    expect(
      (await reloadedStorage.listRevisions(season.id)).map(
        (item) => item.operation,
      ),
    ).toEqual(expect.arrayContaining(["create", "update", "soft_delete"]));
  });

  it("rejects parent edits that would break the existing temporal hierarchy", async () => {
    let id = 0;
    const storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++id}`,
    });
    const season = await new SeasonService(storage, {
      createId: () => "test-season",
    }).create({
      name: "12-Wochen-Testplanung",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Fachlicher Integrationstest",
      mainGoal: "Periodisierung prüfen",
      status: "active",
    });
    const plan = await createTwelveWeekTestPlan(
      storage,
      season,
      () => `entity-${++id}`,
    );
    const service = new SeasonPlanningService(storage);

    await expect(
      service.updateMacrocycle(plan.macrocycles[0], {
        name: plan.macrocycles[0].name,
        startDate: "2026-08-10",
        endDate: plan.macrocycles[0].endDate,
        goal: plan.macrocycles[0].goal,
        notes: plan.macrocycles[0].notes,
      }),
    ).rejects.toThrow("vorhandene Mesozyklen außerhalb");

    await expect(
      service.updateMesocycle(plan.mesocycles[0], {
        macrocycleId: plan.mesocycles[0].macrocycleId,
        name: plan.mesocycles[0].name,
        startDate: "2026-08-10",
        endDate: plan.mesocycles[0].endDate,
        goal: plan.mesocycles[0].goal,
        notes: plan.mesocycles[0].notes,
      }),
    ).rejects.toThrow("vorhandene Mikrozyklen außerhalb");

    expect(await storage.list<Microcycle>("microcycles")).toHaveLength(12);
  });
});
