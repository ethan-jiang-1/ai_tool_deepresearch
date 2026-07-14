# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。
## Requirements
### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, submit results by `work_id`, and run the gate after phase drain.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml` without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim` and `operate-work-unit submit`

#### Scenario: Rerun added topic enters normal Wave0 work-unit path

- **WHEN** a sanctioned rerun adds a topic that has no Wave0 queue, in-flight or submitted coverage
- **THEN** the Wave0 phase doc SHALL instruct the Agent to enqueue one standard delegated source-intake demand for that topic
- **AND** the Agent SHALL perform role-bound probe, `operate-work-unit claim`, real actor execution and `operate-work-unit submit` before gate evaluation

#### Scenario: Rerun keeps valid historical topic coverage

- **WHEN** a current topic resolves to valid historical submitted Wave0 coverage and has no supplement direction
- **THEN** Wave0 rerun guidance SHALL retain that coverage without creating duplicate demand
- **AND** the Wave0 gate SHALL remain the unchanged deterministic verdict owner

#### Scenario: Delegated no-claim feedback stays at one checkpoint

- **WHEN** a delegated Wave0 demand is at the active queue front but actor observation is missing or the non-delegated queue claim command is used
- **THEN** phase guidance SHALL tell the Agent to read the returned root cause
- **AND** the only nearest repair SHALL be to perform the required role probe and rerun `operate-work-unit claim`

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL keep topic deepening in the normal `wave1_topic_deepening` work-unit path and SHALL load `shared/shared-reference-template` through its actual `requires` chain before the Phase Agent materializes consumer references. Merely mentioning the template filename in prose or asking the Agent to discover it indirectly SHALL NOT satisfy this producer contract.

After successful submit, the Phase Agent SHALL write `depth-review.yaml` from facts that are not already owned by submitted authority. The blocking review shape SHALL contain `version`, canonical topic binding, `reviewed_work_unit_refs[]`, depth-dimension judgments, profile-check judgments, `decision`, and `supplementary_queue_item_ids[]`. It SHALL NOT require the Agent to copy submitted `source_claims[]`, accepted URLs, cache refs, Wave0 URL arrays, new-source URL arrays, or derived floors into a second blocking authority. The Engine SHALL derive those facts from the reviewed submitted rows, Wave0 source authority, and profile.

At each affected inspect/gate/submit failure, phase guidance SHALL consume the Engine-provided direct repair coordinates: `repair_kind`, `missing_fact`, `write_to`, and `rerun`. When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already authorized mutable surface or legal operation, and no new semantic/risk decision is needed, the Agent SHALL perform the mechanical repair and rerun the named checkpoint without asking the user to execute ordinary commands. `user_decision|external_action|missing_contract` SHALL surface only the smallest boundary. Guidance SHALL NOT infer repair kind from a path or invite hand-written ledger, receipt, trace, hash, or provenance repair.

#### Scenario: Wave1 loads the shared reference template

- **WHEN** `phase-wave1` is entered for normal or rerun-added topics
- **THEN** its loaded required context SHALL include `shared/shared-reference-template`
- **AND** the Phase Agent SHALL materialize references from that loaded contract after successful submit

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent reviews submitted Wave1 work units
- **THEN** `depth-review.yaml` SHALL identify the reviewed work-unit refs and record non-derivable depth/profile/decision judgments
- **AND** it SHALL NOT be required to reproduce submitted source/cache arrays or profile-derived numeric facts

#### Scenario: Agent performs authorized same-check repair

- **WHEN** an affected checkpoint returns `repair_kind: agent_action|engine_operation`, `missing_fact`, the corresponding authorized `write_to` coordinate, and `rerun`
- **THEN** the Phase Agent SHALL perform that action and rerun the named checkpoint
- **AND** it SHALL escalate only for `user_decision`, `external_action`, or `missing_contract`

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 deepening is delegated
- **THEN** the phase doc SHALL identify `wave1_topic_deepening` work units

