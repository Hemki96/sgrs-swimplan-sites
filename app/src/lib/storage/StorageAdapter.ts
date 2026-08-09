import type { Id, Revision } from "../domain/types";

export const STORAGE_COLLECTIONS = [
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
  exportAll(): Promise<StorageSnapshot>;
  hydrate(snapshot: StorageSnapshot): Promise<void>;
}
