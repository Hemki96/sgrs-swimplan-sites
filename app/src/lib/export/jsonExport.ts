import type {
  StorageAdapter,
  StorageSnapshot,
} from "../storage/StorageAdapter";
import { EXPORT_COLLECTION_KEYS } from "../storage/StorageAdapter";
import type { Season } from "../domain/types";

export const JSON_EXPORT_SCHEMA_VERSION = "1.0" as const;

export function buildJsonExport(
  snapshot: StorageSnapshot,
  exportedAt = new Date().toISOString(),
) {
  const payload: Record<string, unknown> = {
    schemaVersion: JSON_EXPORT_SCHEMA_VERSION,
    exportedAt,
  };
  for (const [collection, key] of Object.entries(EXPORT_COLLECTION_KEYS)) {
    payload[key] = snapshot[collection as keyof StorageSnapshot] ?? [];
  }
  return payload;
}

export function buildJsonExportFilename(
  snapshot: StorageSnapshot,
  exportedAt = new Date().toISOString(),
) {
  const seasons = (snapshot.seasons ?? []) as Season[];
  const seasonPart = seasonRangeLabel(seasons) ?? "gesamt";
  const exportDate = exportedAt.slice(0, 10);
  return `sgrs-swimplan-${seasonPart}-${exportDate}.json`;
}

export async function downloadJsonExport(
  storage: StorageAdapter,
  exportedAt = new Date().toISOString(),
) {
  const snapshot = await storage.exportAll();
  const payload = buildJsonExport(snapshot, exportedAt);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildJsonExportFilename(snapshot, exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}

function seasonRangeLabel(seasons: Season[]) {
  const ranges = new Set(
    seasons
      .filter((season) => !season.deletedAt)
      .map((season) => {
        const startYear = /^\d{4}/.exec(season.startDate)?.[0];
        const endYear = /^\d{4}/.exec(season.endDate)?.[0];
        if (!startYear || !endYear) return null;
        return `${startYear}-${endYear.slice(-2)}`;
      })
      .filter((range): range is string => range !== null),
  );
  return ranges.size === 1 ? [...ranges][0] : null;
}
