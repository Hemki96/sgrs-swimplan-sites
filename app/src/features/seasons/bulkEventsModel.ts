import type { Event } from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import { eventPriorities, type EventInput } from "../../lib/validation/domain";

export const BULK_DEFAULT_PRIORITY = "B";

export interface BulkEventDefaults {
  trackId: string;
  priority: string;
}

export interface BulkEventRow {
  key: string;
  eventId?: string;
  version?: number;
  seasonId: string;
  trackId: string;
  name: string;
  startDate: string;
  endDate: string;
  priority: string;
  category: string;
  location: string;
  goal: string;
  notes: string;
  deleted: boolean;
  original?: Event;
}

export const BULK_EVENT_FIELDS = [
  "startDate",
  "name",
  "priority",
  "location",
  "endDate",
  "trackId",
  "category",
  "goal",
  "notes",
] as const;
export type BulkEventField = (typeof BULK_EVENT_FIELDS)[number];

export interface BulkColumnDefinition {
  field: BulkEventField;
  label: string;
  optional: boolean;
}

export const BULK_COLUMNS: readonly BulkColumnDefinition[] = [
  { field: "startDate", label: "Datum", optional: false },
  { field: "name", label: "Name", optional: false },
  { field: "priority", label: "Priorität", optional: false },
  { field: "location", label: "Ort", optional: false },
  { field: "endDate", label: "Enddatum", optional: true },
  { field: "trackId", label: "Event Track", optional: true },
  { field: "category", label: "Kategorie", optional: true },
  { field: "goal", label: "Ziel", optional: true },
  { field: "notes", label: "Notiz", optional: true },
];

export interface BulkRowIssue {
  field?: BulkEventField;
  message: string;
}

export interface BulkRowValidation {
  errors: BulkRowIssue[];
  warnings: BulkRowIssue[];
}

export interface BulkValidationOptions {
  defaults: BulkEventDefaults;
  periodRanges: readonly { startDate: string; endDate: string }[];
}

export interface BulkValidationResult {
  byKey: Record<string, BulkRowValidation>;
  errorCount: number;
  warningCount: number;
  readyCount: number;
}

export interface BulkFilter {
  fromDate: string;
  toDate: string;
  trackId: string;
  priority: string;
}

export interface BulkSavePlan {
  toCreate: BulkEventRow[];
  toUpdate: BulkEventRow[];
  toDelete: BulkEventRow[];
  unchangedCount: number;
}

export interface BulkSaveOutcome {
  saved: Array<{ key: string; event: Event }>;
  deletedKeys: string[];
  failed: Record<string, string>;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  message: string;
}

export interface BulkPasteRow {
  startDate: string;
  name: string;
  priority: string;
  location: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GERMAN_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function parseEventDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (ISO_DATE.test(trimmed)) return trimmed;
  const match = GERMAN_DATE.exec(trimmed);
  if (!match) return "";
  const [, day, month, year] = match;
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return "";
  }
  return normalized;
}

