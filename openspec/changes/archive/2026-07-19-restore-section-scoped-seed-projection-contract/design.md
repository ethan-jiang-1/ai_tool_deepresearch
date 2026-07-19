## Context

Accepted `RRM-007` 已定义 current-round per-row/per-finding seed projection 验证，但当前实现只完成 `RRM-006` 的 per-wave token filter。`inspectSeedTopicReturnMaps()` 在 token 不存在时把整个 seed Markdown 交给 `validateReturnMapContent()`；五字段、concrete refs 和 Wave1/Wave2 refs 因而按全文件聚合。一个完整 Wave0 entry 可以让 Wave1 的 prose-only section 被误判为合格。

Current-round submitted authority 已有两个相关 surface：

- `inspectWorkUnits()` 校验 index、ledger、manifest、result、receipt、output/cache binding；
- `collectEligibleRows()` 按 phase 与 profile `rerun_count` 过滤 submitted index records，供 `operate-work-unit inspect --eligible-rows` 使用。

但 `collectEligibleRows()` 当前把 profile/index 解析失败降为 warning + empty rows，且 topic filter 只读 manifest slug，没有返回 canonical UID/current-or-previous layout binding。`readSubmittedWorkUnitDeclarations()` 已在一次 pass 中校验 ledger/index identity，却只返回 ledger rows；round marker 只存在于它内部加载的 index record，调用者若要过滤仍会第二次私读 index。另一方面，完整 `inspectWorkUnits()` 还检查 transaction、lease、beacon、receipt、cache trail、orphan directory 等 work-unit health；把它整体作为 seed projection prerequisite 会把不相关健康问题升级成 `RRM-007` root。这里需要 submitted-reader owner 输出一次解析的 normalized facts，再派生窄 projection view，而不是第二套 reader，也不是完整 health inspect 的别名。

Wave2 finding parent 已由 `wave-depth-contracts.mjs` 的 finding-index reader/evaluator解析，但它当前不校验 `affected_topics` token 的 canonical binding，也不校验 `created_in_rerun_count` 的 type/future relation。Accepted Wave2 contract 要求按 `affected_topics` 过滤 per-topic backfill，因此 finding identity 只有在 canonical topic binding 后才可用于某个 seed。这里需要一个 inspect-only normalized projection parent；不能把它错误描述成 existing formal finding-index root，也不能复制 pair-fact 的 token map。Seed projection 是 Agent-readable navigation projection；submitted work-unit authority 与 finding-index 才是 direct Source of Record。

现有 workflow 明确要求 `inspect-waveN-output.mjs` 先通过，再运行 `check-gate-waveN-complete.mjs`。Return-map helper 只被三个 Wave inspect CLI 调用，formal Gate CLI 不消费它。本 change 因而修复 mandatory pre-gate inspect contract，不扩张 formal Gate rule family。

本 design 已 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。结论是：复用现有 inspect/check 入口、收敛 authority reader、短路 prerequisite、给一个 seed section 修复坐标；不新增 CLI、状态、自动修复或用户动作。

## Goals / Non-Goals

**Goals:**

- 完整落实 `RRM-007` 的 section-scoped current-round row/finding projection contract。
- 一个 wave/entry 外的合法字段或 lineage 不得满足当前 entry 的 shape/ref requirement；family union只裁决 accepted family lineage 和 demand-driven identity coverage，不产生无 authority demand 的 entry quota。
- Wave0/Wave1 current-round rows 使用同一个 fail-closed eligible-row authority interpretation。
- Wave2 current/legacy findings 复用现有 finding-index parse/contract，并按 canonical `affected_topics` 隔离到对应 seed，保持 blocking/advisory compatibility。
- Inspect 返回最早 direct root、exact seed/section/work-or-finding id、一个合法 Agent 修复动作和 same-check rerun。
- 保持 inspect no-write/non-routing；不改变 evidence authority、workflow routing 或 runtime schema。

