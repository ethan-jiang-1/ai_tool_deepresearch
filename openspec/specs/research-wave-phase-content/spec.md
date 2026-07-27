# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019, RWP-020, RWP-021

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。
## Requirements
### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL load `shared/shared-reference-template` through its actual `requires` chain and instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, run existing dry-submit on returned candidate work before formal submit, submit passing results by `work_id`, and run inspect/gate after phase drain. Shared rich references remain direct declared outputs of the `dpt-source-intake` actor; the Phase Agent SHALL NOT materialize or reconstruct them as a new Wave0 projection.

When the existing `wave0_source_intake` producer is used to repair missing `shared_ref_count_floor` coverage, its actor SHALL write `reference/00-shared-<slug>.md` as a declared `reference` output with a real `source_url` and complete the existing dry-submit/formal-submit loop. The phase body SHALL state this condition explicitly and SHALL NOT direct the Phase Agent to write the file directly under `reference/`. This conditional shared-reference output SHALL NOT replace or add to the assignment contract's existing required `artifacts/wave0/{topic.slug}/source.yaml` output.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml` without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

For returned work, phase guidance SHALL direct the Agent to consume the existing dry-submit disposition before formal submit: `repair_same_candidate` permits only its authorized mechanical candidate repair and a same-check rerun; `return_to_actor` preserves actor-owned semantic work; `fail_and_replace` uses the existing terminal/replacement path; and `inspect_contract` remains at the Engine owner or missing-contract boundary. It SHALL not scan the filesystem to declare or amend backing, and formal submit remains the only transition that unlocks reference materialization.

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim`, dry-submit, and formal submit in that order
- **AND** it SHALL retain shared reference creation as the source-intake actor's declared output through formal submit

#### Scenario: Shared-floor repair uses the existing delegated producer

- **WHEN** Wave0 repair feedback identifies missing `shared_ref_count_floor` coverage
- **THEN** the phase doc SHALL direct the Agent to use the existing `wave0_source_intake` output/submit path for `reference/00-shared-<slug>.md`
- **AND** it SHALL require that declared reference output to carry a real `source_url`
- **AND** it SHALL NOT direct a direct Phase write under `reference/`

#### Scenario: Wave0 authoring distinguishes reference roots

- **WHEN** Wave0 guidance asks the Agent to create a shared rich reference
- **THEN** it SHALL expose the canonical `00-shared-<slug>.md` path, parser-aligned rich Markdown contract, and submitted backing as separate facts
- **AND** it SHALL not present bare YAML or fenced YAML as an alternate rich-reference contract

#### Scenario: Rerun added topic enters normal Wave0 work-unit path

- **WHEN** a sanctioned rerun adds a topic that has no Wave0 queue, in-flight or submitted coverage
- **THEN** the Wave0 phase doc SHALL instruct the Agent to enqueue one standard delegated source-intake demand for that topic
- **AND** the Agent SHALL perform role-bound probe, `operate-work-unit claim`, real actor execution and the dry-submit/formal-submit loop before gate evaluation

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

The returned-work path SHALL run existing dry-submit before formal submit and consume its one Engine-derived disposition: authorized mechanical candidate repair returns to the same dry-submit for the same `work_id`; actor-owned semantic content returns to the actor before `work_done` or uses the existing fail-and-replace path after `work_done`; contract integrity or missing-contract results remain with the named Engine owner/terminal boundary. The Phase Agent SHALL not fabricate Sub-agent output semantics, cache declarations, receipts, submitted rows, or provenance. Only a passed formal submit unlocks the topic's Phase-owned closeout.

Immediately after successful submit, the Phase Agent SHALL follow one visible checklist in this order: materialize the existing consumer reference/index from that submitted backing, perform the existing `depth-review.yaml` judgment, backfill the applicable seed return-map tokens with evidence meaning and concrete navigation refs, then proceed to the existing full-drain Wave inspect. This checklist SHALL point to the existing closeout sections and SHALL NOT redefine their field shape, deterministic validator, or authority. It SHALL NOT require the Agent to copy submitted `source_claims[]`, accepted URLs, cache refs, Wave0 URL arrays, new-source URL arrays, or derived floors into a second blocking authority.

After successful submit, the Phase Agent SHALL write `depth-review.yaml` from facts that are not already owned by submitted authority. The blocking review shape SHALL contain `version`, canonical topic binding, `reviewed_work_unit_refs[]`, depth-dimension judgments, profile-check judgments, `decision`, and `supplementary_queue_item_ids[]`. It SHALL NOT require the Agent to copy submitted `source_claims[]`, accepted URLs, cache refs, Wave0 URL arrays, new-source URL arrays, or derived floors into a second blocking authority. The Engine SHALL derive those facts from the reviewed submitted rows, Wave0 source authority, and profile.

At each affected inspect/gate/submit failure, phase guidance SHALL consume the Engine-provided direct repair coordinates: `repair_kind`, `missing_fact`, `write_to`, and `rerun`. When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already authorized mutable surface or legal operation, and no new semantic/risk decision is needed, the Agent SHALL perform the mechanical repair and rerun the named checkpoint without asking the user to execute ordinary commands. `user_decision|external_action|missing_contract` SHALL identify only the smallest Agent-facing boundary. Because Wave1 is `stop: no`, those classifications SHALL NOT by themselves authorize the Phase Agent to initiate user-facing interaction or wait for acknowledgement. If a relevant user-initiated normal conversation turn is already current, the Agent SHALL answer from direct facts and, if the requested action reaches an unavailable path, state only the smallest boundary without persisting a decision or changing lifecycle authority. Guidance SHALL NOT infer repair kind from a path or invite hand-written ledger, receipt, trace, hash, or provenance repair.

When a valid `research_profile` decision is already recorded but `research_style_params` or one of its derived Wave floors is missing, the existing `apply-research-style.mjs` operation SHALL be the mechanical owner. Wave1/Wave2 findings SHALL use `repair_kind: engine_operation`, name the exact existing operation, and return to the same inspect/Gate checkpoint. Only absence or invalidity of the underlying recorded profile semantics MAY remain a `user_decision` boundary. This correction SHALL NOT add a style resolver, copy style values into Wave code, or change Wave verdict/routing.

#### Scenario: Wave1 loads the shared reference template

- **WHEN** `phase-wave1` is entered for normal or rerun-added topics
- **THEN** its loaded required context SHALL include `shared/shared-reference-template`
- **AND** the Phase Agent SHALL materialize references from that loaded contract after successful submit

#### Scenario: Wave1 uses dry-submit before formal submit

- **WHEN** a Wave1 Sub-agent returns candidate result, receipt, output and cache surfaces
- **THEN** the Phase Agent SHALL run dry-submit before formal submit
- **AND** a dry-submit failure SHALL not create submitted coverage, reference materialization, depth review, or seed backfill

#### Scenario: Wave1 materializes closeout after submitted backing

- **WHEN** a Wave1 work unit formally submits `evidence-summary.md`, `question-list.md`, and accepted backing
- **THEN** the Phase Agent SHALL materialize the topic reference/index, depth review and seed return-map closeout before Wave inspect
- **AND** the phase SHALL not require the Sub-agent to write any of those Phase-owned projections

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent reviews submitted Wave1 work units
- **THEN** `depth-review.yaml` SHALL identify the reviewed work-unit refs and record non-derivable depth/profile/decision judgments
- **AND** it SHALL NOT be required to reproduce submitted source/cache arrays or profile-derived numeric facts

#### Scenario: Agent performs authorized same-check repair

- **WHEN** an affected checkpoint returns `repair_kind: agent_action|engine_operation`, `missing_fact`, the corresponding authorized `write_to` coordinate, and `rerun`
- **THEN** the Phase Agent SHALL perform that action and rerun the named checkpoint
- **AND** it SHALL treat `user_decision`, `external_action`, or `missing_contract` only as the smallest Agent-facing boundary and obey the current node interaction contract rather than automatically escalating

#### Scenario: Recorded profile makes missing style parameters mechanical

- **WHEN** Wave1 or Wave2 cannot derive a required floor because `research_style_params` is missing but a valid `research_profile` is already recorded
- **THEN** the finding SHALL identify the existing `apply-research-style.mjs` operation with `repair_kind: engine_operation`
- **AND** the Agent SHALL execute it and rerun the same Wave inspect/Gate checkpoint without contacting the user
- **AND** a true missing profile decision SHALL remain a distinct `user_decision` boundary

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
- **AND** the Agent SHALL drain that supplementary item through `operate-work-unit claim`, dry-submit, and `operate-work-unit submit`

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

Pure synthesis SHALL be conditional. Before writing or completing pure synthesis, the Phase Agent SHALL complete cross-topic scan matrix construction, finding confidence triage, gap analysis, and emergent-search decisions in `cross-topic-ledger.md` and `finding-index.yaml`. The phase body SHALL make clear that synthesis prose is the projection after scan/triage/gap analysis, not a substitute for that work.

The Phase Agent SHALL project checked pair facts into `finding-index.yaml#/synthesis_eligibility/scan_topic_pair_coverage` using the accepted structured entry grammar. The Engine SHALL normalize those entries through canonical topic identity, reject malformed/self/unknown/duplicate pairs, verify that `scan.topic_count` equals the canonical topic count, verify that `scan.pair_count_expected` equals the canonical `C(topic_count,2)` pair universe, and verify that `scan.pair_count_checked` equals observed unique pair entries.

