import type { AppSnapshot } from "@/lib/luban-api"

import { computeProjectDisplayNames } from "@/lib/project-display-names"

export type ActiveProjectInfo = {
  name: string
  branch: string
  isGit: boolean
  isMainBranch: boolean
}

export function getActiveProjectInfo(app: AppSnapshot | null, activeWorkspaceId: number | null): ActiveProjectInfo {
  if (app == null || activeWorkspaceId == null) {
    return { name: "Luban", branch: "", isGit: false, isMainBranch: false }
  }

  const displayNames = computeProjectDisplayNames(app.projects.map((p) => ({ path: p.path, name: p.name })))
  for (const p of app.projects) {
    for (const w of p.workspaces) {
      if (w.id !== activeWorkspaceId) continue
      return {
        name: displayNames.get(p.path) ?? p.slug,
        branch: w.branch_name,
        isGit: p.is_git,
        isMainBranch: w.workspace_name === "main",
      }
    }
  }

  return { name: "Luban", branch: "", isGit: false, isMainBranch: false }
}

