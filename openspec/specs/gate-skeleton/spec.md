# Gate Skeleton

> req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-006, GSK-007, GSK-008, GSK-009, GSK-010, GSK-011

## Purpose

定义 Workflow Foundation 的 9 个 Gate definition JSON 骨架和 9 个 Gate CLI 骨架的产出要求。建立 gate 文件的统一 shape - definition 和 CLI 的正确结构 - 使后续 content change 只需要在已有文件里增加 rules 和实现逻辑，不再争论文件形态。
## Requirements
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

#### Scenario: work-unit rule target is accepted

- **WHEN** a gate definition includes `check: "work_unit_output_coverage"` for Wave1 topic deepening
- **THEN** gate definition validation SHALL accept the rule shape
- **AND** the rule SHALL identify the required wave/kind/output scope

### Requirement: Gate CLI skeleton shape

All formal Gate CLIs SHALL preserve the compatible JSON surface `{ check, routing, inspect, advice }` and SHALL add top-level `hints[]`. On pass, `hints` SHALL be empty. On failure, `hints` SHALL contain one entry for each independent primary blocking root and SHALL exclude advisory, diagnostic-only, masked, and downstream-symptom findings.

Each hint SHALL contain:

- `rule_id`: stable failed rule or shared preflight/config root identity;
- `repair_kind`: `agent_action`, `engine_operation`, `user_decision`, `external_action`, or `missing_contract`, copied from the resolved root contract;
- `missing_fact`: the earliest directly observed failed fact, expected deterministic contract, and observed value/state where available;
- `write_to`: the exact next-action coordinate from the resolved definition-owned or checker-owned root contract; and
- `rerun`: the exact same Gate CLI checkpoint, using the Engine-resolved absolute bundle root and current node when available.

`repair_kind` is action-responsibility feedback, not permission or interaction timing. `agent_action` and `engine_operation` tell the Controller which legal mechanical path to execute; `user_decision`, `external_action`, and `missing_contract` identify the smallest honest boundary. The Controller SHALL NOT infer this kind from the shape of `write_to` or from prose.

Producer-supplied `repair` and action-bearing `advice[]` for `user_decision`, `external_action`, or `missing_contract` SHALL remain interaction-placement-neutral so the same direct diagnostic is valid at HITL1/HITL2 and at a non-terminal `stop: no` phase. That prose SHALL identify the missing boundary and its existing owner or unavailable contract. The structured `hints[].rerun` SHALL remain the one exact checkpoint coordinate; compatibility prose SHALL NOT copy a competing command or contradict it. Producer prose SHALL NOT direct the Controller to ask/contact the user now, return/jump to HITL, surface a blocker, request approval, or wait for acknowledgement. This wording constraint SHALL NOT suppress a finding or change `repair_kind` merely to alter interaction timing, and SHALL NOT alter Gate pass/fail or routing or require the Engine to inspect conversation state. When direct facts and an accepted owner prove that a current producer mislabeled an existing mechanical operation as `user_decision`, the producer SHALL correct `repair_kind` and `write_to` to that existing owner; this is owner repair, not interaction-policy relabeling. Legacy `failure_message` remains the non-authoritative compatibility detail defined by the Gate-definition contract; this requirement SHALL NOT make it an action source or require rewriting it.

`write_to` is retained as the compatible coordinate field name, but its meaning SHALL be interpreted by `repair_kind`: `agent_action` names an authorized mutable bundle path or JSON pointer; `engine_operation` names an accepted Engine operation with the exact known arguments; `user_decision` names the exact HITL/decision surface; `external_action` names the non-delegable prerequisite; and `missing_contract` names the exact unavailable capability or checker/definition contract boundary. A non-`agent_action` coordinate SHALL NOT be presented as permission to edit that coordinate directly.

Definition-time coordinate templates SHALL be fully resolved before output. For a per-topic failure, `write_to` SHALL identify the exact current Topic path and field/JSON pointer rather than a literal `{topic}` placeholder. If invocation parsing has not established a bundle/current node, the hint SHALL preserve only known exact arguments and a required-argument command template; it SHALL NOT invent an absolute bundle root.

`hints[]` is a read-only feedback projection. It SHALL NOT become gate authority, permission, a generic repair controller, or an automatic mutation path. `inspect[]` MAY retain bounded forensic detail and `advice[]` MAY remain for compatibility, but neither SHALL be the only way for the Markdown Controller to discover the legal repair path.

All failure exits SHALL use the shared result/finding builder, including invalid invocation, missing/unparseable definition, node/gate binding, lifecycle handoff/status preflight, canonical topic-state prerequisite, gate-specific prerequisite, routing, durability, and rule evaluation. For failures outside definition evaluation, the existing helper that directly detects the failed fact SHALL construct and return the structured finding with its stable root id, blocking basis, observed/expected facts, and repair kind/write coordinate. A wrapper SHALL only project that finding for its checkpoint and SHALL NOT hand-build a failed result, reconstruct metadata from prose, or look up a duplicate central preflight-root catalog.

For the active rerun-count rule needed both before and at its formal Gate decision point, the Gate, HITL2 and accepted post-final consumer SHALL reuse the side-effect-free evaluator owned by REI-003 rather than duplicate the comparison in CLI and Markdown. The evaluator SHALL consume the loader-parsed definition plus full parsed profile and return closed availability facts only; consumer modes and post-final stages SHALL follow the owning REI-003/POF-001 contracts. The rerun-ready Gate SHALL keep formal verdict/trace/routing ownership, and existing local comparisons in the Gate and post-final guard SHALL be removed.

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

#### Scenario: Shared advisory and Gate fact use one evaluator

- **WHEN** HITL2 advice, accepted post-final recovery and rerun-ready Gate need the active rerun-count availability fact
- **THEN** all three SHALL call the same REI-003 pure evaluator over the loader-parsed definition and full parsed profile
- **AND** Markdown SHALL consume its closed result rather than implement operator/value/count logic
- **AND** only the Gate SHALL emit the formal verdict, routing and Gate trace

