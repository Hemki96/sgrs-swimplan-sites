import { beforeEach, describe, expect, it } from "vitest";

import { generateCycleSuggestions } from "../../src/lib/domain/cycleSuggestions";
import {
  PlanningValidationError,
  SeasonPlanningService,
} from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { Event, Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

function makeEvent(
  id: string,
  name: string,
  startDate: string,
  priority: Event["priority"] = "A",
): Event {
  return {
    id,
    seasonId: "season-1",
    trackId: "track-1",
    name,
    startDate,
    endDate: startDate,
    priority,
    category: "",
    location: "",
    goal: "",
    notes: "",
    version: 1,
  };
}

describe("CycleSuggestions Integration", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonPlanningService;
  let season: Season;

  beforeEach(async () => {
    let revisionIndex = 0;
    let entityIndex = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revisionIndex}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    season = await new SeasonService(storage, {
      createId: () => "season-1",
      now: () => "2026-08-09T11:00:00.000Z",
    }).create({
      name: "Saison 2026/27",
      startDate: "2026-08-17",
      endDate: "2027-07-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++entityIndex}`,
    });
  });

  it("generates and persists suggested cycles through the service layer", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });

    const aEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "NRW Kurzbahn",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });

    const events: Event[] = [
      {
        ...makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
        trackId: track.id,
      },
      {
        ...makeEvent("e2", "B-WK Oktober", "2026-10-18", "B"),
        trackId: track.id,
      },
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].mesocycles).toHaveLength(2);

    const macro = result.macros[0];
    const created = await service.createMacrocycle(season.id, {
      name: macro.name,
      startDate: macro.proposedStartDate,
      endDate: macro.proposedEndDate,
      goal: macro.reason,
      targetEventId: aEvent.id,
      notes: "",
    });

    expect(created).toMatchObject({
      name: macro.name,
      startDate: "2026-08-17",
      endDate: "2026-11-01",
      version: 1,
    });

    const meso1 = macro.mesocycles[0];
    const createdMeso1 = await service.createMesocycle({
      macrocycleId: created.id,
      name: meso1.name,
      startDate: meso1.proposedStartDate,
      endDate: meso1.proposedEndDate,
      goal: meso1.reason,
      notes: "",
    });

    expect(createdMeso1).toMatchObject({
      startDate: "2026-08-17",
      endDate: "2026-10-17",
    });

    const meso2 = macro.mesocycles[1];
    const createdMeso2 = await service.createMesocycle({
      macrocycleId: created.id,
      name: meso2.name,
      startDate: meso2.proposedStartDate,
      endDate: meso2.proposedEndDate,
      goal: meso2.reason,
      notes: "",
    });

    expect(createdMeso2).toMatchObject({
      startDate: "2026-10-18",
      endDate: "2026-11-01",
    });

    const firstMicro = meso1.microcycles[0];
    const createdMicro = await service.createMicrocycle({
      mesocycleId: createdMeso1.id,
      name: firstMicro.name,
      startDate: firstMicro.proposedStartDate,
      endDate: firstMicro.proposedEndDate,
      goal: "",
      targetRpe: 5,
    });

    expect(createdMicro).toMatchObject({
      name: "Micro 1.1.1",
      startDate: "2026-08-17",
      endDate: "2026-08-23",
    });

    const storedMacros = await service.listMacrocycles(season.id);
    const storedMesos = await service.listMesocycles(season.id);
    const storedMicros = await service.listMicrocycles(season.id);

    expect(storedMacros).toHaveLength(1);
    expect(storedMesos).toHaveLength(2);
    expect(storedMicros).toHaveLength(1);
  });

  it("does not modify existing cycles when generating suggestions", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });

    const targetEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "A-WK",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });

    const existingMacro = await service.createMacrocycle(season.id, {
      name: "Bestehendes Macro",
      startDate: "2026-08-17",
      endDate: "2026-11-01",
      goal: "Schon da",
      targetEventId: targetEvent.id,
      notes: "",
    });

    const events: Event[] = [
      {
        ...makeEvent("e1", "A-WK", "2026-11-01"),
        trackId: track.id,
      },
    ];

    const result = generateCycleSuggestions(season, events, {
      macrocycles: [existingMacro],
      mesocycles: [],
      microcycles: [],
    });

    expect(result.macros).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("bereits"))).toBe(true);

    const storedMacros = await service.listMacrocycles(season.id);
    expect(storedMacros).toHaveLength(1);
    expect(storedMacros[0].name).toBe("Bestehendes Macro");
  });

  it("accepts sibling mesocycles that follow suggested boundaries", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });

    const targetEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "A-WK",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });

    const existingMacro = await service.createMacrocycle(season.id, {
      name: "Bestehendes Macro",
      startDate: "2026-08-17",
      endDate: "2026-11-01",
      goal: "Schon da",
      targetEventId: targetEvent.id,
      notes: "",
    });

    const existingMeso = await service.createMesocycle({
      macrocycleId: existingMacro.id,
      name: "Bestehendes Meso",
      startDate: "2026-08-17",
      endDate: "2026-09-30",
      goal: "",
      notes: "",
    });

    const nextMeso = await service.createMesocycle({
      macrocycleId: existingMacro.id,
      name: "Folgendes Meso",
      startDate: "2026-10-01",
      endDate: "2026-11-01",
      goal: "",
      notes: "",
    });

    expect(nextMeso).toMatchObject({
      startDate: "2026-10-01",
      endDate: "2026-11-01",
    });

    const storedMesos = await service.listMesocycles(season.id);
    expect(storedMesos).toHaveLength(2);
    expect(storedMesos[0].id).toBe(existingMeso.id);
    expect(storedMesos[1].id).toBe(nextMeso.id);
  });

  it("rejects creating a mesocycle outside its macrocycle", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });

    const targetEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "A-WK",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });

    const macro = await service.createMacrocycle(season.id, {
      name: "Makro",
      startDate: "2026-09-01",
      endDate: "2026-11-01",
      goal: "",
      targetEventId: targetEvent.id,
      notes: "",
    });

    await expect(
      service.createMesocycle({
        macrocycleId: macro.id,
        name: "Ungültiges Meso",
        startDate: "2026-08-17",
        endDate: "2026-09-30",
        goal: "",
        notes: "",
      }),
    ).rejects.toBeInstanceOf(PlanningValidationError);
  });

  it("does not persist anything when the preview is cancelled (Test 10)", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });
    const aEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "NRW Kurzbahn",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });
    const bEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "B-WK Oktober",
      startDate: "2026-10-18",
      endDate: "2026-10-18",
      priority: "B",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });

    const result = generateCycleSuggestions(season, [aEvent, bEvent]);

    expect(result.macros.length).toBeGreaterThan(0);

    // Aborting the preview means: never calling create* through the service.
    const revisionsBefore = await storage.listRevisions(season.id);
    expect(revisionsBefore.length).toBeGreaterThan(0);

    const storedMacros = await service.listMacrocycles(season.id);
    const storedMesos = await service.listMesocycles(season.id);
    const storedMicros = await service.listMicrocycles(season.id);

    expect(storedMacros).toHaveLength(0);
    expect(storedMesos).toHaveLength(0);
    expect(storedMicros).toHaveLength(0);
  });
});