#### Scenario: Wave1 requires depth review before topic completion

- **WHEN** a Wave1 work unit submits `evidence-summary.md` and `question-list.md`
- **THEN** the Phase Agent SHALL produce `artifacts/wave1/{topic}/depth-review.yaml`
- **AND** the topic SHALL NOT be considered complete until the depth review records `decision: accept`
- **AND** `supplement_required` or `blocked_contract` SHALL keep the topic incomplete for normal Wave1 pass

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** Wave1 depth review finds too few genuinely new source URLs, missing depth dimensions, or unmet profile-required checks
- **THEN** the phase doc SHALL instruct the Agent to enqueue a supplementary `wave1_topic_deepening` queue item with explicit `payload.topic_slug`
- **AND** the Agent SHALL drain that supplementary item through `operate-work-unit claim` and `operate-work-unit submit`

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

Pure synthesis SHALL be conditional. Before writing or completing pure synthesis, the Phase Agent SHALL complete cross-topic scan matrix construction, finding confidence triage, gap analysis, and emergent-search decisions in `cross-topic-ledger.md` and `finding-index.yaml`. The phase body SHALL make clear that synthesis prose is the projection after scan/triage/gap analysis, not a substitute for that work.

When scan/triage identifies an unresolved evidence gap that requires new external evidence, the phase doc SHALL route that gap into `wave2_targeted_evidence` queue demand and work-unit submit before the finding can count as resolved by new evidence. If the gap cannot be resolved inside the phase budget, the Agent SHALL explicitly defer it to HITL2 or final limitations through ledger/index fields rather than silently omitting it.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

#### Scenario: Pure synthesis waits for scan and triage

- **WHEN** the Phase Agent is about to complete `wave2-synthesis`
- **THEN** `cross-topic-ledger.md` SHALL contain scan matrix, confidence triage, gap analysis, and search-decision content
- **AND** `finding-index.yaml` SHALL show that no unresolved search-required finding remains without submitted targeted evidence or explicit deferral

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL forbid fake completion claims while allowing topic-specific deepening only when delegated evidence-producing outputs are covered by submitted work-unit ledger rows and pass the Wave1 gate. The boundary is no longer "do not claim deepening"; it is "do not claim deepening without work-unit-backed evidence, declared references, cache trail handling, and gate pass."

#### Scenario: deepening claim requires submitted work-unit coverage

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding evidence outputs lack submitted work-unit ledger coverage
- **THEN** `wave1-complete` SHALL fail provenance checks or emit delegated bypass diagnostics

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Phase Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 prior-wave 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md`、`../../artifacts/wave0/<topic>/source.yaml`）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 wave0 thin YAML under `artifacts/wave0/{topic}/source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Phase Agent writes synthesis.md
- **THEN** synthesis MAY contain links to both `../../artifacts/wave0/<topic>/source.yaml` and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

### Requirement: Anti-cheating rules in wave phase bodies

Wave phase bodies SHALL forbid claims of delegated evidence, search, or reference production unless the claimed outputs are covered by submitted work-unit ledger rows and pass the relevant gate checks. Anti-cheating examples SHALL point to work-unit submit, output declarations, cache trail validation, and gate verdicts as the corrective path.

#### Scenario: delegated evidence claim requires work-unit coverage

- **WHEN** a phase artifact claims delegated evidence production
- **AND** no submitted work-unit ledger row covers the evidence
- **THEN** the phase or gate guidance SHALL treat the claim as invalid

### Requirement: Wave2 rerun full re-synthesis on topic addition

The `phase-wave2.md` Rerun-Aware Behavior section SHALL include a scenario table distinguishing `action: add` (full re-synthesis) and `action: supplement` (delta/append).

`action: add` behavior SHALL align with wave0 (`phase-wave0.md` L266) and wave1 (`phase-wave1.md` L404) `action: add` semantics: full execution, same as first run.

