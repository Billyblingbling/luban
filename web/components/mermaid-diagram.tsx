"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { MermaidDiagramViewer } from "@/components/mermaid-diagram-viewer"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

type MermaidModule = typeof import("mermaid")

let mermaidModulePromise: Promise<MermaidModule> | null = null
let mermaidInitialized = false

async function loadMermaid(): Promise<MermaidModule> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid")
  }
  return await mermaidModulePromise
}

function normalizeMermaidCode(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\n$/, "")
}

export function MermaidDiagram({ code, className }: { code: string; className?: string }) {
  const id = useId()
  const renderId = useMemo(() => `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`, [id])
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "dark" ? "dark" : "default"

  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = normalizeMermaidCode(code)
    if (!next.trim()) {
      setSvg(null)
      setError("empty mermaid diagram")
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const mod = await loadMermaid()
        const mermaid = mod.default ?? mod

        if (!mermaidInitialized) {
          mermaid.initialize({ startOnLoad: false })
          mermaidInitialized = true
        }

        // Theme is applied per render; avoid global config coupling between different diagrams.
        mermaid.initialize({ theme })

        const rendered = await mermaid.render(renderId, next)
        const svgText = typeof rendered === "string" ? rendered : rendered.svg

        if (cancelled) return
        setError(null)
        setSvg(svgText)
      } catch (e) {
        if (cancelled) return
        setSvg(null)
        setError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code, renderId, theme])

  if (svg) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Expand diagram"
            data-testid="mermaid-diagram-trigger"
            className={cn("w-full text-left", className)}
          >
            <div
              data-testid="mermaid-diagram"
              className={cn(
                "relative my-2 h-64 w-full overflow-hidden rounded border border-border bg-muted/10",
                "[&_svg]:block [&_svg]:max-w-none [&_svg]:h-auto",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
                Click to expand
              </div>
              <div className="p-2" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </button>
        </DialogTrigger>
        <DialogContent
          className="h-[85vh] max-h-[85vh] w-[90vw] max-w-[90vw] gap-0 p-0 sm:max-w-[90vw]"
          data-testid="mermaid-diagram-dialog"
        >
          <MermaidDiagramViewer svg={svg} initialMode="fitWidth" />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <pre
      data-testid="mermaid-diagram-fallback"
      className={cn("my-2 p-2 overflow-x-auto rounded border border-border bg-muted/30 text-[12px]", className)}
    >
      <code className="font-mono text-[12px] whitespace-pre-wrap break-words">{normalizeMermaidCode(code)}</code>
      {error ? <div className="mt-2 text-[11px] text-muted-foreground">Mermaid render failed: {error}</div> : null}
    </pre>
  )
}
