import { useEffect, useState, type FormEvent } from "react";

import type { SeasonPlanningService } from "../../lib/domain/seasonPlanning";
import type {
  EquipmentItem,
  FocusDefinition,
  PeriodizationDimension,
  RequirementLevel,
  SessionEquipment,
  TrainingDay,
  TrainingSession,
} from "../../lib/domain/types";
import {
  equipmentItemInputSchema,
  trainingSessionInputSchema,
  type EquipmentItemInput,
  type TrainingSessionInput,
} from "../../lib/validation/domain";

interface Props {
  seasonId: string;
  days: TrainingDay[];
  sessions: TrainingSession[];
  dimensions: PeriodizationDimension[];
  focusDefinitions: FocusDefinition[];
  service: SeasonPlanningService;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
}

const blankEquipment: EquipmentItemInput = {
  name: "",
  code: "",
  active: true,
  sortOrder: 0,
};

export function TrainingSessionEquipmentManagement(props: Props) {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [links, setLinks] = useState<Record<string, SessionEquipment[]>>({});

  async function reloadEquipment() {
    const [items, rows] = await Promise.all([
      props.service.listEquipment(props.seasonId),
      Promise.all(
        props.sessions.map(
          async (session) =>
            [
              session.id,
              await props.service.listSessionEquipment(session.id),
            ] as const,
        ),
      ),
    ]);
    setEquipment(items);
    setLinks(Object.fromEntries(rows));
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      props.service.listEquipment(props.seasonId),
      Promise.all(
        props.sessions.map(
          async (session) =>
            [
              session.id,
              await props.service.listSessionEquipment(session.id),
            ] as const,
        ),
      ),
    ]).then(([items, rows]) => {
      if (!active) return;
      setEquipment(items);
      setLinks(Object.fromEntries(rows));
    });
    return () => {
      active = false;
    };
  }, [props.seasonId, props.service, props.sessions]);

  return (
    <>
      <EquipmentCatalog
        {...props}
        equipment={equipment}
        reload={reloadEquipment}
      />
      <SessionList
        {...props}
        equipment={equipment}
        links={links}
        reloadEquipment={reloadEquipment}
      />
    </>
  );
}

