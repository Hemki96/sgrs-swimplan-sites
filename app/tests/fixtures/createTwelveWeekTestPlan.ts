import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import type {
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  PeriodizationDimension,
  Season,
} from "../../src/lib/domain/types";
import type { StorageAdapter } from "../../src/lib/storage/StorageAdapter";

const dimensionFocuses: Record<string, { name: string; code: string }> = {
  STRENGTH: { name: "Maximalkraft", code: "MAX_STRENGTH" },
  AEROBIC: { name: "Aerobic Base", code: "AEROBIC_BASE" },
  ANAEROBIC: { name: "Anaerobic Capacity", code: "ANAEROBIC_CAPACITY" },
  SPEED: { name: "Sprint", code: "SPRINT" },
  TACTICAL: { name: "Race Strategy", code: "RACE_STRATEGY" },
  TECHNICAL: { name: "Turns", code: "TURNS" },
};

export interface TwelveWeekTestPlan {
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
}

export async function createTwelveWeekTestPlan(
  storage: StorageAdapter,
  season: Season,
  createId: () => string,
): Promise<TwelveWeekTestPlan> {
  const service = new SeasonPlanningService(storage, { createId });
  await service.initializeStandardPeriodization(season.id);

  const macrocycles = await Promise.all([
    service.createMacrocycle(season.id, {
      name: "Grundlagenaufbau",
      startDate: "2026-08-03",
      endDate: "2026-09-13",
      goal: "Belastbarkeit und Basis entwickeln",
      notes: "Sechs Wochen mit progressiver Belastung",
    }),
    service.createMacrocycle(season.id, {
      name: "Spezifischer Aufbau",
      startDate: "2026-09-14",
      endDate: "2026-10-25",
      goal: "Wettkampfspezifische Leistung entwickeln",
      notes: "Sechs Wochen mit abschließender Entlastung",
    }),
  ]);

  const mesocycleInputs = [
    [macrocycles[0], "Basis", "2026-08-03", "2026-08-23"],
    [macrocycles[0], "Kapazität", "2026-08-24", "2026-09-13"],
    [macrocycles[1], "Spezifische Leistung", "2026-09-14", "2026-10-04"],
    [macrocycles[1], "Wettkampfvorbereitung", "2026-10-05", "2026-10-25"],
  ] as const;
  const mesocycles: Mesocycle[] = [];
  for (const [macrocycle, name, startDate, endDate] of mesocycleInputs) {
    mesocycles.push(
      await service.createMesocycle({
        macrocycleId: macrocycle.id,
        name,
        startDate,
        endDate,
        goal: `${name} gezielt entwickeln`,
        notes: "Drei Wochen",
      }),
    );
  }

  const rpeValues = [4, 5, 6, 5, 6, 7, 6, 7, 8, 7, 8, 4];
  const microcycles: Microcycle[] = [];
  for (let index = 0; index < 12; index += 1) {
    const start = new Date(Date.UTC(2026, 7, 3 + index * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    microcycles.push(
      await service.createMicrocycle({
        mesocycleId: mesocycles[Math.floor(index / 3)].id,
        name: `Testwoche ${index + 1}`,
        startDate: isoDate(start),
        endDate: isoDate(end),
        targetRpe: rpeValues[index],
        targetVolumeMeters: 18_000 + index * 1_000,
        goal:
          index === 11 ? "Entlasten und konsolidieren" : "Belastung entwickeln",
      }),
    );
  }

  const dimensions = await service.listDimensions(season.id);
  const existingDefinitions = await service.listFocusDefinitions(season.id);
  const focusDefinitions: FocusDefinition[] = [];
  for (const dimension of dimensions) {
    const seed = dimensionFocuses[dimension.code];
    let definition = existingDefinitions.find(
      (item) => item.dimensionId === dimension.id && item.code === seed.code,
    );
    definition ??= await service.createFocusDefinition(season.id, {
      dimensionId: dimension.id,
      name: seed.name,
      code: seed.code,
      description: `Testfokus ${dimension.name}`,
      active: true,
    });
    focusDefinitions.push(definition);
  }

  const focusSegments: FocusSegment[] = [];
  for (const [index, dimension] of dimensions.entries()) {
    focusSegments.push(
      await service.createFocusSegment(season.id, {
        dimensionId: dimension.id,
        focusDefinitionId: focusDefinitions[index].id,
        startDate: index % 2 === 0 ? "2026-08-10" : "2026-08-24",
        endDate: index % 2 === 0 ? "2026-09-27" : "2026-10-11",
        notes: `Paralleler Testfokus ${dimension.name}`,
      }),
    );
  }

  return {
    macrocycles,
    mesocycles,
    microcycles,
    dimensions,
    focusDefinitions,
    focusSegments,
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
