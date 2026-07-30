> req: RWP-001, RWP-014

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL load `shared/shared-reference-template` through its actual `requires` chain and instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, run existing dry-submit on returned candidate work before formal submit, submit passing results by `work_id`, and run inspect/gate after phase drain. Shared rich references remain direct declared outputs of the `dpt-source-intake` actor; the Phase Agent SHALL NOT materialize or reconstruct them as a new Wave0 projection.

When the existing `wave0_source_intake` producer is used to repair missing `shared_ref_count_floor` coverage, its actor SHALL write `reference/00-shared-<slug>.md` as a declared `reference` output with a real `source_url` and complete the existing dry-submit/formal-submit loop. The phase body SHALL state this condition explicitly and SHALL NOT direct the Phase Agent to write the file directly under `reference/`. This conditional shared-reference output SHALL NOT replace or add to the assignment contract's existing required `artifacts/wave0/{topic.slug}/source.yaml` output.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml` without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

For returned work, phase guidance SHALL direct the Agent to consume the existing dry-submit disposition before formal submit: `repair_same_candidate` permits only its authorized mechanical candidate repair and a same-check rerun; `return_to_actor` preserves actor-owned semantic work; `fail_and_replace` uses the existing terminal/replacement path; and `inspect_contract` remains at the Engine owner or missing-contract boundary. It SHALL not scan the filesystem to declare or amend backing, and formal submit remains the only transition that unlocks reference materialization.

After a successful Wave0 submit, the Phase Agent SHALL obtain each Seed Projection Packet coordinate from the existing contribution-aware Wave0 inspection/preflight result. `<work_id>/N` means the global ordinal that the submitted work unit's accepted source contribution owns in the current valid source array. A later legal append has a different work ID and owns only its appended ordinal interval. The Phase Agent SHALL not recalculate every historical work unit against the mutable full array, assign a suffix to an earlier work ID, hand-edit a seed, or treat `result_hash` as a source-byte snapshot. A contribution-prefix or missing-boundary feedback root is an Engine-owned condition to inspect and rerun through the existing legal path, not a prompt to fabricate provenance.

#### Scenario: Wave0 closeout uses submitted contribution coordinates

- **WHEN** one accepted Wave0 contribution owns source ordinals `1..19` and a legal later contribution owns ordinal `20`
- **THEN** phase guidance SHALL direct the Agent to use the first work ID only for `/1..19` and the later work ID only for `/20`
- **AND** it SHALL not tell the Agent to reconstruct those identities from current file length or result prose

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



### Requirement: Rerun action:add SHALL include full cache trail

Phase-wave0 §3.3、Phase-wave1 §3.3、and Phase-wave2 §3.2.3 SHALL instruct the Agent to update seed projection sections from current-round submitted authority. When a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries (evidence_meaning, relationship, refs, status, next_hop) by reading the outputs — NOT by mechanically extracting fields from ledger rows.
3. For Wave0, obtain each new `<work_id>/<n>` entry ID from the existing submitted contribution reader: `n` is the exact global source-array ordinal owned by that accepted work unit's contribution, not a per-work-unit local index or a mutable-array re-read. For Wave1, retain the existing positive ordinal unique within the submitted work unit. For Wave2, retain the exact current-round W2F identity. Use the existing Projection Packet writer to upsert the returned identity; do not append raw Markdown or infer a historical ordinal split.
4. For entries that should not appear in the projection (intermediate outputs, process-only, not consumer-facing), write an explicit no-projection disposition entry with `relationship: defers`, `status: deferred`, and `next_hop` containing a limitation reason.

Wave1 and Wave2 SHALL add a §3.0 “Classify Direct Facts” section implementing the existing RWP-014 classification. Classification SHALL use the shared direction resolver (`resolveRerunDirection`) to determine whether the `## 本轮重跑方向` section's intent is current. Only `matching` or `future` states SHALL activate supplement intent. `stale`/`legacy_unbound`/`invalid` SHALL be treated as no supplement intent.

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun SHALL classify current demand but SHALL NOT own a separate execution path: an existing topic with valid historical coverage SHALL reuse that coverage, a new topic without coverage SHALL enter the normal Wave0/Wave1 topic pipeline, and supplement intent SHALL create the normal supplementary demand. After classification, the same queue/work-unit/submit/reference-materialization/gate contracts used by first-run execution SHALL apply. No rerun-only gate exception, provenance path, reference namespace, or lifecycle state SHALL be introduced.

For Wave0, “与首次运行一致” SHALL include creation of delegated queue demand, current role-bound actor preflight, Engine-owned work-unit allocation, real result/receipt/output/cache production, and formal submit into the submitted ledger. Direct Phase-Agent search followed by a filesystem-only `source.yaml`, hand-written result/receipt, or hand-written ledger row SHALL NOT satisfy the rerun `action:add` path.

When the accepted actor branch is `phase_agent_fallback`, the Wave0 phase SHALL instruct the Phase Agent to execute the assigned work inside the generated envelope, use the generated exact-binding result starter, run `operate-work-unit dry-submit`, repair the same assigned candidate until preflight passes, and then run formal submit. The phase SHALL NOT describe post-hoc result/receipt construction as a way to grant provenance to work performed outside the claimed envelope.

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Wave0 rerun projection keeps contribution ownership

- **WHEN** a prior submitted Wave0 contribution proves nineteen source entries and a later current-round contribution proves the same prefix extended to twenty
- **THEN** Wave0 rerun guidance SHALL use the existing contribution reader to project the first work ID's `/1..19` and the later work ID's `/20`
- **AND** it SHALL not assign `/20` to the earlier work ID or tell the Agent to modify historical ledger data

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