#### Scenario: Profile prerequisite masks count implications

- **WHEN** the full profile is missing/unparseable or its HITL2 parent is absent
- **THEN** the Gate SHALL emit only the existing profile prerequisite as the primary hint
- **AND** rationale/count implications SHALL remain masked rather than becoming a competing rerun-count hint
- **AND** the shared evaluator SHALL return unsupported facts without constructing another finding

#### Scenario: Non-mechanical Gate advice stays placement-neutral

- **WHEN** a Gate/Inspect producer consuming the evaluator emits a primary `user_decision`, `external_action`, or `missing_contract` finding
- **THEN** `hints[]` SHALL retain the exact `repair_kind`, `missing_fact`, `write_to`, and same-checkpoint `rerun`
- **AND** producer-supplied repair/advice SHALL identify the boundary without instructing immediate user contact, HITL reentry, approval, surfacing, or acknowledgement wait
- **AND** Gate verdict and route SHALL remain unchanged, and finding classification SHALL remain unchanged unless direct facts plus an accepted existing owner prove it was misclassified as a user decision

#### Scenario: Existing mechanical owner corrects a false user-decision finding

- **WHEN** a recorded research profile exists and a Wave finding lacks only derived `research_style_params` that the accepted `apply-research-style.mjs` operation owns
- **THEN** the finding SHALL use `repair_kind: engine_operation` and name that existing operation rather than HITL1
- **AND** only a genuinely missing research-profile decision MAY retain `repair_kind: user_decision`
- **AND** Gate verdict, routing and the formal same-check rerun SHALL remain unchanged

#### Scenario: CLI called without --bundle

- **WHEN** `node check-gate-wave0-complete.mjs` 被调用且未提供 `--bundle`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI called without --current-node

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test` 被调用且未提供 `--current-node`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI returns valid JSON

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test --current-node phases/phase-wave0.md` 被调用
- **THEN** stdout MUST 是合法 JSON
- **AND** MUST 包含 `check`（含 `passed`、`gate`、`currentNodeRef`、`next`）、`routing`、`inspect`、`advice` 四个 key

#### Scenario: CLI exit code matches check result

- **WHEN** CLI 返回的 JSON 中 `check.passed` 为 `false`
- **THEN** process exit code MUST 为 1

#### Scenario: CLI exits 2 on routing contract errors

- **WHEN** CLI 调用详细 router 后 `routing.kind` 为 `no_transition`、`invalid_input` 或 `config_error`
- **THEN** process exit code MUST 为 2

### Requirement: One gate per CLI

Each active gate SHALL continue to have one independent `check-gate-<name>.mjs` wrapper. The active inventory SHALL be derived from the gate definitions and SHALL currently contain all ten wrappers, including `check-gate-rerun-ready.mjs`. Documentation and static guards SHALL NOT hard-code a stale count or omit an active definition/CLI pair.

#### Scenario: Definition and CLI inventories are bijective

- **WHEN** the active Gate inventory is audited
- **THEN** every `gate-*.definition.json` SHALL have exactly one corresponding `check-gate-*.mjs`
- **AND** every active Gate CLI SHALL have exactly one definition
- **AND** `rerun-ready` SHALL be included

#### Scenario: Agent invokes a specific gate

- **WHEN** agent 需要运行 `wave0-complete` gate
- **THEN** agent MUST 调用 `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path>`，MUST NOT 调用一个 generic runner 加 `--gate wave0-complete` 参数

### Requirement: Gate CLI SHALL include template_not_expanded pre-rule sanity check

Before the deterministic rule loop, Wave0/Wave1/Wave2 gate CLIs SHALL scan `source_url` field values in source YAML and reference artifacts. If any `source_url` value contains `${` (indicating an unexpanded template variable), the gate SHALL emit a `template_not_expanded` diagnostic identifying the affected file and field. This diagnostic SHALL NOT by itself fail the gate but SHALL appear in inspect output.

#### Scenario: Template placeholder is reported before rule evaluation

- **WHEN** a Wave gate CLI reads a source or reference artifact whose `source_url` contains `${`
- **THEN** the gate output SHALL include a `template_not_expanded` diagnostic identifying the affected file and field
- **AND** that diagnostic SHALL NOT by itself fail the gate

### Requirement: Gate helpers SHALL provide actionable parse error diagnostics and deterministic repair

When gate helpers read YAML or JSON files, parse failures SHALL produce diagnostics that distinguish "file does not exist" from "file exists but cannot be parsed," SHALL include the file path, and SHALL include the parser error message with line/position. Generic "Cannot read or parse" messages SHALL be replaced.

For JSON files, gate helpers SHALL attempt deterministic repair for common LLM-produced malformations before failing: trailing commas, single missing closing brackets/braces at depth 1, unquoted property keys matching `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`, and single-quoted strings. Repaired files SHALL log a `json_repaired` diagnostic.

For YAML files, gate helpers SHALL attempt deterministic repair for unescaped ASCII double quotes (`"`, U+0022) inside double-quoted YAML scalars — the primary hand-concatenation failure pattern. The repair SHALL locate the failure line, escape interior double quotes, and retry parsing. Success SHALL log `yaml_repaired`; failure SHALL fall back to actionable parse error diagnostics. The initial repair target is single-line double-quoted scalars only.

> **Write-side complement:** `workflow-node-contract` WNC-009 mandates `yaml.stringify()` / `JSON.stringify()` for all sub-agent outputs, eliminating malformations at the source. These read-side repairs handle legacy data and edge cases.

#### Scenario: Parse failure exposes repairable diagnostics

- **WHEN** a gate helper reads an existing YAML or JSON file that cannot be parsed
- **THEN** the diagnostic SHALL include the file path and parser error detail
- **AND** supported deterministic repairs SHALL be attempted before returning a final parse failure

