"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import type { AppearanceFonts } from "@/lib/appearance-prefs"
import {
  applyAppearanceFontsToDocument,
  DEFAULT_APPEARANCE_FONTS,
  loadAppearanceFonts,
  storeAppearanceFonts,
} from "@/lib/appearance-prefs"

type AppearanceContextValue = {
  fonts: AppearanceFonts
  setFonts: (patch: Partial<AppearanceFonts>) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [fonts, setFontsState] = useState<AppearanceFonts>(DEFAULT_APPEARANCE_FONTS)

  useEffect(() => {
    const initial = loadAppearanceFonts()
    setFontsState(initial)
    applyAppearanceFontsToDocument(initial)

    const onChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<AppearanceFonts>).detail
      if (!detail) return
      setFontsState(detail)
      applyAppearanceFontsToDocument(detail)
    }

    window.addEventListener("luban:appearance:fonts_changed", onChanged)
    return () => window.removeEventListener("luban:appearance:fonts_changed", onChanged)
  }, [])

  const api = useMemo<AppearanceContextValue>(() => {
    return {
      fonts,
      setFonts: (patch) => {
        setFontsState((prev) => {
          const next: AppearanceFonts = {
            uiFont: patch.uiFont ?? prev.uiFont,
            chatFont: patch.chatFont ?? prev.chatFont,
            codeFont: patch.codeFont ?? prev.codeFont,
            terminalFont: patch.terminalFont ?? prev.terminalFont,
          }
          storeAppearanceFonts(next)
          applyAppearanceFontsToDocument(next)
          return next
        })
      },
    }
  }, [fonts])

  return <AppearanceContext.Provider value={api}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider")
  return ctx
}

