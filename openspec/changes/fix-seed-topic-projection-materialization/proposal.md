## Why

BUG-138 的实际 bundle 证明，Wave0/1/2 可以留下 completion trace 和 submitted
authority，却没有把当前 canonical Seed Topic Document 回填为可导航 projection：token
未消费、`WaveN submitted` 泛化 prose 或缺少 current identity 的 entry 都能与“完成”并存。
这使人和后续 Agent 必须重建 ledger、artifact、renderer 与两份分散 guidance，无法从一个
topic 精确判断本轮发现去了哪里。原始设计与验收边界见
`_backlog/bugs/BUG-138-seed-topic-wave-backfill-not-materialized-single-writer-missing.md`
及 `_backlog/plans/seed-topic-projection-materialization.md`。

## What Changes

- 建立一个完整、可发现的 `shared-seed-topic-template.md`，取代两份分别承载 skeleton/
  rerun 与 return-map 内容的完整 authoring contract。它是 Agent/human 面向 Seed Topic
  Document 的唯一完整 template；旧 shared 文件最多保留短 compatibility pointer，不能保留
  第二份完整模板。新 canonical layout 的五个标题固定为
  `Wave0：本主题的新增来源证据`、`Wave1：本主题的机制理解`、
  `Wave1：本主题的趋势、难点与限制`、`Wave2：本主题的当前跨主题判断` 与
  `本主题的待验证问题与后续验证路径`。每个标题正下方 SHALL 有永久、只读的
  `回填卡`：它明确写入者、直接 authority、`entry_id`/五字段 entry 格式、唯一合法
  packet 动作和禁止事项。卡片位于标题与 token/entries 之间，writer SHALL 保留它，parser
  SHALL 不把它当作 Projection Entry。
- 在既有 `operate-topic-state { inspect, apply, recover }` seam 上增加 route-bound
  `wave_projection` apply input。Agent 提交一个 topic + Wave 的结构化 Projection Packet；
  Engine 根据一个小型 executable Appendix Slot Map 原子定位、消费 token、upsert entry 并
  持久化，绝不接受 raw Markdown patch、heading、path 或 line-number 指令。
- 让 slot map、renderer、writer、reader/locator 和 shared template 的 stable headings、tokens、
  owner、identity/merge rule 以及 `回填卡` descriptor 以 static parity 保持一致。Appendix
  Slot Map 是这些可调整 structural facts 的唯一 executable adjustment surface；template 是
  人可读 mirror，任何改标题或卡片约束的变更都必须同时经过该 map 和 parity，而不能散落在
  phase prose。Projection Entry 是 Agent-authored navigation，submitted work/finding/index/
  ledger 仍是 authority。
- 将 current submitted work 或当前轮、且 `affected_topics` 已解析到 target topic 的
  Wave2 finding 对 Seed Topic projection 的 direct authority interpretation 收敛为一个 pure
  readiness evaluator，供 Wave inspect 与 formal gate 复用。在可用 parent 下已有 current
  direct-authority demand 的 Wave family 中，token、generic submitted prose、错误 slot、
  错误/缺失 current identity、invalid concrete-first ref 等 required structural/provenance
  failures 都是 blocking，且不允许 degraded handoff 掩盖；没有 current demand 的 token 不得
  迫使 Agent 伪造 entry。该 evaluator 只裁决可读 section family 与 entry readiness；
  `seed_projection_layout_missing` / `seed_projection_layout_ambiguous` 是 packet writer
  对已选择 `slot_id` 的 admission root，不得被只读 inspect/gate 当作历史重复标题的
  migration blocker。formal gate 直接消费该 evaluator 的 structured findings，并退役现有
  Wave1/Wave2 每 token 的 definition-level pattern rules；不得保留第二个 seed-token/
  entry blocker。新 Wave2 packet entry 以与 `source_identity` 相等的 `W2F-*` `entry_id`
  绑定当前轮、且解析到 packet `topic_uid` 的 finding；历史 entry 仍可用 accepted exact-W2F
  ref 读取，因而 `refs` 保持 navigation/deferred 的语义，而非被迫充当新的 identity field。
- 将 Wave0/1/2 completion 前的手工 token replacement prose 改为固定闭环：Agent 从既有
  authority 形成 packet -> 使用既有 writer -> 运行同一 Wave inspect -> inspect pass 后才
  记录 completion 并进入 formal gate。writer/authority 不存在时返回 exact
  missing-contract/owner boundary，不让用户手改 bundle。
