# Workflow Node Contract

> req: WNC-001, WNC-002, WNC-003, WNC-004, WNC-005, WNC-006, WNC-007, WNC-008, WNC-009, WNC-010, WNC-011

## Purpose

定义 Workflow Foundation 的 node metadata contract、phase manifest 和 14 个骨架文件的产出要求。使 Agent 能通过 frontmatter 和 manifest 识别当前 phase、gate、phase inventory 和 shared nodes，无需从散落 prose 或 chat memory 推断。
## Requirements
### Requirement: Phase node metadata contract

Phase node metadata SHALL describe lifecycle phase nodes, shared guidance, and work-unit sub-agent task guidance without using removed delegated mechanism names as production surfaces. `execution_contract` SHALL remain Agent-readable and validator-enforceable guidance, but deterministic authority SHALL come from queue state, submitted work-unit ledger rows, trace, and gate CLI verdicts.

`phase-hitl1.md` SHALL declare `execution_contract.search_policy: direct_retrieval_probe_only`. The workflow consistency validator SHALL recognize that value as the expected HITL1 policy. It SHALL authorize only the single bounded research-access search/fetch probe defined by the HITL1 phase contract; it SHALL NOT authorize research evidence collection, work-unit delegation, or a second lifecycle execution surface. Other lifecycle nodes SHALL retain their existing expected search policies.

#### Scenario: delegated metadata names work-unit guidance

- **WHEN** a phase node references delegated guidance
- **THEN** the metadata SHALL identify work-unit sub-agent task guidance and submitted coverage requirements

#### Scenario: HITL1 metadata matches its bounded probe behavior

- **WHEN** workflow consistency validation reads `phase-hitl1.md`
- **THEN** `direct_retrieval_probe_only` SHALL be accepted as the valid and expected HITL1 search policy
- **AND** `no_search` or a general research-search policy on HITL1 SHALL be reported as an execution-contract mismatch

### Requirement: Shared node metadata contract

所有 shared node SHALL 包含以下 frontmatter 字段：

| Field | Required | Meaning |
|-------|----------|---------|
| `node_type` | yes | `"shared"` |
| `id` | yes | Stable identifier（如 `shared-profile`） |
| `shared_scope` | yes | Shared node 服务的上下文范围（如 `profile`、`gate-summary`、`schema-summary`） |
| `authority` | yes | `"guidance-only"` 或 `"generated-summary"` |
| `requires` | yes | Mandatory shared Markdown dependency；无则为 `[]` |
| `suggested_context` | yes | Optional reference；无则为 `[]` |

Shared node SHALL NOT 声明 `phase`、`gate`、`next` 或 `stop` 字段。

#### Scenario: Shared node is not a hidden phase

- **WHEN** 一个 Markdown 文件位于 `shared/` 目录且 `node_type: shared`
- **THEN** 该文件 MUST NOT 含有 `phase`、`gate`、`next` 或 `stop` frontmatter 字段

#### Scenario: Shared node declares its authority boundary

- **WHEN** agent 加载 `shared-gate-rules.md`
- **THEN** frontmatter MUST 包含 `authority: generated-summary`，body MUST 说明 gate definition JSON 和 CLI output 才是 deterministic rule authority

### Requirement: Phase manifest structure

`DEEP_RESEARCH_HARNESS/workflows/manifest.json` SHALL 定义完整的 lifecycle inventory/index：

- `phases` 数组 MUST 包含 11 个元素，按 `instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → rerun → final` 顺序排列
- 每个 phase entry MUST 包含 `key`、`node`（相对 manifest 的路径）、`gate` 字段
- `node` value SHALL be the canonical fileRef used by transition lookup
- `next` 不是 manifest contract 的一部分；phase 顺序仅作为 Agent-readable inventory/index，由数组位置表示
- Runtime next-node lookup MUST come from gate CLI `check.next`, sourced from detailed transition router results
- `final` phase 的 `gate` MUST 为 `null`
- `shared` 数组 MUST 列出所有 shared node 的相对路径

