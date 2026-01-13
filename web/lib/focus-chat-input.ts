"use client"

export function focusChatInput(): void {
  const focus = () => {
    const el = document.querySelector<HTMLTextAreaElement>('[data-testid="chat-input"]')
    el?.focus({ preventScroll: true })
  }

  window.requestAnimationFrame(() => {
    focus()
    window.setTimeout(() => focus(), 100)
  })
}
