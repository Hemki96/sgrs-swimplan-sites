import { expect, test } from "@playwright/test";

const runId = Date.now().toString(36);
const seasonNames = {
  crud: `CRUD-Saison ${runId}`,
  focus: `Fokus-Saison ${runId}`,
  event: `Event-Saison ${runId}`,
  macro: `Makro-Saison ${runId}`,
  meso: `Meso-Saison ${runId}`,
  micro: `Mikro-Saison ${runId}`,
  persistence: `Persistente Saison ${runId}`,
  history: `Historie-Saison ${runId}`,
  matrix: `Matrix-Saison ${runId}`,
};

async function createSeason(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function openPlanningData(
  page: import("@playwright/test").Page,
  seasonName: string,
) {
  await page
    .getByRole("article")
    .filter({ hasText: seasonName })
    .getByRole("button", { name: "Planung öffnen" })
    .click();
  await page.getByRole("tab", { name: "Planungsdaten" }).click();
}

test("shows the official SGRS brand without responsive overflow", async ({
  page,
}) => {
  await page.goto("/");

  const logo = page.getByRole("img", { name: "Logo der SG Rhein-Sieg" });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/brand/sgrs-logo.png");
  await expect(logo).toHaveAttribute("width", "88");
  await expect(logo).toHaveAttribute("height", "88");
  await expect(
    page.getByRole("heading", { level: 1, name: "Saisonverwaltung" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "JSON exportieren" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Neue Saison" })).toBeVisible();

  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(logo).toBeVisible();
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      elements: [...document.querySelectorAll<HTMLElement>("body *")]
        .filter(
          (element) =>
            element.getBoundingClientRect().right > window.innerWidth &&
            !element.closest(".matrix-scroll"),
        )
        .slice(0, 5)
        .map((element) => ({
          className: element.className,
          right: Math.round(element.getBoundingClientRect().right),
          tagName: element.tagName,
        })),
    }));
    expect(overflow, `${width}px viewport`).toEqual({
      documentWidth: width,
      viewportWidth: width,
      elements: [],
    });
  }
});

