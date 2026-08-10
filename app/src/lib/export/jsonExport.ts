import type {
  StorageAdapter,
  StorageSnapshot,
} from "../storage/StorageAdapter";

const exportKeys = {
  seasons: "seasons",
  event_tracks: "eventTracks",
  events: "events",
  calendar_constraints: "calendarConstraints",
  macrocycles: "macrocycles",
  mesocycles: "mesocycles",
  microcycles: "microcycles",
  microcycle_segments: "microcycleSegments",
  periodization_dimensions: "periodizationDimensions",
  focus_definitions: "focusDefinitions",
  focus_segments: "focusSegments",
  training_days: "trainingDays",
  training_sessions: "trainingSessions",
  equipment_items: "equipmentItems",
  session_equipment: "sessionEquipment",
  revisions: "revisions",
} as const;

export function buildJsonExport(
  snapshot: StorageSnapshot,
  exportedAt = new Date().toISOString(),
) {
  const payload: Record<string, unknown> = { schemaVersion: 1, exportedAt };
  for (const [collection, key] of Object.entries(exportKeys)) {
    payload[key] = snapshot[collection as keyof StorageSnapshot] ?? [];
  }
  return payload;
}

export async function downloadJsonExport(storage: StorageAdapter) {
  const payload = buildJsonExport(await storage.exportAll());
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sgrs-swimplan-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
