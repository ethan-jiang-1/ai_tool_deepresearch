> req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-008, GSK-011

## MODIFIED Requirements

### Requirement: Gate definition JSON skeleton structure

Every active blocking gate rule SHALL retain its existing `id`, `check`, `failure_message`, and checked-authority descriptor contract and SHALL additionally declare a finding-source contract. A checked-authority descriptor SHALL be either the existing `target` or the check-specific `targets`/`fields`/`sources` shape used by target-less `cross_field` or `structural` rules; the common schema SHALL NOT force those existing rules to invent a synthetic target.

- `finding.source`: `definition` or `checker`;
- when `finding.source` is `definition`, `finding.blocking_basis`: exactly one of `invocation_contract`, `configuration_integrity`, `authority_integrity`, `binding_integrity`, `required_structure`, `required_floor`, or `recorded_human_decision`;
- when `finding.source` is `definition`, `repair.kind`: `agent_action`, `engine_operation`, `user_decision`, `external_action`, or `missing_contract`; and
- when `finding.source` is `definition`, `repair.write_to`: the exact authorized mutable surface, existing Engine operation, HITL decision surface, external prerequisite, missing capability boundary, or the controlled `$checked_target` alias.

`rule.target`, when present, SHALL remain a checked authority coordinate and SHALL NOT be treated as a writable repair surface by default. Check-specific `targets`/`fields`/`sources` SHALL have the same read-only meaning. `$checked_target` SHALL be an explicit authorization alias, not an inference: it is valid only for `finding.source: definition`, `repair.kind: agent_action`, and one singular non-glob `target` whose placeholders resolve to exactly one coordinate for the current finding instance. It SHALL resolve to that exact expanded target before output. It SHALL NOT be valid for wildcard/pattern targets, Engine-owned status, trace, ledger, index, receipt, hash, or multi-coordinate `targets`/`fields`/`sources` rules.

`finding.source: definition` SHALL be used only when every blocking instance of the rule has one stable blocking basis and nearest legal repair. `finding.source: checker` SHALL be used when the detecting checker/helper can emit distinct direct roots with different blocking bases, repair kinds, or next-action coordinates. In checker-owned mode, the definition SHALL NOT duplicate fallback basis/kind/write coordinates; every blocking finding returned by the checker SHALL carry its own root-specific blocking basis and repair contract.

The shared schema SHALL reject a blocking rule with a missing/unknown finding source, an unknown/incomplete definition-owned `blocking_basis` or repair contract, an invalid `$checked_target` use, an unknown placeholder, or an empty coordinate. It SHALL NOT infer repair kind, authorization, or reachability from raw path/command prose. The derived audit and focused changed-rule/helper tests SHALL reject a known Engine-owned authority exposed as `agent_action`, an unavailable Engine operation presented as reachable, or another semantic kind/coordinate contradiction using the existing owner contract rather than a new coordinate catalog. Every emitted blocking finding, whether definition-owned or checker-owned, SHALL carry one of the same closed blocking-basis values. `blocking_basis` SHALL remain a coarse burden-of-proof category; precise identity, lifecycle, provenance, field, or section facts belong in the finding's `missing_fact`. Whether a known rule protects real required structure or only presentation is a requirement-review question and SHALL be locked by focused changed-rule tests, not guessed by the common schema. Presentation-only preferences SHALL be advisory/inspect-only or removed rather than assigned `required_structure` or another artificial blocking basis.

One non-deprecated Zod Gate-definition schema at `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` SHALL own the common definition/rule skeleton, checked-authority descriptor alternatives, finding-source union, definition-owned root-contract constraints, and the exported closed schemas/constants for blocking basis and repair kind. The checker-owned finding builder SHALL consume those exported basis/kind contracts rather than maintain duplicate enum sets.

Runtime `loadGateDefinition()` and its safe wrapper, `consistency-validator.mjs`, the `post-final-recovery.mjs` rerun guard, `validate-work-unit-hygiene.mjs`, positive definition-semantic tests, and the GSK-011 audit SHALL consume that same schema/parser for semantic reads. Raw `JSON.parse` without schema parsing and a separate test-only common-shape validator SHALL NOT remain alternate valid-contract interpretations. A negative test MAY manipulate raw JSON solely to construct a malformed/unsupported definition fixture that is then rejected through the production parser/CLI; the raw fixture object SHALL NOT be asserted as a valid definition or used as a second semantic verdict.

