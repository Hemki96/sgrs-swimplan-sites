import { buildJsonExport } from "../src/lib/export/jsonExport";
import type { StorageCollection } from "../src/lib/storage/StorageAdapter";
import { importSeasonScope } from "../src/lib/storage/importScope";
import type { StorageSnapshot } from "../src/lib/storage/StorageAdapter";
import {
  validateStorageEntity,
  validateStorageSnapshot,
  type SnapshotValidationIssue,
} from "../src/lib/validation/storage";

export interface D1Result<T = unknown> {
  results?: T[];
  meta: { changes?: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(sql: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

export interface StorageEnv {
  DB: D1Database;
}

type StoredEntity = Record<string, unknown> & {
  id: string;
  version: number;
  deletedAt?: string | null;
  updatedAt?: string;
  seasonId?: string;
};

type RevisionOptions = {
  expectedVersion?: number;
  revision?: { seasonId?: string; editorLabel?: string };
};

const collections = new Set([
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
  "revisions",
]);

const createTableSql = `CREATE TABLE IF NOT EXISTS storage_entities (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  season_id TEXT,
  version INTEGER,
  deleted_at TEXT,
  data TEXT NOT NULL,
  PRIMARY KEY (collection, id)
)`;
const createIndexSql = `CREATE INDEX IF NOT EXISTS storage_entities_season_idx
  ON storage_entities (collection, season_id, deleted_at)`;
const createSeasonNameIndexSql = `CREATE UNIQUE INDEX IF NOT EXISTS storage_entities_season_name_idx
  ON storage_entities (lower(trim(json_extract(data, '$.name'))))
  WHERE collection = 'seasons'`;

export async function initialize(db: D1Database) {
  await db.batch([db.prepare(createTableSql), db.prepare(createIndexSql)]);
  try {
    await db.prepare(createSeasonNameIndexSql).run();
  } catch (error) {
    if (!isLegacySeasonNameConflict(error)) throw error;
  }
}

function isLegacySeasonNameConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("storage_entities_season_name_idx") &&
    (message.includes("UNIQUE constraint failed") ||
      message.includes("SQLITE_CONSTRAINT_UNIQUE"))
  );
}

export function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}

function apiError(
  status: number,
  code: string,
  message: string,
  detail: Partial<SnapshotValidationIssue> = {},
) {
  return json({ error: { code, message, ...detail } }, status);
}

function parseRow<T>(row: { data: string } | null): T | null {
  return row ? (JSON.parse(row.data) as T) : null;
}

function parseValidRow(
  collection: StorageCollection,
  row: { data: string } | null,
): Record<string, unknown> | null {
  const value = parseRow<unknown>(row);
  if (value === null) return null;
  const result = validateStorageEntity(collection, value);
  return result.success ? result.data : null;
}

function parseValidRows(
  collection: StorageCollection,
  rows: Array<{ data: string }>,
) {
  return rows.flatMap((row) => {
    const value = parseValidRow(collection, row);
    return value ? [value] : [];
  });
}

const parentReferences: Partial<
  Record<string, { collection: string; field: string }>
> = {
  mesocycles: { collection: "macrocycles", field: "macrocycleId" },
  microcycles: { collection: "mesocycles", field: "mesocycleId" },
  microcycle_segments: {
    collection: "microcycles",
    field: "microcycleId",
  },
  training_sessions: { collection: "training_days", field: "trainingDayId" },
  session_equipment: {
    collection: "training_sessions",
    field: "sessionId",
  },
};

class InvalidStorageMutationError extends Error {}

async function seasonIdFor(
  db: D1Database,
  collection: string,
  entity: StoredEntity,
  options: RevisionOptions,
): Promise<string> {
  let seasonId: string | undefined;
  if (collection === "configuration_values") {
    seasonId = "__global_configuration__";
  } else if (collection === "seasons") {
    seasonId = entity.id;
  } else if (typeof entity.seasonId === "string" && entity.seasonId) {
    seasonId = entity.seasonId;
  } else {
    const reference = parentReferences[collection];
    const parentId = reference ? entity[reference.field] : undefined;
    if (reference && typeof parentId === "string") {
      const parent = await currentEntity(db, reference.collection, parentId);
      if (parent) {
        seasonId = await seasonIdFor(db, reference.collection, parent, {});
      }
    }
  }
  if (!seasonId) {
    throw new InvalidStorageMutationError(
      `Valid season scope required for ${collection}`,
    );
  }
  if (options.revision?.seasonId && options.revision.seasonId !== seasonId) {
    throw new InvalidStorageMutationError(
      `Revision season does not match ${collection} season scope`,
    );
  }
  if (collection !== "seasons" && collection !== "configuration_values") {
    const season = await currentEntity(db, "seasons", seasonId);
    if (!season || season.deletedAt) {
      throw new InvalidStorageMutationError("Active season not found");
    }
  }
  return seasonId;
}

