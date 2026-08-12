import { z } from "zod";

import type { EventPriority, SeasonStatus, Weekday } from "../domain/types";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const localTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizeSeasonName(name: string): string {
  return name.trim().normalize("NFKC").toLowerCase();
}

export const seasonStatuses = [
  "draft",
  "active",
  "completed",
  "archived",
] as const satisfies readonly SeasonStatus[];

export const seasonInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich."),
    startDate: z.string().regex(isoDate, "Startdatum ist erforderlich."),
    endDate: z.string().regex(isoDate, "Enddatum ist erforderlich."),
    description: z.string().trim(),
    mainGoal: z.string().trim(),
    status: z.enum(seasonStatuses),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type SeasonInput = z.infer<typeof seasonInputSchema>;

export const eventPriorities = [
  "A",
  "B",
  "C",
  "test",
] as const satisfies readonly EventPriority[];

export const eventTrackInputSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  sortOrder: z.number().int().min(0, "Sortierung muss mindestens 0 sein."),
  visible: z.boolean(),
});

export type EventTrackInput = z.infer<typeof eventTrackInputSchema>;

const datedEntitySchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  startDate: z.string().regex(isoDate, "Startdatum ist erforderlich."),
  endDate: z.string().regex(isoDate, "Enddatum ist erforderlich."),
});

