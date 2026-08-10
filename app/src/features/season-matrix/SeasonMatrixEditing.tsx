import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ZodError } from "zod";

import {
  PlanningValidationError,
  type SeasonPlanningService,
} from "../../lib/domain/seasonPlanning";
import type {
  Event,
  EventTrack,
  FocusDefinition,
  Macrocycle,
  Mesocycle,
  Microcycle,
  PeriodizationDimension,
} from "../../lib/domain/types";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  focusSegmentInputSchema,
  macrocycleInputSchema,
  mesocycleInputSchema,
  microcycleInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type FocusSegmentInput,
  type MacrocycleInput,
  type MesocycleInput,
  type MicrocycleInput,
} from "../../lib/validation/domain";
import {
  blankMatrixInput,
  deleteMatrixEntity,
  matrixEditInput,
  matrixEntityLabel,
  saveMatrixEntity,
  type MatrixCreateContext,
  type MatrixDateRange,
  type MatrixEditingEntity,
  type MatrixEntityInput,
  type MatrixEntityKind,
} from "./matrixEditingModel";

export interface MatrixEditorDraft {
  kind: MatrixEntityKind;
  entity: MatrixEditingEntity | null;
  context: MatrixCreateContext;
  range: MatrixDateRange;
}

interface MatrixEditorDialogProps {
  draft: MatrixEditorDraft;
  seasonId: string;
  tracks: EventTrack[];
  events: Event[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  service: SeasonPlanningService;
  onSaved: (message: string) => void;
  onNotice: (message: string) => void;
  onClose: () => void;
}

export function MatrixEditorDialog({
  draft,
  seasonId,
  tracks,
  events,
  macrocycles,
  mesocycles,
  dimensions,
  focusDefinitions,
  service,
  onSaved,
  onNotice,
  onClose,
}: MatrixEditorDialogProps) {
  const { kind, entity } = draft;
  const label = matrixEntityLabel(kind);
  const [form, setForm] = useState<MatrixEntityInput>(() =>
    entity
      ? matrixEditInput(kind, entity)
      : blankMatrixInput(kind, draft.context, draft.range),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("input, button, select, textarea")
      ?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseEvent();
      if (event.key === "Tab" && dialog) trapTab(event, dialog);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);

  const selectableFocuses = focusDefinitions.filter(
    (item) => item.active && item.dimensionId === formAs(form).dimensionId,
  );
  const selectableDimensions = useMemo(
    () => dimensions.filter((item) => item.active),
    [dimensions],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseInput(kind, form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    try {
      await saveMatrixEntity({
        kind,
        service,
        seasonId,
        editing: entity,
        input: parsed.data,
      });
      onSaved(
        entity ? `${label} wurde aktualisiert.` : `${label} wurde angelegt.`,
      );
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entity) return;
    if (!window.confirm(`„${entityName(entity)}“ löschen?`)) return;
    setBusy(true);
    try {
      await deleteMatrixEntity(kind, service, entity);
      onSaved(`${label} wurde gelöscht.`);
    } catch (error) {
      onNotice(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="editor-sheet compact matrix-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="matrix-editor-title"
      >
        <div className="editor-heading">
          <h2 id="matrix-editor-title">
            {entity ? `${label} bearbeiten` : `${label} anlegen`}
          </h2>
          <button
            className="icon-button"
            aria-label="Dialog schließen"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <MatrixFields
              kind={kind}
              form={form}
              setForm={setForm}
              errors={errors}
              tracks={tracks}
              events={events}
              macrocycles={macrocycles}
              mesocycles={mesocycles}
              selectableDimensions={selectableDimensions}
              selectableFocuses={selectableFocuses}
            />
          </div>
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="editor-footer">
            {entity && (
              <button
                type="button"
                className="button danger"
                disabled={busy}
                onClick={() => void remove()}
              >
                Löschen
              </button>
            )}
            <button type="button" className="button quiet" onClick={onClose}>
              Abbrechen
            </button>
            <button className="button primary" disabled={busy}>
              {busy
                ? "Speichert …"
                : entity
                  ? `${label} speichern`
                  : `${label} anlegen`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MatrixFields({
  kind,
  form,
  setForm,
  errors,
  tracks,
  events,
  macrocycles,
  mesocycles,
  selectableDimensions,
  selectableFocuses,
}: {
  kind: MatrixEntityKind;
  form: MatrixEntityInput;
  setForm: (value: MatrixEntityInput) => void;
  errors: Record<string, string>;
  tracks: EventTrack[];
  events: Event[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  selectableDimensions: PeriodizationDimension[];
  selectableFocuses: FocusDefinition[];
}) {
  switch (kind) {
    case "event": {
      const values = formAs(form);
      return (
        <>
          <Field label="Eventspur" error={errors.trackId}>
            <select
              value={values.trackId}
              onChange={(e) => setForm({ ...values, trackId: e.target.value })}
            >
              <option value="">Bitte wählen</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" error={errors.name}>
            <input
              value={values.name}
              onChange={(e) => setForm({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Priorität" error={errors.priority}>
            <select
              value={values.priority}
              onChange={(e) =>
                setForm({
                  ...values,
                  priority: e.target.value as EventInput["priority"],
                })
              }
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="test">Test</option>
            </select>
          </Field>
          <Field label="Kategorie">
            <input
              value={values.category}
              onChange={(e) => setForm({ ...values, category: e.target.value })}
            />
          </Field>
          <Field label="Ort">
            <input
              value={values.location}
              onChange={(e) => setForm({ ...values, location: e.target.value })}
            />
          </Field>
          <Field label="Ziel">
            <input
              value={values.goal}
              onChange={(e) => setForm({ ...values, goal: e.target.value })}
            />
          </Field>
          <Field label="Notizen" className="wide">
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setForm({ ...values, notes: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "constraint": {
      const values = formAs(form);
      return (
        <>
          <Field label="Typ" error={errors.type}>
            <input
              value={values.type}
              onChange={(e) => setForm({ ...values, type: e.target.value })}
            />
          </Field>
          <Field label="Name" error={errors.name}>
            <input
              value={values.name}
              onChange={(e) => setForm({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Auswirkung" error={errors.severity}>
            <input
              value={values.severity}
              onChange={(e) => setForm({ ...values, severity: e.target.value })}
            />
          </Field>
          <Field label="Notizen" className="wide">
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setForm({ ...values, notes: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "macrocycle": {
      const values = formAs(form);
      return (
        <>
          <Field label="Name" error={errors.name}>
            <input
              value={values.name}
              onChange={(e) => setForm({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Zielwettkampf" error={errors.targetEventId}>
            <select
              value={values.targetEventId ?? ""}
              onChange={(e) =>
                setForm({
                  ...values,
                  targetEventId: e.target.value || undefined,
                })
              }
            >
              <option value="">Kein Zielwettkampf</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Ziel" error={errors.goal} className="wide">
            <textarea
              rows={2}
              value={values.goal}
              onChange={(e) => setForm({ ...values, goal: e.target.value })}
            />
          </Field>
          <Field label="Notiz" error={errors.notes} className="wide">
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setForm({ ...values, notes: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "mesocycle": {
      const values = formAs(form);
      return (
        <>
          <Field label="Makrozyklus" error={errors.macrocycleId}>
            <select
              value={values.macrocycleId}
              onChange={(e) =>
                setForm({ ...values, macrocycleId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {macrocycles.map((macrocycle) => (
                <option key={macrocycle.id} value={macrocycle.id}>
                  {macrocycle.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" error={errors.name}>
            <input
              value={values.name}
              onChange={(e) => setForm({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Ziel" error={errors.goal} className="wide">
            <textarea
              rows={2}
              value={values.goal}
              onChange={(e) => setForm({ ...values, goal: e.target.value })}
            />
          </Field>
          <Field label="Notiz" error={errors.notes} className="wide">
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setForm({ ...values, notes: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "focusSegment": {
      const values = formAs(form);
      return (
        <>
          <Field label="Dimension" error={errors.dimensionId}>
            <select
              value={values.dimensionId}
              onChange={(e) =>
                setForm({
                  ...values,
                  dimensionId: e.target.value,
                  focusDefinitionId: "",
                })
              }
            >
              <option value="">Bitte wählen</option>
              {selectableDimensions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fokus" error={errors.focusDefinitionId}>
            <select
              value={values.focusDefinitionId}
              onChange={(e) =>
                setForm({ ...values, focusDefinitionId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {selectableFocuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Notiz" className="wide">
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setForm({ ...values, notes: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "microcycle": {
      const values = formAs(form);
      return (
        <>
          <Field label="Mesozyklus" error={errors.mesocycleId}>
            <select
              value={values.mesocycleId}
              onChange={(e) =>
                setForm({ ...values, mesocycleId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {mesocycles.map((mesocycle) => (
                <option key={mesocycle.id} value={mesocycle.id}>
                  {mesocycle.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name/KW" error={errors.name}>
            <input
              value={values.name}
              onChange={(e) => setForm({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) =>
                setForm({ ...values, startDate: e.target.value })
              }
            />
          </Field>
          <Field label="Enddatum" error={errors.endDate}>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => setForm({ ...values, endDate: e.target.value })}
            />
          </Field>
          <Field label="Target RPE" error={errors.targetRpe}>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={values.targetRpe}
              onChange={(e) =>
                setForm({ ...values, targetRpe: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Zielumfang in Metern" error={errors.targetVolumeMeters}>
            <input
              type="number"
              min="0"
              value={values.targetVolumeMeters ?? ""}
              onChange={(e) =>
                setForm({
                  ...values,
                  targetVolumeMeters:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Ziel" error={errors.goal} className="wide">
            <textarea
              rows={2}
              value={values.goal}
              onChange={(e) => setForm({ ...values, goal: e.target.value })}
            />
          </Field>
        </>
      );
    }
  }
}

export function RpeInlineEditor({
  microcycle,
  service,
  onSaved,
  onNotice,
}: {
  microcycle: Microcycle;
  service: SeasonPlanningService;
  onSaved: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(String(microcycle.targetRpe));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) inputRef.current?.select();
  }, [active]);

  async function commit() {
    setActive(false);
    const parsed = microcycleInputSchema.shape.targetRpe.safeParse(
      Number(value),
    );
    if (!parsed.success) {
      setValue(String(microcycle.targetRpe));
      return;
    }
    if (parsed.data === microcycle.targetRpe) return;
    try {
      const input = matrixEditInput(
        "microcycle",
        microcycle,
      ) as MicrocycleInput;
      await service.updateMicrocycle(microcycle, {
        ...input,
        targetRpe: parsed.data,
      });
      onSaved("Mikrozyklus wurde aktualisiert.");
    } catch (error) {
      setValue(String(microcycle.targetRpe));
      onNotice(errorMessage(error));
    }
  }

  if (active) {
    return (
      <input
        ref={inputRef}
        className="rpe-inline-editor"
        type="number"
        min="1"
        max="10"
        step="1"
        aria-label="Target RPE bearbeiten"
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") {
            setValue(String(microcycle.targetRpe));
            setActive(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="rpe-inline-trigger"
      aria-label="Target RPE ändern"
      onClick={(e) => {
        e.stopPropagation();
        setValue(String(microcycle.targetRpe));
        setActive(true);
      }}
    >
      {microcycle.targetRpe}
    </button>
  );
}

function formAs(
  form: MatrixEntityInput,
): EventInput &
  CalendarConstraintInput &
  MacrocycleInput &
  MesocycleInput &
  FocusSegmentInput &
  MicrocycleInput {
  return form as EventInput &
    CalendarConstraintInput &
    MacrocycleInput &
    MesocycleInput &
    FocusSegmentInput &
    MicrocycleInput;
}

function parseInput(kind: MatrixEntityKind, form: MatrixEntityInput) {
  switch (kind) {
    case "event":
      return eventInputSchema.safeParse(form);
    case "constraint":
      return calendarConstraintInputSchema.safeParse(form);
    case "macrocycle":
      return macrocycleInputSchema.safeParse(form);
    case "mesocycle":
      return mesocycleInputSchema.safeParse(form);
    case "focusSegment":
      return focusSegmentInputSchema.safeParse(form);
    case "microcycle":
      return microcycleInputSchema.safeParse(form);
  }
}

function entityName(entity: MatrixEditingEntity): string {
  return "name" in entity ? entity.name : "Eintrag";
}

function trapTab(event: KeyboardEvent, container: HTMLElement) {
  const controls = [
    ...container.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']",
    ),
  ];
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function fieldErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof PlanningValidationError || error instanceof Error)
    return error.message;
  return "Die Änderung konnte nicht gespeichert werden. Bitte neu laden.";
}
