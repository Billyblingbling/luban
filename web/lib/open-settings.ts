"use client"

export type SettingsSectionId = "theme" | "fonts" | "agent" | "task"

export function openSettingsPanel(sectionId: SettingsSectionId = "agent"): void {
  window.dispatchEvent(new CustomEvent("luban:open-settings", { detail: { sectionId } }))
}

