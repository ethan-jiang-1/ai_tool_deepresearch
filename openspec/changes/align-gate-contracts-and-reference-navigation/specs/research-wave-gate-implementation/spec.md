> req: RWG-018

## ADDED Requirements

### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic gate/output contract SHALL have a closed contract chain:

- producer instruction that tells the Agent what deterministic shape to write;
- runtime authority surface that stores the truth in the active bundle or submitted ledger;
- checker implementation that consumes that exact authority shape;
- diagnostic/advice output that exposes failure and repair coordinates;
- regression or static guard that catches future drift.

If a surface is not Agent-produced, the audit MAY record an explicit non-Agent-produced exemption for the producer instruction surface. Otherwise, missing or contradictory closure surfaces SHALL be treated as judgment/output contract drift.

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** apply evidence or maintained audit mapping SHALL identify its producer instruction, runtime authority, checker route, diagnostic surface, and test guard
- **AND** static or focused regression coverage SHALL fail when the checker route or contract inventory is missing

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer Source of Record for that truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than silently broadening gate acceptance

### Requirement: Wave gate definitions, helpers, and phase docs SHALL align as one judgment layer

Active wave gate pass/fail semantics SHALL be aligned across gate definition JSON rule ids, helper/check implementations, phase instructions, inspect output, diagnostics/advice, and accepted specs. A gate rule that contributes to pass/fail SHALL have a known helper or CLI dispatch, a documented artifact shape, Agent-facing instructions that tell the Phase Agent how to produce the checked shape, and blocking diagnostics that identify the deterministic repair surface.

This alignment SHALL be maintained through a gate/output-rule audit artifact during apply and a static regression guard. The audit SHALL cover active gate definitions, including non-wave lifecycle gates, and adjacent output/navigation contract surfaces that feed wave gates. Implementation SHALL NOT stop after fixing the named BUG-068/BUG-070 symptoms if the audit discovers same-family deterministic drift affecting pass/fail, submitted coverage, reference navigation truth, or diagnostic classification.

#### Scenario: active gate rule has implementation and artifact contract

- **WHEN** an active gate definition contains a rule id
- **THEN** static audit SHALL identify its `check` implementation path or shared helper
- **AND** the change design or apply evidence SHALL document the artifact shape and Agent-facing producer instruction for that rule

#### Scenario: unknown active check name fails hygiene

- **WHEN** an active gate definition uses a `check` value with no known implementation
- **THEN** static gate audit SHALL fail
- **AND** diagnostics SHALL name the gate, rule id, and unsupported check value

#### Scenario: newly discovered same-family drift is fixed in the same change

- **WHEN** apply-time audit finds that a phase doc, helper, gate selector, submitted ledger expectation, or inspect output describes a different deterministic shape for the same active gate contract
- **AND** the mismatch affects pass/fail, submitted coverage, reference/navigation truth, or blocking/advisory/diagnostic classification
- **THEN** the mismatch SHALL be fixed in this change
- **AND** a focused regression or static test SHALL guard the repaired contract

#### Scenario: hidden stop:no contract is treated as same-family drift

- **WHEN** a stop:no phase can fail a deterministic gate or inspect check
- **AND** the Agent-facing phase docs plus CLI diagnostic do not reveal the required path, role, ref spelling, field, or repair surface
- **THEN** the hidden contract SHALL be treated as in-scope judgment/output drift
- **AND** the repaired docs or diagnostics SHALL make the deterministic contract self-sufficient

### Requirement: Wave1 depth-review refs SHALL canonicalize safe submitted work-unit refs

Wave1 `depth_review_contract` SHALL compare `reviewed_work_unit_refs[]` against submitted work-unit authority surfaces after canonicalizing safe harmless spelling drift. The Agent-facing canonical ref SHALL omit a trailing slash: `_work_units/wave1/<work_id>`. A validator SHALL accept the same safe ref with a single trailing slash after canonicalization.

Unsafe refs and refs that cannot bind to submitted work-unit rows SHALL continue to fail. Accepted submitted refs MAY include the submitted row's `work_id`, `work_unit_ref`, or `result_ref` when those values are legal bundle-relative refs.

