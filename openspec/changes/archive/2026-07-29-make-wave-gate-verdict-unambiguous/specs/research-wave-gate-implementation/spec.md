## ADDED Requirements

> req: RWG-021

### Requirement: Wave Gate adapters and handoff consumers SHALL preserve the verdict partition

Wave0, Wave1, and Wave2 formal Gate adapters SHALL use one shared, side-effect-free public-summary projection when it removes their identical post-preflight classification logic. The projection SHALL consume already-derived evaluator findings, existing degradation eligibility, and existing routing/durability facts; it SHALL not decide eligibility, read runtime files, resolve a transition, write trace, or modify a finding.

Each formal adapter SHALL preserve complete unresolved quality findings in its diagnostic surface while exposing only currently blocking rule IDs through `check.failed_rule_ids`. It SHALL preserve the existing exact degradation policy: only an existing eligible quality-only route may produce the degraded handoff form, and every structural, provenance, queue, receipt, lifecycle, configuration, routing, checker-owned, or other ineligible root SHALL keep the blocking-failure form.

`gate_attempt`, `enter-phase`, `advance-status`, and their existing handoff readers SHALL continue to accept the legal degraded route, carry `degraded`, `degraded_reason`, and `degraded_rules`, and distinguish it from clean completion. Agent-facing Wave handoff guidance SHALL instruct the Agent to consume the existing `check.next` while checking whether `degraded` is true; it SHALL not require user interaction, direct authority edits, or a new repair controller.

#### Scenario: Wave0 carried shared-reference floor is not reported as a blocker

- **WHEN** Wave0 reaches the existing fatigue threshold with only `shared_ref_count_floor` eligible for degradation
- **THEN** its Gate response and `gate_attempt` SHALL use the degraded-handoff form
- **AND** the carried floor SHALL remain present in `degraded_rules` and diagnostic findings but absent from `failed_rule_ids`

#### Scenario: Wave1 and Wave2 ineligible roots fail closed

- **WHEN** a Wave1 or Wave2 Gate has a queue, provenance, structural, receipt, checker-owned, or other ineligible root, whether or not an eligible floor is also present
- **THEN** the Gate SHALL return the blocking-failure form with no legal `next`
- **AND** it SHALL not emit `degraded: true` or move the ineligible root into `degraded_rules`

#### Scenario: handoff preserves degraded meaning without blocking routing

- **WHEN** a Wave Gate writes a legal degraded `gate_attempt` and `enter-phase` then loads its `check.next` target
- **THEN** the route-bound handoff and subsequent status synchronization SHALL retain the degraded marker and exact degraded rule IDs
- **AND** the target phase entry SHALL remain legal without asserting that the source quality rules passed cleanly