#### Scenario: Manifest is the lifecycle inventory

- **WHEN** loader or Agent 需要识别已知 phase、展示 lifecycle order、或校验 phase metadata
- **THEN** it MUST read the `phases` array as the lifecycle inventory/index
- **AND** the ordered lifecycle inventory SHALL be instantiation, hitl1, setup, seed-topics, wave0, wave1, wave2, hitl2, readiness, rerun, final
- **AND** it MUST NOT infer runtime next-node transition from the `phases` array, node frontmatter, or a manifest `next` field

#### Scenario: Transition table owns next-node lookup

- **WHEN** gate `wave0-complete` passes and the gate response contains `check.next`
- **THEN** that next node reference MUST come from detailed transition router results
- **AND** Markdown/Agent MAY load the returned node reference after reading the gate feedback

#### Scenario: Final phase is terminal

- **WHEN** loader 读取 `final` phase entry
- **THEN** `gate` MUST 为 `null`
- **AND** `final` MUST 是当前 delivery pass 的 terminal phase

### Requirement: Phase node body structure

每个 phase node body SHALL 包含以下 section（骨架阶段内容为最小 placeholder）：

1. Stage goal
2. Required inputs（来自哪些 bundle state 或文件）
3. Allowed Agent actions
4. Expected runtime artifacts
5. Gate command（要运行的 gate CLI 命令）
6. On gate pass
7. On gate fail
8. Stop behavior
9. Anti-cheating rules

Body SHALL NOT 重复整个 lifecycle 或在 prose 里复制 gate rules。Gate details 可为 Agent 可读性做摘要，但 SHALL 说明 deterministic rule authority 在 Gate definition JSON 和 CLI output。

#### Scenario: Agent loads a phase node

- **WHEN** agent 加载 `phase-wave0.md`
- **THEN** body MUST 包含全部 9 个 section title，内容可为 placeholder

### Requirement: Final node terminal semantics

`phase-final.md` SHALL declare `gate: null`, `stop: "yes"`, and no `next`
frontmatter field. It SHALL remain the terminal node for the current lifecycle
delivery pass and SHALL NOT own an outgoing Gate, normal next phase, transition-
table edge, or status transition.

Final's `stop: "yes"` SHALL be a Final-specific interaction placement, not the
generic HITL meaning “wait before executing the loaded node.” Whenever the
current legal Final lineage has no report bound to it, the Agent SHALL execute
Final and publish before waiting: `final/final.md` after entry admitted the
bundle's empty first inventory, or global `latest + 1` after a later audited
rerun whose new Final load admitted the exact event-bound prior inventory. The
existing Readiness status synchronization SHALL precede either publication.
After that commit the same loaded node SHALL invite and wait for feedback, publish immutable
revisions for presentation-only requests, and wait again. This in-place
interaction SHALL not be represented as a self-transition, hidden loop edge,
Gate retry, or third HITL decision checkpoint.

Feedback that expands the verified research boundary SHALL use the accepted
post-final rerun operation and its legal handoff. Presentation-only feedback
SHALL remain inside Final and SHALL not be routed through HITL2 or post-final
rerun.

#### Scenario: Final node is terminal

- **WHEN** the loader reads `phase-final.md` metadata or the Final manifest entry
- **THEN** `gate` SHALL be `null`, `stop` SHALL be `"yes"`, and `next` SHALL be absent
- **AND** the transition table SHALL have no Final source edge

#### Scenario: Current Final delivery executes before waiting

- **WHEN** Final is legally loaded, its Readiness status synchronization is complete, and direct lineage/inventory facts show no report bound to the current Final lineage
- **THEN** `stop: "yes"` SHALL direct the Agent to publish and present the current-lineage report
- **AND** it SHALL not wait for another user decision before that publication

#### Scenario: Committed Final remains on the same node