test("manages settings and confirms a previewed JSON import", async ({
  page,
}) => {
  await page.goto("/einstellungen");
  await expect(
    page.getByRole("heading", { level: 1, name: "Einstellungen" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Wert hinzufügen" }).click();
  const code = `STATUS_${runId.toUpperCase()}`;
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Label").fill(`Teststatus ${runId}`);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(`Teststatus ${runId}`)).toBeVisible();

  const importSeason = {
    id: `import-${runId}`,
    name: `Import-Saison ${runId}`,
    startDate: "2026-08-01",
    endDate: "2027-07-31",
    description: "Importvorschau",
    mainGoal: "Roundtrip",
    status: "draft",
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
    version: 1,
  };
  await page
    .getByRole("button", { name: "JSON-Datei prüfen" })
    .setInputFiles({
    name: "season.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 2,
        exportedAt: "2026-08-10T10:00:00.000Z",
        configurationValues: [],
        seasons: [importSeason],
      }),
    ),
  });
  await expect(
    page.getByRole("heading", { level: 3, name: "Importvorschau" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import verbindlich anwenden" })
    .click();
  await expect(
    page.getByText("Saison wurde als neue Planung importiert."),
  ).toBeVisible();

  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});

test("creates, edits and soft deletes a season", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("SGRS SwimPlan");
  await expect(
    page.getByRole("heading", { level: 1, name: "Saisonverwaltung" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.crud);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Saisonplanung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft im Juli");
  await page.getByRole("button", { name: "Saison speichern" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: seasonNames.crud }),
  ).toBeVisible();
  const seasonCard = page
    .getByRole("article")
    .filter({ hasText: seasonNames.crud });
  await seasonCard.locator("summary").click();
  await seasonCard.getByRole("button", { name: "Bearbeiten" }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Status" })
    .selectOption("active");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await expect(seasonCard.locator(".status")).toHaveText("Aktiv");

  page.on("dialog", (dialog) => dialog.accept());
  const deleteButton = seasonCard.getByRole("button", { name: "Löschen" });
  if (!(await deleteButton.isVisible()))
    await seasonCard.locator("summary").click();
  await deleteButton.click();
  await expect(
    page.getByRole("article").filter({ hasText: seasonNames.crud }),
  ).not.toBeVisible();
});

test("shows date range validation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill("Ungültige Saison");
  await page.getByLabel("Startdatum").fill("2027-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Beschreibung");
  await page.getByLabel("Hauptziel").fill("Ziel");
  await page.getByRole("button", { name: "Saison speichern" }).click();

  await expect(
    page.getByText("Das Startdatum muss vor oder am Enddatum liegen."),
  ).toBeVisible();
});

test("manages parallel focus segments across periodization dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.focus);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.focus);

  const dimensions = page.getByRole("region", {
    name: "Periodisierungsdimensionen",
  });
  await expect(dimensions.getByText("Strength", { exact: true })).toBeVisible();
  await expect(
    dimensions.getByText("Technical", { exact: true }),
  ).toBeVisible();

  const segments = page.getByRole("region", { name: "Focus Segments" });
  await segments.getByLabel("Dimension").selectOption({ label: "Aerobic" });
  await segments.getByLabel("Fokus").selectOption({ label: "Aerobic Base" });
  await segments.getByLabel("Startdatum").fill("2026-09-01");
  await segments.getByLabel("Enddatum").fill("2026-10-31");
  await segments.getByLabel("Notiz").fill("Grundlagenblock");
  await segments.getByRole("button", { name: "Fokussegment anlegen" }).click();
  await expect(
    segments.getByText("Aerobic Base", { exact: true }),
  ).toBeVisible();

  await segments.getByLabel("Dimension").selectOption({ label: "Technical" });
  await segments.getByLabel("Fokus").selectOption({ label: "Starts" });
  await segments.getByLabel("Startdatum").fill("2026-09-15");
  await segments.getByLabel("Enddatum").fill("2026-11-15");
  await segments.getByRole("button", { name: "Fokussegment anlegen" }).click();

  await expect(
    segments.getByText("Aerobic Base", { exact: true }),
  ).toBeVisible();
  await expect(segments.getByText("Starts", { exact: true })).toBeVisible();
});

test("manages event tracks, competitions and restrictions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.event);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.event);

  await page.getByLabel("Name der Eventspur").fill("WK");
  await page.getByRole("button", { name: "Eventspur anlegen" }).click();
  await expect(page.getByText("Eventspur wurde angelegt.")).toBeVisible();

  const competition = page.getByRole("region", { name: "Wettkämpfe" });
  await competition.getByLabel("Eventspur").selectOption({ label: "WK" });
  await competition.getByLabel("Name").fill("Landesmeisterschaft");
  await competition.getByLabel("Startdatum").fill("2027-07-10");
  await competition.getByLabel("Enddatum").fill("2027-07-11");
  await competition.getByLabel("Priorität").selectOption("A");
  await competition.getByRole("button", { name: "Wettkampf anlegen" }).click();
  await expect(competition.getByText("Landesmeisterschaft")).toBeVisible();

  const restrictions = page.getByRole("region", {
    name: "Ferien & Restriktionen",
  });
  await restrictions.getByLabel("Name").fill("Weihnachtsferien");
  await restrictions.getByLabel("Startdatum").fill("2026-12-23");
  await restrictions.getByLabel("Enddatum").fill("2027-01-06");
  await restrictions
    .getByRole("button", { name: "Restriktion anlegen" })
    .click();
  await expect(restrictions.getByText("Weihnachtsferien")).toBeVisible();
});

test("manages a macrocycle inside its season", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.macro);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.macro);

  const macrocycles = page.getByRole("region", { name: "Makrozyklen" });
  await macrocycles.getByLabel("Name").fill("Grundlagenaufbau");
  await macrocycles.getByLabel("Startdatum").fill("2026-08-01");
  await macrocycles.getByLabel("Enddatum").fill("2027-01-31");
  await macrocycles
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Grundlage stabilisieren");
  await macrocycles.getByLabel("Notiz").fill("Progressiv steigern");
  await macrocycles
    .getByRole("button", { name: "Makrozyklus anlegen" })
    .click();
  await expect(macrocycles.getByText("Grundlagenaufbau")).toBeVisible();

  await macrocycles.getByRole("button", { name: "Bearbeiten" }).click();
  await macrocycles.getByLabel("Name").fill("Aufbauphase");
  await macrocycles
    .getByRole("button", { name: "Makrozyklus speichern" })
    .click();
  await expect(macrocycles.getByText("Aufbauphase")).toBeVisible();

  await macrocycles.getByRole("button", { name: "Löschen" }).click();
  await expect(macrocycles.getByText("Aufbauphase")).not.toBeVisible();
});

