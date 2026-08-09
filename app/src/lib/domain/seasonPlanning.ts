import type {
  CalendarConstraint,
  Event,
  EventTrack,
  Macrocycle,
  Mesocycle,
  Microcycle,
  Season,
} from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  macrocycleInputSchema,
  mesocycleInputSchema,
  microcycleInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
  type MacrocycleInput,
  type MesocycleInput,
  type MicrocycleInput,
} from "../validation/domain";

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
    const mesocycle = await this.requireMesocycle(microcycle.mesocycleId);
    const macrocycle = await this.requireMacrocycle(mesocycle.macrocycleId);
    return this.storage.softDelete("microcycles", microcycle.id, {
      expectedVersion: microcycle.version,
      revision: this.revision(macrocycle.seasonId),
    });
  }

  private async requireSeason(seasonId: string): Promise<Season> {
    const season = await this.storage.get<Season>("seasons", seasonId);
    if (!season)
      throw new PlanningValidationError("Saison wurde nicht gefunden.");
    return season;
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
