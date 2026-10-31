CREATE INDEX audit_event_type_idx ON ursitoare.audit_event (tenant_id, event_type, seq DESC);
CREATE INDEX policy_decision_time_idx ON ursitoare.policy_decision (tenant_id, decided_at DESC, decision_id DESC);
