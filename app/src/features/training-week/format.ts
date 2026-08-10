import type { FocusDefinition } from "../../lib/domain/types";

export function sevenDays(value: string): string[] {
  const start = new Date(`${value}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

export function isoWeek(value: string): number {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7);
}

export function weekdayName(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function volume(value?: number): string {
  return value === undefined
    ? "–"
    : `${new Intl.NumberFormat("de-DE").format(value)} m`;
}

export function focus(items: FocusDefinition[], id?: string): string {
  return items.find((item) => item.id === id)?.name ?? "–";
}

export function opt(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}
