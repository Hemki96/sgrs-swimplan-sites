import { describe, expect, it } from "vitest";
import type { StorageSnapshot } from "../../src/lib/storage/StorageAdapter";
import { seasonScopeSummary } from "../../src/lib/storage/purgeScope";

const season = {
  id: "season-1",
  name: "2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "",
  mainGoal: "",
  status: "draft",
  version: 0,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

const macrocycle = {
  id: "macro-1",
  seasonId: season.id,
  name: "Base",
  startDate: "2026-08-01",
  endDate: "2027-01-31",
  goal: "Grundlage",
  notes: "",
  version: 0,
};

const mesocycle = {
  id: "meso-1",
  macrocycleId: macrocycle.id,
  name: "Meso",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  goal: "Ziel",
  notes: "",
  version: 0,
};

const otherSeason = {
  ...season,
  id: "season-2",
  name: "2027/28",
};

describe("seasonScopeSummary", () => {
  it("counts the season, nested entities and their revisions", () => {
    const snapshot: StorageSnapshot = {
      seasons: [season, otherSeason],
      macrocycles: [macrocycle],
      mesocycles: [mesocycle],
      revisions: [
        { seasonId: season.id },
        { seasonId: season.id },
        { seasonId: otherSeason.id },
      ],
    };

    const summary = seasonScopeSummary(snapshot, season.id);
    expect(summary).toEqual({ entityCount: 3, revisionCount: 2 });
  });

  it("ignores entities and revisions outside the requested season", () => {
    const snapshot: StorageSnapshot = {
      seasons: [season, otherSeason],
      macrocycles: [macrocycle],
      revisions: [{ seasonId: season.id }, { seasonId: otherSeason.id }],
    };

    const summary = seasonScopeSummary(snapshot, otherSeason.id);
    expect(summary).toEqual({ entityCount: 1, revisionCount: 1 });
  });
});
