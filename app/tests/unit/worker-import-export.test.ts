import { describe, expect, it } from "vitest";
import {
  buildImportSnapshot,
  parseImport,
} from "../../src/lib/import/jsonImport";
import type { D1Result, D1Statement } from "../../worker/storage";
import { storageRequest } from "../../worker/storage";

interface MockRow {
  collection: string;
  id: string;
  season_id: string | null;
  version: number | null;
  deleted_at: string | null;
  data: unknown;
}

class MockD1Statement implements D1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly db: MockD1,
  ) {}

  bind(...values: unknown[]): this {
    this.values = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    return this.db.selectFirst(this.sql, this.values) as T | null;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return this.db.selectAll(this.sql, this.values) as D1Result<T>;
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    return this.db.write(this.sql, this.values) as D1Result<T>;
  }
}

class MockD1 {
  private rows = new Map<string, MockRow>();

  seed(collection: string, row: Record<string, unknown>) {
    this.rows.set(`${collection}\u0000${row.id}`, {
      collection,
      id: String(row.id),
      season_id: (row.seasonId as string) ?? null,
      version: row.version as number,
      deleted_at: (row.deletedAt as string) ?? null,
      data: { ...row },
    });
  }

  prepare(sql: string) {
    return new MockD1Statement(sql, this);
  }

  async batch<T = unknown>(
    statements: MockD1Statement[],
  ): Promise<D1Result<T>[]> {
    const backup = new Map(this.rows);
    const results: D1Result[] = [];
    try {
      for (const statement of statements) results.push(await statement.run());
      return results as D1Result<T>[];
    } catch (error) {
      this.rows = backup;
      throw error;
    }
  }

  private row(collection: string, id: string): MockRow | undefined {
    return this.rows.get(`${collection}\u0000${id}`);
  }

  selectFirst(sql: string, values: unknown[]) {
    if (
      sql.includes("WHERE collection = ? AND id = ? AND deleted_at IS NULL")
    ) {
      const [collection, id] = values as [string, string];
      const row = this.row(collection, id);
      if (!row || row.deleted_at) return null;
      return { data: JSON.stringify(row.data) };
    }
    if (sql.includes("WHERE collection = ? AND id = ?")) {
      const [collection, id] = values as [string, string];
      const row = this.row(collection, id);
      if (!row) return null;
      return { data: JSON.stringify(row.data) };
    }
    throw new Error(`Unsupported SELECT-first: ${sql}`);
  }

  selectAll(sql: string, values: unknown[]) {
    const dataRows = (rows: MockRow[]) =>
      rows.map((row) => ({ data: JSON.stringify(row.data) }));
    const collectionRows = (rows: MockRow[]) =>
      rows.map((row) => ({
        collection: row.collection,
        data: JSON.stringify(row.data),
      }));

    if (sql.includes("SELECT collection, data FROM storage_entities")) {
      const rows = [...this.rows.values()].sort((a, b) =>
        a.collection < b.collection
          ? -1
          : a.collection > b.collection
            ? 1
            : a.id < b.id
              ? -1
              : 1,
      );
      return { results: collectionRows(rows), meta: { changes: 0 } };
    }
    if (sql.includes("WHERE collection = 'revisions' AND season_id = ?")) {
      const [seasonId] = values as [string];
      const rows = [...this.rows.values()]
        .filter((r) => r.collection === "revisions" && r.season_id === seasonId)
        .sort((a, b) => {
          const an = (a.data as { revisionNumber: number }).revisionNumber;
          const bn = (b.data as { revisionNumber: number }).revisionNumber;
          return an - bn;
        });
      return { results: dataRows(rows), meta: { changes: 0 } };
    }
    if (sql.includes("WHERE collection = ?")) {
      const [collection] = values as [string];
      const includeDeleted = !sql.includes("AND deleted_at IS NULL");
      const rows = [...this.rows.values()]
        .filter((r) => r.collection === collection)
        .filter((r) => includeDeleted || !r.deleted_at)
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      return { results: dataRows(rows), meta: { changes: 0 } };
    }
    throw new Error(`Unsupported SELECT-all: ${sql}`);
  }

