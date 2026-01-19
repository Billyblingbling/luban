ALTER TABLE conversations
    ADD COLUMN run_started_at_unix_ms INTEGER;

ALTER TABLE conversations
    ADD COLUMN run_finished_at_unix_ms INTEGER;

