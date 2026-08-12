import { beforeEach, describe, expect, it } from "vitest";

import { SeasonPlanningService } from "../../src/lib/domain/seasonPlanning";
import { SeasonService } from "../../src/lib/domain/seasons";
import type { Season } from "../../src/lib/domain/types";
import { InMemoryStorageAdapter } from "../../src/lib/storage/InMemoryStorageAdapter";
import {
  createBlankBulkRow,
  duplicateBulkRow,
  filterEventsForBulk,
  parseBulkPaste,
  saveBulkEvents,
  validateBulkRows,
  type BulkEventDefaults,
  type BulkEventRow,
} from "../../src/features/seasons/bulkEventsModel";

describe("Bulk-Events Massenpflege", () => {
  let storage: InMemoryStorageAdapter;
  let service: SeasonPlanningService;
  let season: Season;
  let defaults: BulkEventDefaults;

  beforeEach(async () => {
    let revisionIndex = 0;
    let entityIndex = 0;
    storage = new InMemoryStorageAdapter({
      createId: () => `revision-${++revisionIndex}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
    season = await new SeasonService(storage, {
      createId: () => "season-1",
      now: () => "2026-08-09T11:00:00.000Z",
    }).create({
      name: "Saison 2026/27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      description: "Planung",
      mainGoal: "Meisterschaft",
      status: "active",
    });
    service = new SeasonPlanningService(storage, {
      createId: () => `entity-${++entityIndex}`,
    });
    const track = await service.createTrack(season.id, {
      name: "Wettkaempfe",
      sortOrder: 0,
      visible: true,
    });
    defaults = { trackId: track.id, priority: "B" };
  });

  function makeRow(
    key: string,
    patch: Partial<BulkEventRow> = {},
  ): BulkEventRow {
    return {
      ...createBlankBulkRow(defaults, season.id, key),
      ...patch,
    };
  }

  it("legt drei neue Wettkaempfe gleichzeitig an (Test 1)", async () => {
    const rows = [
      makeRow("r1", {
        startDate: "2026-09-12",
        name: "Kreismeisterschaften",
        priority: "B",
        location: "Siegburg",
      }),
      makeRow("r2", {
        startDate: "2026-10-03",
        name: "Kurzbahnmeeting",
        priority: "C",
        location: "Bonn",
      }),
      makeRow("r3", {
        startDate: "2026-11-01",
        name: "NRW Kurzbahn",
        priority: "A",
        location: "Wuppertal",
      }),
    ];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    expect(await service.listEvents(season.id)).toHaveLength(3);
  });

  it("speichert einen Wettkampf mit nur Datum und Name (Test 2)", async () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "Kreismeisterschaften" }),
    ];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "Kreismeisterschaften",
      priority: "B",
    });
    expect(events[0].endDate).toBe(events[0].startDate);
  });

  it("zeigt einen Fehler wenn das Datum fehlt (Test 3)", () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "OK" }),
      makeRow("r2", { startDate: "", name: "Fehler" }),
    ];
    const validation = validateBulkRows(rows, { defaults, periodRanges: [] });
    expect(
      validation.byKey.r2.errors.some((issue) => issue.field === "startDate"),
    ).toBe(true);
    expect(validation.byKey.r1.errors).toHaveLength(0);
    expect(validation.errorCount).toBe(1);
  });

  it("zeigt einen Fehler wenn der Name fehlt (Test 4)", () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "OK" }),
      makeRow("r2", { startDate: "2026-10-03", name: "" }),
    ];
    const validation = validateBulkRows(rows, { defaults, periodRanges: [] });
    expect(
      validation.byKey.r2.errors.some((issue) => issue.field === "name"),
    ).toBe(true);
    expect(validation.errorCount).toBe(1);
  });

  it("aendert drei bestehende Wettkaempfe gleichzeitig (Test 5)", async () => {
    const track = defaults.trackId;
    const mk = (n: string, p: "A" | "B" | "C") =>
      service.createEvent(season.id, {
        trackId: track,
        name: n,
        startDate: "2026-09-12",
        endDate: "2026-09-12",
        priority: p,
        category: "",
        location: "",
        goal: "",
        notes: "",
      });
    const created = await Promise.all([
      mk("A", "B"),
      mk("B", "C"),
      mk("C", "A"),
    ]);
    const rows = created.map((event, index) => ({
      ...createBlankBulkRow(defaults, season.id, `u${index + 1}`),
      eventId: event.id,
      version: event.version,
      trackId: event.trackId,
      startDate: event.startDate,
      endDate: event.endDate,
      priority: event.priority,
      original: event,
      name: `${event.name} aktualisiert`,
    }));
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events.every((event) => event.name.includes("aktualisiert"))).toBe(
      true,
    );
  });

  it("dupliziert eine Zeile zu einer neuen unabhaengigen Zeile (Test 6)", () => {
    const original = makeRow("r1", {
      startDate: "2026-09-12",
      name: "Kreismeisterschaften",
    });
    const duplicate = duplicateBulkRow(original, "r2");
    expect(duplicate.key).toBe("r2");
    expect(duplicate.eventId).toBeUndefined();
    expect(duplicate.original).toBeUndefined();
    expect(duplicate.name).toBe("Kreismeisterschaften");
    expect(duplicate.startDate).toBe("2026-09-12");
  });

  it("loescht einen bestehenden Wettkampf als Soft Delete (Test 7)", async () => {
    const created = await service.createEvent(season.id, {
      trackId: defaults.trackId,
      name: "Loeschen",
      startDate: "2026-09-12",
      endDate: "2026-09-12",
      priority: "B",
      category: "",
      location: "",
      goal: "",
      notes: "",
    });
    const row: BulkEventRow = {
      ...createBlankBulkRow(defaults, season.id, "r1"),
      eventId: created.id,
      version: created.version,
      original: created,
      deleted: true,
      name: created.name,
      startDate: created.startDate,
    };
    const result = await saveBulkEvents([row], defaults, service, season.id);
    expect(result.deletedCount).toBe(1);
    expect(result.failed).toEqual({});
    expect(await service.listEvents(season.id)).toHaveLength(0);
  });

  it("traegt den Standard-Event-Track fuer neue Zeilen ein (Test 8)", async () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "Standard-Track-Test" }),
    ];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events[0].trackId).toBe(defaults.trackId);
  });

  it("setzt endDate gleich startDate wenn Enddatum leer (Test 9)", async () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "Ein-Tag", endDate: "" }),
    ];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events[0].endDate).toBe(events[0].startDate);
  });

  it("erzeugt bei wiederholtem Speichern keine Duplikate (Test 10)", async () => {
    const rows = [
      makeRow("r1", { startDate: "2026-09-12", name: "Erstes Meeting" }),
      makeRow("r2", { startDate: "2026-10-03", name: "Zweites Meeting" }),
    ];
    await saveBulkEvents(rows, defaults, service, season.id);
    const firstSave = await service.listEvents(season.id);
    expect(firstSave).toHaveLength(2);
    const rowsAfter = firstSave.map((event) => ({
      ...createBlankBulkRow(defaults, season.id, `r-${event.id}`),
      eventId: event.id,
      version: event.version,
      trackId: event.trackId,
      startDate: event.startDate,
      endDate: event.endDate,
      priority: event.priority,
      name: event.name,
      original: event,
    }));
    await saveBulkEvents(rowsAfter, defaults, service, season.id);
    expect(await service.listEvents(season.id)).toHaveLength(2);
  });

  it("parst deutsches Datum korrekt", async () => {
    const rows = [makeRow("r1", { startDate: "12.09.2026", name: "DM" })];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events[0].startDate).toBe("2026-09-12");
  });

  it("verteilt Copy-Paste-Text auf mehrere Zeilen", () => {
    const text =
      "12.09.2026\tKreismeisterschaften\tB\tSiegburg\n03.10.2026\tKurzbahnmeeting\tC\tBonn";
    const parsed = parseBulkPaste(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      startDate: "12.09.2026",
      name: "Kreismeisterschaften",
      priority: "B",
      location: "Siegburg",
    });
    expect(parsed[1]).toEqual({
      startDate: "03.10.2026",
      name: "Kurzbahnmeeting",
      priority: "C",
      location: "Bonn",
    });
  });

  it("filtert bestehende Events nach Zeitraum", async () => {
    const track = defaults.trackId;
    const mk = (n: string, d: string) =>
      service.createEvent(season.id, {
        trackId: track,
        name: n,
        startDate: d,
        endDate: d,
        priority: "B",
        category: "",
        location: "",
        goal: "",
        notes: "",
      });
    await Promise.all([
      mk("Frueh", "2026-08-15"),
      mk("Mitte", "2026-10-15"),
      mk("Spaet", "2027-03-15"),
    ]);
    const all = await service.listEvents(season.id);
    const filtered = filterEventsForBulk(all, {
      fromDate: "2026-09-01",
      toDate: "2026-12-31",
      trackId: "",
      priority: "",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Mitte");
  });

  it("validiert mehrtagige Wettkaempfe mit Enddatum", async () => {
    const rows = [
      makeRow("r1", {
        startDate: "2026-09-12",
        name: "Zwei-Tage",
        endDate: "2026-09-13",
      }),
    ];
    const result = await saveBulkEvents(rows, defaults, service, season.id);
    expect(result.failed).toEqual({});
    const events = await service.listEvents(season.id);
    expect(events[0].endDate).toBe("2026-09-13");
  });

  it("zeigt Fehler wenn Enddatum vor Startdatum", () => {
    const rows = [
      makeRow("r1", {
        startDate: "2026-09-13",
        name: "Falsch",
        endDate: "2026-09-12",
      }),
    ];
    const validation = validateBulkRows(rows, { defaults, periodRanges: [] });
    expect(
      validation.byKey.r1.errors.some((issue) => issue.field === "endDate"),
    ).toBe(true);
  });

  it("erkennt ungueltige Datumseingaaben", () => {
    const rows = [
      makeRow("r1", { startDate: "31.02.2026", name: "Ungueltig" }),
    ];
    const validation = validateBulkRows(rows, { defaults, periodRanges: [] });
    expect(
      validation.byKey.r1.errors.some((issue) => issue.field === "startDate"),
    ).toBe(true);
  });
});