  write(sql: string, values: unknown[]) {
    if (
      sql.includes("CREATE TABLE IF NOT EXISTS") ||
      sql.includes("CREATE INDEX IF NOT EXISTS")
    ) {
      return { meta: { changes: 0 } };
    }
    if (sql.includes("json_set(")) {
      return this.writeRevision(values);
    }
    if (sql.includes("UPDATE storage_entities SET season_id = ?")) {
      const [seasonId, version, deletedAt, data, collection, id, expected] =
        values as [string, number, string, string, string, string, number];
      const row = this.row(collection, id);
      if (!row || row.version !== expected) return { meta: { changes: 0 } };
      this.rows.set(`${collection}\u0000${id}`, {
        ...row,
        season_id: seasonId,
        version,
        deleted_at: deletedAt,
        data: JSON.parse(data),
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE storage_entities SET version = ?")) {
      const [version, deletedAt, data, collection, id, expected] = values as [
        number,
        string,
        string,
        string,
        string,
        number,
      ];
      const row = this.row(collection, id);
      if (!row || row.version !== expected) return { meta: { changes: 0 } };
      this.rows.set(`${collection}\u0000${id}`, {
        ...row,
        version,
        deleted_at: deletedAt,
        data: JSON.parse(data),
      });
      return { meta: { changes: 1 } };
    }
    if (
      sql.includes("INSERT INTO storage_entities") &&
      sql.includes("ON CONFLICT (collection, id) DO UPDATE SET")
    ) {
      const [collection, id, seasonId, version, deletedAt, data] = values as [
        string,
        string,
        string,
        number,
        string,
        string,
      ];
      this.rows.set(`${collection}\u0000${id}`, {
        collection,
        id,
        season_id: seasonId,
        version,
        deleted_at: deletedAt,
        data: JSON.parse(data),
      });
      return { meta: { changes: 1 } };
    }
    if (
      sql.includes("INSERT INTO storage_entities") &&
      sql.includes("ON CONFLICT (collection, id) DO NOTHING")
    ) {
      const [collection, id, seasonId, version, deletedAt, data] = values as [
        string,
        string,
        string,
        number,
        string,
        string,
      ];
      if (this.row(collection, id)) return { meta: { changes: 0 } };
      this.rows.set(`${collection}\u0000${id}`, {
        collection,
        id,
        season_id: seasonId,
        version,
        deleted_at: deletedAt,
        data: JSON.parse(data),
      });
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unsupported write: ${sql}`);
  }

  private writeRevision(values: unknown[]) {
    const [revisionId, seasonId, revisionJson, ...rest] = values as [
      string,
      string,
      string,
      ...unknown[],
    ];
    if (rest.length >= 3) {
      const [, collection, id, version] = rest as [
        string,
        string,
        string,
        number,
      ];
      const row = this.row(collection, id);
      if (!row || row.version !== version) return { meta: { changes: 0 } };
    }
    const revision = JSON.parse(revisionJson) as {
      revisionNumber: number;
      [key: string]: unknown;
    };
    const maxNumber = [...this.rows.values()]
      .filter((r) => r.collection === "revisions" && r.season_id === seasonId)
      .reduce(
        (maximum, r) =>
          Math.max(
            maximum,
            (r.data as { revisionNumber: number }).revisionNumber,
          ),
        0,
      );
    revision.revisionNumber = maxNumber + 1;
    this.rows.set(`revisions\u0000${revisionId}`, {
      collection: "revisions",
      id: revisionId,
      season_id: seasonId,
      version: null,
      deleted_at: null,
      data: revision,
    });
    return { meta: { changes: 1 } };
  }
}

const externalKeys = [
  "configurationValues",
  "seasons",
  "eventTracks",
  "events",
  "calendarConstraints",
  "macrocycles",
  "mesocycles",
  "microcycles",
  "microcycleSegments",
  "periodizationDimensions",
  "focusDefinitions",
  "focusSegments",
  "trainingDays",
  "trainingSessions",
  "equipmentItems",
  "sessionEquipment",
  "revisions",
] as const;

const season = {
  id: "season-1",
  name: "Saison 2026/27",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "Meisterschaft",
  mainGoal: "Höhepunkt",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 3,
};

function seedSeason(db: MockD1) {
  db.seed("seasons", season);
  db.seed("event_tracks", {
    id: "track-1",
    seasonId: season.id,
    name: "WK",
    visible: true,
    sortOrder: 0,
    version: 1,
  });
  db.seed("events", {
    id: "event-1",
    seasonId: season.id,
    trackId: "track-1",
    name: "Landesmeisterschaft",
    startDate: "2027-07-10",
    endDate: "2027-07-11",
    priority: "A",
    version: 1,
  });
  db.seed("training_sessions", {
    id: "session-deleted",
    trainingDayId: "day-1",
    version: 2,
    deletedAt: "2026-08-08T10:00:00.000Z",
  });
}

describe("Worker REST import/export", () => {
  it("GET /api/storage/export returns the documented versioned format", async () => {
    const db = new MockD1();
    seedSeason(db);
    const response = await storageRequest(
      new Request("http://site.test/api/storage/export"),
      { DB: db },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.schemaVersion).toBe("1.0");
    expect(typeof body.exportedAt).toBe("string");
    expect(body.seasons).toEqual([season]);
    expect(body.eventTracks).toEqual([
      {
        id: "track-1",
        seasonId: season.id,
        name: "WK",
        visible: true,
        sortOrder: 0,
        version: 1,
      },
    ]);
    expect(body.trainingSessions).toEqual([
      {
        id: "session-deleted",
        trainingDayId: "day-1",
        version: 2,
        deletedAt: "2026-08-08T10:00:00.000Z",
      },
    ]);
    for (const key of externalKeys) expect(Object.keys(body)).toContain(key);
  });

  it("roundtrips a full season through export, preview, remap and import", async () => {
    const source = new MockD1();
    seedSeason(source);
    const exportResponse = await storageRequest(
      new Request("http://site.test/api/storage/export"),
      { DB: source },
    );
    const document = await exportResponse.json();
    const preview = parseImport(JSON.stringify(document));
    expect(preview.errors).toEqual([]);
    const snapshot = buildImportSnapshot(preview, season.id);
    const importedSeasonId = snapshot.seasons?.[0] as { id: string };
    expect(importedSeasonId.id).not.toBe(season.id);

    const target = new MockD1();
    const importResponse = await storageRequest(
      new Request("http://site.test/api/storage/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot }),
      }),
      { DB: target },
    );
    expect(importResponse.status).toBe(204);

    const roundtripResponse = await storageRequest(
      new Request("http://site.test/api/storage/export"),
      { DB: target },
    );
    const roundtrip = (await roundtripResponse.json()) as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const seasons = roundtrip.seasons as Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    }>;
    expect(seasons).toHaveLength(1);
    expect(seasons[0]).toMatchObject({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
    });
    const newSeasonId = seasons[0].id as string;
    expect(newSeasonId).not.toBe(season.id);
    const eventTracks = roundtrip.eventTracks as Array<{
      id: string;
      seasonId: string;
    }>;
    expect(eventTracks).toHaveLength(1);
    expect(eventTracks[0].seasonId).toBe(newSeasonId);
    const events = roundtrip.events as Array<{ trackId: string }>;
    expect(events).toHaveLength(1);
    expect(events[0].trackId).toBe(eventTracks[0].id);
    const importedRevisions = (
      roundtrip.revisions as Array<{ operation: string }>
    ).filter((revision) => revision.operation === "import");
    expect(importedRevisions.length).toBeGreaterThan(0);
  });

  it("rejects structurally invalid import payloads", async () => {
    const db = new MockD1();
    const cases: unknown[] = [
      { snapshot: { bogus_collection: [] } },
      { snapshot: { seasons: [null] } },
      { snapshot: { seasons: [{ id: 5, version: 0 }] } },
      { snapshot: { seasons: [{ id: "s", version: -1 }] } },
      { snapshot: "nope" },
      "no json at all",
    ];
    for (const body of cases) {
      const response = await storageRequest(
        new Request("http://site.test/api/storage/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: typeof body === "string" ? body : JSON.stringify(body),
        }),
        { DB: db },
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects a conflicted import atomically without partial writes", async () => {
    const db = new MockD1();
    db.seed("event_tracks", {
      id: "track-existing",
      seasonId: "season-existing",
      name: "WK",
      sortOrder: 0,
      visible: true,
      version: 2,
    });
    const response = await storageRequest(
      new Request("http://site.test/api/storage/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshot: {
            seasons: [
              {
                id: "season-new",
                name: "Neu",
                startDate: "2026-08-01",
                endDate: "2027-07-31",
                description: "",
                mainGoal: "",
                status: "draft",
                createdAt: "2026-08-01T00:00:00.000Z",
                updatedAt: "2026-08-01T00:00:00.000Z",
                version: 0,
              },
            ],
            event_tracks: [
              {
                id: "track-existing",
                seasonId: "season-new",
                name: "WK",
                sortOrder: 0,
                visible: true,
                version: 99,
              },
            ],
          },
        }),
      }),
      { DB: db },
    );
    expect(response.status).toBe(409);

    const exported = await storageRequest(
      new Request("http://site.test/api/storage/export"),
      { DB: db },
    );
    const body = (await exported.json()) as Record<string, unknown>;
    expect(body.seasons).toEqual([]);
    expect(body.eventTracks).toHaveLength(1);
  });
});
