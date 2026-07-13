> req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-008, GSK-011

## MODIFIED Requirements

### Requirement: Gate definition JSON skeleton structure

Every active blocking gate rule SHALL retain its existing `id`, `check`, `failure_message`, and checked-authority descriptor contract and SHALL additionally declare the static repair metadata needed to construct an Agent-facing hint without parsing prose or guessing from an authority coordinate. A checked-authority descriptor SHALL be either the existing `target` or the check-specific `targets`/`fields`/`sources` shape used by target-less `cross_field` or `structural` rules; the common schema SHALL NOT force those existing rules to invent a synthetic target.

- `blocking_basis`: exactly one of `invocation_contract`, `configuration_integrity`, `authority_integrity`, `identity_binding`, `lifecycle_binding`, `provenance_binding`, `accepted_structure`, `accepted_invariant`, `required_floor`, `semantic_availability`, or `recorded_human_decision`;
- `repair.owner`: `agent`, `engine`, `user`, `external`, or `missing_contract`; and
- `repair.write_to`: the exact authorized mutable surface, existing Engine operation, HITL decision surface, external prerequisite, or missing capability boundary.

`rule.target`, when present, SHALL remain a checked authority coordinate and SHALL NOT be treated as a writable repair surface by default. Check-specific `targets`/`fields`/`sources` SHALL have the same read-only meaning. In particular, a rule checking `rb_status.json`, submitted ledger, work-unit index, trace, receipt, hash, or another Engine-owned authority SHALL name the legal Engine operation in `repair.write_to` rather than direct file editing.

The active gate-rule audit SHALL reject a blocking rule with an unknown or indefensible `blocking_basis`, missing repair metadata, a repair owner/surface contradiction, or an Engine-owned authority exposed as a manual Agent write target. `accepted_invariant` SHALL NOT be used as a catch-all justification for heading order, exact case, list style, prose length, or preferred item count. Presentation-only preferences SHALL be advisory/inspect-only or removed rather than assigned an artificial blocking basis.

One non-deprecated Zod Gate-definition schema at `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` SHALL own the common definition/rule skeleton, checked-authority descriptor alternatives, and cross-field repair-metadata constraints. Runtime `loadGateDefinition()` and its safe wrapper, `consistency-validator.mjs`, the `post-final-recovery.mjs` rerun guard, `validate-work-unit-hygiene.mjs`, definition contract tests, and the GSK-011 audit SHALL consume that same schema/parser for semantic reads. Raw `JSON.parse` without schema parsing and a separate test-only common-shape validator SHALL NOT remain alternate interpretation paths. `post-final-recovery.mjs` MAY hash the original definition bytes, but its rule/operator/value interpretation SHALL use the schema-parsed value. A static no-bypass check SHALL reject any production Gate-definition semantic read outside the shared parser; the only raw-byte exception SHALL be an explicitly isolated hash accessor that does not interpret definition fields. This check SHALL discover direct read sites rather than maintain a second permanent reader inventory. Check-specific fields SHALL remain schema-preserved passthrough and their dispatch/producer/test closure SHALL remain in the GSK-011 audit; the common schema SHALL NOT evaluate rules, persist lineage, or create a second Gate verdict.

`repair.write_to` MAY contain only registered coordinate placeholders such as `{topic}`. The checker SHALL resolve every placeholder from direct evaluation context into an exact bundle-relative path/JSON pointer or accepted Engine operation before projecting a hint. An unresolved or unknown placeholder SHALL be a definition/configuration failure and SHALL NOT be emitted to the Agent as though it were an executable repair coordinate. The checkpoint-specific `rerun` command SHALL be projected by the formal Gate or inspect caller and SHALL NOT be duplicated across every rule definition.

`failure_message` SHALL remain compatibility prose only. It SHALL NOT contradict `repair.owner` or `repair.write_to`, recommend direct edits to Engine-owned authority, or advertise a command that current contract preconditions reject. The active definition audit SHALL reject contradictory compatibility prose even though Controllers consume `hints[]` first.

#### Scenario: Status rule names Engine operation rather than status edit

- **WHEN** an active gate rule checks `rb_status.json#/current_gate`
- **THEN** its repair metadata SHALL name the accepted `advance-status`, `enter-phase`, or other existing Engine-owned operation that produces the required status fact
- **AND** it SHALL NOT tell the Agent to edit `rb_status.json` directly

#### Scenario: Existing target-less rule needs no synthetic target

- **WHEN** `basename_consistency`/slug consistency declares checked authorities through `fields[]`, or `bundle_structure_valid` uses `targets[]`, without singular `target`
- **THEN** the common Gate-definition schema SHALL accept the existing check-specific descriptor
- **AND** repair metadata SHALL still identify the legal owner/write surface without treating any source field as automatically writable

