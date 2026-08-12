import type {
  CalendarConstraint,
  Event,
  EventTrack,
  EquipmentItem,
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
  Weekday,
} from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import { addDays, buildWeeks, formatIsoDate, type IsoWeek } from "./isoWeek";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  equipmentItemInputSchema,
  focusDefinitionInputSchema,
  focusSegmentInputSchema,
  macrocycleInputSchema,
  mesocycleInputSchema,
  microcycleInputSchema,
  microcycleSegmentInputSchema,
  periodizationDimensionInputSchema,
  trainingDayInputSchema,
  trainingScheduleTemplateInputSchema,
  trainingSessionInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
  type EquipmentItemInput,
  type FocusDefinitionInput,
  type FocusSegmentInput,
  type MacrocycleInput,
  type MesocycleInput,
  type MicrocycleInput,
  type MicrocycleSegmentInput,
  type PeriodizationDimensionInput,
  type TrainingDayInput,
  type TrainingScheduleTemplateInput,
  type TrainingSessionInput,
} from "../validation/domain";

const standardDimensions = [
  "Strength",
  "Aerobic",
  "Anaerobic",
  "Speed",
  "Tactical",
  "Technical",
] as const;

const standardFocuses = {
  Aerobic: ["Aerobic Base", "Aerobic Capacity", "Aerobic Power"],
  Anaerobic: [
    "Anaerobic Capacity",
    "Anaerobic Power",
    "Lactate Production",
    "Lactate Tolerance",
  ],
  Technical: ["Starts", "Turns", "Underwater", "Stroke Efficiency"],
} as const;

export interface SeasonPlanningDependencies {
  createId?: () => string;
  now?: () => string;
}

export class PlanningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningValidationError";
  }
}

export class SeasonPlanningService {
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly periodizationInitializations = new Map<
    string,
    Promise<void>
  >();

