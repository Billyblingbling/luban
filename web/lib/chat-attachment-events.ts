"use client"

import type { AttachmentRef } from "./luban-api"

const EVENT_NAME = "luban:add-chat-attachments"

export function emitAddChatAttachments(attachments: AttachmentRef[]): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { attachments } }))
}

export function onAddChatAttachments(
  handler: (attachments: AttachmentRef[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {}

  const listener = (ev: Event) => {
    const e = ev as CustomEvent<{ attachments?: AttachmentRef[] }>
    const attachments = Array.isArray(e.detail?.attachments) ? e.detail.attachments : []
    if (attachments.length === 0) return
    handler(attachments)
  }

  window.addEventListener(EVENT_NAME, listener as EventListener)
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener)
}