#### Scenario: Presentation preference cannot enter the blocking inventory

- **WHEN** a proposed gate rule protects only heading order, exact case, list-marker style, prose length, or a preferred bullet count
- **THEN** the active rule audit SHALL reject its blocking basis
- **AND** the behavior SHALL be removed, parsed tolerantly, or retained only as advisory inspect feedback

#### Scenario: Blocking basis is a closed contract

- **WHEN** a definition uses an unregistered basis or labels a preferred Markdown presentation as `accepted_invariant`
- **THEN** the shared schema/audit SHALL reject the rule and name its gate/rule coordinate
- **AND** reviewers SHALL not invent a new basis value without changing the accepted Gate-definition contract

#### Scenario: Runtime and audit share one definition parser

- **WHEN** a Gate definition is loaded by a formal CLI, consistency validation, post-final rerun guard, hygiene validation, or the active-rule audit
- **THEN** every semantic reader SHALL parse it through the same Zod Gate-definition schema
- **AND** an invalid repair contract SHALL fail with the same gate/rule coordinate rather than pass runtime JSON parsing and fail only in a test

#### Scenario: Post-final hash does not create a semantic parse bypass

- **WHEN** post-final recovery hashes a rerun Gate definition and reads its rerun-count rule
- **THEN** the recorded definition hash SHALL still cover the original bytes
- **AND** the rule lookup, operator, and limit SHALL come from the shared schema-parsed definition

#### Scenario: Compatibility message cannot contradict the legal repair

- **WHEN** a rule checks trace or submitted-ledger authority and its `failure_message` recommends deleting or editing that authority directly
- **THEN** the active definition audit SHALL fail the rule even if `repair.write_to` names a legal Engine operation
- **AND** the message SHALL be rewritten to remain compatible with the Engine-owned repair path


### Requirement: Gate CLI skeleton shape

All formal Gate CLIs SHALL preserve the compatible JSON surface `{ check, routing, inspect, advice }` and SHALL add top-level `hints[]`. On pass, `hints` SHALL be empty. On failure, `hints` SHALL contain one entry for each independent primary blocking root and SHALL exclude advisory, diagnostic-only, masked, and downstream-symptom findings.

Each hint SHALL contain:

- `rule_id`: stable failed rule or shared preflight/config root identity;
- `missing_fact`: the earliest directly observed failed fact, expected deterministic contract, and observed value/state where available;
- `write_to`: the exact authorized repair surface or existing legal operation from rule/preflight repair metadata; and
- `rerun`: the exact same Gate CLI checkpoint, using the Engine-resolved absolute bundle root and current node when available.

Definition-time coordinate templates SHALL be fully resolved before output. For a per-topic failure, `write_to` SHALL identify the exact current Topic path and field/JSON pointer rather than a literal `{topic}` placeholder. If invocation parsing has not established a bundle/current node, the hint SHALL preserve only known exact arguments and a required-argument command template; it SHALL NOT invent an absolute bundle root.

`hints[]` is a read-only feedback projection. It SHALL NOT become gate authority, permission, a generic repair controller, or an automatic mutation path. `inspect[]` MAY retain bounded forensic detail and `advice[]` MAY remain for compatibility, but neither SHALL be the only way for the Markdown Controller to discover the legal repair path.

All failure exits SHALL use the shared result/finding builder, including invalid invocation, missing/unparseable definition, node/gate binding, lifecycle handoff/status preflight, canonical topic-state prerequisite, gate-specific prerequisite, routing, durability, and rule evaluation. For failures outside definition evaluation, the existing helper that directly detects the failed fact SHALL construct and return the structured finding with its stable root id, blocking basis, observed/expected facts, and repair ownership. A wrapper SHALL only project that finding for its checkpoint and SHALL NOT hand-build a failed result, reconstruct metadata from prose, or look up a duplicate central preflight-root catalog.

#### Scenario: Gate rule failure returns one actionable hint

- **WHEN** a Gate rule fails on an Agent-repairable artifact
- **THEN** output SHALL contain a primary hint naming the missing fact, exact bundle-relative artifact/field, and exact same-gate rerun command
- **AND** the Agent SHALL not need to inspect JavaScript source or infer the repair from a generic failure message

#### Scenario: Engine-owned failure does not grant manual mutation authority

- **WHEN** a Gate fails on status, trace, submitted declaration, work-unit binding, receipt, hash, or queue authority
- **THEN** `write_to` SHALL name the accepted Engine operation or an explicit missing-contract boundary
- **AND** it SHALL NOT name direct manual editing as the repair

#### Scenario: Parent root masks dependent hints

