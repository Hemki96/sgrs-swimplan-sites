import { describe, expect, it } from "vitest";
import type { Season } from "../../src/lib/domain/types";
import {
  preferredSeason,
  seasonIdFromPath,
} from "../../src/features/seasons/seasonNavigation";

const base = {
  version: 1,
  description: "Planung",
  mainGoal: "Ziel",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as const;
function season(
  id: string,
  status: Season["status"],
  startDate: string,
  endDate: string,
): Season {
  return { ...base, id, name: id, status, startDate, endDate };
}

describe("season navigation", () => {
  it("prefers active, then current, then newest non-archived season", () => {
    const current = season("current", "draft", "2026-01-01", "2026-12-31");
    const active = season("active", "active", "2025-01-01", "2025-12-31");
    expect(preferredSeason([current, active], "2026-08-10")?.id).toBe("active");
    expect(preferredSeason([current], "2026-08-10")?.id).toBe("current");
    expect(
      preferredSeason(
        [
          season("old", "completed", "2024-01-01", "2024-12-31"),
          season("new", "draft", "2025-01-01", "2025-12-31"),
        ],
        "2026-08-10",
      )?.id,
    ).toBe("new");
  });

  it("parses only season detail paths", () => {
    expect(seasonIdFromPath("/saisons/abc-123")).toBe("abc-123");
    expect(seasonIdFromPath("/")).toBeUndefined();
  });
});
