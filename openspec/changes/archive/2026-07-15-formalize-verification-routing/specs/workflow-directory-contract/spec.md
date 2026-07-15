# Workflow Directory Contract (delta)

> req: WDC-005

## MODIFIED Requirements

### Requirement: Test and experiment boundary

The repository SHALL use the canonical `verification-routing` test classes and asset boundaries:

- `unit` SHALL use focused in-process `node:test` assets under `tests/`, outside `tests/integration/` and `tests/e2e/`, with directories mirroring the owned framework or project surface where applicable. Test-owned temporary fixture I/O MAY remain in `unit` when it exercises only that one in-process contract;
- `integration` SHALL use JS-led `node:test` assets under `tests/integration/`;
- `deterministic_e2e` SHALL use JS-led full-chain state tests under `tests/e2e/`;
- `agent_flow_e2e` SHALL use coding-Agent-executed Markdown playbooks under the owning `experiments_playbook/exp_*/` family over real disposable run bundles. Workflow-foundation-specific cases SHALL remain under `experiments_playbook/exp_workflow-foundation/` when that family owns the proof.

`regression`, controlled-E2E prose, playbook cost, proof subject, actor type, and runtime bundle type SHALL NOT be introduced as competing test classes. `DPT_FRAMEWORK/` SHALL NOT contain test files, experiment fixtures, or playbooks.

#### Scenario: Unit test location

- **WHEN** a focused test covers gate-evaluator deterministic behavior
- **THEN** its `test_class` SHALL be `unit`
- **AND** the test file SHALL live under `tests/engine/gates/` corresponding to `DPT_FRAMEWORK/engine/gates/`

#### Scenario: Deterministic full chain stays under tests

- **WHEN** JS simulates labeled Markdown/Agent-owned inputs and exercises a long state chain through real Engine paths
- **THEN** its `test_class` SHALL be `deterministic_e2e`
- **AND** the test file SHALL live under `tests/e2e/`, not `experiments_playbook/` or a repo-top-level `tests_e2e/`

#### Scenario: agent_flow_e2e is not a JS-led asset

- **WHEN** a coding Agent must execute a Markdown playbook over a real disposable bundle
- **THEN** its `test_class` SHALL be `agent_flow_e2e`
- **AND** the playbook SHALL live under the appropriate `experiments_playbook/exp_*/` family, not `tests/`

#### Scenario: Behavior determines class before directory

- **WHEN** a governance test invokes a real checker subprocess and reads or writes fixture repository files
- **THEN** its `test_class` SHALL be `integration`
- **AND** it SHALL live under `tests/integration/governance/` rather than using a unit-oriented directory to change its classification

#### Scenario: Temporary fixture I/O does not force integration

- **WHEN** a focused helper or schema test imports one in-process contract and uses a test-owned temporary file as input or output
- **THEN** its `test_class` MAY remain `unit`
- **AND** the fixture file SHALL NOT be treated as a production CLI, multi-component, or workflow-chain boundary
