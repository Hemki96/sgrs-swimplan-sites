import { z } from "zod";

import { configurationGroups, weekdays, type Revision } from "../domain/types";
import {
  STORAGE_COLLECTIONS,
  type StorageCollection,
  type StorageSnapshot,
} from "../storage/StorageAdapter";
import { eventPriorities, seasonStatuses } from "./domain";

const id = z.string().min(1).max(200);
const name = z.string().trim().min(1).max(200);
const text = z.string().max(5_000);
const shortText = z.string().max(500);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true });
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const code = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
  .max(100);

const versioned = {
  id,
  version: z.number().int().nonnegative(),
};
const softDeletable = {
  ...versioned,
  deletedAt: isoDateTime.nullish(),
};
const dateRange = { startDate: isoDate, endDate: isoDate };

const configurationValueSchema = z
  .object({
    ...softDeletable,
    group: z.enum(configurationGroups),
    code,
    label: name,
    description: text.optional(),
    sortOrder: z.number().int().nonnegative(),
    active: z.boolean(),
    parentCode: code.optional(),
  })
  .strict();

const seasonSchema = z
  .object({
    ...softDeletable,
    name,
    ...dateRange,
    description: text,
    mainGoal: text,
    status: z.enum(seasonStatuses),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();

const eventTrackSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    name,
    sortOrder: z.number().int().nonnegative(),
    visible: z.boolean(),
  })
  .strict();

const eventSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    trackId: id,
    name,
    ...dateRange,
    priority: z.enum(eventPriorities),
    category: shortText.optional(),
    location: shortText.optional(),
    goal: text.optional(),
    notes: text.optional(),
  })
  .strict();

const calendarConstraintSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    type: name,
    name,
    ...dateRange,
    notes: text.optional(),
    severity: shortText.optional(),
  })
  .strict();

const macrocycleSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    name,
    ...dateRange,
    goal: text,
    targetEventId: id.optional(),
    notes: text,
  })
  .strict();

const mesocycleSchema = z
  .object({
    ...softDeletable,
    macrocycleId: id,
    name,
    ...dateRange,
    goal: text,
    notes: text,
  })
  .strict();

const microcycleSchema = z
  .object({
    ...softDeletable,
    mesocycleId: id,
    name,
    ...dateRange,
    targetRpe: z.number().int().min(1).max(10).optional(),
    targetVolumeMeters: z.number().nonnegative().optional(),
    goal: text,
  })
  .strict();

const microcycleSegmentSchema = z
  .object({
    ...softDeletable,
    microcycleId: id,
    name,
    ...dateRange,
    segmentType: name,
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();

const periodizationDimensionSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    name,
    code,
    description: text.optional(),
    sortOrder: z.number().int().nonnegative(),
    active: z.boolean(),
  })
  .strict();

const focusDefinitionSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    dimensionId: id,
    name,
    code,
    description: text.optional(),
    active: z.boolean(),
  })
  .strict();

const focusSegmentSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    dimensionId: id,
    focusDefinitionId: id,
    ...dateRange,
    notes: text.optional(),
  })
  .strict();

const trainingDaySchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    date: isoDate,
    dayContext: shortText.optional(),
    notes: text.optional(),
  })
  .strict();

const trainingSessionSchema = z
  .object({
    ...softDeletable,
    trainingDayId: id,
    title: name.optional(),
    startTime: localTime.optional(),
    durationMinutes: z.number().int().positive().optional(),
    volumeMeters: z.number().nonnegative().optional(),
    expectedRpe: z.number().int().min(1).max(10).optional(),
    mainFocusId: id.optional(),
    technicalFocusId: id.optional(),
    keySession: z.boolean().optional(),
    athleteNote: text.optional(),
    equipment: text.optional(),
    scheduleTemplateId: id.optional(),
    generatedFromSchedule: z.boolean().optional(),
    scheduleDetached: z.boolean().optional(),
    status: z.enum(["planned", "cancelled"]).optional(),
  })
  .strict();

const trainingScheduleTemplateSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    name,
    weekday: z.enum(weekdays),
    startTime: localTime,
    endTime: localTime,
    location: shortText.optional(),
    active: z.boolean(),
    validFrom: isoDate.nullish(),
    validUntil: isoDate.nullish(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();

const equipmentItemSchema = z
  .object({
    ...softDeletable,
    seasonId: id,
    name,
    code,
    active: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();

const sessionEquipmentSchema = z
  .object({
    ...softDeletable,
    sessionId: id,
    equipmentId: id,
    requirementLevel: z.enum(["required", "recommended", "optional"]),
  })
  .strict();

const revisionSchema: z.ZodType<Revision> = z
  .object({
    id,
    seasonId: id,
    revisionNumber: z.number().int().positive(),
    timestamp: isoDateTime,
    operation: name,
    entityType: name,
    entityId: id,
    beforeJson: z.unknown(),
    afterJson: z.unknown(),
    editorLabel: shortText.optional(),
  })
  .strict();

export const storageEntitySchemas: Record<StorageCollection, z.ZodType> = {
  configuration_values: configurationValueSchema,
  seasons: seasonSchema,
  event_tracks: eventTrackSchema,
  events: eventSchema,
  calendar_constraints: calendarConstraintSchema,
  macrocycles: macrocycleSchema,
  mesocycles: mesocycleSchema,
  microcycles: microcycleSchema,
  microcycle_segments: microcycleSegmentSchema,
  periodization_dimensions: periodizationDimensionSchema,
  focus_definitions: focusDefinitionSchema,
  focus_segments: focusSegmentSchema,
  training_days: trainingDaySchema,
  training_sessions: trainingSessionSchema,
  training_schedule_templates: trainingScheduleTemplateSchema,
  equipment_items: equipmentItemSchema,
  session_equipment: sessionEquipmentSchema,
  revisions: revisionSchema,
};

export interface SnapshotValidationIssue {
  code: string;
  message: string;
  collection?: StorageCollection;
  entityId?: string;
  path?: string;
}

export function validateStorageEntity(
  collection: StorageCollection,
  value: unknown,
):
  | { success: true; data: Record<string, unknown> }
  | {
      success: false;
      issue: SnapshotValidationIssue;
    } {
  const result = storageEntitySchemas[collection].safeParse(value);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  const issue = result.error.issues[0];
  const entityId =
    value && typeof value === "object" && "id" in value
      ? String((value as { id: unknown }).id)
      : undefined;
  return {
    success: false,
    issue: {
      code: "INVALID_ENTITY",
      message: issue?.message ?? "Ungültige Entität.",
      collection,
      entityId,
      path: issue?.path.map(String).join("."),
    },
  };
}

export function validateStorageSnapshot(
  snapshot: StorageSnapshot,
  options: { allowRevisions?: boolean } = {},
): SnapshotValidationIssue[] {
  const issues: SnapshotValidationIssue[] = [];
  const rowsByCollection = new Map<
    StorageCollection,
    Map<string, Record<string, unknown>>
  >();

  for (const collection of STORAGE_COLLECTIONS) {
    const rows = snapshot[collection] ?? [];
    if (collection === "revisions" && rows.length && !options.allowRevisions) {
      issues.push({
        code: "REVISIONS_NOT_IMPORTABLE",
        message: "Revisionen dürfen nicht importiert werden.",
        collection,
      });
      continue;
    }
    const parsedRows = new Map<string, Record<string, unknown>>();
    rowsByCollection.set(collection, parsedRows);
    for (const row of rows) {
      const parsed = validateStorageEntity(collection, row);
      if (!parsed.success) {
        issues.push(parsed.issue);
        continue;
      }
      const entityId = parsed.data.id as string;
      if (parsedRows.has(entityId)) {
        issues.push({
          code: "DUPLICATE_ID",
          message: `ID ${entityId} ist mehrfach vorhanden.`,
          collection,
          entityId,
          path: "id",
        });
      }
      parsedRows.set(entityId, parsed.data);
    }
  }

  validateRelations(rowsByCollection, issues);
  return issues;
}

function validateRelations(
  rows: Map<StorageCollection, Map<string, Record<string, unknown>>>,
  issues: SnapshotValidationIssue[],
): void {
  const get = (collection: StorageCollection, entityId: unknown) =>
    typeof entityId === "string"
      ? rows.get(collection)?.get(entityId)
      : undefined;
  const relation = (
    collection: StorageCollection,
    entity: Record<string, unknown>,
    field: string,
    parentCollection: StorageCollection,
    optional = false,
  ) => {
    const parentId = entity[field];
    if (optional && parentId === undefined) return undefined;
    const parent = get(parentCollection, parentId);
    if (!parent) {
      issues.push({
        code: "MISSING_REFERENCE",
        message: `${field} verweist auf keine vorhandene Entität.`,
        collection,
        entityId: entity.id as string,
        path: field,
      });
    }
    return parent;
  };
  const sameSeason = (
    collection: StorageCollection,
    entity: Record<string, unknown>,
    parent: Record<string, unknown> | undefined,
    parentSeasonId = parent?.seasonId,
  ) => {
    if (parent && entity.seasonId !== parentSeasonId) {
      issues.push({
        code: "CROSS_SEASON_REFERENCE",
        message: "Referenz gehört nicht zur selben Saison.",
        collection,
        entityId: entity.id as string,
      });
    }
  };
  const within = (
    collection: StorageCollection,
    entity: Record<string, unknown>,
    parent: Record<string, unknown> | undefined,
  ) => {
    if (
      parent &&
      ((entity.startDate as string) < (parent.startDate as string) ||
        (entity.endDate as string) > (parent.endDate as string))
    ) {
      issues.push({
        code: "OUTSIDE_PARENT_RANGE",
        message: "Zeitraum liegt außerhalb des übergeordneten Zeitraums.",
        collection,
        entityId: entity.id as string,
      });
    }
  };
  const seasonFor = (
    collection: StorageCollection,
    entity: Record<string, unknown> | undefined,
  ): string | undefined => {
    if (!entity) return undefined;
    if (collection === "seasons") return entity.id as string;
    if (typeof entity.seasonId === "string") return entity.seasonId;
    const parents: Partial<
      Record<StorageCollection, [string, StorageCollection]>
    > = {
      mesocycles: ["macrocycleId", "macrocycles"],
      microcycles: ["mesocycleId", "mesocycles"],
      microcycle_segments: ["microcycleId", "microcycles"],
      training_sessions: ["trainingDayId", "training_days"],
      session_equipment: ["sessionId", "training_sessions"],
    };
    const reference = parents[collection];
    if (!reference) return undefined;
    return seasonFor(reference[1], get(reference[1], entity[reference[0]]));
  };

  const seasons = rows.get("seasons") ?? new Map();
  for (const [collection, entities] of rows) {
    if (collection === "configuration_values" || collection === "revisions")
      continue;
    for (const entity of entities.values()) {
      if (entity.deletedAt) continue;
      if (
        typeof entity.startDate === "string" &&
        entity.startDate > entity.endDate!
      ) {
        issues.push({
          code: "INVALID_DATE_RANGE",
          message: "Startdatum liegt nach dem Enddatum.",
          collection,
          entityId: entity.id as string,
          path: "endDate",
        });
      }
      if (
        typeof entity.seasonId === "string" &&
        !seasons.has(entity.seasonId)
      ) {
        issues.push({
          code: "MISSING_REFERENCE",
          message: "seasonId verweist auf keine vorhandene Saison.",
          collection,
          entityId: entity.id as string,
          path: "seasonId",
        });
      }
    }
  }

  for (const entity of rows.get("events")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const track = relation("events", entity, "trackId", "event_tracks");
    sameSeason("events", entity, track);
    within("events", entity, seasons.get(entity.seasonId as string));
  }
  for (const collection of [
    "calendar_constraints",
    "macrocycles",
    "focus_segments",
  ] as const) {
    for (const entity of rows.get(collection)?.values() ?? []) {
      if (entity.deletedAt) continue;
      within(collection, entity, seasons.get(entity.seasonId as string));
    }
  }
  for (const entity of rows.get("macrocycles")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const event = relation(
      "macrocycles",
      entity,
      "targetEventId",
      "events",
      true,
    );
    sameSeason("macrocycles", entity, event);
  }
  for (const entity of rows.get("mesocycles")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const parent = relation(
      "mesocycles",
      entity,
      "macrocycleId",
      "macrocycles",
    );
    within("mesocycles", entity, parent);
  }
  for (const entity of rows.get("microcycles")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const parent = relation("microcycles", entity, "mesocycleId", "mesocycles");
    within("microcycles", entity, parent);
  }
  for (const entity of rows.get("microcycle_segments")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const parent = relation(
      "microcycle_segments",
      entity,
      "microcycleId",
      "microcycles",
    );
    within("microcycle_segments", entity, parent);
  }
  for (const entity of rows.get("focus_definitions")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const dimension = relation(
      "focus_definitions",
      entity,
      "dimensionId",
      "periodization_dimensions",
    );
    sameSeason("focus_definitions", entity, dimension);
  }
  for (const entity of rows.get("focus_segments")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const dimension = relation(
      "focus_segments",
      entity,
      "dimensionId",
      "periodization_dimensions",
    );
    const definition = relation(
      "focus_segments",
      entity,
      "focusDefinitionId",
      "focus_definitions",
    );
    sameSeason("focus_segments", entity, dimension);
    sameSeason("focus_segments", entity, definition);
    if (dimension && definition && definition.dimensionId !== dimension.id) {
      issues.push({
        code: "INVALID_REFERENCE",
        message: "Fokusdefinition gehört nicht zur angegebenen Dimension.",
        collection: "focus_segments",
        entityId: entity.id as string,
        path: "focusDefinitionId",
      });
    }
  }
  for (const entity of rows.get("training_days")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const season = seasons.get(entity.seasonId as string);
    if (
      season &&
      (entity.date! < season.startDate! || entity.date! > season.endDate!)
    ) {
      issues.push({
        code: "OUTSIDE_PARENT_RANGE",
        message: "Trainingstag liegt außerhalb der Saison.",
        collection: "training_days",
        entityId: entity.id as string,
        path: "date",
      });
    }
  }
  for (const entity of rows.get("training_sessions")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const day = relation(
      "training_sessions",
      entity,
      "trainingDayId",
      "training_days",
    );
    const template = relation(
      "training_sessions",
      entity,
      "scheduleTemplateId",
      "training_schedule_templates",
      true,
    );
    for (const field of ["mainFocusId", "technicalFocusId"] as const) {
      const focus = relation(
        "training_sessions",
        entity,
        field,
        "focus_definitions",
        true,
      );
      if (
        focus &&
        seasonFor("focus_definitions", focus) !==
          seasonFor("training_days", day)
      ) {
        issues.push({
          code: "CROSS_SEASON_REFERENCE",
          message: `${field} gehört nicht zur Session-Saison.`,
          collection: "training_sessions",
          entityId: entity.id as string,
          path: field,
        });
      }
    }
    if (
      template &&
      seasonFor("training_schedule_templates", template) !==
        seasonFor("training_days", day)
    ) {
      issues.push({
        code: "CROSS_SEASON_REFERENCE",
        message: "scheduleTemplateId gehört nicht zur Session-Saison.",
        collection: "training_sessions",
        entityId: entity.id as string,
        path: "scheduleTemplateId",
      });
    }
  }
  for (const entity of rows.get("session_equipment")?.values() ?? []) {
    if (entity.deletedAt) continue;
    const session = relation(
      "session_equipment",
      entity,
      "sessionId",
      "training_sessions",
    );
    const equipment = relation(
      "session_equipment",
      entity,
      "equipmentId",
      "equipment_items",
    );
    if (
      session &&
      equipment &&
      seasonFor("training_sessions", session) !==
        seasonFor("equipment_items", equipment)
    ) {
      issues.push({
        code: "CROSS_SEASON_REFERENCE",
        message: "Equipment gehört nicht zur Session-Saison.",
        collection: "session_equipment",
        entityId: entity.id as string,
        path: "equipmentId",
      });
    }
  }
  for (const entity of rows.get("training_schedule_templates")?.values() ??
    []) {
    if (entity.deletedAt) continue;
    if (entity.startTime! >= entity.endTime!) {
      issues.push({
        code: "INVALID_TIME_RANGE",
        message: "Endzeit muss nach der Startzeit liegen.",
        collection: "training_schedule_templates",
        entityId: entity.id as string,
        path: "endTime",
      });
    }
    if (
      entity.validFrom &&
      entity.validUntil &&
      entity.validFrom > entity.validUntil
    ) {
      issues.push({
        code: "INVALID_DATE_RANGE",
        message: "Gültig-ab liegt nach Gültig-bis.",
        collection: "training_schedule_templates",
        entityId: entity.id as string,
        path: "validUntil",
      });
    }
  }
}