### Requirement: Gate CLI evaluates rules from definition

Gate rule evaluation SHALL evolve the existing structured finding shape implemented by `wave-contract-findings.mjs`; it SHALL NOT introduce a parallel failure object. `makeContractFinding()`, `buildContractEvaluation()`, and `projectInspectContract()` SHALL retain their current classification/surface/expected/repair/detail behavior while adding the observed fact, blocking basis, repair kind/resolved write coordinate, masking, and checkpoint context needed by formal Gate projection. For a definition-owned rule, the evaluator SHALL attach the resolved static basis/repair to the concrete failure finding. For a checker-owned rule, the detecting helper SHALL return the concrete blocking finding(s) directly. Wave formal Gate and side-effect-free inspect SHALL consume the same findings for shared rules; formal-only lifecycle/config rules SHALL use the same finding shape through shared Gate helpers. CLI wrappers SHALL not reconstruct hints from `inspect[]`, `advice[]`, `failure_message`, exception text, or filename regexes after evaluation. `findingsFromCheckResult()` or another compatibility adapter MAY convert prose-only results only when they remain advisory or diagnostic-only; any result that blocks the current inspect or formal Gate SHALL provide a structured finding directly rather than deriving rule identity or repair lineage from prose position/prefix.

The shared finding SHALL preserve rule identity, closed-enum `blocking_basis`, direct observed fact, checked authority coordinate, expected contract, root-specific repair kind/resolved write coordinate, classification, and masking relationship needed to project `failed_rule_ids`, `hints[]`, `inspect[]`, and `advice[]` consistently. Finding `id` MAY identify a concrete diagnostic instance, while `rule_id` SHALL be the stable identity used for formal failed-rule projection and attempt comparison. `buildContractEvaluation()` SHALL derive `failed_rule_ids` from blocking findings' `rule_id`, not from a message-indexed or otherwise instance-local `id`. Multiple independent instances or root types of one rule SHALL remain distinguishable through their findings and resolved hint coordinates. This is an in-memory result shape, not persistent state or a second verdict.

Primary root selection and ordering SHALL come from structured classification, prerequisite masking, and stable rule identity. `gateMessagePriority()` or equivalent error-string regex classification SHALL NOT decide `failed_rule_ids` or `hints[]` ordering. Gate-attempt trend comparison SHALL use stable `failed_rule_ids`; a legacy diagnostic without stable IDs SHALL be excluded from comparison, making the current result the first comparable sample rather than comparing `inspect[]` prose.

Wave0/Wave1/Wave2 definitions SHALL include one shared `phase_queue_drained` rule evaluated by the existing pure wave-contract path. Its direct Source of Record SHALL be schema-valid `rb_queue.json`; pass requires `active_window`, `refill_pool`, and `delegated_in_flight` all to be empty. The evaluator SHALL check file existence, JSON parsing and the existing `QueueSchema` directly; it SHALL NOT call a loader that auto-creates an in-memory empty queue when the file is absent, and SHALL NOT persist schema defaults. This is a global quiescent-handoff invariant, not the delegated-only `phase_drained` projection returned by claim. The rule SHALL use `blocking_basis: authority_integrity` and SHALL be degradation-ineligible. The evaluator SHALL NOT infer queue-item phase from IDs, producer prose, kind prefixes, file paths, or phase-order heuristics, and SHALL NOT create a completion manifest/state. Side-effect-free Wave inspect and formal Gate SHALL consume the same fact finding for this rule.

If queue authority is missing, unreadable, or schema-invalid, the rule SHALL report that prerequisite root with `repair_kind: missing_contract` and mask derived drain symptoms; it SHALL NOT authorize direct queue editing.

If the queue is valid and `delegated_in_flight` is non-empty, the rule SHALL return that bounded root first and point `write_to` to the existing `operate-work-unit inspect` checkpoint. Only after in-flight work is empty, an `active_window` residual SHALL produce one bounded front-demand root. The rule SHALL read only the front item's direct `targets` owner: `targets.delegates.to: sub-agent` points to the current Wave's `operate-work-unit claim` checkpoint, otherwise `targets.controller: main-agent` points to `operate-queue claim`. It SHALL NOT derive phase from item id, kind, producer, path, or prose.

If `active_window` is empty while `refill_pool` remains non-empty, the finding SHALL use `repair_kind: missing_contract`: current public operations do not expose a sanctioned refill-only transition, and `operate-queue check` does not repair that state. The rule SHALL NOT add a new refill command, ask for a queue hand edit, or falsely present an unreachable Engine operation.

For reachable roots, the Agent SHALL follow the returned owner checkpoint, execute legal mechanical drain/submit/repair/wait/timeout-preflight/terminal work, and rerun the same Wave checkpoint. The rule SHALL NOT ask the user to run ordinary commands, auto-terminalize work, choose a semantic failure reason, or present competing recovery routes.

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

#### Scenario: filesystem-only output fails gate rule

- **WHEN** a gate rule evaluates delegated output coverage
- **AND** only filesystem output exists without submitted work-unit ledger coverage
- **THEN** the gate CLI SHALL fail that rule

#### Scenario: Wave completion blocks non-empty queue containers

- **WHEN** Wave0, Wave1, or Wave2 inspect/Gate reads a schema-valid queue whose active window, refill pool, or delegated-in-flight map is non-empty
- **THEN** the shared `phase_queue_drained` rule SHALL fail before phase completion
- **AND** the finding SHALL name the non-empty direct coordinates and one existing Engine owner boundary
- **AND** the Agent SHALL perform the authorized mechanical action and rerun the same checkpoint without a user decision

#### Scenario: Empty queue uses no phase inference

- **WHEN** all three queue containers are empty
- **THEN** `phase_queue_drained` SHALL pass without inspecting queue-item IDs, producer rules, writes-to paths, phase order, trace, checkpoint, or chat state

#### Scenario: Future-looking residual is not inferred away

