import { expect, test } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { ensureWorkspace } from "./helpers"

function readWebVersion(): string {
  const pkgPath = path.join(__dirname, "..", "..", "package.json")
  const raw = fs.readFileSync(pkgPath, "utf8")
  const parsed = JSON.parse(raw) as { version?: string }
  return parsed.version ?? "unknown"
}

test("feedback modal includes build metadata", async ({ page }) => {
  await ensureWorkspace(page)

  await page.getByTestId("sidebar-open-feedback").click()
  await expect(page.getByTestId("feedback-modal")).toBeVisible({ timeout: 10_000 })

  await page.getByPlaceholder("Describe the bug or feature you'd like...").fill("App crashes when clicking button.")
  await page.getByRole("button", { name: "Polish", exact: true }).click()

  const issueBody = page.getByPlaceholder("Issue body...")
  await expect(issueBody).toBeVisible({ timeout: 10_000 })

  const body = await issueBody.inputValue()
  expect(body).toContain("## System Information")
  expect(body).toContain(`- Version: ${readWebVersion()}`)
  expect(body).toContain("- Channel: dev")
  expect(body).toMatch(/^- Commit: [0-9a-f]{40}$/m)

  const buildTimeMatch = body.match(/^- Build Time: (.+)$/m)
  expect(buildTimeMatch).not.toBeNull()
  expect(Number.isFinite(Date.parse(buildTimeMatch![1]))).toBeTruthy()
})
