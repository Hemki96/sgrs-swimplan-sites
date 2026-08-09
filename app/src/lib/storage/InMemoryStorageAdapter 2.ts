import type { StorageAdapter, ListOptions, PutOptions } from "./StorageAdapter";
export class VersionConflictError extends Error {}
export class InMemoryStorageAdapter implements StorageAdapter {
  private data = new Map<string, Map<string, any>>();
  async get<T>(c: string, id: string) {
    return (this.data.get(c)?.get(id) as T | undefined) ?? null;
  }
  async list<T>(c: string, o: ListOptions = {}) {
    const v = [...(this.data.get(c)?.values() ?? [])];
    return v.filter((x) => o.includeDeleted || !x.deletedAt) as T[];
  }
  async put<T extends { id: string; version: number }>(
    c: string,
    e: T,
    o: PutOptions = {},
  ) {
    const b = this.data.get(c) ?? new Map<string, any>();
    const x = b.get(e.id);
    if (x && o.expectedVersion !== undefined && x.version !== o.expectedVersion)
      throw new VersionConflictError(
        `Expected ${o.expectedVersion}, got ${x.version}`,
      );
    const n = {
      ...e,
      version: (x?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    b.set(e.id, n);
    this.data.set(c, b);
    return n as T;
  }
  async softDelete(c: string, id: string, expectedVersion: number) {
    const x = await this.get<any>(c, id);
    if (!x) return;
    await this.put(
      c,
      { ...x, deletedAt: new Date().toISOString() },
      { expectedVersion },
    );
  }
  async exportAll() {
    return Object.fromEntries(
      [...this.data.entries()].map(([k, v]) => [k, [...v.values()]]),
    );
  }
  async importAll(d: Record<string, unknown[]>) {
    this.data.clear();
    for (const [c, rows] of Object.entries(d))
      this.data.set(c, new Map(rows.map((r: any) => [r.id, r])));
  }
}
