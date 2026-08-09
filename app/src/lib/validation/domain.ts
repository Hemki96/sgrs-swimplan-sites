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
