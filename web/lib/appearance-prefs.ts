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

export function applyAppearanceFontsToDocument(fonts: AppearanceFonts) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--luban-font-ui", fonts.uiFont)
  root.style.setProperty("--luban-font-chat", fonts.chatFont)
  root.style.setProperty("--luban-font-code", fonts.codeFont)
  root.style.setProperty("--luban-font-terminal", fonts.terminalFont)
}