When `action: add`:
- Phase Agent SHALL re-read evidence-summary.md for all topics (including the new topic)
- Phase Agent SHALL rebuild the cross-topic scan matrix covering all topic pairs
- Phase Agent SHALL generate synthesis.md, cross-topic-ledger.md, finding-index.yaml from scratch
- Old synthesis may be preserved as backup (`*.prev-rerun-N.md`) but SHALL NOT serve as baseline

When `action: supplement`, maintain current delta/append behavior (`phase-wave2.md` L351-376 existing text).

The wave2-complete gate SHALL include a rerun add coverage check: when any seed topic declares `action: add`, `synthesis.md` SHALL NOT use `## Delta Synthesis` as the main processing path, and `cross-topic-ledger.md` or `finding-index.yaml` SHALL cover all topic slugs from `rb_plan.md` topic_registry.

For `action:add`, slug-name coverage alone SHALL NOT be sufficient when the added topic can be identified. The gate SHALL also verify that the added topic participates in cross-topic scan coverage with every pre-existing topic, either through explicit topic-pair rows in `cross-topic-ledger.md` or equivalent structured entries in `finding-index.yaml`.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** a seed topic file contains `action: add` (new topic)
- **THEN** Phase Agent SHALL perform full re-synthesis, not append a delta section
- **AND** synthesis.md SHALL NOT contain `## Delta Synthesis (Rerun N)` header
- **AND** gate SHALL fail if scan/index coverage omits any topic slug
- **AND** gate SHALL fail if the added topic has no scan coverage with any pre-existing topic

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** a seed topic file contains `action: add`
- **AND** `finding-index.yaml` lists all topic slugs but no topic-pair or scan evidence involving the added topic
- **THEN** wave2 gate SHALL fail with inspect/advice requesting full cross-topic scan coverage

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** a seed topic file contains `action: supplement`
- **THEN** Phase Agent SHALL retain existing synthesis as baseline
- **AND** new analysis SHALL be appended with `## Delta Synthesis (Rerun N)` header

### Requirement: Rerun action:add SHALL include full cache trail

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun SHALL classify current demand but SHALL NOT own a separate execution path: an existing topic with valid historical coverage SHALL reuse that coverage, a new topic without coverage SHALL enter the normal Wave0/Wave1 topic pipeline, and supplement intent SHALL create the normal supplementary demand. After classification, the same queue/work-unit/submit/reference-materialization/gate contracts used by first-run execution SHALL apply. No rerun-only gate exception, provenance path, reference namespace, or lifecycle state SHALL be introduced.

For Wave0, “与首次运行一致” SHALL include creation of delegated queue demand, current role-bound actor preflight, Engine-owned work-unit allocation, real result/receipt/output/cache production, and formal submit into the submitted ledger. Direct Phase-Agent search followed by a filesystem-only `source.yaml`, hand-written result/receipt, or hand-written ledger row SHALL NOT satisfy the rerun `action:add` path.

When the accepted actor branch is `phase_agent_fallback`, the Wave0 phase SHALL instruct the Phase Agent to execute the assigned work inside the generated envelope, use the generated exact-binding result starter, run `operate-work-unit dry-submit`, repair the same assigned candidate until preflight passes, and then run formal submit. The phase SHALL NOT describe post-hoc result/receipt construction as a way to grant provenance to work performed outside the claimed envelope.

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Rerun adds a topic with full cache trail
- **WHEN** HITL2 rerun 触发 `action: add` 新增 topic 06
- **AND** Wave1 deepening Sub-agent 为 topic 06 搜索 3 个 source
- **THEN** `_cache/wave1/primary/06_topic-slug/` 目录 SHALL 含 3 个 source 子目录
- **AND** 每个 source 子目录 SHALL 含 `websearch.json`/`page.md`/`meta.json`

#### Scenario: Rerun classification returns new topic to normal execution