**Non-Goals:**

- 不修 BUG-093/094 的 shared template、header UX 或 rerun direction shape。
- 不重命名 seed sections，不迁移历史 bundle。
- 不重新注入 backfill token，不增加 token family。
- 不创建通用 Markdown/output linter、template engine、repair controller 或新 gate family。
- 不让 Engine 生成/改写 return-map semantic content。
- 不改变 work-unit claim/submit、queue、status、trace、receipt 或 finding-index schema。
- 不把 return-map evaluator 接入 formal Wave Gate，也不要求 Gate 与 inspect 共享这些 rule ids/verdict。

## Decisions

### Architectural shape: 两个 direct parent，一个 projection owner

```text
parsed plan / canonical seed binding
          |
          v
target-wave token filter
          |
          v
  +-------------------+    +----------------------+
  | Section Facts     |    | Authority Facts      |
  | section evaluator |    | submitted / finding  |
  | entry boundaries  |    | topic + round demand |
  +---------+---------+    +----------+-----------+
            \                     /
             \                   /
              v                 v
             Feedback Projection
             Wave inspect owner
             severity + coordinate
```

Wave inspect 入口先对 `rb_plan.md` 构造一个 invocation-scoped canonical topic-registry fact：它保留完整 canonical registry rows，同时派生既有 Wave evaluator 需要的 current/previous-slug layout view。同一 fact 决定 current seed set、供 Wave evaluator 展开 target，并供 canonical seed-binding 与 authority topic binding 使用；CLI 不得再 raw-read plan。可读且 canonically bound 的 seed 内，target-wave token 再决定 `RRM-007` projection subcheck 的 accepted skip。该 skip 不改变同一 inspect 已运行的 existing Wave evaluator：stale-token rule 仍可使整个 command fail。之后 section facts 与 authority facts各自只读取 direct Source of Record，不互相推断；projector在两者汇合后才决定 severity。Authority parent不可用时不把 rows/findings当空集合；current demand的family不可用时只产生一个family prerequisite并屏蔽dependent omissions；legacy-only finding仍直接投影accepted per-pair advisory，因为它不失败也不要求伪造一个blocking parent。只有usable parents才进入entry/row/current-finding coverage。Formal Gate保持既有owner，不加入这条链。

### Decision 1: 一个集中 target-section-family map，entry 局部完整、family union 覆盖

在 `return-map.mjs` 集中定义 wave 到 accepted section 的映射。Section extractor 接受 harmless heading whitespace 和现有 base heading 的 presentation suffix，但不接受任意别名或新 header family。每个 section 以命中的 H2 到下一个 H2 为边界。

处理顺序：

1. 读取 seed file；
2. 运行既有 target-wave token filter；
3. 提取当前 wave 的 section family；
4. 在各 section 内解析 entry 和 optional entry-start metadata，禁止把字段或 metadata 跨 entry/section 拼接；
5. 对每个非空 target entry 独立运行五字段、enum、concrete navigation，以及 accepted contract 已明确为 per-statement 的 Wave1 lineage validation；
6. 对 valid target entries/refs union 运行 Wave2 family ledger/index lineage 和 demand-driven per-row/per-finding coverage check；不另设无 authority demand 的 generic minimum-entry quota。

Wave1 mechanism、trend 和 pending-question sections 各自保持 entry boundary；一个 entry 缺字段、concrete reference 或 accepted per-statement Wave1 lineage 时，不能借 sibling entry 通过。但 `RRM-007` 没有要求 mechanism、trend、pending-question 三个 section 各自都必须存在 entry，也不要求一个无 current authority demand 的空 family 凭空生成 entry。已有 valid entries 在 union 上检查 family lineage 和 row coverage；一条 submitted row 只需在 union 中被精确引用/处置一次，不要求复制到每个 section。Wave2 的 ledger/index refs 保持 accepted family-level predicate，W2F exact refs由 finding-topic coverage保证；本 change不要求每条泛化 `## 当前判断` entry 都独立带 W2F。

