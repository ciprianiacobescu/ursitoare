ALTER TABLE ursitoare.step_execution ADD COLUMN hooks jsonb CHECK (hooks IS NULL OR (
  jsonb_typeof(hooks) = 'object'
  AND (jsonb_typeof(hooks -> 'entries') = 'array') IS TRUE
  AND (jsonb_typeof(hooks -> 'inputOriginalRef') = 'null' OR hooks ->> 'inputOriginalRef' ~ '^[0-9a-f]{64}$') IS TRUE));
GRANT UPDATE (hooks) ON TABLE ursitoare.step_execution TO ursitoare_app;
