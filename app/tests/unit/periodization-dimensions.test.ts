import { beforeEach, describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("periodization dimensions and focus segments", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonPlanningService;
  let season: Season;

  beforeEach(async () => {
    let id = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++id}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    season = await new SeasonService(storage, {
      createId: () => "season-1",
      now: () => "2026-08-09T11:00:00.000Z",
    }).create({
      name: "Saison 2026/27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++id}`,
    });
  });

  it("initializes the editable standard dimensions and example focuses once", async () => {
    await service.initializeStandardPeriodization(season.id);
    await service.initializeStandardPeriodization(season.id);

    const dimensions = await service.listDimensions(season.id);
    expect(dimensions.map((item) => item.name)).toEqual([
      "Strength",
      "Aerobic",
      "Anaerobic",
      "Speed",
      "Tactical",
      "Technical",
    ]);
    const focuses = await service.listFocusDefinitions(season.id);
    expect(focuses.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "Aerobic Base",
        "Aerobic Capacity",
        "Aerobic Power",
        "Anaerobic Capacity",
        "Anaerobic Power",
        "Lactate Production",
        "Lactate Tolerance",
        "Starts",
        "Turns",
        "Underwater",
        "Stroke Efficiency",
      ]),
    );
    expect(focuses).toHaveLength(11);
  });

  it("creates overlapping focus segments in parallel dimensions", async () => {
    await service.initializeStandardPeriodization(season.id);
    const dimensions = await service.listDimensions(season.id);
    const definitions = await service.listFocusDefinitions(season.id);
    const aerobic = dimensions.find((item) => item.code === "AEROBIC")!;
    const technical = dimensions.find((item) => item.code === "TECHNICAL")!;
    const aerobicBase = definitions.find(
      (item) => item.code === "AEROBIC_BASE",
    )!;
    const starts = definitions.find((item) => item.code === "STARTS")!;

    await service.createFocusSegment(season.id, {
      dimensionId: aerobic.id,
      focusDefinitionId: aerobicBase.id,
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      notes: "Grundlage",
    });
    await service.createFocusSegment(season.id, {
      dimensionId: technical.id,
      focusDefinitionId: starts.id,
      startDate: "2026-09-15",
      endDate: "2026-11-15",
      notes: "Startblock",
    });

    await expect(service.listFocusSegments(season.id)).resolves.toHaveLength(2);
  });

  it("validates focus ownership and season dates", async () => {
    await service.initializeStandardPeriodization(season.id);
    const dimensions = await service.listDimensions(season.id);
    const definitions = await service.listFocusDefinitions(season.id);
    const aerobic = dimensions.find((item) => item.code === "AEROBIC")!;
    const starts = definitions.find((item) => item.code === "STARTS")!;
    const input = {
      dimensionId: aerobic.id,
      focusDefinitionId: starts.id,
      startDate: "2026-09-01",
      endDate: "2026-10-01",
      notes: "",
    };

    await expect(service.createFocusSegment(season.id, input)).rejects.toThrow(
      "Der Fokus gehört nicht zur gewählten aktiven Dimension.",
    );
    await expect(
      service.createFocusSegment(season.id, {
        ...input,
        focusDefinitionId: definitions.find(
          (item) => item.code === "AEROBIC_BASE",
        )!.id,
        startDate: "2026-07-31",
      }),
    ).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb der Saison liegen.",
    );
  });

  it("updates and soft deletes freely created dimensions with revisions", async () => {
    const created = await service.createDimension(season.id, {
      name: "Mobility",
      code: "MOBILITY",
      description: "Beweglichkeit",
      sortOrder: 6,
      active: true,
    });
    const updated = await service.updateDimension(created, {
      name: "Mobility & Stability",
      code: "MOBILITY",
      description: "Beweglichkeit und Stabilität",
      sortOrder: 7,
      active: false,
    });
    await service.deleteDimension(updated);

    await expect(service.listDimensions(season.id)).resolves.toEqual([]);
    await expect(storage.listRevisions(season.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          entityType: "periodization_dimensions",
        }),
        expect.objectContaining({
          operation: "update",
          entityType: "periodization_dimensions",
        }),
        expect.objectContaining({
          operation: "soft_delete",
          entityType: "periodization_dimensions",
        }),
      ]),
    );
  });
});
