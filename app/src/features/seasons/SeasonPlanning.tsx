import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ZodError } from "zod";

import {
  PlanningValidationError,
  SeasonPlanningService,
} from "../../lib/domain/seasonPlanning";
import type {
  CalendarConstraint,
  Event,
  EventTrack,
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  MicrocycleSegment,
  PeriodizationDimension,
  Season,
} from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  macrocycleInputSchema,
  mesocycleInputSchema,
  microcycleInputSchema,
  microcycleSegmentInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
  type MacrocycleInput,
  type MesocycleInput,
  type MicrocycleInput,
  type MicrocycleSegmentInput,
} from "../../lib/validation/domain";
import { PeriodizationManagement } from "./PeriodizationManagement";

const blankTrack: EventTrackInput = { name: "", sortOrder: 0, visible: true };
const blankEvent: EventInput = {
  trackId: "",
  name: "",
  startDate: "",
  endDate: "",
  priority: "B",
  category: "",
  location: "",
  goal: "",
  notes: "",
};
const blankConstraint: CalendarConstraintInput = {
  type: "Ferien",
  name: "",
  startDate: "",
  endDate: "",
  notes: "",
  severity: "Hinweis",
};
const blankMacrocycle: MacrocycleInput = {
  name: "",
  startDate: "",
  endDate: "",
  goal: "",
  targetEventId: undefined,
  notes: "",
};
const blankMesocycle: MesocycleInput = {
  macrocycleId: "",
  name: "",
  startDate: "",
  endDate: "",
  goal: "",
  notes: "",
};
const blankMicrocycle: MicrocycleInput = {
  mesocycleId: "",
  name: "",
  startDate: "",
  endDate: "",
  goal: "",
  targetRpe: 5,
  targetVolumeMeters: undefined,
};
const blankMicrocycleSegment: MicrocycleSegmentInput = {
  microcycleId: "",
  name: "",
  startDate: "",
  endDate: "",
  segmentType: "",
  sortOrder: 0,
};

