import { expect, test } from "@playwright/test"

import { ensureWorkspace } from "./helpers"

test("thinking summaries strip bold markdown markers", async ({ page }) => {
  await ensureWorkspace(page)

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