export function formatEventDate(value: string): string {
  const iso = parseEventDate(value);
  if (!iso) return value;
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export function createBlankBulkRow(
  defaults: BulkEventDefaults,
  seasonId: string,
  key: string,
): BulkEventRow {
  return {
    key,
    seasonId,
    trackId: defaults.trackId,
    name: "",
    startDate: "",
    endDate: "",
    priority: defaults.priority,
    category: "",
    location: "",
    goal: "",
    notes: "",
    deleted: false,
  };
}

export function bulkRowFromEvent(event: Event, key: string): BulkEventRow {
  return {
    key,
    eventId: event.id,
    version: event.version,
    seasonId: event.seasonId,
    trackId: event.trackId,
    name: event.name,
    startDate: formatEventDate(event.startDate),
    endDate: formatEventDate(event.endDate),
    priority: event.priority,
    category: event.category ?? "",
    location: event.location ?? "",
    goal: event.goal ?? "",
    notes: event.notes ?? "",
    deleted: false,
    original: event,
  };
}

export function duplicateBulkRow(row: BulkEventRow, key: string): BulkEventRow {
  return {
    ...row,
    key,
    eventId: undefined,
    version: undefined,
    original: undefined,
    deleted: false,
  };
}

export function isEmptyBulkRow(row: BulkEventRow): boolean {
  return (
    row.startDate.trim() === "" &&
    row.name.trim() === "" &&
    row.location.trim() === "" &&
    row.category.trim() === "" &&
    row.goal.trim() === "" &&
    row.notes.trim() === ""
  );
}

export function effectivePriority(
  row: Pick<BulkEventRow, "priority">,
  defaults: BulkEventDefaults,
): string {
  return (
    row.priority.trim() || defaults.priority.trim() || BULK_DEFAULT_PRIORITY
  );
}

export function eventInputForRow(
  row: BulkEventRow,
  defaults: BulkEventDefaults,
): EventInput {
  const startDate = parseEventDate(row.startDate) || row.startDate;
  const endDate = parseEventDate(row.endDate) || row.endDate;
  return {
    trackId: row.trackId || defaults.trackId,
    name: row.name.trim(),
    startDate,
    endDate: endDate || startDate,
    priority: effectivePriority(row, defaults) as EventInput["priority"],
    category: row.category,
    location: row.location,
    goal: row.goal,
    notes: row.notes,
  };
}

function resolvedEndDate(row: BulkEventRow): string {
  return parseEventDate(row.endDate) || parseEventDate(row.startDate);
}

export function rowChanged(
  row: BulkEventRow,
  defaults: BulkEventDefaults,
): boolean {
  const original = row.original;
  if (!original) return true;
  return (
    parseEventDate(row.startDate) !== original.startDate ||
    resolvedEndDate(row) !== original.endDate ||
    row.name.trim() !== original.name ||
    (row.trackId || defaults.trackId) !== original.trackId ||
    effectivePriority(row, defaults) !== original.priority ||
    row.category !== (original.category ?? "") ||
    row.location !== (original.location ?? "") ||
    row.goal !== (original.goal ?? "") ||
    row.notes !== (original.notes ?? "")
  );
}

export function validateBulkRow(
  row: BulkEventRow,
  options: BulkValidationOptions,
): BulkRowValidation {
  const errors: BulkRowIssue[] = [];
  const warnings: BulkRowIssue[] = [];

  const startDate = parseEventDate(row.startDate);
  if (row.startDate.trim() === "") {
    errors.push({ field: "startDate", message: "Datum fehlt." });
  } else if (!startDate) {
    errors.push({ field: "startDate", message: "Ungültiges Datum." });
  }

  if (row.name.trim() === "") {
    errors.push({ field: "name", message: "Name fehlt." });
  }

  if (row.endDate.trim() !== "") {
    const endDate = parseEventDate(row.endDate);
    if (!endDate) {
      errors.push({ field: "endDate", message: "Ungültiges Datum." });
    } else if (startDate && endDate < startDate) {
      errors.push({
        field: "endDate",
        message: "Enddatum vor Startdatum.",
      });
    }
  }

  if (row.priority.trim() !== "") {
    const valid = (eventPriorities as readonly string[]).includes(
      row.priority.trim(),
    );
    if (!valid) {
      errors.push({ field: "priority", message: "Ungültiger Prioritätswert." });
    }
  }

  if (row.location.trim() === "") {
    warnings.push({ field: "location", message: "Ort fehlt." });
  }
  if (effectivePriority(row, options.defaults) === "") {
    warnings.push({ field: "priority", message: "Priorität fehlt." });
  }
  if (row.goal.trim() === "") {
    warnings.push({ field: "goal", message: "Ziel fehlt." });
  }
  if (
    startDate &&
    !isWithinAnyPeriod(startDate, resolvedEndDate(row), options.periodRanges)
  ) {
    warnings.push({
      message: "Wettkampf liegt außerhalb einer Periodisierungsphase.",
    });
  }

  return { errors, warnings };
}

export function validateBulkRows(
  rows: readonly BulkEventRow[],
  options: BulkValidationOptions,
): BulkValidationResult {
  const dateCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.deleted) continue;
    const startDate = parseEventDate(row.startDate);
    if (startDate)
      dateCounts.set(startDate, (dateCounts.get(startDate) ?? 0) + 1);
  }

  const byKey: Record<string, BulkRowValidation> = {};
  let errorCount = 0;
  let warningCount = 0;
  let readyCount = 0;
  for (const row of rows) {
    if (row.deleted || isEmptyBulkRow(row)) {
      byKey[row.key] = { errors: [], warnings: [] };
      continue;
    }
    const validation = validateBulkRow(row, options);
    const startDate = parseEventDate(row.startDate);
    if (startDate && (dateCounts.get(startDate) ?? 0) > 1) {
      validation.warnings.push({
        field: "startDate",
        message: "Mehrere Wettkämpfe liegen am gleichen Tag.",
      });
    }
    byKey[row.key] = validation;
    if (validation.errors.length > 0) errorCount += 1;
    if (validation.warnings.length > 0) warningCount += 1;
    if (validation.errors.length === 0) readyCount += 1;
  }
  return { byKey, errorCount, warningCount, readyCount };
}

