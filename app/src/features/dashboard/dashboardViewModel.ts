import type {
  Event,
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";

export interface DashboardData {
  calendarWeek: number;
  microcycle?: Microcycle;
  targetRpe?: number;
  weeklyGoal?: string;
  plannedVolumeMeters: number;
  sessionCount: number;
  mainFocuses: string[];
  nextCompetition?: Event;
  daysUntilNextACompetition?: number;
  currentPhase?: string;
  keySessions: Array<TrainingSession & { date: string }>;
}

export function buildDashboardData(
  input: {
    events: Event[];
    macrocycles: Macrocycle[];
    mesocycles: Mesocycle[];
    microcycles: Microcycle[];
    focusDefinitions: FocusDefinition[];
    focusSegments: FocusSegment[];
    trainingDays: TrainingDay[];
    trainingSessions: TrainingSession[];
  },
  today = new Date().toISOString().slice(0, 10),
): DashboardData {
  const microcycle = input.microcycles.find((item) => contains(item, today));
  const weekStart = microcycle?.startDate ?? mondayOf(today);
  const weekEnd = microcycle?.endDate ?? addDays(weekStart, 6);
  const weekDays = input.trainingDays.filter(
    (day) => day.date >= weekStart && day.date <= weekEnd,
  );
  const datesByDayId = new Map(weekDays.map((day) => [day.id, day.date]));
  const weekSessions = input.trainingSessions.filter((session) =>
    datesByDayId.has(session.trainingDayId),
  );
  const definitionById = new Map(
    input.focusDefinitions.map((definition) => [definition.id, definition]),
  );
  const mainFocuses = Array.from(
    new Set(
      input.focusSegments
        .filter(
          (segment) =>
            segment.startDate <= weekEnd && segment.endDate >= weekStart,
        )
        .map((segment) => definitionById.get(segment.focusDefinitionId)?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const nextCompetition = input.events.find((event) => event.endDate >= today);
  const nextACompetition = input.events.find(
    (event) => event.priority === "A" && event.startDate >= today,
  );
  const mesocycle = microcycle
    ? input.mesocycles.find((item) => item.id === microcycle.mesocycleId)
    : input.mesocycles.find((item) => contains(item, today));
  const macrocycle = mesocycle
    ? input.macrocycles.find((item) => item.id === mesocycle.macrocycleId)
    : input.macrocycles.find((item) => contains(item, today));

  return {
    calendarWeek: isoWeek(today),
    microcycle,
    targetRpe: microcycle?.targetRpe,
    weeklyGoal: microcycle?.goal,
    plannedVolumeMeters: weekSessions.reduce(
      (sum, session) => sum + (session.volumeMeters ?? 0),
      0,
    ),
    sessionCount: weekSessions.length,
    mainFocuses,
    nextCompetition,
    daysUntilNextACompetition: nextACompetition
      ? differenceInDays(today, nextACompetition.startDate)
      : undefined,
    currentPhase:
      macrocycle && mesocycle
        ? `${macrocycle.name} · ${mesocycle.name}`
        : (mesocycle?.name ?? macrocycle?.name),
    keySessions: weekSessions
      .filter((session) => session.keySession)
      .map((session) => ({
        ...session,
        date: datesByDayId.get(session.trainingDayId)!,
      }))
      .sort((left, right) =>
        `${left.date}${left.startTime ?? ""}`.localeCompare(
          `${right.date}${right.startTime ?? ""}`,
        ),
      ),
  };
}

function contains(
  item: { startDate: string; endDate: string },
  date: string,
): boolean {
  return item.startDate <= date && item.endDate >= date;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function addDays(date: string, amount: number): string {
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const result = parseDate(date);
  const weekday = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - weekday + 1);
  return result.toISOString().slice(0, 10);
}

function differenceInDays(from: string, to: string): number {
  return Math.round(
    (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000,
  );
}

export function isoWeek(date: string): number {
  const value = parseDate(date);
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((value.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}
