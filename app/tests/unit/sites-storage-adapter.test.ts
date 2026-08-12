import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SitesStorageAdapter,
  StorageTransportError,
  StorageValidationError,
} from "../../src/lib/storage/SitesStorageAdapter";

describe("SitesStorageAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the verified storage route for reads and writes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ id: "season-1", version: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = new SitesStorageAdapter("https://site.test/api/storage");

    await expect(storage.list("seasons")).resolves.toEqual([]);
    await expect(
      storage.put(
        "seasons",
        { id: "season-1", version: 0 },
        { expectedVersion: 0 },
      ),
    ).resolves.toEqual({ id: "season-1", version: 1 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://site.test/api/storage/seasons",
      expect.objectContaining({
        headers: { "content-type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://site.test/api/storage/seasons/season-1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("requests planning collections in the indexed season scope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const storage = new SitesStorageAdapter("https://site.test/api/storage");

    await storage.list("microcycles", { seasonId: "season 1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.test/api/storage/microcycles?seasonId=season+1",
      expect.any(Object),
    );
  });

  it("maps HTTP conflicts to the shared version conflict error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { expectedVersion: 1, actualVersion: 2 },
            { status: 409 },
          ),
        ),
    );
    const storage = new SitesStorageAdapter("https://site.test/api/storage");
    await expect(
      storage.put(
        "seasons",
        { id: "season-1", version: 1 },
        { expectedVersion: 1 },
      ),
    ).rejects.toMatchObject({ name: "VersionConflictError", actualVersion: 2 });
  });

  it("converts the documented export back to a snake-case snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          schemaVersion: "1.0",
          exportedAt: "2026-08-10T10:00:00.000Z",
          seasons: [{ id: "season-1", version: 1 }],
          eventTracks: [],
          trainingSessions: [
            { id: "session-1", version: 2, deletedAt: "2026-08-08T10:00:00Z" },
          ],
          revisions: [{ id: "revision-1" }],
        }),
      ),
    );
    const storage = new SitesStorageAdapter("https://site.test/api/storage");
    const snapshot = await storage.exportAll();
    expect(snapshot.seasons).toEqual([{ id: "season-1", version: 1 }]);
    expect(snapshot.event_tracks).toEqual([]);
    expect(snapshot.training_sessions).toEqual([
      { id: "session-1", version: 2, deletedAt: "2026-08-08T10:00:00Z" },
    ]);
    expect(snapshot.revisions).toEqual([{ id: "revision-1" }]);
    expect("eventTracks" in snapshot).toBe(false);
  });

  it("posts the remapped snapshot to the import route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const storage = new SitesStorageAdapter("https://site.test/api/storage");
    await storage.applyImport({
      seasons: [{ id: "season-1", version: 0 }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.test/api/storage/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          snapshot: { seasons: [{ id: "season-1", version: 0 }] },
        }),
      }),
    );
  });

  it("maps structured API failures to a typed validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "INVALID_ENTITY",
              message: "RPE ist ungültig.",
              collection: "training_sessions",
              entityId: "session-1",
              path: "expectedRpe",
            },
          },
          { status: 400 },
        ),
      ),
    );
    const storage = new SitesStorageAdapter("https://site.test/api/storage");

    await expect(storage.list("seasons")).rejects.toEqual(
      expect.objectContaining({
        name: "StorageValidationError",
        detail: expect.objectContaining({ code: "INVALID_ENTITY" }),
      }),
    );
    expect(StorageValidationError).toBeDefined();
  });

  it("keeps non-JSON runtime failures separate from validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("Gateway timeout", { status: 504 })),
    );
    const storage = new SitesStorageAdapter("https://site.test/api/storage");

    await expect(storage.list("seasons")).rejects.toBeInstanceOf(
      StorageTransportError,
    );
  });
});
