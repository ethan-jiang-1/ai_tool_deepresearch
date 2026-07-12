## Why

`_backlog/plans/human-override-and-state-mutability.md` 的能力 B 与 `_backlog/plans/overall-recovery-canonical-state-and-delegation-roadmap.md` 的 C3B 仍未完成：C3A 已让 `topic_uid` 成为稳定 identity，但 current `id/slug` 仍被 queue、work-unit、gate 与历史 artifact/reference path直接解释。用户要求移除、改名或重排 topic 时，Agent 只能被阻断或手工同步多个面，既不可靠，也违背 helper-oriented Agent 应执行已授权机械工作的长期方向。

## What Changes

- 扩展现有 `rb_plan.md#/topic_registry`，让每个仍在 registry 的 topic 同时拥有 current layout 与最小 historical layout lineage；`topic_uid` 永不变化，`id/slug` 只是当前坐标。remove 只允许用于没有 queue/work-unit/ledger/artifact/reference 历史事实、没有依赖者的未开展 topic；已有 provenance 的 topic fail-closed，不引入 retired lifecycle 或物理抹除历史。剩余 topic 的连续 ordinal/slug 由一次完整 layout plan 重新计算。
- 扩展现有 `operate-topic-state.mjs apply|recover` 与同一个 `_diagnostics/topic-state/<operation-id>/` workspace，新增一个完整、显式的 layout target：rename、reorder/renumber、safe remove。事务仍只拥有 `rb_plan.md` 与 affected current seed files；它不会升级为 artifact/reference 搬迁器、link rewriter或通用 filesystem transaction framework。
- 引入一个纯 UID/layout resolver，供 topic-state inspect、queue/work-unit、submitted provenance、wave gate、file-observability 与 reentry 共用。New enqueue从current slug确定性解析并固化`payload.topic_uid + payload.topic_slug`，不要求Agent手填可推导UID；work-unit继续通过immutable queue-item snapshot继承。旧slug-only snapshot/ledger通过registry-owned layout history解析，不新增result/ledger topic字段，也不重写历史receipt/ledger。
- layout apply 只在已存在的 sanctioned rerun mutation window 中可用，并要求受影响 topic 没有 queued、claimed 或其他 nonterminal work。HITL1 在首次 apply 前直接形成正确初始顺序，不需要第二次 layout mutation。用户决定新的 title/order/remove scope；Agent 生成完整 change set、处理 quiescence blocker、执行 apply/recover/style/audit；Engine 只做 UID、路径、CAS、schema、provenance 与 side-effect verdict。`human-directed` 仍不创造 permission，post-final fresh mutation继续等待 C5。
- rename/renumber只原子更新registry current layout并移动/重写current UID-bound seed projection。历史artifact/reference/output path保持原位，作为当时真实provenance坐标；gate/inspect按UID聚合current与previous slugs，因此不再要求手工rename历史内容、ledger path、index或dossier link。Safe remove只删除未开展topic的registry/seed projection，并让既有style owner按新registry length重算。
- 最短闭环保持为：`inspect direct UID/layout facts → Agent drain existing owner or submit retained layout target → exact recover if accepted → existing research-style owner when count changes → inspect/audit same facts`。Net simplification 是用一个registry owner、一个resolver与既有plan+seed transaction替代多处slug推断和历史文件搬迁；明确避免artifact/reference move、link rewrite、force flag、任意patch、ledger rewrite、隐藏rollback tree、watcher、daemon、锁服务和第二套成功authority。
- 本 change 修改 framework runtime behavior，需要 version bump，目标 `v0.26`。

## Capabilities

### New Capabilities

- 无。C3B 是现有 `canonical-topic-state` capability 的有界扩展，不建立新的 layout-migration subsystem。

### Modified Capabilities

- `canonical-topic-state`: 增加 registry-owned current/previous layout lineage、完整 layout target、同一plan+seed workspace原子提交与显式恢复。
- `schema-core`: canonical topic entry 增加 previous-layout invariants，并保持 legacy/C3A canonical read compatibility。
- `agentic-queue`: topic-scoped demand由Engine从current slug固化UID binding；current queued demand在layout mutation前必须quiescent，历史terminal demand保持不可改。
- `delegated-work-units`: work-unit继续以immutable queue-item snapshot继承UID/current slug；submitted ledger经`work_unit_ref`解析topic identity，不新增result/ledger重复字段。
- `queue-input-validation`: enqueue按 UID/current slug 校验 registry topic，historical alias slug不得产生新 work。
- `plan-hostfile-sections`: topic-state plan rendering同步刷新标准`## Topic Registry` derived table；非标准body只advisory，不成为mutation blocker或第二authority。
- `seed-topic-materialization`: seed projection跟随 current layout；safe remove只删除无历史事实 topic 的seed，不改写已有 provenance。
- `file-observability`: 复用 layout resolver把current/previous slug文件归到同一UID，不把历史provenance path误报为新identity或要求搬迁。
- `research-wave-gate-implementation`: per-topic wave gate按UID聚合current与previous layout paths，同时只允许current slug创建新work。
- `rerun-incremental-node`: sanctioned rerun可把用户明确的 rename/reorder/safe-remove语义交给 topic-state apply，机械步骤由Agent继续执行。
- `research-styles`: safe remove或add造成 registry length变化后继续由既有 style owner重算，不让 topic-state helper直接写 profile。
- `runtime-reentry-debuggability`: accepted layout workspace、layout collision与UID/alias drift聚合为一个 root，并只返回 exact recover/repair action。

## Impact

- 预计影响 canonical plan schema、topic-state helper/CLI现有workspace manifest、queue topic binding、shared UID/layout resolver、seed/wave gate/file-observability/reentry readers、rerun与command guidance、root regression及一个真实disposable controlled case。
- Mutation authority仍只属于`rb_plan.md#/topic_registry`、affected current seeds与一次prepared manifest。Immutable artifact/reference/output path、submitted ledger、receipt、trace和work-unit history全部不重写；previous slug只用于UID归属与历史coverage读取。
- 不新增依赖，不新增lifecycle state、human override token、post-final reentry、retired/tombstone state、artifact/reference mover、link rewriter、generic delete、force、arbitrary path move或自动content rewrite。
