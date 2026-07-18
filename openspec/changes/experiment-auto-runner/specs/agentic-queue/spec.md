# agentic-queue

> req: AGQ-006, AGQ-008, AGQ-010

## MODIFIED Requirements

### Requirement: Command experiments prove queue manager mechanics

Queue Manager command experiments SHALL use current manifest-registered `case-<id>-<cost>-<proof-role>` playbooks and V2 proof policy, not old simple/medium/complex `test-*` surfaces. Each current case SHALL create a real bundle under its Supervisor-owned case root, exercise the current Engine JS API or CLI, convert every verdict-affecting assertion into a strict playbook-owned root-trace check, and invoke native completion. The Playbook Agent SHALL stop before health or cleanup; the Autorun Supervisor SHALL validate completion, run V2-declared health targets and apply explicit cleanup policy. Old queue-control cases that depend on fixed queue-position shape SHALL be migrated to queue v2 or removed from current runner-readable locations.

#### Scenario: Current queue experiments use case taxonomy and host cleanup

- **WHEN** current docs or the manifest list queue-manager experiment cases
- **THEN** they SHALL use current case/cost proof roles and V2 policy
- **AND** they SHALL NOT list old simple/medium/complex `test-*` playbooks as current proof
- **AND** no playbook-local success cleanup SHALL bypass native completion, health, durable audit, or explicit Supervisor policy

### Requirement: Wave0 queue-loop simple playbook

The current manifest-registered Wave0 queue-loop role SHALL verify the work-unit queue loop end to end in a fresh contained disposable bundle. It SHALL use real framework CLIs, work-unit claim/submit for delegated source intake when that behavior is claimed, gate failure diagnostics, and repair/refill through new queue demand. Verdict-affecting facts SHALL be strict root-trace checks finalized through native completion, not console confidence or a Playbook Agent summary.

#### Scenario: Real search uses work-unit loop

- **WHEN** the playbook runs a real Wave0 source-intake case
- **THEN** the declared Subject actor SHALL receive queue demand through `operate-work-unit claim`
- **AND** each delegated result SHALL return through `operate-work-unit submit`
- **AND** the Wave0 gate SHALL pass only after submitted ledger coverage exists

### Requirement: Seed-topics queue-loop simple playbook

The current manifest-registered seed-topics queue-loop role SHALL verify the queue-driven execution loop in a fresh contained disposable bundle. It SHALL pre-seed three fixture `topic_registry` entries plus the required profile, exercise the current seed-topics enqueue/claim/execute/complete/gate path, require complete seed-topic frontmatter and original-context constraints, verify bidirectional slug consistency, and mark missing upstream facts as gaps rather than fabricate them. The deterministic fixture case SHALL require no web search, SHALL use V2 deterministic proof policy, and SHALL finish through strict trace checks and native completion rather than a hard-coded legacy path or console PASS.

#### Scenario: Full seed-topics queue loop

- **WHEN** the case pre-seeds a post-setup bundle with three sufficiently described topics and executes the current seed-topics queue flow
- **THEN** three task cards SHALL be enqueued and completed through the current queue contract
- **AND** the queue SHALL drain, each `seed_topics/<slug>.md` SHALL contain required fields, and the real gate SHALL pass
- **AND** native PASS SHALL require the case-owned required checks; cleanup remains Supervisor policy
