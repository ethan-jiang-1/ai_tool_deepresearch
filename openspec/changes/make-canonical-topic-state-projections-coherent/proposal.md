## Why

`BUG-151`、`BUG-152`、`BUG-154`、`BUG-157` 和 `BUG-176` 暴露的不是五个孤立的
Markdown 小问题，而是同一条 canonical topic-state materialization 路径缺少可共同推理的
postcondition。今天一个合法写入可能同时发生下列任一种错误：历史提交会从可变
`source.yaml` 获得后来追加的 ordinal、一个 upsert 会损坏相邻 Seed Topic entry、一个
可编辑 body 与 appendix 骨架混在一起、topic 数改变后 style projection 只留下易漏的
`follow_up` 字符串，或同一 reference fact 被 writer 与 reader 在不同时间重复裁决。

本 change 的 reader 是正在执行或维护框架的人：**“一次合法 topic-state / Wave0 source
materialization 成功后，哪份 canonical topic/projection state 已成立；它与当前和历史
evidence、相邻 Markdown entry、style projection 及 consumer reader 有什么可证明的关系？”**
答案必须由一个有限的 direct-fact set 给出，而不能让读者重建旧文件内容、猜测写入顺序，或
把 Agent 的漏读提示当成状态一致性。

来源：`_backlog/bugs/BUG-151-wave0-supplement-live-source-array-provenance-drift.md`、
`BUG-152-wave0-topic-state-projection-upsert-concatenates-entries.md`、
`BUG-154-seed-body-duplication-after-edit.md`、
`BUG-157-research-style-params-stale-pre-topic.md`、
`BUG-176-seed-projection-entry-ref-validation.md`。

### Semantic Precision And Control Shape

本 change 引入并收敛的最小语义层是 **submitted source contribution boundary**：它只回答
“当前 `source.yaml` 的哪个 ordinal 区间由哪个已提交 Wave0 work unit 建立”，而不把
source 内容、ledger、queue 或 research judgment 重新包装成一个新状态机。提交时的
contribution boundary、当前可读 source array、Seed projection entry 和 submitted history
必须保持可区分；若历史 declaration 无法证明该边界，结果应是明确的 unknown/missing
contract，而不是把新 source 归给旧 work ID。

控制环保持为：直接 authority -> 一个 shared writer/reader evaluation -> 最早 root -> 同一
checkpoint 的合法下一动作。C2 不新增 repair controller、watcher、第二 ledger、自动 retry 或
Agent-flow scheduler；它删除当前的 live-path historical re-interpretation、局部 packet-only
postcondition、模板双写入口和弱 `follow_up` 提示依赖。对于 Agent 可机械完成的 style refresh，
Engine 给出结构化 owner、输入和 rerun checkpoint；对于没有合法历史恢复证据的 source
boundary，Engine 诚实返回 owner/missing-contract，而不诱导手改 ledger 或伪造旧 identity。

责任边界不变：Agent 仍选择内容、写合法 packet、创建实际 reference 并执行已有命令；Engine
负责 schema、submission-bound facts、atomic bytes、freshness verdict 与 direct feedback；用户
只决定新的研究语义或无法代理的风险/权限，不因 human-directed 输入获得绕过 provenance 的
写权限。

## What Changes

- Define a narrow, submission-bound Wave0 source contribution witness. A new submitted
  `wave0_source_intake` declaration will retain the minimum validated source-array
  cardinality/identity fact needed to keep historical candidate coordinates stable when a
  later authorised supplement appends to the same current target. The current evaluator will
  derive current coverage from ordered proven contributions, not reassign later ordinals to
  every historical result that names the same mutable path. **BREAKING for an ambiguous
  same-target legacy group:** when a legacy row without a contribution declaration shares its
  target with any other submitted row, the evaluator will not manufacture a historical split and
  will produce one direct missing-contract/owner result. A sole legacy row with no competing
  same-target row remains bounded read-compatible; it does not establish a new contribution fact.
  The declaration deliberately has no second durable copy: duplicate and late-submit replay retain
  a recorded declaration, but an absent row whose stored hash requires that declaration has no
  legal `recover-declaration` reconstruction path and must return one explicit missing-contract
  boundary rather than reread mutable source bytes.
