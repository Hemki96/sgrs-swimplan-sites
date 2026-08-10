import handler from "vinext/server/app-router-entry";

interface D1Result<T = unknown> {
  results?: T[];
  meta: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(sql: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
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

async function initialize(db: D1Database) {
  await db.batch([db.prepare(createTableSql), db.prepare(createIndexSql)]);
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}

function parseRow<T>(row: { data: string } | null): T | null {
  return row ? (JSON.parse(row.data) as T) : null;
}

function seasonIdFor(
  collection: string,
  entity: StoredEntity,
  options: RevisionOptions,
) {
  const seasonId =
    options.revision?.seasonId ??
    (collection === "configuration_values"
      ? "__global_configuration__"
      : undefined) ??
    (collection === "seasons" ? entity.id : entity.seasonId);
  if (!seasonId)
    throw new Error(
      `Revision context with seasonId required for ${collection}`,
    );
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
  return json({ expectedVersion, actualVersion }, 409);
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
  const seasonId = seasonIdFor(collection, next, options);
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
      `INSERT INTO storage_entities
      (collection, id, season_id, version, deleted_at, data)
      SELECT 'revisions', ?, ?, NULL, NULL,
        json_set(?, '$.revisionNumber', COALESCE((SELECT MAX(CAST(json_extract(data, '$.revisionNumber') AS INTEGER))
          FROM storage_entities WHERE collection = 'revisions' AND season_id = ?), 0) + 1)
      WHERE EXISTS (SELECT 1 FROM storage_entities WHERE collection = ? AND id = ? AND version = ?)`,
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
  const seasonId = seasonIdFor(collection, next, options);
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
  const [writeResult] = await db.batch([
    db
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
      ),
    db
      .prepare(
        `INSERT INTO storage_entities (collection, id, season_id, version, deleted_at, data)
      SELECT 'revisions', ?, ?, NULL, NULL,
        json_set(?, '$.revisionNumber', COALESCE((SELECT MAX(CAST(json_extract(data, '$.revisionNumber') AS INTEGER))
          FROM storage_entities WHERE collection = 'revisions' AND season_id = ?), 0) + 1)
      WHERE EXISTS (SELECT 1 FROM storage_entities WHERE collection = ? AND id = ? AND version = ?)`,
      )
      .bind(
        revision.id,
        seasonId,
        JSON.stringify(revision),
        seasonId,
        collection,
        id,
        next.version,
      ),
  ]);
  if ((writeResult.meta.changes ?? 0) !== 1) {
    return conflict(
      options.expectedVersion,
      (await currentEntity(db, collection, id))?.version ?? null,
    );
  }
  return new Response(null, { status: 204 });
}

async function storageRequest(request: Request, env: Env): Promise<Response> {
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
      (snapshot[row.collection] ??= []).push(JSON.parse(row.data));
    }
    return json(snapshot);
  }
  if (request.method === "POST" && collection === "import") {
    const { snapshot } = (await request.json()) as {
      snapshot: Record<string, StoredEntity[]>;
    };
    const statements: D1Statement[] = [];
    const now = new Date().toISOString();
    for (const [name, entities] of Object.entries(snapshot)) {
      if (!collections.has(name) || name === "revisions") continue;
      for (const entity of entities ?? []) {
        const scope =
          name === "configuration_values"
            ? "__global_configuration__"
            : name === "seasons"
              ? entity.id
              : entity.seasonId;
        if (!scope)
          return json({ error: `Missing season scope for ${name}` }, 400);
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
    return json({ error: "Unknown collection" }, 404);
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
    return json(parseRow(row));
  }
  if (request.method === "GET") {
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";
    const rows = await env.DB.prepare(
      `SELECT data FROM storage_entities
      WHERE collection = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"} ORDER BY id`,
    )
      .bind(collection)
      .all<{ data: string }>();
    return json((rows.results ?? []).map((row) => JSON.parse(row.data)));
  }
  if (!parts[1] || collection === "revisions")
    return json({ error: "Invalid request" }, 400);
  if (request.method === "PUT") {
    const { entity, options = {} } = (await request.json()) as {
      entity: StoredEntity;
      options?: RevisionOptions;
    };
    if (entity.id !== decodeURIComponent(parts[1]))
      return json({ error: "ID mismatch" }, 400);
    return putEntity(env.DB, collection, entity, options);
  }
  if (request.method === "DELETE") {
    const { options } = (await request.json()) as {
      options: RevisionOptions & { expectedVersion: number };
    };
    return softDeleteEntity(
      env.DB,
      collection,
      decodeURIComponent(parts[1]),
      options,
    );
  }
  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/storage")) {
      try {
        return await storageRequest(request, env);
      } catch (error) {
        console.error(error);
        return json({ error: "Storage operation failed" }, 500);
      }
    }
    return handler.fetch(request, env, ctx);
  },
};
