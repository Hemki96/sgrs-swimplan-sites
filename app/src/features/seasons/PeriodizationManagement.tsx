import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { ZodError } from "zod";

import {
  PlanningValidationError,
  type SeasonPlanningService,
} from "../../lib/domain/seasonPlanning";
import type { UndoRequest } from "../../lib/domain/history";
import type {
  FocusDefinition,
  FocusSegment,
  PeriodizationDimension,
} from "../../lib/domain/types";
import {
  focusDefinitionInputSchema,
  focusSegmentInputSchema,
  periodizationDimensionInputSchema,
  type FocusDefinitionInput,
  type FocusSegmentInput,
  type PeriodizationDimensionInput,
} from "../../lib/validation/domain";

interface Props {
  seasonId: string;
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
  onNotice: (message: string, undo?: UndoRequest) => void;
}

const blankDimension: PeriodizationDimensionInput = {
  name: "",
  code: "",
  description: "",
  sortOrder: 0,
  active: true,
};
const blankDefinition: FocusDefinitionInput = {
  dimensionId: "",
  name: "",
  code: "",
  description: "",
  active: true,
};
const blankSegment: FocusSegmentInput = {
  dimensionId: "",
  focusDefinitionId: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export function PeriodizationManagement(props: Props) {
  return (
    <>
      <DimensionSection {...props} />
      <DefinitionSection {...props} />
      <SegmentSection {...props} />
    </>
  );
}

function DimensionSection({
  seasonId,
  dimensions,
  service,
  onChange,
  onNotice,
}: Props) {
  const [form, setForm] = useState(blankDimension);
  const [editing, setEditing] = useState<PeriodizationDimension | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = periodizationDimensionInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateDimension(editing, parsed.data);
      else await service.createDimension(seasonId, parsed.data);
      onNotice(
        editing ? "Dimension wurde aktualisiert." : "Dimension wurde angelegt.",
      );
      reset();
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function reset() {
    setEditing(null);
    setForm(blankDimension);
    setErrors({});
  }

  return (
    <Panel title="Periodisierungsdimensionen" count={dimensions.length}>
      <form className="entity-form" onSubmit={submit} noValidate>
        <Field label="Name" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Code" error={errors.code}>
          <input
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Beschreibung" error={errors.description} className="wide">
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Reihenfolge" error={errors.sortOrder}>
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: Number(e.target.value) })
            }
          />
        </Field>
        <label className="check-field">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{" "}
          Aktiv
        </label>
        <Actions
          editing={Boolean(editing)}
          createLabel="Dimension anlegen"
          editLabel="Dimension speichern"
          onCancel={reset}
        />
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
      </form>
      <div className="item-list">
        {dimensions.map((dimension) => (
          <article className="planning-item" key={dimension.id}>
            <div>
              <strong>{dimension.name}</strong>
              <span>
                {dimension.code} · Position {dimension.sortOrder} ·{" "}
                {dimension.active ? "aktiv" : "inaktiv"}
              </span>
              {dimension.description && <span>{dimension.description}</span>}
            </div>
            <ItemActions
              onEdit={() => {
                setEditing(dimension);
                setForm({
                  name: dimension.name,
                  code: dimension.code,
                  description: dimension.description ?? "",
                  sortOrder: dimension.sortOrder,
                  active: dimension.active,
                });
                setErrors({});
              }}
              onDelete={() => void remove(dimension)}
            />
          </article>
        ))}
      </div>
    </Panel>
  );

  async function remove(dimension: PeriodizationDimension) {
    try {
      await service.deleteDimension(dimension);
      onNotice("Dimension wurde gelöscht.", {
        collection: "periodization_dimensions",
        id: dimension.id,
      });
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }
}

