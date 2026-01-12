"use client"

export function focusChatInput(): void {
  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLTextAreaElement>('[data-testid="chat-input"]')
    el?.focus({ preventScroll: true })
  })
}

