import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  ConfigurationService,
  configurationGroupLabels,
} from "../../lib/domain/configuration";
import { seedDemoSeason } from "../../lib/domain/seedDemoSeason";
import { SeasonService } from "../../lib/domain/seasons";
import type { Season } from "../../lib/domain/types";
import {
  configurationGroups,
  type ConfigurationGroup,
  type ConfigurationValue,
} from "../../lib/domain/types";
import { downloadJsonExport } from "../../lib/export/jsonExport";
import {
  buildExcelImportSnapshot,
  parseExcelWorkbook,
  type ExcelImportPreview,
} from "../../lib/excel/excelImport";
import { downloadExcelExport } from "../../lib/excel/excelExport";
import {
  buildImportSnapshot,
  parseImport,
  type ImportPreview,
} from "../../lib/import/jsonImport";
import {
  seasonScopeSummary,
  type SeasonScopeSummary,
} from "../../lib/storage/purgeScope";
import { VersionConflictError } from "../../lib/storage/InMemoryStorageAdapter";
import { TrainingScheduleSettings } from "./TrainingScheduleSettings";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";

const emptyValue = (group: ConfigurationGroup): ConfigurationValue => ({
  id: crypto.randomUUID(),
  group,
  code: "",
  label: "",
  description: "",
  sortOrder: 0,
  active: true,
  version: 0,
});