- **WHEN** the first or a revised primary report commits
- **THEN** the current lifecycle coordinate SHALL remain `phases/phase-final.md`
- **AND** the Agent MAY await bounded presentation feedback without a transition or Gate

### Requirement: Skeleton completeness criteria

骨架阶段不要求 body 有完整内容。每个 skeleton file SHALL 满足：

- Frontmatter 可被正则提取并 JSON.parse
- Agent 能从 frontmatter 确定 `node_type`、`id`、gate/stop（phase 适用）或 shared_scope/authority（shared 适用）
- CLI skeleton 可被 `node` 执行且返回合法 JSON
- Gate definition JSON 可被 `JSON.parse` 且包含 `gate`、`description`、`rules` 字段

#### Scenario: Skeleton is parseable not functional

- **WHEN** `check-gate-wave0-complete.mjs` 被 `node` 执行且 `--bundle` 参数提供
- **THEN** 脚本 MUST 返回合法 JSON，MUST NOT 因 `import` 错误或语法错误而崩溃

#### Scenario: Skeleton phase node is loadable

- **WHEN** loader 打开 `phase-wave0.md`
- **THEN** frontmatter MUST 可解析为合法 key-value pairs，`node_type` MUST 为 `phase`

### Requirement: Workflow package consistency validation

Workflow package consistency validation SHALL check manifest membership, frontmatter, gate definitions, transition tables, loader cache, dependency plans, and work-unit sub-agent guidance references. Validation SHALL reject delegated guidance that claims production authority without work-unit task, submit, and gate coverage contracts.

#### Scenario: delegated guidance is validated through work-unit contracts

- **WHEN** workflow validation sees delegated guidance
- **THEN** it SHALL require work-unit-compatible metadata and dependency wiring

### Requirement: Lifecycle contract header injection follows node interaction semantics

Contract-header injection SHALL apply only to manifest lifecycle phases.
Work-unit task guidance and other non-lifecycle task surfaces SHALL NOT receive
lifecycle autonomous or terminal-delivery headers merely because their
frontmatter resembles a phase node.

For non-terminal lifecycle `stop: "no"` phases, the injected autonomous header
SHALL preserve silent execution:

- the Agent/framework SHALL NOT initiate questions, confirmations, progress,
  partial delivery, acknowledgements, idle reports, or continuation requests;
- the Agent SHALL continue node work, repair, strategy change, legal handoff
  consumption, or silent holding from direct runtime facts;
- an already-current user-initiated message SHALL be answered without creating
  a third HITL, permission, mutation/reentry authority, pause, or durable intent;
  and
- Engine header injection SHALL NOT inspect or classify chat state.

Terminal Final SHALL receive its separate terminal-delivery header even though
its frontmatter uses `stop: "yes"`. The loader SHALL recognize the manifest
Final plus `gate: null` combination before applying generic stop placement. It
SHALL preserve the existing loaded-node continuation cue
`interaction: terminal_delivery` and `next_action: deliver_final_artifacts` for
compatibility; the cue means execute the inventory-aware Final delivery
contract, not always create an unversioned report.

The terminal header SHALL require this order:

- when Final entry admitted an empty canonical primary inventory, publish and
  present the bundle base after the exact Readiness status synchronization and
  before any question or wait;
- when a newer route-bound Final load admitted its retired C5 prior inventory and
  the Readiness status window is synchronized with zero proven append, publish
  and present global `latest + 1` before any question or wait;
- when a primary report is bound to the current lineage, present or reground in
  the latest version and handle the current bounded feedback inside Final;
- after each committed report, invite concise natural-language feedback and
  wait without a Gate, status transition, or HITL2 mapping; and
- route only evidence-expanding feedback through the accepted audited rerun
  operation.

Header injection and continuation cues SHALL remain Agent-facing guidance
projections. They SHALL not establish publication, satisfaction, lifecycle,
interaction transport, routing, or permission facts.

#### Scenario: work-unit sub-agent guidance does not receive lifecycle header

