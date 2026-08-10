import { useEffect, useMemo, useState } from "react";

import { HistoryService, RestoreConflictError } from "../../lib/domain/history";
import type { Revision } from "../../lib/domain/types";
import type { StorageAdapter } from "../../lib/storage/StorageAdapter";

const entityLabels: Record<string, string> = {
  configuration_values: "Konfiguration",
  seasons: "Saison",
  event_tracks: "Eventspur",
  events: "Wettkampf",
  calendar_constraints: "Restriktion",
  macrocycles: "Makrozyklus",
  mesocycles: "Mesozyklus",
  microcycles: "Mikrozyklus",
  microcycle_segments: "Mikrozyklussegment",
  periodization_dimensions: "Dimension",
  focus_definitions: "Fokusdefinition",
  focus_segments: "Fokussegment",
  training_days: "Trainingstag",
  training_sessions: "Trainingseinheit",
  equipment_items: "Ausstattung",
  session_equipment: "Session-Ausstattung",
};

const operationLabels: Record<string, string> = {
  create: "angelegt",
  update: "aktualisiert",
  soft_delete: "gelöscht",
  import: "importiert",
};

export function HistoryView({
  seasonId,
  storage,
  onChange,
}: {
  seasonId: string;
  storage: StorageAdapter;
  onChange: () => Promise<void>;
}) {
  const service = useMemo(() => new HistoryService(storage), [storage]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function reload() {
    setRevisions(await service.listRevisions(seasonId));
  }

  useEffect(() => {
    let active = true;
    void service
      .listRevisions(seasonId)
      .then((rows) => {
        if (active) setRevisions(rows);
      })
      .catch(() => {
        if (active) setNotice("Verlauf konnte nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, [seasonId, service]);

  const entities = useMemo(() => {
    const grouped = new Map<string, { type: string; id: string }>();
    for (const revision of revisions) {
      grouped.set(`${revision.entityType}:${revision.entityId}`, {
        type: revision.entityType,
        id: revision.entityId,
      });
    }
    return [...grouped.values()].sort((left, right) =>
      entityLabel(left.type).localeCompare(entityLabel(right.type), "de"),
    );
  }, [revisions]);

  const visible = useMemo(() => {
    if (entityFilter === "all") return revisions;
    const [type, id] = entityFilter.split(":", 2);
    return revisions.filter(
      (revision) => revision.entityType === type && revision.entityId === id,
    );
  }, [entityFilter, revisions]);

  async function restore(revision: Revision) {
    setRestoringId(revision.id);
    setNotice("");
    try {
      await service.restoreRevision(revision);
      setNotice(
        `${entityLabel(revision.entityType)} „${entityName(revision)}“ wurde wiederhergestellt.`,
      );
      await reload();
      await onChange();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="history-view" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Verlauf & Wiederherstellung</p>
          <h3 id="history-title">Historie</h3>
          <p className="hint">
            Jede Änderung erzeugt eine Revision. Du kannst frühere Zustände
            wiederherstellen – ein Konflikt wird nie still überschrieben.
          </p>
        </div>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <label className="field history-filter">
        <span>Datensatz filtern</span>
        <select
          value={entityFilter}
          onChange={(event) => {
            setEntityFilter(event.target.value);
            setExpandedId(null);
          }}
        >
          <option value="all">Alle Änderungen</option>
          {entities.map((entity) => (
            <option
              key={`${entity.type}:${entity.id}`}
              value={`${entity.type}:${entity.id}`}
            >
              {entityLabel(entity.type)} · {entityId(entity.id)}
            </option>
          ))}
        </select>
      </label>

      {visible.length === 0 ? (
        <div className="empty-state">
          <h3>Noch keine Änderungen</h3>
          <p>
            Hier erscheint der Verlauf, sobald Planungsdaten bearbeitet werden.
          </p>
        </div>
      ) : (
        <ol className="history-list">
          {visible.map((revision) => (
            <li key={revision.id} className="history-item">
              <article>
                <div className="history-item-top">
                  <button
                    className="history-summary"
                    aria-expanded={expandedId === revision.id}
                    onClick={() =>
                      setExpandedId(
                        expandedId === revision.id ? null : revision.id,
                      )
                    }
                  >
                    <span className="history-revision">
                      #{revision.revisionNumber}
                    </span>
                    <span className="history-operation">
                      {entityLabel(revision.entityType)}{" "}
                      {operationLabel(revision.operation)}
                    </span>
                    <span className="history-entity">
                      {entityName(revision)}
                    </span>
                    <span className="history-time">
                      {formatTimestamp(revision.timestamp)}
                    </span>
                  </button>
                  <button
                    className="button quiet"
                    disabled={restoringId !== null}
                    onClick={() => void restore(revision)}
                  >
                    {restoringId === revision.id
                      ? "Stellt her …"
                      : "Wiederherstellen"}
                  </button>
                </div>
                {expandedId === revision.id && (
                  <RevisionDetail revision={revision} />
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RevisionDetail({ revision }: { revision: Revision }) {
  const before = revision.beforeJson as Record<string, unknown> | null;
  const after = revision.afterJson as Record<string, unknown> | null;
  const changes = diffFields(before, after);
  return (
    <div className="history-detail">
      <dl className="history-meta">
        <div>
          <dt>Bearbeiter</dt>
          <dd>{revision.editorLabel ?? "Öffentliche Bearbeitung"}</dd>
        </div>
        <div>
          <dt>Operation</dt>
          <dd>{operationLabel(revision.operation)}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>#{revision.revisionNumber}</dd>
        </div>
      </dl>
      {revision.operation === "soft_delete" ? (
        <p className="hint">
          Datensatz ist gelöscht. Wiederherstellen setzt den Zustand vor dem
          Löschen wieder auf.
        </p>
      ) : changes.length === 0 ? (
        <p className="hint">Keine Feldänderungen sichtbar.</p>
      ) : (
        <table className="history-diff">
          <caption className="sr-only">Geänderte Felder</caption>
          <thead>
            <tr>
              <th scope="col">Feld</th>
              <th scope="col">Vorher</th>
              <th scope="col">Nachher</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(([field, oldValue, newValue]) => (
              <tr key={field}>
                <th scope="row">{field}</th>
                <td>{oldValue}</td>
                <td>{newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<[string, string, string]> {
  const keys = new Set([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : []),
  ]);
  const changes: Array<[string, string, string]> = [];
  for (const key of keys) {
    if (key === "updatedAt" || key === "version" || key === "deletedAt") {
      continue;
    }
    const oldValue = before ? before[key] : undefined;
    const newValue = after ? after[key] : undefined;
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push([key, displayValue(oldValue), displayValue(newValue)]);
    }
  }
  return changes;
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "–";
  if (typeof value === "boolean") return value ? "ja" : "nein";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function entityLabel(type: string): string {
  return entityLabels[type] ?? type;
}

function entityId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 10)}…` : id;
}

function entityName(revision: Revision): string {
  const state = (revision.afterJson ?? revision.beforeJson) as Record<
    string,
    unknown
  > | null;
  const name = state?.name;
  return typeof name === "string" && name
    ? `„${name}“`
    : entityId(revision.entityId);
}

function operationLabel(operation: string): string {
  return operationLabels[operation] ?? operation;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof RestoreConflictError || error instanceof Error) {
    return error.message;
  }
  return "Wiederherstellen fehlgeschlagen. Bitte erneut versuchen.";
}