async function currentEntity(db: D1Database, collection: string, id: string) {
  return parseRow<StoredEntity>(
    await db
      .prepare(
        "SELECT data FROM storage_entities WHERE collection = ? AND id = ?",
      )
      .bind(collection, id)
      .first<{ data: string }>(),
  );
}

function conflict(expectedVersion: number, actualVersion: number | null) {
  return json(
    {
      error: {
        code: "VERSION_CONFLICT",
        message: "Die Daten wurden zwischenzeitlich geändert.",
      },
      expectedVersion,
      actualVersion,
    },
    409,
  );
}

async function databaseSnapshot(db: D1Database): Promise<StorageSnapshot> {
  const rows = await db
    .prepare(
      "SELECT collection, data FROM storage_entities WHERE collection != 'revisions' ORDER BY collection, id",
    )
    .all<{ collection: string; data: string }>();
  const snapshot: Record<string, unknown[]> = {};
  for (const row of rows.results ?? []) {
    const collection = row.collection as StorageCollection;
    if (!collections.has(collection)) continue;
    const value = parseValidRow(collection, row);
    if (value) (snapshot[collection] ??= []).push(value);
  }
  return snapshot as StorageSnapshot;
}

async function validateCandidate(
  db: D1Database,
  collection: StorageCollection,
  entity: StoredEntity,
): Promise<SnapshotValidationIssue | null> {
  const snapshot = await databaseSnapshot(db);
  const existingIssues = new Set(
    validateStorageSnapshot(snapshot, { allowRevisions: true }).map(
      validationIssueKey,
    ),
  );
  const rows = [...(snapshot[collection] ?? [])].filter(
    (row) => (row as { id?: string }).id !== entity.id,
  );
  rows.push(entity);
  snapshot[collection] = rows;
  return (
    validateStorageSnapshot(snapshot, { allowRevisions: true }).find(
      (issue) => !existingIssues.has(validationIssueKey(issue)),
    ) ?? null
  );
}

function validationIssueKey(issue: SnapshotValidationIssue): string {
  return JSON.stringify([
    issue.code,
    issue.collection,
    issue.entityId ?? null,
    issue.path ?? null,
  ]);
}

async function putEntity(
  db: D1Database,
  collection: string,
  entity: StoredEntity,
  options: RevisionOptions,
) {
  const current = await currentEntity(db, collection, entity.id);
  const expected = options.expectedVersion;
  const actual = current?.version ?? null;
  if (
    (current && expected !== actual) ||
    (!current && expected !== undefined && expected !== 0)
  ) {
    return conflict(expected ?? 0, actual);
  }

  const timestamp = new Date().toISOString();
  const next = { ...entity, version: (actual ?? 0) + 1 };
  if ("updatedAt" in next) next.updatedAt = timestamp;
  const validationIssue = await validateCandidate(
    db,
    collection as StorageCollection,
    next,
  );
  if (validationIssue) {
    return apiError(
      400,
      validationIssue.code,
      validationIssue.message,
      validationIssue,
    );
  }
  const seasonId = await seasonIdFor(db, collection, next, options);
  const revision = {
    id: crypto.randomUUID(),
    seasonId,
    revisionNumber: 0,
    timestamp,
    operation: current ? "update" : "create",
    entityType: collection,
    entityId: next.id,
    beforeJson: current,
    afterJson: next,
    editorLabel: options.revision?.editorLabel,
  };

  const write = current
    ? db
        .prepare(
          `UPDATE storage_entities SET season_id = ?, version = ?, deleted_at = ?, data = ?
        WHERE collection = ? AND id = ? AND version = ?`,
        )
        .bind(
          seasonId,
          next.version,
          next.deletedAt ?? null,
          JSON.stringify(next),
          collection,
          next.id,
          expected,
        )
    : db
        .prepare(
          `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (collection, id) DO NOTHING`,
        )
        .bind(
          collection,
          next.id,
          seasonId,
          next.version,
          next.deletedAt ?? null,
          JSON.stringify(next),
        );
  const revisionWrite = db
    .prepare(
      `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
      SELECT 'revisions', ?, ?, NULL, NULL,
        json_set(?, '$.revisionNumber', COALESCE((SELECT MAX(CAST(json_extract(data, '$.revisionNumber') AS INTEGER))
          FROM storage_entities WHERE collection = 'revisions' AND season_id = ?), 0) + 1)
      WHERE changes() = 1
        AND EXISTS (SELECT 1 FROM storage_entities WHERE collection = ? AND id = ? AND version = ?)`,
    )
    .bind(
      revision.id,
      seasonId,
      JSON.stringify(revision),
      seasonId,
      collection,
      next.id,
      next.version,
    );
  const [writeResult] = await db.batch([write, revisionWrite]);
  if ((writeResult.meta.changes ?? 0) !== 1) {
    return conflict(
      expected ?? 0,
      (await currentEntity(db, collection, entity.id))?.version ?? null,
    );
  }
  return json(next);
}

