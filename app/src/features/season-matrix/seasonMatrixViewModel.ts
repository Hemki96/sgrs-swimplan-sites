import type {
  EventTrack,
  ISODate,
  MicrocycleSegment,
  Season,
} from "../../lib/domain/types";

const DAY_IN_MILLISECONDS = 86_400_000;

export type SeasonMatrixAreaId =
  | "event-tracks"
  | "constraints"
  | "macro"
  | "strength"
  | "aerobic"
  | "anaerobic"
  | "speed"
  | "tactical"
  | "technical"
  | "meso"
  | "micro-target-rpe";

export interface SeasonMatrixMonth {
  id: string;
  label: string;
  startDate: ISODate;
  endDate: ISODate;
  weekIds: string[];
}

export interface SeasonMatrixWeek {
  id: string;
  label: string;
  isoWeek: number;
  isoWeekYear: number;
  startDate: ISODate;
  endDate: ISODate;
}

export interface SeasonMatrixMicrocycleSegment {
  id: string;
  microcycleId: string;
  label: string;
  segmentType: string;
  startDate: ISODate;
  endDate: ISODate;
  startWeekIndex: number;
  endWeekIndex: number;
}

export interface SeasonMatrixArea {
  id: SeasonMatrixAreaId;
  label: string;
  sourceId?: string;
}

export interface SeasonMatrixViewModel {
  season: Pick<Season, "id" | "name" | "startDate" | "endDate">;
  axis: {
    months: SeasonMatrixMonth[];
    weeks: SeasonMatrixWeek[];
    microcycleSegments?: SeasonMatrixMicrocycleSegment[];
  };
  areas: SeasonMatrixArea[];
}

export interface BuildSeasonMatrixViewModelInput {
  season: Season;
  eventTracks?: EventTrack[];
  microcycleSegments?: MicrocycleSegment[];
  includeMicrocycleSegments?: boolean;
  locale?: string;
}

const fixedAreas: ReadonlyArray<SeasonMatrixArea> = [
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
];

export function buildSeasonMatrixViewModel({
  season,
  eventTracks = [],
  microcycleSegments = [],
  includeMicrocycleSegments = false,
  locale = "de-DE",
}: BuildSeasonMatrixViewModelInput): SeasonMatrixViewModel {
  const seasonStart = parseIsoDate(season.startDate);
  const seasonEnd = parseIsoDate(season.endDate);
  if (seasonStart > seasonEnd) {
    throw new RangeError(
      "Das Saisonende darf nicht vor dem Saisonstart liegen.",
    );
  }

  const weeks = buildWeeks(seasonStart, seasonEnd);
  const months = buildMonths(seasonStart, seasonEnd, weeks, locale);
  const visibleTracks = eventTracks
    .filter((track) => track.seasonId === season.id && track.visible)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  const areas: SeasonMatrixArea[] = [
    ...(visibleTracks.length === 0
      ? [{ id: "event-tracks" as const, label: "Event Tracks" }]
      : visibleTracks.map((track) => ({
          id: "event-tracks" as const,
          label: track.name,
          sourceId: track.id,
        }))),
    ...fixedAreas,
  ];

  return {
    season: {
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
    },
    axis: {
      months,
      weeks,
      ...(includeMicrocycleSegments
        ? {
            microcycleSegments: buildMicrocycleSegments(
              microcycleSegments,
              weeks,
              season.startDate,
              season.endDate,
            ),
          }
        : {}),
    },
    areas,
  };
}

function buildWeeks(start: Date, end: Date): SeasonMatrixWeek[] {
  const firstMonday = addDays(start, -((start.getUTCDay() + 6) % 7));
  const weeks: SeasonMatrixWeek[] = [];

  for (let monday = firstMonday; monday <= end; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    const { week, year } = getIsoWeek(monday);
    weeks.push({
      id: `${year}-W${String(week).padStart(2, "0")}`,
      label: `KW ${week}`,
      isoWeek: week,
      isoWeekYear: year,
      startDate: formatIsoDate(monday < start ? start : monday),
      endDate: formatIsoDate(sunday > end ? end : sunday),
    });
  }

  return weeks;
}

function buildMonths(
  start: Date,
  end: Date,
  weeks: SeasonMatrixWeek[],
  locale: string,
): SeasonMatrixMonth[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const months: SeasonMatrixMonth[] = [];

  for (
    let cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    );
    cursor <= end;
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    )
  ) {
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    );
    const clippedStart = cursor < start ? start : cursor;
    const clippedEnd = monthEnd > end ? end : monthEnd;
    months.push({
      id: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: formatter.format(cursor),
      startDate: formatIsoDate(clippedStart),
      endDate: formatIsoDate(clippedEnd),
      weekIds: weeks
        .filter(
          (week) =>
            parseIsoDate(week.startDate) <= clippedEnd &&
            parseIsoDate(week.endDate) >= clippedStart,
        )
        .map((week) => week.id),
    });
  }

  return months;
}

function buildMicrocycleSegments(
  segments: MicrocycleSegment[],
  weeks: SeasonMatrixWeek[],
  seasonStart: ISODate,
  seasonEnd: ISODate,
): SeasonMatrixMicrocycleSegment[] {
  return segments
    .filter(
      (segment) =>
        segment.startDate <= seasonEnd && segment.endDate >= seasonStart,
    )
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) ||
        left.sortOrder - right.sortOrder,
    )
    .map((segment) => {
      const startDate =
        segment.startDate < seasonStart ? seasonStart : segment.startDate;
      const endDate = segment.endDate > seasonEnd ? seasonEnd : segment.endDate;
      return {
        id: segment.id,
        microcycleId: segment.microcycleId,
        label: segment.name,
        segmentType: segment.segmentType,
        startDate,
        endDate,
        startWeekIndex: findWeekIndex(weeks, startDate),
        endWeekIndex: findWeekIndex(weeks, endDate),
      };
    });
}

function findWeekIndex(weeks: SeasonMatrixWeek[], date: ISODate): number {
  return weeks.findIndex(
    (week) => week.startDate <= date && week.endDate >= date,
  );
}

function getIsoWeek(date: Date): { week: number; year: number } {
  const thursday = addDays(date, 3 - ((date.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekThursday = addDays(
    firstThursday,
    3 - ((firstThursday.getUTCDay() + 6) % 7),
  );
  return {
    week:
      1 +
      Math.round(
        (thursday.getTime() - firstWeekThursday.getTime()) /
          (7 * DAY_IN_MILLISECONDS),
      ),
    year,
  };
}

function parseIsoDate(value: ISODate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Ungültiges ISO-Datum: ${value}`);
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (formatIsoDate(date) !== value) {
    throw new RangeError(`Ungültiges ISO-Datum: ${value}`);
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS);
}

function formatIsoDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}