Ordinary first-run and `action:supplement` SHALL NOT be forced to materialize the complete `C(topic_count,2)` pair universe solely by this structural contract. When canonical topic count is greater than one, they SHALL still materialize at least one valid structured checked pair so the deterministic process surface proves scan was not wholly skipped. `wave2_cross_topic_depth: 0` permits zero required material connections; it SHALL NOT make an empty multi-topic scan projection sufficient. The remaining `rb_profile.yaml` reduced-coverage semantics and Agent quality self-check remain in force. The stricter complete-pair policy applies only where an accepted requirement explicitly demands it, including rerun `action:add` below.

When scan/triage identifies an unresolved evidence gap that requires new external evidence, the phase doc SHALL route that gap into `wave2_targeted_evidence` queue demand and work-unit submit before the finding can count as resolved by new evidence. If the gap cannot be resolved inside the phase budget, the Agent SHALL explicitly defer it to HITL2 or final limitations through ledger/index fields rather than silently omitting it.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

#### Scenario: Pure synthesis waits for scan and triage

- **WHEN** the Phase Agent is about to complete `wave2-synthesis`
- **THEN** `cross-topic-ledger.md` SHALL contain scan matrix, confidence triage, gap analysis, and search-decision content
- **AND** `finding-index.yaml` SHALL show that no unresolved search-required finding remains without submitted targeted evidence or explicit deferral

