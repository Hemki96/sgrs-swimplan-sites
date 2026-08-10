import { buildSeasonMatrixViewModel } from "../season-matrix/seasonMatrixViewModel";
import type {
  Event,
  FocusDefinition,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";

export interface AnalyticsWeek {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  volumeMeters: number;
  targetRpe?: number;
  sessionCount: number;
}

export interface AnalyticsViewModel {
  weeks: AnalyticsWeek[];
  focusDistribution: Array<{
    focusId: string;
    label: string;
    sessionCount: number;
    share: number;
  }>;
  competitions: Event[];
  totals: {
    volumeMeters: number;
    sessionCount: number;
    weeksWithSessions: number;
  };
}

export function buildAnalyticsViewModel({
  season,
  events,
  microcycles,
  focusDefinitions,
  trainingDays,
  trainingSessions,
}: {
  season: Season;
  events: Event[];
  microcycles: Microcycle[];
  focusDefinitions: FocusDefinition[];
  trainingDays: TrainingDay[];
  trainingSessions: TrainingSession[];
}): AnalyticsViewModel {
  const days = trainingDays.filter((day) => day.seasonId === season.id);
  const daysById = new Map(days.map((day) => [day.id, day]));
  const sessions = trainingSessions.filter((session) =>
    daysById.has(session.trainingDayId),
  );
  const weeks = buildSeasonMatrixViewModel({ season }).axis.weeks.map(
    (week) => {
      const sessionsInWeek = sessions.filter((session) => {
        const date = daysById.get(session.trainingDayId)!.date;
        return date >= week.startDate && date <= week.endDate;
      });
      const microcycle = microcycles
        .filter(
          (item) =>
            item.startDate <= week.endDate && item.endDate >= week.startDate,
        )
        .sort(
          (left, right) =>
            overlap(right, week) - overlap(left, week) ||
            left.startDate.localeCompare(right.startDate),
        )[0];
      return {
        ...week,
        volumeMeters: sessionsInWeek.reduce(
          (sum, session) => sum + (session.volumeMeters ?? 0),
          0,
        ),
        targetRpe: microcycle?.targetRpe,
        sessionCount: sessionsInWeek.length,
      };
    },
  );

  const definitions = new Map(
    focusDefinitions
      .filter((focus) => focus.seasonId === season.id)
      .map((focus) => [focus.id, focus]),
  );
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (session.mainFocusId && definitions.has(session.mainFocusId)) {
      counts.set(
        session.mainFocusId,
        (counts.get(session.mainFocusId) ?? 0) + 1,
      );
    }
  }
  const classified = [...counts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const focusDistribution = [...counts.entries()]
    .map(([focusId, sessionCount]) => ({
      focusId,
      label: definitions.get(focusId)!.name,
      sessionCount,
      share: classified ? sessionCount / classified : 0,
    }))
    .sort(
      (left, right) =>
        right.sessionCount - left.sessionCount ||
        left.label.localeCompare(right.label, "de"),
    );

  return {
    weeks,
    focusDistribution,
    competitions: events
      .filter((event) => event.seasonId === season.id)
      .sort(
        (left, right) =>
          left.startDate.localeCompare(right.startDate) ||
          left.name.localeCompare(right.name, "de"),
      ),
    totals: {
      volumeMeters: weeks.reduce((sum, week) => sum + week.volumeMeters, 0),
      sessionCount: sessions.length,
      weeksWithSessions: weeks.filter((week) => week.sessionCount > 0).length,
    },
  };
}

function overlap(
  item: Pick<Microcycle, "startDate" | "endDate">,
  week: { startDate: string; endDate: string },
) {
  const start =
    item.startDate > week.startDate ? item.startDate : week.startDate;
  const end = item.endDate < week.endDate ? item.endDate : week.endDate;
  return Math.max(
    0,
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`),
  );
}
