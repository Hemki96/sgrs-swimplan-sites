import type { ConfigurationGroup, ConfigurationValue } from "./types";
import {
  GLOBAL_REVISION_SCOPE_ID,
  type StorageAdapter,
  type StorageCollection,
} from "../storage/StorageAdapter";
import { VersionConflictError } from "../storage/InMemoryStorageAdapter";

export const configurationGroupLabels: Record<ConfigurationGroup, string> = {
  season_status: "Saisonstatus",
  event_priority: "Wettkampfprioritäten",
  event_category: "Wettkampfkategorien",
  calendar_constraint_type: "Kalenderrestriktionstypen",
  calendar_constraint_severity: "Auswirkungen von Restriktionen",
  microcycle_segment_type: "Mikrozyklussegmenttypen",
  requirement_level: "Ausrüstungs-Pflichtgrade",
  periodization_dimension: "Periodisierungsdimensionen",
  focus_definition: "Fokusdefinitionen",
  equipment: "Ausrüstung",
};

const defaults: Array<
  Pick<ConfigurationValue, "group" | "code" | "label" | "parentCode">
> = [
  ["draft", "Entwurf"],
  ["active", "Aktiv"],
  ["completed", "Abgeschlossen"],
  ["archived", "Archiviert"],
].map(([code, label]) => ({ group: "season_status", code, label })) as Array<
  Pick<ConfigurationValue, "group" | "code" | "label">
>;

defaults.push(
  ...["A", "B", "C", "test"].map((code) => ({
    group: "event_priority" as const,
    code,
    label: code === "test" ? "Test" : code,
  })),
  { group: "requirement_level", code: "required", label: "Erforderlich" },
  { group: "requirement_level", code: "recommended", label: "Empfohlen" },
  { group: "requirement_level", code: "optional", label: "Optional" },
  { group: "event_category", code: "KURZBAHN", label: "Kurzbahn" },
  { group: "event_category", code: "LANGBAHN", label: "Langbahn" },
  { group: "calendar_constraint_type", code: "FERIEN", label: "Ferien" },
  { group: "calendar_constraint_type", code: "SPERRZEIT", label: "Sperrzeit" },
  { group: "calendar_constraint_severity", code: "HINWEIS", label: "Hinweis" },
  {
    group: "calendar_constraint_severity",
    code: "EINSCHRAENKUNG",
    label: "Einschränkung",
  },
  { group: "microcycle_segment_type", code: "BELASTUNG", label: "Belastung" },
  { group: "microcycle_segment_type", code: "ENTLASTUNG", label: "Entlastung" },
);

export class ConfigurationService {
  constructor(private readonly storage: StorageAdapter) {}

  async ensureDefaults(): Promise<ConfigurationValue[]> {
    const existing = await this.list(true);
    const keys = new Set(
      existing.map((value) => `${value.group}:${value.code}`),
    );
    const snapshot = await this.storage.exportAll();
    const migrated: Array<Omit<ConfigurationValue, "version">> = [
      ...(snapshot.periodization_dimensions ?? []).map((row) => {
        const value = row as {
          id: string;
          code: string;
          name: string;
          description?: string;
          sortOrder: number;
          active: boolean;
        };
        return {
          id: value.id,
          group: "periodization_dimension" as const,
          code: value.code,
          label: value.name,
          description: value.description,
          sortOrder: value.sortOrder,
          active: value.active,
        };
      }),
      ...(snapshot.focus_definitions ?? []).map((row) => {
        const value = row as {
          id: string;
          code: string;
          name: string;
          description?: string;
          active: boolean;
          dimensionId: string;
        };
        const parent = (snapshot.periodization_dimensions ?? []).find(
          (item) => (item as { id: string }).id === value.dimensionId,
        ) as { code?: string } | undefined;
        return {
          id: value.id,
          group: "focus_definition" as const,
          code: value.code,
          label: value.name,
          description: value.description,
          sortOrder: 0,
          active: value.active,
          parentCode: parent?.code,
        };
      }),
      ...(snapshot.equipment_items ?? []).map((row) => {
        const value = row as {
          id: string;
          code: string;
          name: string;
          sortOrder: number;
          active: boolean;
        };
        return {
          id: value.id,
          group: "equipment" as const,
          code: value.code,
          label: value.name,
          sortOrder: value.sortOrder,
          active: value.active,
        };
      }),
    ];
    const candidates: Array<Omit<ConfigurationValue, "version">> = [
      ...defaults.map((value, sortOrder) => ({
        id: `config-${value.group}-${value.code}`,
        ...value,
        sortOrder,
        active: true,
      })),
      ...migrated,
    ];
    for (const value of candidates) {
      if (keys.has(`${value.group}:${value.code}`)) continue;
      try {
        await this.storage.put<ConfigurationValue>(
          "configuration_values",
          {
            ...value,
            version: 0,
          },
          {
            revision: {
              seasonId: GLOBAL_REVISION_SCOPE_ID,
              editorLabel: "configuration-seed",
            },
          },
        );
      } catch (error) {
        if (!(error instanceof VersionConflictError)) throw error;
      }
      keys.add(`${value.group}:${value.code}`);
    }
    return this.list(true);
  }

  async list(includeDeleted = false) {
    return (
      await this.storage.list<ConfigurationValue>("configuration_values", {
        includeDeleted,
      })
    ).sort(
      (a, b) =>
        a.group.localeCompare(b.group) ||
        a.sortOrder - b.sortOrder ||
        a.label.localeCompare(b.label, "de"),
    );
  }

  save(value: ConfigurationValue) {
    return this.storage.put("configuration_values", value, {
      expectedVersion: value.version || 0,
      revision: { seasonId: GLOBAL_REVISION_SCOPE_ID, editorLabel: "settings" },
    });
  }

  async isReferenced(value: ConfigurationValue): Promise<boolean> {
    const snapshot = await this.storage.exportAll();
    const uses = referenceFields[value.group] ?? [];
    return uses.some(([collection, field]) =>
      (snapshot[collection] ?? []).some((row) => {
        const entity = row as Record<string, unknown>;
        return entity[field] === value.code || entity[field] === value.id;
      }),
    );
  }

  async remove(value: ConfigurationValue) {
    if (await this.isReferenced(value))
      return this.save({ ...value, active: false });
    return this.storage.softDelete("configuration_values", value.id, {
      expectedVersion: value.version,
      revision: { seasonId: GLOBAL_REVISION_SCOPE_ID, editorLabel: "settings" },
    });
  }
}

const referenceFields: Partial<
  Record<ConfigurationGroup, Array<[StorageCollection, string]>>
> = {
  season_status: [["seasons", "status"]],
  event_priority: [["events", "priority"]],
  event_category: [["events", "category"]],
  calendar_constraint_type: [["calendar_constraints", "type"]],
  calendar_constraint_severity: [["calendar_constraints", "severity"]],
  microcycle_segment_type: [["microcycle_segments", "segmentType"]],
  requirement_level: [["session_equipment", "requirementLevel"]],
  periodization_dimension: [["periodization_dimensions", "id"]],
  focus_definition: [["focus_definitions", "id"]],
  equipment: [["equipment_items", "id"]],
};
