import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  PeriodizationDimension,
  Season,
} from "../../src/lib/domain/types";

describe("domain types", () => {
  it("represents the macro, meso and micro hierarchy by identifiers", () => {
    const macro = {
      id: "macro-1",
      seasonId: "season-1",
      name: "Foundation",
      startDate: "2026-08-01",
      endDate: "2026-10-31",
      version: 1,
    } satisfies Macrocycle;
    const meso = {
      id: "meso-1",
      macrocycleId: macro.id,
      name: "Aerobic base",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      version: 1,
    } satisfies Mesocycle;
    const micro = {
      id: "micro-1",
      mesocycleId: meso.id,
      name: "Week 1",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      targetRpe: 5,
      targetVolumeMeters: 20_000,
      version: 1,
    } satisfies Microcycle;

    expect(micro.mesocycleId).toBe(meso.id);
    expect(meso.macrocycleId).toBe(macro.id);
  });

  it("keeps focus dimensions parallel to the cycle hierarchy", () => {
    const dimension = {
      id: "dimension-aerobic",
      seasonId: "season-1",
      name: "Aerobic",
      code: "AERO",
      sortOrder: 1,
      active: true,
      version: 1,
    } satisfies PeriodizationDimension;
    const focus = {
      id: "focus-base",
      seasonId: dimension.seasonId,
      dimensionId: dimension.id,
      name: "Aerobic base",
      code: "BASE",
      active: true,
      version: 1,
    } satisfies FocusDefinition;
    const segment = {
      id: "segment-1",
      seasonId: dimension.seasonId,
      dimensionId: dimension.id,
      focusDefinitionId: focus.id,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      version: 1,
    } satisfies FocusSegment;

    expect(segment.dimensionId).toBe(dimension.id);
    expect(segment.focusDefinitionId).toBe(focus.id);
  });

  it("includes the season audit and soft-delete fields", () => {
    expectTypeOf<Season>().toMatchTypeOf<{
      id: string;
      version: number;
      createdAt: string;
      updatedAt: string;
      deletedAt?: string | null;
    }>();
  });
});