- **WHEN** a sanctioned rerun adds a topic with no historical Wave0 or Wave1 coverage
- **THEN** the phase docs SHALL route it through the same normal delegated demand, actor execution, submit, reference materialization and gate sequence as an initial topic
- **AND** existing covered topics SHALL remain classified as reuse rather than being redundantly rerun

#### Scenario: Rerun action:supplement respects existing cache
- **WHEN** HITL2 rerun 触发 `action: supplement` 补充已有 topic
- **AND** 该 topic 已有 cache 目录
- **THEN** 补充的 source SHALL 追加到已有 cache 目录（不覆盖）
- **AND** 文件名 SHALL 不与已有 source 冲突（继续递增 NN）

#### Scenario: Rerun added topic cannot bypass provenance with direct artifact

- **WHEN** a rerun-added topic has a Wave0 `source.yaml` but no valid submitted work-unit coverage
- **THEN** the phase SHALL treat the topic as incomplete and route new real work through delegated demand plus work-unit submit
- **AND** it SHALL NOT request a rerun-specific gate exception or count the orphan artifact as historical coverage

#### Scenario: Phase Agent fallback uses generated starter and dry-submit

- **WHEN** a rerun-added topic receives an accepted `phase_agent_fallback` work unit
- **THEN** the Phase Agent SHALL use the generated task/beacon/result starter rather than inventing binding fields
- **AND** it SHALL run side-effect-free dry-submit and repair the same candidate before formal submit
- **AND** only formal submit SHALL create ledger coverage

### Requirement: Wave phases SHALL teach the work-unit drain loop

Wave0, Wave1, and Wave2 phase Markdown SHALL teach the delegated-work loop as queue demand claim, work-unit execution, submit, ledger append, and gate aggregation. Phase docs SHALL say that multiple work units may be claimed and submitted before the gate runs.

#### Scenario: phase doc explains aggregate gate

- **WHEN** a Phase Agent reads a wave phase doc
- **THEN** it SHALL see that the wave gate runs after queue demand and in-flight work units are drained

### Requirement: Gate failure SHALL refill through work units

Wave phase docs SHALL state that gate failure creates repair/refill queue demand that re-enters the same work-unit loop. Gate failure SHALL NOT introduce another delegated mechanism.

#### Scenario: gate repair returns to claim loop

- **WHEN** a wave gate reports missing delegated coverage
- **THEN** the phase instructions SHALL route repair through queue refill and new work-unit claim

### Requirement: Work-unit role guidance SHALL be Phase-Agent-loaded guidance

Role guidance SHALL be work-unit sub-agent task guidance. Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol.

#### Scenario: role guidance uses work-unit protocol

- **WHEN** delegated task guidance is loaded
- **THEN** it SHALL describe work-unit task/result/receipt expectations

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a continuous Phase Agent loop: fill queue demand, reconstruct current in-flight work from bundle truth, claim eligible independent work units as bounded top-up batches where applicable, spawn bounded Sub-agents, actively poll runtime work-unit readiness, submit ready attempts, repair or terminalize rejected/expired attempts, materialize Phase-owned projections where the phase owns consumer presentation after successful submit, and run the phase gate only after queue demand and delegated in-flight work are drained.

Wave0 and Wave1 phase bodies SHALL NOT present `claim --count 1` as the normal strategy for independent topics. Wave1 phase body SHALL state that topic references are Phase-owned consumer projections materialized after successful work-unit submit from submitted source/cache/degraded-capture/ledger backing. Wave2 phase body SHALL state that consumer-facing accepted pure-synthesis findings with concrete existing Wave0/Wave1 submitted backing SHALL be materialized as `reference/00-cross-*.md` or carry an explicit non-consumer/deferred/limitation reason, while new external evidence must use `wave2_targeted_evidence`.

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** the Phase Agent reads Wave0 or Wave1 delegated drain guidance
- **THEN** it SHALL see instructions to compute a bounded batch count for independent eligible work
- **AND** it SHALL not see serial `--count 1` presented as the default drain loop

