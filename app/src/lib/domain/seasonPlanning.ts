import type { CalendarConstraint, Event, EventTrack, Season } from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import {
  calendarConstraintInputSchema,
  eventInputSchema,
  eventTrackInputSchema,
  type CalendarConstraintInput,
  type EventInput,
  type EventTrackInput,
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
