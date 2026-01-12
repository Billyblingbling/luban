PRAGMA foreign_keys = ON;

CREATE TABLE context_items (
  id            INTEGER PRIMARY KEY,
  project_slug  TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  kind          TEXT NOT NULL,
  name          TEXT NOT NULL,
  extension     TEXT NOT NULL,
  mime          TEXT,
  byte_len      INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX context_items_workspace_created_at
  ON context_items(project_slug, workspace_name, created_at_ms DESC, id DESC);

