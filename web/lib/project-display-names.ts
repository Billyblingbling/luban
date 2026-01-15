"use client"

type ProjectLike = {
  path: string
  name?: string | null
}

function splitPathSegments(pathValue: string): string[] {
  return pathValue
    .split(/[\\/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function computeProjectDisplayNames(projects: ProjectLike[]): Map<string, string> {
  const result = new Map<string, string>()

  const byBasename = new Map<string, ProjectLike[]>()
  for (const project of projects) {
    const segs = splitPathSegments(project.path)
    const basename = segs[segs.length - 1] || project.name || project.path
    const group = byBasename.get(basename) ?? []
    group.push(project)
    byBasename.set(basename, group)
  }

  for (const [basename, group] of byBasename) {
    if (group.length === 1) {
      result.set(group[0]!.path, basename)
      continue
    }

    const pathSegments = group.map((p) => splitPathSegments(p.path).reverse())
    const maxDepth = Math.max(...pathSegments.map((s) => s.length))
    let depth = 1
    while (depth <= maxDepth) {
      const suffixes = pathSegments.map((segs) => segs.slice(0, depth).reverse().join("/"))
      const uniqueSuffixes = new Set(suffixes)
      if (uniqueSuffixes.size === group.length) {
        group.forEach((p, i) => result.set(p.path, suffixes[i]!))
        break
      }
      depth++
    }

    if (!result.has(group[0]!.path)) {
      group.forEach((p) => result.set(p.path, p.path))
    }
  }

  return result
}