- **WHEN** one missing or unparseable parent authority makes dependent checks non-actionable
- **THEN** `hints[]` SHALL contain the parent repair only
- **AND** dependent failures SHALL be represented as masked/durable forensic detail rather than competing primary hints

#### Scenario: Per-topic coordinate is resolved before output

- **WHEN** a rule with `repair.write_to: "artifacts/wave1/{topic}/depth-review.yaml#/reviewed_work_unit_refs"` fails for Topic `topic-a`
- **THEN** the emitted hint SHALL name `artifacts/wave1/topic-a/depth-review.yaml#/reviewed_work_unit_refs`
- **AND** no unresolved placeholder SHALL appear in `hints[]`

#### Scenario: Handoff helper owns its failure finding

- **WHEN** the shared handoff/status helper detects a missing route-bound load or invalid status window
- **THEN** that helper SHALL return the structured lifecycle finding consumed by the formal Gate projector
- **AND** the wrapper SHALL NOT translate helper prose through a separate `GATE_FAILURE_ROOTS` or equivalent root catalog


### Requirement: One gate per CLI

Each active gate SHALL continue to have one independent `check-gate-<name>.mjs` wrapper. The active inventory SHALL be derived from the gate definitions and SHALL currently contain all ten wrappers, including `check-gate-rerun-ready.mjs`. Documentation and static guards SHALL NOT hard-code a stale count or omit an active definition/CLI pair.

#### Scenario: Definition and CLI inventories are bijective

- **WHEN** the active Gate inventory is audited
- **THEN** every `gate-*.definition.json` SHALL have exactly one corresponding `check-gate-*.mjs`
- **AND** every active Gate CLI SHALL have exactly one definition
- **AND** `rerun-ready` SHALL be included


### Requirement: Gate CLI evaluates rules from definition

Gate rule evaluation SHALL evolve the existing structured finding shape implemented by `wave-contract-findings.mjs`; it SHALL NOT introduce a parallel failure object. `makeContractFinding()`, `buildContractEvaluation()`, and `projectInspectContract()` SHALL retain their current classification/surface/expected/repair/detail behavior while adding the observed fact, repair owner/resolved write coordinate, masking, and checkpoint context needed by formal Gate projection. Wave formal Gate and side-effect-free inspect SHALL consume the same findings for shared rules; formal-only lifecycle/config rules SHALL use the same finding shape through shared Gate helpers. CLI wrappers SHALL not reconstruct hints from `inspect[]`, `advice[]`, `failure_message`, exception text, or filename regexes after evaluation. `findingsFromCheckResult()` or another compatibility adapter MAY convert prose-only results only when they remain advisory or diagnostic-only; any result that blocks the current inspect or formal Gate SHALL provide a structured finding directly rather than deriving rule identity or repair lineage from prose position/prefix.

The shared finding SHALL preserve rule identity, closed-enum `blocking_basis`, direct observed fact, checked authority coordinate, expected contract, repair metadata, classification, and masking relationship needed to project `failed_rule_ids`, `hints[]`, `inspect[]`, and `advice[]` consistently. Finding `id` MAY identify a concrete diagnostic instance, while `rule_id` SHALL be the stable identity used for formal failed-rule projection and attempt comparison. `buildContractEvaluation()` SHALL derive `failed_rule_ids` from blocking findings' `rule_id`, not from a message-indexed or otherwise instance-local `id`. Multiple independent instances of one rule SHALL remain distinguishable through their findings and resolved hint coordinates. This is an in-memory result shape, not persistent state or a second verdict.

Primary root selection and ordering SHALL come from structured classification, prerequisite masking, and stable rule identity. `gateMessagePriority()` or equivalent error-string regex classification SHALL NOT decide `failed_rule_ids` or `hints[]` ordering. Gate-attempt trend comparison SHALL use stable `failed_rule_ids`; a legacy diagnostic without stable IDs SHALL be excluded from comparison, making the current result the first comparable sample rather than comparing `inspect[]` prose.

#### Scenario: Inspect and formal Gate share the same repair coordinates

- **WHEN** Wave inspect and formal Gate evaluate the same unchanged bytes and shared blocking rule
- **THEN** both SHALL return the same `rule_id`, `missing_fact`, and `write_to`
- **AND** their rerun commands SHALL differ only by the checkpoint actually invoked

#### Scenario: Message wording does not change root order or trend

- **WHEN** two equivalent failures use different human-readable `inspect[]` or `failure_message` wording
- **THEN** their primary root order and attempt-trend identity SHALL remain determined by stable structured rule IDs
- **AND** changing prose SHALL NOT create a regression, convergence, or different repair hint

#### Scenario: Diagnostic instance id does not become failed rule identity

