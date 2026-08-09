import type { Season } from "./types";
import type { StorageAdapter } from "../storage/StorageAdapter";
import { seasonInputSchema, type SeasonInput } from "../validation/domain";

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
}
