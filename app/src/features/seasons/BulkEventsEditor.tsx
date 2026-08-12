import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { Event, EventTrack, Macrocycle } from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import {
  BULK_COLUMNS,
  BULK_DEFAULT_PRIORITY,
  type BulkColumnDefinition,
  type BulkEventRow,
  type BulkFilter,
  buildBulkSavePlan,
  createBlankBulkRow,
  duplicateBulkRow,
  filterEventsForBulk,
  bulkRowFromEvent,
  formatEventDate,
  parseBulkPaste,
  saveBulkEvents,
  validateBulkRows,
} from "./bulkEventsModel";

type BulkMode = "create" | "edit";
type BulkCellRef = HTMLInputElement | HTMLSelectElement;

const DEFAULT_PRIORITY_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "test", label: "Test" },
];

export function BulkEventsEditor({
  seasonId,
  tracks,
  events,
  macrocycles,
  service,
  onClose,
  onSaved,
  onNotice,
}: {
  seasonId: string;
  tracks: EventTrack[];
  events: Event[];
  macrocycles: Macrocycle[];
  service: SeasonPlanningService;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const defaultTrackId = tracks[0]?.id ?? "";
  const periodRanges = useMemo(
    () =>
      macrocycles.map((macrocycle) => ({
        startDate: macrocycle.startDate,
        endDate: macrocycle.endDate,
      })),
    [macrocycles],
  );
  const [defaults, setDefaults] = useState(() => ({
    trackId: defaultTrackId,
    priority: BULK_DEFAULT_PRIORITY,
  }));
  const [mode, setMode] = useState<BulkMode>("create");
  const [showOptional, setShowOptional] = useState(false);
  const [rows, setRows] = useState<BulkEventRow[]>(() => [
    createBlankBulkRow(
      { trackId: defaultTrackId, priority: BULK_DEFAULT_PRIORITY },
      seasonId,
      "bulk-row-1",
    ),
  ]);
  const [filter, setFilter] = useState<BulkFilter>({
    fromDate: "",
    toDate: "",
    trackId: "",
    priority: "",
  });
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const keyRef = useRef(1);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstInput =
      sheetRef.current?.querySelector<HTMLElement>("input, select");
    firstInput?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  const visibleColumns = useMemo(
    () => BULK_COLUMNS.filter((column) => !column.optional || showOptional),
    [showOptional],
  );

  const validation = useMemo(
    () =>
      validateBulkRows(rows, {
        defaults,
        periodRanges,
      }),
    [rows, defaults, periodRanges],
  );

  const savePlan = useMemo(
    () => buildBulkSavePlan(rows, defaults),
    [rows, defaults],
  );

  function nextKey() {
    keyRef.current += 1;
    return `bulk-row-${keyRef.current}`;
  }

  function updateRow(key: string, patch: Partial<BulkEventRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleCellKeyDown(
    event: React.KeyboardEvent<BulkCellRef>,
    rowIndex: number,
    colIndex: number,
  ) {
    if (event.key === "Tab" && !event.shiftKey) {
      if (
        rowIndex === rows.length - 1 &&
        colIndex === visibleColumns.length - 1
      ) {
        event.preventDefault();
        addRowAndFocus(0);
        return;
      }
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (rowIndex < rows.length - 1) {
      focusCell(rowIndex + 1, colIndex);
    } else if (colIndex < visibleColumns.length - 1) {
      focusCell(rowIndex, colIndex + 1);
    } else {
      addRowAndFocus(0);
    }
  }

  function addRowAndFocus(targetColumn: number) {
    const key = nextKey();
    setRows((current) => [
      ...current,
      createBlankBulkRow(defaults, seasonId, key),
    ]);
    requestAnimationFrame(() => focusCell(rows.length, targetColumn));
  }

  function focusCell(rowIndex: number, colIndex: number) {
    const table = sheetRef.current?.querySelector("table.bulk-table tbody");
    if (!table) return;
    const rows = table.querySelectorAll("tr");
    const safeRow = Math.max(0, Math.min(rows.length - 1, rowIndex));
    const cells = rows[safeRow]?.querySelectorAll("td");
    if (!cells) return;
    const safeCol = Math.max(0, Math.min(cells.length - 1, colIndex));
    const focusable =
      cells[safeCol]?.querySelector<HTMLElement>("input, select");
    focusable?.focus();
    if (focusable instanceof HTMLInputElement && focusable.type === "text") {
      focusable.select();
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const pasted = parseBulkPaste(text);
    if (pasted.length === 0) return;
    const baseDefaults = defaults;
    const newRows = pasted.map((item) => ({
      ...createBlankBulkRow(baseDefaults, seasonId, nextKey()),
      startDate: item.startDate,
      name: item.name,
      priority: item.priority,
      location: item.location,
    }));
    setRows((current) => [...current, ...newRows]);
  }

  function loadExisting() {
    const filtered = filterEventsForBulk(events, filter);
    setRows(filtered.map((event) => bulkRowFromEvent(event, nextKey())));
  }

  function duplicateRow(key: string) {
    const source = rows.find((row) => row.key === key);
    if (!source) return;
    setRows((current) => [...current, duplicateBulkRow(source, nextKey())]);
  }

  function removeRow(key: string) {
    const row = rows.find((item) => item.key === key);
    if (!row) return;
    if (row.eventId) {
      if (
        !window.confirm(
          `Wettkampf „${row.name || "Neuer Wettkampf"}“ wirklich löschen?`,
        )
      ) {
        return;
      }
      setRows((current) =>
        current.map((item) =>
          item.key === key ? { ...item, deleted: true } : item,
        ),
      );
      return;
    }
    setRows((current) => current.filter((item) => item.key !== key));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (validation.errorCount > 0) return;
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const result = await saveBulkEvents(rows, defaults, service, seasonId);
      setFailures(result.failed);
      setRows((current) => {
        const savedByKey = new Map(
          result.saved.map((item) => [item.key, item.event]),
        );
        return current
          .filter((row) => !result.deletedKeys.includes(row.key))
          .map((row) => {
            const saved = savedByKey.get(row.key);
            if (!saved) return row;
            return {
              ...row,
              eventId: saved.id,
              version: saved.version,
              seasonId: saved.seasonId,
              trackId: saved.trackId,
              startDate: formatEventDate(saved.startDate),
              endDate: formatEventDate(saved.endDate),
              priority: saved.priority,
              original: saved,
            };
          });
      });
      await onSaved();
      if (Object.keys(result.failed).length === 0) {
        onNotice(result.message);
        onClose();
      } else {
        onNotice(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={sheetRef}
        className="editor-sheet bulk"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-events-title"
        onPaste={handlePaste}
      >
        <div className="editor-heading">
          <h3 id="bulk-events-title">Massenpflege Wettkämpfe</h3>
          <button
            className="icon-button"
            aria-label="Dialog schließen"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="bulk-mode-switch">
          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            aria-pressed={mode === "create"}
            onClick={() => setMode("create")}
          >
            Neue Wettkämpfe erfassen
          </button>
          <button
            type="button"
            className={mode === "edit" ? "active" : ""}
            aria-pressed={mode === "edit"}
            onClick={() => setMode("edit")}
          >
            Bestehende Wettkämpfe bearbeiten
          </button>
        </div>

        {mode === "edit" && (
          <div className="bulk-filter">
            <Field label="Von" error="">
              <input
                type="date"
                value={filter.fromDate}
                onChange={(event) =>
                  setFilter({ ...filter, fromDate: event.target.value })
                }
              />
            </Field>
            <Field label="Bis" error="">
              <input
                type="date"
                value={filter.toDate}
                onChange={(event) =>
                  setFilter({ ...filter, toDate: event.target.value })
                }
              />
            </Field>
            <Field label="Eventspur" error="">
              <select
                value={filter.trackId}
                onChange={(event) =>
                  setFilter({ ...filter, trackId: event.target.value })
                }
              >
                <option value="">Alle</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priorität" error="">
              <select
                value={filter.priority}
                onChange={(event) =>
                  setFilter({ ...filter, priority: event.target.value })
                }
              >
                <option value="">Alle</option>
                {DEFAULT_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="button quiet"
              type="button"
              onClick={() => loadExisting()}
            >
              Laden
            </button>
          </div>
        )}

        <div className="bulk-defaults">
          <Field label="Event Track für neue Zeilen" error="">
            <select
              value={defaults.trackId}
              onChange={(event) =>
                setDefaults({ ...defaults, trackId: event.target.value })
              }
            >
              {tracks.length === 0 && (
                <option value="">Keine Eventspur vorhanden</option>
              )}
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priorität" error="">
            <select
              value={defaults.priority}
              onChange={(event) =>
                setDefaults({ ...defaults, priority: event.target.value })
              }
            >
              {DEFAULT_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="bulk-optional-toggle">
            <input
              type="checkbox"
              checked={showOptional}
              onChange={(event) => setShowOptional(event.target.checked)}
            />{" "}
            Weitere Spalten
          </label>
        </div>

        <div className="bulk-summary">
          {validation.readyCount} Wettkampf/Wettkämpfe bereit zum Speichern
          {validation.errorCount > 0 && (
            <span className="summary-bad">
              {validation.errorCount} Zeile(n) mit Fehlern
            </span>
          )}
          {validation.warningCount > 0 && (
            <span className="summary-warn">
              {validation.warningCount} Zeile(n) mit Warnungen
            </span>
          )}
        </div>
        {(savePlan.toCreate.length > 0 ||
          savePlan.toUpdate.length > 0 ||
          savePlan.toDelete.length > 0) && (
          <div className="bulk-changes">
            <span>Neu: {savePlan.toCreate.length}</span>
            <span>Geändert: {savePlan.toUpdate.length}</span>
            <span>Gelöscht: {savePlan.toDelete.length}</span>
          </div>
        )}

        {tracks.length === 0 && (
          <p className="hint">
            Lege zuerst eine Eventspur an, bevor du Wettkämpfe pflegst.
          </p>
        )}

        <div className="bulk-table-wrap">
          <table className="bulk-table">
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.field}>{column.label}</th>
                ))}
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.key}
                  className={row.deleted ? "bulk-row-deleted" : ""}
                >
                  {visibleColumns.map((column, colIndex) => (
                    <BulkCell
                      key={column.field}
                      row={row}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      column={column}
                      tracks={tracks}
                      failure={failures[row.key]}
                      validationResult={validation.byKey[row.key]}
                      updateRow={updateRow}
                      onKeyDown={handleCellKeyDown}
                    />
                  ))}
                  <td className="bulk-cell-actions">
                    <button
                      type="button"
                      className="button quiet small"
                      onClick={() => duplicateRow(row.key)}
                    >
                      Duplizieren
                    </button>
                    <button
                      type="button"
                      className="button danger small"
                      onClick={() => removeRow(row.key)}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bulk-add">
          <button
            type="button"
            className="button quiet"
            onClick={() => addRowAndFocus(0)}
          >
            + Wettkampf hinzufügen
          </button>
        </div>

        {Object.keys(failures).length > 0 && (
          <div className="bulk-errors" role="alert">
            {Object.entries(failures).map(([key, message]) => {
              const row = rows.find((item) => item.key === key);
              return (
                <p key={key} className="field-error">
                  {row?.name || "Zeile"}: {message}
                </p>
              );
            })}
          </div>
        )}

        <div className="editor-footer">
          <button
            type="button"
            className="button quiet"
            onClick={onClose}
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={
              saving ||
              rows.length === 0 ||
              validation.errorCount > 0 ||
              tracks.length === 0
            }
            onClick={handleSave}
          >
            {saving ? "Speichert …" : "Alle Änderungen speichern"}
          </button>
        </div>
      </section>
    </div>
  );
}

function BulkCell({
  row,
  rowIndex,
  colIndex,
  column,
  tracks,
  failure,
  validationResult,
  updateRow,
  onKeyDown,
}: {
  row: BulkEventRow;
  rowIndex: number;
  colIndex: number;
  column: BulkColumnDefinition;
  tracks: EventTrack[];
  failure?: string;
  validationResult: ReturnType<typeof validateBulkRows>["byKey"][string];
  updateRow: (key: string, patch: Partial<BulkEventRow>) => void;
  onKeyDown: (
    event: React.KeyboardEvent<BulkCellRef>,
    rowIndex: number,
    colIndex: number,
  ) => void;
}) {
  const cellError =
    failure ??
    validationResult?.errors.find((issue) => issue.field === column.field)
      ?.message;
  const cellWarning = validationResult?.warnings.find(
    (issue) => issue.field === column.field,
  )?.message;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<BulkCellRef>) =>
      onKeyDown(event, rowIndex, colIndex),
    [onKeyDown, rowIndex, colIndex],
  );

  if (column.field === "startDate" || column.field === "endDate") {
    return (
      <td
        className={
          cellError
            ? "bulk-cell bulk-cell-error"
            : cellWarning
              ? "bulk-cell bulk-cell-warning"
              : "bulk-cell"
        }
      >
        <input
          className="bulk-input"
          type="text"
          placeholder="TT.MM.JJJJ"
          value={row[column.field]}
          onChange={(event) =>
            updateRow(row.key, { [column.field]: event.target.value })
          }
          aria-label={column.label}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  if (column.field === "trackId") {
    return (
      <td className="bulk-cell">
        <select
          className="bulk-input"
          value={row.trackId}
          onChange={(event) =>
            updateRow(row.key, { trackId: event.target.value })
          }
          aria-label={column.label}
          onKeyDown={handleKeyDown}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (column.field === "priority") {
    return (
      <td className="bulk-cell">
        <select
          className="bulk-input"
          value={row.priority}
          onChange={(event) =>
            updateRow(row.key, { priority: event.target.value })
          }
          aria-label={column.label}
          onKeyDown={handleKeyDown}
        >
          <option value="">–</option>
          {DEFAULT_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (
    column.field === "name" ||
    column.field === "location" ||
    column.field === "category"
  ) {
    return (
      <td
        className={
          cellError
            ? "bulk-cell bulk-cell-error"
            : cellWarning
              ? "bulk-cell bulk-cell-warning"
              : "bulk-cell"
        }
      >
        <input
          className="bulk-input"
          type="text"
          value={row[column.field]}
          onChange={(event) =>
            updateRow(row.key, { [column.field]: event.target.value })
          }
          aria-label={column.label}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  return (
    <td className="bulk-cell">
      <input
        className="bulk-input"
        type="text"
        value={row[column.field as "goal" | "notes"]}
        onChange={(event) =>
          updateRow(row.key, { [column.field]: event.target.value })
        }
        aria-label={column.label}
        onKeyDown={handleKeyDown}
      />
    </td>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
