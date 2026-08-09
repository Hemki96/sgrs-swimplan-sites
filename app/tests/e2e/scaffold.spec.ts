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