#### Scenario: Reduced coverage is not upgraded to a universal full-pair Gate

- **WHEN** an ordinary first-run or `action:supplement` uses an accepted profile whose reduced coverage does not require the full canonical pair universe
- **AND** `pair_count_expected` describes the full canonical universe while a non-empty `pair_count_checked` matches the smaller observed structured set
- **THEN** the normalized pair-fact evaluator SHALL NOT fail solely because fewer than `C(topic_count,2)` pairs are present
- **AND** this structural pass SHALL NOT claim that the Agent's profile quality self-check was independently proven by the Engine

#### Scenario: Depth zero does not prove an empty scan

- **WHEN** canonical topic count is greater than one and `wave2_cross_topic_depth` is zero
- **AND** structured pair coverage is empty
- **THEN** the deterministic scan-not-skipped contract SHALL fail
- **AND** the failure SHALL request at least one real structured checked pair, not a fabricated material connection or full pair universe

#### Scenario: Pair structure and counts cannot hide invalid entries

- **WHEN** structured pair coverage contains a malformed, duplicate, self, or unknown-topic pair, or `pair_count_checked` differs from observed unique normalized entries
- **THEN** Wave2 inspect and formal Gate SHALL fail from the same pair-fact evaluator
- **AND** Agent-authored counts or topic-slug prose SHALL NOT override the direct structured failure

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

`action: add` behavior SHALL align with Wave0 and Wave1 `action: add` semantics: full execution, same as first run.

When `action: add`:
- Phase Agent SHALL re-read evidence-summary.md for all topics (including the new topic)
- Phase Agent SHALL rebuild the cross-topic scan matrix covering all topic pairs
- Phase Agent SHALL generate synthesis.md, cross-topic-ledger.md, finding-index.yaml from scratch
- Old synthesis may be preserved as backup (`*.prev-rerun-N.md`) but SHALL NOT serve as baseline

