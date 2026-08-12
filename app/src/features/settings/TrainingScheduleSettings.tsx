import { useEffect, useMemo, useState, type FormEvent } from "react";

import { SeasonService } from "../../lib/domain/seasons";
import {
  PlanningValidationError,
  SeasonPlanningService,
} from "../../lib/domain/seasonPlanning";
import type { Season, TrainingScheduleTemplate } from "../../lib/domain/types";
import { weekdays } from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import {
  trainingScheduleTemplateInputSchema,
  type TrainingScheduleTemplateInput,
} from "../../lib/validation/domain";

const weekdayLabels: Record<string, string> = {
  Monday: "Montag",
  Tuesday: "Dienstag",
  Wednesday: "Mittwoch",
  Thursday: "Donnerstag",
  Friday: "Freitag",
  Saturday: "Samstag",
  Sunday: "Sonntag",
};

const emptyForm: TrainingScheduleTemplateInput = {
  name: "",
  weekday: "Monday",
  startTime: "18:00",
  endTime: "20:00",
  location: "",
  active: true,
  validFrom: null,
  validUntil: null,
};

export function TrainingScheduleSettings({
  storage,
  onMessage,
  initialSeasonId,
}: {
  storage: StorageAdapter;
  onMessage: (message: string) => void;
  initialSeasonId?: string;
}) {
  const seasonService = useMemo(() => new SeasonService(storage), [storage]);
  const planningService = useMemo(
    () => new SeasonPlanningService(storage),
    [storage],
  );
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState(initialSeasonId ?? "");
  const [templates, setTemplates] = useState<TrainingScheduleTemplate[]>([]);
  const [form, setForm] = useState<TrainingScheduleTemplateInput>(emptyForm);
  const [editing, setEditing] = useState<TrainingScheduleTemplate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    void seasonService
      .list()
      .then((rows) => {
        if (!active) return;
        setSeasons(rows);
        setSeasonId((current) =>
          rows.some((season) => season.id === current)
            ? current
            : rows[0]?.id || "",
        );
        setLoadError("");
      })
      .catch(() => {
        if (active) setLoadError("Saisons konnten nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, [seasonService]);

  useEffect(() => {
    let active = true;
    if (!seasonId) {
      return;
    }
    void planningService
      .listScheduleTemplates(seasonId)
      .then((rows) => {
        if (!active) return;
        setTemplates(rows);
        setLoadError("");
      })
      .catch(() => {
        if (active)
          setLoadError("Trainingszeiten konnten nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, [seasonId, planningService]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function startEdit(template: TrainingScheduleTemplate) {
    setEditing(template);
    setForm({
      name: template.name,
      weekday: template.weekday,
      startTime: template.startTime,
      endTime: template.endTime,
      location: template.location ?? "",
      active: template.active,
      validFrom: template.validFrom ?? null,
      validUntil: template.validUntil ?? null,
    });
    setErrors({});
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = trainingScheduleTemplateInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await planningService.updateScheduleTemplate(editing, parsed.data);
        onMessage("Standardtermin wurde aktualisiert.");
      } else {
        await planningService.createScheduleTemplate(seasonId, parsed.data);
        onMessage("Standardtermin wurde angelegt.");
      }
      await planningService.refreshScheduleSessions(seasonId);
      setTemplates(await planningService.listScheduleTemplates(seasonId));
      setEditing(null);
      setFormOpen(false);
      setForm(emptyForm);
      setErrors({});
    } catch (error) {
      onMessage(
        error instanceof PlanningValidationError
          ? error.message
          : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(template: TrainingScheduleTemplate) {
    setBusy(true);
    try {
      await planningService.updateScheduleTemplate(template, {
        name: template.name,
        weekday: template.weekday,
        startTime: template.startTime,
        endTime: template.endTime,
        location: template.location ?? "",
        active: !template.active,
        validFrom: template.validFrom ?? null,
        validUntil: template.validUntil ?? null,
      });
      await planningService.refreshScheduleSessions(seasonId);
      setTemplates(await planningService.listScheduleTemplates(seasonId));
      onMessage(
        template.active
          ? "Standardtermin wurde deaktiviert."
          : "Standardtermin wurde aktiviert.",
      );
    } catch {
      onMessage("Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(template: TrainingScheduleTemplate) {
    setBusy(true);
    try {
      await planningService.deleteScheduleTemplate(template);
      await planningService.refreshScheduleSessions(seasonId);
      setTemplates(await planningService.listScheduleTemplates(seasonId));
      onMessage("Standardtermin wurde gelöscht.");
    } catch {
      onMessage("Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-panel" aria-labelledby="schedule-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Planung</p>
          <h2 id="schedule-title">Trainingszeiten</h2>
        </div>
        <button
          className="button primary"
          disabled={!seasonId || busy}
          onClick={startCreate}
        >
          Termin hinzufügen
        </button>
      </div>
      <p>
        Wiederkehrende Trainingszeiten, die automatisch in jeder passenden
        Trainingswoche als Standardtermin erscheinen.
      </p>
      {loadError && (
        <p className="field-error form-error" role="alert">
          {loadError}
        </p>
      )}
      <label className="field settings-group">
        <span>Saison</span>
        <select
          value={seasonId}
          onChange={(event) => setSeasonId(event.target.value)}
        >
          {seasons.length === 0 && (
            <option value="">Keine Saison vorhanden</option>
          )}
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </label>

      {formOpen && (
        <form className="entity-form" onSubmit={submit} noValidate>
          <Field label="Name" error={errors.name}>
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </Field>
          <Field label="Wochentag" error={errors.weekday}>
            <select
              value={form.weekday}
              onChange={(event) =>
                setForm({
                  ...form,
                  weekday: event.target.value as typeof form.weekday,
                })
              }
            >
              {weekdays.map((day) => (
                <option key={day} value={day}>
                  {weekdayLabels[day]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Startzeit" error={errors.startTime}>
            <input
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm({ ...form, startTime: event.target.value })
              }
            />
          </Field>
          <Field label="Endzeit" error={errors.endTime}>
            <input
              type="time"
              value={form.endTime}
              onChange={(event) =>
                setForm({ ...form, endTime: event.target.value })
              }
            />
          </Field>
          <Field label="Ort" error={errors.location}>
            <input
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
          </Field>
          <Field label="Gültig ab" error={errors.validFrom}>
            <input
              type="date"
              value={form.validFrom ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  validFrom: event.target.value || null,
                })
              }
            />
          </Field>
          <Field label="Gültig bis" error={errors.validUntil}>
            <input
              type="date"
              value={form.validUntil ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  validUntil: event.target.value || null,
                })
              }
            />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
            />{" "}
            Aktiv
          </label>
          {errors.form && (
            <p className="field-error form-error">{errors.form}</p>
          )}
          <div className="entity-actions">
            <button className="button primary" type="submit" disabled={busy}>
              {editing ? "Standardtermin speichern" : "Standardtermin anlegen"}
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(false);
                setForm(emptyForm);
                setErrors({});
              }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="schedule-list">
        {templates.map((template) => (
          <article
            key={template.id}
            className={`schedule-row${template.active ? "" : " inactive"}`}
          >
            <div>
              <strong>{template.name}</strong>
              <span>
                {weekdayLabels[template.weekday]} · {template.startTime}–
                {template.endTime} Uhr
                {template.location ? ` · ${template.location}` : ""}
              </span>
              <span>
                {template.validFrom ?? "Saisonstart"} –{" "}
                {template.validUntil ?? "Saisonende"}
              </span>
            </div>
            <span className={`status-badge${template.active ? " active" : ""}`}>
              {template.active ? "Aktiv" : "Inaktiv"}
            </span>
            <div className="row-actions">
              <button
                className="button quiet"
                disabled={busy}
                onClick={() => startEdit(template)}
              >
                Bearbeiten
              </button>
              <button
                className="button quiet"
                disabled={busy}
                onClick={() => void toggleActive(template)}
              >
                {template.active ? "Deaktivieren" : "Aktivieren"}
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => void remove(template)}
              >
                Löschen
              </button>
            </div>
          </article>
        ))}
        {seasonId && templates.length === 0 && (
          <p className="empty-state">
            Noch keine Standardtermine für diese Saison.
          </p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