`post-final-recovery.mjs` MAY hash the original definition bytes, but its rule/operator/value interpretation SHALL come from parsing that same byte snapshot. A reader needed by this consumer SHALL return or accept the paired raw bytes and parsed value from one filesystem read; it SHALL NOT hash one read and semantically interpret a later re-read. A static no-bypass check SHALL reject any production Gate-definition semantic read outside the shared parser; an explicitly isolated raw-byte accessor MAY exist only when it returns the same paired snapshot or performs no semantic interpretation. This check SHALL discover direct read sites rather than maintain a second permanent reader inventory. Check-specific fields SHALL remain schema-preserved passthrough. Their implementation and checker-owned finding support SHALL be proved through active Gate execution, evaluator-family unknown-check/missing-root-contract fail-closed tests, and focused tests for changed check/root types rather than a test-only route or repair catalog. The common schema SHALL NOT evaluate rules, persist lineage, or create a second Gate verdict.

Definition-owned `repair.write_to` MAY contain only registered coordinate placeholders such as `{topic}` and the controlled `$checked_target` alias. Checker-owned finding SHALL construct its blocking basis and repair coordinate from the direct root context. The evaluator SHALL resolve every placeholder/alias into an exact non-empty next-action coordinate before projecting a hint. An unresolved/unknown/empty coordinate, or a blocking result without a closed root-specific basis and resolved repair, SHALL become a `configuration_integrity` missing-contract finding. The shared builder SHALL NOT classify the coordinate by string shape; semantic kind/reachability SHALL already be established by the definition-owned focused contract or the detecting helper and its existing operation/decision boundary. The original domain failure MAY remain as masked durable detail but SHALL NOT be emitted with guessed basis/action. The checkpoint-specific `rerun` command SHALL be projected by the formal Gate or inspect caller and SHALL NOT be duplicated across every rule definition.

`failure_message` SHALL remain a non-authoritative definition-file compatibility field only. Gate evaluation, hint projection, action-bearing `advice[]`, root ordering, failed-rule identity, and attempt-trend comparison SHALL NOT infer any contract fact from it. The shared projector SHALL ignore it when constructing Agent actions; an implementation MAY retain it only as bounded durable diagnostic detail. The GSK-011 audit SHALL NOT parse or regex-match this prose to infer repair kind, next-action coordinate, command legality, or semantic agreement, and this Change SHALL NOT require an exhaustive legacy-message rewrite.

#### Scenario: Status rule names Engine operation rather than status edit

- **WHEN** an active gate rule checks `rb_status.json#/current_gate`
- **THEN** its definition-owned or checker-owned root contract SHALL name the accepted `advance-status`, `enter-phase`, or other existing Engine-owned operation that produces the required status fact
- **AND** it SHALL NOT tell the Agent to edit `rb_status.json` directly

#### Scenario: Existing target-less rule needs no synthetic target

- **WHEN** `basename_consistency`/slug consistency declares checked authorities through `fields[]`, or `bundle_structure_valid` uses `targets[]`, without singular `target`
- **THEN** the common Gate-definition schema SHALL accept the existing check-specific descriptor
- **AND** its root contract SHALL use an explicit coordinate or checker-owned finding rather than `$checked_target`

#### Scenario: Wildcard target cannot become a write authorization alias

- **WHEN** a definition-owned rule checks a glob or pattern target such as `reference/00-shared-*.md`
- **THEN** its repair contract SHALL name an exact explicit coordinate or use a checker-owned finding for the concrete root
- **AND** `$checked_target` SHALL be rejected because the checked descriptor does not resolve to one writable coordinate

#### Scenario: One complex rule can expose different legal repairs

- **WHEN** a checker-owned provenance or depth rule detects different direct roots such as a repairable Agent artifact, a missing Engine-owned declaration, a required floor, or an unavailable legal mutation path
- **THEN** each blocking finding SHALL carry the blocking basis and repair-kind/write coordinate appropriate to that direct root
- **AND** the definition SHALL NOT force all of those roots through one static basis or repair target

#### Scenario: Missing checker root contract fails as configuration integrity

- **WHEN** a checker-owned rule returns a blocking domain result without root-specific blocking basis or repair metadata
- **THEN** the shared builder SHALL emit one `configuration_integrity` hint with `repair_kind: missing_contract`, `missing_fact` naming the gate/rule/checker field that is absent, and `write_to` naming that exact unavailable contract boundary
- **AND** it SHALL mask the domain symptom and SHALL NOT infer basis/repair from the rule, `target`, `failure_message`, `inspect[]`, or `advice[]`

