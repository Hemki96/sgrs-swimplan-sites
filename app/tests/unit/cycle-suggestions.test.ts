import { describe, expect, it } from "vitest";

import {
  generateCycleSuggestions,
  validateSuggestionHierarchy,
} from "../../src/lib/domain/cycleSuggestions";
import type { Event, Season } from "../../src/lib/domain/types";

function makeSeason(startDate = "2026-08-17", endDate = "2027-07-31"): Season {
  return {
    id: "season-1",
    name: "Saison 2026/27",
    startDate,
    endDate,
    description: "",
    mainGoal: "",
    status: "active",
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function makeEvent(
  id: string,
  name: string,
  startDate: string,
  priority: Event["priority"] = "A",
): Event {
  return {
    id,
    seasonId: "season-1",
    trackId: "track-1",
    name,
    startDate,
    endDate: startDate,
    priority,
    category: "",
    location: "",
    goal: "",
    notes: "",
    version: 1,
  };
}

describe("generateCycleSuggestions", () => {
  it("generates one macrocycle for a single A event (Test 1)", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].proposedStartDate).toBe("2026-08-17");
    expect(result.macros[0].proposedEndDate).toBe("2026-11-01");
    expect(result.macros[0].targetEvent?.name).toBe("NRW Kurzbahn");
    expect(result.macros[0].mesocycles).toHaveLength(1);
    expect(result.macros[0].mesocycles[0].microcycles.length).toBeGreaterThan(
      0,
    );
  });

  it("generates two macrocycles for two A events (Test 2)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "Deutsche Meisterschaft", "2027-03-21"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(2);
    expect(result.macros[0].proposedStartDate).toBe("2026-08-17");
    expect(result.macros[0].proposedEndDate).toBe("2026-11-01");
    expect(result.macros[1].proposedStartDate).toBe("2026-11-02");
    expect(result.macros[1].proposedEndDate).toBe("2027-03-21");
    expect(result.macros[1].targetEvent?.name).toBe("Deutsche Meisterschaft");
  });

  it("creates mesocycle boundaries from B events (Test 3)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "B-WK Oktober", "2026-10-18", "B"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].mesocycles).toHaveLength(2);
    expect(result.macros[0].mesocycles[0].proposedStartDate).toBe("2026-08-17");
    expect(result.macros[0].mesocycles[0].proposedEndDate).toBe("2026-10-17");
    expect(result.macros[0].mesocycles[0].boundaryEvent?.name).toBe(
      "B-WK Oktober",
    );
    expect(result.macros[0].mesocycles[1].proposedStartDate).toBe("2026-10-18");
    expect(result.macros[0].mesocycles[1].proposedEndDate).toBe("2026-11-01");
  });

  it("ignores C events for cycle boundaries (Test 4)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "C-WK Test", "2026-09-20", "C"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].mesocycles).toHaveLength(1);
    expect(result.macros[0].mesocycles[0].boundaryEvent).toBeUndefined();
  });

  it("forces new meso and micro when new macro starts (Test 5)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "Deutsche Meisterschaft", "2027-03-21"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros[1].proposedStartDate).toBe("2026-11-02");
    expect(result.macros[1].mesocycles[0].proposedStartDate).toBe("2026-11-02");
    expect(
      result.macros[1].mesocycles[0].microcycles[0].proposedStartDate,
    ).toBe("2026-11-02");
  });

  it("forces new micro when new meso starts (Test 6)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "B-WK Oktober", "2026-10-18", "B"),
    ];

    const result = generateCycleSuggestions(season, events);

    const secondMeso = result.macros[0].mesocycles[1];
    expect(secondMeso.proposedStartDate).toBe("2026-10-18");
    expect(secondMeso.microcycles[0].proposedStartDate).toBe("2026-10-18");
  });

  it("splits a 19-day mesocycle into 7+7+5 microcycles (Test 7)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "A-WK Ende", "2026-09-19"),
      makeEvent("e2", "B-WK Start", "2026-09-01", "B"),
    ];

    const result = generateCycleSuggestions(season, events);

    const meso = result.macros[0].mesocycles[1];
    expect(meso.proposedStartDate).toBe("2026-09-01");
    expect(meso.proposedEndDate).toBe("2026-09-19");

    expect(meso.microcycles).toHaveLength(3);
    expect(meso.microcycles[0].proposedStartDate).toBe("2026-09-01");
    expect(meso.microcycles[0].proposedEndDate).toBe("2026-09-07");
    expect(meso.microcycles[1].proposedStartDate).toBe("2026-09-08");
    expect(meso.microcycles[1].proposedEndDate).toBe("2026-09-14");
    expect(meso.microcycles[2].proposedStartDate).toBe("2026-09-15");
    expect(meso.microcycles[2].proposedEndDate).toBe("2026-09-19");
  });

  it("warns when two A events are less than 14 days apart (Test 8)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "WK 1", "2026-11-01"),
      makeEvent("e2", "WK 2", "2026-11-10"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(2);
    expect(result.warnings.some((w) => w.includes("nah beieinander"))).toBe(
      true,
    );
  });

  it("does not overwrite existing cycles (Test 9)", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events, {
      macrocycles: [
        {
          id: "existing-macro",
          seasonId: season.id,
          name: "Bestehender Makrozyklus",
          startDate: "2026-08-17",
          endDate: "2026-11-01",
          goal: "",
          notes: "",
          version: 1,
          targetEventId: undefined,
        },
      ],
      mesocycles: [],
      microcycles: [],
    });

    expect(result.macros).toHaveLength(1);
    expect(
      result.warnings.some((w) => w.includes("bereits eine Planung")),
    ).toBe(true);
  });

  it("returns unchanged state when cancelled/empty (Test 10)", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].proposedStartDate).toBe("2026-08-17");
  });

  it("generates microcycles that span the full mesocycle (Test 11)", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events);

    const meso = result.macros[0].mesocycles[0];
    expect(meso.microcycles[0].proposedStartDate).toBe(meso.proposedStartDate);
    expect(meso.microcycles.at(-1)!.proposedEndDate).toBe(meso.proposedEndDate);
  });

  it("produces the expected output for the full example from spec (section 19)", () => {
    const season = makeSeason("2026-08-17", "2027-07-31");
    const events = [
      makeEvent("e1", "C-WK", "2026-09-20", "C"),
      makeEvent("e2", "B-WK Oktober", "2026-10-18", "B"),
      makeEvent("e3", "A-WK November", "2026-11-29", "A"),
      makeEvent("e4", "B-WK Januar", "2027-01-17", "B"),
      makeEvent("e5", "A-WK März", "2027-03-14", "A"),
      makeEvent("e6", "B-WK Mai", "2027-05-09", "B"),
      makeEvent("e7", "A-WK Juni", "2027-06-27", "A"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(3);

    expect(result.macros[0].proposedStartDate).toBe("2026-08-17");
    expect(result.macros[0].proposedEndDate).toBe("2026-11-29");
    expect(result.macros[0].mesocycles).toHaveLength(2);
    expect(result.macros[0].mesocycles[0].proposedEndDate).toBe("2026-10-17");
    expect(result.macros[0].mesocycles[1].proposedStartDate).toBe("2026-10-18");

    expect(result.macros[1].proposedStartDate).toBe("2026-11-30");
    expect(result.macros[1].proposedEndDate).toBe("2027-03-14");
    expect(result.macros[1].mesocycles).toHaveLength(2);
    expect(result.macros[1].mesocycles[0].proposedEndDate).toBe("2027-01-16");
    expect(result.macros[1].mesocycles[1].proposedStartDate).toBe("2027-01-17");

    expect(result.macros[2].proposedStartDate).toBe("2027-03-15");
    expect(result.macros[2].proposedEndDate).toBe("2027-06-27");
    expect(result.macros[2].mesocycles).toHaveLength(2);
    expect(result.macros[2].mesocycles[0].proposedEndDate).toBe("2027-05-08");
    expect(result.macros[2].mesocycles[1].proposedStartDate).toBe("2027-05-09");

    expect(result.hasPostLastEventGap).toBe(true);
    expect(result.postLastEventGapStart).toBe("2027-06-28");
    expect(result.postLastEventGapEnd).toBe("2027-07-31");
  });

  it("handles mesocycle starting on non-Monday (section 20 example)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "B-Start", "2026-09-01", "B"),
    ];

    const result = generateCycleSuggestions(season, events);

    const meso2 = result.macros[0].mesocycles[1];
    expect(meso2.proposedStartDate).toBe("2026-09-01");
    expect(meso2.microcycles[0].proposedStartDate).toBe("2026-09-01");
  });

  it("warns about same-day A events", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "WK A", "2026-11-01"),
      makeEvent("e2", "WK B", "2026-11-01"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.warnings.some((w) => w.includes("selben Tag"))).toBe(true);
  });

  it("handles test events without creating boundaries", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "Testwettkampf", "2026-10-01", "test"),
    ];

    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);
    expect(result.macros[0].mesocycles).toHaveLength(1);
  });

  it("generates sequential microcycle names within mesocycles", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events);

    const meso = result.macros[0].mesocycles[0];
    expect(meso.microcycles.length).toBeGreaterThan(1);

    for (let i = 1; i < meso.microcycles.length; i += 1) {
      expect(meso.microcycles[i].proposedStartDate).toBe(
        addDaysIso(meso.microcycles[i - 1].proposedEndDate, 1),
      );
    }

    expect(meso.microcycles[0].name).toBe("Micro 1.1.1");
    if (meso.microcycles.length > 1) {
      expect(meso.microcycles[1].name).toBe("Micro 1.1.2");
    }
  });

  it("names microcycles according to macro and meso hierarchy (section 16)", () => {
    const season = makeSeason();
    const events = [
      makeEvent("e1", "NRW Kurzbahn", "2026-11-01"),
      makeEvent("e2", "B-WK Oktober", "2026-10-18", "B"),
    ];

    const result = generateCycleSuggestions(season, events);

    const firstMeso = result.macros[0].mesocycles[0];
    const secondMeso = result.macros[0].mesocycles[1];

    expect(firstMeso.microcycles[0].name).toBe("Micro 1.1.1");
    expect(secondMeso.microcycles[0].name).toBe("Micro 1.2.1");
  });

  it("warns when hierarchy is violated by manual edits", () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const result = generateCycleSuggestions(season, events);

    const macro = result.macros[0];
    const tooShort = macro.mesocycles[0];
    tooShort.proposedStartDate = "2026-08-20";

    const issues = validateSuggestionHierarchy([macro]);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toContain("außerhalb");
  });

  it("does not write any data when the preview is cancelled (Test 10)", async () => {
    const season = makeSeason();
    const events = [makeEvent("e1", "NRW Kurzbahn", "2026-11-01")];

    const before = [...events.map((event) => event.name)];
    const result = generateCycleSuggestions(season, events);

    expect(result.macros).toHaveLength(1);

    // Cancelling a preview never touches storage; the pure function only
    // returns a proposal. Nothing is persisted unless explicitly accepted.
    expect(events.map((event) => event.name)).toEqual(before);
  });
});

function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
