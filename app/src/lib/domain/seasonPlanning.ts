import type {
  CalendarConstraint,
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
  TrainingDay,
  TrainingSession,
} from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  focusDefinitionInputSchema,
  focusSegmentInputSchema,
  macrocycleInputSchema,
  mesocycleInputSchema,
  microcycleInputSchema,
  microcycleSegmentInputSchema,
  periodizationDimensionInputSchema,
  trainingDayInputSchema,
  trainingSessionInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
  type FocusDefinitionInput,
  type FocusSegmentInput,
  type MacrocycleInput,
  type MesocycleInput,
  type MicrocycleInput,
  type MicrocycleSegmentInput,
  type PeriodizationDimensionInput,
  type TrainingDayInput,
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
}

export class PlanningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningValidationError";
  }
}

export class SeasonPlanningService {
  private readonly createId: () => string;
  private readonly periodizationInitializations = new Map<
    string,
    Promise<void>
  >();

  constructor(
    private readonly storage: StorageAdapter,
    dependencies: SeasonPlanningDependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
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
    await this.requireTrack(seasonId, values.trackId);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "events",
      {
        id: this.createId(),
        seasonId,
        ...this.eventValues(values),
        version: 0,
      },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateEvent(event: Event, input: EventInput): Promise<Event> {
    const season = await this.requireSeason(event.seasonId);
    const values = eventInputSchema.parse(input);
    await this.requireTrack(event.seasonId, values.trackId);
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "events",
      { ...event, ...this.eventValues(values) },
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
    await this.assertUniqueDimensionCode(seasonId, values.code);
    return this.storage.put(
      "periodization_dimensions",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateDimension(
    dimension: PeriodizationDimension,
    input: PeriodizationDimensionInput,
  ): Promise<PeriodizationDimension> {
    const values = periodizationDimensionInputSchema.parse(input);
    await this.requireSeason(dimension.seasonId);
    await this.assertUniqueDimensionCode(
      dimension.seasonId,
      values.code,
      dimension.id,
    );
    return this.storage.put(
      "periodization_dimensions",
      { ...dimension, ...values },
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
    await this.assertUniqueFocusCode(seasonId, values.dimensionId, values.code);
    return this.storage.put(
      "focus_definitions",
      { id: this.createId(), seasonId, ...values, version: 0 },
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
    await this.assertUniqueFocusCode(
      definition.seasonId,
      values.dimensionId,
      values.code,
      definition.id,
    );
    return this.storage.put(
      "focus_definitions",
      { ...definition, ...values },
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
    await this.requireFocusSelection(
      seasonId,
      values.dimensionId,
      values.focusDefinitionId,
    );
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "focus_segments",
      { id: this.createId(), seasonId, ...values, version: 0 },
      { expectedVersion: 0, revision: this.revision(seasonId) },
    );
  }

  async updateFocusSegment(
    segment: FocusSegment,
    input: FocusSegmentInput,
  ): Promise<FocusSegment> {
    const season = await this.requireSeason(segment.seasonId);
    const values = focusSegmentInputSchema.parse(input);
    await this.requireFocusSelection(
      segment.seasonId,
      values.dimensionId,
      values.focusDefinitionId,
    );
    this.assertWithinSeason(season, values.startDate, values.endDate);
    return this.storage.put(
      "focus_segments",
      { ...segment, ...values },
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

  deleteTrainingDay(day: TrainingDay): Promise<void> {
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
      },
      {
        expectedVersion: current?.version ?? 0,
        revision: this.revision(seasonId),
      },
    );
  }

  deleteTrainingSession(
    seasonId: string,
    session: TrainingSession,
  ): Promise<void> {
    return this.storage.softDelete("training_sessions", session.id, {
      expectedVersion: session.version,
      revision: this.revision(seasonId),
    });
  }

  async initializeStandardEquipment(seasonId: string): Promise<void> {
    void seasonId;
    // Stammdaten werden mit der ersten Session-Eingabe bedarfsgerecht erfasst.
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
