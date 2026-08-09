import type {
  EquipmentItem,
  FocusDefinition,
  PeriodizationDimension,
  Season,
} from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";

export const DEMO_SEASON_ID = "00000000-0000-4000-8000-000000000001";

const dimensionSeeds = [
  { name: "Strength", code: "STRENGTH" },
  { name: "Aerobic", code: "AEROBIC" },
  { name: "Anaerobic", code: "ANAEROBIC" },
  { name: "Speed", code: "SPEED" },
  { name: "Tactical", code: "TACTICAL" },
  { name: "Technical", code: "TECHNICAL" },
] as const;

const focusSeeds = [
  { dimensionCode: "AEROBIC", name: "Aerobic Base", code: "AEROBIC_BASE" },
  {
    dimensionCode: "AEROBIC",
    name: "Aerobic Capacity",
    code: "AEROBIC_CAPACITY",
  },
  {
    dimensionCode: "AEROBIC",
    name: "Aerobic Power",
    code: "AEROBIC_POWER",
  },
  { dimensionCode: "AEROBIC", name: "Recovery", code: "RECOVERY" },
  {
    dimensionCode: "ANAEROBIC",
    name: "Anaerobic Capacity",
    code: "ANAEROBIC_CAPACITY",
  },
  {
    dimensionCode: "ANAEROBIC",
    name: "Anaerobic Power",
    code: "ANAEROBIC_POWER",
  },
  {
    dimensionCode: "ANAEROBIC",
    name: "Lactate Production",
    code: "LACTATE_PRODUCTION",
  },
  {
    dimensionCode: "ANAEROBIC",
    name: "Lactate Tolerance",
    code: "LACTATE_TOLERANCE",
  },
  { dimensionCode: "SPEED", name: "Race Pace", code: "RACE_PACE" },
  { dimensionCode: "SPEED", name: "Sprint", code: "SPRINT" },
  { dimensionCode: "TECHNICAL", name: "Starts", code: "STARTS" },
  { dimensionCode: "TECHNICAL", name: "Turns", code: "TURNS" },
  { dimensionCode: "TECHNICAL", name: "Underwater", code: "UNDERWATER" },
  {
    dimensionCode: "TECHNICAL",
    name: "Stroke Efficiency",
    code: "STROKE_EFFICIENCY",
  },
] as const;

const equipmentSeeds = [
  { name: "Wettkampfanzug", code: "WETTKAMPFANZUG" },
  { name: "Kurzflossen", code: "KURZFLOSSEN" },
  { name: "Paddles", code: "PADDLES" },
  { name: "Schnorchel", code: "SCHNORCHEL" },
  { name: "Pullkick", code: "PULLKICK" },
  { name: "Brett", code: "BRETT" },
  { name: "Fallschirm", code: "FALLSCHIRM" },
  { name: "Pulssensor", code: "PULSSENSOR" },
  { name: "Trinkflasche", code: "TRINKFLASCHE" },
] as const;

export interface SeedDemoSeasonOptions {
  timestamp?: string;
}

export interface SeedDemoSeasonResult {
  season: Season;
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  equipmentItems: EquipmentItem[];
}

export async function seedDemoSeason(
  storage: StorageAdapter,
  options: SeedDemoSeasonOptions = {},
): Promise<SeedDemoSeasonResult> {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const revision = { seasonId: DEMO_SEASON_ID, editorLabel: "demo-seed" };

  const season = await storage.put<Season>("seasons", {
    id: DEMO_SEASON_ID,
    name: "Saison 2026/27",
    startDate: "2026-08-01",
    endDate: "2027-07-31",
    description: "Öffentliche Demo-Saison für die gemeinsame Planung.",
    mainGoal: "Gemeinsame Saisonplanung 2026/27",
    status: "draft",
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const dimensions: PeriodizationDimension[] = [];
  for (const [index, seed] of dimensionSeeds.entries()) {
    dimensions.push(
      await storage.put(
        "periodization_dimensions",
        {
          id: seedId(100 + index),
          seasonId: season.id,
          name: seed.name,
          code: seed.code,
          sortOrder: index,
          active: true,
          version: 0,
        },
        { revision },
      ),
    );
  }

  const dimensionsByCode = new Map(
    dimensions.map((dimension) => [dimension.code, dimension]),
  );
  const focusDefinitions: FocusDefinition[] = [];
  for (const [index, seed] of focusSeeds.entries()) {
    const dimension = dimensionsByCode.get(seed.dimensionCode);
    if (!dimension) {
      throw new Error(`Missing seed dimension ${seed.dimensionCode}`);
    }
    focusDefinitions.push(
      await storage.put(
        "focus_definitions",
        {
          id: seedId(200 + index),
          seasonId: season.id,
          dimensionId: dimension.id,
          name: seed.name,
          code: seed.code,
          active: true,
          version: 0,
        },
        { revision },
      ),
    );
  }

  const equipmentItems: EquipmentItem[] = [];
  for (const [index, seed] of equipmentSeeds.entries()) {
    equipmentItems.push(
      await storage.put(
        "equipment_items",
        {
          id: seedId(300 + index),
          seasonId: season.id,
          name: seed.name,
          code: seed.code,
          active: true,
          sortOrder: index,
          version: 0,
        },
        { revision },
      ),
    );
  }

  return { season, dimensions, focusDefinitions, equipmentItems };
}

function seedId(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
}
