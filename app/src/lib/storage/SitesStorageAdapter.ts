import type { Id, Revision } from "../domain/types";
import type {
  ListOptions,
  PutOptions,
  SoftDeleteOptions,
  StorageAdapter,
  StorageCollection,
  StorageSnapshot,
  StoredEntity,
} from "./StorageAdapter";

/** Do not implement against an invented API. Verify actual ChatGPT Sites runtime bindings first and document them in an ADR. */
export class SitesStorageAdapter implements StorageAdapter {
  private unavailable(): never {
    throw new Error(
      "SitesStorageAdapter requires verified ChatGPT Sites runtime bindings.",
    );
  }

  get<T>(_collection: StorageCollection, _id: Id): Promise<T | null> {
    return this.unavailable();
  }

  list<T>(
    _collection: StorageCollection,
    _options?: ListOptions,
  ): Promise<T[]> {
    return this.unavailable();
  }

  put<T extends StoredEntity>(
    _collection: Exclude<StorageCollection, "revisions">,
    _entity: T,
    _options?: PutOptions,
  ): Promise<T> {
    return this.unavailable();
  }

  softDelete(
    _collection: Exclude<StorageCollection, "revisions">,
    _id: Id,
    _options: SoftDeleteOptions,
  ): Promise<void> {
    return this.unavailable();
  }

  listRevisions(_seasonId: Id): Promise<Revision[]> {
    return this.unavailable();
  }

  exportAll(): Promise<StorageSnapshot> {
    return this.unavailable();
  }

  hydrate(_snapshot: StorageSnapshot): Promise<void> {
    return this.unavailable();
  }
}
