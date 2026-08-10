import { describe, expect, it } from "vitest";
import { buildJsonExport } from "../../src/lib/export/jsonExport";

describe("JSON export", () => {
  it("emits the versioned portable format and all collections", () => {
    const payload = buildJsonExport(
      { seasons: [{ id: "season-1", version: 1 }], event_tracks: [] },
      "2026-08-09T14:00:00.000Z",
    );
    expect(payload).toMatchObject({
      schemaVersion: 2,
      exportedAt: "2026-08-09T14:00:00.000Z",
      seasons: [{ id: "season-1", version: 1 }],
      eventTracks: [],
      trainingSessions: [],
      revisions: [],
      configurationValues: [],
    });
  });
});
