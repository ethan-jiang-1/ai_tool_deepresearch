## Why

当前 `reference/README.md` 只解释文件名前缀并链接 `_INDEX.md`。读者仍须从
文件名、索引行或原始 Wave 资料推断一项 accepted material 是 shared、某个 Topic
特有还是 cross-Topic，也无法判断一个 Topic 是否有本轮 focus increment，或该
increment 是 `covered`、`partial`、`blocked`、未声明还是无法分类。

P2 已将当前轮 focus coverage 固定为直接 submitted binding 或可见 limitation，
但该过程证据尚未成为读者可用的导航投影。P3 要在不把显示文件变成 evidence
authority、Gate 输入或第二 ledger 的前提下，提供一个可追溯的 Reference Evidence
Map。

## What Changes

- 扩展现有 `reference/README.md` 的人类导航契约，增加从已接受 reference
  metadata、canonical Topic binding、`_INDEX.md` navigation projection、当前 profile
  round 以及 P2 的 optional `focus_coverage` process evidence 派生的 Reference
  Evidence Map。
- 让 map 分别展示每个 reference 的 evidence relationship（shared、Topic-specific、
  cross-Topic 或 unknown）以及每个 Topic 的 current focus status（当前
  `covered`/`partial`/`blocked`、未声明、historical context 或 unknown），并链接回
  现有直接坐标。P3 不把这两个层级合成为每个 reference 的 work-era 标签；无法由直接
  事实分类时必须显示 unknown，不能按文件名、索引行、数量或 prose 猜测。
- 扩展既有 `sync-reference-index` 投影路径，使其在保留 `_INDEX.md` inventory
  契约的同时刷新 reader map；当前实现只写 `_INDEX.md`，P3 不把它误述为已经
  支持 README 写入或跨文件原子提交。Wave1 只在 focus-coverage depth review 合法
  写入或更新后复用该操作。不会新增 queue kind、Gate rule、route、HITL、receipt、
  evidence authority 或 retry controller。
- 以 deterministic rendering、同步与 rerun-shaped reader path 验证 map；因为本变更
  不让 Agent 产生新的研究语义或 evidence，verification plan 将说明为何不选择
  `agent_flow_e2e`。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `bundle/reference-flat-format`: 将 human navigation 与既有 index synchronizer
  扩展为可从 direct facts 生成的 Reference Evidence Map，保留 `_INDEX.md` 的
  machine-readable inventory 与所有 submitted-backing ownership。
- `research/research-wave-phase-content`: 在 Wave1 对合法 focus-coverage process
  evidence 的 author/update 后，要求 Phase Agent 复用既有 reference synchronization
  来刷新 reader projection，而不手写 map、回填历史或增加流程节点。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/reference-flat-format` | `README.md as human navigation`, `_INDEX.md as canonical reference inventory`, Phase-owned reference-backing requirements, and `rb_templates/reference/README.md.tmpl` | Modify | 它已拥有 reference README、index rendering、flat-family navigation 与 submitted-backing non-authority boundary；现有模板正是本 change 要修复的 reader ambiguity。 |
| `research/research-wave-phase-content` | Wave1 focus-coverage authoring requirement and existing Wave1 materialization/index-sync guidance | Modify | 只有 Phase Agent 已拥有 focus coverage 的合法 writer context；它应复用现有 synchronizer 在事实变更后刷新 projection，而不是另建 writer。 |
| `research/final-delivery-backing` | Final Evidence Map and submitted-backing resolution requirements | Verify-only | Final report 的 finding-to-backing declaration 与 reference-directory navigation 是不同 reader question；P3 不改变 Final persistence 或 backing validator。 |
| `research/research-return-map` | Agent-readable wave/Seed Topic return-map requirement | Verify-only | return map 面向 Agent re-entry，且明确不把 `reference/README.md` 或 `_INDEX.md` 当成 return-map input。 |
| `research/wave1-intake` | P2 focus-coverage direct binding and current-round scenarios | Verify-only | P3 只消费其 accepted process evidence，不改变 coverage declaration、submitted authority 或 outcome matrix。 |
| `research/research-wave-gate-implementation` | P2 `focus_coverage_limit` partition and degraded-handoff requirement | Verify-only | reader map 显示现有 outcome，不加入 Gate rule、eligibility exception 或 route。 |
| `workflow/rerun-topic-integration` | Existing profile/current-round and historical-direction boundary | Verify-only | P3 读取现有 rerun provenance，不能改写 direction、profile 或历史 evidence。 |
| `bundle/file-observability` | Inspect/advice-only file-provenance and canonical-layout requirements | Verify-only | observability 可诊断文件，但不是 reader map writer 或 classification authority。 |

## Source Of Record And Control Shape

Accepted submitted work-unit rows, authenticated reference backing, canonical
Topic resolution, current profile rerun count, and the optional P2
`focus_coverage` block remain distinct sources of record. `_INDEX.md` and the
new README map are derived navigation projections. The map renders from those
direct facts and must retain a concrete direct coordinate for every displayed
assertion; it may never make an index row or README text prove evidence
acceptance, Topic identity, current round, or focus completion.

The shortest legal loop is: accepted submitted/reference/round facts -> the
extended existing synchronizer renders `_INDEX.md` and reader map through each
target's existing CAS boundary -> reader follows a displayed direct coordinate
or sees `unknown` -> normal Wave1 author/update reruns the same synchronizer.
The paired render does not imply a cross-file transaction: a later target CAS
failure is reported as a blocked partial projection and the same operation is
rerun from current bytes. This extends one projection path instead of adding a
reader ledger, classifier service, status machine, background watcher, or
focus-specific controller.

## Semantic Precision And Responsibilities

`Reference Evidence Map` serves a report reader asking one bounded question:
for this Topic, what accepted material is shared, Topic-specific, or
cross-Topic, and what can the current direct records say about a focus-driven
increment? It preserves the differences that change the answer: relationship
versus era, current submitted increment versus historical context, explicit
`covered`/`partial`/`blocked` limitation versus no declaration, and direct
classification versus `unknown`. A reader can stop at the map and follow its
coordinates; the map never claims that the material semantically answers a
natural-language focus brief.

The Phase Agent continues to author legal depth-review process evidence and
runs the existing synchronization operation. The Engine deterministically
renders and validates projection structure from direct facts. The user retains
the HITL2 usefulness judgment. No human decision grants a display override,
and no display outcome changes lifecycle authority.

## Impact

- Expected implementation surfaces: reference synchronizer/README template and
  renderer, Wave1 phase guidance, routed tests, `CHANGELOG.md`, and
  `DEEP_RESEARCH_HARNESS/RUN.md`.
- No dependency, public API, canonical Topic field, evidence ledger, Gate rule,
  queue kind, trace event, or lifecycle route is planned.
- This changes reusable Harness reader-visible behavior and requires a version
  bump to `v0.81` during apply.
- Product decisions and P2 direct-fact/evidence boundaries are recorded in
  `_backlog/plans/topic-research-emphasis/progressive/03-reader-evidence-projection.md`
  and archived change
  `2026-08-08-add-traceable-topic-focus-coverage`.
