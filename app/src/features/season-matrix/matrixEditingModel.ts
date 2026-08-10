import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import type {
  CalendarConstraint,
  Event,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
} from "../../lib/domain/types";
import type {
  CalendarConstraintInput,
  EventInput,
  FocusSegmentInput,
  MacrocycleInput,
  MesocycleInput,
  MicrocycleInput,
} from "../../lib/validation/domain";
import type { SeasonMatrixWeek } from "./seasonMatrixViewModel";

export type MatrixEntityKind =
  | "event"
  | "constraint"
  | "macrocycle"
  | "mesocycle"
  | "focusSegment"
  | "microcycle";

export type MatrixEditingEntity =
  | Event
  | CalendarConstraint
  | Macrocycle
  | Mesocycle
  | FocusSegment
  | Microcycle;

export type MatrixEntityInput =
  | EventInput
  | CalendarConstraintInput
  | MacrocycleInput
  | MesocycleInput
  | FocusSegmentInput
  | MicrocycleInput;

export interface MatrixCreateContext {
  trackId?: string;
  dimensionId?: string;
  focusDefinitionId?: string;
  macrocycleId?: string;
  mesocycleId?: string;
}

export interface MatrixDateRange {
  startDate: string;
  endDate: string;
}

export function weekRangeForIndex(
  weeks: SeasonMatrixWeek[],
  index: number,
): MatrixDateRange {
  const week = weeks[Math.max(0, Math.min(weeks.length - 1, index))];
  return { startDate: week.startDate, endDate: week.endDate };
}

export function blankMatrixInput(
  kind: MatrixEntityKind,
  context: MatrixCreateContext,
  range: MatrixDateRange,
): MatrixEntityInput {
  switch (kind) {
    case "event":
      return {
        trackId: context.trackId ?? "",
        name: "",
        startDate: range.startDate,
        endDate: range.endDate,
        priority: "B",
        category: "",
        location: "",
        goal: "",
        notes: "",
      };
    case "constraint":
      return {
        type: "Ferien",
        name: "",
        startDate: range.startDate,
        endDate: range.endDate,
        notes: "",
        severity: "Hinweis",
      };
    case "macrocycle":
      return {
        name: "",
        startDate: range.startDate,
        endDate: range.endDate,
        goal: "",
        targetEventId: undefined,
        notes: "",
      };
    case "mesocycle":
      return {
        macrocycleId: context.macrocycleId ?? "",
        name: "",
        startDate: range.startDate,
        endDate: range.endDate,
        goal: "",
        notes: "",
      };
    case "focusSegment":
      return {
        dimensionId: context.dimensionId ?? "",
        focusDefinitionId: context.focusDefinitionId ?? "",
        startDate: range.startDate,
        endDate: range.endDate,
        notes: "",
      };
    case "microcycle":
      return {
        mesocycleId: context.mesocycleId ?? "",
        name: "",
        startDate: range.startDate,
        endDate: range.endDate,
        goal: "",
        targetRpe: 5,
        targetVolumeMeters: undefined,
      };
  }
}

