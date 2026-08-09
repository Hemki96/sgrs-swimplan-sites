import { expect, test } from "@playwright/test";

test("renders the neutral M1 scaffold", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("SGRS SwimPlan");
  await expect(
    page.getByRole("heading", { level: 1, name: "SGRS SwimPlan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Das React-/TypeScript-Grundgerüst ist bereit."),
  ).toBeVisible();
});
