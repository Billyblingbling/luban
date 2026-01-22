import { expect, test } from "@playwright/test"

import { activeWorkspaceId, ensureWorkspace, sendWsAction } from "./helpers"

async function activeThreadId(page: import("@playwright/test").Page, workspaceId: number): Promise<number> {
  const res = await page.request.get(`/api/workspaces/${workspaceId}/threads`)
  expect(res.ok()).toBeTruthy()
  const snapshot = (await res.json()) as { tabs: { active_tab: number } }
  return Number(snapshot.tabs.active_tab)
}

async function createThreadViaUi(page: import("@playwright/test").Page, workspaceId: number): Promise<number> {
  const before = await activeThreadId(page, workspaceId)
  await page.getByTitle("New tab").click()
  await expect.poll(async () => await activeThreadId(page, workspaceId), { timeout: 30_000 }).not.toBe(before)
  return await activeThreadId(page, workspaceId)
}

test("assistant mermaid blocks render as svg", async ({ page }) => {
  await ensureWorkspace(page)

  const workspaceId = await activeWorkspaceId(page)
  const threadId = await createThreadViaUi(page, workspaceId)
  expect(threadId).toBeGreaterThan(0)

  const runId = Math.random().toString(16).slice(2)
  const marker = `e2e-mermaid-${runId}`
  const text = ["e2e-mermaid", "```mermaid", "graph TD", `  A[${marker}] --> B[Rendered]`, "```"].join("\n")

  await sendWsAction(page, {
    type: "send_agent_message",
    workspace_id: workspaceId,
    thread_id: threadId,
    text,
    attachments: [],
  })

  const preview = page.getByTestId("mermaid-diagram").first()
  await expect(preview).toBeVisible({ timeout: 20_000 })
  await expect(preview.locator("svg")).toHaveCount(1)

  await page.getByTestId("mermaid-diagram-trigger").first().click()
  const dialog = page.getByTestId("mermaid-diagram-dialog")
  await expect(dialog).toBeVisible({ timeout: 20_000 })

  const viewer = page.getByTestId("mermaid-diagram-viewer")
  await expect(viewer).toBeVisible({ timeout: 20_000 })
  await expect(viewer.getByTestId("mermaid-diagram-svg").locator("svg")).toHaveCount(1)
  await expect(viewer).toContainText(marker)

  await dialog.locator('[data-slot="dialog-close"]').click()
  await expect(dialog).toHaveCount(0)

  await expect(page.getByTestId("mermaid-diagram-fallback")).toHaveCount(0)
})
