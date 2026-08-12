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
import { GLOBAL_REVISION_SCOPE_ID } from "./StorageAdapter";
import { importSeasonScope } from "./importScope";

type MutableCollection = Map<Id, unknown>;
type MutableStore = Map<StorageCollection, MutableCollection>;

interface InMemoryStorageDependencies {
  createId?: () => Id;
  now?: () => string;
}

export class VersionConflictError extends Error {
  constructor(
    readonly expectedVersion: number,
    readonly actualVersion: number | null,
  ) {
    super(
      `Expected version ${expectedVersion}, got ${actualVersion ?? "missing"}`,
    );
    this.name = "VersionConflictError";
  }
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private data: MutableStore = new Map();
  private readonly createId: () => Id;
  private readonly now: () => string;

  constructor(dependencies: InMemoryStorageDependencies = {}) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async get<T>(collection: StorageCollection, id: Id): Promise<T | null> {
    const entity = this.data.get(collection)?.get(id) as
      (T & { deletedAt?: string | null }) | undefined;
    return entity === undefined || entity.deletedAt ? null : this.copy(entity);
  }

  async list<T>(
    collection: StorageCollection,
    options: ListOptions = {},
  ): Promise<T[]> {
    const entities = [...(this.data.get(collection)?.values() ?? [])] as Array<
      T & { deletedAt?: string | null }
    >;
    const snapshot = options.seasonId ? await this.exportAll() : undefined;
    return entities
      .filter((entity) => options.includeDeleted || !entity.deletedAt)
      .filter(
        (entity) =>
          !options.seasonId ||
          importSeasonScope(
            snapshot!,
            collection,
            entity as unknown as Record<string, unknown>,
          ) === options.seasonId,
      )
      .map((entity) => this.copy(entity));
  }

  async put<T extends StoredEntity>(
    collection: Exclude<StorageCollection, "revisions">,
    entity: T,
    options: PutOptions = {},
  ): Promise<T> {
    const bucket = this.collection(collection);
    const current = bucket.get(entity.id) as T | undefined;
    this.assertVersion(current?.version ?? null, options.expectedVersion);

    const timestamp = this.now();
    const next = this.withUpdatedMetadata(
      entity,
      (current?.version ?? 0) + 1,
      timestamp,
    );
    const revision = this.createRevision(
      collection,
      current ? "update" : "create",
      current ?? null,
      next,
      options,
      timestamp,
    );

    bucket.set(next.id, this.copy(next));
    this.storeRevision(revision);
    return this.copy(next);
  }

  async softDelete(
    collection: Exclude<StorageCollection, "revisions">,
    id: Id,
    options: SoftDeleteOptions,
  ): Promise<void> {
    const bucket = this.collection(collection);
    const current = bucket.get(id) as StoredEntity | undefined;
    this.assertVersion(current?.version ?? null, options.expectedVersion);

    if (!current) {
      throw new VersionConflictError(options.expectedVersion, null);
    }

    const timestamp = this.now();
    const next = this.withUpdatedMetadata(
      { ...current, deletedAt: timestamp },
      current.version + 1,
      timestamp,
    );
    const revision = this.createRevision(
      collection,
      "soft_delete",
      current,
      next,
      options,
      timestamp,
    );

    bucket.set(id, this.copy(next));
    this.storeRevision(revision);
  }

  async listRevisions(seasonId: Id): Promise<Revision[]> {
    const revisions = await this.list<Revision>("revisions", {
      includeDeleted: true,
    });
    return revisions
      .filter((revision) => revision.seasonId === seasonId)
      .sort((left, right) => left.revisionNumber - right.revisionNumber);
  }

  listGlobalRevisions(): Promise<Revision[]> {
    return this.listRevisions(GLOBAL_REVISION_SCOPE_ID);
  }

  async purgeSeason(seasonId: Id): Promise<void> {
    const season = (
      await this.list<StoredEntity>("seasons", { includeDeleted: true })
    ).find((entity) => entity.id === seasonId);
    if (!season) {
      throw new Error("Season not found");
    }
    if (!season.deletedAt) {
      throw new Error("Only soft-deleted seasons can be purged");
    }
    const snapshot = await this.exportAll();
    const scope = new Set<StorageCollection>();
    for (const [collection, entities] of Object.entries(snapshot)) {
      if (collection === "revisions") continue;
      const bucket = this.data.get(collection as StorageCollection);
      if (!bucket) continue;
      for (const entity of entities as StoredEntity[]) {
        if (
          importSeasonScope(
            snapshot,
            collection as StorageCollection,
            entity as unknown as Record<string, unknown>,
          ) === seasonId
        ) {
          scope.add(collection as StorageCollection);
          bucket.delete(entity.id);
        }
      }
    }
    const revisions = this.data.get("revisions");
    if (revisions) {
      for (const [id, revision] of revisions) {
        if ((revision as Revision).seasonId === seasonId) revisions.delete(id);
      }
    }
  }

