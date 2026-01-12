"use client"

import type React from "react"

import { AppearanceProvider } from "@/components/appearance-provider"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppearanceProvider>{children}</AppearanceProvider>
    </ThemeProvider>
  )
}