#### Scenario: trailing slash work-unit ref passes after canonicalization

- **WHEN** `depth-review.yaml` contains `reviewed_work_unit_refs: ["_work_units/wave1/wu-w1-b000-deep-i0001/"]`
- **AND** the submitted ledger row contains `_work_units/wave1/wu-w1-b000-deep-i0001`
- **THEN** `depth_review_contract` SHALL treat the ref as submitted after canonicalization

#### Scenario: unsafe depth ref still fails

- **WHEN** `reviewed_work_unit_refs[]` contains an absolute path or a path with `..`
- **THEN** `depth_review_contract` SHALL fail
- **AND** diagnostics SHALL identify the unsafe ref

#### Scenario: unsubmitted depth ref fails

- **WHEN** `reviewed_work_unit_refs[]` names a safe work-unit-looking ref absent from submitted ledger authority surfaces
- **THEN** `depth_review_contract` SHALL fail
- **AND** diagnostics SHALL identify that the ref is not submitted

### Requirement: Return-map reference navigation SHALL block concrete-ref drift where configured

Wave gate and inspect implementations that validate seed-topic return maps SHALL distinguish consumer navigation failures from advisory map-shape diagnostics. For evidence-bearing seed-topic return-map entries, concrete existing `reference/*.md` refs SHALL be required when the command or gate is checking consumer navigation readiness.

Internal surfaces such as `artifacts/`, `_cache/`, and `_work_units/` MAY be reported as secondary provenance, but they SHALL NOT satisfy the concrete reference navigation requirement by themselves.

#### Scenario: seed-topic entry with only internal refs fails navigation

- **WHEN** an evidence-bearing seed-topic return-map entry includes only `artifacts/`, `_cache/`, or `_work_units/` refs
- **THEN** the configured return-map navigation check SHALL fail
- **AND** diagnostics SHALL request a concrete existing `reference/*.md` ref or explicit limitation state

#### Scenario: concrete existing reference ref passes navigation

- **WHEN** an evidence-bearing seed-topic return-map entry includes `reference/01_topic-source.md`
- **AND** that file exists under the active bundle root
- **THEN** the concrete reference navigation check SHALL pass for that entry

### Requirement: Blocking diagnostics SHALL not be labeled diagnostic-only

Wave gate and inspect outputs SHALL accurately classify findings that affect pass/fail. A finding counted into `check.passed: false` SHALL NOT be labeled `diagnosticOnly: true` or described as unable to affect the current command result.

#### Scenario: blocking return-map issue is labeled blocking

- **WHEN** return-map concrete reference validation fails and the command returns `check.passed: false`
- **THEN** output SHALL label the issue as blocking or equivalent
- **AND** it SHALL NOT call that specific failure diagnostic-only

### Requirement: Blocking diagnostics SHALL be self-sufficient for deterministic repair

For in-scope deterministic gate/output failures, gate and inspect diagnostics SHALL provide enough contract information for a Phase Agent in a stop:no run to repair the failed runtime surface without reading Engine helper source. This requirement applies to deterministic shape failures such as required roles, bundle-relative refs, concrete reference navigation, missing artifact contracts, and blocking/advisory/diagnostic classification.

Blocking diagnostics SHALL identify the failing rule or finding id, the bundle-relative artifact or ledger/ref surface, the expected deterministic shape or canonical value, and the repair target. They SHALL NOT require the Engine to choose research strategy, synthesize content, or make semantic evidence judgments.

#### Scenario: role coverage diagnostic names canonical role repair

- **WHEN** Wave1 required output coverage fails because a required path is absent from canonical submitted coverage
- **THEN** diagnostics SHALL name the missing path and expected canonical role
- **AND** diagnostics SHALL direct repair toward submit normalization or a replacement/supplementary submitted work-unit declaration

#### Scenario: reference navigation diagnostic names concrete repair

- **WHEN** a return-map navigation check fails because only internal refs or glob/count summaries are present
- **THEN** diagnostics SHALL name the offending seed-topic entry or ref
- **AND** diagnostics SHALL ask for enumerated existing `reference/*.md` refs or an explicit limitation state
