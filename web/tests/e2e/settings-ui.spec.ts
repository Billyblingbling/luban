import { expect, test } from "@playwright/test"
import { ensureWorkspace } from "./helpers"

test("settings panel updates theme and appearance fonts", async ({ page }) => {
  await ensureWorkspace(page)

  await page.getByTestId("sidebar-open-settings").click()
  await expect(page.getByTestId("settings-panel")).toBeVisible({ timeout: 10_000 })

  await page.getByTestId("settings-theme-dark").click()
  await page.getByTitle("Close settings").click()

  await expect
    .poll(async () => await page.evaluate(() => document.documentElement.classList.contains("dark")), {
      timeout: 10_000,
    })
    .toBeTruthy()

  await page.getByTestId("sidebar-open-settings").click()
  await expect(page.getByTestId("settings-panel")).toBeVisible({ timeout: 10_000 })

  await page.getByTestId("settings-ui-font").click()
  await expect(page.getByTestId("settings-ui-font-menu")).toBeVisible({ timeout: 5_000 })
  await page.getByTestId("settings-ui-font-menu").getByRole("button", { name: "Roboto", exact: true }).click()

  await expect
    .poll(
      async () =>
        await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--luban-font-ui").trim()),
      { timeout: 5_000 },
    )
    .toBe("Roboto")
})

