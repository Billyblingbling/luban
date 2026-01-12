"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { AppSnapshot, ConversationSnapshot, ThreadMeta, WorkspaceId, WorkspaceSnapshot } from "./luban-api"
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
  const [app, setApp] = useState<AppSnapshot | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)
  const [threads, setThreads] = useState<ThreadMeta[]>([])
  const [conversation, setConversation] = useState<ConversationSnapshot | null>(null)

  const activeWorkspaceIdRef = useRef<WorkspaceId | null>(null)
  const activeThreadIdRef = useRef<number | null>(null)
  const threadsRef = useRef<ThreadMeta[]>([])
  const pendingCreateThreadRef = useRef<PendingCreateThread | null>(null)

  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId
  }, [activeWorkspaceId])

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

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
    setConversation,
    markPendingCreateThread,
  }
}

