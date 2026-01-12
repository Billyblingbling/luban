"use client"

import type { AppSnapshot } from "./luban-api"
import {
  kanbanColumnForStatus,
  kanbanColumns,
  worktreeStatusFromWorkspace,
  type KanbanColumn,
  type WorktreeStatus,
} from "./worktree-ui"

export type KanbanWorktreeVm = {
  id: string
  name: string
  projectName: string
  status: WorktreeStatus
  prNumber?: number
  workspaceId: number
}

export type KanbanBoardVm = {
  worktrees: KanbanWorktreeVm[]
  worktreesByColumn: Record<KanbanColumn, KanbanWorktreeVm[]>
}

export function buildKanbanWorktrees(app: AppSnapshot | null): KanbanWorktreeVm[] {
  if (!app) return []
  const out: KanbanWorktreeVm[] = []
  for (const p of app.projects) {
    for (const w of p.workspaces) {
      if (w.status !== "active") continue
      const mapped = worktreeStatusFromWorkspace(w)
      out.push({
        id: w.short_id,
        name: w.branch_name,
        projectName: p.slug,
        status: mapped.status,
        prNumber: mapped.prNumber,
        workspaceId: w.id,
      })
    }
  }
  return out
}

export function groupKanbanWorktreesByColumn(
  worktrees: KanbanWorktreeVm[],
): Record<KanbanColumn, KanbanWorktreeVm[]> {
  return kanbanColumns.reduce(
    (acc, col) => {
      acc[col.id] = worktrees.filter((w) => kanbanColumnForStatus(w.status) === col.id)
      return acc
    },
    {} as Record<KanbanColumn, KanbanWorktreeVm[]>,
  )
}

export function buildKanbanBoardVm(app: AppSnapshot | null): KanbanBoardVm {
  const worktrees = buildKanbanWorktrees(app)
  return { worktrees, worktreesByColumn: groupKanbanWorktreesByColumn(worktrees) }
}

