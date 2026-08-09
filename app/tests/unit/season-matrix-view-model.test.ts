import { describe, expect, it } from "vitest";

import { buildSeasonMatrixViewModel } from "../../src/features/season-matrix/seasonMatrixViewModel";
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
