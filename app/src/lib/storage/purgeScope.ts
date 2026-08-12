import type { StorageCollection, StorageSnapshot } from "./StorageAdapter";
import { importSeasonScope } from "./importScope";

export interface SeasonScopeSummary {
  entityCount: number;
  revisionCount: number;
}

export function seasonScopeSummary(
  snapshot: StorageSnapshot,
  seasonId: string,
): SeasonScopeSummary {
  let entityCount = 0;
  for (const [collection, entities] of Object.entries(snapshot)) {
    if (collection === "revisions") continue;
    for (const entity of entities ?? []) {
      if (
        importSeasonScope(
          snapshot,
          collection as StorageCollection,
          entity as Record<string, unknown>,
        ) === seasonId
      ) {
        entityCount += 1;
      }
    }
  }
  const revisions = snapshot.revisions ?? [];
  const revisionCount = revisions.filter(
    (revision) => (revision as { seasonId?: string }).seasonId === seasonId,
  ).length;
  return { entityCount, revisionCount };
}
