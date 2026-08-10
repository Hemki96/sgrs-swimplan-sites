import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ZodError } from "zod";

import { SeasonService } from "../../lib/domain/seasons";
import type { Season, SeasonStatus } from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import { downloadJsonExport } from "../../lib/export/jsonExport";
import {
  seasonInputSchema,
  type SeasonInput,
} from "../../lib/validation/domain";
import { SeasonPlanning } from "./SeasonPlanning";

const emptyInput: SeasonInput = {
  name: "",
  startDate: "",
  endDate: "",
  description: "",
  mainGoal: "",
  status: "draft",
};

const statusLabels: Record<SeasonStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

export function SeasonManagement({ storage }: { storage: StorageAdapter }) {
  const service = useMemo(() => new SeasonService(storage), [storage]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState<SeasonInput>(emptyInput);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const selectedSeason = seasons.find(
    (season) => season.id === selectedSeasonId,
  );

  async function reload() {
    const rows = await service.list();
    setSeasons(sortSeasons(rows));
  }

  useEffect(() => {
    let active = true;
    void service.list().then((rows) => {
      if (active) setSeasons(sortSeasons(rows));
    });
    return () => {
      active = false;
    };
  }, [service]);

  function openCreate() {
    setEditing(null);
    setForm(emptyInput);
    setErrors({});
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(season: Season) {
    setEditing(season);
    setForm({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      description: season.description,
      mainGoal: season.mainGoal,
      status: season.status,
    });
    setErrors({});
    setMessage("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = seasonInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    try {
      if (editing) {
        await service.update(editing, parsed.data);
        setMessage("Saison wurde aktualisiert.");
      } else {
        await service.create(parsed.data);
        setMessage("Saison wurde angelegt.");
      }
      setFormOpen(false);
      await reload();
    } catch {
      setErrors({
        form: "Die Saison konnte nicht gespeichert werden. Bitte neu laden.",
      });
    }
  }

  async function remove(season: Season) {
    if (!window.confirm(`Saison „${season.name}“ löschen?`)) return;
    try {
      await service.delete(season);
      if (selectedSeasonId === season.id) setSelectedSeasonId(null);
      setMessage("Saison wurde gelöscht.");
      await reload();
    } catch {
      setMessage("Die Saison konnte nicht gelöscht werden. Bitte neu laden.");
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="brand-lockup">
          <img
            className="brand-logo"
            src="/brand/sgrs-logo.png"
            width="88"
            height="88"
            alt="Logo der SG Rhein-Sieg"
          />
          <div>
            <h1>Saisonverwaltung</h1>
            <p className="lead">Saisons anlegen, bearbeiten und verwalten.</p>
          </div>
        </div>
        <div className="card-actions">
          <button
            className="button quiet"
            type="button"
            onClick={() => void downloadJsonExport(storage)}
          >
            JSON exportieren
          </button>
          <button className="button primary" type="button" onClick={openCreate}>
            Neue Saison
          </button>
        </div>
      </header>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {formOpen && (
        <section className="panel" aria-labelledby="season-form-title">
          <div className="panel-heading">
            <h2 id="season-form-title">
              {editing ? "Saison bearbeiten" : "Saison anlegen"}
            </h2>
            <button
              className="button quiet"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Abbrechen
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <Field label="Name" error={errors.name} className="wide">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Startdatum" error={errors.startDate}>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Enddatum" error={errors.endDate}>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Beschreibung"
                error={errors.description}
                className="wide"
              >
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
              <Field label="Hauptziel" error={errors.mainGoal} className="wide">
                <textarea
                  rows={2}
                  value={form.mainGoal}
                  onChange={(e) =>
                    setForm({ ...form, mainGoal: e.target.value })
                  }
                />
              </Field>
              <Field label="Status" error={errors.status}>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as SeasonStatus })
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {errors.form && <p className="field-error">{errors.form}</p>}
            <div className="form-actions">
              <button className="button primary" type="submit">
                Saison speichern
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="season-list-title">
        <div className="section-heading">
          <h2 id="season-list-title">Saisons</h2>
          <span>{seasons.length}</span>
        </div>
        {seasons.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Saison</h3>
            <p>Lege die erste Saison an, um mit der Planung zu beginnen.</p>
          </div>
        ) : (
          <div className="season-list">
            {seasons.map((season) => (
              <article className="season-card" key={season.id}>
                <div className="season-card-top">
                  <div>
                    <span className={`status status-${season.status}`}>
                      {statusLabels[season.status]}
                    </span>
                    <h3>{season.name}</h3>
                    <p className="date-range">
                      {formatDate(season.startDate)} –{" "}
                      {formatDate(season.endDate)}
                    </p>
                  </div>
                  <div className="card-actions">
                    <button
                      className="button quiet"
                      type="button"
                      onClick={() =>
                        setSelectedSeasonId(
                          selectedSeasonId === season.id ? null : season.id,
                        )
                      }
                    >
                      {selectedSeasonId === season.id
                        ? "Planung schließen"
                        : "Planung öffnen"}
                    </button>
                    <button
                      className="button quiet"
                      type="button"
                      onClick={() => openEdit(season)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => void remove(season)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                <p>{season.description}</p>
                <div className="goal">
                  <strong>Hauptziel</strong>
                  <span>{season.mainGoal}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedSeason && (
        <SeasonPlanning season={selectedSeason} storage={storage} />
      )}
    </main>
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
  children: React.ReactNode;
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

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function sortSeasons(seasons: Season[]): Season[] {
  return seasons.sort((a, b) => a.startDate.localeCompare(b.startDate));
}
