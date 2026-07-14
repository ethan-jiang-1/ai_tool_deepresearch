> req: RWP-001, RWP-002, RWP-014

## MODIFIED Requirements

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
