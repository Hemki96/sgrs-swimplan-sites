import { beforeEach, describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { Season, Weekday } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("TrainingScheduleTemplate generation", () => {
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
      startDate: "2026-09-01",
      endDate: "2026-12-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++entityIndex}`,
      now: () => "2026-09-01T12:00:00.000Z",
    });
  });

  async function createTemplate(
    overrides: Partial<{
      weekday: Weekday;
      startTime: string;
      endTime: string;
      active: boolean;
      validFrom: string | null;
      validUntil: string | null;
    }> = {},
  ) {
    return service.createScheduleTemplate(season.id, {
      name: "Abendtraining",
      weekday: "Monday",
      startTime: "18:00",
      endTime: "20:00",
      location: "Oktopus",
      active: true,
      validFrom: null,
      validUntil: null,
      ...overrides,
    });
  }

  it("Test 1: erzeugt für jeden Montag eine Session in mehreren Kalenderwochen", async () => {
    await createTemplate();
    await service.refreshScheduleSessions(season.id);

    const sessions = await service.listTrainingSessions(season.id);
    const generated = sessions.filter((s) => s.generatedFromSchedule);
    expect(generated.length).toBeGreaterThanOrEqual(4);

    for (const session of generated) {
      expect(session.scheduleTemplateId).toBeDefined();
      expect(session.generatedFromSchedule).toBe(true);
      expect(session.scheduleDetached).toBe(false);
      expect(session.startTime).toBe("18:00");
      expect(session.durationMinutes).toBe(120);
      const day = await storage.get<{ date: string }>(
        "training_days",
        session.trainingDayId,
      );
      expect(day).not.toBeNull();
      const date = new Date(`${day!.date}T12:00:00Z`);
      expect(date.getUTCDay()).toBe(1); // Monday
    }
  });

  it("Test 2: mehrfaches Laden erzeugt keine Duplikate", async () => {
    await createTemplate();
    await service.refreshScheduleSessions(season.id);
    await service.refreshScheduleSessions(season.id);
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    const keys = new Set(
      generated.map((s) => `${s.scheduleTemplateId}:${s.trainingDayId}`),
    );
    expect(keys.size).toBe(generated.length);
    expect(generated.length).toBeGreaterThanOrEqual(4);
  });

  it("Test 3: individuelle Änderung betrifft nur diese Session", async () => {
    await createTemplate();
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    const target = generated[0];
    const originalDay = await storage.get<{ date: string }>(
      "training_days",
      target.trainingDayId,
    );

    await service.saveTrainingSession(
      season.id,
      {
        trainingDayId: target.trainingDayId,
        title: target.title ?? "",
        startTime: "18:30",
        durationMinutes: target.durationMinutes,
        volumeMeters: undefined,
        expectedRpe: undefined,
        mainFocusId: "",
        technicalFocusId: "",
        keySession: false,
        athleteNote: "",
        equipment: "",
      },
      target,
    );

    const updated = await storage.get<typeof target>(
      "training_sessions",
      target.id,
    );
    expect(updated?.scheduleDetached).toBe(true);
    expect(updated?.startTime).toBe("18:30");

    for (const other of generated.slice(1)) {
      const still = await storage.get<typeof target>(
        "training_sessions",
        other.id,
      );
      expect(still?.scheduleDetached).toBe(false);
      expect(still?.startTime).toBe("18:00");
    }
    expect(originalDay).not.toBeNull();
  });

  it("Test 4: Template-Änderung verändert getrennte Session nicht", async () => {
    const template = await createTemplate();
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    const target = generated[0];
    await service.saveTrainingSession(
      season.id,
      {
        trainingDayId: target.trainingDayId,
        title: target.title ?? "",
        startTime: "18:30",
        durationMinutes: target.durationMinutes,
        volumeMeters: undefined,
        expectedRpe: undefined,
        mainFocusId: "",
        technicalFocusId: "",
        keySession: false,
        athleteNote: "",
        equipment: "",
      },
      target,
    );

    await service.updateScheduleTemplate(template, {
      name: "Abendtraining",
      weekday: "Monday",
      startTime: "19:00",
      endTime: "21:00",
      location: "Oktopus",
      active: true,
      validFrom: null,
      validUntil: null,
    });
    await service.refreshScheduleSessions(
      season.id,
      "2026-09-01T12:00:00.000Z",
    );

    const detached = await storage.get<typeof target>(
      "training_sessions",
      target.id,
    );
    expect(detached?.startTime).toBe("18:30");
    expect(detached?.scheduleDetached).toBe(true);

    const others = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule && s.id !== target.id,
    );
    for (const other of others) {
      expect(other.startTime).toBe("19:00");
      expect(other.durationMinutes).toBe(120);
    }
  });

  it("Test 5: nicht bearbeitete zukünftige Session übernimmt neue Standardzeit", async () => {
    const template = await createTemplate();
    await service.refreshScheduleSessions(season.id);

    await service.updateScheduleTemplate(template, {
      name: "Abendtraining",
      weekday: "Monday",
      startTime: "19:00",
      endTime: "21:00",
      location: "Oktopus",
      active: true,
      validFrom: null,
      validUntil: null,
    });
    await service.refreshScheduleSessions(
      season.id,
      "2026-09-01T12:00:00.000Z",
    );

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    for (const session of generated) {
      expect(session.startTime).toBe("19:00");
      expect(session.durationMinutes).toBe(120);
    }
  });

  it("Test 6: Session einer Woche auf cancelled setzen – nur diese Woche fällt aus", async () => {
    await createTemplate();
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    const target = generated[0];
    await service.saveTrainingSession(
      season.id,
      {
        trainingDayId: target.trainingDayId,
        title: target.title ?? "",
        startTime: target.startTime ?? "",
        durationMinutes: target.durationMinutes,
        volumeMeters: undefined,
        expectedRpe: undefined,
        mainFocusId: "",
        technicalFocusId: "",
        keySession: false,
        athleteNote: "",
        equipment: "",
        status: "cancelled",
      },
      target,
    );

    const updated = await storage.get<typeof target>(
      "training_sessions",
      target.id,
    );
    expect(updated?.status).toBe("cancelled");

    const others = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule && s.id !== target.id,
    );
    for (const other of others) {
      expect(other.status).not.toBe("cancelled");
    }
  });

  it("Test 7: Template deaktivieren erzeugt keine neuen Sessions", async () => {
    const template = await createTemplate();
    await service.refreshScheduleSessions(season.id);
    const before = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    ).length;

    await service.updateScheduleTemplate(template, {
      name: "Abendtraining",
      weekday: "Monday",
      startTime: "18:00",
      endTime: "20:00",
      location: "Oktopus",
      active: false,
      validFrom: null,
      validUntil: null,
    });
    await service.refreshScheduleSessions(season.id);

    const after = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    ).length;
    expect(after).toBe(before);
  });

  it("Test 8: validUntil überschritten – keine Session mehr erzeugen", async () => {
    await createTemplate({ validUntil: "2026-09-30" });
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    for (const session of generated) {
      const day = await storage.get<{ date: string }>(
        "training_days",
        session.trainingDayId,
      );
      expect(day!.date <= "2026-09-30").toBe(true);
    }
    expect(generated.length).toBeGreaterThan(0);
  });

  it("Test 9: Kalenderrestriktion – Session bleibt bestehen", async () => {
    await createTemplate();
    await service.createConstraint(season.id, {
      type: "Ferien",
      name: "Herbstferien",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
      notes: "",
      severity: "Hinweis",
    });
    await service.refreshScheduleSessions(season.id);

    const generated = (await service.listTrainingSessions(season.id)).filter(
      (s) => s.generatedFromSchedule,
    );
    const inRestriction = generated.filter((session) => {
      return session.startTime === "18:00";
    });
    expect(inRestriction.length).toBeGreaterThan(0);
  });

  it("Test 10: JSON Export und Import erhalten Templates und erzeugte Sessions", async () => {
    await createTemplate();
    await service.refreshScheduleSessions(season.id);

    const snapshot = await storage.exportAll();
    const templates = snapshot.training_schedule_templates ?? [];
    const sessions = snapshot.training_sessions ?? [];
    expect(templates.length).toBe(1);
    expect(
      sessions.some(
        (s) => (s as { generatedFromSchedule?: boolean }).generatedFromSchedule,
      ),
    ).toBe(true);

    const fresh = new InMemoryStorageAdapter();
    await fresh.hydrate(snapshot);
    const freshTemplates = await fresh.list<(typeof templates)[number]>(
      "training_schedule_templates",
    );
    const freshSessions =
      await fresh.list<(typeof sessions)[number]>("training_sessions");
    expect(freshTemplates.length).toBe(1);
    expect(
      freshSessions.some(
        (s) => (s as { generatedFromSchedule?: boolean }).generatedFromSchedule,
      ),
    ).toBe(true);
  });

  it("lehnt Template mit Endzeit vor Startzeit ab", async () => {
    await expect(
      createTemplate({ startTime: "20:00", endTime: "18:00" }),
    ).rejects.toThrow("Die Endzeit muss nach der Startzeit liegen.");
  });
});
