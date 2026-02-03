export function formatDurationMs(ms: number): string {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0
  if (safeMs < 1000) return "< 1s"

  const totalSeconds = Math.floor(safeMs / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const minutesTotal = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutesTotal < 60) return `${minutesTotal}m ${seconds}s`

  const hours = Math.floor(minutesTotal / 60)
  const minutes = minutesTotal % 60
  return `${hours}h ${minutes}m ${seconds}s`
}
