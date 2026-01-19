import { expect, test } from "@playwright/test"

import { ensureWorkspace } from "./helpers"

test("thinking summaries strip bold markdown markers", async ({ page }) => {
  await ensureWorkspace(page)

  const tabTitles = page.getByTestId("thread-tab-title")
  const beforeTabs = await tabTitles.count()
  await page.getByTitle("New tab").click()
  await expect(tabTitles).toHaveCount(beforeTabs + 1, { timeout: 20_000 })
  const newTab = tabTitles.last().locator("..")
  await newTab.scrollIntoViewIfNeeded()
  await newTab.click()

  const runId = Math.random().toString(16).slice(2)
  const marker = `e2e-running-card-${runId}-e2e-thinking-markdown`

  await page.getByTestId("chat-input").fill(marker)
  await page.getByTestId("chat-send").click()

  const runningHeader = page.getByTestId("agent-running-header")
  await expect(runningHeader).toBeVisible({ timeout: 20_000 })

  // Wait for the fake agent to finish (the running card disappears).
  await expect(runningHeader).toHaveCount(0, { timeout: 30_000 })

  const activityHeader = page.getByRole("button", { name: /Completed|Cancelled/i }).first()
  await activityHeader.click()

  await expect(page.getByText("Plan: verify markdown summary stripping.").first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("**Plan**")).toHaveCount(0)
})

test("file change summaries include changed file paths", async ({ page }) => {
  await ensureWorkspace(page)

  const tabTitles = page.getByTestId("thread-tab-title")
  const beforeTabs = await tabTitles.count()
  await page.getByTitle("New tab").click()
  await expect(tabTitles).toHaveCount(beforeTabs + 1, { timeout: 20_000 })
  const newTab = tabTitles.last().locator("..")
  await newTab.scrollIntoViewIfNeeded()
  await newTab.click()

  const runId = Math.random().toString(16).slice(2)
  const marker = `e2e-running-card-${runId}-e2e-file-change`

  await page.getByTestId("chat-input").fill(marker)
  await page.getByTestId("chat-send").click()

  const runningHeader = page.getByTestId("agent-running-header")
  await expect(runningHeader).toBeVisible({ timeout: 20_000 })
  await expect(runningHeader).toHaveCount(0, { timeout: 30_000 })

  const activityHeader = page.getByRole("button", { name: /Completed|Cancelled/i }).first()
  await activityHeader.click()

  await expect(page.getByText("src/e2e-file-change/a.txt").first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("web/e2e-file-change/b.ts").first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("README.md").first()).toBeVisible({ timeout: 20_000 })
})
