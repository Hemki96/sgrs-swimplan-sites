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
  Season,
} from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
} from "../../lib/validation/domain";

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
  const [notice, setNotice] = useState("");

  async function reload() {
    const [nextTracks, nextEvents, nextConstraints] = await Promise.all([
      service.listTracks(season.id),
      service.listEvents(season.id),
      service.listConstraints(season.id),
    ]);
    setTracks(nextTracks);
    setEvents(nextEvents);
    setConstraints(nextConstraints);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      service.listTracks(season.id),
      service.listEvents(season.id),
      service.listConstraints(season.id),
    ]).then(([nextTracks, nextEvents, nextConstraints]) => {
      if (!active) return;
      setTracks(nextTracks);
      setEvents(nextEvents);
      setConstraints(nextConstraints);
    });
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
    </section>
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

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
