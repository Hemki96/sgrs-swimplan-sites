import { useMemo, useState } from "react";

import {
  generateCycleSuggestions,
  validateSuggestionHierarchy,
  type CycleSuggestionResult,
  type MacrocycleSuggestion,
  type MesocycleSuggestion,
  type MicrocycleSuggestion,
} from "../../lib/domain/cycleSuggestions";
import {
  PlanningValidationError,
  type SeasonPlanningService,
} from "../../lib/domain/seasonPlanning";
import type { UndoRequest } from "../../lib/domain/history";
import type {
  Event,
  ISODate,
  Macrocycle,
  Mesocycle,
  Microcycle,
  Season,
} from "../../lib/domain/types";

interface Props {
  season: Season;
  events: Event[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
  onNotice: (message: string, undo?: UndoRequest) => void;
}

interface EditableMacro extends MacrocycleSuggestion {
  id: string;
  included: boolean;
}

interface EditableMeso extends MesocycleSuggestion {
  id: string;
  macroId: string;
  included: boolean;
}

interface EditableMicro extends MicrocycleSuggestion {
  id: string;
  mesoId: string;
  included: boolean;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function CycleSuggestionPanel(props: Props) {
  const {
    season,
    events,
    macrocycles,
    mesocycles,
    microcycles,
    service,
    onChange,
    onNotice,
  } = props;

  const [suggestion, setSuggestion] = useState<CycleSuggestionResult | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [editMacros, setEditMacros] = useState<EditableMacro[]>([]);
  const [editMesos, setEditMesos] = useState<EditableMeso[]>([]);
  const [editMicros, setEditMicros] = useState<EditableMicro[]>([]);
  const [saving, setSaving] = useState(false);

  const hierarchyIssues = useMemo(() => {
    if (!editMode) return [];
    return validateSuggestionHierarchy(editMacros);
  }, [editMode, editMacros]);

  const summary = useMemo(() => {
    if (!suggestion) {
      return null;
    }
    const macroCount = suggestion.macros.length;
    const mesoCount = suggestion.macros.reduce(
      (sum, m) => sum + m.mesocycles.length,
      0,
    );
    const microCount = suggestion.macros.reduce(
      (sum, m) =>
        sum + m.mesocycles.reduce((ms, me) => ms + me.microcycles.length, 0),
      0,
    );
    const aCount = events.filter((e) => e.priority === "A").length;
    const bCount = events.filter((e) => e.priority === "B").length;
    return { macroCount, mesoCount, microCount, aCount, bCount };
  }, [suggestion, events]);

  function handleGenerate() {
    const result = generateCycleSuggestions(season, events, {
      macrocycles,
      mesocycles,
      microcycles,
    });
    setSuggestion(result);
    setEditMode(false);
    setEditMacros([]);
    setEditMesos([]);
    setEditMicros([]);
  }

  function handleEdit() {
    if (!suggestion) return;
    const macros: EditableMacro[] = suggestion.macros.map((m) => ({
      ...m,
      id: nextId("macro"),
      included: true,
    }));
    const mesos: EditableMeso[] = [];
    const micros: EditableMicro[] = [];

    for (const macro of macros) {
      for (const meso of macro.mesocycles) {
        const mesoId = nextId("meso");
        mesos.push({
          ...meso,
          id: mesoId,
          macroId: macro.id,
          included: true,
        });
        for (const micro of meso.microcycles) {
          micros.push({
            ...micro,
            id: nextId("micro"),
            mesoId,
            included: true,
          });
        }
      }
    }

    setEditMacros(macros);
    setEditMesos(mesos);
    setEditMicros(micros);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setEditMacros([]);
    setEditMesos([]);
    setEditMicros([]);
  }

  async function handleAccept() {
    const targetMacros = editMode
      ? editMacros
      : toEditableMacros(suggestion?.macros ?? []);

    if (targetMacros.length === 0) return;

    setSaving(true);
    try {
      let mesoTotal = 0;
      let microTotal = 0;

      for (const macro of targetMacros) {
        if (!macro.included) continue;
        const macroEntity = await service.createMacrocycle(season.id, {
          name: macro.name,
          startDate: macro.proposedStartDate,
          endDate: macro.proposedEndDate,
          goal: macro.reason,
          targetEventId: macro.targetEvent?.id,
          notes: "",
        });

        const mesosForMacro = editMode
          ? editMesos.filter((me) => me.macroId === macro.id)
          : editableMesosForMacro(macro.id, macro.mesocycles);

        for (const meso of mesosForMacro) {
          if (!meso.included) continue;
          mesoTotal += 1;
          const mesoEntity = await service.createMesocycle({
            macrocycleId: macroEntity.id,
            name: meso.name,
            startDate: meso.proposedStartDate,
            endDate: meso.proposedEndDate,
            goal: meso.reason,
            notes: "",
          });

          const microsForMeso = editMode
            ? editMicros.filter((mi) => mi.mesoId === meso.id)
            : editableMicrosForMeso(meso.id, meso.microcycles);

          for (const micro of microsForMeso) {
            if (!micro.included) continue;
            microTotal += 1;
            await service.createMicrocycle({
              mesocycleId: mesoEntity.id,
              name: micro.name || "Micro",
              startDate: micro.proposedStartDate,
              endDate: micro.proposedEndDate,
              goal: "",
              targetRpe: 5,
            });
          }
        }
      }

      onNotice(
        `${targetMacros.filter((m) => m.included).length} Makrozyklen, ${mesoTotal} Mesozyklen und ${microTotal} Mikrozyklen übernommen.`,
      );
      setSuggestion(null);
      setEditMode(false);
      await onChange();
    } catch (error) {
      onNotice(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setSuggestion(null);
    setEditMode(false);
    setEditMacros([]);
    setEditMesos([]);
    setEditMicros([]);
  }

  function updateMacroName(id: string, name: string) {
    setEditMacros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m)),
    );
  }