#### Scenario: phase docs teach active polling after spawn

- **WHEN** a phase doc instructs the Phase Agent to spawn background Sub-agents
- **THEN** it SHALL also instruct the Phase Agent to poll work-unit files or inspect output for readiness
- **AND** ready attempts SHALL be submitted through `operate-work-unit submit` without waiting for user or notification triggers

#### Scenario: phase docs reconstruct in-flight work before claiming

- **WHEN** the Phase Agent resumes a wave phase after background work has been spawned
- **THEN** phase guidance SHALL instruct it to reconstruct delegated in-flight attempts from bundle truth before claiming additional work
- **AND** it SHALL only claim a bounded top-up batch when reconstructed in-flight count is below cap

#### Scenario: phase gate waits for queue and in-flight drain

- **WHEN** a phase has unclaimed delegated queue demand or reconstructed delegated attempts still in flight
- **THEN** phase guidance SHALL instruct the Phase Agent to keep polling, submitting, repairing, terminalizing, or claiming bounded top-ups as appropriate
- **AND** it SHALL NOT run the phase gate as if delegated work were complete

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to materialize topic reference files from that submitted backing before gate
- **AND** the phase SHALL NOT require Sub-agents to be the canonical producer of those consumer reference files

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** Wave2 pure synthesis identifies a cross-topic finding with concrete existing Wave0/Wave1 submitted backing
- **THEN** the Wave2 phase body SHALL instruct the Phase Agent to materialize `reference/00-cross-*.md` as a source-backed projection when the finding is accepted and consumer-facing
- **AND** the phase SHALL still route new public evidence gaps through `wave2_targeted_evidence`

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect helpers consume. Agent-facing examples SHALL NOT encode harmless-looking spelling, field, enum, path, or role drift that causes deterministic failure, and SHALL NOT reproduce large validator implementations in prose.

For deterministic gate-consumed surfaces, phase docs SHALL be self-sufficient producer instructions: they SHALL name the canonical path, role, ref spelling, required structured fields/enums, and return-map navigation layer needed to produce the artifact. They SHALL NOT require the Phase Agent or Sub-agent to inspect Engine helper source to discover the required output shape.

Wave phase docs SHALL direct the Phase Agent to run the corresponding side-effect-free Wave inspect after phase-owned artifacts are materialized and before writing completion evidence or invoking the formal gate. On failure, guidance SHALL direct the Agent to repair the smallest named root cause and rerun the same inspect; it SHALL NOT instruct construction of a second local validator.

Wave1 phase docs SHALL state that:

- `artifacts/wave1/{topic}/evidence-summary.md` is the required evidence summary output and maps to ledger role `evidence_summary`;
- `artifacts/wave1/{topic}/question-list.md` is the required question list output and maps to ledger role `question_list`;
- `other` is reserved for extra non-blocking outputs;
- `reviewed_work_unit_refs[]` uses canonical `_work_units/wave1/<work_id>` without a trailing slash;
- depth-review novelty compares submitted source claims against Wave0 source URLs and binds accepted claims to submitted cache/degraded/source authority; and
- inspect failure is repaired at the named canonical surface before formal gate.

Wave0/Wave1/Wave2 and seed-topic docs SHALL state that evidence-bearing return-map `refs` use concrete existing `reference/*.md` files as the primary consumer navigation layer when materialized. Internal refs under `artifacts/`, `_cache/`, and `_work_units/` are secondary provenance and cannot replace concrete reference navigation unless the entry explicitly records a deterministic limitation or non-consumer-facing status.

Wave2 phase docs SHALL expose the complete current finding-index required field set and canonical enum values through one canonical Agent-facing surface. They SHALL state that:

