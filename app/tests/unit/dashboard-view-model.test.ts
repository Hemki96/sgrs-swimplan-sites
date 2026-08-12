import { describe, expect, it } from "vitest";
import {
  buildDashboardData,
  isoWeek,
} from "../../src/features/dashboard/dashboardViewModel";
import type { SeedDemoSeasonResult } from "../../src/lib/domain/seedDemoSeason";

describe("dashboard view model", () => {
  it("derives all dashboard values without persisted dashboard data", () => {
    const data = buildDashboardData(fixture(), "2026-08-12");
    expect(data.calendarWeek).toBe(33);
    expect(data.targetRpe).toBe(6);
    expect(data.weeklyGoal).toBe("Aerobe Basis stabilisieren");
    expect(data.plannedVolumeMeters).toBe(10_400);
    expect(data.sessionCount).toBe(2);
    expect(data.mainFocuses).toEqual(["Aerobic Base"]);
    expect(data.nextCompetition?.name).toBe("Testmeet");
    expect(data.daysUntilNextACompetition).toBe(19);
    expect(data.currentPhase).toBe("Aufbau · Basis");
    expect(data.keySessions.map((session) => session.title)).toEqual([
      "Main Set",
    ]);
  });

  it("handles ISO week-year boundaries", () => {
    expect(isoWeek("2027-01-01")).toBe(53);
    expect(isoWeek("2027-01-04")).toBe(1);
  });
});

function fixture(): SeedDemoSeasonResult {
  const entity = { version: 1 };
  const seasonId = "season";
  const macrocycles = [
    {
      ...entity,
      id: "macro",
      seasonId,
      name: "Aufbau",
      startDate: "2026-08-01",
      endDate: "2026-10-31",
      goal: "",
      notes: "",
    },
  ];
  const mesocycles = [
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
  ];
  const microcycles = [
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
  ];
  const focusDefinitions = [
    {
      ...entity,
      id: "focus",
      seasonId,
      dimensionId: "dimension",
      name: "Aerobic Base",
      code: "BASE",
      active: true,
    },
  ];
  const trainingDays = [{ ...entity, id: "day", seasonId, date: "2026-08-12" }];
  return {
    season: {
      ...entity,
      id: seasonId,
      name: "Saison",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "",
      mainGoal: "",
      status: "active",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    },
    eventTracks: [],
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
        name: "Meisterschaft",
        startDate: "2026-08-31",
        endDate: "2026-08-31",
        priority: "A",
      },
    ],
    calendarConstraints: [],
    macrocycles,
    mesocycles,
    microcycles,
    microcycleSegments: [],
    dimensions: [],
    focusDefinitions,
    focusSegments: [
      {
        ...entity,
        id: "segment",
        seasonId,
        dimensionId: "dimension",
        focusDefinitionId: "focus",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
      },
    ],
    trainingDays,
    trainingSessions: [
      {
        ...entity,
        id: "session-1",
        trainingDayId: "day",
        title: "Main Set",
        volumeMeters: 6000,
        keySession: true,
      },
      {
        ...entity,
        id: "session-2",
        trainingDayId: "day",
        title: "Easy",
        volumeMeters: 4400,
        keySession: false,
      },
    ],
    equipmentItems: [],
    sessionEquipment: [],
    trainingScheduleTemplates: [],
  };
}
