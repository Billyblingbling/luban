"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Terminal,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  FileImage,
  FileText,
  FileJson,
  FileCode,
  Folder,
  FolderOpen,
  Trash2,
  Copy,
  FilePlus,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { PtyTerminal } from "./pty-terminal"
import { useLuban } from "@/lib/luban-context"
import type { AttachmentRef, ContextItemSnapshot } from "@/lib/luban-api"
import { deleteContextItem, fetchContext, uploadAttachment } from "@/lib/luban-http"
import { emitAddChatAttachments } from "@/lib/chat-attachment-events"
import { emitContextChanged, onContextChanged } from "@/lib/context-events"
import { focusChatInput } from "@/lib/focus-chat-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type RightPanelTab = "terminal" | "context"

interface RightSidebarProps {
  isOpen: boolean
  onToggle: () => void
  widthPx: number
}

export function RightSidebar({ isOpen, onToggle, widthPx }: RightSidebarProps) {
  const { activeWorkspaceId } = useLuban()
  const [activeTab, setActiveTab] = useState<RightPanelTab>("terminal")
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null)

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-3 top-2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors z-10"
        title="Open sidebar"
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>
    )
  }

  const canUseContext = activeWorkspaceId != null

  const handleDragOver = (e: React.DragEvent) => {
    if (activeTab !== "context") return
    if (!canUseContext) return
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (activeTab !== "context") return
    if (!canUseContext) return
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length === 0) return
    setDroppedFiles(files)
  }

  return (
    <div
      className={cn(
        "border-l border-border bg-card flex flex-col transition-colors",
        isDragOver && "bg-primary/5 border-primary/50",
      )}
      style={{ width: `${widthPx}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center h-11 px-1.5 border-b border-border gap-1">
        <button
          data-testid="right-sidebar-tab-terminal"
          onClick={() => setActiveTab("terminal")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded transition-all",
            activeTab === "terminal"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          title="Terminal"
        >
          <Terminal className="w-4 h-4" />
          {activeTab === "terminal" && <span className="text-xs font-medium">Terminal</span>}
        </button>

        <button
          data-testid="right-sidebar-tab-context"
          onClick={() => setActiveTab("context")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded transition-all",
            activeTab === "context"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canUseContext && "opacity-60",
          )}
          title="Context"
          disabled={!canUseContext}
        >
          <Paperclip className="w-4 h-4" />
          {activeTab === "context" && <span className="text-xs font-medium">Context</span>}
        </button>

        <div className="flex-1" />

        <button
          onClick={onToggle}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Close sidebar"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "terminal" ? (
          <div className="h-full overflow-auto overscroll-contain">
            <PtyTerminal />
          </div>
        ) : (
          <ContextPanel
            workspaceId={activeWorkspaceId}
            isDragOver={isDragOver}
            droppedFiles={droppedFiles}
            onConsumeDroppedFiles={() => setDroppedFiles(null)}
          />
        )}
      </div>
    </div>
  )
}

type ContextFileType = "image" | "document" | "data" | "code" | "text"

type ContextFileNode = {
  id: string
  name: string
  type: ContextFileType
  path: string
  contextId: number
  attachment: AttachmentRef
}

type ContextFolderNode = {
  id: string
  name: string
  path: string
  children: (ContextFolderNode | ContextFileNode)[]
}

type ContextNode = ContextFolderNode | ContextFileNode

function isFolder(node: ContextNode): node is ContextFolderNode {
  return (node as any).children != null
}

function fileTypeForAttachment(att: AttachmentRef): ContextFileType {
  if (att.kind === "image") return "image"
  const ext = att.extension.toLowerCase()
  if (ext === "json" || ext === "csv" || ext === "xml" || ext === "yaml" || ext === "yml" || ext === "toml") {
    return "data"
  }
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx" || ext === "rs" || ext === "go" || ext === "py") {
    return "code"
  }
  if (ext === "txt" || ext === "md") return "text"
  return "document"
}

function folderForType(t: ContextFileType): { id: string; name: string; path: string } {
  switch (t) {
    case "image":
      return { id: "images", name: "images", path: "/context/images" }
    case "document":
      return { id: "documents", name: "documents", path: "/context/documents" }
    case "data":
      return { id: "data", name: "data", path: "/context/data" }
    case "code":
      return { id: "code", name: "code", path: "/context/code" }
    case "text":
      return { id: "text", name: "text", path: "/context/text" }
  }
}

function buildContextTree(items: ContextItemSnapshot[]): ContextFolderNode[] {
  const byFolder = new Map<string, ContextFolderNode>()

  for (const item of items) {
    const att = item.attachment
    const t = fileTypeForAttachment(att)
    const folder = folderForType(t)

    const f =
      byFolder.get(folder.id) ??
      ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        children: [],
      } satisfies ContextFolderNode)

    const name = att.name
    const path = `${folder.path}/${name}`
    f.children.push({
      id: `ctx-${item.context_id}`,
      name,
      type: t,
      path,
      contextId: item.context_id,
      attachment: att,
    })
    byFolder.set(folder.id, f)
  }

  const order: ContextFileType[] = ["image", "document", "data", "code", "text"]
  return order
    .map((t) => folderForType(t).id)
    .map((id) => byFolder.get(id))
    .filter(Boolean) as ContextFolderNode[]
}

function attachmentKindForFile(file: File): "image" | "text" | "file" {
  const name = file.name.toLowerCase()
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("text/")) return "text"
  if (name.endsWith(".md") || name.endsWith(".txt") || name.endsWith(".json") || name.endsWith(".csv") || name.endsWith(".yaml") || name.endsWith(".yml")) {
    return "text"
  }
  return "file"
}

function ContextPanel({
  workspaceId,
  isDragOver,
  droppedFiles,
  onConsumeDroppedFiles,
}: {
  workspaceId: number | null
  isDragOver: boolean
  droppedFiles: File[] | null
  onConsumeDroppedFiles: () => void
}) {
  const [items, setItems] = useState<ContextItemSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(["images"]))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const refresh = useCallback(async () => {
    if (workspaceId == null) return
    setIsLoading(true)
    setError(null)
    try {
      const snap = await fetchContext(workspaceId)
      setItems(snap.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (workspaceId == null || files.length === 0) return
      await Promise.all(
        files.map((file) => uploadAttachment({ workspaceId, file, kind: attachmentKindForFile(file) })),
      )
      emitContextChanged(workspaceId)
      await refresh()
    },
    [refresh, workspaceId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (workspaceId == null) return
    return onContextChanged((wid) => {
      if (wid !== workspaceId) return
      void refresh()
    })
  }, [refresh, workspaceId])

  useEffect(() => {
    if (!droppedFiles || droppedFiles.length === 0) return
    if (workspaceId == null) return

    const files = droppedFiles
    onConsumeDroppedFiles()

    ;(async () => {
      try {
        await uploadFiles(files)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [droppedFiles, onConsumeDroppedFiles, uploadFiles, workspaceId])

  const tree = useMemo(() => buildContextTree(items), [items])

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (id: string, event: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (event.metaKey || event.ctrlKey) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleAddToChat = (item: ContextFileNode) => {
    emitAddChatAttachments([item.attachment])
    focusChatInput()
  }

  const handleCopyPath = (item: ContextNode) => {
    void navigator.clipboard.writeText(item.path).catch(() => {})
    toast("Copied path")
  }

  const handleDelete = async (item: ContextFileNode) => {
    if (workspaceId == null) return
    try {
      await deleteContextItem(workspaceId, item.contextId)
      setItems((prev) => prev.filter((i) => i.context_id !== item.contextId))
      emitContextChanged(workspaceId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAddContext = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || workspaceId == null) return
    const picked = Array.from(files)
    fileInputRef.current && (fileInputRef.current.value = "")
    void uploadFiles(picked).catch((err) => {
      toast.error(err instanceof Error ? err.message : String(err))
    })
  }

  if (workspaceId == null) {
    return <div className="p-3 text-xs text-muted-foreground">Select a workspace to manage context.</div>
  }

  return (
    <div className="flex flex-col h-full relative">
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg m-2 z-10 pointer-events-none">
          <div className="text-center">
            <Paperclip className="w-8 h-8 text-primary mx-auto mb-2" />
            <span className="text-sm font-medium text-primary">Drop files to add context</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto py-1">
        {isLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>}
        {error && <div className="px-3 py-2 text-xs text-destructive">{error}</div>}

        {tree.length === 0 && !isLoading && !error ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No context yet.</div>
        ) : (
          tree.map((folder) => (
            <ContextTreeNode
              key={folder.id}
              node={folder}
              level={0}
              selectedIds={selectedIds}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onSelect={toggleSelect}
              onAddToChat={handleAddToChat}
              onDelete={handleDelete}
              onCopyPath={handleCopyPath}
            />
          ))
        )}
      </div>

      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <button
          data-testid="context-add-more"
          onClick={handleAddContext}
          className="w-full aspect-[3/1] flex flex-col items-center justify-center gap-1.5 border border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
        >
          <Paperclip className="w-5 h-5" />
          <span className="text-xs">Add more context</span>
        </button>
      </div>
    </div>
  )
}

function ContextTreeNode({
  node,
  level,
  selectedIds,
  expandedFolders,
  onToggleFolder,
  onSelect,
  onAddToChat,
  onDelete,
  onCopyPath,
}: {
  node: ContextNode
  level: number
  selectedIds: Set<string>
  expandedFolders: Set<string>
  onToggleFolder: (id: string) => void
  onSelect: (id: string, event: React.MouseEvent) => void
  onAddToChat: (file: ContextFileNode) => void
  onDelete: (file: ContextFileNode) => void
  onCopyPath: (node: ContextNode) => void
}) {
  const isSelected = selectedIds.has(node.id)
  const folder = isFolder(node) ? node : null
  const file = !isFolder(node) ? node : null
  const isExpanded = folder ? expandedFolders.has(folder.id) : false

  const getFileIcon = (type: ContextFileType) => {
    switch (type) {
      case "image":
        return <FileImage className="w-4 h-4 text-status-info" />
      case "document":
        return <FileText className="w-4 h-4 text-status-error" />
      case "data":
        return <FileJson className="w-4 h-4 text-status-warning" />
      case "code":
        return <FileCode className="w-4 h-4 text-status-success" />
      default:
        return <FileIcon className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <>
      <div
        data-testid={file ? "context-file-row" : "context-folder-row"}
        className={cn(
          "group flex items-center gap-1 py-1 px-2 cursor-pointer transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
          onSelect(node.id, e)
          if (folder) onToggleFolder(folder.id)
        }}
        draggable={!!file}
        onDragStart={(e) => {
          if (!file) return
          e.dataTransfer.setData("luban-context-attachment", JSON.stringify(file.attachment))
          e.dataTransfer.setData("context-item", JSON.stringify({ path: file.path }))
        }}
      >
        {folder ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {folder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-status-warning" />
          ) : (
            <Folder className="w-4 h-4 text-status-warning" />
          )
        ) : (
          getFileIcon(file!.type)
        )}

        <span className="flex-1 text-xs truncate">
          {node.name}
        </span>

        {file && (
          <button
            data-testid="context-add-to-chat"
            onClick={(e) => {
              e.stopPropagation()
              onAddToChat(file)
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary rounded transition-all"
            title="Add to chat"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground rounded transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onCopyPath(node)}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy path
            </DropdownMenuItem>
            {file ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(file)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {folder && isExpanded && (
        <>
          {folder.children.map((child) => (
            <ContextTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedIds={selectedIds}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelect={onSelect}
              onAddToChat={onAddToChat}
              onDelete={onDelete}
              onCopyPath={onCopyPath}
            />
          ))}
        </>
      )}
    </>
  )
}
