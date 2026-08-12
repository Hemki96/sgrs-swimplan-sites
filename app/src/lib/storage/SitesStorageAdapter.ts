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
import { GLOBAL_REVISION_SCOPE_ID } from "./StorageAdapter";
import { EXPORT_COLLECTION_KEYS } from "./StorageAdapter";

export interface StorageApiErrorBody {
  error: {
    code: string;
    message: string;
    collection?: StorageCollection;
    entityId?: string;
    path?: string;
  };
}

export class StorageValidationError extends Error {
  constructor(readonly detail: StorageApiErrorBody["error"]) {
    super(detail.message);
    this.name = "StorageValidationError";
  }
}

export class StorageTransportError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StorageTransportError";
  }
}

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
      const text = await response.text();
      let body: StorageApiErrorBody | null = null;
      try {
        body = JSON.parse(text) as StorageApiErrorBody;
      } catch {
        // Non-JSON failures are transport/runtime errors.
      }
      if (body?.error?.code && body.error.message) {
        throw new StorageValidationError(body.error);
      }
      throw new StorageTransportError(
        text || `Storage request failed (${response.status})`,
        response.status,
      );
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

  listGlobalRevisions(): Promise<Revision[]> {
    return this.listRevisions(GLOBAL_REVISION_SCOPE_ID);
  }

  purgeSeason(seasonId: Id): Promise<void> {
    return this.request(`/seasons/${encodeURIComponent(seasonId)}/purge`, {
      method: "DELETE",
    });
  }

  async exportAll(): Promise<StorageSnapshot> {
    const document = await this.request<Record<string, unknown>>("/export");
    const snapshot: StorageSnapshot = {};
    for (const [collection, key] of Object.entries(EXPORT_COLLECTION_KEYS)) {
      const rows = document[key];
      if (Array.isArray(rows)) snapshot[collection as StorageCollection] = rows;
    }
    return snapshot;
  }

  hydrate(snapshot: StorageSnapshot): Promise<void> {
    void snapshot;
    throw new Error(
      "Sites import requires the validated preview and confirmation flow.",
    );
  }

  applyImport(snapshot: StorageSnapshot): Promise<void> {
    return this.request("/import", {
      method: "POST",
      body: JSON.stringify({ snapshot }),
    });
  }
}