When `action: supplement`, maintain current delta/append behavior.

The wave2-complete Gate SHALL include a rerun add check that forbids `## Delta Synthesis` as the main processing path. Existing shared direction-resolver semantics SHALL continue to decide whether an `action:add` is active, including accepted crash-recovery and legacy behavior; this change SHALL NOT add a second round-state parser. Pair coverage SHALL NOT be reimplemented by rerun-specific slug/text scanning: the rerun add policy SHALL consume the shared normalized pair-fact result and require its observed pair set to equal the complete canonical unordered pair universe. For an activated `action:add`, `scan.pair_count_expected` and `scan.pair_count_checked` SHALL both equal `C(topic_count,2)`. If the shared pair result is unusable because its parent/container/identity contract failed, the full-universe implication SHALL be masked rather than emitting a duplicate rerun pair root. The activated full-pair requirement is accepted completion structure and SHALL NOT be degradation-eligible.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** the existing shared direction resolver activates a seed topic's `action: add`
- **THEN** Phase Agent SHALL perform full re-synthesis, not append a delta section
- **AND** synthesis.md SHALL NOT contain `## Delta Synthesis (Rerun N)` as the main path
- **AND** the shared pair-fact evaluator SHALL fail if any canonical pair is absent

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** the existing shared direction resolver activates a seed topic's `action: add`
- **AND** ledger/index prose lists every topic slug but structured pair coverage omits any added-topic × pre-existing-topic pair
- **THEN** Wave2 Gate SHALL fail with the exact missing pairs and same-check repair coordinate

#### Scenario: Rerun pair coverage has one fact path

- **WHEN** first-run or rerun Wave2 evaluates unchanged plan and finding-index bytes
- **THEN** both paths SHALL use the same normalized pair-fact result
- **AND** `action:add` SHALL add its full-universe policy to that result rather than pass coverage from slug presence or a separate count-only check

#### Scenario: Invalid pair facts mask rerun pair implication

- **WHEN** an activated `action:add` has malformed or unresolvable structured pair coverage
- **THEN** the general pair-fact root SHALL be the actionable failure
- **AND** the rerun policy SHALL NOT emit a second missing-full-pair repair root until normalization succeeds

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** a seed topic file contains current `action: supplement`
- **THEN** Phase Agent SHALL retain existing synthesis as baseline
- **AND** new analysis SHALL be appended with `## Delta Synthesis (Rerun N)` header
- **AND** resulting pair entries and counts SHALL remain structurally self-consistent
- **AND** the supplement path SHALL NOT be upgraded to full-pair coverage unless another accepted contract explicitly requires it

### Requirement: Rerun action:add SHALL include full cache trail

Phase-wave0 §3.3、Phase-wave1 §3.3、and Phase-wave2 §3.2.3 SHALL instruct the Agent to update seed projection sections from current-round submitted authority. When a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries (evidence_meaning, relationship, refs, status, next_hop) by reading the outputs — NOT by mechanically extracting fields from ledger rows.
3. Assign each new entry an `entry_id` in the format `<work_id>/<n>` where `n` is a 1-based index unique within the work unit. Check whether this `entry_id` already appears in the section; if not, append the entry at section bottom.
4. For entries that should not appear in the projection (intermediate outputs, process-only, not consumer-facing), write an explicit no-projection disposition entry with `relationship: defers`, `status: deferred`, and `next_hop` containing a limitation reason.

Wave1 and Wave2 SHALL add a §3.0 “Classify Direct Facts” section implementing the existing RWP-014 classification. Classification SHALL use the shared direction resolver (`resolveRerunDirection`) to determine whether the `## 本轮重跑方向` section's intent is current. Only `matching` or `future` states SHALL activate supplement intent. `stale`/`legacy_unbound`/`invalid` SHALL be treated as no supplement intent.

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun SHALL classify current demand but SHALL NOT own a separate execution path: an existing topic with valid historical coverage SHALL reuse that coverage, a new topic without coverage SHALL enter the normal Wave0/Wave1 topic pipeline, and supplement intent SHALL create the normal supplementary demand. After classification, the same queue/work-unit/submit/reference-materialization/gate contracts used by first-run execution SHALL apply. No rerun-only gate exception, provenance path, reference namespace, or lifecycle state SHALL be introduced.

