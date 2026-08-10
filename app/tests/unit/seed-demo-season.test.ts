import { describe, expect, it } from "vitest";
import type {
  EquipmentItem,
  FocusDefinition,
  PeriodizationDimension,
  Season,
} from "../../src/lib/domain/types";
import {
  DEMO_SEASON_ID,
  seedDemoSeason,
} from "../../src/lib/domain/seedDemoSeason";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("seedDemoSeason", () => {
  it("loads the documented 2026/27 master data through the storage adapter", async () => {
    let revisionIndex = 0;
    const storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revisionIndex}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });

    const result = await seedDemoSeason(storage, {
      timestamp: "2026-08-09T12:00:00.000Z",
    });

    expect(result.season).toMatchObject({
      id: DEMO_SEASON_ID,
      name: "Saison 2026/27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      version: 1,
    });
    expect(result.dimensions.map(({ name }) => name)).toEqual([
      "Strength",
      "Aerobic",
      "Anaerobic",
      "Speed",
      "Tactical",
      "Technical",
    ]);
    expect(result.focusDefinitions.map(({ name }) => name)).toEqual([
      "Functional Strength",
      "Aerobic Base",
      "Aerobic Capacity",
      "Aerobic Power",
      "Recovery",
      "Anaerobic Capacity",
      "Anaerobic Power",
      "Lactate Production",
      "Lactate Tolerance",
      "Race Pace",
      "Sprint",
      "Race Strategy",
      "Starts",
      "Turns",
      "Underwater",
      "Stroke Efficiency",
    ]);
    expect(result.equipmentItems.map(({ name }) => name)).toEqual([
      "Wettkampfanzug",
      "Kurzflossen",
      "Paddles",
      "Schnorchel",
      "Pullkick",
      "Brett",
      "Fallschirm",
      "Pulssensor",
      "Trinkflasche",
    ]);
    expect(result.eventTracks).toHaveLength(2);
    expect(result.events).toHaveLength(3);
    expect(result.calendarConstraints).toHaveLength(2);
    expect(result.macrocycles).toHaveLength(2);
    expect(result.mesocycles).toHaveLength(4);
    expect(result.microcycles).toHaveLength(12);
    expect(result.microcycleSegments).toHaveLength(12);
    expect(result.focusSegments).toHaveLength(6);
    expect(result.trainingDays).toHaveLength(4);
    expect(result.trainingSessions).toHaveLength(5);
    expect(result.sessionEquipment).toHaveLength(3);
    expect(await storage.listRevisions(DEMO_SEASON_ID)).toHaveLength(87);
    expect(
      (await storage.listRevisions(DEMO_SEASON_ID)).every(
        (revision) => revision.operation === "create",
      ),
    ).toBe(true);
  });

  it("keeps focus definitions in their documented parallel dimensions", async () => {
    const storage = new InMemoryStorageAdapter();
    const { dimensions, focusDefinitions } = await seedDemoSeason(storage);
    const dimensionById = new Map(
      dimensions.map((dimension) => [dimension.id, dimension.code]),
    );

    expect(
      focusDefinitions.map((focus) => [
        focus.name,
        dimensionById.get(focus.dimensionId),
      ]),
    ).toEqual([
      ["Functional Strength", "STRENGTH"],
      ["Aerobic Base", "AEROBIC"],
      ["Aerobic Capacity", "AEROBIC"],
      ["Aerobic Power", "AEROBIC"],
      ["Recovery", "AEROBIC"],
      ["Anaerobic Capacity", "ANAEROBIC"],
      ["Anaerobic Power", "ANAEROBIC"],
      ["Lactate Production", "ANAEROBIC"],
      ["Lactate Tolerance", "ANAEROBIC"],
      ["Race Pace", "SPEED"],
      ["Sprint", "SPEED"],
      ["Race Strategy", "TACTICAL"],
      ["Starts", "TECHNICAL"],
      ["Turns", "TECHNICAL"],
      ["Underwater", "TECHNICAL"],
      ["Stroke Efficiency", "TECHNICAL"],
    ]);
  });

  it("survives an isolated snapshot reload with the complete demo plan", async () => {
    const storage = new InMemoryStorageAdapter();
    await seedDemoSeason(storage);
    const reloaded = new InMemoryStorageAdapter();
    await reloaded.hydrate(await storage.exportAll());

    await expect(reloaded.list<Season>("seasons")).resolves.toHaveLength(1);
    await expect(
      reloaded.list<PeriodizationDimension>("periodization_dimensions"),
    ).resolves.toHaveLength(6);
    await expect(
      reloaded.list<FocusDefinition>("focus_definitions"),
    ).resolves.toHaveLength(16);
    await expect(
      reloaded.list<EquipmentItem>("equipment_items"),
    ).resolves.toHaveLength(9);
    await expect(reloaded.list("events")).resolves.toHaveLength(3);
    await expect(reloaded.list("macrocycles")).resolves.toHaveLength(2);
    await expect(reloaded.list("mesocycles")).resolves.toHaveLength(4);
    await expect(reloaded.list("microcycles")).resolves.toHaveLength(12);
    await expect(reloaded.list("focus_segments")).resolves.toHaveLength(6);
    await expect(reloaded.list("training_days")).resolves.toHaveLength(4);
    await expect(reloaded.list("training_sessions")).resolves.toHaveLength(5);
    await expect(reloaded.listRevisions(DEMO_SEASON_ID)).resolves.toHaveLength(
      87,
    );
  });
});
