import type { FocusDefinition, TrainingSession } from "../../lib/domain/types";
import { focus, volume } from "./format";

export function SessionCard({
  session,
  focusDefinitions,
  onClick,
}: {
  session: TrainingSession;
  focusDefinitions: FocusDefinition[];
  onClick?: () => void;
}) {
  return (
    <button
      className={`session-card${session.keySession ? " key" : ""}`}
      type="button"
      onClick={onClick}
    >
      <span className="session-topline">
        <strong>{session.startTime || "Zeit offen"}</strong>
        {session.keySession && <em>KEY</em>}
      </span>
      <span className="session-title">{session.title || "Session"}</span>
      <span className="session-metrics">
        <span>
          <small>Dauer</small>
          {session.durationMinutes ? `${session.durationMinutes} min` : "–"}
        </span>
        <span>
          <small>Umfang</small>
          {volume(session.volumeMeters)}
        </span>
        <span>
          <small>RPE</small>
          {session.expectedRpe ?? "–"}
        </span>
      </span>
      <span className="session-focus">
        <small>Main Focus</small>
        {focus(focusDefinitions, session.mainFocusId)}
      </span>
      <span className="session-focus">
        <small>Technical Focus</small>
        {focus(focusDefinitions, session.technicalFocusId)}
      </span>
      {session.equipment && (
        <span className="session-equipment">
          <small>Equipment</small>
          {session.equipment}
        </span>
      )}
      {session.athleteNote && (
        <span className="session-note">{session.athleteNote}</span>
      )}
    </button>
  );
}