#### Scenario: Coordinate string shape does not infer repair kind

- **WHEN** a `write_to` coordinate resembles a bundle path, framework path, or CLI command
- **THEN** the schema/projector SHALL use only the explicit `repair.kind` or checker finding kind and SHALL NOT classify responsibility from that string
- **AND** focused definition/helper tests SHALL prove the coordinate is reachable through its existing authority boundary without adding a central coordinate or operation catalog

#### Scenario: Presentation preference cannot enter the blocking inventory

- **WHEN** a proposed gate rule protects only heading order, exact case, list-marker style, prose length, or a preferred bullet count
- **THEN** requirement review and focused changed-rule regression SHALL reject its blocking status
- **AND** the behavior SHALL be removed, parsed tolerantly, or retained only as advisory inspect feedback

#### Scenario: Blocking basis is a small closed contract

- **WHEN** a definition-owned or checker-owned blocking finding uses an unregistered basis
- **THEN** the shared definition schema or finding builder SHALL reject it and name its gate/rule coordinate
- **AND** when a changed root labels a preferred Markdown presentation as `required_structure`, requirement review and its focused regression SHALL reject the blocker without asking the common schema to infer prose semantics

#### Scenario: Runtime and audit share one definition parser

- **WHEN** a Gate definition is loaded by a formal CLI, consistency validation, post-final rerun guard, hygiene validation, or the active-rule audit
- **THEN** every semantic reader SHALL parse it through the same Zod Gate-definition schema
- **AND** an invalid repair contract SHALL fail with the same gate/rule coordinate rather than pass runtime JSON parsing and fail only in a test

#### Scenario: Negative fixture construction is not a second parser

- **WHEN** a regression test needs an unknown check, malformed repair contract, or invalid definition shape
- **THEN** the test MAY edit raw fixture JSON before invoking the production parser or CLI
- **AND** it SHALL prove rejection through the shared parser/result path rather than treating its raw object as a valid semantic definition

#### Scenario: Post-final hash does not create a semantic parse bypass

- **WHEN** post-final recovery hashes a rerun Gate definition and reads its rerun-count rule
- **THEN** the recorded definition hash SHALL still cover the original bytes
- **AND** the rule lookup, operator, and limit SHALL come from the shared schema-parsed value produced from that same byte snapshot

#### Scenario: Finding builder reuses the schema-owned closed enums

- **WHEN** a checker-owned finding validates `blocking_basis` and `repair_kind`
- **THEN** it SHALL consume the contracts exported by `gate-definition.mjs`
- **AND** no second runtime Set or independently maintained enum list SHALL define accepted basis/kind values

#### Scenario: Compatibility message cannot become repair authority

- **WHEN** a rule checks trace or submitted-ledger authority and its legacy `failure_message` is stale or misleading
- **THEN** the emitted `hints[]`, action-bearing `advice[]`, root order, and rerun action SHALL still come only from structured finding and repair metadata
- **AND** changing or leaving the prose untouched SHALL NOT change the Gate verdict or require a prose-consistency validator


### Requirement: Gate CLI skeleton shape

All formal Gate CLIs SHALL preserve the compatible JSON surface `{ check, routing, inspect, advice }` and SHALL add top-level `hints[]`. On pass, `hints` SHALL be empty. On failure, `hints` SHALL contain one entry for each independent primary blocking root and SHALL exclude advisory, diagnostic-only, masked, and downstream-symptom findings.

Each hint SHALL contain:

- `rule_id`: stable failed rule or shared preflight/config root identity;
- `repair_kind`: `agent_action`, `engine_operation`, `user_decision`, `external_action`, or `missing_contract`, copied from the resolved root contract;
- `missing_fact`: the earliest directly observed failed fact, expected deterministic contract, and observed value/state where available;
- `write_to`: the exact next-action coordinate from the resolved definition-owned or checker-owned root contract; and
- `rerun`: the exact same Gate CLI checkpoint, using the Engine-resolved absolute bundle root and current node when available.

`repair_kind` is action-responsibility feedback, not permission. `agent_action` and `engine_operation` tell the Controller which legal mechanical path to execute; `user_decision`, `external_action`, and `missing_contract` identify the smallest escalation boundary. The Controller SHALL NOT infer this kind from the shape of `write_to` or from prose.