- newly fetched `reference/00-cross-*.md` evidence requires submitted `wave2_targeted_evidence` backing;
- existing-backed `reference/00-cross-*.md` projections are Phase-owned only when prior accepted evidence plus `W2F-xxx`, `finding-index.yaml`, `cross-topic-ledger.md`, and concrete prior backing refs make the projection auditable;
- `source_layer: wave2_cross` and `reference/_INDEX.md` rows are navigation/index metadata, not evidence authority by themselves; and
- exact deterministic finding/ledger feedback comes from Wave2 inspect rather than Engine helper source.

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** the Phase Agent reads Wave1 delegated output guidance
- **THEN** it SHALL see that `evidence-summary.md` maps to `evidence_summary`
- **AND** `question-list.md` maps to `question_list`
- **AND** `other` is not the role for those required outputs

#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** the Phase Agent reads the Wave1 depth-review example
- **THEN** `reviewed_work_unit_refs[]` SHALL show `_work_units/wave1/<work_id>` without a trailing slash

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** the Phase Agent reads seed-topic or Wave backfill guidance
- **THEN** evidence-bearing return-map examples SHALL include concrete `reference/*.md` refs when reference files are materialized
- **AND** `artifacts/`, `_cache/`, and `_work_units/` refs SHALL be described as secondary provenance

#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** the Phase Agent reads Wave2 reference projection guidance
- **THEN** it SHALL see that newly fetched `00-cross` evidence needs submitted `wave2_targeted_evidence`
- **AND** existing-backed `00-cross` projections need prior accepted backing plus W2F/finding-index/cross-topic-ledger refs
- **AND** `source_layer: wave2_cross` SHALL NOT be described as sufficient evidence authority

#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a stop:no Phase Agent reads the active Wave guidance
- **THEN** required gate-consumed roles, refs, paths, fields, enums, and return-map navigation expectations SHALL be visible in phase docs or generated task instructions
- **AND** the Agent SHALL NOT need Engine helper source to know the deterministic producer shape

#### Scenario: Phase Agent runs inspect before completion evidence

- **WHEN** phase-owned Wave artifacts have been materialized
- **THEN** guidance SHALL place the corresponding inspect command before completion evidence and formal gate invocation
- **AND** it SHALL describe inspect as side-effect-free and non-routing

#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** Wave inspect reports a required structured field or provenance binding failure
- **THEN** phase guidance SHALL direct the Agent to repair that named surface and rerun the same inspect
- **AND** it SHALL NOT require a second validator or manual authority bypass

#### Scenario: Wave2 docs expose current finding contract

- **WHEN** the Phase Agent reads Wave2 finding-index guidance
- **THEN** the complete current required field set and canonical enum values SHALL be visible through the canonical guidance surface
- **AND** contradictory field-count or enum wording SHALL NOT remain

### Requirement: Wave0 and Wave1 fetch targets SHALL follow profile floors plus conservative margin

Wave0 and Wave1 phase guidance SHALL derive delegated fetch/source candidate targets from explicit profile/runtime floors plus a conservative small margin. The margin exists to absorb duplicates, inaccessible pages, and non-countable sources; it SHALL NOT change gate thresholds, reduce required coverage, or become a hidden quality override.

Wave0 guidance SHALL bind source-intake target planning to explicit `rb_profile.yaml#/research_style_params` Wave0 floors, including per-topic source floor and shared-reference target surfaces where relevant. Wave1 guidance SHALL bind topic-deepening target planning to explicit Wave1 floors and new-source floor semantics, including `wave1_per_topic_ref_floor` and `topic_unique_ratio` where the depth-review contract uses them.

Active Wave0/Wave1 phase docs SHALL NOT instruct Agents to use fixed hard-coded fetch aims unless the number is explicitly derived from the active profile/runtime floor plus a named margin. The margin SHALL remain a planning heuristic, not a new profile field, gate parameter, quality threshold, or hidden over-fetch policy. If later gate/inspect feedback shows a gap, repair SHALL use supplementary work units rather than relying on hidden over-fetching.

#### Scenario: Wave0 target reads profile floor

