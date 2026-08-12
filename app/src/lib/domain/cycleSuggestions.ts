import type {
  Event,
  ISODate,
  Macrocycle,
  Mesocycle,
  Microcycle,
  Season,
} from "./types";
import { addDays, formatIsoDate, parseIsoDate } from "./isoWeek";

export interface MicrocycleSuggestion {
  name: string;
  proposedStartDate: ISODate;
  proposedEndDate: ISODate;
  reason: string;
}

export interface MesocycleSuggestion {
  proposedStartDate: ISODate;
  proposedEndDate: ISODate;
  name: string;
  boundaryEvent?: Event;
  reason: string;
  microcycles: MicrocycleSuggestion[];
}

export interface MacrocycleSuggestion {
  proposedStartDate: ISODate;
  proposedEndDate: ISODate;
  name: string;
  targetEvent?: Event;
  reason: string;
  mesocycles: MesocycleSuggestion[];
}

export interface CycleSuggestionResult {
  macros: MacrocycleSuggestion[];
  warnings: string[];
  hasPostLastEventGap: boolean;
  postLastEventGapStart?: ISODate;
  postLastEventGapEnd?: ISODate;
}

export interface ExistingCycles {
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
}

const MICROCYCLE_DEFAULT_DAYS = 7;
const MIN_MESOCYCLE_DAYS = 7;
const MIN_MICROCYCLE_DAYS = 3;
const CLOSE_A_EVENTS_THRESHOLD_DAYS = 14;

export function generateCycleSuggestions(
  season: Season,
  events: Event[],
  existingCycles: ExistingCycles = {
    macrocycles: [],
    mesocycles: [],
    microcycles: [],
  },
): CycleSuggestionResult {
  const sortedEvents = [...events].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const aEvents = sortedEvents.filter((event) => event.priority === "A");
  const bEvents = sortedEvents.filter((event) => event.priority === "B");

  const warnings: string[] = [];
  const macros: MacrocycleSuggestion[] = [];

  if (hasOverlappingExistingMacrocycle(existingCycles.macrocycles, season)) {
    warnings.push(
      "Für einen Teil des Saisonzeitraums existiert bereits eine Planung.",
    );
  }

  if (aEvents.length === 0) {
    return {
      macros: [],
      warnings: [
        "Keine A-Wettkämpfe gefunden. Makrozyklen erfordern A-Wettkämpfe.",
      ],
      hasPostLastEventGap: false,
    };
  }

  detectAEventConflicts(aEvents, warnings);

  for (let index = 0; index < aEvents.length; index += 1) {
    const currentAEvent = aEvents[index];
    const previousAEvent = index > 0 ? aEvents[index - 1] : null;

    const macroStart =
      index === 0 ? season.startDate : addDaysIso(previousAEvent!.startDate, 1);
    const macroEnd = currentAEvent.startDate;

    if (macroStart > macroEnd) {
      continue;
    }

    const relevantBEvents = bEvents.filter(
      (event) =>
        event.startDate >= macroStart &&
        event.startDate <= macroEnd &&
        event.startDate !== macroEnd,
    );

    const mesocycles = buildMesocycles(
      macroStart,
      macroEnd,
      relevantBEvents,
      currentAEvent,
      index,
    );

    validateMesocycleLengths(mesocycles, warnings);

    macros.push({
      proposedStartDate: macroStart,
      proposedEndDate: macroEnd,
      name: `Makro ${index + 1} – Vorbereitung auf ${currentAEvent.name}`,
      targetEvent: currentAEvent,
      reason: `Vorbereitung auf A-Wettkampf „${currentAEvent.name}"`,
      mesocycles,
    });
  }

  const lastAEvent = aEvents.at(-1)!;
  const hasPostLastEventGap = lastAEvent.startDate < season.endDate;
  let postLastEventGapStart: ISODate | undefined;
  let postLastEventGapEnd: ISODate | undefined;

  if (hasPostLastEventGap) {
    postLastEventGapStart = addDaysIso(lastAEvent.startDate, 1);
    postLastEventGapEnd = season.endDate;
    warnings.push(
      "Nach dem letzten A-Wettkampf existiert noch ein ungeplanter Saisonzeitraum.",
    );
  }

  return {
    macros,
    warnings,
    hasPostLastEventGap,
    postLastEventGapStart,
    postLastEventGapEnd,
  };
}

function buildMesocycles(
  macroStart: ISODate,
  macroEnd: ISODate,
  boundaryEvents: Event[],
  targetEvent: Event,
  macroIndex: number,
): MesocycleSuggestion[] {
  const mesocycles: MesocycleSuggestion[] = [];
  const sortedBoundaries = [...boundaryEvents].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  let cursor = macroStart;
  let mesoCounter = 0;

  for (const boundaryEvent of sortedBoundaries) {
    if (boundaryEvent.startDate <= cursor) {
      continue;
    }
    if (boundaryEvent.startDate > macroEnd) {
      break;
    }

    mesoCounter += 1;
    const mesoEnd = addDaysIso(boundaryEvent.startDate, -1);

    if (cursor <= mesoEnd) {
      const microcycles = buildMicrocycles(
        cursor,
        mesoEnd,
        macroIndex,
        mesoCounter,
      );
      mesocycles.push({
        proposedStartDate: cursor,
        proposedEndDate: mesoEnd,
        name: `Meso ${macroIndex + 1}.${mesoCounter}`,
        boundaryEvent,
        reason: `Vorbereitung bis B-Wettkampf „${boundaryEvent.name}"`,
        microcycles,
      });
    }

    cursor = boundaryEvent.startDate;
  }

  mesoCounter += 1;
  if (cursor <= macroEnd) {
    const microcycles = buildMicrocycles(
      cursor,
      macroEnd,
      macroIndex,
      mesoCounter,
    );
    mesocycles.push({
      proposedStartDate: cursor,
      proposedEndDate: macroEnd,
      name: `Meso ${macroIndex + 1}.${mesoCounter}`,
      reason: `Vorbereitung bis A-Wettkampf „${targetEvent.name}"`,
      microcycles,
    });
  }

  return mesocycles;
}

