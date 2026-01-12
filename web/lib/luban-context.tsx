"use client"

import type React from "react"

import { createContext, useContext, useEffect } from "react"
import { toast } from "sonner"

import type {
  AppSnapshot,
  ConversationSnapshot,
  ServerEvent,
  ThreadMeta,
  TaskDraft,
  TaskExecuteMode,
  TaskExecuteResult,
  WorkspaceId,
  WorkspaceSnapshot,
} from "./luban-api"
import { createLubanActions } from "./luban-actions"
import { useLubanStore } from "./luban-store"
import { ACTIVE_WORKSPACE_KEY } from "./ui-prefs"
import { useLubanTransport } from "./luban-transport"
import { DEFAULT_NEW_THREAD_TIMEOUT_MS, pickCreatedThreadId } from "./luban-thread-flow"

type LubanContextValue = {
  app: AppSnapshot | null
  activeWorkspaceId: WorkspaceId | null
  activeWorkspace: WorkspaceSnapshot | null
  activeThreadId: number | null
  threads: ThreadMeta[]
  conversation: ConversationSnapshot | null
  wsConnected: boolean

  pickProjectPath: () => Promise<string | null>
  addProject: (path: string) => void
  createWorkspace: (projectId: number) => void
  openWorkspacePullRequest: (workspaceId: WorkspaceId) => void
  openWorkspacePullRequestFailedAction: (workspaceId: WorkspaceId) => void
  archiveWorkspace: (workspaceId: number) => void
  toggleProjectExpanded: (projectId: number) => void

  previewTask: (input: string) => Promise<TaskDraft>
  executeTask: (draft: TaskDraft, mode: TaskExecuteMode) => Promise<TaskExecuteResult>

  openWorkspace: (workspaceId: WorkspaceId) => Promise<void>
  selectThread: (threadId: number) => Promise<void>
  createThread: () => void

  sendAgentMessage: (text: string) => void
  sendAgentMessageTo: (workspaceId: WorkspaceId, threadId: number, text: string) => void
  cancelAgentTurn: () => void
}

const LubanContext = createContext<LubanContextValue | null>(null)

export function LubanProvider({ children }: { children: React.ReactNode }) {
  const store = useLubanStore()
  const { app, activeWorkspaceId, activeThreadId, threads, conversation, activeWorkspace } = store.state
  const { activeWorkspaceIdRef, activeThreadIdRef, pendingCreateThreadRef } = store.refs

  function handleAppChanged(event: Extract<ServerEvent, { type: "app_changed" }>) {
    store.setApp(event.snapshot)
  }

  function handleWorkspaceThreadsChanged(
    event: Extract<ServerEvent, { type: "workspace_threads_changed" }>,
  ) {
    const wid = activeWorkspaceIdRef.current
    if (wid == null || wid !== event.workspace_id) return

    setThreads(event.threads)
    const current = activeThreadIdRef.current

    const pending = pendingCreateThreadRef.current
    if (pending && pending.workspaceId === wid) {
      const created = pickCreatedThreadId({
        threads: event.threads,
        existingThreadIds: pending.existingThreadIds,
      })
      if (created != null) {
        pendingCreateThreadRef.current = null
        void actions.selectThreadInWorkspace(wid, created)
        return
      }

      if (Date.now() - pending.requestedAtUnixMs > DEFAULT_NEW_THREAD_TIMEOUT_MS) {
        pendingCreateThreadRef.current = null
      }
    }

    if (current == null || !event.threads.some((t) => t.thread_id === current)) {
      const next = event.threads[0]?.thread_id ?? null
      if (next != null) {
        void actions.selectThreadInWorkspace(wid, next)
      }
    }
  }

  function handleConversationChanged(event: Extract<ServerEvent, { type: "conversation_changed" }>) {
    const wid = activeWorkspaceIdRef.current
    const tid = activeThreadIdRef.current
    if (wid == null || tid == null) return
    if (event.snapshot.workspace_id === wid && event.snapshot.thread_id === tid) {
      store.setConversation(event.snapshot)
    }
  }

  function handleToast(event: Extract<ServerEvent, { type: "toast" }>) {
    console.warn("server toast:", event.message)
    toast(event.message)
  }

  const { wsConnected, sendAction: sendActionTransport, request: requestTransport } = useLubanTransport({
    onEvent: (event) => {
      switch (event.type) {
        case "app_changed":
          handleAppChanged(event)
          return
        case "workspace_threads_changed":
          handleWorkspaceThreadsChanged(event)
          return
        case "conversation_changed":
          handleConversationChanged(event)
          return
        case "toast":
          handleToast(event)
          return
      }
    },
    onError: (message) => {
      console.warn("server error:", message)
      toast.error(message)
    },
  })

  const actions = createLubanActions({
    store,
    sendAction: sendActionTransport,
    request: requestTransport,
  })

  useEffect(() => {
    if (app == null) return
    if (activeWorkspaceId != null) return
    const raw = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    const stored = raw ? Number(raw) : null
    if (!stored || !Number.isFinite(stored)) return
    const exists = app.projects.some((p) => p.workspaces.some((w) => w.id === stored))
    if (!exists) return
    void actions.openWorkspace(stored)
  }, [app, activeWorkspaceId])

  const value: LubanContextValue = {
    app,
    activeWorkspaceId,
    activeWorkspace,
    activeThreadId,
    threads,
    conversation,
    wsConnected,
    pickProjectPath: actions.pickProjectPath,
    addProject: actions.addProject,
    createWorkspace: actions.createWorkspace,
    openWorkspacePullRequest: actions.openWorkspacePullRequest,
    openWorkspacePullRequestFailedAction: actions.openWorkspacePullRequestFailedAction,
    archiveWorkspace: actions.archiveWorkspace,
    toggleProjectExpanded: actions.toggleProjectExpanded,
    previewTask: actions.previewTask,
    executeTask: actions.executeTask,
    openWorkspace: actions.openWorkspace,
    selectThread: actions.selectThread,
    createThread: actions.createThread,
    sendAgentMessage: actions.sendAgentMessage,
    sendAgentMessageTo: actions.sendAgentMessageTo,
    cancelAgentTurn: actions.cancelAgentTurn,
  }

  return <LubanContext.Provider value={value}>{children}</LubanContext.Provider>
}

export function useLuban(): LubanContextValue {
  const ctx = useContext(LubanContext)
  if (!ctx) throw new Error("useLuban must be used within LubanProvider")
  return ctx
}
