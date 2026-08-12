import { useState, type FormEvent } from "react";
import type {
  CalendarConstraint,
  FocusDefinition,
  Mesocycle,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import { SessionCard } from "./SessionCard";
import { Field, Head, Modal, Save, SessionEditor } from "./SessionEditor";
import { formatDate, isoWeek, opt, sevenDays, volume } from "./format";

const weekdays = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export function TrainerWeekView({
  season,
  microcycles,
  mesocycles,
  constraints,
  focusDefinitions,
  days,
  sessions,
  service,
  onChange,
}: {
  season: Season;
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  constraints: CalendarConstraint[];
  focusDefinitions: FocusDefinition[];
  days: TrainingDay[];
  sessions: TrainingSession[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [dayContext, setDayContext] = useState("");
  const [editor, setEditor] = useState<{
    date: string;
    session?: TrainingSession;
  } | null>(null);
  const [quickEdit, setQuickEdit] = useState<TrainingSession | null>(null);
  const [quickFocus, setQuickFocus] = useState("");
  const [quickVolume, setQuickVolume] = useState("");
  const [quickRpe, setQuickRpe] = useState("");
  const [weekForm, setWeekForm] = useState<Microcycle | null>(null);
  const [mobileMode, setMobileMode] = useState<"day" | "week">("week");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const selected =
    microcycles.find((item) => item.id === selectedId) ?? microcycles[0];
  if (!selected)
    return (
      <section className="week-view week-empty">
        <p className="eyebrow">Training · Woche</p>
        <h3>Noch keine Trainingswoche</h3>
        <p>Lege zuerst einen Mikrozyklus an.</p>
      </section>
    );
  const dates = sevenDays(selected.startDate);
  const todayIndex = dates.indexOf(new Date().toISOString().slice(0, 10));
  const activeDayIndex = selectedDayIndex ?? (todayIndex >= 0 ? todayIndex : 0);
  const meso = mesocycles.find((item) => item.id === selected.mesocycleId);
  const weekIndex = microcycles.findIndex((item) => item.id === selected.id);

  function moveWeek(offset: number) {
    const next = microcycles[weekIndex + offset];
    if (next) {
      setSelectedId(next.id);
      setSelectedDayIndex(null);
    }
  }

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
  function openDay(date: string) {
    setDayDate(date);
    setDayContext(days.find((day) => day.date === date)?.dayContext ?? "");
  }
  function startQuickEdit(session: TrainingSession) {
    setQuickEdit(session);
    setQuickFocus(session.mainFocusId ?? "");
    setQuickVolume(session.volumeMeters?.toString() ?? "");
    setQuickRpe(session.expectedRpe?.toString() ?? "");
  }
  async function saveQuickEdit(event: FormEvent) {
    event.preventDefault();
    if (!quickEdit) return;
    await service.saveTrainingSession(
      season.id,
      {
        trainingDayId: quickEdit.trainingDayId,
        title: quickEdit.title ?? "",
        startTime: quickEdit.startTime ?? "",
        durationMinutes: quickEdit.durationMinutes,
        volumeMeters: opt(quickVolume),
        expectedRpe: opt(quickRpe),
        mainFocusId: quickFocus,
        technicalFocusId: quickEdit.technicalFocusId ?? "",
        keySession: quickEdit.keySession,
        athleteNote: quickEdit.athleteNote ?? "",
        equipment: quickEdit.equipment ?? "",
        status: quickEdit.status,
      },
      quickEdit,
    );
    setQuickEdit(null);
    await onChange();
  }
  async function saveWeek(event: FormEvent) {
    event.preventDefault();
    if (!weekForm) return;
    await service.updateMicrocycle(selected, {
      mesocycleId: weekForm.mesocycleId,
      name: weekForm.name,
      startDate: weekForm.startDate,
      endDate: weekForm.endDate,
      targetRpe: weekForm.targetRpe,
      targetVolumeMeters: weekForm.targetVolumeMeters,
      goal: weekForm.goal,
    });
    await onChange();
    setWeekForm(null);
  }

  return (
    <section className="week-view" aria-labelledby="trainer-week-title">
      <div className="week-toolbar">
        <div>
          <p className="eyebrow">Training · Woche</p>
          <h3 id="trainer-week-title">Trainer-Wochenansicht</h3>
        </div>
        <label className="week-picker">
          <span>Woche wählen</span>
          <select
            value={selected.id}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setSelectedDayIndex(null);
            }}
          >
            {microcycles.map((item) => (
              <option key={item.id} value={item.id}>
                KW {isoWeek(item.startDate)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mobile-week-controls">
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Mobile Planungsansicht"
        >
          <button
            role="tab"
            aria-selected={mobileMode === "day"}
            className={mobileMode === "day" ? "active" : ""}
            onClick={() => setMobileMode("day")}
          >
            Tag
          </button>
          <button
            role="tab"
            aria-selected={mobileMode === "week"}
            className={mobileMode === "week" ? "active" : ""}
            onClick={() => setMobileMode("week")}
          >
            Woche
          </button>
        </div>
        <div
          className="period-navigation"
          aria-label={
            mobileMode === "day" ? "Tagesnavigation" : "Wochennavigation"
          }
        >
          <button
            type="button"
            aria-label={
              mobileMode === "day" ? "Vorheriger Tag" : "Vorherige Woche"
            }
            disabled={
              mobileMode === "day" ? activeDayIndex === 0 : weekIndex <= 0
            }
            onClick={() =>
              mobileMode === "day"
                ? setSelectedDayIndex(Math.max(0, activeDayIndex - 1))
                : moveWeek(-1)
            }
          >
            ←
          </button>
          <strong>
            {mobileMode === "day"
              ? `${weekdays[activeDayIndex]}, ${formatDate(dates[activeDayIndex])}`
              : `KW ${isoWeek(selected.startDate)}`}
          </strong>
          <button
            type="button"
            aria-label={mobileMode === "day" ? "Nächster Tag" : "Nächste Woche"}
            disabled={
              mobileMode === "day"
                ? activeDayIndex === 6
                : weekIndex >= microcycles.length - 1
            }
            onClick={() =>
              mobileMode === "day"
                ? setSelectedDayIndex(Math.min(6, activeDayIndex + 1))
                : moveWeek(1)
            }
          >
            →
          </button>
        </div>
      </div>
      <button
        className="week-summary"
        type="button"
        onClick={() => setWeekForm(selected)}
      >
        <span className="week-number">
          <small>Kalenderwoche</small>
          <strong>KW {isoWeek(selected.startDate)}</strong>
        </span>
        <span>
          <small>Mesozyklus</small>
          <strong>{meso?.name ?? "–"}</strong>
        </span>
        <span>
          <small>Target RPE</small>
          <strong>
            {selected.targetRpe ?? "–"}
            <i>/10</i>
          </strong>
        </span>
        <span>
          <small>Target Volume</small>
          <strong>{volume(selected.targetVolumeMeters)}</strong>
        </span>
        <span className="week-goal">
          <small>Wochenziel</small>
          <strong>{selected.goal}</strong>
        </span>
        <span className="edit-cue">Bearbeiten ↗</span>
      </button>
      <div className="week-load">
        <span style={{ width: `${(selected.targetRpe ?? 0) * 10}%` }} />
      </div>
      <div
        className={`day-grid mobile-${mobileMode}`}
        style={{ "--selected-day": activeDayIndex } as React.CSSProperties}
      >
        {dates.map((date, index) => {
          const day = days.find((item) => item.date === date);
          const entries = sessions.filter(
            (item) => item.trainingDayId === day?.id,
          );
          const constraintWarning = (date: string): string | null => {
            const match = constraints.find(
              (item) => item.startDate <= date && item.endDate >= date,
            );
            if (!match) return null;
            return "Dieser Trainingstermin liegt innerhalb einer Kalenderrestriktion.";
          };

          return (
            <article className={`day-lane day-${index}`} key={date}>
              <header className="day-heading">
                <div>
                  <strong>{weekdays[index]}</strong>
                  <span>{formatDate(date)}</span>
                </div>
                <span className="session-count">{entries.length}</span>
              </header>
              <button
                className="day-context"
                type="button"
                onClick={() => openDay(date)}
              >
                <small>Day Context</small>
                <span>{day?.dayContext || "Kontext hinzufügen"}</span>
              </button>
              <div className="day-sessions">
                {entries.map((session) =>
                  quickEdit?.id === session.id ? (
                    <form
                      key={session.id}
                      className="session-quick-edit"
                      onSubmit={saveQuickEdit}
                    >
                      <label className="field">
                        <span>Main Focus</span>
                        <select
                          value={quickFocus}
                          onChange={(e) => setQuickFocus(e.target.value)}
                        >
                          <option value="">Kein Fokus</option>
                          {focusDefinitions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>RPE</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={quickRpe}
                          onChange={(e) => setQuickRpe(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Umfang (m)</span>
                        <input
                          type="number"
                          min="0"
                          value={quickVolume}
                          onChange={(e) => setQuickVolume(e.target.value)}
                        />
                      </label>
                      <div className="quick-edit-actions">
                        <button className="button primary" type="submit">
                          Speichern
                        </button>
                        <button
                          className="button quiet"
                          type="button"
                          onClick={() => setQuickEdit(null)}
                        >
                          Abbrechen
                        </button>
                        <button
                          className="button quiet"
                          type="button"
                          onClick={() => {
                            setQuickEdit(null);
                            setEditor({
                              date: dates[index],
                              session,
                            });
                          }}
                        >
                          Mehr bearbeiten
                        </button>
                      </div>
                    </form>
                  ) : (
                    <SessionCard
                      key={session.id}
                      session={session}
                      focusDefinitions={focusDefinitions}
                      warning={
                        session.generatedFromSchedule
                          ? constraintWarning(dates[index])
                          : null
                      }
                      onClick={() => startQuickEdit(session)}
                    />
                  ),
                )}
              </div>
              <button
                className="add-session"
                type="button"
                onClick={() => setEditor({ date })}
              >
                ＋ Session
              </button>
            </article>
          );
        })}
      </div>
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
      {weekForm && (
        <Modal close={() => setWeekForm(null)}>
          <form className="editor-sheet" onSubmit={saveWeek}>
            <Head
              title="Wochenkopf bearbeiten"
              close={() => setWeekForm(null)}
            />
            <div className="editor-grid">
              <Field label="Mesozyklus">
                <select
                  value={weekForm.mesocycleId}
                  onChange={(event) =>
                    setWeekForm({
                      ...weekForm,
                      mesocycleId: event.target.value,
                    })
                  }
                >
                  {mesocycles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Target RPE">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={weekForm.targetRpe ?? ""}
                  onChange={(event) =>
                    setWeekForm({
                      ...weekForm,
                      targetRpe: opt(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Target Volume">
                <input
                  type="number"
                  min="0"
                  value={weekForm.targetVolumeMeters ?? ""}
                  onChange={(event) =>
                    setWeekForm({
                      ...weekForm,
                      targetVolumeMeters: opt(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Wochenziel" wide>
                <textarea
                  value={weekForm.goal}
                  onChange={(event) =>
                    setWeekForm({ ...weekForm, goal: event.target.value })
                  }
                />
              </Field>
            </div>
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
