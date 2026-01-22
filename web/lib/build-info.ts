export interface BuildInfo {
  version: string
  commit: string
  tag: string
  buildTime: string
  channel: string
}

export function getBuildInfo(): BuildInfo {
  return {
    version: process.env.NEXT_PUBLIC_LUBAN_VERSION ?? "unknown",
    commit: process.env.NEXT_PUBLIC_LUBAN_COMMIT ?? "unknown",
    tag: process.env.NEXT_PUBLIC_LUBAN_GIT_TAG ?? "",
    buildTime: process.env.NEXT_PUBLIC_LUBAN_BUILD_TIME ?? "unknown",
    channel: process.env.NEXT_PUBLIC_LUBAN_BUILD_CHANNEL ?? "dev",
  }
}