test("manages a mesocycle inside its macrocycle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.meso);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.meso);

  const macrocycles = page.getByRole("region", { name: "Makrozyklen" });
  await macrocycles.getByLabel("Name").fill("Grundlagenaufbau");
  await macrocycles.getByLabel("Startdatum").fill("2026-08-01");
  await macrocycles.getByLabel("Enddatum").fill("2027-01-31");
  await macrocycles
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Grundlage stabilisieren");
  await macrocycles.getByLabel("Notiz").fill("Progressiv steigern");
  await macrocycles
    .getByRole("button", { name: "Makrozyklus anlegen" })
    .click();

  const mesocycles = page.getByRole("region", { name: "Mesozyklen" });
  await mesocycles
    .getByLabel("Makrozyklus")
    .selectOption({ label: "Grundlagenaufbau" });
  await mesocycles.getByLabel("Name").fill("Aerobe Basis");
  await mesocycles.getByLabel("Startdatum").fill("2026-08-01");
  await mesocycles.getByLabel("Enddatum").fill("2026-09-30");
  await mesocycles.getByLabel("Ziel").fill("Ausdauer aufbauen");
  await mesocycles.getByLabel("Notiz").fill("Technik stabil halten");
  await mesocycles.getByRole("button", { name: "Mesozyklus anlegen" }).click();
  await expect(mesocycles.getByText("Aerobe Basis")).toBeVisible();

  await mesocycles.getByRole("button", { name: "Bearbeiten" }).click();
  await mesocycles.getByLabel("Name").fill("Aerobe Grundlage");
  await mesocycles
    .getByRole("button", { name: "Mesozyklus speichern" })
    .click();
  await expect(mesocycles.getByText("Aerobe Grundlage")).toBeVisible();

  await mesocycles.getByRole("button", { name: "Löschen" }).click();
  await expect(mesocycles.getByText("Aerobe Grundlage")).not.toBeVisible();
});

