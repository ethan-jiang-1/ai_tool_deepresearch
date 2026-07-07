## MODIFIED Requirements

> req: RWE-002, RWE-003, RWE-004

### Requirement: Wave1 happy-path + boundary enforcement playbook

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder, shallow, cache-thin, or non-work-unit delegated artifacts as pass evidence.

Wave1 controlled E2E SHALL include a negative case where structurally present `evidence-summary.md` and `question-list.md` are insufficient because they reuse Wave0 URLs, omit required depth dimensions, or claim source URLs without matching submitted cache trails. The repair path SHALL be supplementary `wave1_topic_deepening` work-unit demand, not force-advance.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

#### Scenario: Wave1 playbook rejects shallow topic deepening

- **WHEN** a Wave1 fixture-backed topic output mostly summarizes Wave0 and lacks enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate verdict
- **AND** the playbook SHALL show supplementary work-unit refill as the repair path

#### Scenario: Wave1 playbook rejects cache-thin source claims

- **WHEN** a Wave1 topic output claims multiple accepted source URLs
- **AND** submitted cache trails cover only a subset of those URLs
- **THEN** the playbook SHALL observe cache/source mapping failure before Wave1 pass

### Requirement: Wave2 happy-path + artifact reference verification playbook

Wave2 playbooks SHALL verify pure synthesis artifact references separately from optional delegated targeted evidence work-unit coverage.

Wave2 controlled E2E SHALL include negative coverage for skipped synthesis work: `synthesis.md` exists, but scan matrix, confidence triage, gap analysis, or pure-synthesis eligibility is missing. It SHALL also include targeted evidence coverage where uncertain findings create `wave2_targeted_evidence` demand and pass only after submitted work-unit coverage.

#### Scenario: Wave2 delegated evidence is submitted

- **WHEN** Wave2 targeted evidence search is used
- **THEN** the playbook SHALL submit the delegated result by `work_id`

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** a Wave2 playbook writes synthesis prose without scan matrix and finding-index triage coverage
- **THEN** the playbook SHALL observe a failed Wave2 gate or preflight verdict
- **AND** the diagnostic SHALL direct the Agent to complete scan/triage/gap analysis

#### Scenario: Wave2 uncertain finding triggers targeted work unit

- **WHEN** the finding index marks a P0/P1 finding as search-required
- **THEN** the playbook SHALL enqueue and submit `wave2_targeted_evidence`
- **AND** Wave2 SHALL pass only after the finding is resolved or explicitly deferred

### Requirement: Full-chain waves sequential playbook

The full-chain playbook SHALL prove work-unit handoff across Wave0, Wave1, and Wave2 where delegated work is used, and SHALL run gates only after phase queue drain.

For report-quality readiness, the full-chain happy path SHALL reach HITL2 with non-shallow Wave1/Wave2 artifacts: Wave1 topics have accepted depth reviews and cache-backed new source claims; Wave2 has scan matrix, confidence triage, gap analysis, and legal pure-synthesis or submitted targeted-search coverage.

#### Scenario: full chain gates after drain

- **WHEN** a wave still has in-flight work units
- **THEN** the playbook SHALL not run the wave gate as a pass attempt

#### Scenario: full chain reaches HITL2 with non-shallow depth artifacts

- **WHEN** the full-chain playbook runs a report-quality happy path
- **THEN** it SHALL reach HITL2 only after Wave1 depth reviews pass and Wave2 scan/triage/gap-analysis coverage is present
- **AND** the verdict SHALL come from real trace/gate outputs, not console summaries or fixture claims alone