- **WHEN** a schema-valid queue contains a residual item whose id, kind, prose, or path appears to refer to a later phase
- **THEN** the current Wave Gate SHALL still fail the global quiescent-handoff rule
- **AND** the evaluator SHALL NOT classify that item as permissible future demand from heuristic metadata

#### Scenario: In-flight work is the nearest drain root

- **WHEN** delegated in-flight work and queued demand are both present
- **THEN** the rule SHALL first direct the Agent to the existing work-unit inspect checkpoint
- **AND** queued-demand repair SHALL be reevaluated after in-flight work is resolved rather than presented as a competing first action

#### Scenario: Active-front target selects the existing owner

- **WHEN** in-flight work is empty and the active-window front is delegated demand
- **THEN** the root SHALL point to the current Wave's role-bound work-unit claim checkpoint
- **AND** when the front is non-delegated main-agent demand it SHALL instead point to `operate-queue claim`
- **AND** neither branch SHALL infer phase or owner from id, kind, producer prose, or file path

#### Scenario: Refill-only state exposes a missing contract

- **WHEN** `active_window` is empty and `refill_pool` is non-empty
- **THEN** the rule SHALL fail with `repair_kind: missing_contract`
- **AND** it SHALL NOT claim that queue check mutates the state, invent a refill command, or advise direct queue editing

#### Scenario: Invalid queue masks drain symptoms

- **WHEN** `rb_queue.json` is missing, unreadable, or schema-invalid
- **THEN** the rule SHALL return one direct queue-authority prerequisite root
- **AND** it SHALL NOT additionally report per-container or per-item drain symptoms

#### Scenario: Missing queue is not defaulted to drained

- **WHEN** `rb_queue.json` does not exist
- **THEN** the checker SHALL fail the queue-authority prerequisite
- **AND** it SHALL NOT call auto-create loading behavior, synthesize an empty queue in memory as pass evidence, or write a queue file

#### Scenario: Fatigue cannot degrade queue quiescence

- **WHEN** a Wave Gate reaches any fatigue/degradation threshold while `phase_queue_drained` is failing
- **THEN** the Gate SHALL remain failed
- **AND** the queue rule SHALL NOT appear in a degradation-eligible allowlist or degraded handoff

### Requirement: Gate CLI accepts agent-reported attempt hint for fatigue diagnostics

Lifecycle gate CLIs MAY use an Agent-reported or Engine-derived attempt count as one input to degraded-pass eligibility, but the attempt count alone SHALL NOT change gate truth or authorize handoff. A degraded pass MAY be considered only after the configured fatigue threshold has been reached and the gate can still prove the runtime-truth preconditions required by the lifecycle handoff contract.

Fatigue advice for a non-terminal `stop: no` phase SHALL reinforce the direction-aware silent contract: gate failure is not permission for the framework/Agent to initiate questions, progress, idle summaries, partial delivery or A/B choices. It SHALL direct strategy change, accepted degradation, same-check repair or silent hold without stating an absolute prohibition on answering a user-initiated normal conversation turn already received. The advice SHALL NOT inspect or classify chat state, and this change SHALL NOT alter the fatigue threshold, Gate verdict or degraded-pass eligibility.

#### Scenario: Attempt hint does not bypass runtime truth

- **WHEN** a wave gate is invoked with an attempt count at or above fatigue threshold
- **AND** the gate has a missing submitted work-unit ledger row, stale `delegated_in_flight`, invalid status window, failed handoff preflight, hash drift, nonce mismatch, or non-durable trace write
- **THEN** the Gate SHALL NOT emit a degraded pass
- **AND** inspect/advice SHALL name the runtime-truth blocker

#### Scenario: Fatigue advice prohibits initiation rather than every reply

- **WHEN** a failed non-terminal `stop: no` Gate reaches the existing fatigue threshold
- **THEN** fatigue advice SHALL state that the Agent/framework must not initiate user-facing questions, progress, idle summaries, partial delivery or choices
- **AND** it SHALL NOT state that all user-facing interaction or an answer to an already received user turn is absolutely prohibited
- **AND** the configured threshold, Gate verdict and degradation eligibility SHALL remain unchanged

### Requirement: Shared gate attempt audit helper

The existing Gate attempt write ownership SHALL remain unchanged: formal Gate wrappers SHALL continue to call the accepted shared audit helper at their current durability boundary, and this change SHALL NOT introduce a new finalizer or duplicate trace writer. The existing durable Gate failure diagnostic SHALL preserve the emitted result's `hints[]` alongside `check`, `routing`, `inspect`, and `advice`; a pass diagnostic MAY preserve `hints: []` for shape consistency.

Persisted hints SHALL remain diagnostic projection only. They SHALL NOT become Gate verdict, routing authority, repair permission, or a fallback source that overrides a newer direct evaluation.

#### Scenario: Failure diagnostic preserves the actionable hint

- **WHEN** a formal Gate emits a failed result with one or more primary hints and writes its existing failure diagnostic
- **THEN** the diagnostic SHALL contain the same `hints[]` entries as the emitted result
- **AND** no additional trace writer, wrapper finalizer, or diagnostic-derived verdict SHALL be introduced

#### Scenario: Gate pass writes to both destinations with bundle

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a passed result
- **THEN** a `gate_attempt` JSONL event SHALL be appended to `rb_trace.jsonl` containing `bundle`
- **AND** a logger INFO line SHALL be appended to `_logs/run.log` containing `bundle`

#### Scenario: Gate fail writes diagnostic detail with bundle

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a failed result
- **THEN** a logger WARN line SHALL include inspect and advice summaries and `bundle`

#### Scenario: Gate CLI MUST NOT inline trace write

- **WHEN** implementing a new gate CLI or modifying an existing one
- **THEN** the CLI SHALL NOT contain `appendFileSync` calls targeting `rb_trace.jsonl`
- **AND** SHALL use `writeGateAttempt(bundlePath, result)` as the sole trace/log write mechanism

