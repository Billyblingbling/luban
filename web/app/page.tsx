import { AgentIDE } from "@/components/agent-ide"
import { GlobalZoomShortcuts } from "@/components/global-zoom-shortcuts"
import { LubanProvider } from "@/lib/luban-context"

export default function Home() {
  return (
    <LubanProvider>
      <GlobalZoomShortcuts />
      <AgentIDE />
    </LubanProvider>
  )
}
