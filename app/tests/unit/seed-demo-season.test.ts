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
    expect(await storage.listRevisions(DEMO_SEASON_ID)).toHaveLength(30);
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
      ["Starts", "TECHNICAL"],
      ["Turns", "TECHNICAL"],
      ["Underwater", "TECHNICAL"],
      ["Stroke Efficiency", "TECHNICAL"],
    ]);
  });

  it("survives an isolated snapshot reload without adding plan content", async () => {
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
    ).resolves.toHaveLength(14);
    await expect(
      reloaded.list<EquipmentItem>("equipment_items"),
    ).resolves.toHaveLength(9);
    await expect(reloaded.list("events")).resolves.toEqual([]);
    await expect(reloaded.list("macrocycles")).resolves.toEqual([]);
    await expect(reloaded.list("training_sessions")).resolves.toEqual([]);
    await expect(reloaded.listRevisions(DEMO_SEASON_ID)).resolves.toHaveLength(
      30,
    );
  });
});
