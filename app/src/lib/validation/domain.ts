import { z } from "zod";

import type { EventPriority, SeasonStatus } from "../domain/types";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

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
    description: z.string().trim().min(1, "Beschreibung ist erforderlich."),
    mainGoal: z.string().trim().min(1, "Hauptziel ist erforderlich."),
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
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const calendarConstraintInputSchema = datedEntitySchema
  .extend({
    type: z.string().trim().min(1, "Typ ist erforderlich."),
    notes: z.string().trim(),
    severity: z.string().trim().min(1, "Auswirkung ist erforderlich."),
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
    goal: z.string().trim().min(1, "Ziel ist erforderlich."),
    targetEventId: z.string().trim().optional(),
    notes: z.string().trim().min(1, "Notiz ist erforderlich."),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MacrocycleInput = z.infer<typeof macrocycleInputSchema>;

export const mesocycleInputSchema = datedEntitySchema
  .extend({
    macrocycleId: z.string().trim().min(1, "Makrozyklus ist erforderlich."),
    goal: z.string().trim().min(1, "Ziel ist erforderlich."),
    notes: z.string().trim().min(1, "Notiz ist erforderlich."),
  })
  .refine(({ startDate, endDate }) => startDate <= endDate, {
    message: "Das Startdatum muss vor oder am Enddatum liegen.",
    path: ["endDate"],
  });

export type MesocycleInput = z.infer<typeof mesocycleInputSchema>;

export const microcycleInputSchema = datedEntitySchema
  .extend({
    mesocycleId: z.string().trim().min(1, "Mesozyklus ist erforderlich."),
    goal: z.string().trim().min(1, "Ziel ist erforderlich."),
    targetRpe: z
      .number()
      .int("Target RPE muss eine ganze Zahl sein.")
      .min(1, "Target RPE muss zwischen 1 und 10 liegen.")
      .max(10, "Target RPE muss zwischen 1 und 10 liegen."),
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

const codeSchema = z
  .string()
  .trim()
  .min(1, "Code ist erforderlich.")
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Code darf nur Großbuchstaben, Zahlen und Unterstriche enthalten.",
  );

export const periodizationDimensionInputSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  code: codeSchema,
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
  code: codeSchema,
  description: z.string().trim(),
  active: z.boolean(),
});

export type FocusDefinitionInput = z.infer<typeof focusDefinitionInputSchema>;

export const focusSegmentInputSchema = z
  .object({
    dimensionId: z.string().trim().min(1, "Dimension ist erforderlich."),
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

export const trainingSessionInputSchema = z.object({
  trainingDayId: z.string().min(1),
  title: z.string().trim(),
  startTime: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .or(z.literal("")),
  durationMinutes: z.number().int().positive().optional(),
  volumeMeters: z.number().min(0).optional(),
  expectedRpe: z.number().int().min(1).max(10).optional(),
  mainFocusId: z.string(),
  technicalFocusId: z.string(),
  keySession: z.boolean(),
  athleteNote: z.string().trim(),
  equipment: z.string().trim(),
});
export type TrainingSessionInput = z.infer<typeof trainingSessionInputSchema>;

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
