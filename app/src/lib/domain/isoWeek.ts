import type { ISODate } from "./types";

export const DAY_IN_MILLISECONDS = 86_400_000;

export interface IsoWeek {
  monday: Date;
  sunday: Date;
  startDate: ISODate;
  endDate: ISODate;
  isoWeek: number;
  isoWeekYear: number;
}

export function parseIsoDate(value: ISODate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Ungültiges ISO-Datum: ${value}`);
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (formatIsoDate(date) !== value) {
    throw new RangeError(`Ungültiges ISO-Datum: ${value}`);
  }
  return date;
}

export function formatIsoDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS);
}

export function mondayOf(date: Date): Date {
  return addDays(date, -((date.getUTCDay() + 6) % 7));
}

export function sundayOf(date: Date): Date {
  return addDays(mondayOf(date), 6);
}

export function getIsoWeek(date: Date): { week: number; year: number } {
  const thursday = addDays(date, 3 - ((date.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekThursday = addDays(
    firstThursday,
    3 - ((firstThursday.getUTCDay() + 6) % 7),
  );
  return {
    week:
      1 +
      Math.round(
        (thursday.getTime() - firstWeekThursday.getTime()) /
          (7 * DAY_IN_MILLISECONDS),
      ),
    year,
  };
}

export function buildWeeks(startDate: ISODate, endDate: ISODate): IsoWeek[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (start > end) {
    throw new RangeError(
      "Das Saisonende darf nicht vor dem Saisonstart liegen.",
    );
  }
  const firstMonday = mondayOf(start);
  const weeks: IsoWeek[] = [];
  for (let monday = firstMonday; monday <= end; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    const { week, year } = getIsoWeek(monday);
    weeks.push({
      monday,
      sunday,
      startDate: formatIsoDate(monday < start ? start : monday),
      endDate: formatIsoDate(sunday > end ? end : sunday),
      isoWeek: week,
      isoWeekYear: year,
    });
  }
  return weeks;
}

export function overlaps(
  startDate: ISODate,
  endDate: ISODate,
  week: IsoWeek,
): boolean {
  return startDate <= week.endDate && endDate >= week.startDate;
}
