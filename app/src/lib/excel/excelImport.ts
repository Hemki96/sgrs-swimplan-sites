import * as XLSX from "xlsx";

import type {
  CalendarConstraint,
  Event,
  EventTrack,
  FocusDefinition,
  FocusSegment,
  ISODate,
  Macrocycle,
  Mesocycle,
  Microcycle,
  MicrocycleSegment,
  PeriodizationDimension,
  Season,
  TrainingDay,
  TrainingSession,
} from "../domain/types";
import {
  addDays,
  formatIsoDate,
  getIsoWeek,
  mondayOf,
  parseIsoDate,
} from "../domain/isoWeek";
import type { StorageSnapshot } from "../storage/StorageAdapter";
import {
  DEFAULT_EVENT_TRACK_NAME,
  DIMENSION_CODES,
  DIMENSION_NAMES,
  EXCEL_CELL_SEPARATOR,
  EXCEL_DIMENSION_COLUMNS,
  EXCEL_HEADER,
  FALLBACK_MACRO_NAME,
  FALLBACK_MESO_NAME,
  HOLIDAY_CONSTRAINT_TYPE,
  WK_MAJOR_PREFIX,
  WK_REGULAR_PREFIX,
  matchesHeader,
  type ExcelDimensionColumn,
} from "./excelFormat";

export interface ExcelWeek {
  kw: number;
  monday: ISODate;
  sunday: ISODate;
  wk?: string;
  ferien?: string;
  macro?: string;
  meso?: string;
  rpe?: number;
  dimensions: Partial<Record<ExcelDimensionColumn, string>>;
  fokus?: string;
  main?: string;
  tech?: string;
}

