# C-HTTP-PROJECTS-AVATAR

Status: Draft
Verification: Mock=n/a, Provider=yes, CI=yes

## Surface

- Method: `GET`
- Path: `/api/projects/avatar`
- Query:
  - `project_id`: `ProjectId` (as returned by `GET /api/app`)

## Purpose

Provide a stable project avatar image for the UI.

For git projects with a GitHub remote, the server resolves the GitHub owner (user/org),
fetches the owner avatar, caches it locally, and serves it as the project avatar.

## Response

- `200 OK`
  - Headers:
    - `Content-Type: image/png`
  - Body: PNG bytes
- `404 Not Found`
  - When the project has no GitHub-based avatar (non-git project, non-GitHub remote, or missing owner).
- `400 Bad Request`
  - When `project_id` is missing or invalid.

## Invariants

- The server must only serve avatars for projects that exist in the current `AppSnapshot`.
- The response must be valid PNG bytes when `200 OK`.

## Web usage

- `web/components/luban-sidebar.tsx` (project list avatars)

