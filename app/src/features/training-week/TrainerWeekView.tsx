import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  FocusDefinition,
  Mesocycle,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import type { TrainingSessionInput } from "../../lib/validation/domain";

const weekdays = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];
const emptySession: TrainingSessionInput = {
  trainingDayId: "",
  title: "",
  startTime: "",
  durationMinutes: undefined,
  volumeMeters: undefined,
  expectedRpe: undefined,
  mainFocusId: "",
  technicalFocusId: "",
  keySession: false,
  athleteNote: "",
  equipment: "",
};

export function TrainerWeekView({
  season,
  microcycles,
  mesocycles,
  focusDefinitions,
  days,
  sessions,
  service,
  onChange,
}: {
  season: Season;
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  focusDefinitions: FocusDefinition[];
  days: TrainingDay[];
  sessions: TrainingSession[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [dayContext, setDayContext] = useState("");
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrainingSession>();
  const [form, setForm] = useState(emptySession);
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
  function openSession(date: string, session?: TrainingSession) {
    const day = days.find((item) => item.date === date);
    setSessionDate(date);
    setEditing(session);
    setForm(
      session
        ? {
            trainingDayId: session.trainingDayId,
            title: session.title ?? "",
            startTime: session.startTime ?? "",
            durationMinutes: session.durationMinutes,
            volumeMeters: session.volumeMeters,
            expectedRpe: session.expectedRpe,
            mainFocusId: session.mainFocusId ?? "",
            technicalFocusId: session.technicalFocusId ?? "",
            keySession: session.keySession,
            athleteNote: session.athleteNote ?? "",
            equipment: session.equipment ?? "",
          }
        : { ...emptySession, trainingDayId: day?.id ?? "" },
    );
  }
  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!sessionDate) return;
    let day = days.find((item) => item.date === sessionDate);
    if (!day)
      day = await service.createTrainingDay(season.id, {
        date: sessionDate,
        dayContext: "",
        notes: "",
      });
    await service.saveTrainingSession(
      season.id,
      { ...form, trainingDayId: day.id },
      editing,
    );
    await onChange();
    setSessionDate(null);
  }
  async function removeSession() {
    if (!editing) return;
    await service.deleteTrainingSession(season.id, editing);
    await onChange();
    setSessionDate(null);
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
            {selected.targetRpe}
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
        <span style={{ width: `${selected.targetRpe * 10}%` }} />
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
                {entries.map((session) => (
                  <button
                    className={`session-card${session.keySession ? " key" : ""}`}
                    type="button"
                    key={session.id}
                    onClick={() => openSession(date, session)}
                  >
                    <span className="session-topline">
                      <strong>{session.startTime || "Zeit offen"}</strong>
                      {session.keySession && <em>KEY</em>}
                    </span>
                    <span className="session-title">
                      {session.title || "Session"}
                    </span>
                    <span className="session-metrics">
                      <span>
                        <small>Dauer</small>
                        {session.durationMinutes
                          ? `${session.durationMinutes} min`
                          : "–"}
                      </span>
                      <span>
                        <small>Umfang</small>
                        {volume(session.volumeMeters)}
                      </span>
                      <span>
                        <small>RPE</small>
                        {session.expectedRpe ?? "–"}
                      </span>
                    </span>
                    <span className="session-focus">
                      <small>Main Focus</small>
                      {focus(focusDefinitions, session.mainFocusId)}
                    </span>
                    <span className="session-focus">
                      <small>Technical Focus</small>
                      {focus(focusDefinitions, session.technicalFocusId)}
                    </span>
                    {session.athleteNote && (
                      <span className="session-note">
                        {session.athleteNote}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                className="add-session"
                type="button"
                onClick={() => openSession(date)}
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
                  value={weekForm.targetRpe}
                  onChange={(event) =>
                    setWeekForm({
                      ...weekForm,
                      targetRpe: Number(event.target.value),
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
      {sessionDate && (
        <Modal close={() => setSessionDate(null)}>
          <form className="editor-sheet" onSubmit={saveSession}>
            <Head
              title={`${editing ? "Session bearbeiten" : "Session anlegen"} · ${formatDate(sessionDate)}`}
              close={() => setSessionDate(null)}
            />
            <div className="editor-grid three">
              <Field label="Titel" wide>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Uhrzeit">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm({ ...form, startTime: event.target.value })
                  }
                />
              </Field>
              <NumberField
                label="Dauer (min)"
                value={form.durationMinutes}
                set={(value) => setForm({ ...form, durationMinutes: value })}
              />
              <NumberField
                label="Umfang (m)"
                value={form.volumeMeters}
                set={(value) => setForm({ ...form, volumeMeters: value })}
              />
              <Field label="Main Focus">
                <Focus
                  value={form.mainFocusId}
                  items={focusDefinitions}
                  set={(value) => setForm({ ...form, mainFocusId: value })}
                />
              </Field>
              <Field label="Technical Focus">
                <Focus
                  value={form.technicalFocusId}
                  items={focusDefinitions}
                  set={(value) => setForm({ ...form, technicalFocusId: value })}
                />
              </Field>
              <NumberField
                label="Expected RPE"
                value={form.expectedRpe}
                set={(value) => setForm({ ...form, expectedRpe: value })}
              />
              <Field label="Equipment" wide>
                <input
                  value={form.equipment}
                  onChange={(event) =>
                    setForm({ ...form, equipment: event.target.value })
                  }
                />
              </Field>
              <Field label="Hinweis" wide>
                <textarea
                  value={form.athleteNote}
                  onChange={(event) =>
                    setForm({ ...form, athleteNote: event.target.value })
                  }
                />
              </Field>
              <label className="key-toggle">
                <input
                  type="checkbox"
                  checked={form.keySession}
                  onChange={(event) =>
                    setForm({ ...form, keySession: event.target.checked })
                  }
                />
                <span>
                  <strong>Key Session</strong>
                  <small>Zentrale Einheit der Woche</small>
                </span>
              </label>
            </div>
            <div className="editor-footer">
              {editing && (
                <button
                  className="button danger"
                  type="button"
                  onClick={() => void removeSession()}
                >
                  Session löschen
                </button>
              )}
              <button className="button primary">Session speichern</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
function Modal({
  close,
  children,
}: {
  close: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onClose = useEffectEvent(close);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("input, button, select, textarea")
      ?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']",
        ),
      ];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editor"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
function Head({ title, close }: { title: string; close: () => void }) {
  return (
    <div className="editor-heading">
      <h3>{title}</h3>
      <button
        className="icon-button"
        type="button"
        aria-label="Dialog schließen"
        title="Dialog schließen"
        onClick={close}
      >
        ×
      </button>
    </div>
  );
}
function Save() {
  return (
    <div className="editor-footer">
      <button className="button primary">Änderungen speichern</button>
    </div>
  );
}
function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  set,
}: {
  label: string;
  value?: number;
  set: (value?: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(event) => set(opt(event.target.value))}
      />
    </Field>
  );
}
function Focus({
  value,
  items,
  set,
}: {
  value: string;
  items: FocusDefinition[];
  set: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => set(event.target.value)}>
      <option value="">Kein Fokus</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
function sevenDays(value: string) {
  const start = new Date(`${value}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}
function isoWeek(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}
function volume(value?: number) {
  return value === undefined
    ? "–"
    : `${new Intl.NumberFormat("de-DE").format(value)} m`;
}
function focus(items: FocusDefinition[], id?: string) {
  return items.find((item) => item.id === id)?.name ?? "–";
}
function opt(value: string) {
  return value === "" ? undefined : Number(value);
}
