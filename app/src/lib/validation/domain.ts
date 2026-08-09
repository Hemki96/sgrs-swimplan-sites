export function assertRpe(v: number | undefined) {
  if (v === undefined) return;
  if (!Number.isInteger(v) || v < 1 || v > 10)
    throw new Error("RPE must be 1..10");
}
export function assertDateRange(s: string, e: string) {
  if (s > e) throw new Error("invalid range");
}
export function assertNestedRange(
  ps: string,
  pe: string,
  cs: string,
  ce: string,
) {
  assertDateRange(cs, ce);
  if (cs < ps || ce > pe) throw new Error("child outside parent");
}