function buildMicrocycles(
  mesoStart: ISODate,
  mesoEnd: ISODate,
  macroIndex: number,
  mesoCounter: number,
): MicrocycleSuggestion[] {
  const microcycles: MicrocycleSuggestion[] = [];
  let cursor = parseIsoDate(mesoStart);
  const end = parseIsoDate(mesoEnd);
  let microCounter = 0;

  while (cursor <= end) {
    microCounter += 1;
    const proposedEnd = addDays(cursor, MICROCYCLE_DEFAULT_DAYS - 1);
    const actualEnd = proposedEnd <= end ? proposedEnd : end;

    microcycles.push({
      name: `Micro ${macroIndex + 1}.${mesoCounter}.${microCounter}`,
      proposedStartDate: formatIsoDate(cursor),
      proposedEndDate: formatIsoDate(actualEnd),
      reason: `Kalenderwochenteil ${microCounter}`,
    });

    cursor = addDays(actualEnd, 1);
  }

  return microcycles;
}

function detectAEventConflicts(aEvents: Event[], warnings: string[]): void {
  for (let index = 0; index < aEvents.length; index += 1) {
    const current = aEvents[index];

    for (let other = index + 1; other < aEvents.length; other += 1) {
      const next = aEvents[other];
      if (current.startDate === next.startDate) {
        warnings.push(
          `A-Wettkämpfe „${current.name}" und „${next.name}" liegen am selben Tag (${current.startDate}).`,
        );
        continue;
      }

      const distance = daysBetween(current.startDate, next.startDate);
      if (distance < CLOSE_A_EVENTS_THRESHOLD_DAYS) {
        warnings.push(
          `Die beiden A-Wettkämpfe „${current.name}" und „${next.name}" liegen sehr nah beieinander (Abstand ${distance} Tage). Ein eigener Makrozyklus ist möglicherweise nicht sinnvoll.`,
        );
      }
    }
  }
}

function validateMesocycleLengths(
  mesocycles: MesocycleSuggestion[],
  warnings: string[],
): void {
  for (const mesocycle of mesocycles) {
    const length = daysBetween(
      mesocycle.proposedStartDate,
      mesocycle.proposedEndDate,
    );
    if (length < MIN_MESOCYCLE_DAYS) {
      warnings.push(
        `Mesozyklus „${mesocycle.name}" ist mit ${length} Tagen sehr kurz (Minimum ${MIN_MESOCYCLE_DAYS} Tage).`,
      );
    }
    for (const microcycle of mesocycle.microcycles) {
      const microLength = daysBetween(
        microcycle.proposedStartDate,
        microcycle.proposedEndDate,
      );
      if (microLength < MIN_MICROCYCLE_DAYS) {
        warnings.push(
          `Ein Mikrozyklus in „${mesocycle.name}" ist mit ${microLength} Tagen sehr kurz (Minimum ${MIN_MICROCYCLE_DAYS} Tage).`,
        );
      }
    }
  }
}

function hasOverlappingExistingMacrocycle(
  macrocycles: Macrocycle[],
  season: Season,
): boolean {
  return macrocycles.some(
    (macrocycle) =>
      macrocycle.startDate <= season.endDate &&
      macrocycle.endDate >= season.startDate,
  );
}

function addDaysIso(date: ISODate, days: number): ISODate {
  return formatIsoDate(addDays(parseIsoDate(date), days));
}

function daysBetween(start: ISODate, end: ISODate): number {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / 86_400_000);
}

export interface SuggestionValidationIssue {
  message: string;
  macroId: string;
  mesoId?: string;
  microId?: string;
}

/**
 * Prüft, ob eine bearbeitete Suggestion die Hierarchieregeln einhält:
 * - Meso- und Mikrozyklen liegen innerhalb ihres übergeordneten Zyklus.
 * - Neuer Makro beginnt mit neuem Meso, neuer Meso mit neuem Micro.
 * - Kein Zyklus darf in einen laufenden niedrigeren Zyklus starten.
 * Liefert nur Hinweise, ändert aber nichts („nicht ohne Hinweis zerstören").
 */
export function validateSuggestionHierarchy(
  macros: MacrocycleSuggestion[],
): SuggestionValidationIssue[] {
  const issues: SuggestionValidationIssue[] = [];

  for (const macro of macros) {
    const start = macro.proposedStartDate;
    const end = macro.proposedEndDate;

    if (start > end) {
      issues.push({
        message: `Makrozyklus „${macro.name}" hat ein Enddatum vor dem Startdatum.`,
        macroId: "",
      });
      continue;
    }

    for (const meso of macro.mesocycles) {
      if (meso.proposedStartDate < start || meso.proposedEndDate > end) {
        issues.push({
          message: `Mesozyklus „${meso.name}" liegt außerhalb des Makrozyklus „${macro.name}".`,
          macroId: "",
          mesoId: "",
        });
      }
      for (const micro of meso.microcycles) {
        if (
          micro.proposedStartDate < meso.proposedStartDate ||
          micro.proposedEndDate > meso.proposedEndDate
        ) {
          issues.push({
            message: `Mikrozyklus „${micro.name}" liegt außerhalb seines Mesozyklus „${meso.name}".`,
            macroId: "",
            mesoId: "",
            microId: "",
          });
        }
      }
    }
  }

  return issues;
}