#### Scenario: Audit write failure does not affect gate result

- **WHEN** the trace file or log directory is unwritable
- **THEN** `writeGateAttempt()` SHALL silently catch the error
- **AND** the gate result SHALL still be emitted via `emitGateResult()`

### Requirement: Lifecycle gate handoff preflight (GSK-007)

Lifecycle gate CLIs SHALL run a shared handoff preflight before evaluating their gate-specific content rules.

For every covered non-bootstrap manifest lifecycle phase that has an incoming deterministic transition, the preflight SHALL verify:

- the latest passed deterministic `gate_attempt` trace event with a non-null `next` has `next` equal to the current phase node fileRef and names the legal predecessor gate/currentNodeRef; and
- the current phase node has a later route-bound `load_complete(entry=<current phase node fileRef>)` trace event whose `handoff_source_attempt_index` points to the same predecessor `gate_attempt`, proving the Phase Agent consumed that prior gate's `check.next` through `enter-phase` or another accepted loader path that enforces the same predecessor-gate binding.

The preflight SHALL derive lifecycle membership and deterministic incoming edges from `manifest.json` and `transitions.chain.json`; it SHALL NOT infer lifecycle membership from file names alone. If a node has multiple deterministic incoming edges, the preflight SHALL accept the latest valid ordered pair for any legal predecessor edge.

For this change, covered non-bootstrap gate preflight targets are `phases/phase-seed-topics.md`, `phases/phase-wave0.md`, `phases/phase-wave1.md`, `phases/phase-wave2.md`, `phases/phase-hitl2.md`, `phases/phase-readiness.md`, and `phases/phase-rerun.md`. `phases/phase-final.md` has no gate preflight because Final has `gate: null`, but readiness→final entry still SHALL be witnessed before `advance-status --to readiness_passed` writes terminal status. Bootstrap inbound targets `phases/phase-instantiation.md`, `phases/phase-hitl1.md`, and `phases/phase-setup.md` are compatibility exceptions unless separately migrated. The validator allowlist SHALL name these exact bootstrap/final exceptions; no other lifecycle node may be omitted silently.

If the trace contains a newer `gate_attempt` for the same predecessor gate/currentNodeRef after an otherwise valid passed handoff, and that newer attempt failed or passed with a different `next`, the older passed handoff SHALL be treated as superseded and SHALL NOT satisfy preflight.

For branch-sensitive deterministic routes such as HITL2 proceed versus HITL2 rerun, the preflight SHALL validate the concrete target already emitted in `gate_attempt.next`. It SHALL NOT read profile state to choose a branch and SHALL NOT prefer a default `passed` edge when the trace authorizes a different legal deterministic target.

The HITL2 gate CLI SHALL emit the selected deterministic routing outcome for fixed-target HITL2 decisions. When `human_decision_checkpoints.hitl2.user_decision` is `proceed_to_readiness`, the gate's successful routing outcome SHALL be `passed`, yielding `check.next: "phases/phase-readiness.md"`. When the decision is `rerun`, the gate's successful routing outcome SHALL be `rerun`, yielding `check.next: "phases/phase-rerun.md"`. Non-deterministic HITL2 decisions (`request_view_revision`, `repair`, `stop_blocked`) SHALL NOT be defaulted to the readiness handoff.

For deterministic lifecycle gates covered by this change, gate status validation SHALL be derived from the same manifest/chain predecessor set rather than hardcoded to the gate's own enum as `current_gate` before the gate has passed. Before a covered current node's gate evaluates content rules:

- `rb_status.json#/next_gate` SHALL equal the current node's gate enum;
- `rb_status.json#/current_gate` SHALL equal a legal predecessor source gate enum whose passed `gate_attempt.next` points to the current node; and
- old hardcoded checks such as requiring wave2's `current_gate` to be `wave2_complete` before the wave2 gate passes SHALL be replaced or interpreted through this status-window rule.

If preflight fails, the gate CLI SHALL return normal gate failure output (`passed: false`, exit 1) with `inspect` and `advice` naming the missing trace evidence. It SHALL NOT change routing authority or select a next node.

For a covered deterministic gate success that emits a non-null `check.next`, the `gate_attempt(passed=true,next=<target>)` trace event is authoritative handoff evidence. The gate CLI SHALL NOT report a successful covered route if that required trace append cannot be made durable. Non-routing failures or legacy failed attempts MAY continue to tolerate audit write failures as diagnostics-only, but a non-durable covered pass MUST fail closed or produce explicit diagnostics instead of certifying a route the later helper cannot witness.

Lifecycle gate CLIs SHALL support a degraded pass outcome for eligible repeated gate failures. A degraded pass is a pass for phase handoff purposes only; it SHALL be distinguishable from a clean pass and SHALL NOT assert that all normal quality rules passed.

A gate MAY emit a degraded pass only when all of the following deterministic preconditions are satisfied:

- the gate belongs to a non-bootstrap lifecycle phase whose node is `stop: no`;
- the Agent-reported or Engine-derived attempt count has reached the configured fatigue threshold;
- lifecycle handoff/status preflight for the current node is satisfied;
- required structural, schema, trace, queue, work-unit submit, work-unit provenance, and hash/nonce integrity checks that protect runtime truth have passed;
- every failing rule is explicitly classified as degradation-eligible, such as an accepted soft profile-derived threshold that does not protect runtime truth; and
- the gate can append a durable `gate_attempt` trace event containing `passed: true`, `degraded: true`, `degraded_reason`, `degraded_rules`, `currentNodeRef`, and normal `next`.

A degraded pass SHALL set `check.passed: true`, `check.degraded: true`, and `check.next` to the normal deterministic next node. It SHALL include inspect/advice explaining which rules were degraded and which quality risks carry forward. If the trace event cannot be written durably, the gate SHALL fail closed and SHALL NOT report handoff success.

