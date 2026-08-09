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
});
