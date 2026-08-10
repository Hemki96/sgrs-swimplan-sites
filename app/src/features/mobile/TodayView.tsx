import { useState, type FormEvent } from "react";

import type {
  Event,
  FocusDefinition,
  Mesocycle,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import { SessionCard } from "../training-week/SessionCard";
import {
  Field,
  Head,
  Modal,
  Save,
  SessionEditor,
} from "../training-week/SessionEditor";
import { formatDate } from "../training-week/format";
import { buildTodayData } from "./todayViewModel";

export function TodayView({
  season,
  microcycles,
  mesocycles,
  events,
  focusDefinitions,
  days,
  sessions,
  service,
  onChange,
}: {
  season: Season;
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  events: Event[];
  focusDefinitions: FocusDefinition[];
  days: TrainingDay[];
  sessions: TrainingSession[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
}) {
  const data = buildTodayData({
    trainingDays: days,
    trainingSessions: sessions,
    microcycles,
    mesocycles,
    focusDefinitions,
    events,
  });
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [dayContext, setDayContext] = useState("");
  const [editor, setEditor] = useState<{
    date: string;
    session?: TrainingSession;
  } | null>(null);

  async function saveDay(event: FormEvent) {
    event.preventDefault();
    if (!dayDate) return;
    const current = days.find((day) => day.date === dayDate);
    const input = { date: dayDate, dayContext, notes: current?.notes ?? "" };
    if (current) await service.updateTrainingDay(current, input);
    else await service.createTrainingDay(season.id, input);
    await onChange();
    setDayDate(null);
  }

  return (
    <section className="today-view" aria-labelledby="today-title">
      <header className="today-heading">
        <div>
          <p className="eyebrow">Mobile · Heute</p>
          <h3 id="today-title">
            {data.weekday}, {data.formattedDate}
          </h3>
        </div>
        <span className="today-kw">KW {data.calendarWeek}</span>
      </header>

      {data.microcycle ? (
        <div className="today-week-summary" aria-label="Aktive Trainingswoche">
          <span>
            <small>Mesozyklus</small>
            <strong>{data.mesocycleName ?? "–"}</strong>
          </span>
          <span>
            <small>Target RPE</small>
            <strong>
              {data.targetRpe ?? "–"}
              <i>/10</i>
            </strong>
          </span>
          <span className="today-week-goal">
            <small>Wochenziel</small>
            <strong>{data.weeklyGoal || "–"}</strong>
          </span>
        </div>
      ) : (
        <p className="today-hint">Keine aktive Trainingswoche für heute.</p>
      )}

      <article className="today-card">
        <h4>Day Context</h4>
        <button
          className="day-context"
          type="button"
          onClick={() => {
            setDayDate(data.today);
            setDayContext(data.dayContext ?? "");
          }}
        >
          <span>{data.dayContext || "Kontext hinzufügen"}</span>
        </button>
      </article>

      <article className="today-card today-sessions">
        <div className="today-card-heading">
          <h4>Sessions</h4>
          <span className="session-count">{data.sessions.length}</span>
        </div>
        {data.sessions.length ? (
          <div className="day-sessions">
            {data.sessions.map(({ session }) => (
              <SessionCard
                key={session.id}
                session={session}
                focusDefinitions={focusDefinitions}
                onClick={() => setEditor({ date: data.today, session })}
              />
            ))}
          </div>
        ) : (
          <p className="today-empty">Für heute sind keine Sessions geplant.</p>
        )}
        <button
          className="add-session"
          type="button"
          onClick={() => setEditor({ date: data.today })}
        >
          ＋ Session
        </button>
      </article>

      <article className="today-card">
        <h4>Nächster Wettkampf</h4>
        {data.nextCompetition ? (
          <div className="today-competition">
            <strong>{data.nextCompetition.name}</strong>
            <span>
              {formatDate(data.nextCompetition.startDate)} · Priorität{" "}
              {data.nextCompetition.priority}
            </span>
          </div>
        ) : (
          <p className="today-empty">Kein Wettkampf geplant.</p>
        )}
      </article>

      <article className="today-card">
        <h4>Ausrüstung & Hinweise</h4>
        {data.equipment.length || data.notes.length ? (
          <>
            {data.equipment.length > 0 && (
              <ul className="today-equipment-list">
                {data.equipment.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {data.notes.length > 0 && (
              <ul className="today-note-list">
                {data.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="today-empty">Keine Hinweise für heute.</p>
        )}
      </article>

      {dayDate && (
        <Modal close={() => setDayDate(null)}>
          <form className="editor-sheet compact" onSubmit={saveDay}>
            <Head
              title={`Day Context · ${formatDate(dayDate)}`}
              close={() => setDayDate(null)}
            />
            <Field label="Day Context">
              <textarea
                autoFocus
                rows={4}
                value={dayContext}
                onChange={(event) => setDayContext(event.target.value)}
              />
            </Field>
            <Save />
          </form>
        </Modal>
      )}
      {editor && (
        <SessionEditor
          season={season}
          date={editor.date}
          session={editor.session}
          days={days}
          focusDefinitions={focusDefinitions}
          service={service}
          onSaved={onChange}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
