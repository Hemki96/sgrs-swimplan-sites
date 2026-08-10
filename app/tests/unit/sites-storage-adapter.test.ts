import { afterEach, describe, expect, it, vi } from "vitest";
import { SitesStorageAdapter } from "../../src/lib/storage/SitesStorageAdapter";

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
});
