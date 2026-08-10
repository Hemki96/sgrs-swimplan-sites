import { describe, expect, it } from "vitest";
import { buildAnalyticsViewModel } from "../../src/features/analytics/analyticsViewModel";
import type { FocusDefinition, Season } from "../../src/lib/domain/types";

const season: Season = {
  id: "season",
  name: "Saison",
  startDate: "2026-08-03",
  endDate: "2026-08-16",
  description: "",
  mainGoal: "",
  status: "active",
  version: 1,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};
const focus: FocusDefinition = {
  id: "focus",
  seasonId: "season",
  dimensionId: "dimension",
  name: "Aerobic Base",
  code: "BASE",
  active: true,
  version: 1,
};

describe("analytics view model", () => {
  it("aggregates volume, target RPE and session count per week", () => {
    const result = buildAnalyticsViewModel({
      season,
      events: [],
      microcycles: [
        {
          id: "micro",
          mesocycleId: "meso",
          name: "KW 32",
          startDate: "2026-08-03",
          endDate: "2026-08-09",
          targetRpe: 6,
          goal: "",
          version: 1,
        },
      ],
      focusDefinitions: [focus],
      trainingDays: [
        { id: "day", seasonId: "season", date: "2026-08-05", version: 1 },
      ],
      trainingSessions: [
        {
          id: "one",
          trainingDayId: "day",
          volumeMeters: 4000,
          mainFocusId: "focus",
          keySession: false,
          version: 1,
        },
        {
          id: "two",
          trainingDayId: "day",
          volumeMeters: 2500,
          mainFocusId: "focus",
          keySession: true,
          version: 1,
        },
      ],
    });
    expect(result.weeks[0]).toMatchObject({
      volumeMeters: 6500,
      targetRpe: 6,
      sessionCount: 2,
    });
    expect(result.totals).toEqual({
      volumeMeters: 6500,
      sessionCount: 2,
      weeksWithSessions: 1,
    });
    expect(result.focusDistribution).toEqual([
      { focusId: "focus", label: "Aerobic Base", sessionCount: 2, share: 1 },
    ]);
  });

  it("uses only season planning data and sorts competitions chronologically", () => {
    const result = buildAnalyticsViewModel({
      season,
      microcycles: [],
      focusDefinitions: [],
      trainingSessions: [],
      trainingDays: [
        {
          id: "foreign-day",
          seasonId: "other",
          date: "2026-08-05",
          version: 1,
        },
      ],
      events: [
        {
          id: "late",
          seasonId: "season",
          trackId: "track",
          name: "B",
          startDate: "2026-08-15",
          endDate: "2026-08-15",
          priority: "B",
          version: 1,
        },
        {
          id: "foreign",
          seasonId: "other",
          trackId: "track",
          name: "X",
          startDate: "2026-08-01",
          endDate: "2026-08-01",
          priority: "A",
          version: 1,
        },
        {
          id: "early",
          seasonId: "season",
          trackId: "track",
          name: "A",
          startDate: "2026-08-08",
          endDate: "2026-08-08",
          priority: "A",
          version: 1,
        },
      ],
    });
    expect(result.competitions.map((event) => event.id)).toEqual([
      "early",
      "late",
    ]);
    expect(result.totals.sessionCount).toBe(0);
  });
});
