"use client"

export type AppearanceFonts = {
  uiFont: string
  chatFont: string
  codeFont: string
  terminalFont: string
}

export const DEFAULT_APPEARANCE_FONTS: AppearanceFonts = {
  uiFont: "Inter",
  chatFont: "Inter",
  codeFont: "Geist Mono",
  terminalFont: "Geist Mono",
}

const STORAGE_KEY = "luban:appearance:fonts"

export function loadAppearanceFonts(): AppearanceFonts {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_FONTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE_FONTS
    const parsed = JSON.parse(raw) as Partial<AppearanceFonts>
    return {
      uiFont: typeof parsed.uiFont === "string" && parsed.uiFont.trim() ? parsed.uiFont : DEFAULT_APPEARANCE_FONTS.uiFont,
      chatFont:
        typeof parsed.chatFont === "string" && parsed.chatFont.trim()
          ? parsed.chatFont
          : DEFAULT_APPEARANCE_FONTS.chatFont,
      codeFont:
        typeof parsed.codeFont === "string" && parsed.codeFont.trim()
          ? parsed.codeFont
          : DEFAULT_APPEARANCE_FONTS.codeFont,
      terminalFont:
        typeof parsed.terminalFont === "string" && parsed.terminalFont.trim()
          ? parsed.terminalFont
          : DEFAULT_APPEARANCE_FONTS.terminalFont,
    }
  } catch {
    return DEFAULT_APPEARANCE_FONTS
  }
}

export function storeAppearanceFonts(fonts: AppearanceFonts) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts))
  window.dispatchEvent(new CustomEvent("luban:appearance:fonts_changed", { detail: fonts }))
}

export function applyAppearanceFontsToDocument(fonts: AppearanceFonts) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--luban-font-ui", fonts.uiFont)
  root.style.setProperty("--luban-font-chat", fonts.chatFont)
  root.style.setProperty("--luban-font-code", fonts.codeFont)
  root.style.setProperty("--luban-font-terminal", fonts.terminalFont)
}