For Wave0, “与首次运行一致” SHALL include creation of delegated queue demand, current role-bound actor preflight, Engine-owned work-unit allocation, real result/receipt/output/cache production, and formal submit into the submitted ledger. Direct Phase-Agent search followed by a filesystem-only `source.yaml`, hand-written result/receipt, or hand-written ledger row SHALL NOT satisfy the rerun `action:add` path.

When the accepted actor branch is `phase_agent_fallback`, the Wave0 phase SHALL instruct the Phase Agent to execute the assigned work inside the generated envelope, use the generated exact-binding result starter, run `operate-work-unit dry-submit`, repair the same assigned candidate until preflight passes, and then run formal submit. The phase SHALL NOT describe post-hoc result/receipt construction as a way to grant provenance to work performed outside the claimed envelope.

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Projection updated from current-round rows only

- **WHEN** a topic has submitted Wave1 rows from round 1 (index.rerun_count=1) and round 2 (index.rerun_count=2)
- **AND** profile `rerun_count` is 2
- **AND** the seed projection has no `__BACKFILL_*__` token
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the round-2 rows
- **AND** the Agent SHALL append entries for those rows with new entry_ids

#### Scenario: Entry with no-projection disposition satisfies check

- **WHEN** a submitted row produced process-only output not suitable for consumer projection
- **THEN** the Agent SHALL write an entry with `relationship: defers`, `status: deferred`, `next_hop: “limitation: process-only output, not consumer-facing”`
- **AND** this entry SHALL satisfy the authority reference check (explicit disposition)

#### Scenario: Wave1 classification uses direction resolver

- **WHEN** a topic has direction with `rerun_count: 2` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `matching`
- **AND** wave1 §3.0 SHALL classify the topic as supplement

#### Scenario: Stale direction does not trigger classification

- **WHEN** a topic has direction with `rerun_count: 1` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `stale`
- **AND** wave1 §3.0 SHALL treat the topic as having no supplement intent (reuse if valid coverage exists)

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

Role guidance SHALL remain work-unit Sub-agent task guidance. The Phase Agent SHALL load the role guidance selected by the current wave's registered work-unit kind so it can construct demand and interpret returned Engine feedback, while the Engine-derived generated task/spawn prompt SHALL also give the selected actor the same canonical role-guidance ref and resolved read path. The actor SHALL read that guidance and its explicit shared guidance refs before executing search, fetch or output authoring. Role guidance SHALL remain subordinate to the current assignment's exact required_outputs[] and SHALL not turn supplementary work into an implicit primary pair.

Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol, manually copy a role template into each spawn prompt, choose an arbitrary role file or author direct-contract semantics. The Phase Agent retains queue/claim/dry-submit/repair/submit responsibility; direct role delivery SHALL not give the actor lifecycle, Gate, user-interaction or contract-selection authority.

#### Scenario: role guidance uses work-unit protocol

- **WHEN** delegated task guidance is loaded by the Phase Agent or selected actor
- **THEN** it SHALL describe the same work-unit task/result/receipt expectations and role-specific research/output responsibilities
- **AND** the generated task SHALL bind both readers to the canonical role selected from the registered work-unit kind

#### Scenario: Phase Agent does not hand-author actor contract delivery

- **WHEN** the Phase Agent receives a claim result with generated task and spawn prompt
- **THEN** it SHALL pass the generated actor surface without rewriting headings, role identity or fallback tiers
- **AND** it SHALL run the existing dry-submit/replacement loop after actor return rather than repair actor-owned semantic output or ask the user to operate it

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a continuous Phase Agent loop: fill queue demand, reconstruct current in-flight work from bundle truth, claim eligible independent work units as bounded top-up batches where applicable, spawn bounded Sub-agents, actively poll runtime work-unit readiness, submit ready attempts, repair or terminalize rejected/expired attempts, materialize Phase-owned projections where the phase owns consumer presentation after successful submit, and run the phase gate only after queue demand and delegated in-flight work are drained.

After the existing `fail_and_replace` disposition reaches its authorized terminal boundary, phase Markdown SHALL instruct the Agent to terminalize the current attempt through the existing terminal operation and invoke `operate-work-unit replace` for that terminal `work_id`. For a newly created or queued successor, it SHALL then perform the existing exact-role native probe and `operate-work-unit claim`; for an already in-flight idempotent successor, it SHALL reconstruct and poll the disclosed existing work ID without a second claim. It SHALL not hand-author an allegedly equivalent replacement task card, infer a successor queue ID, discover a work ID from the filesystem, rewrite terminal status, or bypass ordinary claim.

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