export function SettingsPage({
  storage,
  close,
}: {
  storage: StorageAdapter;
  close: () => void;
}) {
  const service = useMemo(() => new ConfigurationService(storage), [storage]);
  const seasonService = useMemo(() => new SeasonService(storage), [storage]);
  const [values, setValues] = useState<ConfigurationValue[]>([]);
  const [group, setGroup] = useState<ConfigurationGroup>("season_status");
  const [editing, setEditing] = useState<ConfigurationValue | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreview | null>(
    null,
  );
  const [selectedSheet, setSelectedSheet] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletedSeasons, setDeletedSeasons] = useState<Season[]>([]);
  const [purgeTarget, setPurgeTarget] = useState<Season | null>(null);
  const [purgeName, setPurgeName] = useState("");
  const [purgeSummary, setPurgeSummary] = useState<SeasonScopeSummary | null>(
    null,
  );

  const reload = async () => setValues(await service.ensureDefaults());
  useEffect(() => {
    let active = true;
    void service.ensureDefaults().then((next) => {
      if (active) setValues(next);
    });
    void storage
      .list<Season>("seasons", { includeDeleted: true })
      .then((all) => {
        if (!active) return;
        setDeletedSeasons(
          all
            .filter((season) => season.deletedAt)
            .sort((left, right) =>
              (left.deletedAt ?? "").localeCompare(right.deletedAt ?? ""),
            ),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [service, storage]);
  const grouped = values.filter(
    (value) => value.group === group && !value.deletedAt,
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.code.trim() || !editing.label.trim()) return;
    setBusy(true);
    try {
      await service.save({
        ...editing,
        code: editing.code.trim(),
        label: editing.label.trim(),
      });
      setEditing(null);
      await reload();
      setMessage("Konfigurationswert gespeichert.");
    } catch (error) {
      setMessage(
        error instanceof VersionConflictError
          ? "Der Wert wurde zwischenzeitlich geändert. Die aktuelle Fassung wurde geladen."
          : "Speichern fehlgeschlagen.",
      );
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(value: ConfigurationValue) {
    setBusy(true);
    try {
      const referenced = await service.isReferenced(value);
      await service.remove(value);
      await reload();
      setMessage(
        referenced
          ? "Der verwendete Wert wurde deaktiviert."
          : "Der Wert wurde gelöscht.",
      );
    } catch {
      setMessage("Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    const next = parseImport(await file.text());
    setPreview(next);
    setSelectedSeason(next.selectedSeasonId ?? "");
  }

  async function chooseExcelFile(file?: File) {
    if (!file) return;
    const next = parseExcelWorkbook(await file.arrayBuffer());
    setExcelPreview(next);
    const importable = next.sheets.find(
      (sheet) => sheet.errors.length === 0 && sheet.weeks.length > 0,
    );
    setSelectedSheet(importable?.name ?? next.sheets[0]?.name ?? "");
  }

  async function confirmExcelImport() {
    if (!excelPreview) return;
    const sheet = excelPreview.sheets.find(
      (candidate) => candidate.name === selectedSheet,
    );
    if (!sheet || sheet.errors.length) return;
    setBusy(true);
    try {
      const { snapshot, warnings } = buildExcelImportSnapshot(sheet);
      await storage.applyImport(snapshot);
      setExcelPreview(null);
      setMessage(
        warnings.length
          ? `Saison importiert. ${warnings[0]}`
          : "Saison wurde als neue Planung importiert.",
      );
    } catch {
      setMessage("Import wurde ohne Änderungen abgebrochen.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!preview || !selectedSeason || preview.errors.length) return;
    setBusy(true);
    try {
      const snapshot = buildImportSnapshot(preview, selectedSeason);
      if (
        preview.document.schemaVersion === "1.0" ||
        preview.document.schemaVersion === 2
      ) {
        const incoming = new Map(
          (snapshot.configuration_values ?? []).map((row) => {
            const value = row as ConfigurationValue;
            return [`${value.group}:${value.code}`, value];
          }),
        );
        const reconciled = values.map((current) => {
          const imported = incoming.get(`${current.group}:${current.code}`);
          incoming.delete(`${current.group}:${current.code}`);
          return imported
            ? {
                ...current,
                ...imported,
                id: current.id,
                version: current.version,
              }
            : { ...current, active: false };
        });
        snapshot.configuration_values = [...reconciled, ...incoming.values()];
      } else snapshot.configuration_values = [];
      await storage.applyImport(snapshot);
      setPreview(null);
      setMessage("Saison wurde als neue Planung importiert.");
      await reload();
    } catch {
      setMessage("Import wurde ohne Änderungen abgebrochen.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    if (
      !window.confirm(
        "Zusätzliche Demo-Saison mit vollständigen Beispieldaten anlegen?",
      )
    )
      return;
    setBusy(true);
    try {
      const token = crypto.randomUUID().replaceAll("-", "");
      await seedDemoSeason(storage, {
        seasonId: crypto.randomUUID(),
        idNamespace: token.slice(0, 8),
      });
      setMessage("Eine zusätzliche Demo-Saison wurde angelegt.");
    } catch {
      setMessage("Demo-Saison konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function openPurge(season: Season) {
    setBusy(true);
    try {
      const snapshot = await storage.exportAll();
      setPurgeSummary(seasonScopeSummary(snapshot, season.id));
      setPurgeName("");
      setPurgeTarget(season);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPurge() {
    if (!purgeTarget || purgeName.trim() !== purgeTarget.name) return;
    setBusy(true);
    try {
      await seasonService.purge(purgeTarget);
      setPurgeTarget(null);
      setPurgeName("");
      setPurgeSummary(null);
      const all = await storage.list<Season>("seasons", {
        includeDeleted: true,
      });
      setDeletedSeasons(
        all
          .filter((season) => season.deletedAt)
          .sort((left, right) =>
            (left.deletedAt ?? "").localeCompare(right.deletedAt ?? ""),
          ),
      );
      setMessage("Saison wurde endgültig gelöscht.");
    } catch {
      setMessage("Endgültiges Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="settings-page" id="main-content">
      <header className="settings-header">
        <div>
          <p className="eyebrow">SGRS SwimPlan</p>
          <h1>Einstellungen</h1>
          <p className="lead">
            Globale Wertelisten, Datenaustausch und Demo-Daten.
          </p>
        </div>
        <button className="button quiet" onClick={close}>
          Zur Saisonplanung
        </button>
      </header>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <section className="settings-panel" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Globale Konfiguration</p>
            <h2 id="catalog-title">Wertelisten</h2>
          </div>
          <button
            className="button primary"
            onClick={() => setEditing(emptyValue(group))}
          >
            Wert hinzufügen
          </button>
        </div>
        <label className="field settings-group">
          <span>Werteliste</span>
          <select
            value={group}
            onChange={(event) =>
              setGroup(event.target.value as ConfigurationGroup)
            }
          >
            {configurationGroups.map((item) => (
              <option key={item} value={item}>
                {configurationGroupLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <div className="configuration-list">
          {grouped.map((value) => (
            <article
              key={value.id}
              className={`configuration-row${value.active ? "" : " inactive"}`}
            >
              <div>
                <strong>{value.label}</strong>
                <code>{value.code}</code>
                {value.description && <small>{value.description}</small>}
              </div>
              <span>Position {value.sortOrder}</span>
              <div className="row-actions">
                <button
                  className="button quiet"
                  onClick={() => setEditing(value)}
                >
                  Bearbeiten
                </button>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() => void remove(value)}
                >
                  {value.active ? "Entfernen" : "Löschen"}
                </button>
              </div>
            </article>
          ))}
          {!grouped.length && (
            <p className="empty-state">Noch keine Werte in dieser Liste.</p>
          )}
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="transfer-title">
        <p className="eyebrow">Sicherung und Übernahme</p>
        <h2 id="transfer-title">Import &amp; Export</h2>
        <div className="settings-actions">
          <button
            className="button"
            onClick={() => void downloadJsonExport(storage)}
          >
            JSON-Gesamtexport
          </button>
          <label className="button primary file-button">
            JSON-Datei prüfen
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="settings-actions">
          <button
            className="button"
            onClick={() =>
              void downloadExcelExport(storage).catch(() =>
                setMessage("Excel-Export fehlgeschlagen."),
              )
            }
          >
            Excel-Export
          </button>
          <label className="button primary file-button">
            Excel-Datei prüfen
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(event) =>
                void chooseExcelFile(event.target.files?.[0])
              }
            />
          </label>
        </div>
        {excelPreview && (
          <div className="import-preview">
            <h3>Excel-Importvorschau</h3>
            {excelPreview.errors.map((error) => (
              <p className="field-error" key={error}>
                {error}
              </p>
            ))}
            {excelPreview.sheets.length ? (
              <label className="field">
                <span>Zu importierendes Blatt</span>
                <select
                  value={selectedSheet}
                  onChange={(event) => setSelectedSheet(event.target.value)}
                >
                  {excelPreview.sheets.map((sheet) => (
                    <option
                      value={sheet.name}
                      key={sheet.name}
                      disabled={sheet.errors.length > 0}
                    >
                      {sheet.name}
                      {sheet.errors.length ? " (ungültig)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {(() => {
              const sheet = excelPreview.sheets.find(
                (candidate) => candidate.name === selectedSheet,
              );
              if (!sheet) return null;
              return (
                <>
                  {sheet.errors.map((error) => (
                    <p className="field-error" key={error}>
                      {error}
                    </p>
                  ))}
                  {sheet.warnings.map((warning) => (
                    <p className="notice" key={warning}>
                      {warning}
                    </p>
                  ))}
                  {sheet.errors.length === 0 && (
                    <>
                      <p>
                        Zeitraum {sheet.startDate} – {sheet.endDate} ·{" "}
                        {Object.entries(sheet.counts)
                          .map(([label, count]) => `${count} ${label}`)
                          .join(" · ")}
                      </p>
                      <p>Die Saison und alle Beziehungen erhalten neue IDs.</p>
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() => void confirmExcelImport()}
                      >
                        Import verbindlich anwenden
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
        {preview && (
          <div className="import-preview">
            <h3>Importvorschau</h3>
            {preview.errors.map((error) => (
              <p className="field-error" key={error}>
                {error}
              </p>
            ))}
            {preview.warnings.map((warning) => (
              <p className="notice" key={warning}>
                {warning}
              </p>
            ))}
            {!preview.errors.length && (
              <>
                <label className="field">
                  <span>Zu importierende Saison</span>
                  <select
                    value={selectedSeason}
                    onChange={(event) => setSelectedSeason(event.target.value)}
                  >
                    {preview.seasons.map((season) => (
                      <option value={season.id} key={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {Object.values(preview.counts).reduce(
                    (sum, count) => sum + count,
                    0,
                  )}{" "}
                  Objekte erkannt. Die Saison und alle Beziehungen erhalten neue
                  IDs.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void confirmImport()}
                >
                  Import verbindlich anwenden
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <TrainingScheduleSettings storage={storage} onMessage={setMessage} />

      <section className="settings-panel" aria-labelledby="purge-title">
        <p className="eyebrow">Datenbereinigung</p>
        <h2 id="purge-title">Saisons endgültig löschen</h2>
        <p>
          Zeigt Saisons, die in der Saisonverwaltung bereits gelöscht wurden.
          Das endgültige Löschen entfernt alle Planungsobjekte und die Historie
          unwiderruflich. Vorher am besten den JSON-Gesamtexport laden.
        </p>
        <div className="configuration-list">
          {deletedSeasons.map((season) => (
            <article key={season.id} className="configuration-row">
              <div>
                <strong>{season.name}</strong>
                <small>
                  {formatDate(season.startDate)} – {formatDate(season.endDate)}{" "}
                  · gelöscht am {formatDateTime(season.deletedAt ?? "")}
                </small>
              </div>
              <span />
              <div className="row-actions">
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() => void openPurge(season)}
                >
                  Endgültig löschen
                </button>
              </div>
            </article>
          ))}
          {!deletedSeasons.length && (
            <p className="empty-state">Keine gelöschten Saisons vorhanden.</p>
          )}
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="demo-title">
        <p className="eyebrow">Beispieldaten</p>
        <h2 id="demo-title">Demo-Daten</h2>
        <p>
          Legt eine zusätzliche vollständige Demo-Saison an. Vorhandene
          Planungen bleiben unverändert.
        </p>
        <div className="demo-preview">
          <strong>Vorschau</strong>
          <span>
            1 Saison · 87 revisionierte Planungsobjekte · keine
            personenbezogenen Daten
          </span>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void loadDemo()}
        >
          Demo-Saison laden
        </button>
      </section>

      {editing && (
        <div className="modal-backdrop">
          <section
            className="editor-sheet compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-editor-title"
          >
            <div className="editor-heading">
              <h2 id="config-editor-title">Konfigurationswert</h2>
              <button
                className="icon-button"
                aria-label="Dialog schließen"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <div className="form-grid">
                <label className="field">
                  <span>Code</span>
                  <input
                    value={editing.code}
                    disabled={editing.version > 0}
                    pattern="[A-Za-z][A-Za-z0-9_]*"
                    onChange={(event) =>
                      setEditing({ ...editing, code: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Label</span>
                  <input
                    value={editing.label}
                    onChange={(event) =>
                      setEditing({ ...editing, label: event.target.value })
                    }
                  />
                </label>
                <label className="field wide">
                  <span>Beschreibung</span>
                  <textarea
                    value={editing.description ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Sortierung</span>
                  <input
                    type="number"
                    min="0"
                    value={editing.sortOrder}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(event) =>
                      setEditing({ ...editing, active: event.target.checked })
                    }
                  />{" "}
                  Aktiv
                </label>
              </div>
              <div className="editor-footer">
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => setEditing(null)}
                >
                  Abbrechen
                </button>
                <button className="button primary" disabled={busy}>
                  Speichern
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {purgeTarget && (
        <div className="modal-backdrop">
          <section
            className="editor-sheet compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purge-dialog-title"
          >
            <div className="editor-heading">
              <h2 id="purge-dialog-title">Saison endgültig löschen</h2>
              <button
                className="icon-button"
                aria-label="Dialog schließen"
                onClick={() => setPurgeTarget(null)}
              >
                ×
              </button>
            </div>
            <div className="purge-preview">
              <strong>{purgeTarget.name}</strong>
              <span>
                {purgeSummary?.entityCount ?? 0} Planungsobjekte ·{" "}
                {purgeSummary?.revisionCount ?? 0} Revisionen
              </span>
              <span className="danger-text">
                Dies entfernt alle Daten dieser Saison unwiderruflich. Die
                Historie kann danach nicht wiederhergestellt werden.
              </span>
            </div>
            <p className="purge-backup-hint">
              Zur Sicherung bitte vorher den JSON-Gesamtexport laden.
            </p>
            <label className="field">
              <span>Saisonnamen zur Bestätigung eingeben</span>
              <input
                value={purgeName}
                onChange={(event) => setPurgeName(event.target.value)}
                placeholder={purgeTarget.name}
              />
            </label>
            <div className="editor-footer">
              <button
                type="button"
                className="button quiet"
                onClick={() => setPurgeTarget(null)}
              >
                Abbrechen
              </button>
              <button
                className="button danger"
                disabled={busy || purgeName.trim() !== purgeTarget.name}
                onClick={() => void confirmPurge()}
              >
                Endgültig löschen
              </button>
            </div>
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

function formatDateTime(value: string) {
  const [date, time] = value.split("T");
  return `${formatDate(date)}${time ? ` ${time.slice(0, 5)}` : ""}`;
}
