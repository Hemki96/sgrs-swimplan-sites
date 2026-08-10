import type {
  Event,
  FocusDefinition,
  Mesocycle,
  Microcycle,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import { isoWeek } from "../dashboard/dashboardViewModel";
import { formatFullDate, weekdayName } from "../training-week/format";

export interface TodaySession {
  session: TrainingSession;
  mainFocus?: string;
  technicalFocus?: string;
}

export interface TodayData {
  today: string;
  weekday: string;
  formattedDate: string;
  calendarWeek: number;
  microcycle?: Microcycle;
  mesocycleName?: string;
  targetRpe?: number;
  weeklyGoal?: string;
  dayContext?: string;
  sessions: TodaySession[];
  equipment: string[];
  notes: string[];
  nextCompetition?: Event;
}

export function buildTodayData(
  input: {
    trainingDays: TrainingDay[];
    trainingSessions: TrainingSession[];
    microcycles: Microcycle[];
    mesocycles: Mesocycle[];
    focusDefinitions: FocusDefinition[];
    events: Event[];
  },
  today = new Date().toISOString().slice(0, 10),
): TodayData {
  const day = input.trainingDays.find((item) => item.date === today);
  const daySessions = day
    ? input.trainingSessions
        .filter((session) => session.trainingDayId === day.id)
        .sort((left, right) =>
          (left.startTime ?? "99:99").localeCompare(right.startTime ?? "99:99"),
        )
    : [];
  const microcycle = input.microcycles.find((item) => contains(item, today));
  const mesocycle = microcycle
    ? input.mesocycles.find((item) => item.id === microcycle.mesocycleId)
    : undefined;
  const focusById = new Map(
    input.focusDefinitions.map((definition) => [definition.id, definition]),
  );
  const sessions = daySessions.map((session) => ({
    session,
    mainFocus: session.mainFocusId
      ? focusById.get(session.mainFocusId)?.name
      : undefined,
    technicalFocus: session.technicalFocusId
      ? focusById.get(session.technicalFocusId)?.name
      : undefined,
  }));
  const equipment = Array.from(
    new Set(
      daySessions
        .flatMap((session) => session.equipment?.split(",") ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  const notes = daySessions
    .map((session) => session.athleteNote)
    .filter((note): note is string => Boolean(note?.trim()));
  const nextCompetition = input.events
    .filter((event) => event.endDate >= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate))[0];

  return {
    today,
    weekday: weekdayName(today),
    formattedDate: formatFullDate(today),
    calendarWeek: isoWeek(today),
    microcycle,
    mesocycleName: mesocycle?.name,
    targetRpe: microcycle?.targetRpe,
    weeklyGoal: microcycle?.goal,
    dayContext: day?.dayContext,
    sessions,
    equipment,
    notes,
    nextCompetition,
  };
}

function contains(
  item: { startDate: string; endDate: string },
  date: string,
): boolean {
  return item.startDate <= date && item.endDate >= date;
}
