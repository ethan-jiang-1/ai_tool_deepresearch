> req: AGT-003

## MODIFIED Requirements

### Requirement: Three-level real subagent test playbooks (AGT-003)

The real subagent test playbook family SHALL exercise sub-agent actor behavior through work-unit claim, bounded prompt execution, submit, submitted ledger coverage, and gate-visible provenance. It SHALL keep light/standard/heavy levels, but production-path assertions SHALL use work-unit artifacts and Engine submit results.

Current runnable real-subagent playbooks SHALL NOT use retired relay/slot production mechanisms as proof surfaces. Old relay/slot cases SHALL be migrated when they still prove current work-unit behavior, or removed from current experiment surfaces when they no longer have current proof or diagnostic value.

Retired relay/slot proof surfaces include relay slot directories, slot identity fields, relay commit/spawn events, relay dispatch manifests, and old relay helper APIs.

#### Scenario: simple subagent playbook uses work-unit path

- **WHEN** the simple real subagent playbook runs
- **THEN** it SHALL claim a work unit, spawn a bounded sub-agent task, submit by `work_id`, and verify submitted ledger coverage

#### Scenario: old relay subagent playbook is not current

- **WHEN** a real-subagent playbook still requires a retired relay/slot production command or path
- **THEN** it SHALL NOT be listed as a current runnable proof case
- **AND** it SHALL be migrated to work-unit proof or removed from current experiment surfaces

#### Scenario: old relay identity fields are not current proof

- **WHEN** a real-subagent playbook proves execution using `slotKey`, `roleAgentKey`, relay commit/spawn events, `dispatch.json`, or `_subagents/` paths
- **THEN** it SHALL be migrated to work-unit identity and submit evidence or removed from current experiment surfaces
- **AND** its old relay verdict SHALL NOT count as current work-unit proof

### Requirement: Runtime-agent trace events prove real execution path (AGT-003)

Runtime-agent trace evidence SHALL bind to work-unit lifecycle events and submitted work-unit identity. The playbook SHALL prove that the sub-agent actor actually ran by checking Engine and runtime evidence associated with `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

Trace, log, and receipt assertions SHALL NOT depend on unsubmitted relay/slot artifacts as current production evidence.

#### Scenario: runtime evidence binds work unit

- **WHEN** a sub-agent result is accepted
- **THEN** the trace and log evidence SHALL identify the submitted work unit
- **AND** the verdict SHALL not depend on unsubmitted filesystem artifacts

### Requirement: Runtime-agent evidence is mandatory (AGT-003)

The real subagent test suite SHALL require sub-agent-written runtime receipts and Engine-validated work-unit submit output for real LLM sub-agent acceptance.

Fixture-backed or old relay/slot evidence SHALL NOT satisfy real-agent proof unless it is routed through the accepted work-unit submit and ledger path. Obsolete evidence fixtures with no current diagnostic value SHALL be removed rather than kept as current examples.

#### Scenario: missing runtime evidence fails real-agent proof

- **WHEN** a claimed work unit lacks matching runtime evidence for its receipt nonce
- **THEN** the real subagent playbook SHALL NOT claim proof of real sub-agent execution