`## 待验证问题` 是共享 physical section，需要 logical entry selector：Wave1 只消费 parsed `refs` 不含 exact W2F token 的 entries；Wave2 只消费 parsed `refs` 含 exact `W2F-[0-9]{3,}` token 的 entries，并与 Wave2-owned `## 当前判断` union。不能因 `evidence_meaning` 或 `next_hop` 提到 W2F 就改变 owner。Finding-index 提供 expected W2F set，所以 finding 完全未写入 seed 时仍由 per-topic omission捕获。`__BACKFILL_PENDING_QUESTIONS__` 继续只属于 Wave1，不能让 Wave2 skip。

现有 parser 以 `evidence_meaning` 开始 entry，canonical field set 固定为五个字段。Apply SHALL 扩展 entry boundary parser，在同一 Markdown list item或连续 canonical-field block内把出现在首个 canonical field 前或后、且与该 entry 同级/continuation indentation 的 `entry_id` 记录为 `metadata.entry_id`；它不进入 `fields`、不参与 required-field list。前置 metadata只有在下一个 nonblank contract line 是该 block 的 canonical field时才可绑定。同级或更浅缩进的新 peer list item、下一个 `evidence_meaning` entry start、下一个 H2 或非 contract prose block都会关闭当前/pending entry；active `refs` 下更深缩进的 bullet仍是该 field 的 continuation。悬空 metadata、一个 entry 多个 `entry_id`、或 metadata 跨上述 boundary 都是 local identity-shape failure，不能用全文 grep 绑定。

Heading matcher 接受 base heading 后由 whitespace、`(`、`（`、`:`、`：`、`-` 或 `—` 引入的说明性 suffix，例如 `## 当前判断（更新于 rerun_count=5 深挖后）`；不接受无 delimiter 的更长名称。Plan-bound seed file 必须先可读且保持 canonical topic/seed binding。Apply 应从 `canonical-topic-state.mjs` 抽取/导出其现有 `canonicalBinding()` focused evaluator（topic UID、slug、id、title、must_answer、scope_role、depends_on_topic_uids 全等），使 return-map 只消费该 binding fact，不调用还包含 submitted progress/workspace 检查的整个 `inspectCanonicalTopicState()`。文件缺失或 binding invalid 时，Wave inspect 产生一个窄 canonical seed-binding prerequisite；它使用 canonical owner 的 `missing_contract` 边界和 `operate-topic-state inspect` 诊断入口，但 `rerun` 仍是当前 Wave inspect。该 root 屏蔽 family/row/finding symptoms，不能降成 seed-section `agent_action`，也不声称 Wave inspect 以前已发出同一 finding。对可用 seed，一个 multi-section family 不要求每个 member H2 都存在；只要至少一个 member occurrence 可定位，就有合法 projection surface。多个同名 canonical occurrences 各自按“当前 H2 到下一个 H2”解析并纳入同一 family union；`RRM-007` 不把重复 heading presentation 升级成自己的 blocking root，placeholder 唯一性仍由既有 skeleton owner 裁决。只有所有 family members 都缺失时 family unavailable。Current-wave token 先于 family extraction 保留 accepted skip；无 token 时，family unavailable 只对 current eligible row/current affected finding 形成 blocking prerequisite，legacy-only finding 按 finding/topic pair 形成 advisory，无 demand 的历史 seed 不产生 migration finding。Family 可用后，现有 malformed/evidence-bearing entry 继续产生本地 blocking finding。依赖 unavailable family 的 row/finding omission 被 mask，不从全文件寻找替代内容。本 change 不借 `RRM-007` 新增比 seed skeleton 更严格的无条件 section-existence requirement。

**Alternatives considered:**

