import { useEffect, useState } from "react";

import type {
  Event,
  FocusDefinition,
  Mesocycle,
  Microcycle,
  Season,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import { TrainerWeekView } from "../training-week/TrainerWeekView";
import { TodayView } from "./TodayView";

export function MobileWeekPlanning({
  season,
  microcycles,
  mesocycles,
  events,
  focusDefinitions,
  days,
  sessions,
  service,
  onChange,
}: {
  season: Season;
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  events: Event[];
  focusDefinitions: FocusDefinition[];
  days: TrainingDay[];
  sessions: TrainingSession[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
}) {
  const isMobile = useMatchMedia("(max-width: 63.999rem)");
  const [tab, setTab] = useState<"today" | "week">("today");
  const common = {
    season,
    microcycles,
    mesocycles,
    focusDefinitions,
    days,
    sessions,
    service,
    onChange,
  };
  if (!isMobile) return <TrainerWeekView {...common} />;
  return (
    <div className="mobile-week-planning">
      <div
        className="segmented-control mobile-start-navigation"
        role="tablist"
        aria-label="Mobile Planung"
      >
        <button
          role="tab"
          aria-selected={tab === "today"}
          className={tab === "today" ? "active" : ""}
          onClick={() => setTab("today")}
        >
          Heute
        </button>
        <button
          role="tab"
          aria-selected={tab === "week"}
          className={tab === "week" ? "active" : ""}
          onClick={() => setTab("week")}
        >
          Diese Woche
        </button>
      </div>
      {tab === "today" ? (
        <TodayView {...common} events={events} />
      ) : (
        <TrainerWeekView {...common} />
      )}
    </div>
  );
}

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
