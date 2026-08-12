import { beforeEach, describe, expect, it } from "vitest";

import {
  PlanningValidationError,
  SeasonPlanningService,
} from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("SeasonPlanningService", () => {
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
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++entityIndex}`,
    });
  });

  it("creates, updates and soft deletes event tracks with revisions", async () => {
    const created = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 1,
      visible: true,
    });
    const updated = await service.updateTrack(created, {
      name: "WK Männer",
      sortOrder: 2,
      visible: false,
    });
    await service.deleteTrack(updated);

    await expect(service.listTracks(season.id)).resolves.toEqual([]);
    await expect(storage.listRevisions(season.id)).resolves.toMatchObject([
      { operation: "create", entityType: "seasons" },
      { operation: "create", entityType: "event_tracks" },
      { operation: "update", entityType: "event_tracks" },
      { operation: "soft_delete", entityType: "event_tracks" },
    ]);
  });

  it("manages competitions and prevents deleting a used track", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });
    const created = await service.createEvent(season.id, {
      trackId: track.id,
      name: "Landesmeisterschaft",
      startDate: "2027-07-10",
      endDate: "2027-07-11",
      priority: "A",
      category: "Langbahn",
      location: "Berlin",
      goal: "Finale",
      notes: "",
    });
    const updated = await service.updateEvent(created, {
      trackId: track.id,
      name: "Deutsche Meisterschaft",
      startDate: "2027-07-10",
      endDate: "2027-07-12",
      priority: "A",
      category: "Langbahn",
      location: "Berlin",
      goal: "Finale",
      notes: "Qualifikation erforderlich",
    });

    await expect(service.deleteTrack(track)).rejects.toBeInstanceOf(
      PlanningValidationError,
    );
    await service.deleteEvent(updated);
    await service.deleteTrack(track);
    await expect(service.listEvents(season.id)).resolves.toEqual([]);
    await expect(service.listTracks(season.id)).resolves.toEqual([]);
  });

  it("rejects competitions outside the season or on a foreign track", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });
    const baseEvent = {
      trackId: track.id,
      name: "Testwettkampf",
      startDate: "2027-08-01",
      endDate: "2027-08-02",
      priority: "test" as const,
      category: "Test",
      location: "",
      goal: "",
      notes: "",
    };

    await expect(service.createEvent(season.id, baseEvent)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb der Saison liegen.",
    );
    await expect(
      service.createEvent(season.id, {
        ...baseEvent,
        trackId: "foreign-track",
      }),
    ).rejects.toThrow("Die Eventspur gehört nicht zu dieser Saison.");
  });

  it("creates, updates and soft deletes holidays and restrictions", async () => {
    const created = await service.createConstraint(season.id, {
      type: "Ferien",
      name: "Weihnachtsferien",
      startDate: "2026-12-23",
      endDate: "2027-01-06",
      notes: "Kein reguläres Training",
      severity: "Hoch",
    });
    const updated = await service.updateConstraint(created, {
      type: "Ferien",
      name: "Winterferien",
      startDate: "2026-12-23",
      endDate: "2027-01-06",
      notes: "Reduzierter Betrieb",
      severity: "Mittel",
    });

    expect(updated).toMatchObject({ version: 2, name: "Winterferien" });
    await service.deleteConstraint(updated);
    await expect(service.listConstraints(season.id)).resolves.toEqual([]);
  });

  it("rejects invalid and out-of-season restriction ranges before writing", async () => {
    const input = {
      type: "Sperre",
      name: "Badschließung",
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      notes: "",
      severity: "Hoch",
    };
    await expect(service.createConstraint(season.id, input)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb der Saison liegen.",
    );
    await expect(
      service.createConstraint(season.id, {
        ...input,
        startDate: "2026-09-02",
        endDate: "2026-09-01",
      }),
    ).rejects.toThrow("Das Startdatum muss vor oder am Enddatum liegen.");
  });

  it("creates, updates and soft deletes macrocycles with revisions", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });
    const targetEvent = await service.createEvent(season.id, {
      trackId: track.id,
      name: "Meisterschaft",
      startDate: "2027-07-10",
      endDate: "2027-07-11",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });
    const created = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      goal: "Grundlage entwickeln",
      targetEventId: targetEvent.id,
      notes: "Progressiv steigern",
    });
    const updated = await service.updateMacrocycle(created, {
      name: "Grundlagenaufbau",
      startDate: "2026-08-15",
      endDate: "2027-02-28",
      goal: "Grundlage stabilisieren",
      notes: "Entlastungswochen berücksichtigen",
    });

    expect(updated).toMatchObject({
      version: 2,
      name: "Grundlagenaufbau",
      targetEventId: undefined,
    });
    await service.deleteMacrocycle(updated);
    await expect(service.listMacrocycles(season.id)).resolves.toEqual([]);
    await expect(storage.listRevisions(season.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          entityType: "macrocycles",
        }),
        expect.objectContaining({
          operation: "update",
          entityType: "macrocycles",
        }),
        expect.objectContaining({
          operation: "soft_delete",
          entityType: "macrocycles",
        }),
      ]),
    );
  });

  it("rejects macrocycles outside the season and foreign target events", async () => {
    const input = {
      name: "Aufbau",
      startDate: "2026-07-31",
      endDate: "2026-10-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    };
    await expect(service.createMacrocycle(season.id, input)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb der Saison liegen.",
    );
    await expect(
      service.createMacrocycle(season.id, {
        ...input,
        startDate: "2026-08-01",
        targetEventId: "foreign-event",
      }),
    ).rejects.toThrow("Der Zielwettkampf gehört nicht zu dieser Saison.");
  });

  it("creates, updates and soft deletes mesocycles with revisions", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const created = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    });
    const updated = await service.updateMesocycle(created, {
      macrocycleId: macrocycle.id,
      name: "Aerobe Grundlage",
      startDate: "2026-08-15",
      endDate: "2026-10-15",
      goal: "Ausdauer stabilisieren",
      notes: "Entlastung einplanen",
    });

    expect(updated).toMatchObject({ version: 2, name: "Aerobe Grundlage" });
    await expect(service.deleteMacrocycle(macrocycle)).rejects.toThrow(
      "Ein Makrozyklus mit Mesozyklen kann nicht gelöscht werden.",
    );
    await service.deleteMesocycle(updated);
    await service.deleteMacrocycle(macrocycle);
    await expect(service.listMesocycles(season.id)).resolves.toEqual([]);
    await expect(storage.listRevisions(season.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          entityType: "mesocycles",
        }),
        expect.objectContaining({
          operation: "update",
          entityType: "mesocycles",
        }),
        expect.objectContaining({
          operation: "soft_delete",
          entityType: "mesocycles",
        }),
      ]),
    );
  });

  it("rejects a mesocycle outside its macrocycle", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-09-01",
      endDate: "2026-12-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const input = {
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-31",
      endDate: "2026-10-31",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    };

    await expect(service.createMesocycle(input)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb des Makrozyklus liegen.",
    );
    await expect(
      service.createMesocycle({ ...input, macrocycleId: "missing-macrocycle" }),
    ).rejects.toThrow("Makrozyklus wurde nicht gefunden.");
  });

  it("creates, updates and soft deletes microcycles with revisions", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    });
    const created = await service.createMicrocycle({
      mesocycleId: mesocycle.id,
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      goal: "Ruhiger Einstieg",
      targetRpe: 4,
      targetVolumeMeters: 18_000,
    });
    const updated = await service.updateMicrocycle(created, {
      mesocycleId: mesocycle.id,
      name: "KW 33",
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      goal: "Belastung steigern",
      targetRpe: 6,
    });

    expect(updated).toMatchObject({
      version: 2,
      name: "KW 33",
      targetRpe: 6,
      targetVolumeMeters: undefined,
    });
    await expect(service.deleteMesocycle(mesocycle)).rejects.toThrow(
      "Ein Mesozyklus mit Mikrozyklen kann nicht gelöscht werden.",
    );
    await service.deleteMicrocycle(updated);
    await service.deleteMesocycle(mesocycle);
    await expect(service.listMicrocycles(season.id)).resolves.toEqual([]);
    await expect(storage.listRevisions(season.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          entityType: "microcycles",
        }),
        expect.objectContaining({
          operation: "update",
          entityType: "microcycles",
        }),
        expect.objectContaining({
          operation: "soft_delete",
          entityType: "microcycles",
        }),
      ]),
    );
  });

  it("validates microcycle range, target RPE and target volume", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    });
    const input = {
      mesocycleId: mesocycle.id,
      name: "KW 36",
      startDate: "2026-08-31",
      endDate: "2026-09-06",
      goal: "Einstieg",
      targetRpe: 5,
    };

    await expect(service.createMicrocycle(input)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb des Mesozyklus liegen.",
    );
    await expect(
      service.createMicrocycle({
        ...input,
        startDate: "2026-09-01",
        targetRpe: 11,
      }),
    ).rejects.toThrow("Target RPE muss zwischen 1 und 10 liegen.");
    await expect(
      service.createMicrocycle({
        ...input,
        startDate: "2026-09-01",
        targetVolumeMeters: -1,
      }),
    ).rejects.toThrow("Zielumfang muss mindestens 0 Meter sein.");
    await expect(
      service.createMicrocycle({ ...input, mesocycleId: "missing-mesocycle" }),
    ).rejects.toThrow("Mesozyklus wurde nicht gefunden.");
  });

  it("creates, orders, updates and soft deletes microcycle segments", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    });
    const microcycle = await service.createMicrocycle({
      mesocycleId: mesocycle.id,
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      goal: "Ruhiger Einstieg",
      targetRpe: 4,
    });
    const second = await service.createMicrocycleSegment({
      microcycleId: microcycle.id,
      name: "Zweite Wochenhälfte",
      startDate: "2026-08-07",
      endDate: "2026-08-09",
      segmentType: "Wochenhälfte",
      sortOrder: 2,
    });
    const first = await service.createMicrocycleSegment({
      microcycleId: microcycle.id,
      name: "Erste Wochenhälfte",
      startDate: "2026-08-03",
      endDate: "2026-08-06",
      segmentType: "Wochenhälfte",
      sortOrder: 1,
    });

    await expect(
      service.listMicrocycleSegments(season.id),
    ).resolves.toMatchObject([
      { id: first.id, sortOrder: 1 },
      { id: second.id, sortOrder: 2 },
    ]);
    const updated = await service.updateMicrocycleSegment(first, {
      microcycleId: microcycle.id,
      name: "Phase 1",
      startDate: "2026-08-03",
      endDate: "2026-08-06",
      segmentType: "Training Camp",
      sortOrder: 0,
    });
    await expect(service.deleteMicrocycle(microcycle)).rejects.toThrow(
      "Ein Mikrozyklus mit Segmenten kann nicht gelöscht werden.",
    );
    await service.deleteMicrocycleSegment(updated);
    await service.deleteMicrocycleSegment(second);
    await service.deleteMicrocycle(microcycle);
    await expect(service.listMicrocycleSegments(season.id)).resolves.toEqual(
      [],
    );
    await expect(storage.listRevisions(season.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "create",
          entityType: "microcycle_segments",
        }),
        expect.objectContaining({
          operation: "update",
          entityType: "microcycle_segments",
        }),
        expect.objectContaining({
          operation: "soft_delete",
          entityType: "microcycle_segments",
        }),
      ]),
    );
  });

  it("validates microcycle segment ranges and ordering", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      goal: "Grundlage entwickeln",
      notes: "Progressiv steigern",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      goal: "Ausdauer aufbauen",
      notes: "Technik stabil halten",
    });
    const microcycle = await service.createMicrocycle({
      mesocycleId: mesocycle.id,
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      goal: "Ruhiger Einstieg",
      targetRpe: 4,
    });
    const input = {
      microcycleId: microcycle.id,
      name: "Phase 1",
      startDate: "2026-08-02",
      endDate: "2026-08-05",
      segmentType: "Training Camp",
      sortOrder: 0,
    };

    await expect(service.createMicrocycleSegment(input)).rejects.toThrow(
      "Der Zeitraum muss vollständig innerhalb des Mikrozyklus liegen.",
    );
    await expect(
      service.createMicrocycleSegment({
        ...input,
        startDate: "2026-08-06",
        endDate: "2026-08-05",
      }),
    ).rejects.toThrow("Das Startdatum muss vor oder am Enddatum liegen.");
    await expect(
      service.createMicrocycleSegment({
        ...input,
        startDate: "2026-08-03",
        sortOrder: -1,
      }),
    ).rejects.toThrow("Reihenfolge muss mindestens 0 sein.");
    await expect(
      service.createMicrocycleSegment({
        ...input,
        microcycleId: "missing-microcycle",
        startDate: "2026-08-03",
      }),
    ).rejects.toThrow("Mikrozyklus wurde nicht gefunden.");
  });

  it("defaults event endDate to startDate when omitted", async () => {
    const track = await service.createTrack(season.id, {
      name: "WK",
      sortOrder: 0,
      visible: true,
    });
    const created = await service.createEvent(season.id, {
      trackId: track.id,
      name: "Eintägiger Wettkampf",
      startDate: "2027-07-10",
      endDate: "",
      priority: "A",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });
    expect(created.endDate).toBe("2027-07-10");
    expect(created.startDate).toBe(created.endDate);
  });

  it("allows creating a microcycle without target RPE", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      goal: "",
      notes: "",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      goal: "",
      notes: "",
    });
    const created = await service.createMicrocycle({
      mesocycleId: mesocycle.id,
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      goal: "",
    });
    expect(created.targetRpe).toBeUndefined();
  });

  it("generates a code from the name when code is empty", async () => {
    const dimension = await service.createDimension(season.id, {
      name: "Aerobic Base",
      code: "",
      description: "",
      sortOrder: 0,
      active: true,
    });
    expect(dimension.code).toBe("AEROBIC_BASE");
  });

  it("derives the focus segment dimension from the selected focus", async () => {
    await service.initializeStandardPeriodization(season.id);
    const dimensions = await service.listDimensions(season.id);
    const aerobic = dimensions.find((item) => item.code === "AEROBIC");
    expect(aerobic).toBeDefined();
    const defs = await service.listFocusDefinitions(season.id);
    const base = defs.find((item) => item.name === "Aerobic Base");
    expect(base).toBeDefined();
    const segment = await service.createFocusSegment(season.id, {
      dimensionId: "",
      focusDefinitionId: base!.id,
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      notes: "",
    });
    expect(segment.dimensionId).toBe(aerobic!.id);
  });

  it("seeds a default event track on first periodization init", async () => {
    await service.initializeStandardPeriodization(season.id);
    const tracks = await service.listTracks(season.id);
    expect(tracks.some((track) => track.name === "Standard")).toBe(true);
  });

  it("generates one microcycle per ISO week within a mesocycle", async () => {
    const macrocycle = await service.createMacrocycle(season.id, {
      name: "Aufbau",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      goal: "",
      notes: "",
    });
    const mesocycle = await service.createMesocycle({
      macrocycleId: macrocycle.id,
      name: "Aerobe Basis",
      startDate: "2026-08-03",
      endDate: "2026-08-16",
      goal: "",
      notes: "",
    });
    const created = await service.generateWeeklyMicrocycles(mesocycle.id);
    expect(created).toBe(2);
    const microcycles = await service.listMicrocycles(season.id);
    expect(microcycles).toHaveLength(2);
    expect(microcycles[0].name).toBe("KW 32");
    expect(microcycles[1].name).toBe("KW 33");
    const repeat = await service.generateWeeklyMicrocycles(mesocycle.id);
    expect(repeat).toBe(0);
  });
});