- Make one topic-state projection transaction prove the entire affected Seed Topic document
  remains independently parseable after a packet upsert. The staged writer, packet admission,
  and Wave readiness reader will share the same slot/entry interpretation; a valid replay is
  idempotent and cannot concatenate, delete, or corrupt adjacent historical entries.
- Separate the Seed Topic's single Agent-editable initialization body from its Engine-owned,
  append-only research appendix. Fresh canonical seeds will expose one unambiguous editable
  region and one fixed appendix/slot region; legacy bodies remain readable without treating
  duplicated prose as a second canonical writer.
- Make research-style freshness an explicit lifecycle obligation: canonical topic materialization
  exposes the exact style-projection owner and rerun action whenever the committed registry
  invalidates the current derived parameters. Phase guidance will put materialization before
  style projection, and the existing HITL1-recorded or rerun-ready checkpoint will detect stale
  or absent params.
  Topic-state will not write `rb_profile.yaml` or compute a competing style projection.
- Give reference existence / forward-reference validation one declared owner and reuse its
  result from the writer and Wave reader where a writer postcondition requires it. Diagnostics
  will report the exact missing or near-match ref and the legal materialization/repair surface
  instead of creating duplicate, differently timed ref verdicts.
- Update framework documentation and release metadata for target version `v0.62`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `canonical-topic-state`: Make the canonical topic-state writer's success postcondition cover
  whole-document projection parseability, idempotent adjacent-entry preservation, and a
  structured style-freshness handoff without granting topic-state profile-write authority.
- `delegated-work-units`: Bind the narrow Wave0 source contribution witness to ordinary
  submitted work-unit declaration semantics only; this does not change attempt ownership,
  retry, queue finality, or correction authority reserved for C4.
- `research-return-map`: Replace mutable-path historical candidate reassignment with
  submission-bound contribution identity, and make reference validation have one declared
  authority/feedback path shared by packet admission and Wave readiness where applicable.
- `research-styles`: Define the authoritative ordering and freshness check between committed
  canonical topic count and the existing `apply-research-style` profile projection writer.
- `seed-topic-materialization`: Define one non-duplicating Agent-editable initialization body
  and one Engine-owned appendix boundary for newly rendered canonical seeds, while preserving
  legacy read compatibility.
- `pre-research-gate-implementation`: Extend the existing HITL1-recorded Gate with the same
  direct style-projection freshness verdict; it remains a Gate check, not a style writer.
- `pre-research-phase-content`: Align HITL1 guidance with the existing status-sync ->
  topic-state -> style-projection -> Gate order and its structured feedback loop.
- `rerun-incremental-node`: Extend the existing rerun-ready Gate with the same direct
  style-projection freshness verdict after legal topic-state preparation.
- `research-wave-phase-content`: Align Wave0 closeout guidance with submitted contribution-owned
  source ordinals rather than the mutable full array of each historical work row.

## Impact

- Expected implementation surfaces: `DPT_FRAMEWORK/engine/work-unit-submit.mjs`,
  `DPT_FRAMEWORK/engine/work-unit-projection.mjs`, work-unit schemas and direct-output helpers,
  `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs`,
  `DPT_FRAMEWORK/cli/operate-topic-state.mjs`, `apply-research-style.mjs`, the existing
  HITL1/rerun Gate checkers, Seed Topic template / HITL1 / rerun / Wave0 phase guidance, and the
  shared return-map evaluator.
- Expected verification: focused unit and integration tests for immutable contribution ranges,
  multi-entry replay, template body ownership, style ordering/freshness, and missing/near-match
  reference feedback; a submit/recovery negative test must show that deleting a current contribution
  row after source mutation cannot recreate provenance; one real-bundle replay is required to show a
  legal supplement does not reassign historical candidate ownership or hide a direct
  contribution-prefix failure.
- No dependencies or new packages. No mutable ledger workaround, raw Markdown fallback, generic
  repair service, queue reactivation, or host capability change is in scope.
