import type { Id, Revision } from "../domain/types";
import { VersionConflictError } from "./InMemoryStorageAdapter";
import type {
  ListOptions,
  PutOptions,
  SoftDeleteOptions,
  StorageAdapter,
  StorageCollection,
  StorageSnapshot,
  StoredEntity,
} from "./StorageAdapter";

export class SitesStorageAdapter implements StorageAdapter {
  constructor(private readonly apiBase = "/api/storage") {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    if (response.status === 409) {
      const conflict = (await response.json()) as {
        expectedVersion: number;
        actualVersion: number | null;
      };
      throw new VersionConflictError(
        conflict.expectedVersion,
        conflict.actualVersion,
      );
    }
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Storage request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  get<T>(collection: StorageCollection, id: Id): Promise<T | null> {
    return this.request(`/${collection}/${encodeURIComponent(id)}`);
  }

  list<T>(
    collection: StorageCollection,
    options: ListOptions = {},
  ): Promise<T[]> {
    const query = options.includeDeleted ? "?includeDeleted=true" : "";
    return this.request(`/${collection}${query}`);
  }

  put<T extends StoredEntity>(
    collection: Exclude<StorageCollection, "revisions">,
    entity: T,
    options: PutOptions = {},
  ): Promise<T> {
    return this.request(`/${collection}/${encodeURIComponent(entity.id)}`, {
      method: "PUT",
      body: JSON.stringify({ entity, options }),
    });
  }

  softDelete(
    collection: Exclude<StorageCollection, "revisions">,
    id: Id,
    options: SoftDeleteOptions,
  ): Promise<void> {
    return this.request(`/${collection}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify({ options }),
    });
  }

  listRevisions(seasonId: Id): Promise<Revision[]> {
    return this.request(`/revisions?seasonId=${encodeURIComponent(seasonId)}`);
  }

  exportAll(): Promise<StorageSnapshot> {
    return this.request("/export");
  }

  hydrate(snapshot: StorageSnapshot): Promise<void> {
    void snapshot;
    throw new Error(
      "Sites import requires the validated preview and confirmation flow.",
    );
  }
}
