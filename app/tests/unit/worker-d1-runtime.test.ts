import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import type { D1Database } from "../../worker/storage";
import { storageRequest } from "../../worker/storage";

const workerScript = `export default { fetch() { return new Response("ok"); } }`;

async function withD1(
  persistDir: string,
  run: (db: D1Database) => Promise<void>,
) {
  const mf = new Miniflare({
    modules: true,
    script: workerScript,
    d1Databases: { DB: "sgrs-swimplan-runtime-test" },
    d1Persist: persistDir,
  });
  const db = (await mf.getD1Database("DB")) as unknown as D1Database;
  try {
    await run(db);
  } finally {
    await mf.dispose();
  }
}

const season = {
  id: "runtime-season",
  name: "Runtime Smoke",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  description: "D1 runtime smoke",
  mainGoal: "Meisterschaft",
  status: "draft",
  createdAt: "2026-08-09T13:00:00.000Z",
  updatedAt: "2026-08-09T13:00:00.000Z",
  version: 0,
};

const putSeason = (db: D1Database, entity: unknown, expectedVersion: number) =>
  storageRequest(
    new Request("http://site.test/api/storage/seasons/runtime-season", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entity,
        options: { expectedVersion },
      }),
    }),
    { DB: db },
  );

describe("Worker storage on the provisioned D1 runtime (DB binding)", () => {
  it("persists a write across a runtime restart (smoke reload roundtrip)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sgrs-swimplan-d1-persist-"));
    try {
      await withD1(dir, async (db) => {
        const created = await putSeason(db, season, 0);
        expect(created.status).toBe(200);
        const written = (await created.json()) as { version: number };
        expect(written.version).toBe(1);
      });

      await withD1(dir, async (db) => {
        const read = await storageRequest(
          new Request("http://site.test/api/storage/seasons/runtime-season"),
          { DB: db },
        );
        expect(read.status).toBe(200);
        const row = (await read.json()) as { id: string; version: number };
        expect(row).toMatchObject({ id: season.id, version: 1 });
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lets exactly one of two parallel writers commit and rejects the other", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sgrs-swimplan-d1-conflict-"));
    try {
      await withD1(dir, async (db) => {
        await putSeason(db, season, 0);

        const [a, b] = await Promise.all([
          putSeason(db, { ...season, version: 1, name: "Writer A" }, 1),
          putSeason(db, { ...season, version: 1, name: "Writer B" }, 1),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);

        const winner = await storageRequest(
          new Request("http://site.test/api/storage/seasons/runtime-season"),
          { DB: db },
        );
        const row = (await winner.json()) as {
          name: string;
          version: number;
        };
        expect(["Writer A", "Writer B"]).toContain(row.name);
        expect(row.version).toBe(2);

        const revisions = await storageRequest(
          new Request(
            "http://site.test/api/storage/revisions?seasonId=runtime-season",
          ),
          { DB: db },
        );
        const list = (await revisions.json()) as Array<{
          operation: string;
        }>;
        expect(list.map((revision) => revision.operation)).toEqual([
          "create",
          "update",
        ]);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("purges a season and all rows sharing its season_id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sgrs-swimplan-d1-purge-"));
    try {
      await withD1(dir, async (db) => {
        const created = await putSeason(db, season, 0);
        expect(created.status).toBe(200);

        const macrocycle = {
          id: "runtime-macro",
          seasonId: season.id,
          name: "Base",
          startDate: "2026-08-01",
          endDate: "2027-01-31",
          goal: "Grundlage",
          notes: "",
          version: 0,
        };
        const macroResponse = await storageRequest(
          new Request(
            "http://site.test/api/storage/macrocycles/runtime-macro",
            {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                entity: macrocycle,
                options: {
                  expectedVersion: 0,
                  revision: { seasonId: season.id },
                },
              }),
            },
          ),
          { DB: db },
        );
        expect(macroResponse.status).toBe(200);

        const revisionsBefore = await storageRequest(
          new Request(
            "http://site.test/api/storage/revisions?seasonId=runtime-season",
          ),
          { DB: db },
        );
        expect((await revisionsBefore.json()).length).toBeGreaterThan(0);

        const purge = await storageRequest(
          new Request(
            "http://site.test/api/storage/seasons/runtime-season/purge",
            { method: "DELETE" },
          ),
          { DB: db },
        );
        expect(purge.status).toBe(204);

        const readSeason = await storageRequest(
          new Request("http://site.test/api/storage/seasons/runtime-season"),
          { DB: db },
        );
        expect(readSeason.status).toBe(200);
        expect(await readSeason.json()).toBeNull();

        const readMacro = await storageRequest(
          new Request("http://site.test/api/storage/macrocycles/runtime-macro"),
          { DB: db },
        );
        expect(readMacro.status).toBe(200);
        expect(await readMacro.json()).toBeNull();

        const revisionsAfter = await storageRequest(
          new Request(
            "http://site.test/api/storage/revisions?seasonId=runtime-season",
          ),
          { DB: db },
        );
        expect(await revisionsAfter.json()).toEqual([]);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns 404 when purging a season that does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sgrs-swimplan-d1-purge-404-"));
    try {
      await withD1(dir, async (db) => {
        const purge = await storageRequest(
          new Request(
            "http://site.test/api/storage/seasons/missing-season/purge",
            { method: "DELETE" },
          ),
          { DB: db },
        );
        expect(purge.status).toBe(404);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
