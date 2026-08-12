import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { downloadJsonExport } from "../../lib/export/jsonExport";
import { seedDemoSeason } from "../../lib/domain/seedDemoSeason";
import { SeasonService } from "../../lib/domain/seasons";
import type { Season, SeasonStatus } from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import {
  seasonInputSchema,
  type SeasonInput,
} from "../../lib/validation/domain";
import type { PlanningView } from "./SeasonPlanning";
import { preferredSeason, seasonIdFromPath } from "./seasonNavigation";
import { ConfigurationService } from "../../lib/domain/configuration";
import { errorMessage, fieldErrors } from "../forms/errors";
import { SeasonEditor } from "./SeasonEditor";

const SeasonPlanning = lazy(() =>
  import("./SeasonPlanning").then((module) => ({
    default: module.SeasonPlanning,
  })),
);
const SettingsPage = lazy(() =>
  import("../settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

function ViewLoading({ label }: { label: string }) {
  return (
    <div className="view-loading" role="status" aria-live="polite">
      {label} wird geladen …
    </div>
  );
}

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
  const [view, setView] = useState<PlanningView>("dashboard");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState<SeasonInput>(emptyInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [undoSeasonId, setUndoSeasonId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(
    () => location.pathname === "/einstellungen",
  );
  const [dynamicStatusLabels, setDynamicStatusLabels] = useState(statusLabels);
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
        if (!initialSeasonId) {
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
  }, [initialSeasonId, service, storage]);

  useEffect(() => {
    const configuration = new ConfigurationService(storage);
    void configuration.ensureDefaults().then((values) => {
      const next = { ...statusLabels };
      for (const value of values) {
        if (value.group === "season_status" && value.code in next)
          next[value.code as SeasonStatus] = value.label;
      }
      setDynamicStatusLabels(next);
    });
  }, [storage]);

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
    setSettingsOpen(false);
    setSelectedId(season.id);
    setView(
      window.matchMedia("(min-width: 64rem)").matches ? "dashboard" : "week",
    );
    window.history.pushState({}, "", `/saisons/${season.id}`);
  }
  function openSettings() {
    setSettingsOpen(true);
    window.history.pushState({}, "", "/einstellungen");
  }
  function closeSettings() {
    setSettingsOpen(false);
    const next = selected ?? preferredSeason(seasons);
    window.history.pushState({}, "", next ? `/saisons/${next.id}` : "/");
  }
  if (settingsOpen)
    return (
      <Suspense fallback={<ViewLoading label="Einstellungen" />}>
        <SettingsPage
          storage={storage}
          close={closeSettings}
          initialSeasonId={selectedId ?? undefined}
        />
      </Suspense>
    );
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
    } catch (error) {
      setErrors({
        form: errorMessage(
          error,
          "Speichern fehlgeschlagen. Bitte erneut versuchen.",
        ),
      });
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
          <button className="button quiet" onClick={openSettings}>
            Einstellungen
          </button>
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
          statusOptions={dynamicStatusLabels}
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
                      {dynamicStatusLabels[season.status]}
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
                      {dynamicStatusLabels[selected.status]}
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
                  {(
                    [
                      "dashboard",
                      "matrix",
                      "week",
                      "analytics",
                      "data",
                      "history",
                    ] as PlanningView[]
                  ).map((item) => (
                    <button
                      key={item}
                      role="tab"
                      aria-selected={view === item}
                      className={view === item ? "active" : ""}
                      onClick={() => setView(item)}
                    >
                      {item === "dashboard"
                        ? "Dashboard"
                        : item === "matrix"
                          ? "Matrix"
                          : item === "week"
                            ? "Woche"
                            : item === "analytics"
                              ? "Analyse"
                              : item === "history"
                                ? "Historie"
                                : "Planungsdaten"}
                    </button>
                  ))}
                </nav>
                <Suspense fallback={<ViewLoading label="Saisonplanung" />}>
                  <SeasonPlanning
                    key={selected.id}
                    season={selected}
                    storage={storage}
                    view={view}
                  />
                </Suspense>
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
function sortSeasons(seasons: Season[]) {
  return [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
}
