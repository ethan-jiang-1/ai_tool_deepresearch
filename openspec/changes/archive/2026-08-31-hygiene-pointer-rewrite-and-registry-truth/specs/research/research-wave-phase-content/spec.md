> req: RWP-014, RWP-020

## MODIFIED Requirements

### Requirement: Rerun action:add SHALL include full cache trail

Phase-wave0 §3.3、Phase-wave1 §3.3、and Phase-wave2 §3.2.3 SHALL instruct the Agent to update seed projection sections from current-round submitted authority. When a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries with the canonical entry fields owned by the research-return-map contract, by reading the outputs — NOT by mechanically extracting fields from ledger rows.
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


### Requirement: Work unit index record SHALL carry Engine-owned rerun_count

Wave phase docs SHALL teach Engine-owned `rerun_count` round identity as a pointer to its single Source of Record: the provenance-gate requirement "Work unit index record carries Engine-owned rerun_count stamped at claim time" (WPG-015, `agent/work-unit-provenance-gate`), which owns claim-time stamping, the non-negative integer field contract, Agent write prohibition, and the `operate-work-unit inspect --eligible-rows` round filtering (including `legacy_unbound` exclusion). This phase-doc requirement SHALL NOT restate the Engine-owned field contract; when the phase body mentions round identity or eligible rows it SHALL direct the Agent to the owning requirement for the behavioral truth.

#### Scenario: Claim stamps current rerun_count into index

- **WHEN** the phase doc describes claim-time `rerun_count` stamping or `--eligible-rows` round filtering
- **THEN** the guidance SHALL attribute the behavior to the WPG-015 owning requirement instead of restating the field contract
- **AND** the teaching SHALL retain the retention note that this scenario title is retained only as the OpenSpec delta-sync key

#### Scenario: Eligible rows filtered by round

- **WHEN** the phase doc teaches eligible-row round filtering
- **THEN** the guidance SHALL defer the filtering semantics (including `legacy_unbound` exclusion) to the WPG-015 owning requirement
- **AND** the scenario title is retained only as the OpenSpec delta-sync key

### Requirement: Wave2 finding SHALL carry created_in_rerun_count

Wave phase docs SHALL teach the finding-index round marker as a pointer to its single Source of Record: the wave2-synthesis requirement owning the finding-index currentness contract (WTS-012, `research/wave2-synthesis`), which owns the optional `created_in_rerun_count` field contract, the Phase Agent write duty from the current `rb_profile.yaml` value, and `legacy_unbound` inclusion semantics. This phase-doc requirement SHALL NOT restate the finding-index field contract.

#### Scenario: New finding carries round marker

- **WHEN** the phase doc describes the finding-index `created_in_rerun_count` round marker
- **THEN** the guidance SHALL attribute the contract to the WTS-012 owning requirement instead of restating the field contract
- **AND** the teaching SHALL retain the retention note that this scenario title is retained only as the OpenSpec delta-sync key

#### Scenario: Legacy finding without round marker is preserved

- **WHEN** the phase doc teaches legacy finding inclusion
- **THEN** the guidance SHALL defer the `legacy_unbound` inclusion semantics to the WTS-012 owning requirement
- **AND** the scenario title is retained only as the OpenSpec delta-sync key