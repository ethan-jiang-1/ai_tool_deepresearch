## ADDED Requirements

> req: GSK-004

### Requirement: Wave Gate public summary SHALL partition routing blockers from carried quality debt

For the normal formal-evaluation envelope of Wave0, Wave1, and Wave2 after existing invocation, definition, node-binding, and handoff-preflight checks succeed, the public `check` summary SHALL additionally answer whether the invocation may legally hand off while preserving whether that handoff is clean or degraded. It SHALL project exactly one of these mutually exclusive forms:

1. clean pass: `passed: true`, empty `failed_rule_ids`, no `degraded: true`, empty/absent `degraded_rules`, and a legal `next`;
2. blocking failure: `passed: false`, nonempty `failed_rule_ids`, no `degraded: true`, empty/absent `degraded_rules`, and `next: null`; or
3. degraded handoff: `passed: true`, empty `failed_rule_ids`, `degraded: true`, nonempty `degraded_rules`, and a legal `next`.

`failed_rule_ids` SHALL contain only unmasked rules that still block the routing verdict. A rule accepted by the existing Wave degradation-eligibility policy SHALL be removed from that public blocking list and appear exactly once in `degraded_rules`; its original structured finding, inspect/advice detail, and pass diagnostic referenced by the durable trace context SHALL remain available. A successful degraded handoff SHALL not be labelled or consumed as a clean quality pass.

The public partition SHALL be derived from existing direct Gate facts and SHALL NOT create a persisted verdict state, alternate evaluator, eligibility source, retry path, or routing authority. A routing, configuration, lifecycle, receipt, or trace-durability failure reached from this normal Wave formal-evaluation envelope SHALL remain blocking and shall suppress any otherwise candidate clean or degraded pass. Existing invocation, definition, node-binding, and preflight failure envelopes remain governed by their current shared Gate contract.

Attempt-trend comparison SHALL use the stable union of `failed_rule_ids` and `degraded_rules` when either diagnostic/result carries degraded debt. It SHALL not report a carried degraded rule as newly passing merely because that rule no longer blocks routing, and it SHALL not add that union as a new public `check` field.

#### Scenario: clean Wave Gate handoff has no quality debt

- **WHEN** all unmasked formal Gate findings are satisfied and the normal pass route is durably available
- **THEN** `check.passed` SHALL be `true` with empty `failed_rule_ids` and no degraded handoff marker
- **AND** `check.next` SHALL name the resolved existing route

#### Scenario: quality-only fatigue handoff remains explicit

- **WHEN** the existing Wave fatigue policy accepts only degradation-eligible required-floor findings and the normal route is durably available
- **THEN** `check.passed` SHALL be `true`, `failed_rule_ids` SHALL be empty, and `degraded_rules` SHALL contain those exact rule IDs
- **AND** the output and durable pass evidence SHALL state that this is a degraded handoff rather than a clean quality pass

#### Scenario: strict trace failure suppresses a candidate degraded pass

- **WHEN** a candidate degraded handoff cannot durably write its required `gate_attempt`
- **THEN** the wrapper SHALL emit one blocking failed Gate envelope with `next: null` and nonempty `failed_rule_ids`
- **AND** it SHALL not emit the earlier candidate pass or leave consumable degraded routing fields

#### Scenario: carried debt remains visible to attempt comparison

- **WHEN** an earlier normal Wave evaluation blocks on an eligible floor and a later evaluation legally hands off with that same floor in `degraded_rules`
- **THEN** attempt diagnostics SHALL retain that stable rule ID as unresolved comparison input
- **AND** the public later `failed_rule_ids` SHALL remain empty