function isWithinAnyPeriod(
  startDate: string,
  endDate: string,
  ranges: readonly { startDate: string; endDate: string }[],
): boolean {
  return ranges.some(
    (range) => startDate <= range.endDate && endDate >= range.startDate,
  );
}

export function buildBulkSavePlan(
  rows: readonly BulkEventRow[],
  defaults: BulkEventDefaults,
): BulkSavePlan {
  const toCreate: BulkEventRow[] = [];
  const toUpdate: BulkEventRow[] = [];
  const toDelete: BulkEventRow[] = [];
  let unchangedCount = 0;
  for (const row of rows) {
    if (row.deleted) {
      if (row.eventId) toDelete.push(row);
      continue;
    }
    if (isEmptyBulkRow(row)) {
      continue;
    }
    if (!row.eventId) {
      toCreate.push(row);
    } else if (rowChanged(row, defaults)) {
      toUpdate.push(row);
    } else {
      unchangedCount += 1;
    }
  }
  return { toCreate, toUpdate, toDelete, unchangedCount };
}

export async function saveBulkEvents(
  rows: readonly BulkEventRow[],
  defaults: BulkEventDefaults,
  service: SeasonPlanningService,
  seasonId: string,
): Promise<BulkSaveOutcome> {
  const plan = buildBulkSavePlan(rows, defaults);
  const saved: Array<{ key: string; event: Event }> = [];
  const deletedKeys: string[] = [];
  const failed: Record<string, string> = {};

  for (const row of plan.toCreate) {
    try {
      const event = await service.createEvent(
        seasonId,
        eventInputForRow(row, defaults),
      );
      saved.push({ key: row.key, event });
    } catch (error) {
      failed[row.key] = errorMessage(error);
    }
  }
  for (const row of plan.toUpdate) {
    if (!row.original) continue;
    try {
      const event = await service.updateEvent(
        row.original,
        eventInputForRow(row, defaults),
      );
      saved.push({ key: row.key, event });
    } catch (error) {
      failed[row.key] = errorMessage(error);
    }
  }
  for (const row of plan.toDelete) {
    if (!row.original) continue;
    try {
      await service.deleteEvent(row.original);
      deletedKeys.push(row.key);
    } catch (error) {
      failed[row.key] = errorMessage(error);
    }
  }

  const failedCount = Object.keys(failed).length;
  const message =
    failedCount === 0
      ? `${saved.length} Wettkämpfe gespeichert, ${deletedKeys.length} gelöscht.`
      : `${saved.length} Wettkämpfe gespeichert, ${deletedKeys.length} gelöscht, ${failedCount} Zeile(n) fehlgeschlagen.`;
  return {
    saved,
    deletedKeys,
    failed,
    createdCount: plan.toCreate.length,
    updatedCount: plan.toUpdate.length,
    deletedCount: deletedKeys.length,
    message,
  };
}

export function parseBulkPaste(text: string): BulkPasteRow[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(
      (cells) => cells.length >= 2 && cells.some((cell) => cell.trim() !== ""),
    )
    .map((cells) => ({
      startDate: (cells[0] ?? "").trim(),
      name: (cells[1] ?? "").trim(),
      priority: (cells[2] ?? "").trim(),
      location: (cells[3] ?? "").trim(),
    }));
}

export function filterEventsForBulk(
  events: readonly Event[],
  filter: BulkFilter,
): Event[] {
  return events.filter((event) => {
    if (filter.trackId && event.trackId !== filter.trackId) return false;
    if (filter.priority && event.priority !== filter.priority) return false;
    if (filter.fromDate && event.startDate < filter.fromDate) return false;
    if (filter.toDate && event.startDate > filter.toDate) return false;
    return true;
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Die Änderung konnte nicht gespeichert werden.";
}
