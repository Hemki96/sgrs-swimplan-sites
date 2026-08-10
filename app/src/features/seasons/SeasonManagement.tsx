import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ZodError } from "zod";

import { downloadJsonExport } from "../../lib/export/jsonExport";
import { seedDemoSeason } from "../../lib/domain/seedDemoSeason";
import { SeasonService } from "../../lib/domain/seasons";
import type { Season, SeasonStatus } from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import {
  seasonInputSchema,
  type SeasonInput,
} from "../../lib/validation/domain";
import { SeasonPlanning, type PlanningView } from "./SeasonPlanning";
import { preferredSeason, seasonIdFromPath } from "./seasonNavigation";

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
const filters: Array<{ value: "all" | SeasonStatus; label: string }> = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Aktiv" },
  { value: "draft", label: "Entwurf" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "archived", label: "Archiviert" },
];

export function SeasonManagement({
  storage,
  initialSeasonId,
}: {
  storage: StorageAdapter;
  initialSeasonId?: string;
}) {
  const service = useMemo(() => new SeasonService(storage), [storage]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedId, setSelectedId] = useState(initialSeasonId ?? null);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SeasonStatus>("all");
  const [view, setView] = useState<PlanningView>("matrix");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState<SeasonInput>(emptyInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [undoSeasonId, setUndoSeasonId] = useState<string | null>(null);
  const firstInvalid = useRef<HTMLInputElement | null>(null);

  const selected = seasons.find((season) => season.id === selectedId);
  const invalidRoute = loaded && Boolean(selectedId) && !selected;
  const visible = seasons.filter((season) => {
    const matchesFilter = filter === "all" || season.status === filter;
    const needle = query.trim().toLocaleLowerCase("de");
    return (
      matchesFilter &&
      (!needle || season.name.toLocaleLowerCase("de").includes(needle))
    );
  });

  async function reload() {
    setSeasons(sortSeasons(await service.list()));
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      let rows = await service.list();
      if (rows.length === 0) {
        try {
          await seedDemoSeason(storage);
        } catch {
          // A parallel first visitor may have created the same stable demo IDs.
        }
        rows = await service.list();
      }
      if (active) {
        const next = sortSeasons(rows);
        setSeasons(next);
        setLoaded(true);
        if (!initialSeasonId && !selectedId) {
          const preferred = preferredSeason(next);
          if (preferred) {
            setSelectedId(preferred.id);
            window.history.replaceState({}, "", `/saisons/${preferred.id}`);
          }
        }
      }
    })().catch(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [initialSeasonId, selectedId, service, storage]);

  useEffect(() => {
    const onPopState = () =>
      setSelectedId(seasonIdFromPath(location.pathname) ?? null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!window.matchMedia("(min-width: 64rem)").matches) setView("week");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => {
      setMessage("");
      setUndoSeasonId(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function choose(season: Season) {
    setSelectedId(season.id);
    setView(
      window.matchMedia("(min-width: 64rem)").matches ? "matrix" : "week",
    );
    window.history.pushState({}, "", `/saisons/${season.id}`);
  }
  function openCreate() {
    setEditing(null);
    setForm(emptyInput);
    setErrors({});
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
    setFormOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = seasonInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => firstInvalid.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await service.update(editing, parsed.data)
        : await service.create(parsed.data);
      setMessage(
        editing ? "Saison wurde aktualisiert." : "Saison wurde angelegt.",
      );
      setFormOpen(false);
      await reload();
      choose(saved);
    } catch {
      setErrors({ form: "Speichern fehlgeschlagen. Bitte erneut versuchen." });
    } finally {
      setSaving(false);
    }
  }
  async function remove(season: Season) {
    if (!window.confirm(`Saison „${season.name}“ löschen?`)) return;
    await service.delete(season);
    setMessage("Saison wurde gelöscht.");
    setUndoSeasonId(season.id);
    const remaining = seasons.filter((item) => item.id !== season.id);
    const next = preferredSeason(remaining);
    setSelectedId(next?.id ?? null);
    window.history.replaceState({}, "", next ? `/saisons/${next.id}` : "/");
    await reload();
  }

  async function undoDelete() {
    if (!undoSeasonId) return;
    try {
      const restored = await service.restore(undoSeasonId);
      await reload();
      choose(restored);
      setUndoSeasonId(null);
      setMessage("Saison wurde wiederhergestellt.");
    } catch {
      setMessage("Wiederherstellen fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  return (
    <main className="planning-app" id="main-content">
      <a className="skip-link" href="#workspace">
        Zur Planung springen
      </a>
      <h1 className="sr-only">Saisonverwaltung</h1>
      <header className="app-topbar">
        <div className="brand-lockup">
          <img
            src="/brand/sgrs-logo.png"
            width="88"
            height="88"
            alt="Logo der SG Rhein-Sieg"
          />
          <div>
            <p className="eyebrow">SGRS SwimPlan</p>
            <strong>Planungsdeck</strong>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="button quiet"
            disabled={!seasons.length}
            onClick={() => void downloadJsonExport(storage)}
          >
            JSON exportieren
          </button>
          <button className="button primary" onClick={openCreate}>
            Neue Saison
          </button>
        </div>
      </header>
      {message && (
        <div className="notice app-notice" role="status" aria-live="polite">
          <span>{message}</span>
          {undoSeasonId && (
            <button className="button quiet" onClick={() => void undoDelete()}>
              Rückgängig
            </button>
          )}
        </div>
      )}
      {formOpen && (
        <SeasonEditor
          form={form}
          setForm={setForm}
          errors={errors}
          editing={editing}
          saving={saving}
          firstInvalid={firstInvalid}
          submit={submit}
          close={() => setFormOpen(false)}
        />
      )}

      {seasons.length === 0 && loaded ? (
        <section className="welcome-empty">
          <p className="eyebrow">Startklar für die Saison</p>
          <h1>Noch keine Planung an Deck.</h1>
          <p>
            Lege Dauer, Hauptziel und Status fest. Alles Weitere kannst du
            später ergänzen.
          </p>
          <button className="button primary" onClick={openCreate}>
            Erste Saison anlegen
          </button>
        </section>
      ) : (
        <div className="planning-shell">
          <aside className="season-rail" aria-label="Saisonnavigation">
            <div className="rail-heading">
              <span>Saisons</span>
              <b>{seasons.length}</b>
            </div>
            <label className="rail-search">
              <span className="sr-only">Saison suchen</span>
              <input
                type="search"
                placeholder="Saison suchen"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="mobile-season-picker">
              <span>Saison</span>
              <select
                value={selectedId ?? ""}
                onChange={(event) => {
                  const item = seasons.find(
                    (season) => season.id === event.target.value,
                  );
                  if (item) choose(item);
                }}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-chips" aria-label="Saisonstatus">
              {filters.map((item) => (
                <button
                  key={item.value}
                  className={filter === item.value ? "active" : ""}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="season-rail-list">
              {visible.map((season) => (
                <article
                  key={season.id}
                  className={`rail-season${season.id === selectedId ? " selected" : ""}`}
                >
                  <button
                    className="rail-season-main"
                    onClick={() => choose(season)}
                    aria-current={season.id === selectedId ? "page" : undefined}
                  >
                    <span className="sr-only">Planung öffnen</span>
                    <span className={`status status-${season.status}`}>
                      {statusLabels[season.status]}
                    </span>
                    <strong>{season.name}</strong>
                    <small>
                      {formatDate(season.startDate)} –{" "}
                      {formatDate(season.endDate)}
                    </small>
                  </button>
                  <details className="action-menu">
                    <summary aria-label={`Aktionen für ${season.name}`}>
                      Mehr
                    </summary>
                    <div>
                      <button onClick={() => openEdit(season)}>
                        Bearbeiten
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => void remove(season)}
                      >
                        Löschen
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </aside>
          <section className="workspace" id="workspace">
            {invalidRoute ? (
              <div className="route-error">
                <p className="eyebrow">Saison nicht gefunden</p>
                <h1>Diese Planung ist nicht mehr verfügbar.</h1>
                <p>Wähle eine vorhandene Saison aus der Navigation.</p>
                {seasons[0] && (
                  <button
                    className="button primary"
                    onClick={() => choose(seasons[0])}
                  >
                    Zur Saisonwahl
                  </button>
                )}
              </div>
            ) : selected ? (
              <>
                <header className="workspace-header">
                  <div>
                    <span className={`status status-${selected.status}`}>
                      {statusLabels[selected.status]}
                    </span>
                    <h1>{selected.name}</h1>
                    <p>
                      {formatDate(selected.startDate)} –{" "}
                      {formatDate(selected.endDate)} <span>·</span>{" "}
                      {selected.mainGoal}
                    </p>
                  </div>
                  <button
                    className="button quiet"
                    onClick={() => openEdit(selected)}
                  >
                    Saison bearbeiten
                  </button>
                </header>
                <nav
                  className="workspace-tabs"
                  aria-label="Planungsbereiche"
                  role="tablist"
                >
                  {(["matrix", "week", "data"] as PlanningView[]).map(
                    (item) => (
                      <button
                        key={item}
                        role="tab"
                        aria-selected={view === item}
                        className={view === item ? "active" : ""}
                        onClick={() => setView(item)}
                      >
                        {item === "matrix"
                          ? "Matrix"
                          : item === "week"
                            ? "Woche"
                            : "Planungsdaten"}
                      </button>
                    ),
                  )}
                </nav>
                <SeasonPlanning
                  key={selected.id}
                  season={selected}
                  storage={storage}
                  view={view}
                />
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}

function SeasonEditor({
  form,
  setForm,
  errors,
  editing,
  saving,
  firstInvalid,
  submit,
  close,
}: {
  form: SeasonInput;
  setForm: (value: SeasonInput) => void;
  errors: Record<string, string>;
  editing: Season | null;
  saving: boolean;
  firstInvalid: React.RefObject<HTMLInputElement | null>;
  submit: (event: FormEvent) => void;
  close: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onClose = useEffectEvent(close);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("input, button, select, textarea")
      ?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) trapTab(event, dialog);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="editor-sheet compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="season-editor-title"
      >
        <div className="editor-heading">
          <h2 id="season-editor-title">
            {editing ? "Saison bearbeiten" : "Saison anlegen"}
          </h2>
          <button
            className="icon-button"
            aria-label="Dialog schließen"
            onClick={close}
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Name" error={errors.name} wide>
              <input
                ref={errors.name ? firstInvalid : undefined}
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
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
            <Field label="Beschreibung" error={errors.description} wide>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Hauptziel" error={errors.mainGoal} wide>
              <textarea
                rows={2}
                value={form.mainGoal}
                onChange={(e) => setForm({ ...form, mainGoal: e.target.value })}
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
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="editor-footer">
            <button type="button" className="button quiet" onClick={close}>
              Abbrechen
            </button>
            <button className="button primary" disabled={saving}>
              {saving ? "Speichert …" : "Saison speichern"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
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
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
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
function fieldErrors(error: ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  );
}
function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
function sortSeasons(seasons: Season[]) {
  return [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
}
