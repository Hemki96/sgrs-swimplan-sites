import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
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
} from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";
import { BulkEventsEditor } from "./BulkEventsEditor";
import { PlanningDataView } from "./PlanningDataView";
import { errorMessage } from "../forms/errors";
import { HistoryService, type UndoRequest } from "../../lib/domain/history";
import { SeasonMatrix } from "../season-matrix/SeasonMatrix";
import { MobileWeekPlanning } from "../mobile/MobileWeekPlanning";
import { Dashboard } from "../dashboard/Dashboard";

const SeasonAnalytics = lazy(() =>
  import("../analytics/SeasonAnalytics").then((module) => ({
    default: module.SeasonAnalytics,
  })),
);
const HistoryView = lazy(() =>
  import("./HistoryView").then((module) => ({ default: module.HistoryView })),
);

function PlanningViewLoading({ label }: { label: string }) {
  return (
    <div className="view-loading" role="status" aria-live="polite">
      {label} wird geladen …
    </div>
  );
}

export type PlanningView =
  "dashboard" | "matrix" | "week" | "analytics" | "data" | "history";

export function SeasonPlanning({
  season,
  storage,
  view,
}: {
  season: Season;
  storage: StorageAdapter;
  view: PlanningView;
}) {
  const service = useMemo(() => new SeasonPlanningService(storage), [storage]);
  const historyService = useMemo(() => new HistoryService(storage), [storage]);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [constraints, setConstraints] = useState<CalendarConstraint[]>([]);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [microcycleSegments, setMicrocycleSegments] = useState<
    MicrocycleSegment[]
  >([]);
  const [dimensions, setDimensions] = useState<PeriodizationDimension[]>([]);
  const [focusDefinitions, setFocusDefinitions] = useState<FocusDefinition[]>(
    [],
  );
  const [focusSegments, setFocusSegments] = useState<FocusSegment[]>([]);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    [],
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<UndoRequest | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  function notify(message: string, undoRequest?: UndoRequest) {
    setNotice(message);
    setUndo(undoRequest ?? null);
  }

  async function undoLast() {
    if (!undo) return;
    try {
      await historyService.restoreEntity(undo.collection, undo.id, season.id);
      setNotice("Die Löschung wurde rückgängig gemacht.");
      setUndo(null);
      await reload();
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  async function reload() {
    await service.refreshScheduleSessions(season.id);
    const [
      nextTracks,
      nextEvents,
      nextConstraints,
      nextMacrocycles,
      nextMesocycles,
      nextMicrocycles,
      nextMicrocycleSegments,
      nextDimensions,
      nextFocusDefinitions,
      nextFocusSegments,
      nextTrainingDays,
      nextTrainingSessions,
    ] = await Promise.all([
      service.listTracks(season.id),
      service.listEvents(season.id),
      service.listConstraints(season.id),
      service.listMacrocycles(season.id),
      service.listMesocycles(season.id),
      service.listMicrocycles(season.id),
      service.listMicrocycleSegments(season.id),
      service.listDimensions(season.id),
      service.listFocusDefinitions(season.id),
      service.listFocusSegments(season.id),
      service.listTrainingDays(season.id),
      service.listTrainingSessions(season.id),
    ]);
    setTracks(nextTracks);
    setEvents(nextEvents);
    setConstraints(nextConstraints);
    setMacrocycles(nextMacrocycles);
    setMesocycles(nextMesocycles);
    setMicrocycles(nextMicrocycles);
    setMicrocycleSegments(nextMicrocycleSegments);
    setDimensions(nextDimensions);
    setFocusDefinitions(nextFocusDefinitions);
    setFocusSegments(nextFocusSegments);
    setTrainingDays(nextTrainingDays);
    setTrainingSessions(nextTrainingSessions);
  }

  useEffect(() => {
    let active = true;
    initializationRef.current ??= service
      .initializeStandardPeriodization(season.id)
      .then(() => service.initializeStandardEquipment(season.id))
      .then(() => service.refreshScheduleSessions(season.id));
    void initializationRef.current
      .then(() =>
        Promise.all([
          service.listTracks(season.id),
          service.listEvents(season.id),
          service.listConstraints(season.id),
          service.listMacrocycles(season.id),
          service.listMesocycles(season.id),
          service.listMicrocycles(season.id),
          service.listMicrocycleSegments(season.id),
          service.listDimensions(season.id),
          service.listFocusDefinitions(season.id),
          service.listFocusSegments(season.id),
          service.listTrainingDays(season.id),
          service.listTrainingSessions(season.id),
        ]),
      )
      .then(
        ([
          nextTracks,
          nextEvents,
          nextConstraints,
          nextMacrocycles,
          nextMesocycles,
          nextMicrocycles,
          nextMicrocycleSegments,
          nextDimensions,
          nextFocusDefinitions,
          nextFocusSegments,
          nextTrainingDays,
          nextTrainingSessions,
        ]) => {
          if (!active) return;
          setTracks(nextTracks);
          setEvents(nextEvents);
          setConstraints(nextConstraints);
          setMacrocycles(nextMacrocycles);
          setMesocycles(nextMesocycles);
          setMicrocycles(nextMicrocycles);
          setMicrocycleSegments(nextMicrocycleSegments);
          setDimensions(nextDimensions);
          setFocusDefinitions(nextFocusDefinitions);
          setFocusSegments(nextFocusSegments);
          setTrainingDays(nextTrainingDays);
          setTrainingSessions(nextTrainingSessions);
        },
      )
      .catch(() => {
        if (active) {
          setNotice(
            "Planungsdaten konnten nicht geladen werden. Bitte neu laden.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [season.id, service]);

  return (
    <section
      className={`planning planning-view-${view}`}
      aria-label="Saisonplanung"
    >
      {notice && (
        <div className="notice app-notice" role="status" aria-live="polite">
          <span>{notice}</span>
          {undo && (
            <button className="button quiet" onClick={() => void undoLast()}>
              Rückgängig
            </button>
          )}
        </div>
      )}
      {view === "dashboard" && (
        <Dashboard
          events={events}
          macrocycles={macrocycles}
          mesocycles={mesocycles}
          microcycles={microcycles}
          focusDefinitions={focusDefinitions}
          focusSegments={focusSegments}
          trainingDays={trainingDays}
          trainingSessions={trainingSessions}
        />
      )}
      {view === "week" && (
        <MobileWeekPlanning
          season={season}
          microcycles={microcycles}
          mesocycles={mesocycles}
          events={events}
          constraints={constraints}
          focusDefinitions={focusDefinitions}
          days={trainingDays}
          sessions={trainingSessions}
          service={service}
          onChange={reload}
        />
      )}
      {view === "matrix" && (
        <SeasonMatrix
          season={season}
          tracks={tracks}
          events={events}
          constraints={constraints}
          macrocycles={macrocycles}
          mesocycles={mesocycles}
          microcycles={microcycles}
          dimensions={dimensions}
          focusDefinitions={focusDefinitions}
          focusSegments={focusSegments}
          service={service}
          onChange={reload}
          onNotice={notify}
        />
      )}
      {view === "analytics" && (
        <Suspense fallback={<PlanningViewLoading label="Analyse" />}>
          <SeasonAnalytics
            season={season}
            events={events}
            microcycles={microcycles}
            focusDefinitions={focusDefinitions}
            trainingDays={trainingDays}
            trainingSessions={trainingSessions}
          />
        </Suspense>
      )}
      {view === "data" && (
        <PlanningDataView
          season={season}
          tracks={tracks}
          events={events}
          constraints={constraints}
          macrocycles={macrocycles}
          mesocycles={mesocycles}
          microcycles={microcycles}
          microcycleSegments={microcycleSegments}
          dimensions={dimensions}
          focusDefinitions={focusDefinitions}
          focusSegments={focusSegments}
          trainingDays={trainingDays}
          service={service}
          onChange={reload}
          onNotice={notify}
          onOpenBulk={() => setBulkOpen(true)}
        />
      )}
      {view === "history" && (
        <Suspense fallback={<PlanningViewLoading label="Historie" />}>
          <HistoryView
            seasonId={season.id}
            storage={storage}
            onChange={reload}
          />
        </Suspense>
      )}
      {bulkOpen && (
        <BulkEventsEditor
          seasonId={season.id}
          tracks={tracks}
          events={events}
          macrocycles={macrocycles}
          service={service}
          onClose={() => setBulkOpen(false)}
          onSaved={reload}
          onNotice={notify}
        />
      )}
    </section>
  );
}
