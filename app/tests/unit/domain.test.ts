import { describe, it, expect } from "vitest";
import {
  assertRpe,
  assertDateRange,
  assertNestedRange,
  seasonInputSchema,
} from "../../src/lib/validation/domain";
describe("domain", () => {
  it("rpe", () => expect(() => assertRpe(8)).not.toThrow());
  it("bad rpe", () => expect(() => assertRpe(11)).toThrow());
  it("date", () =>
    expect(() => assertDateRange("2026-09-02", "2026-09-01")).toThrow());
  it("nested", () =>
    expect(() =>
      assertNestedRange("2026-08-01", "2026-10-31", "2026-09-01", "2026-09-30"),
    ).not.toThrow());
  it("accepts a season whose start and end dates are equal", () => {
    expect(() =>
      seasonInputSchema.parse({
        name: "Kurzsaison",
        startDate: "2026-08-09",
        endDate: "2026-08-09",
        description: "Ein Planungstag",
        mainGoal: "Test",
        status: "draft",
      }),
    ).not.toThrow();
  });
  it("rejects a season whose start date is after its end date", () => {
    const result = seasonInputSchema.safeParse({
      name: "Ungültig",
      startDate: "2026-08-10",
      endDate: "2026-08-09",
      description: "Ungültiger Zeitraum",
      mainGoal: "Test",
      status: "draft",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ["endDate"] });
    }
  });
});
