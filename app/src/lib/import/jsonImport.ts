import type { ConfigurationValue, Season } from "../domain/types";
import type {
  StorageCollection,
  StorageSnapshot,
} from "../storage/StorageAdapter";
import { EXPORT_COLLECTION_KEYS } from "../storage/StorageAdapter";

export interface ImportDocument {
  schemaVersion: "1.0" | 1 | 2;
  exportedAt: string;
  configurationValues: ConfigurationValue[];
  snapshot: StorageSnapshot;
}

export interface ImportPreview {
  document: ImportDocument;
  seasons: Season[];
  selectedSeasonId?: string;
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

const externalKeys = Object.fromEntries(
  Object.entries(EXPORT_COLLECTION_KEYS).map(([snake, camel]) => [
    camel,
    snake,
  ]),
) as Record<string, StorageCollection>;

export function parseImport(text: string): ImportPreview {
  const errors: string[] = [];
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return emptyPreview(["Die Datei enthält kein gültiges JSON."]);
  }
  const version =
    raw.schemaVersion === "1.0" ||
    raw.schemaVersion === 1 ||
    raw.schemaVersion === 2
      ? raw.schemaVersion
      : null;
  if (!version) errors.push("Unbekannte oder fehlende Schema-Version.");
  const snapshot: StorageSnapshot = {};
  for (const [key, collection] of Object.entries(externalKeys)) {
    const rows = raw[key];
    if (rows !== undefined && !Array.isArray(rows))
      errors.push(`${key} muss eine Liste sein.`);
    if (Array.isArray(rows)) snapshot[collection] = rows;
  }
  const seasons = (snapshot.seasons ?? []) as Season[];
  if (!seasons.length) errors.push("Der Export enthält keine Saison.");
  for (const season of seasons) {
    if (!season.id || !season.name || !season.startDate || !season.endDate)
      errors.push("Mindestens eine Saison ist unvollständig.");
  }
  const document: ImportDocument = {
    schemaVersion: version ?? "1.0",
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    configurationValues: (snapshot.configuration_values ??
      []) as ConfigurationValue[],
    snapshot,
  };
  return {
    document,
    seasons,
    selectedSeasonId: seasons[0]?.id,
    counts: Object.fromEntries(
      Object.entries(snapshot).map(([key, rows]) => [key, rows?.length ?? 0]),
    ),
    warnings:
      version === 1
        ? ["Schema-Version 1 wird beim Import auf Version 2 migriert."]
        : [],
    errors,
  };
}

export function buildImportSnapshot(
  preview: ImportPreview,
  seasonId: string,
): StorageSnapshot {
  if (preview.errors.length) throw new Error("Import preview contains errors");
  const source = preview.document.snapshot;
  const selected = (source.seasons ?? []).find(
    (row) => (row as Season).id === seasonId,
  ) as Season | undefined;
  if (!selected) throw new Error("Selected season not found");
  const included = collectSeasonEntities(source, seasonId);
  const ids = new Map<string, string>();
  for (const rows of Object.values(included))
    for (const row of rows ?? [])
      ids.set((row as { id: string }).id, crypto.randomUUID());
  const fields = [
    "id",
    "seasonId",
    "trackId",
    "macrocycleId",
    "mesocycleId",
    "microcycleId",
    "dimensionId",
    "focusDefinitionId",
    "trainingDayId",
    "sessionId",
    "equipmentId",
    "targetEventId",
  ];
  const remapped: StorageSnapshot = {};
  for (const [collection, rows] of Object.entries(included)) {
    remapped[collection as StorageCollection] = (rows ?? []).map((row) => {
      const next: Record<string, unknown> = {
        ...(row as Record<string, unknown>),
        version: 0,
      };
      for (const field of fields)
        if (typeof next[field] === "string" && ids.has(next[field] as string))
          next[field] = ids.get(next[field] as string);
      delete next.deletedAt;
      return next;
    });
  }
  remapped.configuration_values = preview.document.configurationValues.map(
    (value) => ({
      ...value,
      id: crypto.randomUUID(),
      version: 0,
      deletedAt: undefined,
    }),
  );
  return remapped;
}

function collectSeasonEntities(
  snapshot: StorageSnapshot,
  seasonId: string,
): StorageSnapshot {
  const out: StorageSnapshot = {
    seasons: (snapshot.seasons ?? []).filter(
      (r) => (r as Season).id === seasonId,
    ),
  };
  const direct: StorageCollection[] = [
    "event_tracks",
    "events",
    "calendar_constraints",
    "macrocycles",
    "periodization_dimensions",
    "focus_definitions",
    "focus_segments",
    "training_days",
    "equipment_items",
  ];
  for (const key of direct)
    out[key] = (snapshot[key] ?? []).filter(
      (r) => (r as { seasonId?: string }).seasonId === seasonId,
    );
  const parentFilter = (
    child: StorageCollection,
    field: string,
    parent: StorageCollection,
  ) => {
    const parentIds = new Set(
      (out[parent] ?? []).map((r) => (r as { id: string }).id),
    );
    out[child] = (snapshot[child] ?? []).filter((r) =>
      parentIds.has((r as Record<string, string>)[field]),
    );
  };
  parentFilter("mesocycles", "macrocycleId", "macrocycles");
  parentFilter("microcycles", "mesocycleId", "mesocycles");
  parentFilter("microcycle_segments", "microcycleId", "microcycles");
  parentFilter("training_sessions", "trainingDayId", "training_days");
  parentFilter("session_equipment", "sessionId", "training_sessions");
  return out;
}

function emptyPreview(errors: string[]): ImportPreview {
  return {
    document: {
      schemaVersion: "1.0",
      exportedAt: "",
      configurationValues: [],
      snapshot: {},
    },
    seasons: [],
    counts: {},
    warnings: [],
    errors,
  };
}