- 继续全文件 validator，再额外 grep work_id：仍允许跨 section masking，拒绝。
- 为每个 wave 写独立 parser：产生三套相似 truth path，拒绝。
- 要求每个 Wave1 section 都独立包含五字段 entry：超出 `RRM-007` 且制造重复内容，拒绝。
- 把共享 pending section 整块同时交给 Wave1/Wave2：会发生跨 wave entry masking，拒绝。
- 对 family text 聚合运行 Wave1/Wave2 lineage regex：允许一个合法 entry 掩盖 sibling entry，拒绝。
- 用全文 grep 读取 `entry_id`/W2F/work_id：丢失 entry/refs boundary，拒绝。
- 立即重命名 header 为 Wave0/Wave1/Wave2：属于 Change B/兼容性范围，拒绝。

### Decision 2: Submitted reader owner 先归一化 facts，再派生 eligible projection

在 `gate-helpers-readers.mjs` 的 submitted declaration owner 内增加一次解析的 normalized fact reader（exact export name 由 apply 决定）：

```text
{
  facts: [{ ledger_row, index_record }],
  legacy_non_work_unit_rows
}
```

它复用当前 schema/hash/late-accept checks，在同一次 index load 中保留与每个 accepted ledger row 配对的 index record。既有 `readSubmittedWorkUnitDeclarations()` 从 normalized facts 投影 `ledger_row[]`，保持所有当前消费者 API/throw semantics 不变。窄 helper 固定由新的 `DPT_FRAMEWORK/engine/work-unit-projection.mjs` 拥有，`collectEligibleRows()` 与 return-map 都消费它派生的：

```text
{
  passed,
  rows: [{ work_id, rerun_count, kind, result_path, topic_uid, topic_slug, accepted_slugs }],
  root_findings,
  warnings
}
```

该窄 helper 只拥有 `RRM-007` 所需的 direct facts：

- 解析并验证 profile current `rerun_count`；
- 通过 normalized facts 复用 submitted ledger/index identity、hash binding 和 paired index round，不第二次私读 `_index.json`；
- 读取对应 submitted manifest，复用 `readAndValidateManifest()` 的 schema/ledger-index-manifest identity；再用现有 pure `queueItemSnapshotHash(manifest.queue_item)` 重算 snapshot 并与 index/manifest immutable hash 比对，不能只比较两个可能共同漂移的 stored hash；通过同一 invocation topic-registry/layout fact 解析 manifest snapshot topic binding；
- 要求 ledger/index 已声明的 canonical `result_path` 为安全 bundle-relative regular file 且存在；不在这里重验 result content/hash、active/terminal queue state、receipt、cache trail、lease、beacon、transaction 或 orphan directory；
- 没有任何 work-unit submitted declaration 时，该 reader/projection 返回合法 empty rows；existing Wave evaluator 的 submitted-index-without-declaration recovery root 仍独立运行并可使 command fail。一旦存在 declaration，ledger/index/manifest/result-path/queue-snapshot/canonical-layout authority不可读或不一致时 `passed:false`，不把损坏authority投影为空rows；
- 按既有 Engine-owned index `rerun_count == profile.rerun_count` 过滤；
- 通过 canonical topic layout resolver 把 UID、current slug 和 previous slugs 绑定到同一个 current topic；
- legacy row 保持既有 excluded + warning 语义；
- 一次加载后按 topic 分组，避免每个 seed 重读整个 work-unit tree。

Import 方向固定为 `work-unit-projection.mjs -> helpers/gate-helpers-readers.mjs` 的 normalized facts、`work-unit-validation.mjs#readAndValidateManifest()` 和既有 queue/topic pure helpers；`work-unit-inspect.mjs` 与 `helpers/return-map.mjs` 只能向下消费 projection API。`gate-helpers-readers.mjs` 不得 import `work-unit-validation.mjs` 或 projection module，manifest validation 不得搬进 reader，return-map 不得自己配对 ledger/index/manifest。这个落点保持依赖图无环，也保持 normalized submitted reader 作为 ledger/index pairing 唯一 owner。

