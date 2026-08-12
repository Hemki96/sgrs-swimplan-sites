import type { Id, Revision } from "./types";
import type {
  StorageAdapter,
  StorageCollection,
  StoredEntity,
} from "../storage/StorageAdapter";
import { GLOBAL_REVISION_SCOPE_ID } from "../storage/StorageAdapter";

export class RestoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestoreConflictError";
  }
}

export interface UndoRequest {
  collection: string;
  id: string;
}

type EntityCollection = Exclude<StorageCollection, "revisions">;

const RESTORABLE_COLLECTIONS = [
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
  "training_schedule_templates",
  "equipment_items",
  "session_equipment",
] as const;

export class HistoryService {
  constructor(private readonly storage: StorageAdapter) {}

  async listRevisions(seasonId: Id): Promise<Revision[]> {
    const revisions = await this.storage.listRevisions(seasonId);
    return [...revisions].sort(
      (left, right) => right.revisionNumber - left.revisionNumber,
    );
  }

  async listEntityHistory(
    seasonId: Id,
    entityType: string,
    entityId: Id,
  ): Promise<Revision[]> {
    const revisions = await this.listRevisions(seasonId);
    return revisions.filter(
      (revision) =>
        revision.entityType === entityType && revision.entityId === entityId,
    );
  }

  async restoreRevision(revision: Revision): Promise<void> {
    const collection = this.collectionOf(revision.entityType);
    const target =
      revision.operation === "soft_delete"
        ? revision.beforeJson
        : revision.afterJson;
    if (!target) {
      throw new RestoreConflictError(
        "Für diese Revision ist kein wiederherstellbarer Zustand vorhanden.",
      );
    }
    const restored = { ...(target as StoredEntity), deletedAt: null };
    const current = await this.currentEntity(collection, revision.entityId);
    await this.storage.put(collection, restored, {
      expectedVersion: current?.version ?? 0,
      revision: { seasonId: revision.seasonId, editorLabel: "public" },
    });
  }

  async restoreEntity(
    collection: string,
    id: Id,
    seasonId?: Id,
  ): Promise<void> {
    const typed = this.collectionOf(collection);
    const current = await this.currentEntity(typed, id);
    if (!current) {
      throw new RestoreConflictError(
        "Der Datensatz konnte nicht gefunden werden.",
      );
    }
    const scope = seasonId ?? (await this.inferSeasonId(typed, current));
    await this.storage.put(
      typed,
      { ...current, deletedAt: null },
      {
        expectedVersion: current.version,
        revision: { seasonId: scope, editorLabel: "public" },
      },
    );
  }

  private collectionOf(collection: string): EntityCollection {
    if (!RESTORABLE_COLLECTIONS.includes(collection as EntityCollection)) {
      throw new Error(`Unknown collection ${collection}`);
    }
    return collection as EntityCollection;
  }

  private async currentEntity(
    collection: EntityCollection,
    id: Id,
  ): Promise<StoredEntity | null> {
    const rows = await this.storage.list<StoredEntity>(collection, {
      includeDeleted: true,
    });
    return rows.find((row) => row.id === id) ?? null;
  }

  private async inferSeasonId(
    collection: EntityCollection,
    entity: StoredEntity,
  ): Promise<Id> {
    if (collection === "configuration_values") {
      return GLOBAL_REVISION_SCOPE_ID;
    }
    if (collection === "seasons") return entity.id;
    if ("seasonId" in entity && typeof entity.seasonId === "string") {
      return entity.seasonId;
    }
    const revisions = await this.storage.list<Revision>("revisions", {
      includeDeleted: true,
    });
    const own = revisions.filter(
      (revision) =>
        revision.entityType === collection && revision.entityId === entity.id,
    );
    const latest = own.sort(
      (left, right) => right.revisionNumber - left.revisionNumber,
    )[0];
    if (latest) return latest.seasonId;
    throw new Error(
      `Revision context with seasonId required for ${collection}`,
    );
  }
}
