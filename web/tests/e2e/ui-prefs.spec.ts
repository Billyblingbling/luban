import { expect, test } from "@playwright/test"
import { ensureWorkspace, sendWsAction } from "./helpers"

async function activeWorkspaceId(page: import("@playwright/test").Page): Promise<number> {
  const raw = (await page.evaluate(() => localStorage.getItem("luban:active_workspace_id"))) ?? ""
  const id = Number(raw)
  expect(Number.isFinite(id) && id > 0).toBeTruthy()
  return id
}

async function serverActiveThreadId(
  page: import("@playwright/test").Page,
  workspaceId: number,
): Promise<number> {
  const res = await page.request.get(`/api/workspaces/${workspaceId}/threads`)
  expect(res.ok()).toBeTruthy()
  const snapshot = (await res.json()) as { tabs: { active_tab: number } }
  return Number(snapshot.tabs.active_tab)
}

test("restores last active tab per workspace even if server differs", async ({ page }) => {
  await ensureWorkspace(page)

  const workspaceId = await activeWorkspaceId(page)

  const before = await serverActiveThreadId(page, workspaceId)
  await page.getByTitle("New tab").click()

  await expect.poll(async () => await serverActiveThreadId(page, workspaceId), { timeout: 30_000 }).not.toBe(before)
  const createdThreadId = await serverActiveThreadId(page, workspaceId)
  const storedKey = `luban:active_thread_id:${workspaceId}`
  await expect
    .poll(async () => (await page.evaluate((k) => localStorage.getItem(k), storedKey)) ?? "", { timeout: 10_000 })
    .toBe(String(createdThreadId))

  // Simulate another client selecting a different tab on the server (without changing localStorage).
  await sendWsAction(page, { type: "activate_workspace_thread", workspace_id: workspaceId, thread_id: before })
  await expect
    .poll(async () => await serverActiveThreadId(page, workspaceId), { timeout: 10_000 })
    .toBe(before)

  await page.reload()
  await page.getByTestId("chat-input").waitFor({ state: "visible", timeout: 60_000 })

  // The UI should restore the locally stored active tab, and self-heal the server state.
  await expect
    .poll(async () => await serverActiveThreadId(page, workspaceId), { timeout: 30_000 })
    .toBe(createdThreadId)
})

test("remembers the last used open button selection", async ({ page }) => {
  await ensureWorkspace(page)

  await page.getByTestId("open-button-menu").click()
  await page.getByTestId("open-button-item-cursor").click()
  await expect(page.getByTestId("open-button-primary")).toHaveText(/Cursor/, { timeout: 10_000 })

  await page.reload()
  await page.getByTestId("open-button-primary").waitFor({ timeout: 30_000 })
  await expect(page.getByTestId("open-button-primary")).toHaveText(/Cursor/)
})