`operate-work-unit inspect --eligible-rows` 与 return-map checker 消费同一 eligible result。完整 `inspectWorkUnits()` 继续独立拥有 work-unit health verdict，CLI 可先运行它再暴露 eligible rows，但 return-map checker 不因无关 health issue 产生 projection-parent failure。这样 normalized reader 是既有 owner 的 richer return，不是第二 validator；旧 reader API 保持兼容。

**Alternatives considered:**

- 在 `return-map.mjs` 读取 `_index.json`/ledger/manifest：重复 authority logic，拒绝。
- 先调用 ledger-only reader、再由 eligible helper 第二次读取 index：同一 invocation 有两个 pairing path，拒绝。
- 直接调用当前 `collectEligibleRows()` 并忽略 warnings：authority parse failure 会 false pass，拒绝。
- 直接把完整 `inspectWorkUnits()` 作为 projection prerequisite：重复高成本 health checks，并把 receipt/cache/lease 等非 projection facts 变成错误 root，拒绝。
- 让 Agent 先运行 CLI、再把 JSON 传给 inspect：跨 tool-call projection 不是 direct authority，拒绝。

### Decision 3: Per-row coverage 只使用 parsed refs exact token 或 entry-local metadata

对 Wave0/Wave1，每个 current-round row 的 canonical topic binding 决定目标 seed。Checker 只在对应 wave target-section-family parsed entries 中寻找：

- parsed `refs` 含边界完整的 exact `work_id` token（bare token 合法），或含 work-unit directory segment 精确等于该 `work_id` 的 concrete path，或 entry-local `metadata.entry_id` 精确匹配 `<work_id>/<n>`；或
- 同一 `work_id` 有精确绑定的合法 no-projection disposition。

No-projection disposition 复用 accepted predicate：`relationship: defers` OR `status: deferred`，并带 limitation reason。它还必须通过 parsed refs 中 exact work-id token/path segment，或 entry-local `metadata.entry_id` 绑定一个 row。`refs: none` 只表示没有 projection ref，不能提供 row identity；仅当同一 entry 的 metadata 已精确绑定 row 时才可接受。普通 prose、substring 或 path-prefix collision 不算 projection；`entry_id` 不成为历史 entry 的第六个 universal required field。

每个遗漏 row 产生一个 stable finding instance，但 primary feedback 按 seed/section 聚合为最小可执行 root set；不会把同一个 row 扩张成 field/ref/coverage 三个独立修复任务。

**Alternatives considered:**

- At-least-one row coverage：多 row 只投影一条仍可过，拒绝。
- 要求每个 row 出现在每个 Wave1 section：制造重复内容，拒绝。
- 允许匿名 `refs: none` disposition：一条 limitation 可错误覆盖多个 rows，拒绝。
- 自动从 result 写 seed：Engine 越过 Agent semantic ownership，拒绝。

### Decision 4: Wave2 复用 parse result，并由 inspect-only normalized parent拥有 topic/round binding

Wave2 inspect SHALL 在一次 invocation 内加载一次 finding-index parse fact，并把它同时传给 existing formal evaluator 与 return-map normalized projection parent；formal Gate 未预载时保持现有 reader/API/verdict。必要时只导出 pure loader 或给 existing evaluator 增加 optional loaded input，不复制 YAML parsing。Projection parent 直接组合 `topic-layout.mjs` 已有 canonical layout facts 与 pure resolver semantics。对每个 string token，它分别按 exact UID、current/previous slug 和 legacy id forms 求 canonical topic-key candidates，再去重：恰好一个 candidate 才成功，零个是 unknown，多个是 ambiguous；同一 finding 内多个 alias 若归一到同一 canonical key，只产生一个 topic projection demand。它不建立第二份 token-owner map，也不要求 `evaluateWave2PairFacts()` 改用新 helper。这样复用 canonical topic truth 而不改变 formal Gate 已消费的 pair-fact behavior。该 parent 验证 projection 所需的 `id`、`affected_topics` array/token 和 optional round marker type/relation，再按 resolved topic UID 分组：

