"use client"

const EVENT_NAME = "luban:context-changed"

export function emitContextChanged(workspaceId: number): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { workspaceId } }))
}

export function onContextChanged(handler: (workspaceId: number) => void): () => void {
  if (typeof window === "undefined") return () => {}

  const listener = (ev: Event) => {
    const e = ev as CustomEvent<{ workspaceId?: number }>
    const id = e.detail?.workspaceId
    if (typeof id !== "number") return
    handler(id)
  }

  window.addEventListener(EVENT_NAME, listener as EventListener)
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener)
}