#### Scenario: Eligible repeated failure degrades with trace witness

- **WHEN** a Wave0 gate has reached fatigue threshold
- **AND** structural, status, queue, work-unit, provenance, and hash checks pass
- **AND** the only remaining failures are degradation-eligible quality thresholds
- **THEN** the gate SHALL emit `check.passed: true`
- **AND** `check.degraded` SHALL be `true`
- **AND** `check.next` SHALL name the normal next lifecycle node
- **AND** `rb_trace.jsonl` SHALL contain a matching degraded `gate_attempt`

#### Scenario: Degraded pass is not clean quality evidence

- **WHEN** a downstream tool reads a degraded `gate_attempt`
- **THEN** it SHALL treat the event as legal handoff evidence
- **AND** it SHALL preserve `degraded: true` and the degraded rule details as quality risk context
- **AND** it SHALL NOT report the source phase as a clean quality pass

#### Scenario: Gate fails when prior gate pass is missing

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** the latest passed deterministic `gate_attempt` with non-null `next` is not `gate: "wave0-complete"`, `currentNodeRef: "phases/phase-wave0.md"`, `next: "phases/phase-wave1.md"`
- **THEN** the gate SHALL return `passed: false`
- **AND** `inspect` SHALL identify the missing current predecessor handoff pass

#### Scenario: Gate fails when current phase was not entered

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` lacks `load_complete` for `phases/phase-wave1.md`
- **THEN** the gate SHALL return `passed: false`
- **AND** `advice` SHALL tell the Agent to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`

#### Scenario: Gate rejects stale or mismatched load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `load_complete(entry="phases/phase-wave1.md")` before the matching `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **THEN** the preflight SHALL NOT treat that stale load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate rejects unbound load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains a later `load_complete(entry="phases/phase-wave1.md")` whose `handoff_source_attempt_index` is missing or points to a different `gate_attempt`
- **THEN** the preflight SHALL NOT treat that load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate rejects superseded predecessor pass

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains an older passed `wave0-complete` attempt whose `next` points to `phases/phase-wave1.md`
- **AND** a newer `wave0-complete` attempt failed or passed with a different `next`
- **THEN** the preflight SHALL NOT treat the older pass as a valid handoff
- **AND** the gate SHALL return `passed: false` with advice to rerun the source gate and `enter-phase`

#### Scenario: Gate evaluates normal rules after witnessed handoff

- **WHEN** the prior gate pass has `next` equal to the current node and a later current-node `load_complete` witness is present
- **THEN** the gate SHALL continue to evaluate its existing definition rules
- **AND** pass/fail SHALL still be determined by the full rule set

#### Scenario: Downstream gate accepts source-gate status window

- **WHEN** wave1 has passed, `enter-phase` has loaded `phases/phase-wave2.md`, and source-gate status synchronization has written `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"`
- **AND** `check-gate-wave2-complete.mjs` is called for `phases/phase-wave2.md`
- **THEN** the shared gate status preflight SHALL accept the status window
- **AND** the gate SHALL NOT fail merely because `current_gate` is not yet `wave2_complete`
- **AND** the gate SHALL continue to evaluate wave2's normal content rules

#### Scenario: Rerun path accepts legal alternate predecessor

- **WHEN** rerun has passed with `gate_attempt(passed=true, gate="rerun-ready", currentNodeRef="phases/phase-rerun.md", next="phases/phase-seed-topics.md")`
- **AND** a later `load_complete(entry="phases/phase-seed-topics.md")` exists
- **AND** source-gate status synchronization has written `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
- **THEN** the seed-topics gate preflight SHALL accept the rerun predecessor as legal
- **AND** it SHALL NOT require the setup predecessor for that run

#### Scenario: HITL2 rerun branch validates selected deterministic target

- **WHEN** HITL2 has produced a deterministic rerun handoff with `gate_attempt(passed=true, gate="hitl2-recorded", currentNodeRef="phases/phase-hitl2.md", next="phases/phase-rerun.md")`
- **AND** a later `load_complete(entry="phases/phase-rerun.md")` exists
- **THEN** the rerun gate preflight SHALL accept HITL2 as the legal predecessor for `phases/phase-rerun.md`
- **AND** it SHALL NOT replace the selected rerun target with `phases/phase-readiness.md`

#### Scenario: HITL2 gate emits rerun outcome from recorded decision

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `rerun`
- **AND** all HITL2 gate rules pass
- **THEN** the gate result SHALL have `check.passed: true`
- **AND** routing SHALL use outcome `rerun`
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the resulting `gate_attempt` trace event SHALL contain `next: "phases/phase-rerun.md"`

#### Scenario: HITL2 gate does not default non-deterministic decisions to readiness

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `request_view_revision`, `repair`, or `stop_blocked`
- **AND** the decision is otherwise validly recorded
- **THEN** the gate SHALL NOT emit `check.next: "phases/phase-readiness.md"` solely because HITL2 rules passed
- **AND** deterministic handoff witnessing SHALL NOT treat that decision as a readiness handoff

#### Scenario: Terminal final entry is witnessed before readiness status sync

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` has written a later `load_complete(entry="phases/phase-final.md")`
- **THEN** `advance-status --to readiness_passed` SHALL be eligible to write `next_gate: "none"`
- **AND** final delivery SHALL still be governed by the Final node, not by the readiness gate itself

#### Scenario: Covered gate pass is trace-durable

- **WHEN** a covered lifecycle gate's content rules pass and routing emits non-null `check.next`
- **AND** appending the authoritative `gate_attempt(passed=true,next=<target>)` to `rb_trace.jsonl` fails
- **THEN** the gate CLI SHALL NOT return a misleading successful handoff
- **AND** later `enter-phase`, `advance-status`, or gate preflight SHALL NOT be forced to trust console output without durable trace evidence

### Requirement: Lifecycle gate preflight wiring is enforced (GSK-007)