- 只在 finding 实际 affected 的 current seed 中检查 W2F projection；topic A 的 ref 不得满足 topic B；
- unknown/ambiguous token、malformed `affected_topics` 或 invalid/future round marker 产生 inspect-only projection prerequisite root，write surface 为 exact finding-index field；projection omission 被 mask；
- `affected_topics` 可用后，再按 round 分类执行下面的 blocking/advisory policy。

- `created_in_rerun_count == profile`：current，缺 projection 是 blocking。
- marker 缺失或小于 profile：legacy，缺 projection 是 advisory。
- marker 非 non-negative integer 或大于 profile：inspect-only invalid round-binding prerequisite，不归入 current/legacy，并 mask dependent projection symptoms。
- profile SHALL 先通过现有 Profile contract；只有合法 `human_decision_checkpoints.hitl2` parent 下缺失 `rerun_count` 才归一为 `0`。Unreadable profile、缺失/畸形 parent 或 present-but-null/string/negative/fractional value 是 profile-round prerequisite failure，不能 fallback 到 `0`。
- pure synthesis finding 与 targeted finding 都进入 projection scope；targeted backing 继续由现有 Wave2 evaluator裁决，return-map checker 不复制 backing validator。
- Missing/unparseable/non-object YAML 或 non-array `findings` 是 projection-wide parent，复用 existing root 并 mask 所有 dependent omissions；missing/invalid W2F `id` 复用 existing formal root并只mask该 finding。`affected_topics`/round binding由inspect-only exact-field rule报告。其他 scan、eligibility、backing、handoff或unrelated per-finding formal defects继续由existing evaluator独立报告，但不阻止projection fields可用的其他 finding/seed checks。

### Decision 5: 复用现有 finding projection 与 CLI aggregate contract

Section/row/finding issues 使用 `makeContractFinding()` / `returnMapFinding()` 的现有结构，并由 `projectInspectContract()` 聚合。新增/稳定的 rule ids 应区分：

- target section missing/ambiguous；
- target section shape/ref failure（继续复用现有 return-map rule ids）；
- submitted projection authority prerequisite（复用 direct authority owner 的 root）；
- current-row projection omission；
- affected-topic / invalid-round projection prerequisite（inspect-only stable rule，exact finding-index field repair）；
- current finding omission（instance 按 finding/topic pair 唯一）；
- legacy finding advisory（instance 按 finding/topic pair 唯一）。

Existing seed 内的 section/entry/row/finding omission roots 使用 `repair_kind: agent_action`、section-qualified `missing_fact`、seed file `write_to` 和当前 inspect CLI exact rerun。Missing/unbound seed file 使用 Wave inspect 新发出的窄 canonical seed-binding prerequisite；它复用 canonical-topic-state binding 语义和 owner 边界，不伪装成 section edit。Finding `affected_topics`/round field roots 同样是 `agent_action`，但 `write_to` 指向 exact finding-index field。Submitted ledger/index/manifest authority root SHALL preserve existing owner classification（通常 `missing_contract` 或已有 legal Engine operation）和 authority boundary，绝不能建议手改 Engine-owned files。Inspect 不写 trace/status/cache。Formal Gate 当前不消费 return-map evaluator，本 change 不增加该 wiring，也不要求 formal Gate 复述这些 rule ids。

