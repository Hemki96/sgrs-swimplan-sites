export const EXCEL_HEADER = [
  "Monat",
  "KW",
  "Datum",
  "WK",
  "Ferien",
  "Macro",
  "Strength",
  "Aero",
  "Anae",
  "Speed",
  "Tactical",
  "Tech",
  "Meso",
  "Mic RPE",
  "Fokus",
  "Main",
  "daily Tech",
] as const;

export type ExcelColumn = (typeof EXCEL_HEADER)[number];

export const EXCEL_DIMENSION_COLUMNS = [
  "Strength",
  "Aero",
  "Anae",
  "Speed",
  "Tactical",
  "Tech",
] as const;

export type ExcelDimensionColumn = (typeof EXCEL_DIMENSION_COLUMNS)[number];

export const DIMENSION_CODES: Record<ExcelDimensionColumn, string> = {
  Strength: "STRENGTH",
  Aero: "AEROBIC",
  Anae: "ANAEROBIC",
  Speed: "SPEED",
  Tactical: "TACTICAL",
  Tech: "TECHNICAL",
};

export const DIMENSION_NAMES: Record<ExcelDimensionColumn, string> = {
  Strength: "Strength",
  Aero: "Aerobic",
  Anae: "Anaerobic",
  Speed: "Speed",
  Tactical: "Tactical",
  Tech: "Technical",
};

export const EXCEL_CELL_SEPARATOR = " | ";

export const WK_MAJOR_PREFIX = "WK M";
export const WK_REGULAR_PREFIX = "WK";

export const DEFAULT_EVENT_TRACK_NAME = "WK";
export const HOLIDAY_CONSTRAINT_TYPE = "Ferien";
export const FALLBACK_MACRO_NAME = "Macro";
export const FALLBACK_MESO_NAME = "Meso";

export const EXCEL_SHEET_NAME = "Saisonplan";
export const MAX_SHEET_NAME_LENGTH = 31;

export function matchesHeader(row: readonly unknown[]): boolean {
  const normalized = row.map((cell) =>
    typeof cell === "string" ? cell.trim() : "",
  );
  return EXCEL_HEADER.every((column, index) => normalized[index] === column);
}
