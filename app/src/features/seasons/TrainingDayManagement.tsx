import { useState, type FormEvent } from "react";
import { ZodError } from "zod";

import type { Season, TrainingDay } from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import {
  trainingDayInputSchema,
  type TrainingDayInput,
} from "../../lib/validation/domain";

const contexts = [
  "Recovery",
  "Competition Preparation",
  "Race Pace Day",
  "Double Session",
  "Travel",
  "Test Day",
];

const blankDay: TrainingDayInput = { date: "", dayContext: "", notes: "" };

export function TrainingDayManagement({
  season,
  days,
  service,
  onChange,
  onNotice,
}: {
  season: Season;
  days: TrainingDay[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [form, setForm] = useState<TrainingDayInput>(blankDay);
  const [editing, setEditing] = useState<TrainingDay | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = trainingDayInputSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      if (editing) await service.updateTrainingDay(editing, parsed.data);
      else await service.createTrainingDay(season.id, parsed.data);
      onNotice(
        editing
          ? "Trainingstag wurde aktualisiert."
          : "Trainingstag wurde angelegt.",
      );
      setEditing(null);
      setForm(blankDay);
      setErrors({});
      await onChange();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    }
  }

  async function remove(day: TrainingDay) {
    try {
      await service.deleteTrainingDay(day);
      onNotice("Trainingstag wurde gelöscht.");
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }

  return (
    <section className="planning-section" aria-label="Trainingstage">
      <div className="section-heading">
        <h3>Trainingstage</h3>
        <span>{days.length}</span>
      </div>
      <form className="compact-form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Datum</span>
          <input
            type="date"
            min={season.startDate}
            max={season.endDate}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </label>
        <label className="field">
          <span>Day Context</span>
          <input
            list="day-contexts"
            value={form.dayContext}
            onChange={(event) =>
              setForm({ ...form, dayContext: event.target.value })
            }
          />
          <datalist id="day-contexts">
            {contexts.map((context) => (
              <option key={context} value={context} />
            ))}
          </datalist>
        </label>
        <label className="field wide">
          <span>Notiz</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />
        </label>
        {errors.form && <p className="field-error form-error">{errors.form}</p>}
        <div className="entity-actions">
          <button className="button primary" type="submit">
            {editing ? "Trainingstag speichern" : "Trainingstag anlegen"}
          </button>
          {editing && (
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blankDay);
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <div className="item-list">
        {days.map((day) => (
          <article className="planning-item" key={day.id}>
            <div>
              <strong>{formatDate(day.date)}</strong>
              <span>Day Context: {day.dayContext || "–"}</span>
              <span>Notiz: {day.notes || "–"}</span>
            </div>
            <div className="card-actions">
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(day);
                  setForm({
                    date: day.date,
                    dayContext: day.dayContext ?? "",
                    notes: day.notes ?? "",
                  });
                  setErrors({});
                }}
              >
                Bearbeiten
              </button>
              <button
                className="button danger"
                type="button"
                onClick={() => void remove(day)}
              >
                Löschen
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
  return error instanceof Error
    ? error.message
    : "Die Änderung konnte nicht gespeichert werden. Bitte neu laden.";
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