- **WHEN** `assessNode()` loads work-unit sub-agent task guidance
- **THEN** it SHALL NOT inject a lifecycle header unless the file is a manifest lifecycle phase

#### Scenario: autonomous header prohibits initiation rather than every reply

- **WHEN** `assessNode()` loads a non-terminal manifest lifecycle phase with `stop: "no"`
- **THEN** the injected header SHALL prohibit framework-initiated surfacing and direct autonomous continuation
- **AND** it SHALL permit an answer to an already received user turn without changing lifecycle authority

#### Scenario: Final keeps terminal delivery header

- **WHEN** `assessNode()` loads manifest Final with `stop: "yes"` and `gate: null`
- **THEN** it SHALL inject the Final terminal-delivery/refinement header rather than a generic HITL wait header
- **AND** the loaded-node cue SHALL retain `terminal_delivery` / `deliver_final_artifacts`
- **AND** the header SHALL require current-lineage delivery before feedback when the bundle base or a post-rerun append is still pending

#### Scenario: Current-lineage Final inventory resumes refinement

- **WHEN** Final is loaded or reloaded with a canonical primary report proven for the current legal Final lineage
- **THEN** the header SHALL direct the Agent to the latest report and bounded feedback interaction
- **AND** it SHALL not claim a new phase entry, Gate, status transition, or automatic report publication

### Requirement: Universal silent execution dependency for lifecycle stop:no phases

Every manifest lifecycle phase node with `stop: "no"` in its frontmatter SHALL include `shared/shared-silent-execution` in its `requires` array. Work-unit sub-agent task guidance and other phase-like files outside manifest lifecycle membership are outside this requirement.

#### Scenario: sub-agent task guidance is outside lifecycle dependency rule

- **WHEN** dependency closure evaluates a work-unit sub-agent task guidance file
- **THEN** it SHALL NOT treat that file as a manifest lifecycle phase

### Requirement: Sub-agent role specs SHALL mandate standard library output serialization

Sub-agent role specs SHALL require that all structured output files written by the sub-agent be produced through standard library serialization: `yaml.stringify()` for YAML outputs and `JSON.stringify()` for JSON outputs. Hand-concatenated format strings (template literals, string interpolation, shell heredocs) SHALL NOT be described as an acceptable method.

Standard library serialization prevents parse failures from unescaped special characters — the `yaml` package's `stringify()` automatically selects the correct scalar style for each value. This is the write-side prevention for BUG-018.

> **Read-side complement:** `gate-skeleton` GSK-002 adds deterministic YAML/JSON repair in gate helpers for legacy data and edge cases. Together they form the BUG-018 double defense.

#### Scenario: YAML output uses yaml.stringify

- **WHEN** a sub-agent role spec instructs the sub-agent to write `source.yaml`
- **THEN** the spec SHALL mandate constructing a JS array and calling `yaml.stringify(data)` to produce file content
- **AND** the spec SHALL explicitly warn against hand-concatenating YAML strings

### Requirement: Header injection uses manifest membership and execution_contract surface

Header injection SHALL use manifest lifecycle membership as authority. `execution_contract.surface` SHALL reinforce that lifecycle phase surfaces and work-unit sub-agent task guidance surfaces are different execution surfaces.

#### Scenario: work-unit guidance surface does not receive lifecycle header

- **WHEN** `assessNode()` loads a guidance file with a work-unit sub-agent task surface
- **THEN** lifecycle header injection SHALL be skipped unless manifest lifecycle membership also applies

### Requirement: Lifecycle phase handoff consumes check.next through enter-phase (WNC-010)

Lifecycle phase nodes with deterministic gate pass routing SHALL instruct the Agent to consume gate CLI `check.next` through `enter-phase.mjs`.

The On Gate Pass section SHALL require this sequence:

1. read the gate CLI JSON output;
2. verify `check.passed === true`;
3. read `check.next`;
4. call `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>` and capture the rendered Markdown as the next Agent control surface;
5. before executing any work from that rendered next phase, call `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to <this phase's gate enum>` to synchronize the just-passed source gate after the target node load witness exists;
6. continue from the Markdown captured in step 4.

The phase body SHALL NOT frame `advance-status` as the action that enters the next phase. `advance-status` is status synchronization and SHALL NOT substitute for `enter-phase`. `enter-phase` itself SHALL also be framed as a deterministic loader/check, not as a JS lifecycle walker or executor of the next phase.

The source gate enum SHALL be the gate that just passed, not the next phase's gate. For example, wave0 gate pass SHALL synchronize with `--to wave0_complete` after `enter-phase --node phases/phase-wave1.md`; it SHALL NOT use `--to wave1_complete` until the wave1 gate itself has passed.

This requirement applies to lifecycle phases whose deterministic outcome has a next lifecycle node, including instantiation→HITL1, HITL1→setup, setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, HITL2→rerun, readiness→final, and rerun→seed-topics. HITL2 indeterminate decisions remain governed by their existing decision logic; when the current runtime emits a deterministic HITL2 branch, its selected fileRef SHALL still be consumed through `enter-phase`.

The instantiation/HITL1 bootstrap status shape is a compatibility exception that SHALL NOT be widened by phase wording. The exception covers only the `advance-status` source-gate synchronization step of the handoff sequence for the instantiation→HITL1 and HITL1→setup transitions: `phase-instantiation.md` and `phase-hitl1.md` SHALL NOT instruct `advance-status` source-gate sync as part of those handoffs, because the bootstrap status shape (`current_gate: setup_ready`, `state: not_started`, `current_node: null`) is established by the bundle creator rather than by a passed gate. The exception does NOT exempt `enter-phase` node loading: `phase-instantiation.md` §6 SHALL instruct `enter-phase --node phases/phase-hitl1.md` (the instantiation gate `check.next`) after gate pass so `rb_status.json#/current_node` is populated before HITL1 `operate-topic-state apply --context hitl1` authorization; `phase-hitl1.md` §6 SHALL likewise instruct loading `phase-setup.md` through `enter-phase` on `hitl1-recorded` gate pass. Phase wording SHALL NOT claim that the bootstrap exception skips `enter-phase`, SHALL NOT frame the bootstrap `advance-status --to setup_ready` (the `hitl1_to_setup` compatibility window, run before the setup gate) as part of the instantiation/HITL1 handoff, and SHALL NOT silently rewrite this exception boundary.

The phase wording SHALL give concrete source-gate `advance-status` commands so the Agent does not infer them at runtime:

| Passed phase | Target from `check.next` | Source-gate status sync |
| --- | --- | --- |
| setup | `phases/phase-seed-topics.md` | `advance-status --to setup_ready` |
| seed-topics | `phases/phase-wave0.md` | `advance-status --to seed_topics_ready` |
| wave0 | `phases/phase-wave1.md` | `advance-status --to wave0_complete` |
| wave1 | `phases/phase-wave2.md` | `advance-status --to wave1_complete` |
| wave2 | `phases/phase-hitl2.md` | `advance-status --to wave2_complete` |
| HITL2 proceed branch | `phases/phase-readiness.md` | `advance-status --to hitl2_recorded` |
| HITL2 rerun branch | `phases/phase-rerun.md` | `advance-status --to hitl2_recorded` |
| readiness | `phases/phase-final.md` | `advance-status --to readiness_passed` |
| rerun | `phases/phase-seed-topics.md` | `advance-status --to rerun_ready` |

The target phase's `## 0. Execution Brief` SHALL be a bounded action core for
entry presentation. It SHALL keep the already accepted order visible to an
Agent at the transition decision point: consume `check.next` through
`enter-phase`; synchronize the just-passed source gate through the exact
`advance-status --to <source_gate_enum>` command; then execute the loaded
target node. Shared dependency prose remains reference material rather than a
precondition for seeing that sequence. The action core is an Agent-facing
projection and SHALL not replace the loaded node, `load_complete`, status, or
gate authority.

