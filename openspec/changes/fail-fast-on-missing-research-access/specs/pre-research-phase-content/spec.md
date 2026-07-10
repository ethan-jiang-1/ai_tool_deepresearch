> req: PRP-002, PRP-005

## MODIFIED Requirements

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL contain the complete 9-section body and retain `stop: yes`. Its execution contract MAY allow `capability_probe_only` search/fetch, which SHALL be distinct from research evidence collection.

Before HITL1 exits into silent execution, the Phase Agent SHALL perform one bounded real search + fetch probe using the actual Agent tool surfaces available in the current environment. The probe SHALL answer only whether one real search result URL can be fetched as page content. It SHALL NOT be cited, cached as research evidence, declared in output ledgers, or counted toward any wave gate.

HITL1 allowed actions SHALL continue to collect topic/profile/must-answer input and SHALL additionally:

- record the probe observation under `rb_profile.yaml#/research_access`;
- use `available` only after a real search result and successful fetch;
- use `unavailable` with a concrete reason when tools are absent, search is empty, or fetch is blocked/failed;
- present the blocker while the user is already at HITL1 and remain in HITL1 until the environment is repaired and the probe is rerun.

HITL1 SHALL NOT create offline research artifacts, evidence-free report skeletons, fake probe receipts, or a new interactive checkpoint.

#### Scenario: HITL1 records available access

- **WHEN** the actual Agent search returns a real URL and the fetch tool retrieves page content
- **THEN** the Phase Agent SHALL record `research_access.status: available` with direct probe fields
- **AND** the probe output SHALL NOT become research evidence

#### Scenario: HITL1 exposes unavailable access before silent execution

- **WHEN** search/fetch tools are absent, search returns no usable result, or fetch is blocked
- **THEN** the Phase Agent SHALL record `research_access.status: unavailable` with a reason
- **AND** it SHALL tell the user that evidence-backed waves cannot start in the current environment
- **AND** it SHALL remain in HITL1 rather than entering Setup/Wave0

#### Scenario: HITL1 writes to bundle not status tree

- **WHEN** HITL1 records user input and capability observation
- **THEN** it SHALL write them to `rb_profile.yaml`
- **AND** it SHALL NOT create a parallel status tree for research access

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the minimum write contract as a visible checklist for the human and Agent.

The checklist SHALL include:

- `research_profile`
- `root_must_answer_set`
- `research_access.status`
- `research_access.probed_at`
- available-path URL/fetch fields or unavailable-path reason
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`

The checklist is an alignment/review surface, not a separate schema authority.

#### Scenario: Human can audit capability readiness

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see both the normal HITL1 payload and research-access observation fields
- **AND** review SHALL not require reconstructing the probe contract from scattered prose