所有三条 Wave inspect CLI SHALL 在一次 invocation内只构造一次 normalized canonical topic-registry fact。该 fact 包含 canonical registry rows 及从中派生的 legacy-compatible `topicLayouts()` view；Wave evaluator 只消费后者时的 target expansion/verdict 不变，seed/topic binding 则消费完整 rows。CLI 把同一 fact传给 Wave evaluator与 seed checker。Apply给 `evaluateWaveNContract()` 增加 optional preloaded input；formal Gate未提供 input时继续走原 `topicLayouts()` 读取路径，API/verdict保持兼容。该 fact 复用既有 canonical Plan schema/interpretation，不建立新 PlanSchema 或第二 validator。Wave2不得继续通过 directory scan推断 topic集合；Wave0/1 CLI当前的 raw plan二读也应删除。若 invocation fact已有 plan root，seed binding/family/coverage 依赖症状 mask。每个 seed/wave 的 family availability 与 demand 使用下表；current-wave token 已在此矩阵之前 skip：

| Family / demand | Inspect classification |
|---|---|
| family usable，存在 malformed/evidence-bearing target entry | entry-local blocking；不由 sibling mask |
| family unavailable，存在 current eligible row 或 current affected finding | 每个 seed/wave 一个 blocking family prerequisite；屏蔽 dependent row/finding omissions |
| family unavailable，仅存在 legacy affected finding | 每个 finding/topic pair 一个 advisory omission；不制造 blocking family prerequisite |
| family unavailable，无 current/legacy demand | no finding；不迁移 inactive historical seed |

Family usable 后，row omission按 row、finding omission按 finding/topic pair保留 stable instance；同一 direct parent/field prerequisite只报一次，dependent siblings被 mask。

Coverage 归因优先于 omission 展开：若一个 invalid entry 已经通过 exact parsed refs 或 entry-local metadata 声明某 row/finding identity，则该 entry 仍不能满足 coverage，但它自己的 shape/navigation/lineage root 是最近修复面；同一 identity 的 dependent row/finding omission 在该轮被 mask。只有 family 内完全没有 exact identity candidate 时，才发出 row 或 finding omission。这不允许 prose、substring 或 anonymous `refs: none` 成为 candidate。

### Decision 6: Strict authority, tolerant presentation

Blocking 保护的是 demanded section availability、machine-parseable entry fields、per-entry concrete navigation/lineage、round/provenance binding，不保护 bullet、bold、空行等 presentation preference。现有 balanced-bold 与 harmless heading tolerance 保持。Canonical field misspelling、demanded target section 缺失、跨 entry/section substitution 和 unbound current row 仍 blocking。

### Decision 7: Verification 只证明 deterministic contract

选择 `unit`、`integration`、`deterministic_e2e`：

- unit 证明 section boundary、独立 shape validation、disposition 和 prerequisite masking；
- integration 证明真实 inspect CLI 的 pass/fail/classification/repair coordinate；
- deterministic e2e 证明 production rerun chain 中 current-round submitted authority 不能被 prior/other-section projection替代。

不选择 `agent_flow_e2e`，因为 change 不声称 Agent 会更聪明或改变 Markdown flow；proof subject 全是 deterministic contract。

### Apply Target Manifest

