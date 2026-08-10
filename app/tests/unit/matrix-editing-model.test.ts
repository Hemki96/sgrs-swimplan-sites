import { describe, expect, it, vi } from "vitest";

import {
  blankMatrixInput,
  deleteMatrixEntity,
  matrixEditInput,
  saveMatrixEntity,
  weekRangeForIndex,
} from "../../src/features/season-matrix/matrixEditingModel";
import type { SeasonMatrixWeek } from "../../src/features/season-matrix/seasonMatrixViewModel";
import type { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import type {
  Event,
  FocusSegment,
  Macrocycle,
  Microcycle,
} from "../../src/lib/domain/types";
import type {
  CalendarConstraintInput,
  EventInput,
  FocusSegmentInput,
  MacrocycleInput,
  MesocycleInput,
  MicrocycleInput,
} from "../../src/lib/validation/domain";

const weeks: SeasonMatrixWeek[] = [
  {
    id: "2026-W31",
    label: "KW 31",
    isoWeek: 31,
    isoWeekYear: 2026,
    startDate: "2026-08-01",
    endDate: "2026-08-02",
  },
  {
    id: "2026-W32",
    label: "KW 32",
    isoWeek: 32,
    isoWeekYear: 2026,
    startDate: "2026-08-03",
    endDate: "2026-08-09",
  },
  {
    id: "2026-W33",
    label: "KW 33",
    isoWeek: 33,
    isoWeekYear: 2026,
    startDate: "2026-08-10",
    endDate: "2026-08-16",
  },
];

describe("matrix editing model", () => {
  it("returns the clamped week range for any index", () => {
    expect(weekRangeForIndex(weeks, 1)).toEqual({
      startDate: "2026-08-03",
      endDate: "2026-08-09",
    });
    expect(weekRangeForIndex(weeks, -5)).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-02",
    });
    expect(weekRangeForIndex(weeks, 99)).toEqual({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
    });
  });

  it("builds schema-valid create inputs with row context and default range", () => {
    const range = { startDate: "2026-08-03", endDate: "2026-08-09" };
    const event = blankMatrixInput(
      "event",
      { trackId: "track-1" },
      range,
    ) as EventInput;
    expect(event).toMatchObject({
      trackId: "track-1",
      priority: "B",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
    });
    expect(
      blankMatrixInput("constraint", {}, range) as CalendarConstraintInput,
    ).toMatchObject({ type: "Ferien", severity: "Hinweis" });
    expect(
      blankMatrixInput("macrocycle", {}, range) as MacrocycleInput,
    ).toMatchObject({ targetEventId: undefined });
    expect(
      blankMatrixInput(
        "mesocycle",
        { macrocycleId: "macro-1" },
        range,
      ) as MesocycleInput,
    ).toMatchObject({ macrocycleId: "macro-1" });
    expect(
      blankMatrixInput(
        "focusSegment",
        { dimensionId: "dim-1" },
        range,
      ) as FocusSegmentInput,
    ).toMatchObject({ dimensionId: "dim-1" });
    expect(
      blankMatrixInput(
        "microcycle",
        { mesocycleId: "meso-1" },
        range,
      ) as MicrocycleInput,
    ).toMatchObject({ mesocycleId: "meso-1", targetRpe: 5 });
  });

  it("round-trips entities into editable inputs", () => {
    const event: Event = {
      id: "event-1",
      seasonId: "season-1",
      trackId: "track-1",
      name: "Meisterschaft",
      startDate: "2027-07-10",
      endDate: "2027-07-11",
      priority: "A",
      version: 1,
    };
    expect(matrixEditInput("event", event)).toMatchObject({
      trackId: "track-1",
      name: "Meisterschaft",
      priority: "A",
      category: "",
    });

    const focus: FocusSegment = {
      id: "segment-1",
      seasonId: "season-1",
      dimensionId: "dim-1",
      focusDefinitionId: "focus-1",
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      version: 1,
    };
    expect(matrixEditInput("focusSegment", focus)).toMatchObject({
      dimensionId: "dim-1",
      focusDefinitionId: "focus-1",
      notes: "",
    });

    const micro: Microcycle = {
      id: "micro-1",
      mesocycleId: "meso-1",
      name: "KW 32",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      targetRpe: 6,
      targetVolumeMeters: 18000,
      goal: "Einstieg",
      version: 1,
    };
    expect(matrixEditInput("microcycle", micro)).toMatchObject({
      mesocycleId: "meso-1",
      targetRpe: 6,
      targetVolumeMeters: 18000,
    });
  });

  it("dispatches creates and updates to the right service methods", async () => {
    const service = {
      createEvent: vi.fn().mockResolvedValue({ id: "event-1" }),
      createConstraint: vi.fn().mockResolvedValue({ id: "constraint-1" }),
      createMacrocycle: vi.fn().mockResolvedValue({ id: "macro-1" }),
      createMesocycle: vi.fn().mockResolvedValue({ id: "meso-1" }),
      createFocusSegment: vi.fn().mockResolvedValue({ id: "segment-1" }),
      createMicrocycle: vi.fn().mockResolvedValue({ id: "micro-1" }),
      updateEvent: vi.fn().mockResolvedValue({ id: "event-1" }),
      updateConstraint: vi.fn().mockResolvedValue({ id: "constraint-1" }),
      updateMacrocycle: vi.fn().mockResolvedValue({ id: "macro-1" }),
      updateMesocycle: vi.fn().mockResolvedValue({ id: "meso-1" }),
      updateFocusSegment: vi.fn().mockResolvedValue({ id: "segment-1" }),
      updateMicrocycle: vi.fn().mockResolvedValue({ id: "micro-1" }),
    } as unknown as SeasonPlanningService;

    const input = blankMatrixInput(
      "event",
      {},
      {
        startDate: "2026-08-03",
        endDate: "2026-08-09",
      },
    );
    await saveMatrixEntity({
      kind: "event",
      service,
      seasonId: "season-1",
      editing: null,
      input,
    });
    expect(service.createEvent).toHaveBeenCalledWith("season-1", input);

    const macro = { id: "macro-1" } as unknown as Macrocycle;
    const macroInput = blankMatrixInput(
      "macrocycle",
      {},
      {
        startDate: "2026-08-01",
        endDate: "2027-01-31",
      },
    );
    await saveMatrixEntity({
      kind: "macrocycle",
      service,
      seasonId: "season-1",
      editing: macro,
      input: macroInput,
    });
    expect(service.updateMacrocycle).toHaveBeenCalledWith(macro, macroInput);
    expect(service.createMacrocycle).not.toHaveBeenCalled();
  });

  it("deletes every editable kind through the service", async () => {
    const service = {
      deleteEvent: vi.fn().mockResolvedValue(undefined),
      deleteConstraint: vi.fn().mockResolvedValue(undefined),
      deleteMacrocycle: vi.fn().mockResolvedValue(undefined),
      deleteMesocycle: vi.fn().mockResolvedValue(undefined),
      deleteFocusSegment: vi.fn().mockResolvedValue(undefined),
      deleteMicrocycle: vi.fn().mockResolvedValue(undefined),
    } as unknown as SeasonPlanningService;

    const cases: Array<[Parameters<typeof deleteMatrixEntity>[0], object]> = [
      ["event", { id: "e" }],
      ["constraint", { id: "c" }],
      ["macrocycle", { id: "m" }],
      ["mesocycle", { id: "me" }],
      ["focusSegment", { id: "f" }],
      ["microcycle", { id: "mi" }],
    ];
    for (const [kind, entity] of cases) {
      await deleteMatrixEntity(kind, service, entity as never);
    }
    expect(service.deleteEvent).toHaveBeenCalledWith({ id: "e" });
    expect(service.deleteConstraint).toHaveBeenCalledWith({ id: "c" });
    expect(service.deleteMacrocycle).toHaveBeenCalledWith({ id: "m" });
    expect(service.deleteMesocycle).toHaveBeenCalledWith({ id: "me" });
    expect(service.deleteFocusSegment).toHaveBeenCalledWith({ id: "f" });
    expect(service.deleteMicrocycle).toHaveBeenCalledWith({ id: "mi" });
  });
});
