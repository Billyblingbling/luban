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
  const mermaidLines = [
    "graph TD",
    `  A0[${marker}] --> A1[Step 1]`,
    "  A1 --> A2[Step 2]",
    "  A2 --> A3[Step 3]",
    "  A3 --> A4[Step 4]",
    "  A4 --> A5[Step 5]",
    "  A5 --> A6[Step 6]",
    "  A6 --> A7[Step 7]",
    "  A7 --> A8[Step 8]",
    "  A8 --> A9[Step 9]",
    "  A9 --> A10[Step 10]",
    "  A10 --> A11[Step 11]",
    "  A11 --> A12[Step 12]",
    "  A12 --> A13[Step 13]",
    "  A13 --> A14[Step 14]",
    "  A14 --> A15[Step 15]",
    "  A15 --> A16[Step 16]",
    "  A16 --> A17[Step 17]",
    "  A17 --> A18[Step 18]",
    "  A18 --> A19[Rendered]",
  ]
  const text = ["e2e-mermaid", "```mermaid", ...mermaidLines, "```"].join("\n")

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

  await expect.poll(
    async () => {
      const metrics = await viewer.evaluate((root) => {
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

        const viewport = root.querySelector<HTMLElement>('[data-testid="mermaid-diagram-viewport"]')
        const wrapper = root.querySelector<HTMLElement>('[data-testid="mermaid-diagram-svg"]')
        const svg = wrapper?.querySelector("svg")

        if (!viewport || !wrapper || !svg) {
          return { delta: 1e9 }
        }

        const rect = viewport.getBoundingClientRect()
        if (rect.width <= 1 || rect.height <= 1) {
          return { delta: 1e9 }
        }

        const viewBox = String(svg.getAttribute("viewBox") ?? "").trim()
        const parts = viewBox.split(/[\s,]+/).map((v) => Number(v))
        if (parts.length !== 4) {
          return { delta: 1e9 }
        }
        const vbWidth = parts[2]
        const vbHeight = parts[3]
        if (!Number.isFinite(vbWidth) || !Number.isFinite(vbHeight) || vbWidth <= 0 || vbHeight <= 0) {
          return { delta: 1e9 }
        }

        const transform = wrapper.style.transform
        const match = transform.match(/scale\(([^)]+)\)/)
        const actualScale = match ? Number(match[1]) : NaN
        if (!Number.isFinite(actualScale)) {
          return { delta: 1e9 }
        }

        const minScale = 0.1
        const maxScale = 8
        const expectedFitWidth = clamp((rect.width / vbWidth) * 0.95, minScale, maxScale)
        const expectedFitView = clamp(
          Math.min(rect.width / vbWidth, rect.height / vbHeight) * 0.95,
          minScale,
          maxScale,
        )
        return {
          actualScale,
          expectedFitWidth,
          expectedFitView,
          delta: Math.abs(actualScale - expectedFitWidth),
        }
      })

      return metrics.delta
    },
    { timeout: 20_000 },
  ).toBeLessThan(0.05)

  const { actualScale, expectedFitWidth, expectedFitView } = await viewer.evaluate((root) => {
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

    const viewport = root.querySelector<HTMLElement>('[data-testid="mermaid-diagram-viewport"]')
    const wrapper = root.querySelector<HTMLElement>('[data-testid="mermaid-diagram-svg"]')
    const svg = wrapper?.querySelector("svg")
    if (!viewport || !wrapper || !svg) {
      return { actualScale: NaN, expectedFitWidth: NaN, expectedFitView: NaN }
    }

    const rect = viewport.getBoundingClientRect()
    const viewBox = String(svg.getAttribute("viewBox") ?? "").trim()
    const parts = viewBox.split(/[\s,]+/).map((v) => Number(v))
    if (parts.length !== 4) {
      return { actualScale: NaN, expectedFitWidth: NaN, expectedFitView: NaN }
    }

    const vbWidth = parts[2]
    const vbHeight = parts[3]
    const transform = wrapper.style.transform
    const match = transform.match(/scale\(([^)]+)\)/)
    const actualScale = match ? Number(match[1]) : NaN

    const minScale = 0.1
    const maxScale = 8
    const expectedFitWidth = clamp((rect.width / vbWidth) * 0.95, minScale, maxScale)
    const expectedFitView = clamp(Math.min(rect.width / vbWidth, rect.height / vbHeight) * 0.95, minScale, maxScale)

    return { actualScale, expectedFitWidth, expectedFitView }
  })

  expect(actualScale).toBeCloseTo(expectedFitWidth, 1)
  expect(expectedFitWidth).toBeGreaterThan(expectedFitView)

  await dialog.locator('[data-slot="dialog-close"]').click()
  await expect(dialog).toHaveCount(0)

  await expect(page.getByTestId("mermaid-diagram-fallback")).toHaveCount(0)
})
