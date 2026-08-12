import type { Season } from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import {
  normalizeSeasonName,
  seasonInputSchema,
  type SeasonInput,
} from "../validation/domain";

export interface SeasonDomainDependencies {
  createId?: () => string;
  now?: () => string;
}

export class SeasonService {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly storage: StorageAdapter,
    dependencies: SeasonDomainDependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  list(): Promise<Season[]> {
    return this.storage.list<Season>("seasons");
  }

  async create(input: SeasonInput): Promise<Season> {
    const values = seasonInputSchema.parse(input);
    await this.assertUniqueName(values.name);
    const timestamp = this.now();
    const season: Season = {
      id: this.createId(),
      ...values,
      version: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return this.storage.put("seasons", season, {
      expectedVersion: 0,
      revision: { seasonId: season.id, editorLabel: "public" },
    });
  }

  async update(season: Season, input: SeasonInput): Promise<Season> {
    const values = seasonInputSchema.parse(input);
    await this.assertUniqueName(values.name, season.id);
    return this.storage.put(
      "seasons",
      { ...season, ...values },
      {
        expectedVersion: season.version,
        revision: { seasonId: season.id, editorLabel: "public" },
      },
    );
  }

  delete(season: Season): Promise<void> {
    return this.storage.softDelete("seasons", season.id, {
      expectedVersion: season.version,
      revision: { seasonId: season.id, editorLabel: "public" },
    });
  }

  async restore(id: string): Promise<Season> {
    const seasons = await this.storage.list<Season>("seasons", {
      includeDeleted: true,
    });
    const deleted = seasons.find(
      (season) => season.id === id && season.deletedAt,
    );
    if (!deleted) throw new Error("Deleted season not found");
    await this.assertUniqueName(deleted.name, deleted.id);
    return this.storage.put(
      "seasons",
      { ...deleted, deletedAt: null },
      {
        expectedVersion: deleted.version,
        revision: { seasonId: deleted.id, editorLabel: "public" },
      },
    );
  }

  purge(season: Season): Promise<void> {
    if (!season.deletedAt) {
      return Promise.reject(
        new Error("Season must be soft deleted before it can be purged"),
      );
    }
    return this.storage.purgeSeason(season.id);
  }

  private async assertUniqueName(name: string, exceptId?: string) {
    const normalized = normalizeSeasonName(name);
    const seasons = await this.storage.list<Season>("seasons", {
      includeDeleted: true,
    });
    if (
      seasons.some(
        (season) =>
          season.id !== exceptId &&
          normalizeSeasonName(season.name) === normalized,
      )
    ) {
      throw new Error("Eine Saison mit diesem Namen existiert bereits.");
    }
  }
}
