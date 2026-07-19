# experiment-observability

> req: EXO-002, EXO-006

## RENAMED Requirements

- FROM: `### Requirement: Profile-driven health checks`
- TO: `### Requirement: Profile-driven health checks consume explicit case health policy`

- FROM: `### Requirement: Runner report includes health separately from verdict`
- TO: `### Requirement: Autorun Supervisor report keeps native outcome separate from health`

## MODIFIED Requirements

### Requirement: Profile-driven health checks consume explicit case health policy

The health verifier SHALL continue to expose explicit `light`, `standard`, and `heavy` profiles. `light` SHALL require trace parsing, legacy trace absence, and bundle schema validation. `standard` SHALL require all light checks plus gate diagnostics and trace/log timeline consistency. `heavy` SHALL require all standard checks plus ledger, runtime receipt, output file, cache trail, and dedup evidence checks.

For Agent Experiment Autorun, each selected playbook SHALL declare one explicit frontmatter `health_profile: light|standard|heavy`, independent of filename execution cost. Each native completion SHALL declare which created bundles are required health targets, and every declared target SHALL use that selected case health profile. Auxiliary bundles MAY be declared without becoming health targets. The Autorun Supervisor SHALL run health only from those validated declarations. Health scope/profile SHALL NOT be derived from a stale `RUN_EXPS` table, retired frontmatter `weight`, filename cost, or a scan-selected bundle.

#### Scenario: Light profile skips Heavy-only checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: light`
- **THEN** it does not require Heavy ledger, receipt, cache-trail, or dedup checks
- **AND** it still reports applicable observed diagnostics without changing native outcome

#### Scenario: Heavy profile requires provenance checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: heavy`
- **THEN** it requires ledger-driven declarations, receipts, output files, cache trails, and dedup evidence
- **AND** incomplete provenance is reported as health ISSUES or ERROR without rewriting native outcome

#### Scenario: Heavy Agent cost does not overstate bundle health scope

- **WHEN** a Heavy real-Agent playbook stops at an early lifecycle boundary whose explicit `health_profile` is light
- **THEN** native completion uses light health for its required target
- **AND** filename cost remains Heavy without being misused as an observability profile

#### Scenario: Missing explicit health policy blocks launch

- **WHEN** the selected case lacks a valid frontmatter `health_profile` or its completion declares a different target profile
- **THEN** case launch fails before health evaluation
- **AND** the Supervisor does not guess scope from filename cost, filesystem order, or a retired weight field

### Requirement: Autorun Supervisor report keeps native outcome separate from health

Agent Experiment Autorun reports SHALL present the Headless Playbook Agent process outcome, native playbook outcome `PASS|FAIL|NOT_RUN|null`, lifecycle outcome `HUMAN|ERROR|CANCELLED|null`, effective outcome, health `CLEAN|ISSUES|ERROR|null`, duration, reason, run-root preservation/cleanup, and durable prompt/transcript/trace/Subject-evidence references as separate fields. The durable per-case record SHALL retain full native completion and full validated health JSON outside a deletable case root. Every cleanup-eligible PASS SHALL additionally retain each declared bundle's exact verdict-boundary trace-prefix bytes by role, or an explicit null for a declared missing auxiliary; cleanup-eligible Agent-behavior PASS SHALL also retain exact exported Subject evidence bytes by required role. The health verifier SHALL NOT rerun gates, manufacture native completion, or change playbook outcome.

The Autorun Supervisor MAY aggregate these facts, but its report is a projection. It SHALL NOT reinterpret arbitrary trace checks or health status as native PASS/FAIL. PASS plus health ISSUES SHALL remain distinguishable and preserved.

#### Scenario: unresolved in-flight appears in health

- **WHEN** a completion-declared bundle retains an unresolved claimed work unit
- **THEN** the health report exposes that lifecycle blocker independently of native completion
- **AND** the Supervisor preserves the run root rather than treating health as a replacement verdict

#### Scenario: Health issues do not rewrite native PASS

- **WHEN** native playbook completion is PASS and health is ISSUES
- **THEN** the report shows outcome PASS and health ISSUES separately
- **AND** the run root is preserved

#### Scenario: Missing completion is not a health verdict

- **WHEN** a Headless Playbook Agent exits without native completion
- **THEN** the Supervisor reports ERROR even if health can inspect a partial bundle
- **AND** health output does not become a replacement verdict

#### Scenario: Cleanup does not erase the observable result

- **WHEN** an effective PASS with CLEAN health is removed under explicit cleanup policy
- **THEN** the outside-root audit/report retains the full completion, full health result, process/outcome and cleanup fact
- **AND** the exact prompt, sanitized structured Agent transcript/stderr and exact role-bound verdict trace prefixes remain referenced by byte length and sha256
