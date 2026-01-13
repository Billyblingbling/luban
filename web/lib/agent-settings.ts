"use client"

import type { ThinkingEffort } from "./luban-api"

export type AgentModelSpec = {
  id: string
  label: string
  supportedThinkingEfforts: ThinkingEffort[]
}

export const THINKING_EFFORTS: ThinkingEffort[] = ["minimal", "low", "medium", "high", "xhigh"]

const CODEX_MAX_EFFORTS: ThinkingEffort[] = ["minimal", "medium", "high", "xhigh"]

export const AGENT_MODELS: AgentModelSpec[] = [
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5.2-codex",
    label: "GPT-5.2-Codex",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5.1-codex-max",
    label: "GPT-5.1-Codex-Max",
    supportedThinkingEfforts: CODEX_MAX_EFFORTS,
  },
  {
    id: "gpt-5.1-codex-mini",
    label: "GPT-5.1-Codex-Mini",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5.1-codex",
    label: "GPT-5.1-Codex",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5-codex",
    label: "GPT-5-Codex",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5-codex-mini",
    label: "GPT-5-Codex-Mini",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    supportedThinkingEfforts: THINKING_EFFORTS,
  },
]

export function supportedThinkingEffortsForModel(modelId: string | null | undefined): ThinkingEffort[] {
  if (!modelId) return THINKING_EFFORTS
  return AGENT_MODELS.find((m) => m.id === modelId)?.supportedThinkingEfforts ?? THINKING_EFFORTS
}