The project SHALL include a regression check or validator that verifies every applicable lifecycle gate CLI invokes the shared handoff preflight/status-window helper.

The check SHALL fail if an applicable gate CLI omits the helper call or replaces it with ad hoc inline logic. The goal is to prevent a shared enforcement mechanism from existing without being wired into the real runtime path. Applicable covered gates include setup onward deterministic lifecycle gates and rerun-entry coverage where the runtime emits the corresponding deterministic handoff. Instantiation/HITL1 bootstrap exceptions SHALL be named explicitly in the validator allowlist rather than omitted silently.

The same validator or companion regression SHALL fail if a covered gate definition or gate-specific status check still requires `current_gate` to equal the gate's own enum before that gate has passed. Covered gates SHALL use the source-gate status window, except for explicitly allowlisted bootstrap compatibility cases.

#### Scenario: Missing preflight call fails validation

- **WHEN** an applicable lifecycle gate CLI does not invoke the shared handoff preflight helper
- **THEN** the wiring test or validator SHALL fail
- **AND** the failure SHALL name the gate CLI that is missing the call

#### Scenario: Stale own-gate status expectation fails validation

- **WHEN** a covered downstream gate definition still hardcodes `rb_status.json#/current_gate` to that same gate's enum before pass
- **THEN** the validator SHALL fail
- **AND** the failure SHALL name the stale rule or gate definition

### Requirement: Cascade-masked diagnostics remain non-authority (GSK-008)

Primary Gate hints SHALL be projected only from the smallest independent blocking root set after local prerequisite short-circuiting. Full forensic details MAY remain in the durable gate diagnostic, but `hints[]` SHALL not reproduce the flat failure wall. The framework SHALL use local guards and the existing masked-rule mechanism; this change SHALL NOT introduce a generalized dependency engine or persisted contract-lineage graph.

Repeated failure/fatigue output SHALL not replace the direct hint with generic encouragement, tell the user to run ordinary commands, or recommend multiple competing repair strategies. When an authorized mechanical path exists, the Agent SHALL perform it and rerun the named Gate. Only new semantics, risk/permission, external action, or `missing_contract` MAY form an escalation boundary.

#### Scenario: Fatigue does not erase the direct repair

- **WHEN** a Gate fails after the fatigue threshold
- **THEN** each primary root SHALL still expose its direct hint
- **AND** fatigue advice SHALL not become a substitute for `missing_fact`, `write_to`, or `rerun`

#### Scenario: Brittle heuristic is removed instead of patched again

- **WHEN** a gate rule produces repeated false positives and can only be kept by adding diagnostic-only mode, broad degradation exceptions, or special advice suppressions
- **THEN** the rule SHALL be removed from the phase-boundary gate unless it can be restated as a deterministic authority check
- **AND** the useful deterministic concern SHALL be moved to its proper schema, ledger, provenance, cache, trace, queue, or handoff check

#### Scenario: Cache drift does not bury the root cause

- **WHEN** a gate detects cache coverage drift that causes downstream output coverage symptoms
- **THEN** inspect SHALL identify cache coverage as the root cause
- **AND** downstream provenance symptoms SHALL be marked as symptoms or cascade details
- **AND** advice SHALL give one Engine-mediated repair target rather than separate manual edits for every symptom

### Requirement: Gate CLI exit-code behavior aligns with framework convention

Gate CLI wrappers SHALL align their documented exit-code behavior with the framework-wide CLI exit-code convention while preserving existing runtime semantics.

For gate CLIs, structured stdout `{ check, routing, inspect, advice }` SHALL be the primary Agent decision surface. Numeric exit code SHALL remain a coarse control-flow signal:

- `0` when the gate passes and no routing/config/invocation error overrides the result;
- `1` for normal gate failure, handoff preflight failure, status-window failure, or content/rule failure that the Agent can inspect and repair; and
- `2` for routing contract, configuration, binding, or invocation errors such as invalid input, config error, missing required flags, or caller misuse.

Gate CLIs SHALL NOT encode morale, fatigue, reassurance, or continuation encouragement in the numeric exit code. High-friction pass/fail guidance, repair strategy, final-delivery reassurance, and autonomous-continuation reminders SHALL be expressed through `advice[]`, diagnostic artifacts, or Agent-readable Markdown without changing the numeric code for the underlying condition.

Advice SHALL NOT tell the Agent to hand-edit runtime authority files such as `rb_status.json`, `rb_output_declarations.jsonl`, `_work_units/_index.json`, or hash-bound work-unit result surfaces.

#### Scenario: Gate caller reads stdout before deciding

- **WHEN** a gate CLI exits with any code
- **THEN** the Agent caller SHALL treat stdout JSON as the actionable contract
- **AND** it SHALL inspect `check.passed`, `check.next`, `routing.kind`, `inspect[]`, and `advice[]` before deciding the next action

#### Scenario: Handoff preflight failure remains normal repairable failure

- **WHEN** a lifecycle gate fails because a required entry witness is missing
- **THEN** the gate SHALL use the normal gate failure class and emit repair advice naming `enter-phase`
- **AND** it SHALL NOT use exit code to express frustration, reassurance, or encouragement

#### Scenario: High-friction pass keeps pass code

- **WHEN** a gate passes after many attempts and emits autonomous-continuation advice
- **THEN** the process exit code SHALL remain the normal pass code
- **AND** advice SHALL carry the continuation reminder that `check.next` must be consumed through the accepted handoff path

#### Scenario: Advice does not recommend manual authority edits

- **WHEN** a gate detects status drift, ledger drift, hash drift, or provenance mismatch
- **THEN** advice SHALL direct the Agent to valid Engine repair, retry, rollback, terminal/retry, or resubmit paths
- **AND** advice SHALL NOT instruct the Agent to edit authority files by hand

### Requirement: Gate definitions expose work-unit provenance check types