Before `enter-phase` may write its route-bound `load_complete`, it SHALL
preflight that target action-core structure as framework configuration. A
missing or ambiguous `## 0. Execution Brief` through-next-H2 boundary is a
direct configuration result, not an entry witness: it SHALL leave both
`load_complete` and `rb_status.json#/current_node` unchanged and SHALL not
infer replacement Markdown or another target node. This preflight reads only
the selected framework target source; it SHALL not invoke the workflow loader,
resolve the dependency closure, or emit a workflow/trace/receipt event.

#### Scenario: Wave phase gate pass uses enter-phase

- **WHEN** a wave phase node describes its Gate Pass behavior
- **THEN** it SHALL instruct the Agent to run `enter-phase --bundle <path> --node <check.next>`
- **AND** it SHALL instruct the Agent to run `advance-status --bundle <path> --to <this phase's gate enum>` only after `enter-phase`
- **AND** it SHALL tell the Agent to continue from the captured rendered next node content as the Phase Agent's next Markdown control surface after source-gate status synchronization

#### Scenario: Advance status is not described as phase entry

- **WHEN** a lifecycle phase node mentions `advance-status`
- **THEN** the phase body SHALL NOT describe it as loading, entering, or executing the next phase
- **AND** the phase body SHALL preserve `enter-phase` as the handoff consumption action
- **AND** the phase body SHALL NOT use the next phase's gate enum as the `--to` value for the just-passed source phase

#### Scenario: Instantiation/HITL1 bootstrap exception does not exempt enter-phase loading

- **WHEN** the instantiation gate passes on a fresh bundle whose `check.next` is `phases/phase-hitl1.md`
- **THEN** `phase-instantiation.md` §6 SHALL instruct `enter-phase --bundle <path> --node phases/phase-hitl1.md`
- **AND** it SHALL NOT instruct `advance-status` source-gate sync for the instantiation→HITL1 handoff (bootstrap status shape exception)
- **AND** it SHALL NOT claim that the bootstrap exception skips `enter-phase`

#### Scenario: HITL1 handoff loads setup without source-gate sync

- **WHEN** the `hitl1-recorded` gate passes and `check.next` is `phases/phase-setup.md`
- **THEN** `phase-hitl1.md` §6 SHALL instruct `enter-phase --bundle <path> --node phases/phase-setup.md`
- **AND** it SHALL NOT instruct `advance-status` as part of the HITL1→setup handoff
- **AND** the setup phase's own bootstrap `advance-status --to setup_ready` (the `hitl1_to_setup` compatibility window, run before the setup gate) SHALL remain the legal pre-gate status sync described by `phase-setup.md`

#### Scenario: Final delivery still happens only at final

- **WHEN** readiness gate pass points to `phase-final.md`
- **THEN** readiness SHALL instruct the Agent to consume that node through `enter-phase`
- **AND** final report delivery SHALL remain governed by the Final node after final artifacts are written

#### Scenario: Wave1 and Wave2 handoffs use source-gate synchronization

- **WHEN** wave1 or wave2 phase nodes describe their Gate Pass behavior
- **THEN** wave1 SHALL instruct `enter-phase --node phases/phase-wave2.md` followed by `advance-status --to wave1_complete`
- **AND** wave2 SHALL instruct `enter-phase --node phases/phase-hitl2.md` followed by `advance-status --to wave2_complete`
- **AND** neither phase SHALL instruct the Agent to synchronize to the next phase's gate before that next phase passes

#### Scenario: Rerun handoff preserves alternate predecessor semantics

- **WHEN** rerun gate pass points to `phases/phase-seed-topics.md`
- **THEN** rerun SHALL instruct the Agent to consume seed-topics through `enter-phase`
- **AND** rerun SHALL synchronize source status with `advance-status --to rerun_ready`
- **AND** seed-topics SHALL treat rerun as a legal predecessor when the runtime trace proves that branch