  async exportAll(): Promise<StorageSnapshot> {
    return Object.fromEntries(
      [...this.data.entries()].map(([collection, entities]) => [
        collection,
        [...entities.values()].map((entity) => this.copy(entity)),
      ]),
    );
  }

  async hydrate(snapshot: StorageSnapshot): Promise<void> {
    const next: MutableStore = new Map();
    for (const [collection, entities] of Object.entries(snapshot)) {
      if (!entities) continue;
      next.set(
        collection as StorageCollection,
        new Map(
          entities.map((entity) => {
            const stored = entity as { id: Id };
            return [stored.id, this.copy(stored)];
          }),
        ),
      );
    }
    this.data = next;
  }

  async applyImport(snapshot: StorageSnapshot): Promise<void> {
    const backup = await this.exportAll();
    try {
      for (const [collection, entities] of Object.entries(snapshot)) {
        if (!entities || collection === "revisions") continue;
        for (const entity of entities) {
          const stored = entity as StoredEntity & { seasonId?: string };
          await this.put(
            collection as Exclude<StorageCollection, "revisions">,
            stored,
            {
              expectedVersion: stored.version,
              revision: {
                seasonId: importSeasonScope(
                  snapshot,
                  collection as StorageCollection,
                  { ...stored },
                ) as string,
                editorLabel: "json-import",
              },
            },
          );
        }
      }
    } catch (error) {
      await this.hydrate(backup);
      throw error;
    }
  }

  private collection(collection: StorageCollection): MutableCollection {
    const existing = this.data.get(collection);
    if (existing) return existing;
    const created: MutableCollection = new Map();
    this.data.set(collection, created);
    return created;
  }

  private assertVersion(
    actualVersion: number | null,
    expectedVersion: number | undefined,
  ): void {
    if (actualVersion === null) {
      if (expectedVersion !== undefined && expectedVersion !== 0) {
        throw new VersionConflictError(expectedVersion, null);
      }
      return;
    }
    if (expectedVersion === undefined || expectedVersion !== actualVersion) {
      throw new VersionConflictError(expectedVersion ?? 0, actualVersion);
    }
  }

  private withUpdatedMetadata<T extends StoredEntity>(
    entity: T,
    version: number,
    timestamp: string,
  ): T {
    const next = { ...entity, version };
    if ("updatedAt" in next) {
      Object.assign(next, { updatedAt: timestamp });
    }
    return next;
  }

  private createRevision(
    collection: StorageCollection,
    operation: string,
    before: StoredEntity | null,
    after: StoredEntity,
    options: PutOptions,
    timestamp: string,
  ): Revision {
    const seasonId = this.resolveSeasonId(collection, after, options);
    const revisionNumber = this.nextRevisionNumber(seasonId);
    return {
      id: this.createId(),
      seasonId,
      revisionNumber,
      timestamp,
      operation,
      entityType: collection,
      entityId: after.id,
      beforeJson: before === null ? null : this.copy(before),
      afterJson: this.copy(after),
      editorLabel: options.revision?.editorLabel,
    };
  }

  private resolveSeasonId(
    collection: StorageCollection,
    entity: StoredEntity,
    options: PutOptions,
  ): Id {
    if (options.revision?.seasonId) return options.revision.seasonId;
    if (collection === "configuration_values") {
      return GLOBAL_REVISION_SCOPE_ID;
    }
    if (collection === "seasons") return entity.id;
    if ("seasonId" in entity && typeof entity.seasonId === "string") {
      return entity.seasonId;
    }
    throw new Error(
      `Revision context with seasonId required for ${collection}`,
    );
  }

  private nextRevisionNumber(seasonId: Id): number {
    const revisions = [
      ...(this.data.get("revisions")?.values() ?? []),
    ] as Revision[];
    return (
      revisions.reduce(
        (maximum, revision) =>
          revision.seasonId === seasonId
            ? Math.max(maximum, revision.revisionNumber)
            : maximum,
        0,
      ) + 1
    );
  }

  private storeRevision(revision: Revision): void {
    this.collection("revisions").set(revision.id, this.copy(revision));
  }

  private copy<T>(value: T): T {
    return structuredClone(value);
  }
}