Gate definitions SHALL support the production check types `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`. Active production gate definitions SHALL NOT use unsupported delegated-provenance check names.

#### Scenario: unsupported delegated provenance check fails definition hygiene

- **WHEN** an active gate definition contains an unsupported delegated-provenance check name
- **THEN** gate definition validation SHALL fail
- **AND** the diagnostic SHALL require `work_unit_submission_presence`

### Requirement: Engine-derived gate attempt diagnostics

Engine-derived diagnostics SHALL include work-unit mismatch details for failed provenance checks, including `work_id`, `queue_item_id`, wave, kind, ledger ref, index ref, manifest ref, result ref, receipt ref, beacon ref, and hash mismatch details when available.

#### Scenario: diagnostic includes binding refs

- **WHEN** `work_unit_submission_presence` fails because a receipt nonce differs
- **THEN** the gate diagnostic SHALL identify the conflicting work-unit surfaces
- **AND** it SHALL not require non-work-unit delegated channel keys

### Requirement: Lifecycle gates and final readiness SHALL reject status-only or artifact-only downstream authorization

Lifecycle gate preflight, readiness checks, and final-entry validation SHALL require trace-bound lifecycle evidence rather than accepting filesystem artifacts, `rb_status.json` drift, `current_node`, or chat memory as phase completion or handoff authority. For covered non-bootstrap phases, the current gate's preflight SHALL prove that the legal predecessor source gate passed cleanly or degraded legally, that the Phase Agent consumed that exact `check.next` through a route-bound `load_complete`, and that the status window matches the accepted predecessor route.

If that evidence is missing, stale, superseded, failed, or unbound, the gate SHALL fail with root-cause diagnostics. It SHALL NOT pass because downstream artifacts exist, because a later phase directory contains files, because status names a later gate, or because final output has been drafted.

#### Scenario: Wave2 gate rejects artifact-only entry

- **WHEN** `check-gate-wave2-complete.mjs` is called for `phases/phase-wave2.md`
- **AND** Wave2 artifacts exist in the bundle
- **AND** trace lacks a legal Wave1 source-gate pass plus later route-bound `load_complete(entry="phases/phase-wave2.md")`
- **THEN** the Wave2 gate SHALL fail preflight
- **AND** inspect/advice SHALL name the missing Wave1-to-Wave2 handoff evidence before artifact-level symptoms

#### Scenario: HITL2 and readiness reject skipped Wave2 handoff

- **WHEN** HITL2 or readiness checks are invoked after status was manually edited past Wave2
- **AND** trace lacks the required Wave2 source-gate pass and route-bound entry sequence
- **THEN** the gate SHALL fail closed
- **AND** it SHALL NOT treat `rb_status.json`, `current_node`, or HITL/final files as proof that Wave2 completed

#### Scenario: final output files do not authorize final delivery

- **WHEN** files exist under `final/` or a final draft exists
- **AND** readiness has not produced a legal readiness-to-final handoff consumed through route-bound entry
- **THEN** final readiness or terminal transition checks SHALL reject final delivery authorization
- **AND** diagnostics SHALL direct the Agent back to the missing readiness/final handoff path

#### Scenario: failed predecessor gate blocks downstream gates

- **WHEN** the latest predecessor gate attempt failed or was superseded by a later failed attempt
- **AND** a downstream gate is invoked for the target phase
- **THEN** lifecycle preflight SHALL reject the downstream gate
- **AND** it SHALL NOT use older passed attempts, artifacts, or status drift to bypass the failure

#### Scenario: degraded predecessor handoff is accepted only when runtime truth is intact

- **WHEN** the predecessor gate has a legal degraded pass and route-bound load witness
- **AND** all runtime-truth blockers required by the degraded handoff contract are absent
- **THEN** the downstream gate preflight MAY proceed to normal gate-specific rules
- **AND** degraded quality context SHALL remain visible in diagnostics

#### Scenario: diagnostics prioritize root cause over cascade symptoms

- **WHEN** a downstream gate sees both missing handoff evidence and missing/partial downstream artifacts
- **THEN** the primary inspect/advice output SHALL identify the missing handoff as the root cause
- **AND** downstream artifact findings MAY appear as cascade details but SHALL NOT obscure the required Engine-mediated repair path

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

#### Scenario: every active rule has known implementation

- **WHEN** the static gate audit scans active gate definitions
- **THEN** every rule id SHALL map to a known CLI dispatch or shared helper
- **AND** the audit SHALL pass only when no unknown active check names remain

#### Scenario: unsupported check name fails audit

- **WHEN** an active gate definition contains `check: "removed_check_name"`
- **THEN** the audit SHALL fail
- **AND** diagnostics SHALL name the gate file, rule id, and check value

#### Scenario: artifact contract inventory is required

- **WHEN** an active gate rule id exists
- **THEN** the audit or companion test SHALL be able to identify its artifact contract category
- **AND** missing inventory SHALL fail with a diagnostic that asks for design/apply evidence or maintained mapping update

#### Scenario: closure inventory is required for blocking rules

- **WHEN** an active rule contributes to gate pass/fail
- **THEN** the audit or companion mapping SHALL identify producer instruction, runtime authority, checker implementation route, diagnostic/advice surface, pass/fail classification, and test guard
- **AND** missing closure inventory SHALL fail unless the row records an explicit non-Agent-produced exemption

#### Scenario: grouped design rows expand to rule-id inventory

- **WHEN** design evidence groups several active rule ids under one shared helper or artifact shape
- **THEN** apply evidence or maintained audit mapping SHALL still enumerate each active rule id
- **AND** the static audit SHALL fail if a rule id is missing producer/diagnostic/pass-fail inventory without an explicit non-Agent-produced exemption

#### Scenario: archives are not audited

- **WHEN** archived OpenSpec changes contain stale gate wording
- **THEN** this active gate audit SHALL ignore those archives
- **AND** it SHALL only validate current framework gate definitions and current helper/CLI implementation