#### Scenario: terminal replacement returns to the location-correct existing boundary

- **WHEN** dry-submit reports `fail_and_replace` for completed actor-owned semantic work
- **THEN** phase guidance SHALL terminalize that work ID, invoke the Engine-owned replacement operation, and use a new or queued successor only through an exact-role probe and normal claim
- **AND** it SHALL reconstruct and poll a disclosed already-in-flight successor rather than claim again
- **AND** it SHALL not reconstruct a replacement task card, inspect `_work_units` for a successor, or change the parent's terminal status

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to materialize topic reference files from that submitted backing before gate
- **AND** the phase SHALL NOT require Sub-agents to be the canonical producer of those consumer reference files

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** Wave2 pure synthesis identifies a cross-topic finding with concrete existing Wave0/Wave1 submitted backing
- **THEN** the Wave2 phase body SHALL instruct the Phase Agent to materialize `reference/00-cross-*.md` as a source-backed projection when the finding is accepted and consumer-facing
- **AND** the phase SHALL still route new public evidence gaps through `wave2_targeted_evidence`

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect
helpers consume. Agent-facing examples SHALL not encode harmless-looking
spelling, field, enum, path or role drift that causes deterministic failure,
and SHALL not reproduce large validator implementations in prose.

Wave0, Wave1 and Wave2 SHALL load `templates/seed-topic-template` through their
actual `requires` chain. It is their pure Seed Topic Document-shape contract;
the existing `command_playbook/operate-topic-state.md` is the sole complete
Projection Packet execution contract. Phase bodies shall retain only Wave-local
authority, queue/submit sequence, concrete artifact guidance and the command
checkpoint. They SHALL not instruct Phase Agents to discover section headings,
replace tokens by hand, edit a seed directly, or build a local return-map
validator. Each canonical slot's visible `回填卡` is the compact per-heading
instruction at the exact decision point: it names the writer, direct authority,
backfill timing, `entry_id` plus five required entry fields, materialization
pointer and prohibitions. The Phase Agent SHALL retain that card and write only
through the packet/writer path; it SHALL not reinterpret the card as an entry or
locally paraphrase it into a competing contract.

After successful submitted work or accepted finding materialization, each
Wave phase SHALL teach this closeout loop:

1. read its existing direct submitted-row or finding authority;
2. use Agent judgment to form a retained Projection Packet for each affected
   current topic, including an explicit deferred disposition where applicable;
3. invoke existing `operate-topic-state apply` in its route-bound Wave window;
4. run the corresponding side-effect-free, non-routing Wave inspect; and
5. repair the smallest named packet/authority root and rerun that same inspect
   before writing completion evidence or invoking the formal gate.

The phase SHALL not ask the user to perform ordinary packet/apply/inspect work,
hand-write a ledger/receipt/trace/reference, or turn a generic submitted line
into a success substitute. A missing legal writer or authority path SHALL be
shown as the direct owner/missing-contract boundary, not silently repaired by
prose. Formal gate invocation remains after the inspect loop and retains its
existing routing ownership.

For deterministic gate-consumed surfaces, Wave docs SHALL name canonical paths,
roles, refs, required structured fields/enums and return-map navigation facts
needed to produce the artifact. Wave1 SHALL retain its existing required
evidence-summary/question-list role guidance and Wave2 SHALL retain its
finding-index/cross-reference authority split. Evidence-bearing projection refs
continue to use concrete existing `reference/*.md` navigation first, with
artifact/cache/work-unit paths as secondary provenance only.

#### Scenario: Wave closeout uses the one legal writer

- **WHEN** a Phase Agent has successful Wave0, Wave1 or Wave2 authority ready
  for a current topic
- **THEN** its phase guidance SHALL direct packet -> `operate-topic-state apply`
  -> same Wave inspect -> formal gate
- **AND** it SHALL not direct manual token replacement or direct seed editing

#### Scenario: Heading card gives the backfiller one constrained action

