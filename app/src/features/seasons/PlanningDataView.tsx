import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
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
} from "../../lib/domain/types";
import { CycleSuggestionPanel } from "./CycleSuggestionPanel";
import { PeriodizationManagement } from "./PeriodizationManagement";
import { TrainingDayManagement } from "./TrainingDayManagement";
import {
  ConstraintSection,
  EventSection,
  MacrocycleSection,
  MesocycleSection,
  MicrocycleSection,
  MicrocycleSegmentSection,
  TrackSection,
} from "./PlanningDataSections";

export function PlanningDataView({
  season,
  tracks,
  events,
  constraints,
  macrocycles,
  mesocycles,
  microcycles,
  microcycleSegments,
  dimensions,
  focusDefinitions,
  focusSegments,
  trainingDays,
  service,
  onChange,
  onNotice,
  onOpenBulk,
}: {
  season: Season;
  tracks: EventTrack[];
  events: Event[];
  constraints: CalendarConstraint[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  microcycleSegments: MicrocycleSegment[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
  trainingDays: TrainingDay[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
  onOpenBulk: () => void;
}) {
  return (
    <div className="planning-data">
      <TrackSection
        tracks={tracks}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <EventSection
        events={events}
        tracks={tracks}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
        onOpenBulk={onOpenBulk}
      />
      <ConstraintSection
        constraints={constraints}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <MacrocycleSection
        macrocycles={macrocycles}
        events={events}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <MesocycleSection
        mesocycles={mesocycles}
        macrocycles={macrocycles}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <MicrocycleSection
        microcycles={microcycles}
        mesocycles={mesocycles}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <MicrocycleSegmentSection
        segments={microcycleSegments}
        microcycles={microcycles}
        service={service}
        seasonId={season.id}
        onChange={onChange}
        onNotice={onNotice}
      />
      <CycleSuggestionPanel
        season={season}
        events={events}
        macrocycles={macrocycles}
        mesocycles={mesocycles}
        microcycles={microcycles}
        service={service}
        onChange={onChange}
        onNotice={onNotice}
      />
      <PeriodizationManagement
        seasonId={season.id}
        dimensions={dimensions}
        focusDefinitions={focusDefinitions}
        focusSegments={focusSegments}
        service={service}
        onChange={onChange}
        onNotice={onNotice}
      />
      <TrainingDayManagement
        season={season}
        days={trainingDays}
        service={service}
        onChange={onChange}
        onNotice={onNotice}
      />
    </div>
  );
}
