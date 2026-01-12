"use client"

import type { AppSnapshot, OperationStatus } from "./luban-api"
import { agentStatusFromWorkspace, prStatusFromWorkspace, type AgentStatus, type PRStatus } from "./worktree-ui"

export type SidebarWorktreeVm = {
  id: string
  name: string
  isHome: boolean
  isArchiving: boolean
  agentStatus: AgentStatus
  prStatus: PRStatus
  prNumber?: number
  prTitle?: string
  workspaceId: number
}

export type SidebarProjectVm = {
  id: number
  name: string
  expanded: boolean
  createWorkspaceStatus: OperationStatus
  worktrees: SidebarWorktreeVm[]
}

export function buildSidebarProjects(
  app: AppSnapshot | null,
  args: {
    nowUnixMs: number
    archiveAnimatingUntilUnixMsByWorkspaceId: Record<number, number>
  },
): SidebarProjectVm[] {
  if (!app) return []
  return app.projects.map((p) => ({
    id: p.id,
    name: p.slug,
    expanded: p.expanded,
    createWorkspaceStatus: p.create_workspace_status,
    worktrees: p.workspaces
      .filter(
        (w) =>
          w.status === "active" ||
          (args.archiveAnimatingUntilUnixMsByWorkspaceId[w.id] ?? 0) > args.nowUnixMs,
      )
      .map((w) => {
        const agentStatus = agentStatusFromWorkspace(w)
        const pr = prStatusFromWorkspace(w)
        const animatingUntil = args.archiveAnimatingUntilUnixMsByWorkspaceId[w.id] ?? 0
        return {
          id: w.short_id,
          name: w.branch_name,
          isHome: w.workspace_name === "main",
          isArchiving: w.archive_status === "running" || animatingUntil > args.nowUnixMs,
          agentStatus,
          prStatus: pr.status,
          prNumber: pr.prNumber,
          prTitle: pr.prState === "merged" ? "Merged" : undefined,
          workspaceId: w.id,
        }
      }),
  }))
}
