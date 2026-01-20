"use client"

import { Keyboard } from "lucide-react"

export function EscCancelHint({ visible, timeoutMs }: { visible: boolean; timeoutMs: number }) {
  if (!visible) return null

  return (
    <div className="flex justify-center pb-2">
      <div
        data-testid="esc-cancel-hint"
        className="flex items-center gap-2 px-3 py-2 bg-status-warning/10 border border-status-warning/30 rounded-lg text-xs text-status-warning shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <Keyboard className="w-3.5 h-3.5" />
        <span>
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-status-warning/20 rounded text-[10px] font-mono font-medium">Esc</kbd>{" "}
          again to cancel
        </span>
        <div className="w-12 h-1 bg-status-warning/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-status-warning rounded-full"
            style={{
              animation: `shrink ${timeoutMs}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

