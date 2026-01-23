"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus, RefreshCw, Scan } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Vector = { x: number; y: number }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function parseSvgViewBox(svg: string): { width: number; height: number } | null {
  const match = svg.match(/viewBox\s*=\s*"([^"]+)"/i)
  if (!match) return null
  const parts = String(match[1] ?? "")
    .trim()
    .split(/[\s,]+/)
    .map((v) => Number(v))
  if (parts.length !== 4) return null
  const [, , w, h] = parts
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return { width: w, height: h }
}

export function MermaidDiagramViewer({
  svg,
  className,
  initialMode = "fit",
}: {
  svg: string
  className?: string
  initialMode?: "fit" | "fitWidth" | "reset"
}): React.ReactElement {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const hasInteractedRef = useRef(false)

  const intrinsic = useMemo(() => parseSvgViewBox(svg), [svg])

  const [scale, setScale] = useState<number>(1)
  const [translate, setTranslate] = useState<Vector>({ x: 0, y: 0 })

  const minScale = 0.1
  const maxScale = 8

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (width <= 1 || height <= 1) return

    const target = intrinsic
    if (!target) {
      setScale(1)
      setTranslate({ x: 0, y: 0 })
      return
    }

    const s = clamp(Math.min(width / target.width, height / target.height) * 0.95, minScale, maxScale)
    const x = (width - target.width * s) / 2
    const y = (height - target.height * s) / 2
    setScale(s)
    setTranslate({ x, y })
  }, [intrinsic])

  const fitToWidth = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (width <= 1 || height <= 1) return

    const target = intrinsic
    if (!target) {
      setScale(1)
      setTranslate({ x: 0, y: 0 })
      return
    }

    const s = clamp((width / target.width) * 0.95, minScale, maxScale)
    const x = (width - target.width * s) / 2
    const y = Math.max((height - target.height * s) / 2, 8)
    setScale(s)
    setTranslate({ x, y })
  }, [intrinsic])

  const resetView = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (initialMode === "fit") {
      const id = window.requestAnimationFrame(() => fitToViewport())
      return () => window.cancelAnimationFrame(id)
    }
    if (initialMode === "fitWidth") {
      const id = window.requestAnimationFrame(() => fitToWidth())
      return () => window.cancelAnimationFrame(id)
    }
    resetView()
  }, [fitToViewport, fitToWidth, initialMode, resetView, svg])

  useEffect(() => {
    const handleResize = () => {
      if (initialMode === "fitWidth") {
        fitToWidth()
        return
      }
      fitToViewport()
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [fitToViewport, fitToWidth, initialMode])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    if (typeof ResizeObserver === "undefined") return
    if (initialMode !== "fit" && initialMode !== "fitWidth") return

    const observer = new ResizeObserver(() => {
      if (hasInteractedRef.current) return
      if (initialMode === "fitWidth") {
        fitToWidth()
        return
      }
      fitToViewport()
    })

    observer.observe(viewport)
    return () => observer.disconnect()
  }, [fitToViewport, fitToWidth, initialMode])

  const draggingRef = useRef<{
    pointerId: number
    startedAt: Vector
    translateAtStart: Vector
  } | null>(null)

  const onPointerDown = useCallback((ev: React.PointerEvent) => {
    const viewport = viewportRef.current
    if (!viewport) return

    if (ev.button !== 0) return
    hasInteractedRef.current = true
    viewport.setPointerCapture(ev.pointerId)
    draggingRef.current = {
      pointerId: ev.pointerId,
      startedAt: { x: ev.clientX, y: ev.clientY },
      translateAtStart: translate,
    }
  }, [translate])

  const onPointerMove = useCallback((ev: React.PointerEvent) => {
    const state = draggingRef.current
    if (!state) return
    if (state.pointerId !== ev.pointerId) return

    const dx = ev.clientX - state.startedAt.x
    const dy = ev.clientY - state.startedAt.y
    setTranslate({ x: state.translateAtStart.x + dx, y: state.translateAtStart.y + dy })
  }, [])

  const onPointerUp = useCallback((ev: React.PointerEvent) => {
    const state = draggingRef.current
    if (!state) return
    if (state.pointerId !== ev.pointerId) return
    draggingRef.current = null
  }, [])

  const zoomAt = useCallback(
    (nextScale: number, anchor: Vector) => {
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const local = { x: anchor.x - rect.left, y: anchor.y - rect.top }

      setTranslate((prev) => {
        const ratio = nextScale / scale
        return {
          x: local.x - (local.x - prev.x) * ratio,
          y: local.y - (local.y - prev.y) * ratio,
        }
      })
      setScale(nextScale)
    },
    [scale],
  )

  const onWheel = useCallback(
    (ev: React.WheelEvent) => {
      const viewport = viewportRef.current
      if (!viewport) return
      ev.preventDefault()
      hasInteractedRef.current = true

      const delta = ev.deltaY
      const factor = delta > 0 ? 0.9 : 1.1
      const nextScale = clamp(scale * factor, minScale, maxScale)
      if (Math.abs(nextScale - scale) < 1e-6) return

      zoomAt(nextScale, { x: ev.clientX, y: ev.clientY })
    },
    [scale, zoomAt],
  )

  const zoomIn = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    hasInteractedRef.current = true
    const rect = viewport.getBoundingClientRect()
    const nextScale = clamp(scale * 1.2, minScale, maxScale)
    zoomAt(nextScale, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }, [scale, zoomAt])

  const zoomOut = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    hasInteractedRef.current = true
    const rect = viewport.getBoundingClientRect()
    const nextScale = clamp(scale / 1.2, minScale, maxScale)
    zoomAt(nextScale, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }, [scale, zoomAt])

  return (
    <div className={cn("flex h-full w-full flex-col gap-2", className)} data-testid="mermaid-diagram-viewer">
      <div className="flex items-center justify-end gap-2 px-3 pt-3">
        <Button variant="outline" size="icon-sm" onClick={zoomOut} aria-label="Zoom out">
          <Minus />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={zoomIn} aria-label="Zoom in">
          <Plus />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={fitToViewport} aria-label="Fit to view">
          <Scan />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={resetView} aria-label="Reset view">
          <RefreshCw />
        </Button>
        <div className="ml-2 text-[11px] tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</div>
      </div>

      <div
        ref={viewportRef}
        className="relative mx-3 mb-3 flex-1 select-none overflow-hidden rounded border bg-muted/10"
        data-testid="mermaid-diagram-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ touchAction: "none" }}
      >
        <div
          data-testid="mermaid-diagram-svg"
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  )
}