- **WHEN** a Phase Agent reaches a canonical Seed Topic slot during closeout
- **THEN** its visible `回填卡` SHALL name the slot's authority, backfill timing,
  entry shape and `operate-topic-state` materialization pointer
- **AND** the Agent SHALL leave the card intact and submit entries only through
  the existing writer

#### Scenario: Wave1 atomically handles its multiple owned slots

- **WHEN** Wave1 has mechanisms, trends and pending-question projection
  material for one topic
- **THEN** phase guidance SHALL direct one Wave1 packet through the existing
  writer
- **AND** it SHALL not allow partial manual backfill before completion

#### Scenario: Inspect precedes completion evidence

- **WHEN** phase-owned artifacts and seed projection packets have been applied
- **THEN** guidance SHALL put the corresponding Wave inspect before completion
  trace/evidence and formal gate invocation
- **AND** an inspect failure SHALL return to the named owner and same inspect

#### Scenario: Missing writer is an honest boundary

- **WHEN** a Phase Agent cannot form a packet because a direct submitted/finding
  authority or legal writer window is unavailable
- **THEN** guidance/feedback SHALL identify that direct owner or
  missing-contract boundary
- **AND** it SHALL not ask the user to hand-edit a seed or fabricate a receipt

#### Scenario: Phase docs keep artifact authority separate from projection

- **WHEN** a Phase Agent reads Wave1 or Wave2 artifact/reference guidance
- **THEN** it SHALL see that submitted work/finding/index/ledger remain
  authority and Seed Topic entries are navigation
- **AND** it SHALL not treat a packet or entry as evidence coverage

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

Force timeout SHALL be documented as exceptional. Phase guidance SHALL NOT present `timeout --force` as the normal response to progress-positive work. If preflight recommends `block` or reports invalid binding, phase guidance SHALL direct the Phase Agent to inspect/repair through Engine tooling or preserve the smallest deterministic blocker in Agent-facing feedback rather than forcing timeout to make the phase drain. Because every Wave is `stop: no`, `block` and blocker feedback SHALL NOT by themselves authorize a user-facing question, status output, partial delivery, approval request, or acknowledgement wait; the Phase Agent SHALL continue other eligible work or hold silently with the attempt undrained.

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
- **AND** it SHALL instruct the Phase Agent to prefer submit, repair, wait, inspect, or Agent-facing blocker retention according to preflight advice without initiating user interaction from a `stop: no` Wave

#### Scenario: no-progress timeout still returns to REDO

- **WHEN** timeout-preflight reports a no-progress attempt as timeout-eligible
- **THEN** phase guidance SHALL allow normal `operate-work-unit timeout`
- **AND** the retry path SHALL continue through queue demand, new work-unit claim, Sub-agent execution, submit, ledger, and gate

### Requirement: Wave delegated execution SHALL use one visible actor decision loop

Wave0, Wave1, and Wave2 phase guidance and the shared work-unit protocol SHALL instruct the Phase Agent to use this order at each delegated claim decision: inspect the queue-front planned delegated role, make one small real host/native observation for that exact role, invoke the existing claim checkpoint with the normalized observation and chosen execution actor class, then either spawn a normal delegated batch, execute one explicitly allowed `phase_agent_fallback`, or stop that claim attempt on the returned no-claim blocker. Guidance SHALL NOT tell the Agent to claim a batch first and discover availability by spawning every attempt, and SHALL NOT reuse one role observation for different delegated roles.

When fallback is accepted by claim, the Phase Agent SHALL execute the single claimed work unit itself without asking the user to run work-unit commands, then submit or terminalize it before claiming another fallback. When the kind policy prohibits fallback or the blocker is an external account, host policy, or permission that the Agent cannot change, guidance SHALL identify only the smallest external-action boundary in Agent-facing feedback and preserve the same claim checkpoint. Because Wave0, Wave1, and Wave2 are `stop: no`, that blocker SHALL NOT by itself authorize a framework-initiated question, status output, or acknowledgement wait; the Agent SHALL continue other eligible work or hold silently. A relevant user-initiated normal conversation turn SHALL receive an answer from direct facts and, if it reaches that blocker, only the smallest external-action boundary without changing authority. After the external prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint. `human-directed` SHALL NOT be presented as availability evidence, actor-policy override, or fallback permission.

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
- **THEN** guidance SHALL identify only that external action or decision as the Agent-facing escalation boundary
- **AND** in a `stop: no` Wave the classification alone SHALL NOT authorize a user question, status output, or acknowledgement wait
- **AND** after the prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint itself