test("manages a microcycle inside its mesocycle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.micro);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.micro);

  const macrocycles = page.getByRole("region", { name: "Makrozyklen" });
  await macrocycles.getByLabel("Name").fill("Grundlagenaufbau");
  await macrocycles.getByLabel("Startdatum").fill("2026-08-01");
  await macrocycles.getByLabel("Enddatum").fill("2027-01-31");
  await macrocycles
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Grundlage stabilisieren");
  await macrocycles.getByLabel("Notiz").fill("Progressiv steigern");
  await macrocycles
    .getByRole("button", { name: "Makrozyklus anlegen" })
    .click();

  const mesocycles = page.getByRole("region", { name: "Mesozyklen" });
  await mesocycles
    .getByLabel("Makrozyklus")
    .selectOption({ label: "Grundlagenaufbau" });
  await mesocycles.getByLabel("Name").fill("Aerobe Basis");
  await mesocycles.getByLabel("Startdatum").fill("2026-08-01");
  await mesocycles.getByLabel("Enddatum").fill("2026-09-30");
  await mesocycles.getByLabel("Ziel").fill("Ausdauer aufbauen");
  await mesocycles.getByLabel("Notiz").fill("Technik stabil halten");
  await mesocycles.getByRole("button", { name: "Mesozyklus anlegen" }).click();

  const microcycles = page.getByRole("region", { name: "Mikrozyklen" });
  await microcycles
    .getByLabel("Mesozyklus")
    .selectOption({ label: "Aerobe Basis" });
  await microcycles.getByLabel("Name/KW").fill("KW 32");
  await microcycles.getByLabel("Startdatum").fill("2026-08-03");
  await microcycles.getByLabel("Enddatum").fill("2026-08-09");
  await microcycles.getByLabel("Target RPE").fill("5");
  await microcycles.getByLabel("Zielumfang in Metern").fill("18000");
  await microcycles
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Ruhiger Einstieg");
  await microcycles
    .getByRole("button", { name: "Mikrozyklus anlegen" })
    .click();
  await expect(microcycles.getByText("KW 32")).toBeVisible();
  await page.getByRole("tab", { name: "Woche" }).click();
  await expect(
    page.getByRole("heading", { name: "Trainer-Wochenansicht" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Planungsdaten" }).click();

  await microcycles.getByRole("button", { name: "Bearbeiten" }).click();
  await microcycles.getByLabel("Name/KW").fill("KW 33");
  await microcycles.getByLabel("Target RPE").fill("6");
  await microcycles
    .getByRole("button", { name: "Mikrozyklus speichern" })
    .click();
  await expect(microcycles.getByText("KW 33")).toBeVisible();
  await expect(microcycles.getByText("Target RPE 6 · 18000 m")).toBeVisible();

  const segments = page.getByRole("region", {
    name: "Mikrozyklussegmente",
  });
  await segments.getByLabel("Mikrozyklus").selectOption({ label: "KW 33" });
  await segments.getByLabel("Name").fill("Erste Wochenhälfte");
  await segments.getByLabel("Startdatum").fill("2026-08-03");
  await segments.getByLabel("Enddatum").fill("2026-08-06");
  await segments.getByLabel("Typ").fill("Wochenhälfte");
  await segments.getByLabel("Reihenfolge").fill("1");
  await segments
    .getByRole("button", { name: "Mikrozyklussegment anlegen" })
    .click();
  await expect(segments.getByText("Erste Wochenhälfte")).toBeVisible();

  await segments.getByRole("button", { name: "Bearbeiten" }).click();
  await segments.getByLabel("Name").fill("Training Camp Phase 1");
  await segments.getByLabel("Typ").fill("Training Camp");
  await segments
    .getByRole("button", { name: "Mikrozyklussegment speichern" })
    .click();
  await expect(segments.getByText("Training Camp Phase 1")).toBeVisible();

  await segments.getByRole("button", { name: "Löschen" }).click();
  await expect(segments.getByText("Training Camp Phase 1")).not.toBeVisible();

  await microcycles.getByRole("button", { name: "Löschen" }).click();
  await expect(microcycles.getByText("KW 33")).not.toBeVisible();
});

test("persists after reload and exposes matrix, week, mobile and JSON export", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.persistence);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Reload-Prüfung");
  await page.getByLabel("Hauptziel").fill("Saisonhöhepunkt");
  await page.getByRole("button", { name: "Saison speichern" }).click();

  await page.reload();
  const card = page
    .getByRole("article")
    .filter({ hasText: seasonNames.persistence });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Planung öffnen" }).click();
  await page.getByRole("tab", { name: "Woche" }).click();
  await expect(page.locator(".week-view")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Noch keine Trainingswoche" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Matrix" }).click();
  await expect(
    page.getByRole("heading", { name: "Saisonmatrix" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Woche" }).click();
  await page.getByRole("tab", { name: "Diese Woche" }).click();
  await expect(page.locator(".week-view")).toBeVisible();
  await expect(page.locator(".planning-app")).toHaveCSS("width", "390px");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren" }).click();
  await expect((await download).suggestedFilename()).toMatch(
    /^sgrs-swimplan-.*\.json$/,
  );
});

test("shows planning analytics on desktop and mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Analyse" }).click();

  await expect(
    page.getByRole("heading", { name: "Saison auf einen Blick" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wochenverlauf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Schwerpunktverteilung" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wettkampf-Timeline" }),
  ).toBeVisible();
  await expect(
    page.getByText("keine Athleten- oder Gesundheitsdaten", { exact: false }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".analytics-view")).toBeVisible();
  await expect(page.locator(".analytics-grid")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("edits the season matrix: blocks, dialogs and inline RPE", async ({
  page,
}) => {
  await createSeason(page, seasonNames.matrix);
  await page.getByRole("tab", { name: "Matrix" }).click();
  await expect(
    page.getByRole("heading", { name: "Saisonmatrix" }),
  ).toBeVisible();

  const matrixRow = (row: string) => page.locator(`[data-matrix-row="${row}"]`);

  await matrixRow("constraints")
    .getByRole("button", { name: "Eintrag anlegen in Restriktionen" })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Sommerferien");
  await dialog.getByLabel("Startdatum").fill("2026-08-01");
  await dialog.getByLabel("Enddatum").fill("2026-08-15");
  await dialog.getByRole("button", { name: "Restriktion anlegen" }).click();
  await expect(page.getByText("Restriktion wurde angelegt.")).toBeVisible();
  await expect(
    matrixRow("constraints").getByText("Sommerferien", { exact: true }),
  ).toBeVisible();

  await matrixRow("constraints").getByText("Sommerferien").click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Sommerpause");
  await dialog.getByRole("button", { name: "Restriktion speichern" }).click();
  await expect(page.getByText("Restriktion wurde aktualisiert.")).toBeVisible();
  await expect(
    matrixRow("constraints").getByText("Sommerpause", { exact: true }),
  ).toBeVisible();

  page.on("dialog", (confirm) => confirm.accept());
  await matrixRow("constraints").getByText("Sommerpause").click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText("Restriktion wurde gelöscht.")).toBeVisible();
  await expect(matrixRow("constraints").getByText("Sommerpause")).toHaveCount(
    0,
  );

  await matrixRow("macro")
    .getByRole("button", { name: "Eintrag anlegen in Macro" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Grundlagenaufbau");
  await dialog.getByLabel("Startdatum").fill("2026-08-01");
  await dialog.getByLabel("Enddatum").fill("2027-01-31");
  await dialog
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Basis stabilisieren");
  await dialog.getByLabel("Notiz").fill("Progressiv steigern");
  await dialog.getByRole("button", { name: "Makrozyklus anlegen" }).click();
  await expect(
    matrixRow("macro").getByText("Grundlagenaufbau", { exact: true }),
  ).toBeVisible();

  await matrixRow("meso")
    .getByRole("button", { name: "Eintrag anlegen in Meso" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Makrozyklus").selectOption({
    label: "Grundlagenaufbau",
  });
  await dialog.getByLabel("Name").fill("Aerobe Basis");
  await dialog.getByLabel("Startdatum").fill("2026-08-01");
  await dialog.getByLabel("Enddatum").fill("2026-09-30");
  await dialog
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Ausdauer aufbauen");
  await dialog.getByLabel("Notiz").fill("Technik stabil halten");
  await dialog.getByRole("button", { name: "Mesozyklus anlegen" }).click();
  await expect(
    matrixRow("meso").getByText("Aerobe Basis", { exact: true }),
  ).toBeVisible();

  await matrixRow("rpe")
    .getByRole("button", { name: "Eintrag anlegen in Micro Target RPE" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mesozyklus").selectOption({ label: "Aerobe Basis" });
  await dialog.getByLabel("Name/KW").fill("KW 32");
  await dialog.getByLabel("Startdatum").fill("2026-08-03");
  await dialog.getByLabel("Enddatum").fill("2026-08-09");
  await dialog.getByLabel("Target RPE").fill("5");
  await dialog
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Ruhiger Einstieg");
  await dialog.getByRole("button", { name: "Mikrozyklus anlegen" }).click();
  const rpeBlock = matrixRow("rpe").locator(".matrix-block", {
    hasText: "KW 32",
  });
  await expect(rpeBlock).toBeVisible();
  await expect(rpeBlock.locator(".rpe-inline-trigger")).toHaveText("5");

  await rpeBlock.locator(".rpe-inline-trigger").click();
  await page.getByLabel("Target RPE bearbeiten").fill("6");
  await page.getByLabel("Target RPE bearbeiten").press("Enter");
  await expect(page.getByText("Mikrozyklus wurde aktualisiert.")).toBeVisible();
  await expect(
    matrixRow("rpe")
      .locator(".matrix-block", { hasText: "KW 32" })
      .locator(".rpe-inline-trigger"),
  ).toHaveText("6");
});

test("shows history and restores a deleted entity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill(seasonNames.history);
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await openPlanningData(page, seasonNames.history);

  const macrocycles = page.getByRole("region", { name: "Makrozyklen" });
  await macrocycles.getByLabel("Name").fill("Grundlagenaufbau");
  await macrocycles.getByLabel("Startdatum").fill("2026-08-01");
  await macrocycles.getByLabel("Enddatum").fill("2027-01-31");
  await macrocycles
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Grundlage stabilisieren");
  await macrocycles.getByLabel("Notiz").fill("Progressiv steigern");
  await macrocycles
    .getByRole("button", { name: "Makrozyklus anlegen" })
    .click();
  await expect(macrocycles.getByText("Grundlagenaufbau")).toBeVisible();

  await macrocycles.getByRole("button", { name: "Löschen" }).click();
  await expect(macrocycles.getByText("Grundlagenaufbau")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Rückgängig" })).toBeVisible();

  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(
    page.getByText("Die Löschung wurde rückgängig gemacht."),
  ).toBeVisible();
  await expect(macrocycles.getByText("Grundlagenaufbau")).toBeVisible();

  await page.getByRole("tab", { name: "Historie" }).click();
  await expect(
    page.getByRole("heading", { name: "Historie", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Makrozyklus angelegt", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Makrozyklus gelöscht", { exact: false }),
  ).toBeVisible();

  const deleteEntry = page
    .locator(".history-item")
    .filter({ hasText: "gelöscht" })
    .first();
  await deleteEntry.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(
    page.getByText("wurde wiederhergestellt.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Planungsdaten" }).click();
  await expect(macrocycles.getByText("Grundlagenaufbau")).toBeVisible();
});
