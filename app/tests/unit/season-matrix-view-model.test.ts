import { describe, expect, it } from "vitest";

import { buildSeasonMatrixViewModel } from "../../src/features/season-matrix/seasonMatrixViewModel";
import { buildSeasonMatrixRows } from "../../src/features/season-matrix/SeasonMatrix";
import type {
  EventTrack,
  MicrocycleSegment,
  Season,
} from "../../src/lib/domain/types";

const season: Season = {
  id: "season-2026-27",
  name: "Saison 2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "",
  mainGoal: "",
  status: "active",
  version: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("season matrix view model", () => {
  it("derives a complete 52+ week axis and calendar months", () => {
    const viewModel = buildSeasonMatrixViewModel({ season });

    expect(viewModel.axis.weeks).toHaveLength(53);
    expect(viewModel.axis.weeks[0]).toMatchObject({
      id: "2026-W31",
      label: "KW 31",
      startDate: "2026-08-01",
      endDate: "2026-08-02",
    });
    expect(viewModel.axis.weeks.at(-1)).toMatchObject({
      id: "2027-W30",
      startDate: "2027-07-26",
      endDate: "2027-07-31",
    });
    expect(viewModel.axis.months).toHaveLength(12);
    expect(viewModel.axis.months[0]).toMatchObject({
      id: "2026-08",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(viewModel.axis.months[0].weekIds).toEqual([
      "2026-W31",
      "2026-W32",
      "2026-W33",
      "2026-W34",
      "2026-W35",
      "2026-W36",
    ]);
  });

  it("provides all vertical areas and orders visible event tracks", () => {
    const tracks: EventTrack[] = [
      track("track-2", "National", 2),
      track("track-hidden", "Intern", 0, false),
      track("track-1", "Regional", 1),
    ];
    const viewModel = buildSeasonMatrixViewModel({
      season,
      eventTracks: tracks,
    });

    expect(viewModel.areas.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "event-tracks", label: "Regional" },
      { id: "event-tracks", label: "National" },
      { id: "constraints", label: "Restriktionen" },
      { id: "macro", label: "Macro" },
      { id: "strength", label: "Strength" },
      { id: "aerobic", label: "Aerobic" },
      { id: "anaerobic", label: "Anaerobic" },
      { id: "speed", label: "Speed" },
      { id: "tactical", label: "Tactical" },
      { id: "technical", label: "Technical" },
      { id: "meso", label: "Meso" },
      { id: "micro-target-rpe", label: "Micro Target RPE" },
    ]);
  });

  it("adds microcycle segments only when requested and maps them to weeks", () => {
    const segments: MicrocycleSegment[] = [
      {
        id: "segment-1",
        microcycleId: "micro-1",
        name: "Load",
        startDate: "2026-08-05",
        endDate: "2026-08-12",
        segmentType: "load",
        sortOrder: 1,
        version: 1,
      },
    ];

    expect(
      buildSeasonMatrixViewModel({ season, microcycleSegments: segments }).axis
        .microcycleSegments,
    ).toBeUndefined();
    expect(
      buildSeasonMatrixViewModel({
        season,
        microcycleSegments: segments,
        includeMicrocycleSegments: true,
      }).axis.microcycleSegments,
    ).toEqual([
      expect.objectContaining({
        id: "segment-1",
        startWeekIndex: 1,
        endWeekIndex: 2,
      }),
    ]);
  });

  it("projects competitions, restrictions, phases, focuses and weekly RPE", () => {
    const trackOne = track("track-1", "WK", 1);
    const dimension = {
      id: "dimension-aerobic",
      seasonId: season.id,
      name: "Aerobic",
      code: "AEROBIC",
      sortOrder: 1,
      active: true,
      version: 1,
    };
    const rows = buildSeasonMatrixRows({
      season,
      tracks: [trackOne],
      events: [
        {
          id: "event-1",
          seasonId: season.id,
          trackId: trackOne.id,
          name: "Meisterschaft",
          startDate: "2027-07-10",
          endDate: "2027-07-11",
          priority: "A",
          version: 1,
        },
      ],
      constraints: [
        {
          id: "constraint-1",
          seasonId: season.id,
          type: "Ferien",
          name: "Weihnachtsferien",
          startDate: "2026-12-23",
          endDate: "2027-01-06",
          version: 1,
        },
      ],
      macrocycles: [
        {
          id: "macro-1",
          seasonId: season.id,
          name: "Aufbau",
          startDate: "2026-08-01",
          endDate: "2027-01-31",
          goal: "Basis",
          notes: "",
          version: 1,
        },
      ],
      mesocycles: [
        {
          id: "meso-1",
          macrocycleId: "macro-1",
          name: "Basis I",
          startDate: "2026-08-01",
          endDate: "2026-09-30",
          goal: "Ausdauer",
          notes: "",
          version: 1,
        },
      ],
      microcycles: [
        {
          id: "micro-1",
          mesocycleId: "meso-1",
          name: "Woche 1",
          startDate: "2026-08-03",
          endDate: "2026-08-09",
          targetRpe: 6,
          goal: "Einstieg",
          version: 1,
        },
      ],
      dimensions: [dimension],
      focusDefinitions: [
        {
          id: "focus-1",
          seasonId: season.id,
          dimensionId: dimension.id,
          name: "Aerobic Base",
          code: "AEROBIC_BASE",
          active: true,
          version: 1,
        },
      ],
      focusSegments: [
        {
          id: "focus-segment-1",
          seasonId: season.id,
          dimensionId: dimension.id,
          focusDefinitionId: "focus-1",
          startDate: "2026-08-03",
          endDate: "2026-09-13",
          version: 1,
        },
      ],
    });

    expect(
      rows.find((row) => row.id === "track-track-1")?.blocks[0].label,
    ).toBe("Meisterschaft");
    expect(rows.find((row) => row.id === "constraints")?.blocks[0].label).toBe(
      "Weihnachtsferien",
    );
    expect(rows.find((row) => row.id === "macro")?.blocks[0].label).toBe(
      "Aufbau",
    );
    expect(
      rows.find((row) => row.id === "focus-AEROBIC")?.blocks[0].label,
    ).toBe("Aerobic Base");
    expect(rows.find((row) => row.id === "meso")?.blocks[0].label).toBe(
      "Basis I",
    );
    expect(rows.find((row) => row.id === "rpe")?.blocks[0].label).toBe("6");
  });
});

function track(
  id: string,
  name: string,
  sortOrder: number,
  visible = true,
): EventTrack {
  return {
    id,
    seasonId: season.id,
    name,
    sortOrder,
    visible,
    version: 1,
  };
}
