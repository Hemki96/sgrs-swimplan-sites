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
import { buildDashboardData } from "./dashboardViewModel";

export function Dashboard(props: {
  events: Event[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
  trainingDays: TrainingDay[];
  trainingSessions: TrainingSession[];
}) {
  const dashboard = buildDashboardData(props);
  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Aktuelle Planung</p>
          <h2 id="dashboard-title">Dashboard · KW {dashboard.calendarWeek}</h2>
        </div>
        <span className="dashboard-phase">
          {dashboard.currentPhase ?? "Keine aktive Phase"}
        </span>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-primary">
          <span>Target RPE</span>
          <strong>{dashboard.targetRpe ?? "–"}</strong>
          <small>{dashboard.weeklyGoal || "Kein Wochenziel geplant"}</small>
        </article>
        <article className="dashboard-card">
          <span>Geplanter Wochenumfang</span>
          <strong>{formatMeters(dashboard.plannedVolumeMeters)}</strong>
          <small>{dashboard.sessionCount} Sessions</small>
        </article>
        <article className="dashboard-card">
          <span>Nächster Wettkampf</span>
          <strong>{dashboard.nextCompetition?.name ?? "Keiner geplant"}</strong>
          <small>
            {dashboard.nextCompetition
              ? formatDate(dashboard.nextCompetition.startDate)
              : "–"}
          </small>
        </article>
        <article className="dashboard-card dashboard-countdown">
          <span>Bis zum nächsten A-Wettkampf</span>
          <strong>{dashboard.daysUntilNextACompetition ?? "–"}</strong>
          <small>
            {dashboard.daysUntilNextACompetition === undefined
              ? "Nicht geplant"
              : "Tage"}
          </small>
        </article>
      </div>

      <div className="dashboard-details">
        <article className="dashboard-panel">
          <h3>Hauptschwerpunkte</h3>
          {dashboard.mainFocuses.length ? (
            <ul className="focus-chips">
              {dashboard.mainFocuses.map((focus) => (
                <li key={focus}>{focus}</li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">
              Keine Schwerpunkte für diese Woche.
            </p>
          )}
        </article>
        <article className="dashboard-panel">
          <h3>Key Sessions der Woche</h3>
          {dashboard.keySessions.length ? (
            <ul className="key-session-list">
              {dashboard.keySessions.map((session) => (
                <li key={session.id}>
                  <time dateTime={session.date}>
                    {formatWeekday(session.date)}
                  </time>
                  <div>
                    <strong>{session.title || "Key Session"}</strong>
                    <span>{formatSessionMeta(session)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">Keine Key Sessions geplant.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function formatMeters(value: number): string {
  return `${new Intl.NumberFormat("de-DE").format(value)} m`;
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function formatWeekday(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function formatSessionMeta(session: TrainingSession): string {
  return [
    session.startTime && `${session.startTime} Uhr`,
    session.volumeMeters !== undefined && formatMeters(session.volumeMeters),
    session.expectedRpe !== undefined && `RPE ${session.expectedRpe}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
