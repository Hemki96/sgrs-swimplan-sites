import type {
  CalendarConstraint,
  EquipmentItem,
  Event,
  EventTrack,
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  MicrocycleSegment,
  PeriodizationDimension,
  Season,
  SessionEquipment,
  TrainingDay,
  TrainingScheduleTemplate,
  TrainingSession,
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
  {
    dimensionCode: "STRENGTH",
    name: "Functional Strength",
    code: "FUNCTIONAL_STRENGTH",
  },
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
  {
    dimensionCode: "TACTICAL",
    name: "Race Strategy",
    code: "RACE_STRATEGY",
  },
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
  seasonId?: string;
  idNamespace?: string;
}

export interface SeedDemoSeasonResult {
  season: Season;
  eventTracks: EventTrack[];
  events: Event[];
  calendarConstraints: CalendarConstraint[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  microcycleSegments: MicrocycleSegment[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
  trainingDays: TrainingDay[];
  trainingSessions: TrainingSession[];
  trainingScheduleTemplates: TrainingScheduleTemplate[];
  equipmentItems: EquipmentItem[];
  sessionEquipment: SessionEquipment[];
}

export async function seedDemoSeason(
  storage: StorageAdapter,
  options: SeedDemoSeasonOptions = {},
): Promise<SeedDemoSeasonResult> {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const seasonId = options.seasonId ?? DEMO_SEASON_ID;
  const idNamespace = options.idNamespace ?? "00000000";
  const makeSeedId = (value: number): string => seedId(value, idNamespace);
  const revision = { seasonId, editorLabel: "demo-seed" };

  const season = await storage.put<Season>("seasons", {
    id: seasonId,
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
          id: makeSeedId(100 + index),
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
          id: makeSeedId(200 + index),
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
          id: makeSeedId(300 + index),
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

  const put = async <T extends { id: string; version: number }>(
    collection: Parameters<StorageAdapter["put"]>[0],
    entity: T,
  ) => storage.put<T>(collection, entity, { revision });

  const eventTracks = await Promise.all([
    put<EventTrack>("event_tracks", {
      id: makeSeedId(400),
      seasonId: season.id,
      name: "Hauptwettkämpfe",
      sortOrder: 0,
      visible: true,
      version: 0,
    }),
    put<EventTrack>("event_tracks", {
      id: makeSeedId(401),
      seasonId: season.id,
      name: "Testwettkämpfe",
      sortOrder: 1,
      visible: true,
      version: 0,
    }),
  ]);
  const events = await Promise.all([
    put<Event>("events", {
      id: makeSeedId(410),
      seasonId: season.id,
      trackId: eventTracks[1].id,
      name: "Herbst-Test",
      startDate: "2026-10-24",
      endDate: "2026-10-25",
      priority: "test",
      category: "Kurzbahn",
      location: "Region",
      goal: "Form und Abläufe überprüfen",
      notes: "Erster Standorttest",
      version: 0,
    }),
    put<Event>("events", {
      id: makeSeedId(411),
      seasonId: season.id,
      trackId: eventTracks[0].id,
      name: "Winter-Meisterschaft",
      startDate: "2026-12-12",
      endDate: "2026-12-13",
      priority: "B",
      category: "Kurzbahn",
      location: "NRW",
      goal: "Zwischenhöhepunkt",
      notes: "Staffeln mitplanen",
      version: 0,
    }),
    put<Event>("events", {
      id: makeSeedId(412),
      seasonId: season.id,
      trackId: eventTracks[0].id,
      name: "Sommer-Meisterschaft",
      startDate: "2027-07-10",
      endDate: "2027-07-11",
      priority: "A",
      category: "Langbahn",
      location: "NRW",
      goal: "Saisonhöhepunkt",
      notes: "Hauptziel der Demo-Saison",
      version: 0,
    }),
  ]);
  const calendarConstraints = await Promise.all([
    put<CalendarConstraint>("calendar_constraints", {
      id: makeSeedId(420),
      seasonId: season.id,
      type: "Ferien",
      name: "Herbstferien",
      startDate: "2026-10-17",
      endDate: "2026-10-31",
      notes: "Reduzierte Wasserzeiten",
      severity: "Hinweis",
      version: 0,
    }),
    put<CalendarConstraint>("calendar_constraints", {
      id: makeSeedId(421),
      seasonId: season.id,
      type: "Badschließung",
      name: "Weihnachtspause",
      startDate: "2026-12-24",
      endDate: "2027-01-01",
      notes: "Alternativprogramm an Land",
      severity: "Hoch",
      version: 0,
    }),
  ]);

  const macrocycles = await Promise.all([
    put<Macrocycle>("macrocycles", {
      id: makeSeedId(500),
      seasonId: season.id,
      name: "Grundlagenaufbau",
      startDate: "2026-08-03",
      endDate: "2026-09-13",
      goal: "Belastbarkeit und aerobe Basis entwickeln",
      notes: "Progressiver Sechs-Wochen-Block",
      version: 0,
    }),
    put<Macrocycle>("macrocycles", {
      id: makeSeedId(501),
      seasonId: season.id,
      name: "Spezifischer Aufbau",
      startDate: "2026-09-14",
      endDate: "2026-10-25",
      goal: "Wettkampfspezifische Leistung entwickeln",
      targetEventId: events[0].id,
      notes: "Abschluss mit Herbst-Test",
      version: 0,
    }),
  ]);
  const mesoSeeds = [
    [
      500,
      0,
      "Basis",
      "2026-08-03",
      "2026-08-23",
      "Technik und Grundlagenausdauer",
    ],
    [501, 0, "Kapazität", "2026-08-24", "2026-09-13", "Umfang stabil steigern"],
    [
      502,
      1,
      "Spezifische Leistung",
      "2026-09-14",
      "2026-10-04",
      "Renntempo vorbereiten",
    ],
    [
      503,
      1,
      "Wettkampfvorbereitung",
      "2026-10-05",
      "2026-10-25",
      "Qualität zuspitzen und entlasten",
    ],
  ] as const;
  const mesocycles: Mesocycle[] = [];
  for (const [id, macroIndex, name, startDate, endDate, goal] of mesoSeeds) {
    mesocycles.push(
      await put<Mesocycle>("mesocycles", {
        id: makeSeedId(id),
        macrocycleId: macrocycles[macroIndex].id,
        name,
        startDate,
        endDate,
        goal,
        notes: "Drei aufeinander abgestimmte Wochen",
        version: 0,
      }),
    );
  }
  const rpeValues = [4, 5, 6, 5, 6, 7, 6, 7, 8, 7, 6, 4];
  const volumeValues = [
    18000, 20000, 22000, 19500, 22000, 24000, 21500, 23500, 25500, 23000, 20500,
    15000,
  ];
  const microcycles: Microcycle[] = [];
  const microcycleSegments: MicrocycleSegment[] = [];
  for (let index = 0; index < 12; index += 1) {
    const start = new Date(Date.UTC(2026, 7, 3 + index * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const microcycle = await put<Microcycle>("microcycles", {
      id: makeSeedId(600 + index),
      mesocycleId: mesocycles[Math.floor(index / 3)].id,
      name: `KW ${32 + index}`,
      startDate: isoDate(start),
      endDate: isoDate(end),
      targetRpe: rpeValues[index],
      targetVolumeMeters: volumeValues[index],
      goal:
        index === 11
          ? "Entlasten und Wettkampfroutinen festigen"
          : "Belastung kontrolliert entwickeln",
      version: 0,
    });
    microcycles.push(microcycle);
    microcycleSegments.push(
      await put<MicrocycleSegment>("microcycle_segments", {
        id: makeSeedId(700 + index),
        microcycleId: microcycle.id,
        name: index === 11 ? "Taper" : index % 3 === 2 ? "Belastung" : "Aufbau",
        startDate: microcycle.startDate,
        endDate: microcycle.endDate,
        segmentType: index === 11 ? "Entlastung" : "Training",
        sortOrder: 0,
        version: 0,
      }),
    );
  }

  const focusByCode = new Map(
    focusDefinitions.map((focus) => [focus.code, focus]),
  );
  const focusCodes = [
    "FUNCTIONAL_STRENGTH",
    "AEROBIC_BASE",
    "ANAEROBIC_CAPACITY",
    "RACE_PACE",
    "RACE_STRATEGY",
    "TURNS",
  ];
  const focusSegments: FocusSegment[] = [];
  for (const [index, code] of focusCodes.entries()) {
    const focus = focusByCode.get(code)!;
    focusSegments.push(
      await put<FocusSegment>("focus_segments", {
        id: makeSeedId(800 + index),
        seasonId: season.id,
        dimensionId: focus.dimensionId,
        focusDefinitionId: focus.id,
        startDate: index % 2 === 0 ? "2026-08-10" : "2026-08-24",
        endDate: index < 2 ? "2026-09-13" : "2026-10-18",
        notes: "Paralleler Schwerpunkt der Demo-Planung",
        version: 0,
      }),
    );
  }

  const daySeeds = [
    [900, "2026-08-10", "Wochenauftakt", "Technik vor Umfang"],
    [901, "2026-08-12", "Belastungstag", "Zentrale Ausdauereinheit"],
    [902, "2026-08-14", "Qualitätstag", "Kurze schnelle Reize"],
    [903, "2026-08-15", "Wochenabschluss", "Locker und sauber abschließen"],
  ] as const;
  const trainingDays: TrainingDay[] = [];
  for (const [id, date, dayContext, notes] of daySeeds) {
    trainingDays.push(
      await put<TrainingDay>("training_days", {
        id: makeSeedId(id),
        seasonId: season.id,
        date,
        dayContext,
        notes,
        version: 0,
      }),
    );
  }
  const sessionSeeds = [
    [
      920,
      0,
      "Frühtraining Technik",
      "06:15",
      75,
      4200,
      4,
      "STROKE_EFFICIENCY",
      "TURNS",
      false,
      "Schnorchel, Brett",
    ],
    [
      921,
      0,
      "Athletik",
      "17:30",
      45,
      0,
      5,
      "AEROBIC_BASE",
      "STARTS",
      false,
      "Trinkflasche",
    ],
    [
      922,
      1,
      "Aerobe Hauptbelastung",
      "17:00",
      105,
      6200,
      7,
      "AEROBIC_CAPACITY",
      "STROKE_EFFICIENCY",
      true,
      "Paddles, Pullkick, Pulssensor",
    ],
    [
      923,
      2,
      "Sprint & Starts",
      "16:30",
      90,
      4800,
      8,
      "SPRINT",
      "STARTS",
      true,
      "Kurzflossen, Fallschirm",
    ],
    [
      924,
      3,
      "Regeneration",
      "09:00",
      60,
      3000,
      3,
      "RECOVERY",
      "UNDERWATER",
      false,
      "Brett, Schnorchel",
    ],
  ] as const;
  const trainingSessions: TrainingSession[] = [];
  for (const [
    id,
    dayIndex,
    title,
    startTime,
    durationMinutes,
    volumeMeters,
    expectedRpe,
    mainCode,
    technicalCode,
    keySession,
    equipment,
  ] of sessionSeeds) {
    trainingSessions.push(
      await put<TrainingSession>("training_sessions", {
        id: makeSeedId(id),
        trainingDayId: trainingDays[dayIndex].id,
        title,
        startTime,
        durationMinutes,
        volumeMeters,
        expectedRpe,
        mainFocusId: focusByCode.get(mainCode)?.id,
        technicalFocusId: focusByCode.get(technicalCode)?.id,
        keySession,
        athleteNote: "Beispielhinweis für die gemeinsame Planung",
        equipment,
        version: 0,
      }),
    );
  }
  const equipmentByCode = new Map(
    equipmentItems.map((item) => [item.code, item]),
  );
  const sessionEquipment = await Promise.all([
    put<SessionEquipment>("session_equipment", {
      id: makeSeedId(950),
      sessionId: trainingSessions[2].id,
      equipmentId: equipmentByCode.get("PADDLES")!.id,
      requirementLevel: "required",
      version: 0,
    }),
    put<SessionEquipment>("session_equipment", {
      id: makeSeedId(951),
      sessionId: trainingSessions[2].id,
      equipmentId: equipmentByCode.get("PULSSENSOR")!.id,
      requirementLevel: "recommended",
      version: 0,
    }),
    put<SessionEquipment>("session_equipment", {
      id: makeSeedId(952),
      sessionId: trainingSessions[3].id,
      equipmentId: equipmentByCode.get("KURZFLOSSEN")!.id,
      requirementLevel: "required",
      version: 0,
    }),
  ]);

  const trainingScheduleTemplates = await Promise.all([
    put<TrainingScheduleTemplate>("training_schedule_templates", {
      id: makeSeedId(1000),
      seasonId: season.id,
      name: "Abendtraining",
      weekday: "Monday",
      startTime: "18:00",
      endTime: "20:00",
      location: "Oktopus Siegburg",
      active: true,
      validFrom: null,
      validUntil: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 0,
    }),
    put<TrainingScheduleTemplate>("training_schedule_templates", {
      id: makeSeedId(1001),
      seasonId: season.id,
      name: "Abendtraining",
      weekday: "Wednesday",
      startTime: "19:00",
      endTime: "20:45",
      location: "Oktopus Siegburg",
      active: true,
      validFrom: null,
      validUntil: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 0,
    }),
  ]);

  return {
    season,
    eventTracks,
    events,
    calendarConstraints,
    macrocycles,
    mesocycles,
    microcycles,
    microcycleSegments,
    dimensions,
    focusDefinitions,
    focusSegments,
    trainingDays,
    trainingSessions,
    trainingScheduleTemplates,
    equipmentItems,
    sessionEquipment,
  };
}

function seedId(value: number, namespace: string): string {
  return `${namespace.slice(0, 8).padEnd(8, "0")}-0000-4000-8000-${value.toString().padStart(12, "0")}`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