- 保持 legacy seed 读取兼容，但不自动或批量迁移。旧五个 heading base 只作为 slot map 中
  声明、复用既有有界 suffix 匹配的 locator alias；packet 仍只选择 `slot_id`。每个可写 slot
  必须唯一地是 canonical heading/card 或其 declared legacy alias；因此先前已经升级部分 slot
  的 hybrid layout 仍可继续工作。一次 otherwise-legal packet 可以在同一原子 transaction
  内只升级它实际写入的 legacy heading，并补入对应 `回填卡`。普通 read/inspect 不得改 bytes，
  其他 legacy heading 也不得被顺带迁移。只读 inspect/gate 延续 `RRM-007` 的 family-union
  读取（重复 heading 本身不构成 blocker）；writer 对一个 packet 选择的 slot 才要求唯一匹配，
  且不得猜测选择。某个 packet target slot 没有唯一的 recognized heading/card-or-alias
  layout 时，current seed 不是该 packet 的 target，返回一个 root-first layout finding；
  历史/orphan seed 不得被当前 Wave packet 选择。
- 这是 framework behavior change，implementation 时版本升至 **v0.53**，同步
  `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。

### Semantic Precision, Control, and Responsibility

`Seed Topic Document` 是一个新的、但有界的 reader-facing semantic level：它回答“此
current topic 的哪些 authoritative Wave 结果已经进入哪个可导航 slot、下一步去哪里”，而
不取代 evidence authority 或评价研究结论。它保留 current vs historical、Wave owner、
source identity、first-write vs idempotent rerun、deferred vs absent 的区别，让 reader 在
document + inspect 处正常停止，而不必从分散 surface 重建答案。

最短合法闭环是 direct authority -> Agent packet -> existing atomic writer -> same inspect
-> existing formal gate。该 change 删除/合并两份完整 template、phase-local manual token
replacement 和重复 projection interpretation；不引入 CLI、generic engine、second receipt、
controller、watcher、hidden retry 或 runtime Markdown parser。用户只决定新的研究语义、
risk 或 permission；Agent 在已有 legal window 内形成/修复 packet 并重跑 same check；
Engine 只裁决 route、identity、slot、serialization 与 deterministic readiness。用户决定
不能创造 mutation authority。

`Appendix Slot Map` 也是本 change 的明确维护反馈点：当标题、回填格式或 ownership
确有问题时，反馈应落到该 map/template pairing 的下一次 OpenSpec change，而不是由某个
bundle、Phase Agent 或手工 Markdown edit 临时改出另一套格式。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `canonical-topic-state`: `operate-topic-state apply` SHALL admit only a
  route-bound, authority-backed projection packet and atomically materialize
  the applicable current seed slots through the existing workspace/recover
  path.
- `seed-topic-materialization`: canonical Seed Topic Documents SHALL expose
  one stable Appendix Slot layout whose readable template and executable
  renderer/locator cannot drift.
- `research-return-map`: seed backfill SHALL be a stable identity-bound
  projection with one direct readiness interpretation reused by inspect and
  formal Wave gates; structural projection failure SHALL not become a degraded
  completion fact.
- `research-wave-phase-content`: Wave0/1/2 Agent flow SHALL use the packet ->
  writer -> same-inspect closeout loop and SHALL load the one complete template
  at their actual decision point.

## Impact

- Framework code: `canonical-topic-state.mjs`, `return-map.mjs`, relevant
  authority readers/evaluators, `operate-topic-state.mjs`, Wave inspect CLIs,
  Wave gate definitions/CLIs and degradation eligibility.
- Framework guidance: shared template, Wave/seed/rerun phase nodes,
  `operate-topic-state` playbook and schema guidance; static package/parity
  tests prevent complete-template duplication and slot drift.
- Verification: focused unit tests, CLI integration tests, a deterministic
  Wave0 -> Wave1 -> Wave2 disposable-bundle chain, and a real
  `agent_flow_e2e` proving a Phase Agent can consume the single template and
  legal feedback loop. Fixtures prove Engine behavior only; native runtime
  evidence is required for Agent-flow claims.
- Governance/release: delta specs for the four existing capabilities,
  requirement-registry review, change-root `verification-plan.yaml`, version
  v0.53 changelog/RUN updates. No dependency is added.
