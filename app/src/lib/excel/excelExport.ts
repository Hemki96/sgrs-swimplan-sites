import * as XLSX from "xlsx";

import type {
  CalendarConstraint,
  Event,
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  PeriodizationDimension,
  Season,
  TrainingDay,
  TrainingSession,
} from "../domain/types";
import { buildWeeks, formatIsoDate, overlaps } from "../domain/isoWeek";
import { seasonRangeLabel } from "../export/jsonExport";
import type {
  StorageCollection,
  StorageAdapter,
  StorageSnapshot,
} from "../storage/StorageAdapter";
import { importSeasonScope } from "../storage/importScope";
import {
  DIMENSION_CODES,
  EXCEL_CELL_SEPARATOR,
  EXCEL_DIMENSION_COLUMNS,
  EXCEL_HEADER,
  HOLIDAY_CONSTRAINT_TYPE,
  MAX_SHEET_NAME_LENGTH,
  WK_MAJOR_PREFIX,
  WK_REGULAR_PREFIX,
  type ExcelDimensionColumn,
} from "./excelFormat";

export interface ExcelExportSheet {
  name: string;
  rows: unknown[][];
}

export function buildExcelExportSheets(
  snapshot: StorageSnapshot,
): ExcelExportSheet[] {
  const seasons = (snapshot.seasons ?? []).filter(
    (row): row is Season => !(row as Season).deletedAt,
  );
  return [...seasons]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .map((season) => ({
      name: season.name,
      rows: buildSeasonSheet(snapshot, season),
    }));
}

export function buildExcelExportFilename(
  snapshot: StorageSnapshot,
  exportedAt = new Date().toISOString(),
) {
  const seasons = (snapshot.seasons ?? []) as Season[];
  const seasonPart = seasonRangeLabel(seasons) ?? "gesamt";
  const exportDate = exportedAt.slice(0, 10);
  return `sgrs-swimplan-${seasonPart}-${exportDate}.xlsx`;
}

export async function downloadExcelExport(
  storage: StorageAdapter,
  exportedAt = new Date().toISOString(),
) {
  const snapshot = await storage.exportAll();
  const sheets = buildExcelExportSheets(snapshot);
  if (!sheets.length) {
    throw new Error("Es gibt keine Saison für einen Excel-Export.");
  }
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      safeSheetName(sheet.name),
    );
  }
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildExcelExportFilename(snapshot, exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}

