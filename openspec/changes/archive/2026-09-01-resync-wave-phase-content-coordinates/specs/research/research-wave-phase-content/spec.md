## MODIFIED Requirements

### Requirement: Wave2 rerun full re-synthesis on topic addition

The `phase-wave2.md` rerun guidance SHALL distinguish `action: add` (full re-synthesis) and `action: supplement` (delta/append): the shared direction resolver and the Engine-owned rerun add policy own the deterministic distinction, and `phase-wave2.md` pair-coverage guidance SHALL state that only an activated rerun `action:add` requires the exact complete canonical pair universe while an ordinary first run or `action:supplement` may remain below `pair_count_expected`.

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

Phase-wave0 §3.4（Seed Projection Update）、Phase-wave1 §3.3（Seed Projection Update）、and Phase-wave2 §3.2 Execution Loop SHALL instruct the Agent to update seed projection sections from current-round submitted authority. In Phase-wave0 and Phase-wave1, when a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries through the existing projection writer. In Phase-wave2, `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` are documentation tokens replaced only by the existing projection writer, not Agent-edit targets. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries with the canonical entry fields owned by the research-return-map contract, by reading the outputs — NOT by mechanically extracting fields from ledger rows.
3. For Wave0, obtain each new `<work_id>/<n>` entry ID from the existing submitted contribution reader: `n` is the exact global source-array ordinal owned by that accepted work unit's contribution, not a per-work-unit local index or a mutable-array re-read. For Wave1, retain the existing positive ordinal unique within the submitted work unit. For Wave2, retain the exact current-round W2F identity. Use the existing Projection Packet writer to upsert the returned identity; do not append raw Markdown or infer a historical ordinal split.
4. For entries that should not appear in the projection (intermediate outputs, process-only, not consumer-facing), write an explicit no-projection disposition entry with `relationship: defers`, `status: deferred`, and `next_hop` containing a limitation reason.

The Wave1 and Wave2 `§3.0 Classify Direct Facts` sections implement the existing RWP-014 classification. Classification SHALL use the shared direction resolver (`resolveRerunDirection`) to determine whether the `## 本轮重跑方向` section's intent is current. Only `matching` or `future` states SHALL activate supplement intent. `stale`/`legacy_unbound`/`invalid` SHALL be treated as no supplement intent.

`phase-wave0.md` 与 `phase-wave1.md` 的 rerun-added-Topic 指引（§3.0 Classify Direct Facts 中 first-run 与 rerun-added 同一分类的规则，以及 §3.1 task card 的常规 `_cache/` leaf cache trail 生产要求）SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake/deepening 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

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
- **THEN** the Agent SHALL write an entry with `relationship: defers`, `status: deferred`, `next_hop: “limitation: not materializable; process-only output”` (the canonical no-projection limitation form owned by research-return-map)
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