function EquipmentCatalog({
  seasonId,
  service,
  onNotice,
  equipment,
  reload,
}: Props & { equipment: EquipmentItem[]; reload: () => Promise<void> }) {
  const [form, setForm] = useState<EquipmentItemInput>(blankEquipment);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = equipmentItemInputSchema.safeParse(form);
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    try {
      if (editing) await service.updateEquipmentItem(editing, parsed.data);
      else await service.createEquipmentItem(seasonId, parsed.data);
      onNotice(
        editing ? "Equipment wurde aktualisiert." : "Equipment wurde angelegt.",
      );
      setEditing(null);
      setForm({ ...blankEquipment, sortOrder: equipment.length });
      setError("");
      await reload();
    } catch (cause) {
      setError(message(cause));
    }
  }

  return (
    <section className="planning-section" aria-label="Equipment">
      <div className="section-heading">
        <h3>Equipment</h3>
        <span>{equipment.length}</span>
      </div>
      <form
        className="compact-form equipment-form"
        onSubmit={submit}
        noValidate
      >
        <label className="field">
          <span>Name</span>
          <input
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              setForm({
                ...form,
                name,
                code: editing ? form.code : toCode(name),
              });
            }}
          />
        </label>
        <label className="field">
          <span>Code</span>
          <input
            value={form.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.toUpperCase() })
            }
          />
        </label>
        <label className="field">
          <span>Reihenfolge</span>
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(event) =>
              setForm({ ...form, sortOrder: Number(event.target.value) })
            }
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm({ ...form, active: event.target.checked })
            }
          />{" "}
          Aktiv
        </label>
        <button className="button primary" type="submit">
          {editing ? "Equipment speichern" : "Equipment anlegen"}
        </button>
        {error && <p className="field-error form-error">{error}</p>}
      </form>
      <div className="equipment-catalog">
        {equipment.map((item) => (
          <div
            className={`equipment-catalog-item${item.active ? "" : " inactive"}`}
            key={item.id}
          >
            <span>
              <strong>{item.name}</strong>
              <small>{item.code}</small>
            </span>
            <div className="card-actions">
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  setEditing(item);
                  setForm({
                    name: item.name,
                    code: item.code,
                    active: item.active,
                    sortOrder: item.sortOrder,
                  });
                }}
              >
                Bearbeiten
              </button>
              <button
                className="button danger"
                type="button"
                onClick={() =>
                  void service
                    .deleteEquipmentItem(item)
                    .then(reload)
                    .then(() => onNotice("Equipment wurde gelöscht."))
                    .catch((cause) => onNotice(message(cause)))
                }
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionList({
  seasonId,
  days,
  sessions,
  dimensions,
  focusDefinitions,
  service,
  onChange,
  onNotice,
  equipment,
  links,
  reloadEquipment,
}: Props & {
  equipment: EquipmentItem[];
  links: Record<string, SessionEquipment[]>;
  reloadEquipment: () => Promise<void>;
}) {
  const technicalDimension = dimensions.find(
    (item) => item.code === "TECHNICAL",
  )?.id;
  const technical = focusDefinitions.filter(
    (item) => item.active && item.dimensionId === technicalDimension,
  );
  const main = focusDefinitions.filter(
    (item) => item.active && item.dimensionId !== technicalDimension,
  );
  const blank: TrainingSessionInput = {
    trainingDayId: days[0]?.id ?? "",
    title: "",
    startTime: "",
    durationMinutes: 60,
    volumeMeters: 0,
    expectedRpe: 5,
    mainFocusId: main[0]?.id ?? "",
    technicalFocusId: technical[0]?.id ?? "",
    keySession: false,
    athleteNote: "",
    equipment: "",
  };
  const [form, setForm] = useState<TrainingSessionInput>(blank);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = trainingSessionInputSchema.safeParse(form);
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    try {
      await service.saveTrainingSession(seasonId, parsed.data);
      setForm(blank);
      setError("");
      onNotice("Session wurde angelegt.");
      await onChange();
    } catch (cause) {
      setError(message(cause));
    }
  }

  return (
    <section className="planning-section" aria-label="Training Sessions">
      <div className="section-heading">
        <h3>Training Sessions</h3>
        <span>{sessions.length}</span>
      </div>
      {days.length > 0 && main.length > 0 && technical.length > 0 ? (
        <form className="entity-form" onSubmit={submit} noValidate>
          <label className="field">
            <span>Trainingstag</span>
            <select
              value={form.trainingDayId}
              onChange={(event) =>
                setForm({ ...form, trainingDayId: event.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.date}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Titel</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Uhrzeit</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm({ ...form, startTime: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Dauer (Min.)</span>
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(event) =>
                setForm({
                  ...form,
                  durationMinutes: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="field">
            <span>Umfang (m)</span>
            <input
              type="number"
              min="0"
              value={form.volumeMeters}
              onChange={(event) =>
                setForm({ ...form, volumeMeters: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>Expected RPE</span>
            <input
              type="number"
              min="1"
              max="10"
              value={form.expectedRpe}
              onChange={(event) =>
                setForm({ ...form, expectedRpe: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>Main Focus</span>
            <select
              value={form.mainFocusId}
              onChange={(event) =>
                setForm({ ...form, mainFocusId: event.target.value })
              }
            >
              {main.map((focus) => (
                <option key={focus.id} value={focus.id}>
                  {focus.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Technical Focus</span>
            <select
              value={form.technicalFocusId}
              onChange={(event) =>
                setForm({ ...form, technicalFocusId: event.target.value })
              }
            >
              {technical.map((focus) => (
                <option key={focus.id} value={focus.id}>
                  {focus.name}
                </option>
              ))}
            </select>
          </label>
          <div className="entity-actions">
            <button className="button primary" type="submit">
              Session anlegen
            </button>
          </div>
          {error && <p className="field-error form-error">{error}</p>}
        </form>
      ) : (
        <p className="hint">
          Lege zuerst einen Trainingstag sowie Main und Technical Focus an.
        </p>
      )}
      <div className="session-list">
        {sessions.map((session) => {
          const assigned = links[session.id] ?? [];
          const required = assigned.filter(
            (link) => link.requirementLevel === "required",
          );
          return (
            <article className="session-card" key={session.id}>
              <div className="session-card-heading">
                <div>
                  <strong>{session.title || "Training Session"}</strong>
                  <span>
                    {session.startTime} · {session.durationMinutes} min ·{" "}
                    {session.volumeMeters} m · RPE {session.expectedRpe}
                  </span>
                </div>
              </div>
              {required.length > 0 && (
                <div className="required-equipment" role="note">
                  <strong>Required Equipment</strong>
                  <span>
                    {required
                      .map(
                        (link) =>
                          equipment.find((item) => item.id === link.equipmentId)
                            ?.name,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
              <div
                className="equipment-assignment"
                aria-label={`Equipment für ${session.title || "Session"}`}
              >
                {equipment
                  .filter((item) => item.active)
                  .map((item) => {
                    const value =
                      assigned.find((link) => link.equipmentId === item.id)
                        ?.requirementLevel ?? "";
                    return (
                      <label key={item.id}>
                        <span>{item.name}</span>
                        <select
                          aria-label={`${item.name} Status`}
                          value={value}
                          onChange={(event) =>
                            void service
                              .setSessionEquipment(
                                seasonId,
                                session.id,
                                item.id,
                                (event.target.value ||
                                  null) as RequirementLevel | null,
                              )
                              .then(reloadEquipment)
                              .then(() =>
                                onNotice(
                                  "Session-Equipment wurde aktualisiert.",
                                ),
                              )
                              .catch((cause) => onNotice(message(cause)))
                          }
                        >
                          <option value="">Nicht benötigt</option>
                          <option value="required">Required</option>
                          <option value="recommended">Recommended</option>
                          <option value="optional">Optional</option>
                        </select>
                      </label>
                    );
                  })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function message(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Die Änderung konnte nicht gespeichert werden.";
}
function toCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