### Requirement: Work unit index record SHALL carry Engine-owned rerun_count

`operate-work-unit claim` SHALL read the current `rerun_count` from `rb_profile.yaml` and write it into the work unit index record's `rerun_count` field at claim time. The field SHALL be a non-negative integer or absent (legacy records). This field SHALL be Engine-owned — the Agent SHALL NOT write or modify it.

`operate-work-unit inspect` SHALL accept an `--eligible-rows` flag. When present, it SHALL return all submitted rows for the bundle whose index `rerun_count` matches the current profile `rerun_count`, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding. Each returned row SHALL include `work_id`, `result_path`, `rerun_count`, and resolved topic binding. Legacy rows without `rerun_count` in the index record SHALL be treated as `legacy_unbound` and excluded from eligible rows (they are not current-round authority).

#### Scenario: Claim stamps current rerun_count into index

- **WHEN** profile `rerun_count` is 2 and `operate-work-unit claim` creates a new work unit
- **THEN** the index record SHALL have `rerun_count: 2`
- **AND** the Agent SHALL NOT be able to modify this field

#### Scenario: Eligible rows filtered by round

- **WHEN** a bundle has submitted rows with index.rerun_count values 1, 2, and one legacy row without the field
- **AND** profile `rerun_count` is 2
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the row with `rerun_count: 2`
- **AND** legacy rows and round-1 rows SHALL be excluded

### Requirement: Wave2 finding SHALL carry created_in_rerun_count

`finding-index.yaml`'s per-finding contract SHALL include an optional `created_in_rerun_count` field (non-negative integer). The Phase Agent SHALL write this field when creating new findings in Wave2 synthesis, reading the current value from `rb_profile.yaml`. Existing findings without this field SHALL be treated as `legacy_unbound` — they SHALL always be included in projection and authority verification regardless of round.

#### Scenario: New finding carries round marker

- **WHEN** Wave2 synthesis creates finding W2F-015 in round 2
- **THEN** the finding SHALL have `created_in_rerun_count: 2`

#### Scenario: Legacy finding without round marker is preserved

- **WHEN** a pre-v0.29 finding has no `created_in_rerun_count` field
- **AND** Wave2 authority verification runs in round 2
- **THEN** the finding SHALL be treated as legacy_unbound and included in verification
- **AND** no blocking finding SHALL be produced solely due to the missing field

### Requirement: Wave phases SHALL operate one receipt-bound carried-target loop

Wave1 guidance SHALL direct the Phase Agent, after reading submitted evidence, question-list reasoning, current Topic/profile, and optional user controls, to make the semantic carry-forward decision in the Phase-owned depth review. The review SHALL contain an explicit `carried_targets` declaration, which MAY be empty; prose, a slug-looking target ID, or a question-list line outside that declaration SHALL not create carry-forward authority.

The declaration SHALL NOT weaken the existing `decision: accept` requirement for Wave1 submitted evidence, source floors, cache mapping, depth dimensions, or profile checks. It records only what remains material for Wave2 after those existing direct facts are satisfied.

Wave2 guidance SHALL direct the Agent to consume the receipt from the exact routed Wave1 Gate handoff, bind its selected targets only in the existing finding index, and use existing finding decision/gap-status routes for resolution, new targeted evidence, limitation, `defer_hitl2`, `requires_internal_data`, or `record_only`. It SHALL not reread a mutable depth review as a second parent, hand-edit trace, or ask the user to perform ordinary repair.

#### Scenario: empty declaration keeps the normal Wave2 path
- **WHEN** Wave1 explicitly declares `carried_targets: []`
- **THEN** the Wave1 receipt contains an empty selected set
- **AND** Wave2 has no added target-binding work while its existing synthesis contract remains active

#### Scenario: missing target binding repairs the existing consumer
- **WHEN** Wave2 inspect reports receipt targets without valid finding bindings
- **THEN** the Phase Agent repairs `artifacts/wave2/finding-index.yaml` and reruns the same inspect/Gate
- **AND** it SHALL not invent a new queue authority or user checkpoint
