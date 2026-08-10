import { describe, expect, it } from "vitest";
import { buildJsonExport } from "../../src/lib/export/jsonExport";
import {
  buildImportSnapshot,
  parseImport,
} from "../../src/lib/import/jsonImport";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";

const season = {
  id: "season-old",
  name: "Import",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  description: "D",
  mainGoal: "G",
  status: "draft",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
};

describe("JSON import", () => {
  it("rejects malformed and unknown versions without a snapshot", () => {
    expect(parseImport("no json").errors).not.toHaveLength(0);
    expect(
      parseImport(JSON.stringify({ schemaVersion: 9, seasons: [season] }))
        .errors,
    ).not.toHaveLength(0);
  });

  it("previews a season, remaps relationships and imports atomically", async () => {
    const payload = buildJsonExport(
      {
        seasons: [season],
        event_tracks: [
          {
            id: "track-old",
            seasonId: season.id,
            name: "Track",
            visible: true,
            sortOrder: 0,
            version: 1,
          },
        ],
        events: [
          {
            id: "event-old",
            seasonId: season.id,
            trackId: "track-old",
            name: "Event",
            startDate: "2026-03-01",
            endDate: "2026-03-01",
            priority: "A",
            version: 1,
          },
        ],
      },
      "2026-08-10T10:00:00.000Z",
    );
    const preview = parseImport(JSON.stringify(payload));
    expect(preview.errors).toEqual([]);
    const snapshot = buildImportSnapshot(preview, season.id);
    const importedSeason = snapshot.seasons?.[0] as { id: string };
    const importedTrack = snapshot.event_tracks?.[0] as {
      id: string;
      seasonId: string;
    };
    const importedEvent = snapshot.events?.[0] as { trackId: string };
    expect(importedSeason.id).not.toBe(season.id);
    expect(importedTrack.seasonId).toBe(importedSeason.id);
    expect(importedEvent.trackId).toBe(importedTrack.id);
    const storage = new InMemoryStorageAdapter();
    await storage.applyImport(snapshot);
    expect(await storage.list("seasons")).toHaveLength(1);
  });
});
