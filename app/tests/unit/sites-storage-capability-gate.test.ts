import { describe, expect, it } from "vitest";
import { SitesStorageAdapter } from "../../src/lib/storage/SitesStorageAdapter";

const unavailableMessage =
  "SitesStorageAdapter requires verified ChatGPT Sites runtime bindings.";

describe("SitesStorageAdapter capability gate", () => {
  it("fails every operation explicitly while no runtime binding is verified", () => {
    const storage = new SitesStorageAdapter();
    const entity = { id: "season-1", version: 0 };

    const operations = [
      () => storage.get("seasons", entity.id),
      () => storage.list("seasons"),
      () => storage.put("seasons", entity),
      () => storage.softDelete("seasons", entity.id, { expectedVersion: 1 }),
      () => storage.listRevisions(entity.id),
      () => storage.exportAll(),
      () => storage.hydrate({ seasons: [entity] }),
    ];

    for (const operation of operations) {
      expect(operation).toThrow(unavailableMessage);
    }
  });
});