function DefinitionSection({
  seasonId,
  dimensions,
  focusDefinitions,
  service,
  onChange,
  onNotice,
}: Props) {
  const [form, setForm] = useState(blankDefinition);
  const [editing, setEditing] = useState<FocusDefinition | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = focusDefinitionInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateFocusDefinition(editing, parsed.data);
      else await service.createFocusDefinition(seasonId, parsed.data);
      onNotice(
        editing
          ? "Fokusdefinition wurde aktualisiert."
          : "Fokusdefinition wurde angelegt.",
      );
      reset();
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }
  function reset() {
    setEditing(null);
    setForm(blankDefinition);
    setErrors({});
  }

  return (
    <Panel title="Focus Definitions" count={focusDefinitions.length}>
      {dimensions.length === 0 ? (
        <p className="hint">Lege zuerst eine Dimension an.</p>
      ) : (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Dimension" error={errors.dimensionId}>
            <select
              value={form.dimensionId}
              onChange={(e) =>
                setForm({ ...form, dimensionId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {dimensions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fokus" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Code" error={errors.code}>
            <input
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <Field label="Beschreibung" className="wide">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Aktiv
          </label>
          <Actions
            editing={Boolean(editing)}
            createLabel="Fokusdefinition anlegen"
            editLabel="Fokusdefinition speichern"
            onCancel={reset}
          />
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
        </form>
      )}
      <div className="item-list">
        {focusDefinitions.map((definition) => (
          <article className="planning-item" key={definition.id}>
            <div>
              <strong>{definition.name}</strong>
              <span>
                {dimensionName(dimensions, definition.dimensionId)} ·{" "}
                {definition.code} · {definition.active ? "aktiv" : "inaktiv"}
              </span>
            </div>
            <ItemActions
              onEdit={() => {
                setEditing(definition);
                setForm({
                  dimensionId: definition.dimensionId,
                  name: definition.name,
                  code: definition.code,
                  description: definition.description ?? "",
                  active: definition.active,
                });
                setErrors({});
              }}
              onDelete={() => void remove(definition)}
            />
          </article>
        ))}
      </div>
    </Panel>
  );

  async function remove(definition: FocusDefinition) {
    try {
      await service.deleteFocusDefinition(definition);
      onNotice("Fokusdefinition wurde gelöscht.", {
        collection: "focus_definitions",
        id: definition.id,
      });
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }
}

function SegmentSection({
  seasonId,
  dimensions,
  focusDefinitions,
  focusSegments,
  service,
  onChange,
  onNotice,
}: Props) {
  const [form, setForm] = useState(blankSegment);
  const [editing, setEditing] = useState<FocusSegment | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectableDimensions = useMemo(
    () => dimensions.filter((item) => item.active),
    [dimensions],
  );
  const selectableFocuses = focusDefinitions.filter(
    (item) => item.active && item.dimensionId === form.dimensionId,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = focusSegmentInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateFocusSegment(editing, parsed.data);
      else await service.createFocusSegment(seasonId, parsed.data);
      onNotice(
        editing
          ? "Fokussegment wurde aktualisiert."
          : "Fokussegment wurde angelegt.",
      );
      reset();
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }
  function reset() {
    setEditing(null);
    setForm(blankSegment);
    setErrors({});
  }

  return (
    <Panel title="Focus Segments" count={focusSegments.length}>
      <p className="hint">
        Segmente verschiedener Dimensionen dürfen sich zeitlich überschneiden.
      </p>
      <form className="entity-form" onSubmit={submit} noValidate>
        <Field label="Dimension" error={errors.dimensionId}>
          <select
            value={form.dimensionId}
            onChange={(e) =>
              setForm({
                ...form,
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
            value={form.focusDefinitionId}
            onChange={(e) =>
              setForm({ ...form, focusDefinitionId: e.target.value })
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
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
        <Field label="Enddatum" error={errors.endDate}>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </Field>
        <Field label="Notiz" className="wide">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <Actions
          editing={Boolean(editing)}
          createLabel="Fokussegment anlegen"
          editLabel="Fokussegment speichern"
          onCancel={reset}
        />
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
      </form>
      <div className="item-list">
        {focusSegments.map((segment) => (
          <article className="planning-item" key={segment.id}>
            <div>
              <strong>
                {focusName(focusDefinitions, segment.focusDefinitionId)}
              </strong>
              <span>
                {dimensionName(dimensions, segment.dimensionId)} ·{" "}
                {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
              </span>
              {segment.notes && <span>Notiz: {segment.notes}</span>}
            </div>
            <ItemActions
              onEdit={() => {
                setEditing(segment);
                setForm({
                  dimensionId: segment.dimensionId,
                  focusDefinitionId: segment.focusDefinitionId,
                  startDate: segment.startDate,
                  endDate: segment.endDate,
                  notes: segment.notes ?? "",
                });
                setErrors({});
              }}
              onDelete={() => void remove(segment)}
            />
          </article>
        ))}
      </div>
    </Panel>
  );

  async function remove(segment: FocusSegment) {
    try {
      await service.deleteFocusSegment(segment);
      onNotice("Fokussegment wurde gelöscht.", {
        collection: "focus_segments",
        id: segment.id,
      });
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="planning-section" aria-label={title}>
      <div className="section-heading">
        <h3>{title}</h3>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
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
function Actions({
  editing,
  createLabel,
  editLabel,
  onCancel,
}: {
  editing: boolean;
  createLabel: string;
  editLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="entity-actions">
      <button className="button primary" type="submit">
        {editing ? editLabel : createLabel}
      </button>
      {editing && (
        <button className="button quiet" type="button" onClick={onCancel}>
          Abbrechen
        </button>
      )}
    </div>
  );
}
function ItemActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card-actions">
      <button className="button quiet" type="button" onClick={onEdit}>
        Bearbeiten
      </button>
      <button className="button danger" type="button" onClick={onDelete}>
        Löschen
      </button>
    </div>
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
  return error instanceof PlanningValidationError || error instanceof Error
    ? error.message
    : "Die Änderung konnte nicht gespeichert werden. Bitte neu laden.";
}
function dimensionName(items: PeriodizationDimension[], id: string): string {
  return items.find((item) => item.id === id)?.name ?? "Unbekannte Dimension";
}
function focusName(items: FocusDefinition[], id: string): string {
  return items.find((item) => item.id === id)?.name ?? "Unbekannter Fokus";
}
function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
