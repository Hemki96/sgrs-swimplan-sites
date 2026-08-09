# Data Dictionary

## Season

- `id`
- `name`
- `startDate`
- `endDate`
- `description`
- `mainGoal`
- `status`
- `version`
- `createdAt`
- `updatedAt`
- `deletedAt`

## EventTrack

- `id`
- `seasonId`
- `name`
- `sortOrder`
- `visible`
- `version`
- `deletedAt`

## Event

- `id`
- `seasonId`
- `trackId`
- `name`
- `startDate`
- `endDate`
- `priority`
- `category`
- `location`
- `goal`
- `notes`
- `version`
- `deletedAt`

## CalendarConstraint

- `id`
- `seasonId`
- `type`
- `name`
- `startDate`
- `endDate`
- `notes`
- `severity`
- `version`
- `deletedAt`

## Macrocycle

- `id`
- `seasonId`
- `name`
- `startDate`
- `endDate`
- `goal`
- `targetEventId`
- `notes`
- `version`
- `deletedAt`

## Mesocycle

- `id`
- `macrocycleId`
- `name`
- `startDate`
- `endDate`
- `goal`
- `notes`
- `version`
- `deletedAt`

## Microcycle

- `id`
- `mesocycleId`
- `name`
- `startDate`
- `endDate`
- `targetRpe`
- `targetVolumeMeters`
- `goal`
- `version`
- `deletedAt`

## MicrocycleSegment

- `id`
- `microcycleId`
- `name`
- `startDate`
- `endDate`
- `segmentType`
- `sortOrder`
- `version`
- `deletedAt`

## PeriodizationDimension

- `id`
- `seasonId`
- `name`
- `code`
- `description`
- `sortOrder`
- `active`
- `version`

## FocusDefinition

- `id`
- `seasonId`
- `dimensionId`
- `name`
- `code`
- `description`
- `active`
- `version`

## FocusSegment

- `id`
- `seasonId`
- `dimensionId`
- `focusDefinitionId`
- `startDate`
- `endDate`
- `notes`
- `version`
- `deletedAt`

## TrainingDay

- `id`
- `seasonId`
- `date`
- `dayContext`
- `notes`
- `version`

## TrainingSession

- `id`
- `trainingDayId`
- `title`
- `startTime`
- `durationMinutes`
- `volumeMeters`
- `expectedRpe`
- `mainFocusId`
- `technicalFocusId`
- `keySession`
- `athleteNote`
- `version`
- `deletedAt`

## EquipmentItem

- `id`
- `seasonId`
- `name`
- `code`
- `active`
- `sortOrder`
- `version`

## SessionEquipment

- `sessionId`
- `equipmentId`
- `requirementLevel`

## Revision

- `id`
- `seasonId`
- `revisionNumber`
- `timestamp`
- `operation`
- `entityType`
- `entityId`
- `beforeJson`
- `afterJson`
- `editorLabel`