- **WHEN** the Phase Agent prepares Wave0 source intake
- **THEN** phase guidance SHALL tell it to read the explicit Wave0 profile floors
- **AND** initial candidate targets SHALL be described as floor plus conservative margin, not as a fixed unbound aim

#### Scenario: Wave1 target reads profile and novelty floor semantics

- **WHEN** the Phase Agent prepares Wave1 topic deepening
- **THEN** phase guidance SHALL tell it to read `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and depth-review new-source floor semantics
- **AND** initial candidate targets SHALL be described as floor plus conservative margin

#### Scenario: hard-coded over-fetch aim is rejected

- **WHEN** active Wave0/Wave1 phase or Sub-agent guidance says to fetch a fixed number of URLs
- **AND** that number is not tied to explicit profile/runtime floor plus margin derivation
- **THEN** static tests or hygiene SHALL fail
- **AND** diagnostics SHALL require profile-bound floor+margin wording

#### Scenario: margin is not promoted into a new threshold

- **WHEN** phase guidance explains the conservative small margin
- **THEN** it SHALL describe the margin as a default planning buffer for duplicates, inaccessible pages, and non-countable sources
- **AND** it SHALL NOT define a new numeric gate threshold or profile parameter

#### Scenario: gate repair still uses supplementary work units

- **WHEN** formal gate or inspect feedback reports that floor coverage is still short after initial delegated work
- **THEN** phase guidance SHALL route repair through supplementary work-unit queue demand
- **AND** it SHALL NOT silently lower floors or treat the margin as pass authority

### Requirement: Wave delegated drain loops SHALL route timeout through progress-aware preflight

Wave0, Wave1, and Wave2 phase Markdown SHALL instruct the Phase Agent to run progress-aware timeout preflight before terminalizing a delegated claimed work unit as timed out. Phase guidance SHALL not tell the Agent to close a claimed delegated attempt with `operate-work-unit timeout` solely because the initial wall-clock `deadline_at` has elapsed.

The delegated drain loop SHALL reconstruct in-flight work from bundle truth, actively poll or inspect work-unit readiness, submit ready attempts, repair rejected or repairable attempts, and use `timeout-preflight` for expired or stale attempts before terminal timeout. The Phase Agent SHALL follow preflight advice: submit submit-ready results, repair repairable same-`work_id` candidates, wait or continue polling recent-progress attempts, inspect/block invalid bindings, and call timeout only when preflight reports timeout-eligible or an explicit audited force timeout is chosen. Because false timeout eligibility exits non-zero by design, phase guidance SHALL tell the Agent to parse structured `timeout-preflight` stdout before deciding the next action.

Force timeout SHALL be documented as exceptional. Phase guidance SHALL NOT present `timeout --force` as the normal response to progress-positive work. If preflight recommends `block` or reports invalid binding, the phase guidance SHALL direct the Phase Agent to inspect/repair through Engine tooling or surface a blocker rather than forcing timeout to make the phase drain.

This timeout-preflight path SHALL preserve the existing phase boundaries: bounded top-up claim remains an Agent strategy, Sub-agents remain bounded high-I/O actors, formal submit remains the only delegated success boundary, and gates run only after queue demand and delegated in-flight attempts are drained. The guidance SHALL NOT add Engine-owned waiting, daemon polling, user-notification dependency, direct Phase-Agent search for delegated evidence, or an alternate delegated completion path.

#### Scenario: Wave0 timeout uses preflight first

- **WHEN** a Wave0 source-intake work unit appears expired or stale
- **THEN** `phase-wave0.md` SHALL instruct the Phase Agent to run `operate-work-unit timeout-preflight`
- **AND** it SHALL direct the Agent to submit, repair, wait, inspect, block, or timeout according to structured preflight advice

#### Scenario: Wave1 timeout uses preflight first

- **WHEN** a Wave1 topic-deepening work unit appears expired or stale
- **THEN** `phase-wave1.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** submit/repair advice SHALL preserve same-`work_id` repair, depth review, supplementary queue demand, and Phase-owned reference materialization boundaries

