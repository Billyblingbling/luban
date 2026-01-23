export type LubanMode = "real" | "mock"

declare global {
  interface Window {
    __LUBAN_MODE__?: LubanMode
  }
}

export function lubanMode(): LubanMode {
  if (typeof window !== "undefined" && window.__LUBAN_MODE__ != null) return window.__LUBAN_MODE__
  return process.env.NEXT_PUBLIC_LUBAN_MODE === "mock" ? "mock" : "real"
}

export function isMockMode(): boolean {
  return lubanMode() === "mock"
}