`write_to` is retained as the compatible coordinate field name, but its meaning SHALL be interpreted by `repair_kind`: `agent_action` names an authorized mutable bundle path or JSON pointer; `engine_operation` names an accepted Engine operation with the exact known arguments; `user_decision` names the exact HITL/decision surface; `external_action` names the non-delegable prerequisite; and `missing_contract` names the exact unavailable capability or checker/definition contract boundary. A non-`agent_action` coordinate SHALL NOT be presented as permission to edit that coordinate directly.

Definition-time coordinate templates SHALL be fully resolved before output. For a per-topic failure, `write_to` SHALL identify the exact current Topic path and field/JSON pointer rather than a literal `{topic}` placeholder. If invocation parsing has not established a bundle/current node, the hint SHALL preserve only known exact arguments and a required-argument command template; it SHALL NOT invent an absolute bundle root.

`hints[]` is a read-only feedback projection. It SHALL NOT become gate authority, permission, a generic repair controller, or an automatic mutation path. `inspect[]` MAY retain bounded forensic detail and `advice[]` MAY remain for compatibility, but neither SHALL be the only way for the Markdown Controller to discover the legal repair path.

All failure exits SHALL use the shared result/finding builder, including invalid invocation, missing/unparseable definition, node/gate binding, lifecycle handoff/status preflight, canonical topic-state prerequisite, gate-specific prerequisite, routing, durability, and rule evaluation. For failures outside definition evaluation, the existing helper that directly detects the failed fact SHALL construct and return the structured finding with its stable root id, blocking basis, observed/expected facts, and repair kind/write coordinate. A wrapper SHALL only project that finding for its checkpoint and SHALL NOT hand-build a failed result, reconstruct metadata from prose, or look up a duplicate central preflight-root catalog.

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

#### Scenario: Explicit checked-target alias is resolved before output

- **WHEN** a definition-owned Agent rule has `target: "artifacts/wave1/{topic}/evidence-summary.md"` and `repair.write_to: "$checked_target"`, and it fails for Topic `topic-a`
- **THEN** the emitted hint SHALL name `artifacts/wave1/topic-a/evidence-summary.md`
- **AND** neither `$checked_target` nor an unresolved `{topic}` placeholder SHALL appear in `hints[]`

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

Gate rule evaluation SHALL evolve the existing structured finding shape implemented by `wave-contract-findings.mjs`; it SHALL NOT introduce a parallel failure object. `makeContractFinding()`, `buildContractEvaluation()`, and `projectInspectContract()` SHALL retain their current classification/surface/expected/repair/detail behavior while adding the observed fact, blocking basis, repair kind/resolved write coordinate, masking, and checkpoint context needed by formal Gate projection. For a definition-owned rule, the evaluator SHALL attach the resolved static basis/repair to the concrete failure finding. For a checker-owned rule, the detecting helper SHALL return the concrete blocking finding(s) directly. Wave formal Gate and side-effect-free inspect SHALL consume the same findings for shared rules; formal-only lifecycle/config rules SHALL use the same finding shape through shared Gate helpers. CLI wrappers SHALL not reconstruct hints from `inspect[]`, `advice[]`, `failure_message`, exception text, or filename regexes after evaluation. `findingsFromCheckResult()` or another compatibility adapter MAY convert prose-only results only when they remain advisory or diagnostic-only; any result that blocks the current inspect or formal Gate SHALL provide a structured finding directly rather than deriving rule identity or repair lineage from prose position/prefix.

The shared finding SHALL preserve rule identity, closed-enum `blocking_basis`, direct observed fact, checked authority coordinate, expected contract, root-specific repair kind/resolved write coordinate, classification, and masking relationship needed to project `failed_rule_ids`, `hints[]`, `inspect[]`, and `advice[]` consistently. Finding `id` MAY identify a concrete diagnostic instance, while `rule_id` SHALL be the stable identity used for formal failed-rule projection and attempt comparison. `buildContractEvaluation()` SHALL derive `failed_rule_ids` from blocking findings' `rule_id`, not from a message-indexed or otherwise instance-local `id`. Multiple independent instances or root types of one rule SHALL remain distinguishable through their findings and resolved hint coordinates. This is an in-memory result shape, not persistent state or a second verdict.

