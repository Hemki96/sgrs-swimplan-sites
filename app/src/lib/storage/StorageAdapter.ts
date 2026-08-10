import type { Id, Revision } from "../domain/types";

export const STORAGE_COLLECTIONS = [
  "configuration_values",
  "seasons",
  "event_tracks",
  "events",
  "calendar_constraints",
  "macrocycles",
  "mesocycles",
  "microcycles",
  "microcycle_segments",
  "periodization_dimensions",
  "focus_definitions",
  "focus_segments",
  "training_days",
  "training_sessions",
  "equipment_items",
  "session_equipment",
  "revisions",
] as const;

export type StorageCollection = (typeof STORAGE_COLLECTIONS)[number];

export const EXPORT_COLLECTION_KEYS: Record<StorageCollection, string> = {
  configuration_values: "configurationValues",
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
};

export interface ListOptions {
  includeDeleted?: boolean;
}

export interface RevisionContext {
  seasonId: Id;
  editorLabel?: string;
}

export interface PutOptions {
  expectedVersion?: number;
  revision?: RevisionContext;
}

export interface SoftDeleteOptions {
  expectedVersion: number;
  revision?: RevisionContext;
}

export interface StoredEntity {
  id: Id;
  version: number;
  deletedAt?: string | null;
}

export type StorageSnapshot = Partial<
  Record<StorageCollection, readonly unknown[]>
>;

export interface StorageAdapter {
  get<T>(collection: StorageCollection, id: Id): Promise<T | null>;
  list<T>(collection: StorageCollection, options?: ListOptions): Promise<T[]>;
  put<T extends StoredEntity>(
    collection: Exclude<StorageCollection, "revisions">,
    entity: T,
    options?: PutOptions,
  ): Promise<T>;
  softDelete(
    collection: Exclude<StorageCollection, "revisions">,
    id: Id,
    options: SoftDeleteOptions,
  ): Promise<void>;
  listRevisions(seasonId: Id): Promise<Revision[]>;
  listGlobalRevisions(): Promise<Revision[]>;
  exportAll(): Promise<StorageSnapshot>;
  hydrate(snapshot: StorageSnapshot): Promise<void>;
  applyImport(snapshot: StorageSnapshot): Promise<void>;
}

export const GLOBAL_REVISION_SCOPE_ID = "__global_configuration__";