export function SeasonPlanning({
  season,
  storage,
}: {
  season: Season;
  storage: StorageAdapter;
}) {
  const service = useMemo(() => new SeasonPlanningService(storage), [storage]);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [constraints, setConstraints] = useState<CalendarConstraint[]>([]);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [microcycleSegments, setMicrocycleSegments] = useState<
    MicrocycleSegment[]
  >([]);
  const [dimensions, setDimensions] = useState<PeriodizationDimension[]>([]);
  const [focusDefinitions, setFocusDefinitions] = useState<FocusDefinition[]>(
    [],
  );
  const [focusSegments, setFocusSegments] = useState<FocusSegment[]>([]);
  const [notice, setNotice] = useState("");

  async function reload() {
    const [
      nextTracks,
      nextEvents,
      nextConstraints,
      nextMacrocycles,
      nextMesocycles,
      nextMicrocycles,
      nextMicrocycleSegments,
      nextDimensions,
      nextFocusDefinitions,
      nextFocusSegments,
    ] = await Promise.all([
      service.listTracks(season.id),
      service.listEvents(season.id),
      service.listConstraints(season.id),
      service.listMacrocycles(season.id),
      service.listMesocycles(season.id),
      service.listMicrocycles(season.id),
      service.listMicrocycleSegments(season.id),
      service.listDimensions(season.id),
      service.listFocusDefinitions(season.id),
      service.listFocusSegments(season.id),
    ]);
    setTracks(nextTracks);
    setEvents(nextEvents);
    setConstraints(nextConstraints);
    setMacrocycles(nextMacrocycles);
    setMesocycles(nextMesocycles);
    setMicrocycles(nextMicrocycles);
    setMicrocycleSegments(nextMicrocycleSegments);
    setDimensions(nextDimensions);
    setFocusDefinitions(nextFocusDefinitions);
    setFocusSegments(nextFocusSegments);
  }

  useEffect(() => {
    let active = true;
    void service
      .initializeStandardPeriodization(season.id)
      .then(() =>
        Promise.all([
          service.listTracks(season.id),
          service.listEvents(season.id),
          service.listConstraints(season.id),
          service.listMacrocycles(season.id),
          service.listMesocycles(season.id),
          service.listMicrocycles(season.id),
          service.listMicrocycleSegments(season.id),
          service.listDimensions(season.id),
          service.listFocusDefinitions(season.id),
          service.listFocusSegments(season.id),
        ]),
      )
      .then(
        ([
          nextTracks,
          nextEvents,
          nextConstraints,
          nextMacrocycles,
          nextMesocycles,
          nextMicrocycles,
          nextMicrocycleSegments,
          nextDimensions,
          nextFocusDefinitions,
          nextFocusSegments,
        ]) => {
          if (!active) return;
          setTracks(nextTracks);
          setEvents(nextEvents);
          setConstraints(nextConstraints);
          setMacrocycles(nextMacrocycles);
          setMesocycles(nextMesocycles);
          setMicrocycles(nextMicrocycles);
          setMicrocycleSegments(nextMicrocycleSegments);
          setDimensions(nextDimensions);
          setFocusDefinitions(nextFocusDefinitions);
          setFocusSegments(nextFocusSegments);
        },
      );
    return () => {
      active = false;
    };
  }, [season.id, service]);

  return (
    <section className="planning" aria-labelledby="planning-title">
      <div className="planning-header">
        <div>
          <p className="eyebrow">Saisonplanung</p>
          <h2 id="planning-title">{season.name}</h2>
          <p>
            {formatDate(season.startDate)} – {formatDate(season.endDate)}
          </p>
        </div>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <TrackSection
        tracks={tracks}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <EventSection
        events={events}
        tracks={tracks}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <ConstraintSection
        constraints={constraints}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <MacrocycleSection
        macrocycles={macrocycles}
        events={events}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <MesocycleSection
        mesocycles={mesocycles}
        macrocycles={macrocycles}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <MicrocycleSection
        microcycles={microcycles}
        mesocycles={mesocycles}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <MicrocycleSegmentSection
        segments={microcycleSegments}
        microcycles={microcycles}
        service={service}
        seasonId={season.id}
        onChange={reload}
        onNotice={setNotice}
      />
      <PeriodizationManagement
        seasonId={season.id}
        dimensions={dimensions}
        focusDefinitions={focusDefinitions}
        focusSegments={focusSegments}
        service={service}
        onChange={reload}
        onNotice={setNotice}
      />
    </section>
  );
}

