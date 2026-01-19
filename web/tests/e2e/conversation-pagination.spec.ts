import { expect, test } from "@playwright/test"
import { activeWorkspaceId, ensureWorkspace } from "./helpers"

test("loads older conversation entries when scrolling to top", async ({ page }) => {
  await ensureWorkspace(page)

  const workspaceId = await activeWorkspaceId(page)

  const tabTitles = page.getByTestId("thread-tab-title")
  const beforeTabs = await tabTitles.count()
  await page.getByTitle("New tab").click()
  await expect(tabTitles).toHaveCount(beforeTabs + 1, { timeout: 20_000 })
  const newTab = tabTitles.last().locator("..")
  await newTab.scrollIntoViewIfNeeded()
  await newTab.click()

  const threadsRes = await page.request.get(`/api/workspaces/${workspaceId}/threads`)
  expect(threadsRes.ok()).toBeTruthy()
  const threads = (await threadsRes.json()) as { tabs: { active_tab: number } }
  const threadId = Number(threads.tabs.active_tab)
  expect(Number.isFinite(threadId) && threadId > 0).toBeTruthy()
  const ids = { workspaceId, threadId }

  const runId = Math.random().toString(16).slice(2)
  const marker = `e2e-pagination-steps-${runId}`

  await page.getByTestId("chat-input").fill(marker)
  await page.getByTestId("chat-send").click()

  await expect
    .poll(async () => {
      const res = await page.request.get(
        `/api/workspaces/${ids.workspaceId}/conversations/${ids.threadId}?limit=1`,
      )
      if (!res.ok()) return 0
      const snap = (await res.json()) as { entries_total?: number }
      return snap.entries_total ?? 0
    }, { timeout: 60_000 })
    .toBeGreaterThan(2000)

  await expect
    .poll(async () => {
      const res = await page.request.get(
        `/api/workspaces/${ids.workspaceId}/conversations/${ids.threadId}?limit=2000`,
      )
      if (!res.ok()) return 0
      const snap = (await res.json()) as { entries_start?: number }
      return snap.entries_start ?? 0
    }, { timeout: 60_000 })
    .toBeGreaterThan(0)

  // Force the UI to refresh the conversation via HTTP so the client-side state has
  // `entries_start` populated before we attempt to load older pages.
  const refreshTab = page.getByTestId("thread-tab-title").last().locator("..")
  await refreshTab.scrollIntoViewIfNeeded()
  await refreshTab.click()

  const container = page.getByTestId("chat-scroll-container")
  await page.waitForTimeout(750)

  const expectedBefore = await page.request
    .get(`/api/workspaces/${ids.workspaceId}/conversations/${ids.threadId}?limit=2000`)
    .then(async (res) => {
      const snap = (await res.json()) as { entries_start?: number }
      return snap.entries_start ?? 0
    })

  const beforeRequest = page.waitForRequest((req) => {
    const url = req.url()
    return (
      url.includes(`/api/workspaces/${ids.workspaceId}/conversations/${ids.threadId}`) &&
      url.includes(`before=${expectedBefore}`)
    )
  })

  await container.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    el.dispatchEvent(new Event("scroll", { bubbles: true }))
    el.scrollTop = 10
    el.dispatchEvent(new Event("scroll", { bubbles: true }))
    el.scrollTop = 0
    el.dispatchEvent(new Event("scroll", { bubbles: true }))
  })

  await beforeRequest

  await expect(page.getByTestId("chat-input")).toBeVisible()
  await expect(page.getByText("Application error:", { exact: false })).toHaveCount(0)
})
