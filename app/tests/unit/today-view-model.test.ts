import { describe, expect, it } from "vitest";

import { buildTodayData } from "../../src/features/mobile/todayViewModel";
import type {
  Event,
  FocusDefinition,
  Mesocycle,
  Microcycle,
  TrainingDay,
  TrainingSession,
} from "../../src/lib/domain/types";

describe("today view model", () => {
  it("derives the current day, sessions, equipment, notes and context", () => {
    const data = buildTodayData(fixture(), "2026-08-12");

    expect(data.today).toBe("2026-08-12");
    expect(data.weekday).toBe("Mittwoch");
    expect(data.formattedDate).toBe("12. August 2026");
    expect(data.calendarWeek).toBe(33);
    expect(data.dayContext).toBe("Belastungstag");
    expect(data.sessions.map((item) => item.session.title)).toEqual([
      "Easy",
      "Main Set",
    ]);
    expect(data.sessions[1].mainFocus).toBe("Aerobic Base");
    expect(data.sessions[1].technicalFocus).toBe("Turns");
    expect(data.equipment).toEqual(["Paddles", "Pullkick", "Pulssensor"]);
    expect(data.notes).toEqual(["Hinweis A"]);
    expect(data.microcycle?.name).toBe("Woche");
    expect(data.mesocycleName).toBe("Basis");
    expect(data.targetRpe).toBe(6);
    expect(data.weeklyGoal).toBe("Aerobe Basis stabilisieren");
    expect(data.nextCompetition?.name).toBe("Testmeet");
  });

  it("returns empty data when today has no training day", () => {
    const data = buildTodayData(fixture(), "2026-08-20");

    expect(data.sessions).toEqual([]);
    expect(data.dayContext).toBeUndefined();
    expect(data.equipment).toEqual([]);
    expect(data.notes).toEqual([]);
    expect(data.microcycle).toBeUndefined();
    expect(data.mesocycleName).toBeUndefined();
    expect(data.nextCompetition?.name).toBe("Testmeet");
  });

  it("deduplicates and trims equipment across sessions", () => {
    const input = fixture();
    input.trainingSessions[0] = {
      ...input.trainingSessions[0],
      equipment: "Paddles,  Pullkick ",
    };
    const data = buildTodayData(input, "2026-08-12");
    expect(data.equipment).toEqual(["Paddles", "Pullkick"]);
  });
});

function fixture(): {
  trainingDays: TrainingDay[];
  trainingSessions: TrainingSession[];
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  focusDefinitions: FocusDefinition[];
  events: Event[];
} {
  const entity = { version: 1 };
  const seasonId = "season";
  const trainingDays: TrainingDay[] = [
    {
      ...entity,
      id: "day",
      seasonId,
      date: "2026-08-12",
      dayContext: "Belastungstag",
    },
    { ...entity, id: "day-2", seasonId, date: "2026-08-14" },
  ];
  return {
    trainingDays,
    trainingSessions: [
      {
        ...entity,
        id: "session-main",
        trainingDayId: "day",
        title: "Main Set",
        startTime: "17:00",
        durationMinutes: 105,
        volumeMeters: 6200,
        expectedRpe: 7,
        mainFocusId: "focus-aero",
        technicalFocusId: "focus-tech",
        keySession: true,
        athleteNote: "Hinweis A",
        equipment: "Paddles, Pullkick, Pulssensor",
      },
      {
        ...entity,
        id: "session-easy",
        trainingDayId: "day",
        title: "Easy",
        startTime: "06:15",
        durationMinutes: 45,
        volumeMeters: 0,
        expectedRpe: 4,
        keySession: false,
        equipment: "Paddles",
      },
      {
        ...entity,
        id: "session-other",
        trainingDayId: "day-2",
        title: "Sprint",
        startTime: "16:30",
        keySession: false,
      },
    ],
    microcycles: [
      {
        ...entity,
        id: "micro",
        mesocycleId: "meso",
        name: "Woche",
        startDate: "2026-08-10",
        endDate: "2026-08-16",
        targetRpe: 6,
        targetVolumeMeters: 20_000,
        goal: "Aerobe Basis stabilisieren",
      },
    ],
    mesocycles: [
      {
        ...entity,
        id: "meso",
        macrocycleId: "macro",
        name: "Basis",
        startDate: "2026-08-03",
        endDate: "2026-08-30",
        goal: "",
        notes: "",
      },
    ],
    focusDefinitions: [
      {
        ...entity,
        id: "focus-aero",
        seasonId,
        dimensionId: "dimension",
        name: "Aerobic Base",
        code: "BASE",
        active: true,
      },
      {
        ...entity,
        id: "focus-tech",
        seasonId,
        dimensionId: "dimension",
        name: "Turns",
        code: "TURNS",
        active: true,
      },
    ],
    events: [
      {
        ...entity,
        id: "event-test",
        seasonId,
        trackId: "track",
        name: "Testmeet",
        startDate: "2026-08-20",
        endDate: "2026-08-20",
        priority: "test",
      },
      {
        ...entity,
        id: "event-a",
        seasonId,
        trackId: "track",
        name: "Sommer-Meisterschaft",
        startDate: "2027-07-10",
        endDate: "2027-07-11",
        priority: "A",
      },
    ],
  };
}