export function matrixEditInput(
  kind: MatrixEntityKind,
  entity: MatrixEditingEntity,
): MatrixEntityInput {
  switch (kind) {
    case "event": {
      const event = entity as Event;
      return {
        trackId: event.trackId,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        priority: event.priority,
        category: event.category ?? "",
        location: event.location ?? "",
        goal: event.goal ?? "",
        notes: event.notes ?? "",
      };
    }
    case "constraint": {
      const constraint = entity as CalendarConstraint;
      return {
        type: constraint.type,
        name: constraint.name,
        startDate: constraint.startDate,
        endDate: constraint.endDate,
        notes: constraint.notes ?? "",
        severity: constraint.severity ?? "Hinweis",
      };
    }
    case "macrocycle": {
      const macrocycle = entity as Macrocycle;
      return {
        name: macrocycle.name,
        startDate: macrocycle.startDate,
        endDate: macrocycle.endDate,
        goal: macrocycle.goal,
        targetEventId: macrocycle.targetEventId,
        notes: macrocycle.notes,
      };
    }
    case "mesocycle": {
      const mesocycle = entity as Mesocycle;
      return {
        macrocycleId: mesocycle.macrocycleId,
        name: mesocycle.name,
        startDate: mesocycle.startDate,
        endDate: mesocycle.endDate,
        goal: mesocycle.goal,
        notes: mesocycle.notes,
      };
    }
    case "focusSegment": {
      const segment = entity as FocusSegment;
      return {
        dimensionId: segment.dimensionId,
        focusDefinitionId: segment.focusDefinitionId,
        startDate: segment.startDate,
        endDate: segment.endDate,
        notes: segment.notes ?? "",
      };
    }
    case "microcycle": {
      const microcycle = entity as Microcycle;
      return {
        mesocycleId: microcycle.mesocycleId,
        name: microcycle.name,
        startDate: microcycle.startDate,
        endDate: microcycle.endDate,
        goal: microcycle.goal,
        targetRpe: microcycle.targetRpe,
        targetVolumeMeters: microcycle.targetVolumeMeters,
      };
    }
  }
}

export interface SaveMatrixEntityParams {
  kind: MatrixEntityKind;
  service: SeasonPlanningService;
  seasonId: string;
  editing: MatrixEditingEntity | null;
  input: MatrixEntityInput;
}

export async function saveMatrixEntity({
  kind,
  service,
  seasonId,
  editing,
  input,
}: SaveMatrixEntityParams): Promise<MatrixEditingEntity> {
  switch (kind) {
    case "event":
      return editing
        ? service.updateEvent(editing as Event, input as EventInput)
        : service.createEvent(seasonId, input as EventInput);
    case "constraint":
      return editing
        ? service.updateConstraint(
            editing as CalendarConstraint,
            input as CalendarConstraintInput,
          )
        : service.createConstraint(seasonId, input as CalendarConstraintInput);
    case "macrocycle":
      return editing
        ? service.updateMacrocycle(
            editing as Macrocycle,
            input as MacrocycleInput,
          )
        : service.createMacrocycle(seasonId, input as MacrocycleInput);
    case "mesocycle":
      return editing
        ? service.updateMesocycle(editing as Mesocycle, input as MesocycleInput)
        : service.createMesocycle(input as MesocycleInput);
    case "focusSegment":
      return editing
        ? service.updateFocusSegment(
            editing as FocusSegment,
            input as FocusSegmentInput,
          )
        : service.createFocusSegment(seasonId, input as FocusSegmentInput);
    case "microcycle":
      return editing
        ? service.updateMicrocycle(
            editing as Microcycle,
            input as MicrocycleInput,
          )
        : service.createMicrocycle(input as MicrocycleInput);
  }
}

export async function deleteMatrixEntity(
  kind: MatrixEntityKind,
  service: SeasonPlanningService,
  entity: MatrixEditingEntity,
): Promise<void> {
  switch (kind) {
    case "event":
      return service.deleteEvent(entity as Event);
    case "constraint":
      return service.deleteConstraint(entity as CalendarConstraint);
    case "macrocycle":
      return service.deleteMacrocycle(entity as Macrocycle);
    case "mesocycle":
      return service.deleteMesocycle(entity as Mesocycle);
    case "focusSegment":
      return service.deleteFocusSegment(entity as FocusSegment);
    case "microcycle":
      return service.deleteMicrocycle(entity as Microcycle);
  }
}

const entityLabels: Record<MatrixEntityKind, string> = {
  event: "Wettkampf",
  constraint: "Restriktion",
  macrocycle: "Makrozyklus",
  mesocycle: "Mesozyklus",
  focusSegment: "Fokussegment",
  microcycle: "Mikrozyklus",
};

export function matrixEntityLabel(kind: MatrixEntityKind): string {
  return entityLabels[kind];
}
