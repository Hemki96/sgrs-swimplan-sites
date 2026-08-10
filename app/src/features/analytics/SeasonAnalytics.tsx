import { useMemo, type ReactNode } from "react";
import type {
  Event,
  FocusDefinition,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import { buildAnalyticsViewModel } from "./analyticsViewModel";

export function SeasonAnalytics(props: {
  season: Season;
  events: Event[];
  microcycles: Microcycle[];
  focusDefinitions: FocusDefinition[];
  trainingDays: TrainingDay[];
  trainingSessions: TrainingSession[];
}) {
  const analytics = useMemo(() => buildAnalyticsViewModel(props), [props]);
  const activeWeeks = analytics.weeks.filter(
    (week) => week.sessionCount > 0 || week.targetRpe !== undefined,
  );
  const maxVolume = Math.max(
    1,
    ...activeWeeks.map((week) => week.volumeMeters),
  );
  const maxSessions = Math.max(
    1,
    ...activeWeeks.map((week) => week.sessionCount),
  );
  return (
    <section className="analytics-view" aria-labelledby="analytics-title">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">Planungsanalyse</p>
          <h2 id="analytics-title">Saison auf einen Blick</h2>
          <p>
            Nur aggregierte Planungswerte – keine Athleten- oder
            Gesundheitsdaten.
          </p>
        </div>
        <div className="analytics-kpis" aria-label="Summen">
          <Kpi
            value={formatMeters(analytics.totals.volumeMeters)}
            label="Umfang geplant"
          />
          <Kpi
            value={String(analytics.totals.sessionCount)}
            label="Sessions geplant"
          />
          <Kpi
            value={String(analytics.totals.weeksWithSessions)}
            label="Aktive Wochen"
          />
        </div>
      </div>
      <article className="analytics-card analytics-weekly">
        <div className="analytics-card-heading">
          <div>
            <h3>Wochenverlauf</h3>
            <p>
              Umfang, Target RPE und Anzahl geplanter Sessions pro
              Kalenderwoche.
            </p>
          </div>
        </div>
        {activeWeeks.length === 0 ? (
          <Empty>Für diese Saison sind noch keine Wochenwerte geplant.</Empty>
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Woche</th>
                  <th>Umfang</th>
                  <th>Target RPE</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {activeWeeks.map((week) => (
                  <tr key={week.id}>
                    <th scope="row">
                      <strong>{week.label}</strong>
                      <small>
                        {shortDate(week.startDate)}–{shortDate(week.endDate)}
                      </small>
                    </th>
                    <td>
                      <Bar
                        value={week.volumeMeters}
                        max={maxVolume}
                        tone="volume"
                      />
                      <span>{formatMeters(week.volumeMeters)}</span>
                    </td>
                    <td>
                      <Bar value={week.targetRpe ?? 0} max={10} tone="rpe" />
                      <span>{week.targetRpe ?? "–"}</span>
                    </td>
                    <td>
                      <Bar
                        value={week.sessionCount}
                        max={maxSessions}
                        tone="sessions"
                      />
                      <span>{week.sessionCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      <div className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Schwerpunktverteilung</h3>
              <p>Primärer Schwerpunkt je geplanter Session.</p>
            </div>
          </div>
          {analytics.focusDistribution.length === 0 ? (
            <Empty>Noch keine primären Session-Schwerpunkte zugeordnet.</Empty>
          ) : (
            <ol className="focus-distribution">
              {analytics.focusDistribution.map((focus) => (
                <li key={focus.focusId}>
                  <div>
                    <strong>{focus.label}</strong>
                    <span>
                      {focus.sessionCount}{" "}
                      {focus.sessionCount === 1 ? "Session" : "Sessions"} ·{" "}
                      {Math.round(focus.share * 100)} %
                    </span>
                  </div>
                  <div className="distribution-track" aria-hidden="true">
                    <i style={{ width: `${focus.share * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>
        <article className="analytics-card">
          <div className="analytics-card-heading">
            <div>
              <h3>Wettkampf-Timeline</h3>
              <p>Geplante Saisonwettkämpfe in chronologischer Reihenfolge.</p>
            </div>
          </div>
          {analytics.competitions.length === 0 ? (
            <Empty>Noch keine Wettkämpfe geplant.</Empty>
          ) : (
            <ol className="competition-timeline">
              {analytics.competitions.map((competition) => (
                <li key={competition.id}>
                  <time dateTime={competition.startDate}>
                    {formatDate(competition.startDate)}
                  </time>
                  <div>
                    <strong>{competition.name}</strong>
                    <span>
                      Priorität {competition.priority}
                      {competition.location ? ` · ${competition.location}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: string;
}) {
  return (
    <i className={`analytics-bar ${tone}`} aria-hidden="true">
      <b style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </i>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="analytics-empty">{children}</p>;
}
function formatMeters(value: number) {
  return `${new Intl.NumberFormat("de-DE").format(value)} m`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
