import { describe, it, expect } from "vitest";
import {
  assertRpe,
  assertDateRange,
  assertNestedRange,
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
});