export interface ExcelParsedSheet {
  name: string;
  weeks: ExcelWeek[];
  startDate: ISODate;
  endDate: ISODate;
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

export interface ExcelImportPreview {
  sheets: ExcelParsedSheet[];
  errors: string[];
}

const EXCEL_EPOCH_OFFSET_DAYS = 25569;

export function excelSerialToIso(serial: number): ISODate {
  return formatIsoDate(
    new Date((serial - EXCEL_EPOCH_OFFSET_DAYS) * 86_400_000),
  );
}

export function parseDateCell(value: unknown): ISODate | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatIsoDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return excelSerialToIso(value);
  }
  if (typeof value !== "string") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    try {
      parseIsoDate(date);
      return date;
    } catch {
      return null;
    }
  }
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(value.trim());
  if (german) {
    const year = german[3].length === 2 ? `20${german[3]}` : german[3];
    const date = `${year}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
    try {
      parseIsoDate(date);
      return date;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseKwCell(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(number) || number < 1 || number > 53) return null;
  return number;
}

export function parseRpeCell(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(number) || number < 1 || number > 10) return null;
  return number;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatIsoDate(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "";
  return String(value).trim();
}

function isEmptyDatum(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return false;
  if (value instanceof Date) return false;
  return String(value).trim() === "";
}

export function parseExcelRows(
  rows: readonly (readonly unknown[])[],
  sheetName: string,
): ExcelParsedSheet {
  const warnings: string[] = [];
  const errors: string[] = [];
  const weeks: ExcelWeek[] = [];
  const headerIndex = rows.findIndex((row) => matchesHeader(row));
  if (headerIndex === -1) {
    return {
      name: sheetName,
      weeks: [],
      startDate: "",
      endDate: "",
      counts: {},
      warnings,
      errors: ["Die Kopfzeile des Excel-Templates fehlt."],
    };
  }
  const columnIndex = new Map<string, number>();
  EXCEL_HEADER.forEach((column, index) => columnIndex.set(column, index));
  let previousMonday = "";
  for (const row of rows.slice(headerIndex + 1)) {
    const at = (column: string) =>
      columnIndex.get(column) === undefined
        ? ""
        : cellText(row[columnIndex.get(column)!]);
    const datumRaw = row[columnIndex.get("Datum")!];
    if (
      cellText(row[columnIndex.get("KW")!]) === "" &&
      isEmptyDatum(datumRaw)
    ) {
      continue;
    }
    const kw = parseKwCell(row[columnIndex.get("KW")!]);
    if (kw === null) {
      errors.push("Eine Zeile enthält keine gültige KW.");
      continue;
    }
    const mondayDate = isEmptyDatum(datumRaw) ? null : parseDateCell(datumRaw);
    if (!mondayDate) {
      errors.push(`KW ${kw}: kein gültiges Datum.`);
      continue;
    }
    const monday = formatIsoDate(mondayOf(parseIsoDate(mondayDate)));
    if (previousMonday && monday <= previousMonday) {
      errors.push(
        `KW ${kw}: Das Datum ${monday} liegt nicht nach der vorherigen Woche.`,
      );
      continue;
    }
    const isoWeek = getIsoWeek(parseIsoDate(monday));
    if (isoWeek.week !== kw) {
      warnings.push(
        `KW ${kw}: Der ${monday} entspricht der Kalenderwoche ${isoWeek.week}.`,
      );
    }
    previousMonday = monday;

    const rpeValue = at("Mic RPE");
    const rpe = parseRpeCell(row[columnIndex.get("Mic RPE")!]);
    if (rpeValue && rpe === null) {
      errors.push(
        `KW ${kw}: Mic RPE muss eine ganze Zahl zwischen 1 und 10 sein.`,
      );
    }

    const dimensions: Partial<Record<ExcelDimensionColumn, string>> = {};
    for (const column of EXCEL_DIMENSION_COLUMNS) {
      const value = at(column);
      if (value) dimensions[column] = value;
    }

    const week: ExcelWeek = {
      kw,
      monday,
      sunday: formatIsoDate(addDays(parseIsoDate(monday), 6)),
      dimensions,
    };
    const wk = at("WK");
    const ferien = at("Ferien");
    const macro = at("Macro");
    const meso = at("Meso");
    const fokus = at("Fokus");
    const main = at("Main");
    const tech = at("daily Tech");
    if (wk) week.wk = wk;
    if (ferien) week.ferien = ferien;
    if (macro) week.macro = macro;
    if (meso) week.meso = meso;
    if (rpe !== null) week.rpe = rpe;
    if (fokus) week.fokus = fokus;
    if (main) week.main = main;
    if (tech) week.tech = tech;
    weeks.push(week);
  }
  if (!weeks.length) {
    errors.push("Die Datei enthält keine Wochenzeilen.");
  }
  return {
    name: sheetName,
    weeks,
    startDate: weeks[0]?.monday ?? "",
    endDate: weeks.at(-1)?.sunday ?? "",
    counts: countSheet(weeks),
    warnings,
    errors,
  };
}

export function parseExcelWorkbook(data: ArrayBuffer): ExcelImportPreview {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(data), {
      type: "array",
      cellDates: true,
    });
  } catch {
    return {
      sheets: [],
      errors: ["Die Datei ist keine gültige Excel-Arbeitsmappe."],
    };
  }
  const sheets = workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      defval: "",
      raw: true,
    }) as unknown[][];
    return parseExcelRows(rows, name);
  });
  if (
    !sheets.some((sheet) => sheet.weeks.length > 0 && sheet.errors.length === 0)
  ) {
    const details = [...new Set(sheets.flatMap((sheet) => sheet.errors))].slice(
      0,
      5,
    );
    return {
      sheets,
      errors: details.length
        ? details
        : ["Die Datei enthält kein gültiges Saisonplan-Blatt."],
    };
  }
  return { sheets, errors: [] };
}

export interface ExcelImportResult {
  snapshot: StorageSnapshot;
  warnings: string[];
}

export function buildExcelImportSnapshot(
  sheet: ExcelParsedSheet,
): ExcelImportResult {
  if (sheet.errors.length) {
    throw new Error("Excel preview contains errors");
  }
  if (!sheet.weeks.length) {
    throw new Error("Excel preview contains no weeks");
  }
  const seasonId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const warnings: string[] = [];
  const snapshot: StorageSnapshot = {
    seasons: [
      {
        id: seasonId,
        name: seasonName(sheet),
        startDate: sheet.startDate,
        endDate: sheet.endDate,
        description: "Aus dem Excel-Import angelegte Saison.",
        mainGoal: "",
        status: "draft",
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 0,
      } satisfies Season,
    ],
  };

  const macroGroups = groupConsecutive(sheet.weeks, (week) => week.macro ?? "");
  const macrocycles: Macrocycle[] = macroGroups.map((group) => ({
    id: crypto.randomUUID(),
    seasonId,
    name: group.value || FALLBACK_MACRO_NAME,
    startDate: group.startDate,
    endDate: group.endDate,
    goal: "",
    notes: "",
    version: 0,
  }));
  const macroIdByWeek = new Map<number, string>();
  macroGroups.forEach((group, groupIndex) =>
    group.weekIndices.forEach((weekIndex) =>
      macroIdByWeek.set(weekIndex, macrocycles[groupIndex].id),
    ),
  );

  const mesoGroups = groupConsecutive(sheet.weeks, (week) => week.meso ?? "");
  const mesocycles: Mesocycle[] = mesoGroups.map((group) => ({
    id: crypto.randomUUID(),
    seasonId,
    macrocycleId: macroIdByWeek.get(group.weekIndices[0]) ?? macrocycles[0].id,
    name: group.value || FALLBACK_MESO_NAME,
    startDate: group.startDate,
    endDate: group.endDate,
    goal: "",
    notes: "",
    version: 0,
  }));
  const mesoIdByWeek = new Map<number, string>();
  mesoGroups.forEach((group, groupIndex) =>
    group.weekIndices.forEach((weekIndex) =>
      mesoIdByWeek.set(weekIndex, mesocycles[groupIndex].id),
    ),
  );

  const microcycles: Microcycle[] = sheet.weeks.map((week, index) => ({
    id: crypto.randomUUID(),
    mesocycleId: mesoIdByWeek.get(index) ?? mesocycles[0].id,
    name: `KW ${week.kw}`,
    startDate: week.monday,
    endDate: week.sunday,
    targetRpe: week.rpe ?? undefined,
    goal: "",
    version: 0,
  }));
  const microcycleSegments: MicrocycleSegment[] = microcycles.map(
    (microcycle) => ({
      id: crypto.randomUUID(),
      microcycleId: microcycle.id,
      name: microcycle.name,
      startDate: microcycle.startDate,
      endDate: microcycle.endDate,
      segmentType: "Training",
      sortOrder: 0,
      version: 0,
    }),
  );

  const dimensions: PeriodizationDimension[] = EXCEL_DIMENSION_COLUMNS.map(
    (column, sortOrder) => ({
      id: crypto.randomUUID(),
      seasonId,
      name: DIMENSION_NAMES[column],
      code: DIMENSION_CODES[column],
      sortOrder,
      active: true,
      version: 0,
    }),
  );
  const dimensionIdByColumn = new Map<ExcelDimensionColumn, string>();
  EXCEL_DIMENSION_COLUMNS.forEach((column, index) =>
    dimensionIdByColumn.set(column, dimensions[index].id),
  );

  const focusDefinitions: FocusDefinition[] = [];
  const focusByText = new Map<string, FocusDefinition>();
  const createFocusDefinition = (
    text: string,
    column: ExcelDimensionColumn,
  ): FocusDefinition => {
    const existing = focusByText.get(text.toLocaleLowerCase("de"));
    if (existing) return existing;
    const definition: FocusDefinition = {
      id: crypto.randomUUID(),
      seasonId,
      dimensionId: dimensionIdByColumn.get(column)!,
      name: text,
      code: focusCode(text),
      active: true,
      version: 0,
    };
    focusDefinitions.push(definition);
    focusByText.set(text.toLocaleLowerCase("de"), definition);
    return definition;
  };
  for (const column of EXCEL_DIMENSION_COLUMNS) {
    const texts = new Set(
      sheet.weeks
        .map((week) => week.dimensions[column])
        .filter((text): text is string => Boolean(text)),
    );
    for (const text of texts) createFocusDefinition(text, column);
  }

  const focusSegments: FocusSegment[] = [];
  for (const column of EXCEL_DIMENSION_COLUMNS) {
    const groups = groupConsecutive(
      sheet.weeks,
      (week) => week.dimensions[column] ?? "",
    );
    for (const group of groups) {
      if (!group.value) continue;
      const definition = focusByText.get(group.value.toLocaleLowerCase("de"))!;
      focusSegments.push({
        id: crypto.randomUUID(),
        seasonId,
        dimensionId: dimensionIdByColumn.get(column)!,
        focusDefinitionId: definition.id,
        startDate: group.startDate,
        endDate: group.endDate,
        notes: "",
        version: 0,
      });
    }
  }

  const eventTracks: EventTrack[] = [];
  const events: Event[] = [];
  const weeksWithEvents = sheet.weeks.filter((week) => Boolean(week.wk));
  if (weeksWithEvents.length) {
    const trackId = crypto.randomUUID();
    eventTracks.push({
      id: trackId,
      seasonId,
      name: DEFAULT_EVENT_TRACK_NAME,
      sortOrder: 0,
      visible: true,
      version: 0,
    });
    for (const week of weeksWithEvents) {
      for (const token of splitCells(week.wk!)) {
        const parsed = parseWkToken(token);
        events.push({
          id: crypto.randomUUID(),
          seasonId,
          trackId,
          name: parsed.name,
          startDate: week.monday,
          endDate: week.monday,
          priority: parsed.priority,
          version: 0,
        });
      }
    }
  }

  const holidayGroups = groupConsecutive(
    sheet.weeks,
    (week) => week.ferien ?? "",
  );
  const calendarConstraints: CalendarConstraint[] = holidayGroups
    .filter((group) => Boolean(group.value))
    .map((group) => ({
      id: crypto.randomUUID(),
      seasonId,
      type: HOLIDAY_CONSTRAINT_TYPE,
      name: group.value,
      startDate: group.startDate,
      endDate: group.endDate,
      version: 0,
    }));

  const trainingDays: TrainingDay[] = [];
  const trainingSessions: TrainingSession[] = [];
  const weeksWithDailyContent = sheet.weeks.filter(
    (week) => Boolean(week.fokus) || Boolean(week.main) || Boolean(week.tech),
  );
  for (const week of weeksWithDailyContent) {
    const resolvedMain = resolveFocusText(
      week.main,
      "Tactical",
      createFocusDefinition,
    );
    const resolvedTech = resolveFocusText(
      week.tech,
      "Tech",
      createFocusDefinition,
    );
    if (week.main && !resolvedMain)
      warnings.push(`KW ${week.kw}: Unbekannter Main-Fokus „${week.main}“.`);
    if (week.tech && !resolvedTech)
      warnings.push(`KW ${week.kw}: Unbekannter Technik-Fokus „${week.tech}“.`);
    for (let offset = 0; offset < 5; offset += 1) {
      const date = formatIsoDate(addDays(parseIsoDate(week.monday), offset));
      const trainingDayId = crypto.randomUUID();
      trainingDays.push({
        id: trainingDayId,
        seasonId,
        date,
        dayContext: week.fokus,
        version: 0,
      });
      trainingSessions.push({
        id: crypto.randomUUID(),
        trainingDayId,
        mainFocusId: resolvedMain?.id,
        technicalFocusId: resolvedTech?.id,
        keySession: false,
        version: 0,
      });
    }
  }

  snapshot.macrocycles = macrocycles;
  snapshot.mesocycles = mesocycles;
  snapshot.microcycles = microcycles;
  snapshot.microcycle_segments = microcycleSegments;
  snapshot.periodization_dimensions = dimensions;
  snapshot.focus_definitions = focusDefinitions;
  snapshot.focus_segments = focusSegments;
  snapshot.event_tracks = eventTracks;
  snapshot.events = events;
  snapshot.calendar_constraints = calendarConstraints;
  snapshot.training_days = trainingDays;
  snapshot.training_sessions = trainingSessions;
  return { snapshot, warnings };
}

interface GroupedRange {
  value: string;
  startDate: ISODate;
  endDate: ISODate;
  weekIndices: number[];
}

function groupConsecutive(
  weeks: readonly ExcelWeek[],
  valueOf: (week: ExcelWeek) => string,
): GroupedRange[] {
  const groups: GroupedRange[] = [];
  weeks.forEach((week, index) => {
    const value = valueOf(week);
    const last = groups.at(-1);
    if (last && last.value === value) {
      last.endDate = week.sunday;
      last.weekIndices.push(index);
    } else {
      groups.push({
        value,
        startDate: week.monday,
        endDate: week.sunday,
        weekIndices: [index],
      });
    }
  });
  return groups;
}

function splitCells(value: string): string[] {
  return value
    .split(EXCEL_CELL_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseWkToken(token: string): { name: string; priority: "A" | "B" } {
  if (token === WK_MAJOR_PREFIX || token.startsWith("WK M ")) {
    return {
      name: token.slice(WK_MAJOR_PREFIX.length).trim() || "Wettkampf",
      priority: "A",
    };
  }
  if (token === WK_REGULAR_PREFIX || token.startsWith("WK ")) {
    return {
      name: token.slice(WK_REGULAR_PREFIX.length).trim() || "Wettkampf",
      priority: "B",
    };
  }
  return { name: token, priority: "B" };
}

function resolveFocusText(
  text: string | undefined,
  fallbackColumn: ExcelDimensionColumn,
  createFallback: (
    text: string,
    column: ExcelDimensionColumn,
  ) => FocusDefinition,
): FocusDefinition | undefined {
  if (!text) return undefined;
  return createFallback(text, fallbackColumn);
}

function focusCode(text: string): string {
  const slug = text
    .toLocaleUpperCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "FOKUS";
}

function seasonName(sheet: ExcelParsedSheet): string {
  const name = sheet.name?.trim() ?? "";
  if (name && !/^sheet\d*$/i.test(name)) return name;
  const startYear = sheet.startDate.slice(0, 4);
  const endYear = sheet.endDate.slice(2, 4);
  return `Saison ${startYear}/${endYear}`;
}

function countSheet(weeks: readonly ExcelWeek[]): Record<string, number> {
  const weeksWithDailyContent = weeks.filter(
    (week) => Boolean(week.fokus) || Boolean(week.main) || Boolean(week.tech),
  );
  const focusTexts = new Set(
    weeks.flatMap((week) =>
      EXCEL_DIMENSION_COLUMNS.flatMap((column) =>
        week.dimensions[column] ? [week.dimensions[column]!] : [],
      ),
    ),
  );
  const focusGroups = EXCEL_DIMENSION_COLUMNS.reduce(
    (sum, column) =>
      sum +
      groupConsecutive(weeks, (week) => week.dimensions[column] ?? "").filter(
        (group) => Boolean(group.value),
      ).length,
    0,
  );
  return {
    Wochen: weeks.length,
    Macrozyklen: groupConsecutive(weeks, (week) => week.macro ?? "").length,
    Mesozyklen: groupConsecutive(weeks, (week) => week.meso ?? "").length,
    Mikrozyklen: weeks.length,
    Wettkämpfe: weeks.filter((week) => Boolean(week.wk)).length,
    Ferien: groupConsecutive(weeks, (week) => week.ferien ?? "").filter(
      (group) => Boolean(group.value),
    ).length,
    Fokusdefinitionen: focusTexts.size,
    Fokussegmente: focusGroups,
    Trainingstage: weeksWithDailyContent.length * 5,
    Trainingseinheiten: weeksWithDailyContent.length * 5,
  };
}
