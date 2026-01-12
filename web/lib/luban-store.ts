"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type {
  AppSnapshot,
  ConversationSnapshot,
  ThreadMeta,
  WorkspaceId,
  WorkspaceSnapshot,
  WorkspaceTabsSnapshot,
} from "./luban-api"
import { fetchApp } from "./luban-http"

export type PendingCreateThread = {
  workspaceId: WorkspaceId
  existingThreadIds: Set<number>
  requestedAtUnixMs: number
}

export type LubanStoreState = {
  app: AppSnapshot | null
  activeWorkspaceId: WorkspaceId | null
  activeThreadId: number | null
  threads: ThreadMeta[]
  workspaceTabs: WorkspaceTabsSnapshot | null
  conversation: ConversationSnapshot | null
  activeWorkspace: WorkspaceSnapshot | null
}

export type LubanStoreRefs = {
  activeWorkspaceIdRef: React.MutableRefObject<WorkspaceId | null>
  activeThreadIdRef: React.MutableRefObject<number | null>
  threadsRef: React.MutableRefObject<ThreadMeta[]>
  pendingCreateThreadRef: React.MutableRefObject<PendingCreateThread | null>
}

export type LubanStore = {
  state: LubanStoreState
  refs: LubanStoreRefs
  setApp: React.Dispatch<React.SetStateAction<AppSnapshot | null>>
  setActiveWorkspaceId: React.Dispatch<React.SetStateAction<WorkspaceId | null>>
  setActiveThreadId: React.Dispatch<React.SetStateAction<number | null>>
  setThreads: React.Dispatch<React.SetStateAction<ThreadMeta[]>>
  setWorkspaceTabs: React.Dispatch<React.SetStateAction<WorkspaceTabsSnapshot | null>>
  setConversation: React.Dispatch<React.SetStateAction<ConversationSnapshot | null>>
  markPendingCreateThread: (args: { workspaceId: WorkspaceId; existingThreadIds: Set<number> }) => void
}

export function findWorkspaceById(
  app: AppSnapshot | null,
  workspaceId: WorkspaceId | null,
): WorkspaceSnapshot | null {
  if (!app || workspaceId == null) return null
  for (const p of app.projects) {
    const w = p.workspaces.find((x) => x.id === workspaceId)
    if (w) return w
  }
  return null
}

export function useLubanStore(): LubanStore {
  const [app, _setApp] = useState<AppSnapshot | null>(null)
  const [activeWorkspaceId, _setActiveWorkspaceId] = useState<WorkspaceId | null>(null)
  const [activeThreadId, _setActiveThreadId] = useState<number | null>(null)
  const [threads, _setThreads] = useState<ThreadMeta[]>([])
  const [workspaceTabs, _setWorkspaceTabs] = useState<WorkspaceTabsSnapshot | null>(null)
  const [conversation, _setConversation] = useState<ConversationSnapshot | null>(null)

  const activeWorkspaceIdRef = useRef<WorkspaceId | null>(null)
  const activeThreadIdRef = useRef<number | null>(null)
  const threadsRef = useRef<ThreadMeta[]>([])
  const pendingCreateThreadRef = useRef<PendingCreateThread | null>(null)

  function setApp(next: React.SetStateAction<AppSnapshot | null>) {
    _setApp(next)
  }

  function setActiveWorkspaceId(next: React.SetStateAction<WorkspaceId | null>) {
    _setActiveWorkspaceId((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next
      activeWorkspaceIdRef.current = resolved
      return resolved
    })
  }

  function setActiveThreadId(next: React.SetStateAction<number | null>) {
    _setActiveThreadId((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next
      activeThreadIdRef.current = resolved
      return resolved
    })
  }

  function setThreads(next: React.SetStateAction<ThreadMeta[]>) {
    _setThreads((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next
      threadsRef.current = resolved
      return resolved
    })
  }

  function setWorkspaceTabs(next: React.SetStateAction<WorkspaceTabsSnapshot | null>) {
    _setWorkspaceTabs(next)
  }

  function setConversation(next: React.SetStateAction<ConversationSnapshot | null>) {
    _setConversation(next)
  }

  useEffect(() => {
    fetchApp()
      .then((snap) => setApp(snap))
      .catch((err) => console.error("fetchApp failed", err))
  }, [])

  const activeWorkspace = useMemo(
    () => findWorkspaceById(app, activeWorkspaceId),
    [app, activeWorkspaceId],
  )

  function markPendingCreateThread(args: { workspaceId: WorkspaceId; existingThreadIds: Set<number> }) {
    pendingCreateThreadRef.current = {
      workspaceId: args.workspaceId,
      existingThreadIds: args.existingThreadIds,
      requestedAtUnixMs: Date.now(),
    }
  }

  return {
    state: {
      app,
      activeWorkspaceId,
      activeThreadId,
      threads,
      workspaceTabs,
      conversation,
      activeWorkspace,
    },
    refs: {
      activeWorkspaceIdRef,
      activeThreadIdRef,
      threadsRef,
      pendingCreateThreadRef,
    },
    setApp,
    setActiveWorkspaceId,
    setActiveThreadId,
    setThreads,
    setWorkspaceTabs,
    setConversation,
    markPendingCreateThread,
  }
}