  function updateMacroDates(
    id: string,
    field: "proposedStartDate" | "proposedEndDate",
    value: ISODate,
  ) {
    setEditMacros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  }

  function updateMesoName(id: string, name: string) {
    setEditMesos((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
  }

  function updateMesoDates(
    id: string,
    field: "proposedStartDate" | "proposedEndDate",
    value: ISODate,
  ) {
    setEditMesos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  }

  function toggleIncluded(type: "macro" | "meso" | "micro", id: string) {
    if (type === "macro") {
      setEditMacros((prev) =>
        prev.map((m) => (m.id === id ? { ...m, included: !m.included } : m)),
      );
    } else if (type === "meso") {
      setEditMesos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, included: !m.included } : m)),
      );
    } else {
      setEditMicros((prev) =>
        prev.map((m) => (m.id === id ? { ...m, included: !m.included } : m)),
      );
    }
  }

  function removeSuggestion(type: "macro" | "meso" | "micro", id: string) {
    if (type === "macro") {
      setEditMacros((prev) => prev.filter((m) => m.id !== id));
      setEditMesos((prev) => prev.filter((m) => m.macroId !== id));
    } else if (type === "meso") {
      setEditMesos((prev) => prev.filter((m) => m.id !== id));
      setEditMicros((prev) => prev.filter((m) => m.mesoId !== id));
    } else {
      setEditMicros((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function updateMacroTargetEvent(id: string, targetEventId: string) {
    const targetEvent = events.find((event) => event.id === targetEventId);
    setEditMacros((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, targetEvent: targetEvent ?? undefined } : m,
      ),
    );
  }

  function updateMicroName(id: string, name: string) {
    setEditMicros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m)),
    );
  }

  function updateMicroDates(
    id: string,
    field: "proposedStartDate" | "proposedEndDate",
    value: ISODate,
  ) {
    setEditMicros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  }

  function addMacro() {
    const lastEnd = editMacros.reduce(
      (max, m) => (m.proposedEndDate > max ? m.proposedEndDate : max),
      "",
    );
    const startDate =
      lastEnd && lastEnd < season.endDate
        ? addDaysIso(lastEnd, 1)
        : season.startDate;
    const endDate = startDate < season.endDate ? season.endDate : startDate;

    setEditMacros((prev) => [
      ...prev,
      {
        proposedStartDate: startDate,
        proposedEndDate: endDate,
        name: `Makro ${prev.length + 1} – Manuell`,
        reason: "Manuell hinzugefügt",
        mesocycles: [],
        id: nextId("macro"),
        included: true,
      },
    ]);
  }

  function addMeso(macroId: string) {
    const macro = editMacros.find((m) => m.id === macroId);
    if (!macro) return;
    const mesos = editMesos.filter((meso) => meso.macroId === macroId);
    const lastEnd = mesos.reduce(
      (max, m) => (m.proposedEndDate > max ? m.proposedEndDate : max),
      "",
    );
    const startDate =
      lastEnd && lastEnd < macro.proposedEndDate
        ? addDaysIso(lastEnd, 1)
        : macro.proposedStartDate;
    const endDate =
      startDate < macro.proposedEndDate ? macro.proposedEndDate : startDate;
    const mesoNumber = mesos.length + 1;
    const macroNumber = macro.name.match(/^Makro (\d+)/)?.[1] ?? "1";

    const mesoId = nextId("meso");
    setEditMesos((prev) => [
      ...prev,
      {
        proposedStartDate: startDate,
        proposedEndDate: endDate,
        name: `Meso ${macroNumber}.${mesoNumber}`,
        reason: "Manuell hinzugefügt",
        microcycles: [],
        id: mesoId,
        macroId,
        included: true,
      },
    ]);
  }

  function addMicro(mesoId: string) {
    const meso = editMesos.find((m) => m.id === mesoId);
    if (!meso) return;
    const micros = editMicros.filter((m) => m.mesoId === mesoId);
    const lastEnd = micros.reduce(
      (max, m) => (m.proposedEndDate > max ? m.proposedEndDate : max),
      "",
    );
    const startDate =
      lastEnd && lastEnd < meso.proposedEndDate
        ? addDaysIso(lastEnd, 1)
        : meso.proposedStartDate;
    const endDate =
      startDate < meso.proposedEndDate ? meso.proposedEndDate : startDate;

    setEditMicros((prev) => [
      ...prev,
      {
        name: `Micro ${micros.length + 1}`,
        proposedStartDate: startDate,
        proposedEndDate: endDate,
        reason: "Manuell hinzugefügt",
        id: nextId("micro"),
        mesoId,
        included: true,
      },
    ]);
  }

  const hasExistingCycles =
    macrocycles.length > 0 || mesocycles.length > 0 || microcycles.length > 0;

  return (
    <section
      className="planning-section"
      aria-label="Automatische Periodisierung"
    >
      <div className="section-heading">
        <h3>Automatische Periodisierung</h3>
        {summary && <span>{summary.macroCount} Makros</span>}
      </div>

      {!suggestion && (
        <div className="suggestion-prompt">
          <p className="hint">
            Aus den eingetragenen Wettkämpfen automatisch Makro-, Meso- und
            Mikrozyklen vorschlagen lassen.
          </p>
          {hasExistingCycles && (
            <p className="hint warn">
              Für einen Teil des Saisonzeitraums existiert bereits eine Planung.
              Vorschläge werden zusätzlich angezeigt, bestehende Zyklen werden
              nicht überschrieben.
            </p>
          )}
          <button
            className="button primary"
            type="button"
            onClick={handleGenerate}
          >
            Zyklen aus Wettkämpfen vorschlagen
          </button>
        </div>
      )}

      {suggestion && !editMode && (
        <div className="suggestion-preview">
          {summary && (
            <p className="suggestion-summary">
              {summary.aCount} A-Wettkämpfe erkannt · {summary.bCount}{" "}
              B-Wettkämpfe erkannt · {summary.macroCount} Makrozyklen
              vorgeschlagen · {summary.mesoCount} Mesozyklen vorschlagen ·{" "}
              {summary.microCount} Mikrozyklen vorgeschlagen
            </p>
          )}

          {suggestion.warnings.length > 0 && (
            <ul className="suggestion-warnings">
              {suggestion.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="suggestion-tree">
            {suggestion.macros.map((macro, macroIndex) => (
              <article className="suggestion-macro" key={`macro-${macroIndex}`}>
                <div className="suggestion-header">
                  <strong>{macro.name}</strong>
                  <span>
                    {formatDate(macro.proposedStartDate)} –{" "}
                    {formatDate(macro.proposedEndDate)}
                  </span>
                  {macro.targetEvent && (
                    <span className="badge">
                      Ziel: {macro.targetEvent.name}
                    </span>
                  )}
                </div>
                <div className="suggestion-mesos">
                  {macro.mesocycles.map((meso, mesoIndex) => (
                    <div className="suggestion-meso" key={`meso-${mesoIndex}`}>
                      <div className="suggestion-subheader">
                        <strong>{meso.name}</strong>
                        <span>
                          {formatDate(meso.proposedStartDate)} –{" "}
                          {formatDate(meso.proposedEndDate)}
                        </span>
                        {meso.boundaryEvent && (
                          <span className="badge">
                            B: {meso.boundaryEvent.name}
                          </span>
                        )}
                      </div>
                      <div className="suggestion-micros">
                        {meso.microcycles.map((micro, microIndex) => (
                          <span
                            className="micro-chip"
                            key={`micro-${microIndex}`}
                          >
                            {formatDate(micro.proposedStartDate)} –{" "}
                            {formatDate(micro.proposedEndDate)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="suggestion-actions">
            <button
              className="button primary"
              type="button"
              onClick={handleAccept}
            >
              Alle übernehmen
            </button>
            <button className="button quiet" type="button" onClick={handleEdit}>
              Vorschlag bearbeiten
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={handleGenerate}
            >
              Neu berechnen
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={handleCancel}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {suggestion && editMode && (
        <div className="suggestion-edit">
          <p className="hint">
            Vorschläge bearbeiten. Änderungen werden erst nach Klick auf
            „Übernehmen" gespeichert.
          </p>

          {suggestion.warnings.length > 0 && (
            <ul className="suggestion-warnings">
              {suggestion.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}

          {hierarchyIssues.length > 0 && (
            <ul className="suggestion-warnings hierarchy-warning">
              {hierarchyIssues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          )}

          <div className="suggestion-tree">
            {editMacros.map((macro) => (
              <article
                className={`suggestion-macro${macro.included ? "" : " excluded"}`}
                key={macro.id}
              >
                <div className="suggestion-header editable">
                  <label className="field compact">
                    <span className="sr-only">Name</span>
                    <input
                      value={macro.name}
                      onChange={(e) =>
                        updateMacroName(macro.id, e.target.value)
                      }
                    />
                  </label>
                  <label className="field compact">
                    <span className="sr-only">Startdatum</span>
                    <input
                      type="date"
                      value={macro.proposedStartDate}
                      onChange={(e) =>
                        updateMacroDates(
                          macro.id,
                          "proposedStartDate",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label className="field compact">
                    <span className="sr-only">Enddatum</span>
                    <input
                      type="date"
                      value={macro.proposedEndDate}
                      onChange={(e) =>
                        updateMacroDates(
                          macro.id,
                          "proposedEndDate",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label className="field compact">
                    <span className="sr-only">Zielwettkampf</span>
                    <select
                      value={macro.targetEvent?.id ?? ""}
                      onChange={(e) =>
                        updateMacroTargetEvent(macro.id, e.target.value)
                      }
                    >
                      <option value="">Kein Zielwettkampf</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="check-field compact">
                    <input
                      type="checkbox"
                      checked={macro.included}
                      onChange={() => toggleIncluded("macro", macro.id)}
                    />
                    Übernehmen
                  </label>
                  <button
                    className="button danger small"
                    type="button"
                    onClick={() => removeSuggestion("macro", macro.id)}
                    aria-label={`Makrozyklus ${macro.name} entfernen`}
                  >
                    ×
                  </button>
                </div>
                <div className="suggestion-mesos">
                  {editMesos
                    .filter((meso) => meso.macroId === macro.id)
                    .map((meso) => (
                      <div
                        className={`suggestion-meso${meso.included ? "" : " excluded"}`}
                        key={meso.id}
                      >
                        <div className="suggestion-subheader editable">
                          <label className="field compact">
                            <span className="sr-only">Meso-Name</span>
                            <input
                              value={meso.name}
                              onChange={(e) =>
                                updateMesoName(meso.id, e.target.value)
                              }
                            />
                          </label>
                          <label className="field compact">
                            <span className="sr-only">Meso-Startdatum</span>
                            <input
                              type="date"
                              value={meso.proposedStartDate}
                              onChange={(e) =>
                                updateMesoDates(
                                  meso.id,
                                  "proposedStartDate",
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field compact">
                            <span className="sr-only">Meso-Enddatum</span>
                            <input
                              type="date"
                              value={meso.proposedEndDate}
                              onChange={(e) =>
                                updateMesoDates(
                                  meso.id,
                                  "proposedEndDate",
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="check-field compact">
                            <input
                              type="checkbox"
                              checked={meso.included}
                              onChange={() => toggleIncluded("meso", meso.id)}
                            />
                            Übernehmen
                          </label>
                          <button
                            className="button danger small"
                            type="button"
                            onClick={() => removeSuggestion("meso", meso.id)}
                            aria-label={`Mesozyklus ${meso.name} entfernen`}
                          >
                            ×
                          </button>
                        </div>
                        <div className="suggestion-micros">
                          {editMicros
                            .filter((micro) => micro.mesoId === meso.id)
                            .map((micro) => (
                              <span
                                className={`micro-chip${micro.included ? "" : " excluded"}`}
                                key={micro.id}
                              >
                                <label className="field compact">
                                  <span className="sr-only">Mikro-Name</span>
                                  <input
                                    value={micro.name}
                                    onChange={(e) =>
                                      updateMicroName(micro.id, e.target.value)
                                    }
                                  />
                                </label>
                                <label className="field compact">
                                  <span className="sr-only">Mikro-Start</span>
                                  <input
                                    type="date"
                                    value={micro.proposedStartDate}
                                    onChange={(e) =>
                                      updateMicroDates(
                                        micro.id,
                                        "proposedStartDate",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className="field compact">
                                  <span className="sr-only">Mikro-Ende</span>
                                  <input
                                    type="date"
                                    value={micro.proposedEndDate}
                                    onChange={(e) =>
                                      updateMicroDates(
                                        micro.id,
                                        "proposedEndDate",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className="check-field compact">
                                  <input
                                    type="checkbox"
                                    checked={micro.included}
                                    onChange={() =>
                                      toggleIncluded("micro", micro.id)
                                    }
                                  />
                                </label>
                                <button
                                  className="button danger small"
                                  type="button"
                                  onClick={() =>
                                    removeSuggestion("micro", micro.id)
                                  }
                                  aria-label="Mikrozyklus entfernen"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          <button
                            className="button quiet small"
                            type="button"
                            onClick={() => addMicro(meso.id)}
                          >
                            + Mikrozyklus
                          </button>
                        </div>
                      </div>
                    ))}
                  <button
                    className="button quiet small"
                    type="button"
                    onClick={() => addMeso(macro.id)}
                  >
                    + Mesozyklus
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="suggestion-actions">
            <button
              className="button primary"
              type="button"
              onClick={handleAccept}
              disabled={saving}
            >
              {saving ? "Speichert …" : "Übernehmen"}
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={addMacro}
              disabled={saving}
            >
              + Makrozyklus
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={handleGenerate}
              disabled={saving}
            >
              Neu berechnen
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Zurück zur Vorschau
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={handleCancel}
              disabled={saving}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function toEditableMacros(macros: MacrocycleSuggestion[]): EditableMacro[] {
  const result: EditableMacro[] = [];
  for (const macro of macros) {
    const macroId = nextId("macro");
    result.push({ ...macro, id: macroId, included: true });
  }
  return result;
}

function editableMesosForMacro(
  macroId: string,
  mesocycles: MesocycleSuggestion[],
): EditableMeso[] {
  return mesocycles.map((meso) => ({
    ...meso,
    id: nextId("meso"),
    macroId,
    included: true,
  }));
}

function editableMicrosForMeso(
  mesoId: string,
  microcycles: MicrocycleSuggestion[],
): EditableMicro[] {
  return microcycles.map((micro) => ({
    ...micro,
    id: nextId("micro"),
    mesoId,
    included: true,
  }));
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function addDaysIso(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function errorMessage(error: unknown): string {
  return error instanceof PlanningValidationError || error instanceof Error
    ? error.message
    : "Die Änderung konnte nicht gespeichert werden. Bitte neu laden.";
}
