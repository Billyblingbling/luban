"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Send,
  Brain,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  Settings2,
  MessageSquare,
  Plus,
  X,
  ExternalLink,
  GitBranch,
  RotateCcw,
  Terminal,
  Eye,
  Pencil,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLuban } from "@/lib/luban-context"
import {
  agentModelLabel,
  buildMessages,
  thinkingEffortLabel,
} from "@/lib/conversation-ui"
import { AGENT_MODELS, supportedThinkingEffortsForModel } from "@/lib/agent-settings"
import { ConversationView } from "@/components/conversation-view"
import {
  draftKey,
  followTailKey,
  loadJson,
  saveJson,
} from "@/lib/ui-prefs"

interface ChatTab {
  id: string
  title: string
  isActive: boolean
}

interface ArchivedTab {
  id: string
  title: string
}

export function ChatPanel() {
  const [showTabDropdown, setShowTabDropdown] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const {
    app,
    activeWorkspaceId,
    activeThreadId,
    threads,
    workspaceTabs,
    conversation,
    selectThread,
    createThread,
    closeThreadTab,
    restoreThreadTab,
    sendAgentMessage,
    openWorkspaceInIde,
    setChatModel,
    setThinkingEffort,
  } = useLuban()

  const [draftText, setDraftText] = useState("")
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showEffortDropdown, setShowEffortDropdown] = useState(false)
  const [followTail, setFollowTail] = useState(true)
  const programmaticScrollRef = useRef(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const maxHeightPx = 160
    const nextHeight = Math.min(el.scrollHeight, maxHeightPx)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > maxHeightPx ? "auto" : "hidden"
  }, [draftText])

  const messages = useMemo(() => buildMessages(conversation), [conversation])
  const modelLabel = useMemo(() => agentModelLabel(conversation?.agent_model_id), [conversation?.agent_model_id])
  const effortLabel = useMemo(
    () => thinkingEffortLabel(conversation?.thinking_effort),
    [conversation?.thinking_effort],
  )
  const supportedEfforts = useMemo(
    () => supportedThinkingEffortsForModel(conversation?.agent_model_id),
    [conversation?.agent_model_id],
  )

  const projectInfo = useMemo(() => {
    if (app == null || activeWorkspaceId == null) return { name: "Luban", branch: "" }
    for (const p of app.projects) {
      for (const w of p.workspaces) {
        if (w.id !== activeWorkspaceId) continue
        return { name: p.slug, branch: w.branch_name }
      }
    }
    return { name: "Luban", branch: "" }
  }, [app, activeWorkspaceId])

  const threadsById = useMemo(() => {
    const out = new Map<number, (typeof threads)[number]>()
    for (const t of threads) out.set(t.thread_id, t)
    return out
  }, [threads])

  const openThreadIds = useMemo(() => {
    if (threads.length === 0) return []
    const ordered = workspaceTabs?.open_tabs ?? []
    const fromTabs = ordered.filter((id) => threadsById.has(id))
    if (fromTabs.length > 0) return fromTabs
    return threads.map((t) => t.thread_id)
  }, [threads, threadsById, workspaceTabs?.open_tabs])

  const openThreads = useMemo(() => {
    const out: (typeof threads)[number][] = []
    for (const id of openThreadIds) {
      const t = threadsById.get(id)
      if (t) out.push(t)
    }
    return out
  }, [openThreadIds, threadsById])

  const archivedTabs: ArchivedTab[] = useMemo(() => {
    const archived = workspaceTabs?.archived_tabs ?? []
    const out: ArchivedTab[] = []
    for (const id of [...archived].reverse()) {
      const t = threadsById.get(id)
      if (t) {
        out.push({ id: String(id), title: t.title })
      } else {
        out.push({ id: String(id), title: `Thread ${id}` })
      }
      if (out.length >= 20) break
    }
    return out
  }, [threadsById, workspaceTabs?.archived_tabs])

  const tabs: ChatTab[] = useMemo(
    () =>
      openThreads.map((t) => ({
        id: String(t.thread_id),
        title: t.title,
        isActive: t.thread_id === activeThreadId,
      })),
    [openThreads, activeThreadId],
  )

  const activeTabId = activeThreadId != null ? String(activeThreadId) : ""

  useEffect(() => {
    if (activeWorkspaceId == null || activeThreadId == null) {
      setDraftText("")
      return
    }

    setFollowTail(true)
    localStorage.setItem(followTailKey(activeWorkspaceId, activeThreadId), "true")

    const saved = loadJson<{ text: string }>(draftKey(activeWorkspaceId, activeThreadId))
    setDraftText(saved?.text ?? "")
  }, [activeWorkspaceId, activeThreadId])

  function scheduleScrollToBottom() {
    const el = scrollContainerRef.current
    if (!el) return

    programmaticScrollRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
        programmaticScrollRef.current = false
      })
    })
  }

  useEffect(() => {
    if (!followTail) return
    if (messages.length === 0) return
    scheduleScrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, followTail, activeWorkspaceId, activeThreadId])

  function persistDraft(nextText: string) {
    if (activeWorkspaceId == null || activeThreadId == null) return
    saveJson(draftKey(activeWorkspaceId, activeThreadId), {
      text: nextText,
    })
  }

  const handleTabClick = (tabId: string) => {
    const id = Number(tabId)
    if (!Number.isFinite(id)) return
    void selectThread(id)
  }

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const id = Number(tabId)
    if (!Number.isFinite(id)) return
    if (openThreadIds.length <= 1) return
    void closeThreadTab(id)
  }

  const handleAddTab = () => {
    if (activeWorkspaceId == null) return
    createThread()
  }

  const handleRestoreTab = (tab: ArchivedTab) => {
    if (activeWorkspaceId == null) return
    const id = Number(tab.id)
    if (!Number.isFinite(id)) return
    setShowTabDropdown(false)
    void restoreThreadTab(id)
  }

  const handleSend = () => {
    if (activeWorkspaceId == null || activeThreadId == null) return
    const text = draftText.trim()
    if (text.length === 0) return
    sendAgentMessage(text)
    setDraftText("")
    persistDraft("")
    setFollowTail(true)
    localStorage.setItem(followTailKey(activeWorkspaceId, activeThreadId), "true")
    scheduleScrollToBottom()
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex items-center h-11 border-b border-border bg-card px-4">
        <div className="flex items-center gap-2 min-w-0">
          <span data-testid="active-project-name" className="text-sm font-medium text-foreground truncate">
            {projectInfo.name}
          </span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <GitBranch className="w-3.5 h-3.5" />
            <span data-testid="active-workspace-branch" className="text-xs">
              {projectInfo.branch}
            </span>
          </div>
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Open in editor"
            disabled={activeWorkspaceId == null}
            onClick={() => {
              if (activeWorkspaceId == null) return
              openWorkspaceInIde(activeWorkspaceId)
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center h-10 border-b border-border bg-muted/30">
        <div className="flex-1 flex items-center min-w-0 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "group relative flex items-center gap-2 h-10 px-3 cursor-pointer transition-colors min-w-0 max-w-[180px]",
                tab.id === activeTabId
                  ? "text-foreground bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span data-testid="thread-tab-title" className="text-xs truncate flex-1">
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {tab.id === activeTabId && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </div>
          ))}
          <button
            onClick={handleAddTab}
            className="flex items-center justify-center w-8 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            title="New tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center px-1">
          <div className="relative">
            <button
              onClick={() => setShowTabDropdown(!showTabDropdown)}
              className={cn(
                "flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors",
                showTabDropdown && "bg-muted text-foreground",
              )}
              title="All tabs"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showTabDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTabDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
                      Open Tabs
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          handleTabClick(tab.id)
                          setShowTabDropdown(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors",
                          tab.id === activeTabId && "bg-primary/10 text-primary",
                        )}
                      >
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{tab.title}</span>
                      </button>
                    ))}
                  </div>

                  {archivedTabs.length > 0 && (
                    <>
                      <div className="p-2 border-t border-border">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
                          Recently Closed
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {archivedTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleRestoreTab(tab)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate flex-1">{tab.title}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        data-testid="chat-scroll-container"
        className="flex-1 overflow-y-auto relative"
        ref={scrollContainerRef}
        onScroll={(e) => {
          if (activeWorkspaceId == null || activeThreadId == null) return
          const el = e.target as HTMLDivElement
          const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
          const isNearBottom = distanceToBottom < 50
          if (!programmaticScrollRef.current) {
            setFollowTail(isNearBottom)
            localStorage.setItem(
              followTailKey(activeWorkspaceId, activeThreadId),
              isNearBottom ? "true" : "false",
            )
          }
        }}
      >
        <ConversationView
          messages={messages}
          className="max-w-3xl mx-auto py-4 px-4 pb-20"
          emptyState={
            <div className="max-w-3xl mx-auto py-4 px-4 text-sm text-muted-foreground">
              {activeWorkspaceId == null ? "Select a workspace to start." : "Select a thread to load conversation."}
            </div>
          }
        />
      </div>

      <div className="relative z-10 -mt-16 pt-8 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          {!followTail && messages.length > 0 ? (
            <div className="flex justify-center pb-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                onClick={() => {
                  if (activeWorkspaceId == null || activeThreadId == null) return
                  setFollowTail(true)
                  localStorage.setItem(followTailKey(activeWorkspaceId, activeThreadId), "true")
                  scheduleScrollToBottom()
                }}
              >
                <ArrowDown className="w-3 h-3" />
                Scroll to bottom
              </button>
            </div>
          ) : null}

          <div className="px-4 pb-4">
            <div className="max-w-3xl mx-auto">
              <div
                className={cn(
                  "relative bg-background border rounded-lg shadow-lg transition-all",
                  isComposerFocused ? "border-primary/50 ring-1 ring-primary/20 shadow-xl" : "border-border",
                )}
              >
                <div className="px-2.5 pt-2">
                  <textarea
                    ref={textareaRef}
                    data-testid="chat-input"
                    value={draftText}
                    onChange={(e) => {
                      setDraftText(e.target.value)
                      persistDraft(e.target.value)
                    }}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => setIsComposerFocused(false)}
                    placeholder="Message... (⌘↵ to send)"
                    className="w-full bg-transparent text-sm leading-5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[20px] max-h-[160px]"
                    rows={1}
                    disabled={activeWorkspaceId == null || activeThreadId == null}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                </div>

                <div className="flex items-center px-2 pb-2 pt-1">
                  <div className="relative">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (activeWorkspaceId == null || activeThreadId == null) return
                        setShowEffortDropdown(false)
                        setShowModelDropdown((v) => !v)
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-muted rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Brain className="w-3 h-3" />
                      <span>{modelLabel}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showModelDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowModelDropdown(false)}
                        />
                        <div className="absolute left-0 bottom-full mb-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-border">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
                              Model
                            </span>
                          </div>
                          <div className="py-1">
                            {AGENT_MODELS.map((m) => {
                              const selected = m.id === (conversation?.agent_model_id ?? "")
                              return (
                                <button
                                  key={m.id}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors",
                                    selected && "bg-primary/10 text-primary",
                                  )}
                                  onClick={() => {
                                    if (activeWorkspaceId == null || activeThreadId == null) return
                                    setChatModel(activeWorkspaceId, activeThreadId, m.id)
                                    setShowModelDropdown(false)
                                  }}
                                >
                                  {selected ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{m.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (activeWorkspaceId == null || activeThreadId == null) return
                        setShowModelDropdown(false)
                        setShowEffortDropdown((v) => !v)
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-muted rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>{effortLabel}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showEffortDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowEffortDropdown(false)}
                        />
                        <div className="absolute left-0 bottom-full mb-1 w-40 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-border">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2">
                              Effort
                            </span>
                          </div>
                          <div className="py-1">
                            {supportedEfforts.map((effort) => {
                              const selected = effort === (conversation?.thinking_effort ?? "")
                              return (
                                <button
                                  key={effort}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors",
                                    selected && "bg-primary/10 text-primary",
                                  )}
                                  onClick={() => {
                                    if (activeWorkspaceId == null || activeThreadId == null) return
                                    setThinkingEffort(activeWorkspaceId, activeThreadId, effort)
                                    setShowEffortDropdown(false)
                                  }}
                                >
                                  {selected ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{thinkingEffortLabel(effort)}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1" />
                  <button
                    data-testid="chat-send"
                    aria-label="Send message"
                    className={cn(
                      "p-1.5 rounded-md transition-all flex-shrink-0 disabled:opacity-50",
                      draftText.trim().length > 0 && activeWorkspaceId != null && activeThreadId != null
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground",
                    )}
                    onClick={handleSend}
                    disabled={draftText.trim().length === 0 || activeWorkspaceId == null || activeThreadId == null}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
