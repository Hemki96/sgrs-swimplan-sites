import { useMemo } from "react";

import type {
  CalendarConstraint,
  Event,
  EventTrack,
  FocusDefinition,
  FocusSegment,
  Macrocycle,
  Mesocycle,
  Microcycle,
  PeriodizationDimension,
  Season,
} from "../../lib/domain/types";
import {
  buildSeasonMatrixViewModel,
  type SeasonMatrixWeek,
} from "./seasonMatrixViewModel";

export interface SeasonMatrixProps {
  season: Season;
  tracks: EventTrack[];
  events: Event[];
  constraints: CalendarConstraint[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  focusSegments: FocusSegment[];
}

interface MatrixBlock {
  id: string;
  label: string;
  detail?: string;
  startDate: string;
  endDate: string;
  tone: string;
}

export interface MatrixRow {
  id: string;
  label: string;
  eyebrow?: string;
  blocks: MatrixBlock[];
  kind: "events" | "constraints" | "macro" | "focus" | "meso" | "rpe";
}

const dimensionOrder = [
  "STRENGTH",
  "AEROBIC",
  "ANAEROBIC",
  "SPEED",
  "TACTICAL",
  "TECHNICAL",
] as const;

const dimensionTones: Record<string, string> = {
  STRENGTH: "clay",
  AEROBIC: "aqua",
  ANAEROBIC: "coral",
  SPEED: "sun",
  TACTICAL: "violet",
  TECHNICAL: "blue",
};

export function SeasonMatrix(props: SeasonMatrixProps) {
  const viewModel = useMemo(
    () =>
      buildSeasonMatrixViewModel({
        season: props.season,
        eventTracks: props.tracks,
      }),
    [props.season, props.tracks],
  );
  const rows = useMemo(() => buildSeasonMatrixRows(props), [props]);
  const monthBands = useMemo(
    () =>
      viewModel.axis.months.map((month, index, months) => {
        const start =
          index === 0
            ? 0
            : weekIndexForDate(viewModel.axis.weeks, month.startDate);
        const nextMonth = months[index + 1];
        const end = nextMonth
          ? weekIndexForDate(viewModel.axis.weeks, nextMonth.startDate)
          : viewModel.axis.weeks.length;
        return { ...month, start, span: Math.max(1, end - start) };
      }),
    [viewModel.axis.months, viewModel.axis.weeks],
  );
  const columnStyle = {
    "--matrix-weeks": viewModel.axis.weeks.length,
  } as React.CSSProperties;

  return (
    <section className="season-matrix-section" aria-labelledby="matrix-title">
      <div className="matrix-heading">
        <div>
          <p className="eyebrow">Jahresübersicht</p>
          <h3 id="matrix-title">Saisonmatrix</h3>
          <p>
            {viewModel.axis.weeks.length} Kalenderwochen · Horizontal scrollen
          </p>
        </div>
        <div className="matrix-legend" aria-label="Legende">
          <span>
            <i className="legend-dot event" />
            Wettkampf
          </span>
          <span>
            <i className="legend-dot phase" />
            Zyklus
          </span>
          <span>
            <i className="legend-dot focus" />
            Fokus
          </span>
        </div>
      </div>

      <div
        className="matrix-scroll"
        tabIndex={0}
        aria-label="Saisonmatrix horizontal scrollen"
      >
        <div className="season-matrix" style={columnStyle}>
          <div className="matrix-corner matrix-month-corner">Saison</div>
          <div className="matrix-months">
            {monthBands.map((month) => (
              <div
                className="matrix-month"
                key={month.id}
                style={{
                  gridColumn: `${month.start + 1} / span ${month.span}`,
                }}
              >
                {month.label}
              </div>
            ))}
          </div>
          <div className="matrix-corner matrix-week-corner">Bereich</div>
          <div className="matrix-weeks">
            {viewModel.axis.weeks.map((week) => (
              <div className="matrix-week" key={week.id}>
                <strong>{week.label.replace("KW ", "")}</strong>
                <span>{shortDate(week.startDate)}</span>
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <MatrixRowView
              key={row.id}
              row={row}
              weeks={viewModel.axis.weeks}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MatrixRowView({
  row,
  weeks,
}: {
  row: MatrixRow;
  weeks: SeasonMatrixWeek[];
}) {
  return (
    <>
      <div className={`matrix-row-label matrix-row-label-${row.kind}`}>
        {row.eyebrow ? <span>{row.eyebrow}</span> : null}
        <strong>{row.label}</strong>
      </div>
      <div className={`matrix-row matrix-row-${row.kind}`}>
        <div className="matrix-grid-lines" aria-hidden="true" />
        {row.blocks.map((block) => {
          const start = weekIndexForDate(weeks, block.startDate);
          const end = weekIndexForDate(weeks, block.endDate);
          return (
            <div
              className={`matrix-block matrix-block-${block.tone}`}
              key={block.id}
              style={{
                gridColumn: `${start + 1} / span ${Math.max(1, end - start + 1)}`,
              }}
              title={`${block.label}: ${formatDate(block.startDate)}–${formatDate(block.endDate)}`}
            >
              <strong>{block.label}</strong>
              {block.detail ? <span>{block.detail}</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Kept beside the component so its row projection and visual contract evolve together.
// eslint-disable-next-line react-refresh/only-export-components
export function buildSeasonMatrixRows(props: SeasonMatrixProps): MatrixRow[] {
  const definitions = new Map(
    props.focusDefinitions.map((definition) => [definition.id, definition]),
  );
  const rows: MatrixRow[] = [...props.tracks]
    .filter((track) => track.visible)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((track) => ({
      id: `track-${track.id}`,
      label: track.name,
      eyebrow: "Events",
      kind: "events" as const,
      blocks: props.events
        .filter((event) => event.trackId === track.id)
        .map((event) => ({
          id: event.id,
          label: event.name,
          detail: event.priority,
          startDate: event.startDate,
          endDate: event.endDate,
          tone: `event-${event.priority.toLowerCase()}`,
        })),
    }));

  if (rows.length === 0) {
    rows.push({
      id: "events",
      label: "Event Tracks",
      kind: "events",
      blocks: [],
    });
  }
  rows.push({
    id: "constraints",
    label: "Restriktionen",
    kind: "constraints",
    blocks: props.constraints.map((constraint) => ({
      id: constraint.id,
      label: constraint.name,
      detail: constraint.type,
      startDate: constraint.startDate,
      endDate: constraint.endDate,
      tone: "constraint",
    })),
  });
  rows.push({
    id: "macro",
    label: "Macro",
    kind: "macro",
    blocks: props.macrocycles.map((cycle) => ({
      id: cycle.id,
      label: cycle.name,
      detail: cycle.goal,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      tone: "macro",
    })),
  });

  for (const code of dimensionOrder) {
    const dimension = props.dimensions.find((item) => item.code === code);
    rows.push({
      id: `focus-${code}`,
      label: dimension?.name ?? titleCase(code),
      eyebrow: "Fokus",
      kind: "focus",
      blocks: dimension
        ? props.focusSegments
            .filter((segment) => segment.dimensionId === dimension.id)
            .map((segment) => ({
              id: segment.id,
              label:
                definitions.get(segment.focusDefinitionId)?.name ?? "Fokus",
              startDate: segment.startDate,
              endDate: segment.endDate,
              tone: dimensionTones[code],
            }))
        : [],
    });
  }

  rows.push({
    id: "meso",
    label: "Meso",
    kind: "meso",
    blocks: props.mesocycles.map((cycle) => ({
      id: cycle.id,
      label: cycle.name,
      detail: cycle.goal,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      tone: "meso",
    })),
  });
  rows.push({
    id: "rpe",
    label: "Micro Target RPE",
    kind: "rpe",
    blocks: props.microcycles.map((cycle) => ({
      id: cycle.id,
      label: String(cycle.targetRpe),
      detail: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      tone: `rpe-${rpeBand(cycle.targetRpe)}`,
    })),
  });
  return rows;
}

function weekIndexForDate(weeks: SeasonMatrixWeek[], date: string): number {
  const index = weeks.findIndex(
    (week) => week.startDate <= date && week.endDate >= date,
  );
  if (index >= 0) return index;
  return date < weeks[0].startDate ? 0 : weeks.length - 1;
}

function rpeBand(rpe: number): string {
  if (rpe <= 3) return "easy";
  if (rpe <= 6) return "steady";
  if (rpe <= 8) return "hard";
  return "max";
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}.${month}.`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
