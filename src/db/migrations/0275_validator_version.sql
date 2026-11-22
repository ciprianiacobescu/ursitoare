ALTER TABLE ursitoare.flow_version ADD COLUMN validator_version integer CHECK (validator_version IS NULL OR validator_version >= 1);
GRANT UPDATE (validator_version) ON TABLE ursitoare.flow_version TO ursitoare_app;