Primary root selection and ordering SHALL come from structured classification, prerequisite masking, and stable rule identity. `gateMessagePriority()` or equivalent error-string regex classification SHALL NOT decide `failed_rule_ids` or `hints[]` ordering. Gate-attempt trend comparison SHALL use stable `failed_rule_ids`; a legacy diagnostic without stable IDs SHALL be excluded from comparison, making the current result the first comparable sample rather than comparing `inspect[]` prose.

#### Scenario: Inspect and formal Gate share the same repair coordinates

- **WHEN** Wave inspect and formal Gate evaluate the same unchanged bytes and shared blocking rule
- **THEN** both SHALL return the same `rule_id`, `repair_kind`, `missing_fact`, and `write_to`
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

The active Gate audit SHALL automatically enumerate schema-parsed active definitions and independent Gate CLI wrappers, verify their bijection, and validate every active rule's stable identity, checked-authority descriptor, finding source, and any definition-owned closed `blocking_basis`, repair-kind/next-action `write_to`, and registered coordinate placeholders through the shared Gate-definition schema. It SHALL include the production definition-read no-bypass check without maintaining a permanent reader inventory.

The audit SHALL NOT require or maintain a second rule-id-granular catalog of producer instructions, artifact categories, runtime authorities, checker routes, root bases, repair routes, diagnostic surfaces, classifications, non-Agent-produced exemptions, or test-guard paths. Checked authority SHALL come from the parsed rule descriptor; definition-owned root contract SHALL come from parsed metadata; checker-owned root contract SHALL come from the detecting finding; active Gate rules are blocking by definition; diagnostic projection SHALL come from the shared finding/result builder.

Checker support SHALL be proved behaviorally through current-definition Gate pass regressions, evaluator-family unknown-check and checker-owned missing-root-contract fail-closed tests, and focused regression for each changed checker/root class. Shared Wave evaluator versus formal-only behavior SHALL be verified at the evaluator/detecting-helper class boundary rather than copied into every rule row. Agent producer guidance SHALL receive focused Markdown contract coverage when this Change modifies an Agent-owned output surface; `engine_operation`, `user_decision`, `external_action`, and `missing_contract` roots SHALL NOT require a per-rule exemption or root catalog.

Distinct failure-source classes outside the definition rule loop, including invalid invocation, definition/config load, node/gate binding, lifecycle handoff/status preflight, canonical topic-state or gate-specific prerequisite, routing, and durable handoff trace failure, SHALL each have representative structured-finding and hint-projection coverage. The audit SHALL not require a Cartesian product of every Gate and every shared failure class, and SHALL not use source-code prose or object-literal regexes as an architecture verdict.

When this Change removes or downgrades a blocking rule, its known checker branch, degradation wording, producer wording, and blocking fixtures SHALL be removed or reclassified in the same change. This cleanup SHALL be targeted to the changed rule and SHALL NOT create a permanent retired-rule inventory.

#### Scenario: New rule without finding source fails audit

- **WHEN** an active Gate definition adds a blocking rule without a valid finding-source contract or with an incomplete definition-owned basis/repair contract
- **THEN** the audit SHALL fail and name the gate/rule

#### Scenario: Current definitions prove checker support through execution

- **WHEN** the all-Gate regression runs each schema-parsed active definition on its representative valid bundle
- **THEN** every active rule SHALL execute without an unsupported-check result
- **AND** an injected unknown check in each evaluator family SHALL fail closed as configuration integrity rather than being skipped

#### Scenario: Duplicate rule catalog is not required

- **WHEN** an active rule is added with valid schema metadata and supported execution
- **THEN** the audit SHALL derive checked authority, definition/checker root lineage, classification, and diagnostic projection from the production contract path
- **AND** it SHALL NOT require a second producer/authority/checker/basis/repair/diagnostic/test inventory row

#### Scenario: Wrapper preflight failure stays helper-owned

- **WHEN** a formal Gate wrapper adds or changes a failure exit outside definition rule evaluation
- **THEN** the detecting helper SHALL provide the stable root id, blocking basis, repair kind, exact next-action coordinate, and focused test for that failure class
- **AND** the wrapper SHALL project the helper finding through the shared result builder rather than reconstruct repair lineage from prose

#### Scenario: Removed blocker leaves no active shadow rule

- **WHEN** a blocking Gate rule is removed or downgraded
- **THEN** its known checker branch, degradation eligibility, producer wording, and regression expectations SHALL be removed or reclassified in the same change
- **AND** no hidden helper SHALL continue to fail the Gate for the retired preference
