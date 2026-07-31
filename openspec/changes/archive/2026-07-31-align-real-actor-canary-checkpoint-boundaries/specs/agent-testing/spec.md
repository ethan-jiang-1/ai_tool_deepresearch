> req: AGT-003

## MODIFIED Requirements

### Requirement: Three-level real subagent test playbooks

The real subagent test playbook family SHALL exercise sub-agent actor behavior through work-unit claim, bounded prompt execution, Subject-owned durable result/receipt/output/cache evidence, submit, submitted ledger coverage, and gate-visible provenance. It SHALL use current case/cost playbook naming and light/standard/heavy cost labels where applicable; production-path assertions SHALL use work-unit artifacts and Engine submit results.

Each real-actor canary SHALL align its native required checks to the checkpoint declared by its own claim. A canary whose setup only supplies an actor envelope SHALL NOT require a Phase Gate or a Phase-owned canonical projection that its Playbook/Phase Agent did not establish. It SHALL stop after its declared actor checkpoint and SHALL not report that result as Phase readiness, Gate pass, or research quality. A playbook that claims a Wave Gate result SHALL instead establish the Gate's complete Phase-owned inputs through its declared Phase flow before treating that Gate as verdict evidence.

Current runnable real-subagent playbooks SHALL NOT use retired delegated transport mechanisms as proof surfaces. Old delegated transport cases SHALL be migrated when they still prove current work-unit behavior, or removed from current experiment surfaces when they no longer have current proof or diagnostic value.

Retired delegated proof surfaces include non-work-unit directories, retired channel identity fields, retired commit/spawn events, retired dispatch manifests, and old helper APIs.

#### Scenario: light or heavy subagent playbook uses work-unit path

- **WHEN** a current real-subagent playbook runs
- **THEN** it SHALL claim a work unit, spawn a bounded sub-agent task, submit by `work_id`, and verify submitted ledger coverage

#### Scenario: actor canary does not inherit an unestablished Phase Gate

- **WHEN** a real-subagent canary has fixture setup for a work-unit envelope but no Phase-owned canonical projection
- **THEN** its native required checks SHALL evaluate only the declared actor checkpoint
- **AND** it SHALL not create, repair, or require a Wave Gate result to report that actor-checkpoint outcome

#### Scenario: Phase Gate proof retains Phase-owned inputs

- **WHEN** a real-subagent playbook includes a Wave Gate as verdict evidence
- **THEN** its declared Phase flow SHALL establish the canonical projections and other Gate inputs before the Gate invocation
- **AND** a submitted Actor result alone SHALL not be reported as a Phase Gate pass

#### Scenario: old delegated subagent playbook is not current

- **WHEN** a real-subagent playbook still requires a retired delegated production command or path
- **THEN** it SHALL NOT be listed as a current runnable proof case
- **AND** it SHALL be migrated to work-unit proof or removed from current experiment surfaces

#### Scenario: old delegated identity fields are not current proof

- **WHEN** a real-subagent playbook proves execution using retired delegated channel identity, retired dispatch manifests, or non-work-unit delegated paths
- **THEN** it SHALL be migrated to work-unit identity and submit evidence or removed from current experiment surfaces
- **AND** its old delegated verdict SHALL NOT count as current work-unit proof
