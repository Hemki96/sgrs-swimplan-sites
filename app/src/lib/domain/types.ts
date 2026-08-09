export type Id = string;
export type ISODate = string;
export type ISODateTime = string;
export type LocalTime = string;

export type RequirementLevel = "required" | "recommended" | "optional";
export type EventPriority = "A" | "B" | "C" | "test";
export type SeasonStatus = "draft" | "active" | "completed" | "archived";

export interface VersionedEntity {
  id: Id;
  version: number;
}

export interface SoftDeletableEntity extends VersionedEntity {
  deletedAt?: ISODateTime | null;
}

export interface Season extends SoftDeletableEntity {
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  description: string;
  mainGoal: string;
  status: SeasonStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface EventTrack extends SoftDeletableEntity {
  seasonId: Id;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface Event extends SoftDeletableEntity {
  seasonId: Id;
  trackId: Id;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  priority: EventPriority;
  category?: string;
  location?: string;
  goal?: string;
  notes?: string;
}

export interface CalendarConstraint extends SoftDeletableEntity {
  seasonId: Id;
  type: string;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  notes?: string;
  severity?: string;
}

export interface Macrocycle extends SoftDeletableEntity {
  seasonId: Id;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  goal: string;
  targetEventId?: Id;
  notes: string;
}

export interface Mesocycle extends SoftDeletableEntity {
  macrocycleId: Id;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  goal: string;
  notes: string;
}

export interface Microcycle extends SoftDeletableEntity {
  mesocycleId: Id;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  targetRpe: number;
  targetVolumeMeters?: number;
  goal: string;
}

export interface MicrocycleSegment extends SoftDeletableEntity {
  microcycleId: Id;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  segmentType: string;
  sortOrder: number;
}

export interface PeriodizationDimension extends SoftDeletableEntity {
  seasonId: Id;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

export interface FocusDefinition extends SoftDeletableEntity {
  seasonId: Id;
  dimensionId: Id;
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

export interface FocusSegment extends SoftDeletableEntity {
  seasonId: Id;
  dimensionId: Id;
  focusDefinitionId: Id;
  startDate: ISODate;
  endDate: ISODate;
  notes?: string;
}

export interface TrainingDay extends VersionedEntity {
  seasonId: Id;
  date: ISODate;
  dayContext?: string;
  notes?: string;
}

export interface TrainingSession extends SoftDeletableEntity {
  trainingDayId: Id;
  title?: string;
  startTime?: LocalTime;
  durationMinutes?: number;
  volumeMeters?: number;
  expectedRpe?: number;
  mainFocusId?: Id;
  technicalFocusId?: Id;
  keySession: boolean;
  athleteNote?: string;
}

export interface EquipmentItem extends VersionedEntity {
  seasonId: Id;
  name: string;
  code: string;
  active: boolean;
  sortOrder: number;
}

export interface SessionEquipment {
  sessionId: Id;
  equipmentId: Id;
  requirementLevel: RequirementLevel;
}

export interface Revision {
  id: Id;
  seasonId: Id;
  revisionNumber: number;
  timestamp: ISODateTime;
  operation: string;
  entityType: string;
  entityId: Id;
  beforeJson: unknown;
  afterJson: unknown;
  editorLabel?: string;
}