- **WHEN** two blocking findings share one stable `rule_id` but have different file/topic instance `id` values
- **THEN** `check.failed_rule_ids` SHALL contain the stable rule identity rather than the two diagnostic ids
- **AND** `hints[]` SHALL retain the exact separate repair coordinate for each independent instance

#### Scenario: Prose adapter cannot manufacture a blocking root

- **WHEN** a return-map or helper result fails the current inspect command
- **THEN** it SHALL provide an explicit structured finding with stable rule identity and repair coordinate
- **AND** the framework SHALL NOT create the blocking finding by parsing an `[id]` prefix or matching `inspect[]` with `advice[]` by array position


### Requirement: Cascade-masked diagnostics remain non-authority

Primary Gate hints SHALL be projected only from the smallest independent blocking root set after local prerequisite short-circuiting. Full forensic details MAY remain in the durable gate diagnostic, but `hints[]` SHALL not reproduce the flat failure wall. The framework SHALL use local guards and the existing masked-rule mechanism; this change SHALL NOT introduce a generalized dependency engine or persisted contract-lineage graph.

Repeated failure/fatigue output SHALL not replace the direct hint with generic encouragement, tell the user to run ordinary commands, or recommend multiple competing repair strategies. When an authorized mechanical path exists, the Agent SHALL perform it and rerun the named Gate. Only new semantics, risk/permission, external action, or `missing_contract` MAY form an escalation boundary.

#### Scenario: Fatigue does not erase the direct repair

- **WHEN** a Gate fails after the fatigue threshold
- **THEN** each primary root SHALL still expose its direct hint
- **AND** fatigue advice SHALL not become a substitute for `missing_fact`, `write_to`, or `rerun`


### Requirement: Shared gate attempt audit helper

The existing Gate attempt write ownership SHALL remain unchanged: formal Gate wrappers SHALL continue to call the accepted shared audit helper at their current durability boundary, and this change SHALL NOT introduce a new finalizer or duplicate trace writer. The existing durable Gate failure diagnostic SHALL preserve the emitted result's `hints[]` alongside `check`, `routing`, `inspect`, and `advice`; a pass diagnostic MAY preserve `hints: []` for shape consistency.

Persisted hints SHALL remain diagnostic projection only. They SHALL NOT become Gate verdict, routing authority, repair permission, or a fallback source that overrides a newer direct evaluation.

#### Scenario: Failure diagnostic preserves the actionable hint

- **WHEN** a formal Gate emits a failed result with one or more primary hints and writes its existing failure diagnostic
- **THEN** the diagnostic SHALL contain the same `hints[]` entries as the emitted result
- **AND** no additional trace writer, wrapper finalizer, or diagnostic-derived verdict SHALL be introduced


### Requirement: Active gate rule audit SHALL be executable

The active Gate audit SHALL cover all ten definition/CLI pairs, every rule-level repair contract, the no-bypass production definition-read check, the no-hand-built-wrapper/no-central-root-catalog checks, and every formal failure class outside the definition rule loop: invalid invocation, definition/config load, node/gate binding, lifecycle handoff/status preflight, canonical topic-state or gate-specific prerequisite, routing, and durable handoff trace failure. It SHALL verify stable root identity, known checker dispatch, producer/authority/checker/diagnostic/test closure, closed-enum `blocking_basis`, repair owner and authorized `write_to`, registered/resolvable coordinate templates, non-contradictory `failure_message`, shared/formal partition, and compatible hint projection. The audit SHALL fail when a new Gate, rule, direct semantic definition read, prose-only/helper-external root translation, or formal failure path is added without this closure.

The audit SHALL also prevent retired blocking controls from surviving only in a helper, static inventory, degradation allowlist, documentation, or test fixture after removal from a definition. Removed rule IDs/check dispatches SHALL be deleted from active inventories unless explicitly retained as advisory inspect behavior.

#### Scenario: New rule without hint lineage fails audit

- **WHEN** an active Gate definition adds a blocking rule without blocking basis or authorized repair metadata
- **THEN** the audit SHALL fail and name the gate/rule

#### Scenario: Wrapper preflight failure stays helper-owned

- **WHEN** a formal Gate wrapper adds or changes a failure exit outside definition rule evaluation
- **THEN** the detecting helper SHALL provide the stable root id, blocking basis, authorized repair owner/surface and focused test for that failure class
- **AND** the wrapper SHALL NOT fall back to a hand-built `inspect/advice`-only result or a duplicate central root descriptor

#### Scenario: Removed blocker leaves no active shadow rule

- **WHEN** a blocking Gate rule is removed or downgraded
- **THEN** active checker dispatch, rule inventory, degradation eligibility, producer wording, and regression expectations SHALL be removed or reclassified in the same change
- **AND** no hidden helper SHALL continue to fail the Gate for the retired preference
