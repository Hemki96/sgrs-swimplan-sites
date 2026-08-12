import { describe, expect, it } from "vitest";
import { ConfigurationService } from "../../src/lib/domain/configuration";
import type { ConfigurationValue, Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

describe("ConfigurationService", () => {
  it("ignores legacy key/value rows without crashing during default seeding", async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.hydrate({
      configuration_values: [
        {
          id: "legacy-calendar-system",
          version: 1,
          key: "calendarSystem",
          value: "ISO-8601",
        },
      ],
    });

    const service = new ConfigurationService(storage);
    const values = await service.ensureDefaults();

    expect(values.length).toBeGreaterThan(10);
    expect(
      values.every((value) => value.group && value.code && value.label),
    ).toBe(true);
  });

  it("seeds global defaults once and creates global revisions", async () => {
    const storage = new InMemoryStorageAdapter();
    const service = new ConfigurationService(storage);
    const first = await service.ensureDefaults();
    const second = await service.ensureDefaults();
    expect(first.length).toBeGreaterThan(10);
    expect(second).toHaveLength(first.length);
    expect(await storage.listGlobalRevisions()).toHaveLength(first.length);
  });

  it("deactivates a referenced value instead of deleting it", async () => {
    const storage = new InMemoryStorageAdapter();
    const service = new ConfigurationService(storage);
    const values = await service.ensureDefaults();
    const active = values.find(
      (value) => value.group === "season_status" && value.code === "active",
    )!;
    await storage.put<Season>("seasons", {
      id: "s1",
      name: "S",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      description: "D",
      mainGoal: "G",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 0,
    });
    await service.remove(active);
    const stored = await storage.get<ConfigurationValue>(
      "configuration_values",
      active.id,
    );
    expect(stored?.active).toBe(false);
    expect(stored?.deletedAt).toBeUndefined();
  });
});
