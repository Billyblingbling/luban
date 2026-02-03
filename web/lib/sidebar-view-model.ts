"use client"

import type { AppSnapshot, OperationStatus, ProjectId } from "./luban-api"
import { isMockMode } from "./luban-mode"
import { computeProjectDisplayNames } from "./project-display-names"

function mockProjectAvatarUrl(displayName: string): string {
  const letter = displayName.trim().slice(0, 1).toUpperCase() || "?"
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">`,
    `<rect width="18" height="18" rx="4" fill="#e8e8e8" />`,
    `<text x="9" y="12" text-anchor="middle" font-size="10" font-family="system-ui, -apple-system, sans-serif" fill="#6b6b6b">${letter}</text>`,
    `</svg>`,
  ].join("")
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export type SidebarProjectVm = {
  id: ProjectId
  displayName: string
  path: string
  isGit: boolean
  avatarUrl?: string
  createWorkdirStatus: OperationStatus
}

export function buildSidebarProjects(
  app: AppSnapshot | null,
  args?: {
    projectOrder?: ProjectId[]
  },
): SidebarProjectVm[] {
  if (!app) return []
  const projectOrder = args?.projectOrder ?? []

  const displayNames = computeProjectDisplayNames(app.projects.map((p) => ({ path: p.path, name: p.name })))

  const projects = app.projects.map((p) => {
    const displayName = displayNames.get(p.path) ?? p.slug
    const vm: SidebarProjectVm = {
      id: p.id,
      displayName,
      path: p.path,
      isGit: p.is_git,
      avatarUrl: p.is_git
        ? isMockMode()
          ? mockProjectAvatarUrl(displayName)
          : `/api/projects/avatar?project_id=${encodeURIComponent(p.id)}`
        : undefined,
      createWorkdirStatus: p.create_workdir_status,
    }
    return vm
  })

  if (projectOrder.length === 0) return projects

  return sortWithCustomOrder(projects, (p) => p.id, projectOrder, () => 0)
}

function sortWithCustomOrder<T, K>(
  items: T[],
  getKey: (item: T) => K,
  order: K[],
  fallbackCompare: (a: T, b: T) => number
): T[] {
  const orderMap = new Map<K, number>()
  order.forEach((key, idx) => orderMap.set(key, idx))

  return [...items].sort((a, b) => {
    const fallback = fallbackCompare(a, b)
    if (fallback !== 0) return fallback

    const aOrder = orderMap.get(getKey(a))
    const bOrder = orderMap.get(getKey(b))

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder
    }
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1
    return 0
  })
}