function MicrocycleSegmentSection({
  segments,
  microcycles,
  service,
  onChange,
  onNotice,
}: SectionProps & {
  segments: MicrocycleSegment[];
  microcycles: Microcycle[];
}) {
  const [form, setForm] = useState<MicrocycleSegmentInput>(
    blankMicrocycleSegment,
  );
  const [editing, setEditing] = useState<MicrocycleSegment | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = microcycleSegmentInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateMicrocycleSegment(editing, parsed.data);
      else await service.createMicrocycleSegment(parsed.data);
      onNotice(
        editing
          ? "Mikrozyklussegment wurde aktualisiert."
          : "Mikrozyklussegment wurde angelegt.",
      );
      setEditing(null);
      setForm(blankMicrocycleSegment);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(segment: MicrocycleSegment) {
    setEditing(segment);
    setForm({
      microcycleId: segment.microcycleId,
      name: segment.name,
      startDate: segment.startDate,
      endDate: segment.endDate,
      segmentType: segment.segmentType,
      sortOrder: segment.sortOrder,
    });
    setErrors({});
  }

  async function remove(segment: MicrocycleSegment) {
    try {
      await service.deleteMicrocycleSegment(segment);
      onNotice("Mikrozyklussegment wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <PlanningSection title="Mikrozyklussegmente" count={segments.length}>
      {microcycles.length === 0 ? (
        <p className="hint">Lege zuerst einen Mikrozyklus an.</p>
      ) : (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Mikrozyklus" error={errors.microcycleId}>
            <select
              value={form.microcycleId}
              onChange={(e) =>
                setForm({ ...form, microcycleId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {microcycles.map((microcycle) => (
                <option key={microcycle.id} value={microcycle.id}>
                  {microcycle.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          <Field label="Typ" error={errors.segmentType}>
            <input
              value={form.segmentType}
              onChange={(e) =>
                setForm({ ...form, segmentType: e.target.value })
              }
            />
          </Field>
          <Field label="Reihenfolge" error={errors.sortOrder}>
            <input
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
            />
          </Field>
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
          <div className="entity-actions">
            <button className="button primary" type="submit">
              {editing
                ? "Mikrozyklussegment speichern"
                : "Mikrozyklussegment anlegen"}
            </button>
            {editing && (
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blankMicrocycleSegment);
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}
      <div className="item-list">
        {segments.map((segment) => (
          <article className="planning-item" key={segment.id}>
            <div>
              <strong>{segment.name}</strong>
              <span>
                {microcycleName(microcycles, segment.microcycleId)} ·{" "}
                {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
              </span>
              <span>
                {segment.segmentType} · Reihenfolge {segment.sortOrder}
              </span>
            </div>
            <ItemActions
              onEdit={() => edit(segment)}
              onDelete={() => void remove(segment)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function MicrocycleSection({
  microcycles,
  mesocycles,
  service,
  onChange,
  onNotice,
}: SectionProps & { microcycles: Microcycle[]; mesocycles: Mesocycle[] }) {
  const [form, setForm] = useState<MicrocycleInput>(blankMicrocycle);
  const [editing, setEditing] = useState<Microcycle | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = microcycleInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateMicrocycle(editing, parsed.data);
      else await service.createMicrocycle(parsed.data);
      onNotice(
        editing
          ? "Mikrozyklus wurde aktualisiert."
          : "Mikrozyklus wurde angelegt.",
      );
      setEditing(null);
      setForm(blankMicrocycle);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(microcycle: Microcycle) {
    setEditing(microcycle);
    setForm({
      mesocycleId: microcycle.mesocycleId,
      name: microcycle.name,
      startDate: microcycle.startDate,
      endDate: microcycle.endDate,
      goal: microcycle.goal,
      targetRpe: microcycle.targetRpe,
      targetVolumeMeters: microcycle.targetVolumeMeters,
    });
    setErrors({});
  }

  async function remove(microcycle: Microcycle) {
    try {
      await service.deleteMicrocycle(microcycle);
      onNotice("Mikrozyklus wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <PlanningSection title="Mikrozyklen" count={microcycles.length}>
      {mesocycles.length === 0 ? (
        <p className="hint">Lege zuerst einen Mesozyklus an.</p>
      ) : (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Mesozyklus" error={errors.mesocycleId}>
            <select
              value={form.mesocycleId}
              onChange={(e) =>
                setForm({ ...form, mesocycleId: e.target.value })
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          <Field label="Target RPE" error={errors.targetRpe}>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={form.targetRpe}
              onChange={(e) =>
                setForm({ ...form, targetRpe: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Zielumfang in Metern" error={errors.targetVolumeMeters}>
            <input
              type="number"
              min="0"
              value={form.targetVolumeMeters ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetVolumeMeters:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Ziel" error={errors.goal} className="wide">
            <textarea
              rows={2}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </Field>
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
          <div className="entity-actions">
            <button className="button primary" type="submit">
              {editing ? "Mikrozyklus speichern" : "Mikrozyklus anlegen"}
            </button>
            {editing && (
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blankMicrocycle);
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}
      <div className="item-list">
        {microcycles.map((microcycle) => (
          <article className="planning-item" key={microcycle.id}>
            <div>
              <strong>{microcycle.name}</strong>
              <span>
                {mesocycleName(mesocycles, microcycle.mesocycleId)} ·{" "}
                {formatDate(microcycle.startDate)} –{" "}
                {formatDate(microcycle.endDate)}
              </span>
              <span>
                Target RPE {microcycle.targetRpe}
                {microcycle.targetVolumeMeters === undefined
                  ? ""
                  : ` · ${microcycle.targetVolumeMeters} m`}
              </span>
              <span>Ziel: {microcycle.goal}</span>
            </div>
            <ItemActions
              onEdit={() => edit(microcycle)}
              onDelete={() => void remove(microcycle)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function MesocycleSection({
  mesocycles,
  macrocycles,
  service,
  onChange,
  onNotice,
}: SectionProps & { mesocycles: Mesocycle[]; macrocycles: Macrocycle[] }) {
  const [form, setForm] = useState<MesocycleInput>(blankMesocycle);
  const [editing, setEditing] = useState<Mesocycle | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = mesocycleInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateMesocycle(editing, parsed.data);
      else await service.createMesocycle(parsed.data);
      onNotice(
        editing
          ? "Mesozyklus wurde aktualisiert."
          : "Mesozyklus wurde angelegt.",
      );
      setEditing(null);
      setForm(blankMesocycle);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(mesocycle: Mesocycle) {
    setEditing(mesocycle);
    setForm({
      macrocycleId: mesocycle.macrocycleId,
      name: mesocycle.name,
      startDate: mesocycle.startDate,
      endDate: mesocycle.endDate,
      goal: mesocycle.goal,
      notes: mesocycle.notes,
    });
    setErrors({});
  }

  async function remove(mesocycle: Mesocycle) {
    try {
      await service.deleteMesocycle(mesocycle);
      onNotice("Mesozyklus wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <PlanningSection title="Mesozyklen" count={mesocycles.length}>
      {macrocycles.length === 0 ? (
        <p className="hint">Lege zuerst einen Makrozyklus an.</p>
      ) : (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Makrozyklus" error={errors.macrocycleId}>
            <select
              value={form.macrocycleId}
              onChange={(e) =>
                setForm({ ...form, macrocycleId: e.target.value })
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          <Field label="Ziel" error={errors.goal} className="wide">
            <textarea
              rows={2}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </Field>
          <Field label="Notiz" error={errors.notes} className="wide">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
          <div className="entity-actions">
            <button className="button primary" type="submit">
              {editing ? "Mesozyklus speichern" : "Mesozyklus anlegen"}
            </button>
            {editing && (
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blankMesocycle);
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}
      <div className="item-list">
        {mesocycles.map((mesocycle) => (
          <article className="planning-item" key={mesocycle.id}>
            <div>
              <strong>{mesocycle.name}</strong>
              <span>
                {macrocycleName(macrocycles, mesocycle.macrocycleId)} ·{" "}
                {formatDate(mesocycle.startDate)} –{" "}
                {formatDate(mesocycle.endDate)}
              </span>
              <span>Ziel: {mesocycle.goal}</span>
              <span>Notiz: {mesocycle.notes}</span>
            </div>
            <ItemActions
              onEdit={() => edit(mesocycle)}
              onDelete={() => void remove(mesocycle)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function MacrocycleSection({
  macrocycles,
  events,
  service,
  seasonId,
  onChange,
  onNotice,
}: SectionProps & { macrocycles: Macrocycle[]; events: Event[] }) {
  const [form, setForm] = useState<MacrocycleInput>(blankMacrocycle);
  const [editing, setEditing] = useState<Macrocycle | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = macrocycleInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateMacrocycle(editing, parsed.data);
      else await service.createMacrocycle(seasonId, parsed.data);
      onNotice(
        editing
          ? "Makrozyklus wurde aktualisiert."
          : "Makrozyklus wurde angelegt.",
      );
      setEditing(null);
      setForm(blankMacrocycle);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(macrocycle: Macrocycle) {
    setEditing(macrocycle);
    setForm({
      name: macrocycle.name,
      startDate: macrocycle.startDate,
      endDate: macrocycle.endDate,
      goal: macrocycle.goal,
      targetEventId: macrocycle.targetEventId,
      notes: macrocycle.notes,
    });
    setErrors({});
  }

  async function remove(macrocycle: Macrocycle) {
    try {
      await service.deleteMacrocycle(macrocycle);
      onNotice("Makrozyklus wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <PlanningSection title="Makrozyklen" count={macrocycles.length}>
      <form className="entity-form" onSubmit={submit} noValidate>
        <Field label="Name" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Zielwettkampf" error={errors.targetEventId}>
          <select
            value={form.targetEventId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
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
        <Field label="Ziel" error={errors.goal} className="wide">
          <textarea
            rows={2}
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
          />
        </Field>
        <Field label="Notiz" error={errors.notes} className="wide">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
        <div className="entity-actions">
          <button className="button primary" type="submit">
            {editing ? "Makrozyklus speichern" : "Makrozyklus anlegen"}
          </button>
          {editing && (
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blankMacrocycle);
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <div className="item-list">
        {macrocycles.map((macrocycle) => (
          <article className="planning-item" key={macrocycle.id}>
            <div>
              <strong>{macrocycle.name}</strong>
              <span>
                {formatDate(macrocycle.startDate)} –{" "}
                {formatDate(macrocycle.endDate)}
                {macrocycle.targetEventId
                  ? ` · Zielwettkampf: ${eventName(events, macrocycle.targetEventId)}`
                  : ""}
              </span>
              <span>Ziel: {macrocycle.goal}</span>
              <span>Notiz: {macrocycle.notes}</span>
            </div>
            <ItemActions
              onEdit={() => edit(macrocycle)}
              onDelete={() => void remove(macrocycle)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

interface SectionProps {
  service: SeasonPlanningService;
  seasonId: string;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
}

function TrackSection({
  tracks,
  service,
  seasonId,
  onChange,
  onNotice,
}: SectionProps & { tracks: EventTrack[] }) {
  const [form, setForm] = useState<EventTrackInput>(blankTrack);
  const [editing, setEditing] = useState<EventTrack | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = eventTrackInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateTrack(editing, parsed.data);
      else await service.createTrack(seasonId, parsed.data);
      onNotice(
        editing ? "Eventspur wurde aktualisiert." : "Eventspur wurde angelegt.",
      );
      setEditing(null);
      setForm(blankTrack);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(track: EventTrack) {
    setEditing(track);
    setForm({
      name: track.name,
      sortOrder: track.sortOrder,
      visible: track.visible,
    });
    setErrors({});
  }

  async function remove(track: EventTrack) {
    try {
      await service.deleteTrack(track);
      onNotice("Eventspur wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <PlanningSection title="Eventspuren" count={tracks.length}>
      <form className="compact-form" onSubmit={submit} noValidate>
        <Field label="Name der Eventspur" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Sortierung" error={errors.sortOrder}>
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
            checked={form.visible}
            onChange={(e) => setForm({ ...form, visible: e.target.checked })}
          />{" "}
          Sichtbar
        </label>
        <button className="button primary" type="submit">
          {editing ? "Eventspur speichern" : "Eventspur anlegen"}
        </button>
        {editing && (
          <button
            className="button quiet"
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(blankTrack);
            }}
          >
            Abbrechen
          </button>
        )}
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
      </form>
      <div className="item-list">
        {tracks.map((track) => (
          <article className="planning-item" key={track.id}>
            <div>
              <strong>{track.name}</strong>
              <span>
                Position {track.sortOrder} ·{" "}
                {track.visible ? "sichtbar" : "ausgeblendet"}
              </span>
            </div>
            <ItemActions
              onEdit={() => edit(track)}
              onDelete={() => void remove(track)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function EventSection({
  events,
  tracks,
  service,
  seasonId,
  onChange,
  onNotice,
}: SectionProps & { events: Event[]; tracks: EventTrack[] }) {
  const [form, setForm] = useState<EventInput>(blankEvent);
  const [editing, setEditing] = useState<Event | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = eventInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateEvent(editing, parsed.data);
      else await service.createEvent(seasonId, parsed.data);
      onNotice(
        editing ? "Wettkampf wurde aktualisiert." : "Wettkampf wurde angelegt.",
      );
      setEditing(null);
      setForm(blankEvent);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(event: Event) {
    setEditing(event);
    setForm({
      trackId: event.trackId,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      priority: event.priority,
      category: event.category ?? "",
      location: event.location ?? "",
      goal: event.goal ?? "",
      notes: event.notes ?? "",
    });
    setErrors({});
  }

  async function remove(event: Event) {
    await service.deleteEvent(event);
    onNotice("Wettkampf wurde gelöscht.");
    await onChange();
  }

  return (
    <PlanningSection title="Wettkämpfe" count={events.length}>
      {tracks.length === 0 ? (
        <p className="hint">Lege zuerst eine Eventspur an.</p>
      ) : (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Eventspur" error={errors.trackId}>
            <select
              value={form.trackId}
              onChange={(e) => setForm({ ...form, trackId: e.target.value })}
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          <Field label="Priorität" error={errors.priority}>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
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
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field label="Ort">
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label="Ziel">
            <input
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </Field>
          <Field label="Notizen" className="wide">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
          <div className="entity-actions">
            <button className="button primary" type="submit">
              {editing ? "Wettkampf speichern" : "Wettkampf anlegen"}
            </button>
            {editing && (
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blankEvent);
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}
      <div className="item-list">
        {events.map((event) => (
          <article className="planning-item" key={event.id}>
            <div>
              <strong>{event.name}</strong>
              <span>
                {trackName(tracks, event.trackId)} ·{" "}
                {formatDate(event.startDate)} – {formatDate(event.endDate)} ·
                Priorität {event.priority}
              </span>
            </div>
            <ItemActions
              onEdit={() => edit(event)}
              onDelete={() => void remove(event)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function ConstraintSection({
  constraints,
  service,
  seasonId,
  onChange,
  onNotice,
}: SectionProps & { constraints: CalendarConstraint[] }) {
  const [form, setForm] = useState<CalendarConstraintInput>(blankConstraint);
  const [editing, setEditing] = useState<CalendarConstraint | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = calendarConstraintInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateConstraint(editing, parsed.data);
      else await service.createConstraint(seasonId, parsed.data);
      onNotice(
        editing
          ? "Restriktion wurde aktualisiert."
          : "Restriktion wurde angelegt.",
      );
      setEditing(null);
      setForm(blankConstraint);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  function edit(constraint: CalendarConstraint) {
    setEditing(constraint);
    setForm({
      type: constraint.type,
      name: constraint.name,
      startDate: constraint.startDate,
      endDate: constraint.endDate,
      notes: constraint.notes ?? "",
      severity: constraint.severity ?? "Hinweis",
    });
    setErrors({});
  }

  async function remove(constraint: CalendarConstraint) {
    await service.deleteConstraint(constraint);
    onNotice("Restriktion wurde gelöscht.");
    await onChange();
  }

  return (
    <PlanningSection title="Ferien & Restriktionen" count={constraints.length}>
      <form className="entity-form" onSubmit={submit} noValidate>
        <Field label="Typ" error={errors.type}>
          <input
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
        </Field>
        <Field label="Name" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
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
        <Field label="Auswirkung" error={errors.severity}>
          <input
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          />
        </Field>
        <Field label="Notizen" className="wide">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
        <div className="entity-actions">
          <button className="button primary" type="submit">
            {editing ? "Restriktion speichern" : "Restriktion anlegen"}
          </button>
          {editing && (
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blankConstraint);
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <div className="item-list">
        {constraints.map((constraint) => (
          <article className="planning-item" key={constraint.id}>
            <div>
              <strong>{constraint.name}</strong>
              <span>
                {constraint.type} · {formatDate(constraint.startDate)} –{" "}
                {formatDate(constraint.endDate)} · {constraint.severity}
              </span>
            </div>
            <ItemActions
              onEdit={() => edit(constraint)}
              onDelete={() => void remove(constraint)}
            />
          </article>
        ))}
      </div>
    </PlanningSection>
  );
}

function PlanningSection({
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
  if (error instanceof PlanningValidationError || error instanceof Error)
    return error.message;
  return "Die Änderung konnte nicht gespeichert werden. Bitte neu laden.";
}

function trackName(tracks: EventTrack[], id: string): string {
  return (
    tracks.find((track) => track.id === id)?.name ?? "Unbekannte Eventspur"
  );
}

function eventName(events: Event[], id: string): string {
  return (
    events.find((event) => event.id === id)?.name ?? "Unbekannter Wettkampf"
  );
}

function macrocycleName(macrocycles: Macrocycle[], id: string): string {
  return (
    macrocycles.find((macrocycle) => macrocycle.id === id)?.name ??
    "Unbekannter Makrozyklus"
  );
}

function mesocycleName(mesocycles: Mesocycle[], id: string): string {
  return (
    mesocycles.find((mesocycle) => mesocycle.id === id)?.name ??
    "Unbekannter Mesozyklus"
  );
}

function microcycleName(microcycles: Microcycle[], id: string): string {
  return (
    microcycles.find((microcycle) => microcycle.id === id)?.name ??
    "Unbekannter Mikrozyklus"
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