  constructor(
    private readonly storage: StorageAdapter,
    dependencies: SeasonPlanningDependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async listTracks(seasonId: string): Promise<EventTrack[]> {
    return (await this.storage.list<EventTrack>("event_tracks"))
      .filter((track) => track.seasonId === seasonId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async createTrack(
    seasonId: string,
    input: EventTrackInput,
  ): Promise<EventTrack> {
    await this.requireSeason(seasonId);
    const values = eventTrackInputSchema.parse(input);
    return this.storage.put(
      "event_tracks",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateTrack(
    track: EventTrack,
    input: EventTrackInput,
  ): Promise<EventTrack> {
    await this.requireSeason(track.seasonId);
    const values = eventTrackInputSchema.parse(input);
    return this.storage.put(
      "event_tracks",
      { ...track, ...values },
      {
        expectedVersion: track.version,
        revision: this.revision(track.seasonId),
      },
    );
  }

  async deleteTrack(track: EventTrack): Promise<void> {
    const events = await this.listEvents(track.seasonId);
    if (events.some((event) => event.trackId === track.id)) {
      throw new PlanningValidationError(
        "Eine Eventspur mit Wettkämpfen kann nicht gelöscht werden.",
      );
    }
    return this.storage.softDelete("event_tracks", track.id, {
      expectedVersion: track.version,
      revision: this.revision(track.seasonId),
    });
  }

  async listEvents(seasonId: string): Promise<Event[]> {
    return (await this.storage.list<Event>("events"))
      .filter((event) => event.seasonId === seasonId)
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createEvent(seasonId: string, input: EventInput): Promise<Event> {
    const season = await this.requireSeason(seasonId);
    const values = eventInputSchema.parse(input);
    const normed = this.normalizeEvent(values);
    await this.requireTrack(seasonId, normed.trackId);
    this.assertWithinSeason(season, normed.startDate, normed.endDate);
    return this.storage.put(
      "events",
      {
        id: this.createId(),
        seasonId,
        ...this.eventValues(normed),
        version: 0,
      },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateEvent(event: Event, input: EventInput): Promise<Event> {
    const season = await this.requireSeason(event.seasonId);
    const values = eventInputSchema.parse(input);
    const normed = this.normalizeEvent(values);
    await this.requireTrack(event.seasonId, normed.trackId);
    this.assertWithinSeason(season, normed.startDate, normed.endDate);
    return this.storage.put(
      "events",
      { ...event, ...this.eventValues(normed) },
      {
        expectedVersion: event.version,
        revision: this.revision(event.seasonId),
      },
    );
  }

  deleteEvent(event: Event): Promise<void> {
    return this.storage.softDelete("events", event.id, {
      expectedVersion: event.version,
      revision: this.revision(event.seasonId),
    });
  }

  async listConstraints(seasonId: string): Promise<CalendarConstraint[]> {
    return (await this.storage.list<CalendarConstraint>("calendar_constraints"))
      .filter((constraint) => constraint.seasonId === seasonId)
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createConstraint(
    seasonId: string,
    input: CalendarConstraintInput,
  ): Promise<CalendarConstraint> {
    const season = await this.requireSeason(seasonId);
    const values = calendarConstraintInputSchema.parse(input);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "calendar_constraints",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateConstraint(
    constraint: CalendarConstraint,
    input: CalendarConstraintInput,
  ): Promise<CalendarConstraint> {
    const season = await this.requireSeason(constraint.seasonId);
    const values = calendarConstraintInputSchema.parse(input);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "calendar_constraints",
      { ...constraint, ...values },
      {
        expectedVersion: constraint.version,
        revision: this.revision(constraint.seasonId),
      },
    );
  }

  deleteConstraint(constraint: CalendarConstraint): Promise<void> {
    return this.storage.softDelete("calendar_constraints", constraint.id, {
      expectedVersion: constraint.version,
      revision: this.revision(constraint.seasonId),
    });
  }

  async listMacrocycles(seasonId: string): Promise<Macrocycle[]> {
    return (await this.storage.list<Macrocycle>("macrocycles"))
      .filter((macrocycle) => macrocycle.seasonId === seasonId)
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createMacrocycle(
    seasonId: string,
    input: MacrocycleInput,
  ): Promise<Macrocycle> {
    const season = await this.requireSeason(seasonId);
    const values = macrocycleInputSchema.parse(input);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    await this.requireTargetEvent(seasonId, values.targetEventId);
    return this.storage.put(
      "macrocycles",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateMacrocycle(
    macrocycle: Macrocycle,
    input: MacrocycleInput,
  ): Promise<Macrocycle> {
    const season = await this.requireSeason(macrocycle.seasonId);
    const values = macrocycleInputSchema.parse(input);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    await this.requireTargetEvent(macrocycle.seasonId, values.targetEventId);
    const mesocycles = await this.storage.list<Mesocycle>("mesocycles");
    this.assertChildrenWithinRange(
      mesocycles.filter((item) => item.macrocycleId === macrocycle.id),
      values.startDate,
      values.endDate,
      "Mesozyklen",
    );
    return this.storage.put(
      "macrocycles",
      {
        ...macrocycle,
        ...values,
        targetEventId: values.targetEventId,
      },
      {
        expectedVersion: macrocycle.version,
        revision: this.revision(macrocycle.seasonId),
      },
    );
  }

  async deleteMacrocycle(macrocycle: Macrocycle): Promise<void> {
    const mesocycles = await this.storage.list<Mesocycle>("mesocycles");
    if (
      mesocycles.some((mesocycle) => mesocycle.macrocycleId === macrocycle.id)
    ) {
      throw new PlanningValidationError(
        "Ein Makrozyklus mit Mesozyklen kann nicht gelöscht werden.",
      );
    }
    return this.storage.softDelete("macrocycles", macrocycle.id, {
      expectedVersion: macrocycle.version,
      revision: this.revision(macrocycle.seasonId),
    });
  }

  async listMesocycles(seasonId: string): Promise<Mesocycle[]> {
    const macrocycleIds = new Set(
      (await this.listMacrocycles(seasonId)).map((macrocycle) => macrocycle.id),
    );
    return (await this.storage.list<Mesocycle>("mesocycles"))
      .filter((mesocycle) => macrocycleIds.has(mesocycle.macrocycleId))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createMesocycle(input: MesocycleInput): Promise<Mesocycle> {
    const values = mesocycleInputSchema.parse(input);
    const macrocycle = await this.requireMacrocycle(values.macrocycleId);
    this.assertWithinMacrocycle(macrocycle, values.startDate, values.endDate);
    return this.storage.put(
      "mesocycles",
      { id: this.createId(), ...values, version: 0 },
      {
        expectedVersion: 0,
        revision: this.revision(macrocycle.seasonId),
      },
    );
  }

  async updateMesocycle(
    mesocycle: Mesocycle,
    input: MesocycleInput,
  ): Promise<Mesocycle> {
    const values = mesocycleInputSchema.parse(input);
    const [currentMacrocycle, targetMacrocycle] = await Promise.all([
      this.requireMacrocycle(mesocycle.macrocycleId),
      this.requireMacrocycle(values.macrocycleId),
    ]);
    if (currentMacrocycle.seasonId !== targetMacrocycle.seasonId) {
      throw new PlanningValidationError(
        "Der Makrozyklus gehört nicht zu derselben Saison.",
      );
    }
    this.assertWithinMacrocycle(
      targetMacrocycle,
      values.startDate,
      values.endDate,
    );
    const microcycles = await this.storage.list<Microcycle>("microcycles");
    this.assertChildrenWithinRange(
      microcycles.filter((item) => item.mesocycleId === mesocycle.id),
      values.startDate,
      values.endDate,
      "Mikrozyklen",
    );
    return this.storage.put(
      "mesocycles",
      { ...mesocycle, ...values },
      {
        expectedVersion: mesocycle.version,
        revision: this.revision(targetMacrocycle.seasonId),
      },
    );
  }

  async deleteMesocycle(mesocycle: Mesocycle): Promise<void> {
    const microcycles = await this.storage.list<Microcycle>("microcycles");
    if (
      microcycles.some((microcycle) => microcycle.mesocycleId === mesocycle.id)
    ) {
      throw new PlanningValidationError(
        "Ein Mesozyklus mit Mikrozyklen kann nicht gelöscht werden.",
      );
    }
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    return this.storage.softDelete("mesocycles", mesocycle.id, {
      expectedVersion: mesocycle.version,
      revision: this.revision(macrocycle.seasonId),
    });
  }

  async listMicrocycles(seasonId: string): Promise<Microcycle[]> {
    const mesocycleIds = new Set(
      (await this.listMesocycles(seasonId)).map((mesocycle) => mesocycle.id),
    );
    return (await this.storage.list<Microcycle>("microcycles"))
      .filter((microcycle) => mesocycleIds.has(microcycle.mesocycleId))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createMicrocycle(input: MicrocycleInput): Promise<Microcycle> {
    const values = microcycleInputSchema.parse(input);
    const mesocycle = await this.requireMesocycle(values.mesocycleId);
    this.assertWithinMesocycle(mesocycle, values.startDate, values.endDate);
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    return this.storage.put(
      "microcycles",
      { id: this.createId(), ...values, version: 0 },
      {
        expectedVersion: 0,
        revision: this.revision(macrocycle.seasonId),
      },
    );
  }

  async updateMicrocycle(
    microcycle: Microcycle,
    input: MicrocycleInput,
  ): Promise<Microcycle> {
    const values = microcycleInputSchema.parse(input);
    const [currentMesocycle, targetMesocycle] = await Promise.all([
      this.requireMesocycle(microcycle.mesocycleId),
      this.requireMesocycle(values.mesocycleId),
    ]);
    const [currentMacrocycle, targetMacrocycle] = await Promise.all([
      this.requireMacrocycle(currentMesocycle.macrocycleId),
      this.requireMacrocycle(targetMesocycle.macrocycleId),
    ]);
    if (currentMacrocycle.seasonId !== targetMacrocycle.seasonId) {
      throw new PlanningValidationError(
        "Der Mesozyklus gehört nicht zu derselben Saison.",
      );
    }
    this.assertWithinMesocycle(
      targetMesocycle,
      values.startDate,
      values.endDate,
    );
    const segments = await this.storage.list<MicrocycleSegment>(
      "microcycle_segments",
    );
    this.assertChildrenWithinRange(
      segments.filter((item) => item.microcycleId === microcycle.id),
      values.startDate,
      values.endDate,
      "Mikrozyklussegmente",
    );
    return this.storage.put(
      "microcycles",
      {
        ...microcycle,
        ...values,
        targetVolumeMeters: values.targetVolumeMeters,
      },
      {
        expectedVersion: microcycle.version,
        revision: this.revision(targetMacrocycle.seasonId),
      },
    );
  }

  async deleteMicrocycle(microcycle: Microcycle): Promise<void> {
    const segments = await this.storage.list<MicrocycleSegment>(
      "microcycle_segments",
    );
    if (segments.some((segment) => segment.microcycleId === microcycle.id)) {
      throw new PlanningValidationError(
        "Ein Mikrozyklus mit Segmenten kann nicht gelöscht werden.",
      );
    }
    const mesocycle = await this.requireMesocycle(microcycle.mesocycleId);
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    return this.storage.softDelete("microcycles", microcycle.id, {
      expectedVersion: microcycle.version,
      revision: this.revision(macrocycle.seasonId),
    });
  }

  async listMicrocycleSegments(seasonId: string): Promise<MicrocycleSegment[]> {
    const microcycleIds = new Set(
      (await this.listMicrocycles(seasonId)).map((microcycle) => microcycle.id),
    );
    return (await this.storage.list<MicrocycleSegment>("microcycle_segments"))
      .filter((segment) => microcycleIds.has(segment.microcycleId))
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.startDate.localeCompare(right.startDate),
      );
  }

  async createMicrocycleSegment(
    input: MicrocycleSegmentInput,
  ): Promise<MicrocycleSegment> {
    const values = microcycleSegmentInputSchema.parse(input);
    const microcycle = await this.requireMicrocycle(values.microcycleId);
    this.assertWithinMicrocycle(microcycle, values.startDate, values.endDate);
    const seasonId = await this.seasonIdForMicrocycle(microcycle);
    return this.storage.put(
      "microcycle_segments",
      { id: this.createId(), ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateMicrocycleSegment(
    segment: MicrocycleSegment,
    input: MicrocycleSegmentInput,
  ): Promise<MicrocycleSegment> {
    const values = microcycleSegmentInputSchema.parse(input);
    const [currentMicrocycle, targetMicrocycle] = await Promise.all([
      this.requireMicrocycle(segment.microcycleId),
      this.requireMicrocycle(values.microcycleId),
    ]);
    const [currentSeasonId, targetSeasonId] = await Promise.all([
      this.seasonIdForMicrocycle(currentMicrocycle),
      this.seasonIdForMicrocycle(targetMicrocycle),
    ]);
    if (currentSeasonId !== targetSeasonId) {
      throw new PlanningValidationError(
        "Der Mikrozyklus gehört nicht zu derselben Saison.",
      );
    }
    this.assertWithinMicrocycle(
      targetMicrocycle,
      values.startDate,
      values.endDate,
    );
    return this.storage.put(
      "microcycle_segments",
      { ...segment, ...values },
      {
        expectedVersion: segment.version,
        revision: this.revision(targetSeasonId),
      },
    );
  }

  async deleteMicrocycleSegment(segment: MicrocycleSegment): Promise<void> {
    const microcycle = await this.requireMicrocycle(segment.microcycleId);
    const seasonId = await this.seasonIdForMicrocycle(microcycle);
    return this.storage.softDelete("microcycle_segments", segment.id, {
      expectedVersion: segment.version,
      revision: this.revision(seasonId),
    });
  }

  async generateWeeklyMicrocycles(mesocycleId: string): Promise<number> {
    const mesocycle = await this.requireMesocycle(mesocycleId);
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    const existing = await this.listMicrocycles(macrocycle.seasonId);
    const taken = new Set(
      existing
        .filter((item) => item.mesocycleId === mesocycleId)
        .map((item) => item.startDate),
    );
    const weeks = buildWeeks(mesocycle.startDate, mesocycle.endDate);
    let created = 0;
    for (const week of weeks) {
      if (taken.has(week.startDate)) continue;
      await this.createMicrocycle({
        mesocycleId,
        name: `KW ${String(week.isoWeek).padStart(2, "0")}`,
        startDate: week.startDate,
        endDate: week.endDate,
        goal: "",
      });
      created++;
    }
    return created;
  }

  async initializeStandardPeriodization(seasonId: string): Promise<void> {
    const running = this.periodizationInitializations.get(seasonId);
    if (running) return running;
    const initialization = this.createStandardPeriodization(seasonId);
    this.periodizationInitializations.set(seasonId, initialization);
    try {
      await initialization;
    } catch (error) {
      this.periodizationInitializations.delete(seasonId);
      throw error;
    }
  }

  private async createStandardPeriodization(seasonId: string): Promise<void> {
    await this.requireSeason(seasonId);
    if ((await this.listDimensions(seasonId)).length > 0) return;

    if ((await this.listTracks(seasonId)).length === 0) {
      await this.createTrack(seasonId, {
        name: "Standard",
        sortOrder: 0,
        visible: true,
      });
    }

    const dimensions = new Map<string, PeriodizationDimension>();
    for (const [sortOrder, name] of standardDimensions.entries()) {
      const dimension = await this.createDimension(seasonId, {
        name,
        code: toCode(name),
        description: "",
        sortOrder,
        active: true,
      });
      dimensions.set(name, dimension);
    }
    for (const [dimensionName, focuses] of Object.entries(standardFocuses)) {
      const dimension = dimensions.get(dimensionName);
      if (!dimension) continue;
      for (const name of focuses) {
        await this.createFocusDefinition(seasonId, {
          dimensionId: dimension.id,
          name,
          code: toCode(name),
          description: "",
          active: true,
        });
      }
    }
  }

  async listDimensions(seasonId: string): Promise<PeriodizationDimension[]> {
    return (
      await this.storage.list<PeriodizationDimension>(
        "periodization_dimensions",
      )
    )
      .filter((dimension) => dimension.seasonId === seasonId)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name),
      );
  }

  async createDimension(
    seasonId: string,
    input: PeriodizationDimensionInput,
  ): Promise<PeriodizationDimension> {
    await this.requireSeason(seasonId);
    const values = periodizationDimensionInputSchema.parse(input);
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueDimensionCode(seasonId, code);
    return this.storage.put(
      "periodization_dimensions",
      { id: this.createId(), seasonId, ...values, code, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateDimension(
    dimension: PeriodizationDimension,
    input: PeriodizationDimensionInput,
  ): Promise<PeriodizationDimension> {
    const values = periodizationDimensionInputSchema.parse(input);
    await this.requireSeason(dimension.seasonId);
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueDimensionCode(
      dimension.seasonId,
      code,
      dimension.id,
    );
    return this.storage.put(
      "periodization_dimensions",
      { ...dimension, ...values, code },
      {
        expectedVersion: dimension.version,
        revision: this.revision(dimension.seasonId),
      },
    );
  }

  async deleteDimension(dimension: PeriodizationDimension): Promise<void> {
    const [definitions, segments] = await Promise.all([
      this.listFocusDefinitions(dimension.seasonId),
      this.listFocusSegments(dimension.seasonId),
    ]);
    if (
      definitions.some((item) => item.dimensionId === dimension.id) ||
      segments.some((item) => item.dimensionId === dimension.id)
    ) {
      throw new PlanningValidationError(
        "Eine Dimension mit Fokusdefinitionen oder Fokussegmenten kann nicht gelöscht werden.",
      );
    }
    return this.storage.softDelete("periodization_dimensions", dimension.id, {
      expectedVersion: dimension.version,
      revision: this.revision(dimension.seasonId),
    });
  }

  async listFocusDefinitions(seasonId: string): Promise<FocusDefinition[]> {
    return (await this.storage.list<FocusDefinition>("focus_definitions"))
      .filter((definition) => definition.seasonId === seasonId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async createFocusDefinition(
    seasonId: string,
    input: FocusDefinitionInput,
  ): Promise<FocusDefinition> {
    await this.requireSeason(seasonId);
    const values = focusDefinitionInputSchema.parse(input);
    await this.requireDimension(seasonId, values.dimensionId);
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueFocusCode(seasonId, values.dimensionId, code);
    return this.storage.put(
      "focus_definitions",
      { id: this.createId(), seasonId, ...values, code, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateFocusDefinition(
    definition: FocusDefinition,
    input: FocusDefinitionInput,
  ): Promise<FocusDefinition> {
    const values = focusDefinitionInputSchema.parse(input);
    await this.requireDimension(definition.seasonId, values.dimensionId);
    if (values.dimensionId !== definition.dimensionId) {
      const segments = await this.listFocusSegments(definition.seasonId);
      if (segments.some((item) => item.focusDefinitionId === definition.id)) {
        throw new PlanningValidationError(
          "Ein verwendeter Fokus kann nicht in eine andere Dimension verschoben werden.",
        );
      }
    }
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueFocusCode(
      definition.seasonId,
      values.dimensionId,
      code,
      definition.id,
    );
    return this.storage.put(
      "focus_definitions",
      { ...definition, ...values, code },
      {
        expectedVersion: definition.version,
        revision: this.revision(definition.seasonId),
      },
    );
  }

  async deleteFocusDefinition(definition: FocusDefinition): Promise<void> {
    const segments = await this.listFocusSegments(definition.seasonId);
    if (segments.some((item) => item.focusDefinitionId === definition.id)) {
      throw new PlanningValidationError(
        "Eine verwendete Fokusdefinition kann nicht gelöscht werden.",
      );
    }
    return this.storage.softDelete("focus_definitions", definition.id, {
      expectedVersion: definition.version,
      revision: this.revision(definition.seasonId),
    });
  }

  async listFocusSegments(seasonId: string): Promise<FocusSegment[]> {
    return (await this.storage.list<FocusSegment>("focus_segments"))
      .filter((segment) => segment.seasonId === seasonId)
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  async createFocusSegment(
    seasonId: string,
    input: FocusSegmentInput,
  ): Promise<FocusSegment> {
    const season = await this.requireSeason(seasonId);
    const values = focusSegmentInputSchema.parse(input);
    const dimensionId = await this.resolveFocusDimension(
      seasonId,
      values.dimensionId,
      values.focusDefinitionId,
    );
    const normed = { ...values, dimensionId };
    await this.requireFocusSelection(
      seasonId,
      dimensionId,
      normed.focusDefinitionId,
    );
    this.assertWithinSeason(season, normed.startDate, normed.endDate);
    return this.storage.put(
      "focus_segments",
      { id: this.createId(), seasonId, ...normed, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateFocusSegment(
    segment: FocusSegment,
    input: FocusSegmentInput,
  ): Promise<FocusSegment> {
    const season = await this.requireSeason(segment.seasonId);
    const values = focusSegmentInputSchema.parse(input);
    const dimensionId = await this.resolveFocusDimension(
      segment.seasonId,
      values.dimensionId,
      values.focusDefinitionId,
    );
    const normed = { ...values, dimensionId };
    await this.requireFocusSelection(
      segment.seasonId,
      dimensionId,
      normed.focusDefinitionId,
    );
    this.assertWithinSeason(season, normed.startDate, normed.endDate);
    return this.storage.put(
      "focus_segments",
      { ...segment, ...normed },
      {
        expectedVersion: segment.version,
        revision: this.revision(segment.seasonId),
      },
    );
  }

  deleteFocusSegment(segment: FocusSegment): Promise<void> {
    return this.storage.softDelete("focus_segments", segment.id, {
      expectedVersion: segment.version,
      revision: this.revision(segment.seasonId),
    });
  }

  async listTrainingDays(seasonId: string): Promise<TrainingDay[]> {
    return (await this.storage.list<TrainingDay>("training_days"))
      .filter((day) => day.seasonId === seasonId)
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  async createTrainingDay(
    seasonId: string,
    input: TrainingDayInput,
  ): Promise<TrainingDay> {
    const season = await this.requireSeason(seasonId);
    const values = trainingDayInputSchema.parse(input);
    this.assertWithinSeason(season, values.date, values.date);
    return this.storage.put(
      "training_days",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateTrainingDay(
    day: TrainingDay,
    input: TrainingDayInput,
  ): Promise<TrainingDay> {
    const season = await this.requireSeason(day.seasonId);
    const values = trainingDayInputSchema.parse(input);
    this.assertWithinSeason(season, values.date, values.date);
    return this.storage.put(
      "training_days",
      { ...day, ...values },
      { expectedVersion: day.version, revision: this.revision(day.seasonId) },
    );
  }

  async deleteTrainingDay(day: TrainingDay): Promise<void> {
    const sessions =
      await this.storage.list<TrainingSession>("training_sessions");
    if (sessions.some((session) => session.trainingDayId === day.id)) {
      throw new PlanningValidationError(
        "Ein Trainingstag mit Sessions kann nicht gelöscht werden.",
      );
    }
    return this.storage.softDelete("training_days", day.id, {
      expectedVersion: day.version,
      revision: this.revision(day.seasonId),
    });
  }

  async listTrainingSessions(seasonId: string): Promise<TrainingSession[]> {
    const ids = new Set(
      (await this.listTrainingDays(seasonId)).map((day) => day.id),
    );
    return (await this.storage.list<TrainingSession>("training_sessions"))
      .filter((session) => ids.has(session.trainingDayId))
      .sort((a, b) =>
        (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"),
      );
  }

  async saveTrainingSession(
    seasonId: string,
    input: TrainingSessionInput,
    current?: TrainingSession,
  ): Promise<TrainingSession> {
    const values = trainingSessionInputSchema.parse(input);
    const day = await this.storage.get<TrainingDay>(
      "training_days",
      values.trainingDayId,
    );
    if (!day || day.seasonId !== seasonId)
      throw new PlanningValidationError(
        "Trainingstag gehört nicht zur Saison.",
      );
    if (current) {
      const persisted = await this.storage.get<TrainingSession>(
        "training_sessions",
        current.id,
      );
      if (
        !persisted ||
        persisted.version !== current.version ||
        persisted.trainingDayId !== current.trainingDayId
      ) {
        throw new PlanningValidationError(
          "Die zu bearbeitende Session ist nicht mehr aktuell.",
        );
      }
      const currentDay = await this.storage.get<TrainingDay>(
        "training_days",
        current.trainingDayId,
      );
      if (!currentDay || currentDay.seasonId !== seasonId) {
        throw new PlanningValidationError(
          "Session gehört nicht zu dieser Saison.",
        );
      }
    }
    const template = current?.scheduleTemplateId
      ? await this.storage.get<TrainingScheduleTemplate>(
          "training_schedule_templates",
          current.scheduleTemplateId,
        )
      : null;
    let detached = current?.scheduleDetached ?? false;
    if (current?.generatedFromSchedule && template && !detached) {
      const defaultDuration = this.durationBetween(
        template.startTime,
        template.endTime,
      );
      const timeChanged =
        (values.startTime || undefined) !== template.startTime;
      const durationChanged =
        values.durationMinutes !== undefined &&
        values.durationMinutes !== defaultDuration;
      if (timeChanged || durationChanged) detached = true;
    }
    return this.storage.put(
      "training_sessions",
      {
        ...(current ?? { id: this.createId(), version: 0 }),
        trainingDayId: values.trainingDayId,
        title: values.title || undefined,
        startTime: values.startTime || undefined,
        durationMinutes: values.durationMinutes,
        volumeMeters: values.volumeMeters,
        expectedRpe: values.expectedRpe,
        mainFocusId: values.mainFocusId || undefined,
        technicalFocusId: values.technicalFocusId || undefined,
        keySession: values.keySession,
        athleteNote: values.athleteNote || undefined,
        equipment: values.equipment || undefined,
        scheduleTemplateId: current?.scheduleTemplateId,
        generatedFromSchedule: current?.generatedFromSchedule ?? false,
        scheduleDetached: detached,
        status: values.status,
      },
      {
        expectedVersion: current?.version ?? 0,
        revision: this.revision(seasonId),
      },
    );
  }

  async deleteTrainingSession(
    seasonId: string,
    session: TrainingSession,
  ): Promise<void> {
    const day = await this.storage.get<TrainingDay>(
      "training_days",
      session.trainingDayId,
    );
    if (!day || day.seasonId !== seasonId) {
      throw new PlanningValidationError(
        "Session gehört nicht zu dieser Saison.",
      );
    }
    return this.storage.softDelete("training_sessions", session.id, {
      expectedVersion: session.version,
      revision: this.revision(seasonId),
    });
  }

  async listScheduleTemplates(
    seasonId: string,
  ): Promise<TrainingScheduleTemplate[]> {
    return (
      await this.storage.list<TrainingScheduleTemplate>(
        "training_schedule_templates",
      )
    )
      .filter((template) => template.seasonId === seasonId)
      .sort(
        (left, right) =>
          weekdayOffset(left.weekday) - weekdayOffset(right.weekday) ||
          left.startTime.localeCompare(right.startTime),
      );
  }

  async createScheduleTemplate(
    seasonId: string,
    input: TrainingScheduleTemplateInput,
  ): Promise<TrainingScheduleTemplate> {
    await this.requireSeason(seasonId);
    const values = trainingScheduleTemplateInputSchema.parse(input);
    const timestamp = this.now();
    return this.storage.put(
      "training_schedule_templates",
      {
        id: this.createId(),
        seasonId,
        name: values.name,
        weekday: values.weekday,
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location || undefined,
        active: values.active,
        validFrom: values.validFrom ?? null,
        validUntil: values.validUntil ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 0,
      },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateScheduleTemplate(
    template: TrainingScheduleTemplate,
    input: TrainingScheduleTemplateInput,
  ): Promise<TrainingScheduleTemplate> {
    await this.requireSeason(template.seasonId);
    const values = trainingScheduleTemplateInputSchema.parse(input);
    return this.storage.put(
      "training_schedule_templates",
      {
        ...template,
        name: values.name,
        weekday: values.weekday,
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location || undefined,
        active: values.active,
        validFrom: values.validFrom ?? null,
        validUntil: values.validUntil ?? null,
      },
      {
        expectedVersion: template.version,
        revision: this.revision(template.seasonId),
      },
    );
  }

  deleteScheduleTemplate(template: TrainingScheduleTemplate): Promise<void> {
    return this.storage.softDelete("training_schedule_templates", template.id, {
      expectedVersion: template.version,
      revision: this.revision(template.seasonId),
    });
  }

  /**
   * Erzeugt fehlende Sessions aus aktiven Templates (idempotent) und gleicht
   * Template-Änderungen mit noch nicht individuell veränderten zukünftigen
   * Sessions ab. `now` dient als Stichtag für „vergangene“ Sessions.
   */
  async refreshScheduleSessions(
    seasonId: string,
    now: string = this.now(),
  ): Promise<void> {
    const season = await this.requireSeason(seasonId);
    const templates = (await this.listScheduleTemplates(seasonId)).filter(
      (template) => template.active,
    );
    const [days, sessions] = await Promise.all([
      this.storage.list<TrainingDay>("training_days"),
      this.storage.list<TrainingSession>("training_sessions"),
    ]);
    const seasonDays = days.filter((day) => day.seasonId === seasonId);
    const dayByDate = new Map(seasonDays.map((day) => [day.date, day]));
    const dateByDayId = new Map(seasonDays.map((day) => [day.id, day.date]));

    for (const template of templates) {
      const from =
        template.validFrom && template.validFrom > season.startDate
          ? template.validFrom
          : season.startDate;
      const until =
        template.validUntil && template.validUntil < season.endDate
          ? template.validUntil
          : season.endDate;
      if (from > until) continue;

      for (const week of buildWeeks(from, until)) {
        const date = this.dateInWeek(week, template.weekday);
        if (!date) continue;
        const day = dayByDate.get(date);
        if (
          day &&
          sessions.some(
            (session) =>
              session.trainingDayId === day.id &&
              session.scheduleTemplateId === template.id,
          )
        ) {
          continue;
        }
        const target =
          day ??
          (await this.createTrainingDay(seasonId, {
            date,
            dayContext: "",
            notes: "",
          }));
        dayByDate.set(date, target);
        await this.storage.put(
          "training_sessions",
          {
            id: this.createId(),
            trainingDayId: target.id,
            title: template.name,
            startTime: template.startTime,
            durationMinutes: this.durationBetween(
              template.startTime,
              template.endTime,
            ),
            keySession: false,
            generatedFromSchedule: true,
            scheduleDetached: false,
            scheduleTemplateId: template.id,
            version: 0,
          },
          { expectedVersion: 0, revision: this.revision(seasonId) },
        );
      }
    }

    const today = now.slice(0, 10);
    for (const template of templates) {
      for (const session of sessions) {
        if (
          !session.generatedFromSchedule ||
          session.scheduleTemplateId !== template.id ||
          session.scheduleDetached
        ) {
          continue;
        }
        const date = dateByDayId.get(session.trainingDayId);
        if (!date || date < today) continue;
        const durationMinutes = this.durationBetween(
          template.startTime,
          template.endTime,
        );
        if (
          session.startTime === template.startTime &&
          session.durationMinutes === durationMinutes
        ) {
          continue;
        }
        await this.storage.put(
          "training_sessions",
          {
            ...session,
            startTime: template.startTime,
            durationMinutes,
          },
          {
            expectedVersion: session.version,
            revision: this.revision(seasonId),
          },
        );
      }
    }
  }

  async initializeStandardEquipment(seasonId: string): Promise<void> {
    await this.requireSeason(seasonId);
    if ((await this.listEquipment(seasonId)).length > 0) return;
    const names = [
      "Wettkampfanzug",
      "Kurzflossen",
      "Paddles",
      "Schnorchel",
      "Pullkick",
      "Brett",
      "Fallschirm",
      "Pulssensor",
      "Trinkflasche",
    ];
    for (const [sortOrder, name] of names.entries()) {
      await this.createEquipmentItem(seasonId, {
        name,
        code: toCode(name),
        active: true,
        sortOrder,
      });
    }
  }

  async listEquipment(seasonId: string): Promise<EquipmentItem[]> {
    return (await this.storage.list<EquipmentItem>("equipment_items"))
      .filter((item) => item.seasonId === seasonId)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
  }

  async createEquipmentItem(
    seasonId: string,
    input: EquipmentItemInput,
  ): Promise<EquipmentItem> {
    await this.requireSeason(seasonId);
    const values = equipmentItemInputSchema.parse(input);
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueEquipment(seasonId, values.name, code);
    return this.storage.put(
      "equipment_items",
      { id: this.createId(), seasonId, ...values, code, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateEquipmentItem(
    item: EquipmentItem,
    input: EquipmentItemInput,
  ): Promise<EquipmentItem> {
    const values = equipmentItemInputSchema.parse(input);
    const code = this.withGeneratedCode(values.name, values.code);
    await this.assertUniqueEquipment(item.seasonId, values.name, code, item.id);
    return this.storage.put(
      "equipment_items",
      { ...item, ...values, code },
      { expectedVersion: item.version, revision: this.revision(item.seasonId) },
    );
  }

  async deleteEquipmentItem(item: EquipmentItem): Promise<void> {
    const links =
      await this.storage.list<SessionEquipment>("session_equipment");
    if (links.some((link) => link.equipmentId === item.id))
      throw new PlanningValidationError(
        "Verwendetes Equipment kann nicht gelöscht werden. Deaktiviere es stattdessen.",
      );
    return this.storage.softDelete("equipment_items", item.id, {
      expectedVersion: item.version,
      revision: this.revision(item.seasonId),
    });
  }

  async listSessionEquipment(sessionId: string): Promise<SessionEquipment[]> {
    return (
      await this.storage.list<SessionEquipment>("session_equipment")
    ).filter((link) => link.sessionId === sessionId);
  }

  async setSessionEquipment(
    seasonId: string,
    sessionId: string,
    equipmentId: string,
    requirementLevel: SessionEquipment["requirementLevel"] | null,
  ): Promise<void> {
    const [session, item] = await Promise.all([
      this.storage.get<TrainingSession>("training_sessions", sessionId),
      this.storage.get<EquipmentItem>("equipment_items", equipmentId),
    ]);
    if (!session || !item || item.seasonId !== seasonId || !item.active)
      throw new PlanningValidationError(
        "Session oder aktives Equipment wurde nicht gefunden.",
      );
    const day = await this.storage.get<TrainingDay>(
      "training_days",
      session.trainingDayId,
    );
    if (!day || day.seasonId !== seasonId)
      throw new PlanningValidationError(
        "Session gehört nicht zu dieser Saison.",
      );
    const current = (await this.listSessionEquipment(sessionId)).find(
      (link) => link.equipmentId === equipmentId,
    );
    if (requirementLevel === null) {
      if (current)
        await this.storage.softDelete("session_equipment", current.id, {
          expectedVersion: current.version,
          revision: this.revision(seasonId),
        });
      return;
    }
    await this.storage.put(
      "session_equipment",
      current
        ? { ...current, requirementLevel }
        : {
            id: this.createId(),
            sessionId,
            equipmentId,
            requirementLevel,
            version: 0,
          },
      {
        expectedVersion: current?.version ?? 0,
        revision: this.revision(seasonId),
      },
    );
  }

  private async resolveFocusDimension(
    seasonId: string,
    dimensionId: string,
    focusDefinitionId: string,
  ): Promise<string> {
    if (dimensionId) return dimensionId;
    const definition = await this.storage.get<FocusDefinition>(
      "focus_definitions",
      focusDefinitionId,
    );
    if (!definition || definition.seasonId !== seasonId || !definition.active) {
      throw new PlanningValidationError(
        "Der Fokus gehört nicht zur gewählten aktiven Dimension.",
      );
    }
    return definition.dimensionId;
  }

  private assertChildrenWithinRange(
    children: Array<{ startDate: string; endDate: string }>,
    startDate: string,
    endDate: string,
    childLabel: string,
  ): void {
    if (
      children.some(
        (child) => child.startDate < startDate || child.endDate > endDate,
      )
    ) {
      throw new PlanningValidationError(
        `Der Zeitraum kann nicht geändert werden, weil vorhandene ${childLabel} außerhalb liegen würden.`,
      );
    }
  }

  private async requireSeason(seasonId: string): Promise<Season> {
    const season = await this.storage.get<Season>("seasons", seasonId);
    if (!season)
      throw new PlanningValidationError("Saison wurde nicht gefunden.");
    return season;
  }

  private async assertUniqueEquipment(
    seasonId: string,
    name: string,
    code: string,
    ignoredId?: string,
  ): Promise<void> {
    const items = await this.listEquipment(seasonId);
    if (
      items.some(
        (item) =>
          item.id !== ignoredId &&
          (item.name.toLocaleLowerCase("de") === name.toLocaleLowerCase("de") ||
            item.code === code),
      )
    ) {
      throw new PlanningValidationError(
        "Name und Code müssen innerhalb der Saison eindeutig sein.",
      );
    }
  }

  private async requireDimension(
    seasonId: string,
    dimensionId: string,
  ): Promise<PeriodizationDimension> {
    const dimension = await this.storage.get<PeriodizationDimension>(
      "periodization_dimensions",
      dimensionId,
    );
    if (!dimension || dimension.seasonId !== seasonId) {
      throw new PlanningValidationError(
        "Die Dimension gehört nicht zu dieser Saison.",
      );
    }
    return dimension;
  }

  private async requireFocusSelection(
    seasonId: string,
    dimensionId: string,
    definitionId: string,
  ): Promise<void> {
    const [dimension, definition] = await Promise.all([
      this.requireDimension(seasonId, dimensionId),
      this.storage.get<FocusDefinition>("focus_definitions", definitionId),
    ]);
    if (
      !dimension.active ||
      !definition ||
      !definition.active ||
      definition.seasonId !== seasonId ||
      definition.dimensionId !== dimensionId
    ) {
      throw new PlanningValidationError(
        "Der Fokus gehört nicht zur gewählten aktiven Dimension.",
      );
    }
  }

  private async assertUniqueDimensionCode(
    seasonId: string,
    code: string,
    ignoredId?: string,
  ): Promise<void> {
    const dimensions = await this.listDimensions(seasonId);
    if (
      dimensions.some((item) => item.id !== ignoredId && item.code === code)
    ) {
      throw new PlanningValidationError(
        "Der Dimensionscode ist in dieser Saison bereits vergeben.",
      );
    }
  }

  private async assertUniqueFocusCode(
    seasonId: string,
    dimensionId: string,
    code: string,
    ignoredId?: string,
  ): Promise<void> {
    const definitions = await this.listFocusDefinitions(seasonId);
    if (
      definitions.some(
        (item) =>
          item.id !== ignoredId &&
          item.dimensionId === dimensionId &&
          item.code === code,
      )
    ) {
      throw new PlanningValidationError(
        "Der Fokuscode ist in dieser Dimension bereits vergeben.",
      );
    }
  }

  private async requireTrack(
    seasonId: string,
    trackId: string,
  ): Promise<EventTrack> {
    const track = await this.storage.get<EventTrack>("event_tracks", trackId);
    if (!track || track.seasonId !== seasonId) {
      throw new PlanningValidationError(
        "Die Eventspur gehört nicht zu dieser Saison.",
      );
    }
    return track;
  }

  private async requireTargetEvent(
    seasonId: string,
    eventId: string | undefined,
  ): Promise<void> {
    if (!eventId) return;
    const event = await this.storage.get<Event>("events", eventId);
    if (!event || event.seasonId !== seasonId) {
      throw new PlanningValidationError(
        "Der Zielwettkampf gehört nicht zu dieser Saison.",
      );
    }
  }

  private async requireMacrocycle(macrocycleId: string): Promise<Macrocycle> {
    const macrocycle = await this.storage.get<Macrocycle>(
      "macrocycles",
      macrocycleId,
    );
    if (!macrocycle) {
      throw new PlanningValidationError("Makrozyklus wurde nicht gefunden.");
    }
    return macrocycle;
  }

  private async requireMesocycle(mesocycleId: string): Promise<Mesocycle> {
    const mesocycle = await this.storage.get<Mesocycle>(
      "mesocycles",
      mesocycleId,
    );
    if (!mesocycle) {
      throw new PlanningValidationError("Mesozyklus wurde nicht gefunden.");
    }
    return mesocycle;
  }

  private async requireMicrocycle(microcycleId: string): Promise<Microcycle> {
    const microcycle = await this.storage.get<Microcycle>(
      "microcycles",
      microcycleId,
    );
    if (!microcycle) {
      throw new PlanningValidationError("Mikrozyklus wurde nicht gefunden.");
    }
    return microcycle;
  }

  private async seasonIdForMicrocycle(microcycle: Microcycle): Promise<string> {
    const mesocycle = await this.requireMesocycle(microcycle.mesocycleId);
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    return macrocycle.seasonId;
  }

  private assertWithinMicrocycle(
    microcycle: Microcycle,
    startDate: string,
    endDate: string,
  ): void {
    if (startDate < microcycle.startDate || endDate > microcycle.endDate) {
      throw new PlanningValidationError(
        "Der Zeitraum muss vollständig innerhalb des Mikrozyklus liegen.",
      );
    }
  }

  private assertWithinMesocycle(
    mesocycle: Mesocycle,
    startDate: string,
    endDate: string,
  ): void {
    if (startDate < mesocycle.startDate || endDate > mesocycle.endDate) {
      throw new PlanningValidationError(
        "Der Zeitraum muss vollständig innerhalb des Mesozyklus liegen.",
      );
    }
  }

  private assertWithinMacrocycle(
    macrocycle: Macrocycle,
    startDate: string,
    endDate: string,
  ): void {
    if (startDate < macrocycle.startDate || endDate > macrocycle.endDate) {
      throw new PlanningValidationError(
        "Der Zeitraum muss vollständig innerhalb des Makrozyklus liegen.",
      );
    }
  }

  private assertWithinSeason(
    season: Season,
    startDate: string,
    endDate: string,
  ): void {
    if (startDate < season.startDate || endDate > season.endDate) {
      throw new PlanningValidationError(
        "Der Zeitraum muss vollständig innerhalb der Saison liegen.",
      );
    }
  }

  private eventValues(values: EventInput): Omit<EventInput, never> {
    return values;
  }

  private normalizeEvent(values: EventInput): EventInput {
    return {
      ...values,
      endDate: values.endDate || values.startDate,
    };
  }

  private withGeneratedCode(name: string, code: string): string {
    return code || toCode(name);
  }

  private dateInWeek(week: IsoWeek, weekday: Weekday): string | null {
    const target = addDays(week.monday, weekdayOffset(weekday));
    const value = formatIsoDate(target);
    if (value < week.startDate || value > week.endDate) return null;
    return value;
  }

  private durationBetween(start: string, end: string): number {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    return endHour * 60 + endMinute - (startHour * 60 + startMinute);
  }

  private revision(seasonId: string) {
    return { seasonId, editorLabel: "public" };
  }
}

function toCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const weekdayOffsets: Record<Weekday, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function weekdayOffset(weekday: Weekday): number {
  return weekdayOffsets[weekday];
}
