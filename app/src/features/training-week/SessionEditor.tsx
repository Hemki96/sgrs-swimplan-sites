import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  FocusDefinition,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import type { TrainingSessionInput } from "../../lib/validation/domain";
import { formatDate, opt } from "./format";

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
  status: undefined,
};

export function SessionEditor({
  season,
  date,
  session,
  days,
  focusDefinitions,
  service,
  onSaved,
  onClose,
}: {
  season: Season;
  date: string;
  session?: TrainingSession;
  days: TrainingDay[];
  focusDefinitions: FocusDefinition[];
  service: SeasonPlanningService;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TrainingSessionInput>(() =>
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
          status: session.status,
        }
      : {
          ...emptySession,
          trainingDayId: days.find((item) => item.date === date)?.id ?? "",
        },
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    let day = days.find((item) => item.date === date);
    if (!day)
      day = await service.createTrainingDay(season.id, {
        date,
        dayContext: "",
        notes: "",
      });
    await service.saveTrainingSession(
      season.id,
      { ...form, trainingDayId: day.id },
      session,
    );
    await onSaved();
    onClose();
  }

  async function remove() {
    if (!session) return;
    await service.deleteTrainingSession(season.id, session);
    await onSaved();
    onClose();
  }

  return (
    <Modal close={onClose}>
      <form className="editor-sheet" onSubmit={(event) => void save(event)}>
        <Head
          title={`${session ? "Session bearbeiten" : "Session anlegen"} · ${formatDate(date)}`}
          close={onClose}
        />
        <div className="editor-grid three">
          {session?.generatedFromSchedule && (
            <p className="field-info wide">
              {session.scheduleDetached
                ? "Dieser Standardtermin wurde individuell verändert und folgt nicht mehr dem Template."
                : "Dieser Termin stammt aus einem wiederkehrenden Standardtraining."}
            </p>
          )}
          <Field label="Main Focus">
            <Focus
              value={form.mainFocusId}
              items={focusDefinitions}
              set={(value) => setForm({ ...form, mainFocusId: value })}
            />
          </Field>
          <NumberField
            label="Umfang (m)"
            value={form.volumeMeters}
            set={(value) => setForm({ ...form, volumeMeters: value })}
          />
          <NumberField
            label="Expected RPE"
            value={form.expectedRpe}
            set={(value) => setForm({ ...form, expectedRpe: value })}
          />
          <Field label="Hinweis" wide>
            <textarea
              value={form.athleteNote}
              onChange={(event) =>
                setForm({ ...form, athleteNote: event.target.value })
              }
            />
          </Field>
          <details className="editor-advanced" open={advancedOpen}>
            <summary
              onClick={(e) => {
                e.preventDefault();
                setAdvancedOpen((open) => !open);
              }}
            >
              Weitere Optionen
            </summary>
            <div className="editor-grid">
              <Field label="Titel">
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
              <Field label="Technical Focus">
                <Focus
                  value={form.technicalFocusId}
                  items={focusDefinitions}
                  set={(value) => setForm({ ...form, technicalFocusId: value })}
                />
              </Field>
              <Field label="Equipment">
                <input
                  value={form.equipment}
                  onChange={(event) =>
                    setForm({ ...form, equipment: event.target.value })
                  }
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status ?? "planned"}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target.value === "cancelled"
                          ? "cancelled"
                          : undefined,
                    })
                  }
                >
                  <option value="planned">Geplant</option>
                  <option value="cancelled">Ausgefallen</option>
                </select>
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
          </details>
        </div>
        <div className="editor-footer">
          {session && (
            <button
              className="button danger"
              type="button"
              onClick={() => void remove()}
            >
              Session löschen
            </button>
          )}
          <button className="button primary">Session speichern</button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({
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

export function Head({ title, close }: { title: string; close: () => void }) {
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

export function Save() {
  return (
    <div className="editor-footer">
      <button className="button primary">Änderungen speichern</button>
    </div>
  );
}

export function Field({
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

export function NumberField({
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

export function Focus({
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