#### Scenario: HITL2 deterministic branches consume the selected target

- **WHEN** HITL2 proceeds to readiness
- **THEN** HITL2 SHALL consume `phases/phase-readiness.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **WHEN** HITL2 selects the deterministic rerun branch
- **THEN** HITL2 SHALL consume `phases/phase-rerun.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **AND** neither branch SHALL let `advance-status` choose the target in place of the selected `check.next`

#### Scenario: Action core keeps the handoff sequence visible

- **WHEN** a lifecycle node is entered from a passed source gate
- **THEN** its bounded entry action core SHALL make the source-gate status-sync
  command visible before target-phase work begins
- **AND** shared dependency reference content SHALL not obscure or replace the
  accepted `enter-phase` -> `advance-status` -> execute ordering

### Requirement: Lifecycle node wording uses canonical phase-boundary terms

Lifecycle phase nodes and shared workflow Markdown SHALL use the canonical phase-boundary terminology when describing gate pass behavior.

On a deterministic gate pass, lifecycle wording SHALL preserve this order and meaning:

1. the gate CLI passes the current phase and emits structured stdout with `check.next`;
2. the Phase Agent consumes `check.next` through `enter-phase` or another accepted loader/check path;
3. the loader writes a route-bound `load_complete` entry witness for the target Markdown control surface;
4. `advance-status --to <source_gate_enum>` synchronizes the just-passed source gate in `rb_status.json`; and
5. the target phase's work remains unproven until the target phase performs its own work and passes its own gate.

Lifecycle Markdown SHALL NOT describe `advance-status` as entering/loading/executing the next phase, SHALL NOT describe `enter-phase` or `load_complete` as target work completion, and SHALL NOT call local artifact creation or queue drain a phase boundary unless the current gate has passed and emitted the accepted `check.next`.

The compact entry action core, continuation cue, and shared-file manifest SHALL
use this same vocabulary. The default manifest is the successful load plan's
ordered dependency refs with the target node excluded; it is a ref list, not
concatenated Markdown. `--full` retains the complete loaded closure as an
explicit additional view. They are presentation of an already witnessed
handoff, not an additional transition, status writer, scheduler, or proof that
the target phase's work is complete.

#### Scenario: On Gate Pass wording preserves boundary order

- **WHEN** a lifecycle phase node documents deterministic Gate Pass behavior
- **THEN** it SHALL tell the Agent to read gate stdout, consume `check.next` through `enter-phase`, synchronize source status with `advance-status`, and continue from the rendered next node
- **AND** the wording SHALL distinguish source-gate status synchronization from target-phase work completion

#### Scenario: Static validation catches overclaiming

- **WHEN** a lifecycle node or shared workflow Markdown says that `advance-status` enters the next phase or that `enter-phase` completes the target phase
- **THEN** the docs validator or regression SHALL fail
- **AND** the failure SHALL identify the file and boundary term that overclaims

#### Scenario: Compact entry language does not overclaim completion

- **WHEN** an action core or entry cue names the loaded target phase
- **THEN** it SHALL distinguish entry and source-gate synchronization from that
  target's later work and Gate result
- **AND** it SHALL not introduce a new phase-boundary term or execution owner

### Requirement: Self-documenting lifecycle and work-unit sub-agent guidance nodes

Every work-unit sub-agent guidance file SHALL contain a concise role or task brief immediately after the H1. The brief SHALL orient the sub-agent to assigned work-unit identity, inputs, outputs, boundary, and return contract. Orientation text SHALL NOT replace schemas, queue state, submitted output declarations, trace, transition routing, or gate CLI verdicts as deterministic authority.

#### Scenario: work-unit sub-agent guidance has task brief

- **WHEN** a sub-agent receives work-unit guidance
- **THEN** the guidance SHALL state assigned identity, boundary, expected outputs, and return contract