interface SeasonIndex {
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  events: Event[];
  constraints: CalendarConstraint[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
  trainingDays: TrainingDay[];
  sessionsByDay: Map<string, TrainingSession[]>;
}

function buildSeasonSheet(
  snapshot: StorageSnapshot,
  season: Season,
): unknown[][] {
  const weeks = buildWeeks(season.startDate, season.endDate);
  const index = indexSeason(snapshot, season.id);
  const rows: unknown[][] = [[...EXCEL_HEADER]];
  let previousMonthKey = "";
  const monthFormatter = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const microcycleByWeek = weeks
    .map((week) => ({
      week,
      microcycle: index.microcycles.find((microcycle) =>
        overlaps(microcycle.startDate, microcycle.endDate, week),
      ),
    }))
    .filter((entry) => entry.microcycle);

  for (const { week, microcycle } of microcycleByWeek) {
    const monthKey = `${week.monday.getUTCFullYear()}-${week.monday.getUTCMonth()}`;
    const monthLabel =
      monthKey === previousMonthKey ? "" : monthFormatter.format(week.monday);
    previousMonthKey = monthKey;

    const row: unknown[] = [];
    row[0] = monthLabel;
    row[1] = week.isoWeek;
    row[2] = formatIsoDate(week.monday);
    row[3] = joinValues(
      index.events
        .filter((event) => overlaps(event.startDate, event.endDate, week))
        .map((event) =>
          event.priority === "A"
            ? `${WK_MAJOR_PREFIX} ${event.name}`
            : `${WK_REGULAR_PREFIX} ${event.name}`,
        ),
    );
    row[4] = joinValues(
      index.constraints
        .filter((constraint) =>
          overlaps(constraint.startDate, constraint.endDate, week),
        )
        .map((constraint) => constraint.name),
    );
    row[5] = joinValues(
      index.macrocycles
        .filter((macrocycle) =>
          overlaps(macrocycle.startDate, macrocycle.endDate, week),
        )
        .map((macrocycle) => macrocycle.name),
    );
    for (const column of EXCEL_DIMENSION_COLUMNS) {
      row[EXCEL_HEADER.indexOf(column)] = joinValues(
        index.focusSegments
          .filter(
            (segment) => segment.dimensionId === dimensionIdFor(index, column),
          )
          .filter((segment) =>
            overlaps(segment.startDate, segment.endDate, week),
          )
          .map((segment) => definitionName(index, segment.focusDefinitionId)),
      );
    }
    row[EXCEL_HEADER.indexOf("Meso")] = joinValues(
      index.mesocycles
        .filter((mesocycle) =>
          overlaps(mesocycle.startDate, mesocycle.endDate, week),
        )
        .map((mesocycle) => mesocycle.name),
    );
    row[EXCEL_HEADER.indexOf("Mic RPE")] =
      microcycle && microcycle.targetRpe ? microcycle.targetRpe : "";

    const daysInWeek = index.trainingDays.filter(
      (day) => day.date >= week.startDate && day.date <= week.endDate,
    );
    row[EXCEL_HEADER.indexOf("Fokus")] = joinUnique(
      daysInWeek.map((day) => day.dayContext ?? "").filter(Boolean),
    );
    const sessions = daysInWeek.flatMap(
      (day) => index.sessionsByDay.get(day.id) ?? [],
    );
    row[EXCEL_HEADER.indexOf("Main")] = joinUnique(
      sessions
        .map((session) => definitionName(index, session.mainFocusId))
        .filter(Boolean),
    );
    row[EXCEL_HEADER.indexOf("daily Tech")] = joinUnique(
      sessions
        .map((session) => definitionName(index, session.technicalFocusId))
        .filter(Boolean),
    );
    rows.push(row);
  }
  return rows;
}

function indexSeason(snapshot: StorageSnapshot, seasonId: string): SeasonIndex {
  const alive = (
    collection: StorageCollection,
    rows: readonly unknown[] | undefined,
  ) =>
    (rows ?? []).filter((row) => {
      const entity = row as Record<string, unknown>;
      if (entity.deletedAt) return false;
      return importSeasonScope(snapshot, collection, entity) === seasonId;
    });
  return {
    macrocycles: alive("macrocycles", snapshot.macrocycles) as Macrocycle[],
    mesocycles: alive("mesocycles", snapshot.mesocycles) as Mesocycle[],
    microcycles: alive("microcycles", snapshot.microcycles) as Microcycle[],
    events: alive("events", snapshot.events) as Event[],
    constraints: (
      alive(
        "calendar_constraints",
        snapshot.calendar_constraints,
      ) as CalendarConstraint[]
    ).filter(
      (constraint) =>
        constraint.type.toLocaleLowerCase("de") ===
        HOLIDAY_CONSTRAINT_TYPE.toLocaleLowerCase("de"),
    ),
    dimensions: alive(
      "periodization_dimensions",
      snapshot.periodization_dimensions,
    ) as PeriodizationDimension[],
    focusDefinitions: alive(
      "focus_definitions",
      snapshot.focus_definitions,
    ) as FocusDefinition[],
    focusSegments: alive(
      "focus_segments",
      snapshot.focus_segments,
    ) as FocusSegment[],
    trainingDays: alive(
      "training_days",
      snapshot.training_days,
    ) as TrainingDay[],
    sessionsByDay: groupSessionsByDay(
      alive(
        "training_sessions",
        snapshot.training_sessions,
      ) as TrainingSession[],
    ),
  };
}

function groupSessionsByDay(
  sessions: TrainingSession[],
): Map<string, TrainingSession[]> {
  const groups = new Map<string, TrainingSession[]>();
  for (const session of sessions) {
    const list = groups.get(session.trainingDayId) ?? [];
    list.push(session);
    groups.set(session.trainingDayId, list);
  }
  return groups;
}

function dimensionIdFor(
  index: SeasonIndex,
  column: ExcelDimensionColumn,
): string | undefined {
  return index.dimensions.find(
    (dimension) => dimension.code === DIMENSION_CODES[column],
  )?.id;
}

function definitionName(
  index: SeasonIndex,
  definitionId: string | undefined,
): string {
  if (!definitionId) return "";
  return (
    index.focusDefinitions.find((definition) => definition.id === definitionId)
      ?.name ?? ""
  );
}

function joinValues(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(EXCEL_CELL_SEPARATOR);
}

function joinUnique(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(EXCEL_CELL_SEPARATOR);
}

export function safeSheetName(name: string): string {
  const sanitized = name
    .replace(/[\\/*?:[\]]/g, " ")
    .trim()
    .slice(0, MAX_SHEET_NAME_LENGTH);
  return sanitized || "Saisonplan";
}
