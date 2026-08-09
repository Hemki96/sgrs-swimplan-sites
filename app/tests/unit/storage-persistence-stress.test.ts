import { describe, expect, it } from "vitest";
import type { Season } from "../../src/lib/domain/types";
import {
  InMemoryStorageAdapter,
  VersionConflictError,
} from "../../src/lib/storage/InMemoryStorageAdapter";

const season: Season = {
  id: "stress-season",
  name: "Storage stress fixture",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  status: "draft",
  version: 0,
  createdAt: "2026-08-09T13:00:00.000Z",
  updatedAt: "2026-08-09T13:00:00.000Z",
};

describe("StorageAdapter persistence stress contract", () => {
  it("survives reload, rejects lost updates, soft deletes, and exports everything", async () => {
    let clock = 0;
    let revision = 0;
    const storage = new InMemoryStorageAdapter({
      createId: () => `stress-revision-${++revision}`,
      now: () => `2026-08-09T13:00:0${clock++}.000Z`,
    });

    // 1-3: create, read, update.
    const created = await storage.put("seasons", season);
    await expect(storage.get<Season>("seasons", season.id)).resolves.toEqual(
      created,
    );
    const updated = await storage.put(
      "seasons",
      { ...created, name: "Updated stress fixture" },
      { expectedVersion: created.version },
    );
    expect(updated).toMatchObject({
      name: "Updated stress fixture",
      version: 2,
      updatedAt: "2026-08-09T13:00:01.000Z",
    });

    // 4-5: simulate a fresh runtime by creating a new adapter from the export.
    const reloaded = new InMemoryStorageAdapter({
      createId: () => `reloaded-revision-${++revision}`,
      now: () => `2026-08-09T13:00:0${clock++}.000Z`,
    });
    await reloaded.hydrate(await storage.exportAll());
    await expect(reloaded.get<Season>("seasons", season.id)).resolves.toEqual(
      updated,
    );

    // 8-9: two writers use the same version; exactly one may commit.
    const parallel = await Promise.allSettled([
      reloaded.put(
        "seasons",
        { ...updated, name: "Writer A" },
        { expectedVersion: updated.version },
      ),
      reloaded.put(
        "seasons",
        { ...updated, name: "Writer B" },
        { expectedVersion: updated.version },
      ),
    ]);
    expect(
      parallel.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = parallel.find(({ status }) => status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: expect.any(VersionConflictError),
    });

    const winner = await reloaded.get<Season>("seasons", season.id);
    expect(winner).toMatchObject({ version: 3 });

    // 6-7: soft delete is guarded and hidden from normal reads and lists.
    await reloaded.softDelete("seasons", season.id, {
      expectedVersion: winner!.version,
    });
    await expect(reloaded.get("seasons", season.id)).resolves.toBeNull();
    await expect(reloaded.list("seasons")).resolves.toEqual([]);
    await expect(
      reloaded.list<Season>("seasons", { includeDeleted: true }),
    ).resolves.toMatchObject([
      {
        id: season.id,
        version: 4,
        deletedAt: "2026-08-09T13:00:03.000Z",
        updatedAt: "2026-08-09T13:00:03.000Z",
      },
    ]);

    // 10: export retains soft-deleted rows and the complete revision history.
    const exported = await reloaded.exportAll();
    expect(exported.seasons).toHaveLength(1);
    expect(exported.revisions).toHaveLength(4);
    expect(exported.revisions).toMatchObject([
      { operation: "create", revisionNumber: 1 },
      { operation: "update", revisionNumber: 2 },
      { operation: "update", revisionNumber: 3 },
      { operation: "soft_delete", revisionNumber: 4 },
    ]);
  });
});
