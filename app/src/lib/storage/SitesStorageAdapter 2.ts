import type { StorageAdapter, ListOptions, PutOptions } from "./StorageAdapter";
/** Do not implement against an invented API. Verify actual ChatGPT Sites runtime bindings first and document them in an ADR. */
export class SitesStorageAdapter implements StorageAdapter {
  private no(): never {
    throw new Error(
      "SitesStorageAdapter requires verified ChatGPT Sites runtime bindings.",
    );
  }
  get<T>(_c: string, _id: string): Promise<T | null> {
    return this.no();
  }
  list<T>(_c: string, _o?: ListOptions): Promise<T[]> {
    return this.no();
  }
  put<T extends { id: string; version: number }>(
    _c: string,
    _e: T,
    _o?: PutOptions,
  ): Promise<T> {
    return this.no();
  }
  softDelete(_c: string, _id: string, _v: number): Promise<void> {
    return this.no();
  }
  exportAll(): Promise<Record<string, unknown[]>> {
    return this.no();
  }
  importAll(_d: Record<string, unknown[]>): Promise<void> {
    return this.no();
  }
}
