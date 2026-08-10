import type { StorageCollection, StorageSnapshot } from "./StorageAdapter";
import { GLOBAL_REVISION_SCOPE_ID } from "./StorageAdapter";

interface ParentReference {
  field: string;
  parent: StorageCollection;
}

const PARENT_FIELDS: Partial<Record<StorageCollection, ParentReference>> = {
  mesocycles: { field: "macrocycleId", parent: "macrocycles" },
  microcycles: { field: "mesocycleId", parent: "mesocycles" },
  microcycle_segments: { field: "microcycleId", parent: "microcycles" },
  training_sessions: { field: "trainingDayId", parent: "training_days" },
  session_equipment: { field: "sessionId", parent: "training_sessions" },
};

export function importSeasonScope(
  snapshot: StorageSnapshot,
  collection: StorageCollection,
  entity: Record<string, unknown>,
): string | undefined {
  if (collection === "configuration_values") return GLOBAL_REVISION_SCOPE_ID;
  if (collection === "seasons") {
    return typeof entity.id === "string" ? entity.id : undefined;
  }
  if (typeof entity.seasonId === "string" && entity.seasonId.length > 0) {
    return entity.seasonId;
  }
  return resolveParentSeason(snapshot, collection, entity);
}

function resolveParentSeason(
  snapshot: StorageSnapshot,
  collection: StorageCollection,
  entity: Record<string, unknown>,
): string | undefined {
  const reference = PARENT_FIELDS[collection];
  if (!reference) return undefined;
  const parentId = entity[reference.field];
  if (typeof parentId !== "string") return undefined;
  const parent = (snapshot[reference.parent] ?? []).find(
    (row) => (row as Record<string, unknown>).id === parentId,
  ) as Record<string, unknown> | undefined;
  if (!parent) return undefined;
  if (typeof parent.seasonId === "string" && parent.seasonId.length > 0) {
    return parent.seasonId;
  }
  return resolveParentSeason(snapshot, reference.parent, parent);
}