async function softDeleteEntity(
  db: D1Database,
  collection: string,
  id: string,
  options: RevisionOptions & { expectedVersion: number },
) {
  const current = await currentEntity(db, collection, id);
  if (!current || current.version !== options.expectedVersion) {
    return conflict(options.expectedVersion, current?.version ?? null);
  }
  const timestamp = new Date().toISOString();
  const next = {
    ...current,
    version: current.version + 1,
    deletedAt: timestamp,
  };
  if ("updatedAt" in next) next.updatedAt = timestamp;
  const seasonId = await seasonIdFor(db, collection, next, options);
  const revision = {
    id: crypto.randomUUID(),
    seasonId,
    revisionNumber: 0,
    timestamp,
    operation: "soft_delete",
    entityType: collection,
    entityId: id,
    beforeJson: current,
    afterJson: next,
    editorLabel: options.revision?.editorLabel,
  };
  const write = db
    .prepare(
      `UPDATE storage_entities SET version = ?, deleted_at = ?, data = ?
      WHERE collection = ? AND id = ? AND version = ?`,
    )
    .bind(
      next.version,
      timestamp,
      JSON.stringify(next),
      collection,
      id,
      options.expectedVersion,
    );
  const revisionWrite = db
    .prepare(
      `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
      SELECT 'revisions', ?, ?, NULL, NULL,
        json_set(?, '$.revisionNumber', COALESCE((SELECT MAX(CAST(json_extract(data, '$.revisionNumber') AS INTEGER))
          FROM storage_entities WHERE collection = 'revisions' AND season_id = ?), 0) + 1)
      WHERE changes() = 1
        AND EXISTS (SELECT 1 FROM storage_entities WHERE collection = ? AND id = ? AND version = ?)`,
    )
    .bind(
      revision.id,
      seasonId,
      JSON.stringify(revision),
      seasonId,
      collection,
      id,
      next.version,
    );
  const [writeResult] = await db.batch([write, revisionWrite]);
  if ((writeResult.meta.changes ?? 0) !== 1) {
    return conflict(
      options.expectedVersion,
      (await currentEntity(db, collection, id))?.version ?? null,
    );
  }
  return new Response(null, { status: 204 });
}

async function purgeSeasonEntity(db: D1Database, seasonId: string) {
  const season = await currentEntity(db, "seasons", seasonId);
  if (!season) return apiError(404, "NOT_FOUND", "Season not found");
  if (!season.deletedAt) {
    return apiError(
      409,
      "SEASON_NOT_DELETED",
      "Only soft-deleted seasons can be purged",
      { collection: "seasons", entityId: seasonId },
    );
  }
  await db
    .prepare("DELETE FROM storage_entities WHERE season_id = ?")
    .bind(seasonId)
    .run();
  return new Response(null, { status: 204 });
}

