> req: AGT-001, AGT-002, AGT-003, AGT-005

## MODIFIED Requirements

### Requirement: gate-loop command experiment playbooks (AGT-001)

The gate-loop Agent-assisted command experiment family SHALL use current command-experiment case naming and cost/role taxonomy. Current gate-loop playbooks SHALL be `case-<id>-<cost>-<proof-role>.md` files under `experiments_playbook/exp_gate-loop/`, SHALL create isolated disposable bundles, SHALL write verdict-affecting checks to the bundle trace, and SHALL derive PASS/FAIL from trace JSONL `check` events.

Current main spec Purpose SHALL describe command experiments as case/cost playbooks over real disposable bundles and trace-backed verdicts. It SHALL NOT describe the current testing system as simple/medium/complex `test-*` playbooks when those files no longer exist as current runner surfaces.

#### Scenario: gate-loop cases use current case taxonomy

- **WHEN** current gate-loop experiment guidance names runnable playbooks
- **THEN** it SHALL name current case/cost files such as the light three-return case, repair-loop case, and full-pipeline case
- **AND** it SHALL NOT name `test-simple.md`, `test-medium.md`, or `test-complex.md` as current runnable proof

### Requirement: gate-fork command experiment playbooks (AGT-002)

The gate-fork Agent-assisted command experiment family SHALL use current command-experiment case naming and cost/role taxonomy. Current gate-fork playbooks SHALL be `case-<id>-<cost>-<proof-role>.md` files under `experiments_playbook/exp_gate-fork/`, SHALL create isolated disposable bundles, SHALL write verdict-affecting checks to the bundle trace, and SHALL derive PASS/FAIL from trace JSONL `check` events.

#### Scenario: gate-fork cases use current case taxonomy

- **WHEN** current gate-fork experiment guidance names runnable playbooks
- **THEN** it SHALL name current case/cost files such as the four-return case, repair-retry case, and full-pipeline case
- **AND** it SHALL NOT name `test-simple.md`, `test-medium.md`, or `test-complex.md` as current runnable proof

### Requirement: Three-level real subagent test playbooks (AGT-003)

The real subagent test playbook family SHALL exercise sub-agent actor behavior through work-unit claim, bounded prompt execution, submit, submitted ledger coverage, and gate-visible provenance. It SHALL use current case/cost playbook naming and light/standard/heavy cost labels where applicable; production-path assertions SHALL use work-unit artifacts and Engine submit results.

Current runnable real-subagent playbooks SHALL NOT use retired relay/slot production mechanisms as proof surfaces. Old relay/slot cases SHALL be migrated when they still prove current work-unit behavior, or removed from current experiment surfaces when they no longer have current proof or diagnostic value.

Retired relay/slot proof surfaces include relay slot directories, slot identity fields, relay commit/spawn events, relay dispatch manifests, and old relay helper APIs.

#### Scenario: light or heavy subagent playbook uses work-unit path

- **WHEN** a current real-subagent playbook runs
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

### Requirement: Playbook frontmatter weight field (AGT-005)

Each command experiment playbook SHALL carry runner-facing cost metadata that matches the current command-experiment convention. Until the accepted frontmatter schema grows a dedicated `standard` value, filename cost labels SHALL map as follows: `light` and `standard` files use `weight: light`, while `heavy` files use `weight: heavy`.

Current specs SHALL NOT describe old simple/medium/complex filenames as the way to infer execution cost. Runner-facing docs MAY explain legacy mappings only as cleanup-control or migration context, not as current authoring guidance.

#### Scenario: cost label and weight remain aligned

- **WHEN** a current playbook is named `case-<id>-standard-<role>.md`
- **THEN** its frontmatter MAY use `weight: light` until a `standard` weight is accepted
- **AND** runner guidance SHALL treat the filename cost and frontmatter weight as distinct routing facts

#### Scenario: old filename taxonomy is not current cost metadata

- **WHEN** current specs or runner docs explain experiment cost
- **THEN** they SHALL use light/standard/heavy cost labels and the accepted `weight` frontmatter convention
- **AND** they SHALL NOT instruct agents to infer current cost from `test-simple.md`, `test-medium.md`, or `test-complex.md`
