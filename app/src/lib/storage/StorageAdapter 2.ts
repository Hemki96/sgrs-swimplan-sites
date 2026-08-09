export interface ListOptions {
  includeDeleted?: boolean;
}
export interface PutOptions {
  expectedVersion?: number;
}
export interface StorageAdapter {
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, options?: ListOptions): Promise<T[]>;
  put<T extends { id: string; version: number }>(
    collection: string,
    entity: T,
    options?: PutOptions,
  ): Promise<T>;
  softDelete(
    collection: string,
    id: string,
    expectedVersion: number,
  ): Promise<void>;
  exportAll(): Promise<Record<string, unknown[]>>;
  importAll(data: Record<string, unknown[]>): Promise<void>;
}
