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

  await page.evaluate(() => {
    localStorage.removeItem("theme")
    localStorage.removeItem("resolvedTheme")
  })
  await page.reload()

  await expect
    .poll(async () => await page.evaluate(() => document.documentElement.classList.contains("dark")), {
      timeout: 20_000,
    })
    .toBeTruthy()

  await expect
    .poll(
      async () =>
        await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--luban-font-ui").trim()),
      { timeout: 20_000 },
    )
    .toBe("Roboto")
})

test("task prompt templates persist across reload", async ({ page }) => {
  await ensureWorkspace(page)

  await page.getByTestId("sidebar-open-settings").click()
  await expect(page.getByTestId("settings-panel")).toBeVisible({ timeout: 10_000 })

  await page.getByRole("button", { name: "Task", exact: true }).click()
  await expect(page.getByTestId("task-prompt-editor")).toBeVisible({ timeout: 10_000 })

  await page.getByTestId("task-prompt-tab-other").click()
  const textarea = page.getByTestId("task-prompt-template")
  const original = await textarea.inputValue()

  const marker = `e2e-marker-${Date.now()}`
  await textarea.fill(`${original}\n${marker}\n`)

  await page.getByTestId("task-prompt-save").click()
  await page.waitForTimeout(1200)
  await page.reload()

  await page.getByTestId("sidebar-open-settings").click()
  await expect(page.getByTestId("settings-panel")).toBeVisible({ timeout: 10_000 })

  await page.getByRole("button", { name: "Task", exact: true }).click()
  await page.getByTestId("task-prompt-tab-other").click()
  await expect
    .poll(async () => await page.getByTestId("task-prompt-template").inputValue(), { timeout: 10_000 })
    .toContain(marker)

  await page.getByTestId("task-prompt-template").fill(original)
  await page.getByTestId("task-prompt-save").click()
  await page.waitForTimeout(1200)
  await page.getByTitle("Close settings").click()
})