export const eventInputSchema = datedEntitySchema
  .extend({
    trackId: z.string().min(1, "Eventspur ist erforderlich."),
    priority: z.enum(eventPriorities),
    category: z.string().trim(),
    location: z.string().trim(),
    goal: z.string().trim(),
    notes: z.string().trim(),
    endDate: z.string().regex(isoDate).or(z.literal("")),
  })
  .refine(({ startDate, endDate }) => !endDate || startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const calendarConstraintInputSchema = datedEntitySchema
  .extend({
    type: z.string().trim().min(1, "Typ ist erforderlich."),
    notes: z.string().trim(),
    severity: z.string().trim(),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type CalendarConstraintInput = z.infer<
  typeof calendarConstraintInputSchema
>;

export const macrocycleInputSchema = datedEntitySchema
  .extend({
    goal: z.string().trim(),
    targetEventId: z.string().trim().optional(),
    notes: z.string().trim(),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MacrocycleInput = z.infer<typeof macrocycleInputSchema>;

export const mesocycleInputSchema = datedEntitySchema
  .extend({
    macrocycleId: z.string().trim().min(1, "Makrozyklus ist erforderlich."),
    goal: z.string().trim(),
    notes: z.string().trim(),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MesocycleInput = z.infer<typeof mesocycleInputSchema>;

export const microcycleInputSchema = datedEntitySchema
  .extend({
    mesocycleId: z.string().trim().min(1, "Mesozyklus ist erforderlich."),
    goal: z.string().trim(),
    targetRpe: z
      .number()
      .int("Target RPE muss eine ganze Zahl sein.")
      .min(1, "Target RPE muss zwischen 1 und 10 liegen.")
      .max(10, "Target RPE muss zwischen 1 und 10 liegen.")
      .optional(),
    targetVolumeMeters: z
      .number()
      .min(0, "Zielumfang muss mindestens 0 Meter sein.")
      .optional(),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MicrocycleInput = z.infer<typeof microcycleInputSchema>;

export const microcycleSegmentInputSchema = datedEntitySchema
  .extend({
    microcycleId: z.string().trim().min(1, "Mikrozyklus ist erforderlich."),
    segmentType: z.string().trim().min(1, "Typ ist erforderlich."),
    sortOrder: z
      .number()
      .int("Reihenfolge muss eine ganze Zahl sein.")
      .min(0, "Reihenfolge muss mindestens 0 sein."),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MicrocycleSegmentInput = z.infer<
  typeof microcycleSegmentInputSchema
>;

const codeOrEmptySchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Code darf nur Großbuchstaben, Zahlen und Unterstriche enthalten.",
  )
  .or(z.literal(""));

export const periodizationDimensionInputSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  code: codeOrEmptySchema,
  description: z.string().trim(),
  sortOrder: z
    .number()
    .int("Reihenfolge muss eine ganze Zahl sein.")
    .min(0, "Reihenfolge muss mindestens 0 sein."),
  active: z.boolean(),
});

export type PeriodizationDimensionInput = z.infer<
  typeof periodizationDimensionInputSchema
>;

export const focusDefinitionInputSchema = z.object({
  dimensionId: z.string().trim().min(1, "Dimension ist erforderlich."),
  name: z.string().trim().min(1, "Fokus ist erforderlich."),
  code: codeOrEmptySchema,
  description: z.string().trim(),
  active: z.boolean(),
});

export type FocusDefinitionInput = z.infer<typeof focusDefinitionInputSchema>;

export const focusSegmentInputSchema = z
  .object({
    dimensionId: z.string().trim().or(z.literal("")),
    focusDefinitionId: z.string().trim().min(1, "Fokus ist erforderlich."),
    startDate: z.string().regex(isoDate, "Startdatum ist erforderlich."),
    endDate: z.string().regex(isoDate, "Enddatum ist erforderlich."),
    notes: z.string().trim(),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type FocusSegmentInput = z.infer<typeof focusSegmentInputSchema>;

export const trainingDayInputSchema = z.object({
  date: z.string().regex(isoDate, "Datum ist erforderlich."),
  dayContext: z.string().trim(),
  notes: z.string().trim(),
});

export type TrainingDayInput = z.infer<typeof trainingDayInputSchema>;

export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const satisfies readonly Weekday[];

export const trainingScheduleTemplateInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich."),
    weekday: z.enum(weekdays, { message: "Wochentag ist erforderlich." }),
    startTime: z.string().regex(localTime, "Startzeit ist erforderlich."),
    endTime: z.string().regex(localTime, "Endzeit ist erforderlich."),
    location: z.string().trim(),
    active: z.boolean(),
    validFrom: z
      .string()
      .regex(isoDate, "Gültig-ab-Datum ist ungültig.")
      .nullish(),
    validUntil: z
      .string()
      .regex(isoDate, "Gültig-bis-Datum ist ungültig.")
      .nullish(),
  })
  .refine(({ startTime, endTime }) => startTime < endTime, {
    message: "Die Endzeit muss nach der Startzeit liegen.",
    path: ["endTime"],
  })
  .refine(
    ({ validFrom, validUntil }) =>
      !validFrom || !validUntil || validFrom <= validUntil,
    {
      message: "Gültig-ab muss vor oder am Gültig-bis-Datum liegen.",
      path: ["validUntil"],
    },
  );

export type TrainingScheduleTemplateInput = z.infer<
  typeof trainingScheduleTemplateInputSchema
>;

export const trainingSessionInputSchema = z.object({
  trainingDayId: z.string().min(1),
  title: z.string().trim(),
  startTime: z.string().regex(localTime).or(z.literal("")),
  durationMinutes: z.number().int().positive().optional(),
  volumeMeters: z.number().min(0).optional(),
  expectedRpe: z.number().int().min(1).max(10).optional(),
  mainFocusId: z.string(),
  technicalFocusId: z.string(),
  keySession: z.boolean(),
  athleteNote: z.string().trim(),
  equipment: z.string().trim(),
  status: z.enum(["planned", "cancelled"]).optional(),
});
export type TrainingSessionInput = z.infer<typeof trainingSessionInputSchema>;

export const equipmentItemInputSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  code: codeOrEmptySchema,
  active: z.boolean(),
  sortOrder: z.number().int().min(0, "Reihenfolge muss mindestens 0 sein."),
});
export type EquipmentItemInput = z.infer<typeof equipmentItemInputSchema>;

export function assertRpe(v: number | undefined) {
  if (v === undefined) return;
  if (!Number.isInteger(v) || v < 1 || v > 10)
    throw new Error("RPE must be 1..10");
}
export function assertDateRange(s: string, e: string) {
  if (s > e) throw new Error("invalid range");
}
export function assertNestedRange(
  ps: string,
  pe: string,
  cs: string,
  ce: string,
) {
  assertDateRange(cs, ce);
  if (cs < ps || ce > pe) throw new Error("child outside parent");
}
