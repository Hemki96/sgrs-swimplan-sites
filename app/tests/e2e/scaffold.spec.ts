import { expect, test } from "@playwright/test";

test("creates, edits and soft deletes a season", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("SGRS SwimPlan");
  await expect(
    page.getByRole("heading", { level: 1, name: "Saisonverwaltung" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill("Saison 2026/27");
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Saisonplanung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft im Juli");
  await page.getByRole("button", { name: "Saison speichern" }).click();

  await expect(
    page.getByRole("heading", { level: 3, name: "Saison 2026/27" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByLabel("Status").selectOption("active");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await expect(page.getByText("Aktiv")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText("Noch keine Saison")).toBeVisible();
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

test("manages event tracks, competitions and restrictions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Saison" }).click();
  await page.getByLabel("Name").fill("Saison 2026/27");
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await page.getByRole("button", { name: "Planung öffnen" }).click();

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
  await page.getByLabel("Name").fill("Saison 2026/27");
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await page.getByRole("button", { name: "Planung öffnen" }).click();

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
  await page.getByLabel("Name").fill("Saison 2026/27");
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await page.getByRole("button", { name: "Planung öffnen" }).click();

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
  await page.getByLabel("Name").fill("Saison 2026/27");
  await page.getByLabel("Startdatum").fill("2026-08-01");
  await page.getByLabel("Enddatum").fill("2027-07-31");
  await page.getByLabel("Beschreibung").fill("Gemeinsame Planung");
  await page.getByLabel("Hauptziel").fill("Meisterschaft");
  await page.getByRole("button", { name: "Saison speichern" }).click();
  await page.getByRole("button", { name: "Planung öffnen" }).click();

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

  await microcycles.getByRole("button", { name: "Bearbeiten" }).click();
  await microcycles.getByLabel("Name/KW").fill("KW 33");
  await microcycles.getByLabel("Target RPE").fill("6");
  await microcycles
    .getByRole("button", { name: "Mikrozyklus speichern" })
    .click();
  await expect(microcycles.getByText("KW 33")).toBeVisible();
  await expect(microcycles.getByText("Target RPE 6 · 18000 m")).toBeVisible();

  await microcycles.getByRole("button", { name: "Löschen" }).click();
  await expect(microcycles.getByText("KW 33")).not.toBeVisible();
});