#### Scenario: Wave2 timeout uses preflight first

- **WHEN** a Wave2 targeted-evidence work unit appears expired or stale
- **THEN** `phase-wave2.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** the guidance SHALL preserve pure-synthesis versus targeted-evidence authority boundaries

#### Scenario: progress-positive attempts are not treated as drained

- **WHEN** timeout-preflight recommends submit, repair, wait, inspect, or block for an in-flight work unit
- **THEN** the phase guidance SHALL treat the phase as not drained
- **AND** the wave gate SHALL NOT be run as if delegated work were complete

#### Scenario: force timeout is exceptional

- **WHEN** timeout-preflight reports a progress-positive or invalid-binding attempt as not timeout-eligible
- **THEN** phase guidance SHALL NOT present `timeout --force` as the default drain action
- **AND** it SHALL instruct the Phase Agent to prefer submit, repair, wait, inspect, or blocker surfacing according to preflight advice

#### Scenario: no-progress timeout still returns to REDO

- **WHEN** timeout-preflight reports a no-progress attempt as timeout-eligible
- **THEN** phase guidance SHALL allow normal `operate-work-unit timeout`
- **AND** the retry path SHALL continue through queue demand, new work-unit claim, Sub-agent execution, submit, ledger, and gate

### Requirement: Wave delegated execution SHALL use one visible actor decision loop

Wave0, Wave1, and Wave2 phase guidance and the shared work-unit protocol SHALL instruct the Phase Agent to use this order at each delegated claim decision: inspect the queue-front planned delegated role, make one small real host/native observation for that exact role, invoke the existing claim checkpoint with the normalized observation and chosen execution actor class, then either spawn a normal delegated batch, execute one explicitly allowed `phase_agent_fallback`, or stop on the returned no-claim blocker. Guidance SHALL NOT tell the Agent to claim a batch first and discover availability by spawning every attempt, and SHALL NOT reuse one role observation for different delegated roles.

When fallback is accepted by claim, the Phase Agent SHALL execute the single claimed work unit itself without asking the user to run work-unit commands, then submit or terminalize it before claiming another fallback. When the kind policy prohibits fallback or the blocker is an external account, host policy, or permission that the Agent cannot change, guidance SHALL escalate only that smallest external action to the user and resume the same claim checkpoint afterward. `human-directed` SHALL NOT be presented as availability evidence, actor-policy override, or fallback permission.

#### Scenario: Wave0 probes before bounded source-intake claim

- **WHEN** Wave0 has independent source-intake demand and no current actor observation
- **THEN** phase guidance SHALL direct one bounded native observation before `operate-work-unit claim`
- **AND** it SHALL not create multiple claimed attempts merely to test availability

#### Scenario: Wave2 targeted evidence uses the same role-bound decision loop

- **WHEN** Wave2 has `wave2_targeted_evidence` demand
- **THEN** phase guidance SHALL observe the planned `dpt-topic-scout` actor before claim
- **AND** any accepted fallback SHALL remain a single work-unit attempt under the kind actor policy

#### Scenario: Phase Agent executes accepted fallback mechanically

- **WHEN** claim returns work units bound to `phase_agent_fallback`
- **THEN** the Phase Agent SHALL read each generated task/beacon, perform the bounded work, emit actor-bound receipts, and run dry-submit/formal submit
- **AND** it SHALL submit or terminalize that attempt before claiming another fallback
- **AND** it SHALL not ask the user to execute those ordinary commands

#### Scenario: External host blocker escalates minimally

- **WHEN** the delegated actor is unavailable, fallback is not selected, and resolution requires a non-delegable host/account action
- **THEN** guidance SHALL ask the user only for that external action or decision
- **AND** after resolution the Agent SHALL rerun the same claim checkpoint itself