| Surface | Add / modify | Remove / avoid |
|---|---|---|
| `DPT_FRAMEWORK/engine/helpers/return-map.mjs` | target-section-family map/extractor、entry-local fields/metadata/refs、accepted-granularity validation、family coverage、per-row/per-finding findings | 删除 whole-seed field/concrete-ref 与 Wave1-statement aggregate masking；保留 Wave2 family lineage，避免内容配额/全文 grep/duplicate parsers |
| `DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs` | 一次 index load 的 normalized submitted `{ledger_row,index_record}` facts，旧 reader 从中投影 | 避免 ledger/index 二次 pairing，保持旧 API/throw semantics |
| `DPT_FRAMEWORK/engine/work-unit-projection.mjs` | 向下消费 normalized reader + manifest/queue/topic pure validators，拥有窄 current-round result、manifest snapshot/topic binding projection | 保持 acyclic imports；删除 warning-as-empty ambiguity，避免完整 health inspect 成为 prerequisite，避免 reader/return-map 自验 manifest authority |
| `DPT_FRAMEWORK/engine/helpers/topic-layout.mjs` | 无必需行为改动；复用 existing canonical layout facts / pure resolvers | 不为本 change 建第二 token map，不改变 pair-fact behavior |
| `DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs` | 导出 existing pure finding-index loaded fact或接受 optional preloaded fact；formal evaluator/inspect projection同 invocation复用 | 避免第二 YAML/finding parser、第二 backing validator或 formal Gate 行为变化；unrelated formal defects不mask projection |
| `DPT_FRAMEWORK/cli/operate-work-unit.mjs` | 消费 shared eligible-row result，保持 CLI shape/exit semantics | 避免 CLI 与 checker 不同 round filter |
| `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` | 导出 canonical registry/seed-binding focused evaluator，不强制运行完整 topic-state inspect | Wave inspect 复用 UID-bound seed invariant，不引入 submitted progress/workspace prerequisites |
| `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs` | Wave evaluator可选消费 invocation-preloaded fact 中的 compatible layout view | formal Gate未传参时保持原 API/verdict；不新增 Plan validator |
| `DPT_FRAMEWORK/cli/inspect-wave{0,1,2}-output.mjs` | 每次 invocation构造一次 plan fact并同时传给 Wave evaluator/seed checker | 删除 Wave0/1 raw plan二读与 Wave2目录推断；不新增 CLI/routing，不向 formal Gate 接线 |
| focused tests | section isolation、rows/findings、root-first、CLI/e2e proof | 删除/改写声称 RRM-007 已覆盖但只测 eligible-row query 的弱断言 |
| release docs | `v0.35` CHANGELOG/RUN banner | 不改 runtime bundle data |

## Risks / Trade-offs

- **[Existing bundles have missing or presentation-variant sections]** -> 保留 harmless suffix/spacing tolerance；current token先 skip，current row/finding demand才使 unavailable family blocking，legacy-only demand保持 advisory，无 demand不迁移旧 seed。
- **[Authority loading becomes expensive]** -> 每个 inspect invocation 只加载/验证一次，按 topic 分组传入 seed loop；不按 file 重跑 full work-unit inspect。
- **[Circular imports between return-map and work-unit helpers]** -> `work-unit-projection.mjs` 固定向下依赖 normalized reader/manifest/queue/topic helpers，`work-unit-inspect.mjs` 与 return-map 向下消费它；gate reader 不反向 import projection/validation，并以 static import regression 防止依赖环。
- **[Wave1 target-section requirements over-block legitimate distribution]** -> 每个存在的 entry 独立完整/lineage-valid，family union只承载 existing lineage 和 demand-driven row coverage；不要求三个 section 各自有 entry，也不设无 authority demand 的 generic entry floor。
- **[Multiple missing rows create noisy feedback]** -> stable instance findings保留审计细节，primary inspect按 seed/section聚合并给一个修复动作。
- **[Wave2 parent/topic binding and projection findings cascade]** -> finding-index parse/shape/`affected_topics` binding root 优先，per-finding projection checks mask；A topic 的 projection 不得替 B topic 通过；canonical resolver复用不得改变 formal pair facts。
- **[Historical RRM-007 claims are over-trusted]** -> apply evidence必须逐 scenario列出真实 test command/result，不引用旧 checkbox或 CHANGELOG作为 proof。

## Migration Plan

1. Apply 前运行 verification routing plan check，并先提交能复现 cross-section false pass 的 failing tests。
2. 实现 shared authority result 和 target-section parser/checker。
3. 运行 unit、integration、deterministic e2e 与适用 regression。
4. Bump `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 到 `v0.35`。
5. 不修改现有 runtime bundles；它们在下次 inspect 时按新 checker读取，合法 presentation继续兼容。
6. Rollback 为回退 framework code/release docs；没有 schema/data migration需要反向处理。

## Open Questions

无需要用户决定的开放语义。Apply 时的 exact export/rule id 可由现有 naming/test conventions决定，但 projection 模块与 import 方向已固定，不得改变上述唯一 authority、classification 和 repair边界。
