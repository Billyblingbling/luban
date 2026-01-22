export type LubanMode = "real" | "mock"

export function lubanMode(): LubanMode {
  return process.env.NEXT_PUBLIC_LUBAN_MODE === "mock" ? "mock" : "real"
}

export function isMockMode(): boolean {
  return lubanMode() === "mock"
}