function importSnapshotError(
  value: unknown,
): { snapshot: Record<string, StoredEntity[]> } | Response {
  const body = value as { snapshot?: unknown };
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !body.snapshot ||
    typeof body.snapshot !== "object" ||
    Array.isArray(body.snapshot)
  ) {
    return apiError(400, "INVALID_IMPORT", "Import requires a snapshot object");
  }
  const snapshot = body.snapshot as Record<string, unknown>;
  for (const [name, entities] of Object.entries(snapshot)) {
    if (!collections.has(name))
      return apiError(400, "UNKNOWN_COLLECTION", `Unknown collection ${name}`);
    if (!Array.isArray(entities))
      return apiError(400, "INVALID_COLLECTION", `${name} must be a list`, {
        collection: name as StorageCollection,
      });
  }
  const typedSnapshot = snapshot as StorageSnapshot;
  const issue = validateStorageSnapshot(typedSnapshot)[0];
  if (issue) return apiError(400, issue.code, issue.message, issue);
  return { snapshot: typedSnapshot as Record<string, StoredEntity[]> };
}

export async function storageRequest(
  request: Request,
  env: StorageEnv,
): Promise<Response> {
  await initialize(env.DB);
  const url = new URL(request.url);
  const parts = url.pathname
    .replace(/^\/api\/storage\/?/, "")
    .split("/")
    .filter(Boolean);
  const collection = parts[0];

  if (request.method === "GET" && collection === "export") {
    const rows = await env.DB.prepare(
      "SELECT collection, data FROM storage_entities ORDER BY collection, id",
    ).all<{ collection: string; data: string }>();
    const snapshot: Record<string, unknown[]> = {};
    for (const row of rows.results ?? []) {
      const name = row.collection as StorageCollection;
      if (!collections.has(name)) continue;
      const value = parseValidRow(name, row);
      if (value) (snapshot[name] ??= []).push(value);
    }
    return json(buildJsonExport(snapshot));
  }
  if (request.method === "POST" && collection === "import") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "INVALID_JSON", "Import requires valid JSON");
    }
    const parsed = importSnapshotError(body);
    if (parsed instanceof Response) return parsed;
    const snapshot = parsed.snapshot;
    const candidate = await databaseSnapshot(env.DB);
    for (const [name, entities] of Object.entries(snapshot)) {
      const importedIds = new Set(entities.map((entity) => entity.id));
      candidate[name as StorageCollection] = [
        ...(candidate[name as StorageCollection] ?? []).filter(
          (row) => !importedIds.has((row as StoredEntity).id),
        ),
        ...entities,
      ];
    }
    const candidateIssue = validateStorageSnapshot(candidate, {
      allowRevisions: true,
    })[0];
    if (candidateIssue) {
      return apiError(
        400,
        candidateIssue.code,
        candidateIssue.message,
        candidateIssue,
      );
    }
    const statements: D1Statement[] = [];
    const now = new Date().toISOString();
    for (const [name, entities] of Object.entries(snapshot)) {
      if (!collections.has(name) || name === "revisions") continue;
      for (const entity of entities ?? []) {
        const scope = importSeasonScope(
          snapshot,
          name as StorageCollection,
          entity as Record<string, unknown>,
        );
        if (!scope)
          return apiError(
            400,
            "MISSING_SEASON_SCOPE",
            `Missing season scope for ${name}`,
            {
              collection: name as StorageCollection,
              entityId: entity.id,
            },
          );
        const current = await currentEntity(env.DB, name, entity.id);
        if (current && current.version !== entity.version)
          return conflict(entity.version, current.version);
        if (!current && entity.version !== 0)
          return conflict(entity.version, null);
        const next = { ...entity, version: (current?.version ?? 0) + 1 };
        const revision = {
          id: crypto.randomUUID(),
          seasonId: scope,
          revisionNumber: 0,
          timestamp: now,
          operation: "import",
          entityType: name,
          entityId: entity.id,
          beforeJson: null,
          afterJson: next,
          editorLabel: "json-import",
        };
        statements.push(
          env.DB.prepare(
            `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (collection, id) DO UPDATE SET
                 season_id = excluded.season_id, version = excluded.version,
                 deleted_at = excluded.deleted_at, data = excluded.data`,
          ).bind(
            name,
            entity.id,
            scope,
            next.version,
            entity.deletedAt ?? null,
            JSON.stringify(next),
          ),
          env.DB.prepare(
            `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
               VALUES ('revisions', ?, ?, NULL, NULL,
                 json_set(?, '$.revisionNumber', COALESCE((SELECT MAX(CAST(json_extract(data, '$.revisionNumber') AS INTEGER))
                 FROM storage_entities WHERE collection = 'revisions' AND season_id = ?), 0) + 1))`,
          ).bind(revision.id, scope, JSON.stringify(revision), scope),
        );
      }
    }
    if (statements.length) await env.DB.batch(statements);
    return new Response(null, { status: 204 });
  }
  if (!collection || !collections.has(collection))
    return apiError(404, "UNKNOWN_COLLECTION", "Unknown collection");
  if (request.method === "GET" && collection === "revisions" && !parts[1]) {
    const seasonId = url.searchParams.get("seasonId");
    const rows = await env.DB.prepare(
      `SELECT data FROM storage_entities
      WHERE collection = 'revisions' AND season_id = ? ORDER BY CAST(json_extract(data, '$.revisionNumber') AS INTEGER)`,
    )
      .bind(seasonId)
      .all<{ data: string }>();
    return json((rows.results ?? []).map((row) => JSON.parse(row.data)));
  }
  if (request.method === "GET" && parts[1]) {
    const row = await env.DB.prepare(
      `SELECT data FROM storage_entities
      WHERE collection = ? AND id = ? AND deleted_at IS NULL`,
    )
      .bind(collection, decodeURIComponent(parts[1]))
      .first<{ data: string }>();
    return json(parseValidRow(collection as StorageCollection, row));
  }
  if (request.method === "GET") {
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";
    const seasonId = url.searchParams.get("seasonId");
    const rows = await env.DB.prepare(
      `SELECT data FROM storage_entities
      WHERE collection = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      ${seasonId ? "AND season_id = ?" : ""} ORDER BY id`,
    )
      .bind(...(seasonId ? [collection, seasonId] : [collection]))
      .all<{ data: string }>();
    return json(
      parseValidRows(collection as StorageCollection, rows.results ?? []),
    );
  }
  if (!parts[1] || collection === "revisions")
    return apiError(400, "INVALID_REQUEST", "Invalid request");
  if (request.method === "PUT") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "INVALID_JSON", "Request requires valid JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError(400, "INVALID_REQUEST", "Request body must be an object");
    }
    const { entity, options = {} } = body as {
      entity: StoredEntity;
      options?: RevisionOptions;
    };
    const parsedEntity = validateStorageEntity(
      collection as StorageCollection,
      entity,
    );
    if (!parsedEntity.success) {
      return apiError(
        400,
        parsedEntity.issue.code,
        parsedEntity.issue.message,
        parsedEntity.issue,
      );
    }
    if (
      !options ||
      typeof options !== "object" ||
      (options.expectedVersion !== undefined &&
        (!Number.isInteger(options.expectedVersion) ||
          options.expectedVersion < 0))
    ) {
      return apiError(
        400,
        "INVALID_VERSION",
        "expectedVersion must be a non-negative integer",
      );
    }
    if (entity.id !== decodeURIComponent(parts[1]))
      return apiError(400, "ID_MISMATCH", "ID mismatch", {
        collection: collection as StorageCollection,
        entityId: entity.id,
        path: "id",
      });
    try {
      return await putEntity(env.DB, collection, entity, options);
    } catch (error) {
      if (error instanceof InvalidStorageMutationError) {
        return apiError(400, "INVALID_SCOPE", error.message, {
          collection: collection as StorageCollection,
          entityId: entity.id,
        });
      }
      throw error;
    }
  }
  if (request.method === "DELETE" && parts[2] === "purge") {
    if (collection !== "seasons" || !parts[1])
      return apiError(400, "INVALID_REQUEST", "Invalid request");
    return purgeSeasonEntity(env.DB, decodeURIComponent(parts[1]));
  }
  if (request.method === "DELETE") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "INVALID_JSON", "Request requires valid JSON");
    }
    const { options } = (body ?? {}) as {
      options: RevisionOptions & { expectedVersion: number };
    };
    if (
      !options ||
      !Number.isInteger(options.expectedVersion) ||
      options.expectedVersion < 0
    ) {
      return apiError(
        400,
        "INVALID_VERSION",
        "expectedVersion must be a non-negative integer",
      );
    }
    try {
      return await softDeleteEntity(
        env.DB,
        collection,
        decodeURIComponent(parts[1]),
        options,
      );
    } catch (error) {
      if (error instanceof InvalidStorageMutationError) {
        return apiError(400, "INVALID_SCOPE", error.message, {
          collection: collection as StorageCollection,
          entityId: decodeURIComponent(parts[1]),
        });
      }
      throw error;
    }
  }
  return apiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
