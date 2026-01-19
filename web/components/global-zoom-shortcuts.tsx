"use client"

import { useLayoutEffect, useState } from "react"

import { isTauri } from "@tauri-apps/api/core"

import {
  applyGlobalZoom,
  clampGlobalZoom,
  DEFAULT_GLOBAL_ZOOM,
  stepGlobalZoom,
} from "@/lib/global-zoom"
import { useLuban } from "@/lib/luban-context"
import { GLOBAL_ZOOM_KEY } from "@/lib/ui-prefs"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  return target.isContentEditable
}

function readStoredZoom(): number | null {
  const raw = localStorage.getItem(GLOBAL_ZOOM_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return clampGlobalZoom(parsed)
}

function writeStoredZoom(next: number) {
  localStorage.setItem(GLOBAL_ZOOM_KEY, String(clampGlobalZoom(next)))
}

export function GlobalZoomShortcuts() {
  const { app, setGlobalZoom } = useLuban()
  const [zoom, setZoom] = useState<number>(DEFAULT_GLOBAL_ZOOM)

  useLayoutEffect(() => {
    if (!isTauri()) return
    const stored = readStoredZoom()
    if (stored == null) return
    setZoom(stored)
    applyGlobalZoom(stored)
  }, [])

  useLayoutEffect(() => {
    if (!isTauri()) return
    if (!app) return
    const fromApp = clampGlobalZoom(app.appearance.global_zoom)
    const stored = readStoredZoom()
    const differs = stored != null && Math.abs(stored - fromApp) > 0.001

    if (differs && Math.abs(fromApp - DEFAULT_GLOBAL_ZOOM) <= 0.001 && Math.abs(stored - DEFAULT_GLOBAL_ZOOM) > 0.001) {
      // The app state reported default zoom but a persisted local preference exists.
      // Prefer the local value and self-heal the server-side UI state.
      setZoom(stored)
      applyGlobalZoom(stored)
      writeStoredZoom(stored)
      setGlobalZoom(stored)
      return
    }

    setZoom(fromApp)
    applyGlobalZoom(fromApp)
    writeStoredZoom(fromApp)
  }, [app, setGlobalZoom])

  useLayoutEffect(() => {
    if (!isTauri()) return
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      if (e.defaultPrevented) return

      const key = e.key
      const code = e.code
      const editable = isEditableTarget(e.target)

      const plus = key === "+" || key === "=" || code === "NumpadAdd"
      const minus = key === "-" || key === "_" || code === "NumpadSubtract"
      const reset = key === "0" || code === "Numpad0"

      if (!plus && !minus && !reset) return

      e.preventDefault()

      setZoom((current) => {
        const next = reset ? DEFAULT_GLOBAL_ZOOM : stepGlobalZoom(current, plus ? 1 : -1)
        applyGlobalZoom(next)
        writeStoredZoom(next)
        setGlobalZoom(next)
        return next
      })

      if (editable) {
        // keep the behavior consistent even when focused in an input.
        // no-op: we intentionally zoom globally.
      }
    }

    window.addEventListener("keydown", handler, { capture: true })
    return () => window.removeEventListener("keydown", handler, { capture: true } as AddEventListenerOptions)
  }, [setGlobalZoom])

  return null
}
