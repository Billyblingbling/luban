import type { AttachmentRef, WorkspaceId } from "./luban-api"
import { isMockMode } from "./luban-mode"
import { mockAttachmentUrl } from "./mock/mock-runtime"

export function attachmentHref(args: { workspaceId: WorkspaceId; attachment: AttachmentRef }): string | null {
  if (isMockMode()) return mockAttachmentUrl(args.attachment.id)
  const params = new URLSearchParams({ ext: args.attachment.extension })
  return `/api/workdirs/${args.workspaceId}/attachments/${args.attachment.id}?${params.toString()}`
}
