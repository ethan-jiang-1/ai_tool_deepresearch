## Why

BUG-132 证明当前 Wave0 Seed Topic projection 的完成条件只覆盖到
submitted `work_id`，却没有覆盖该 work-unit 的 result 所声明的
`artifacts/wave0/<topic>/source.yaml` 当前内容中的每一条候选来源。一个 source
intake 可以返回多个 schema-valid candidate，但一条泛化或仅按 work-id 绑定的
entry 就能让当前 reader 误报完成；后续 Agent 无法从 Seed Topic 精确知道每个候选
去了哪里，或为何被明确延后。原始问题和系统性切分见
`_backlog/bugs/BUG-132-wave0-seed-backfill-thin-candidate-projection.md` 与
`_backlog/plans/wave-projection-and-lifecycle-convergence.md`。

这里必须保留一个容易被混淆的事实边界：accepted `result_hash` 绑定的是已提交
result/output declaration，而不是 `source.yaml` 字节的永久快照。每次 inspect 对
result 所声明的安全 direct output 重新作当前求值，才是这个 change 的 source-array
事实。现有 direct-output contract、Wave0 Projection Packet writer 和共享 readiness
evaluator 已分别拥有所需的解析、原子写入和 inspect/gate seam。本 change 只让它们
对同一个候选级 direct fact 作出一致判断，不把 Seed Topic navigation 错当成新的
evidence authority。

## What Changes

- 将 Wave0 current-round projection demand 从“每个 eligible submitted
  `work_id` 至少一处”精确为“该 `work_id` 的已验证、result-declared
  `source.yaml` 当前数组中每个 1-based ordinal 都有一条可导航 entry 或 exact
  identity-bound deferred disposition”。候选 coordinate 固定为
  `<work_id>/<source.yaml 1-based ordinal>`，并与 Wave0 `entry_id` 相同；
  duplicate URL 仍是两个独立候选，bare `work_id` provenance 不再能替代任何
  candidate coordinate。它是当前 projection coordinate，不是 persistent ID 或
  accepted source-array snapshot。
- 扩展既有 neutral direct-output contract：只有 Wave0 YAML 成功通过
  `ReferenceMetadataArraySchema` 后，成功结果的受限 `snapshot_meta` 才提供
  `validated_array_length`。Wave0 count-floor 与新的窄 candidate reader 都消费这
  一个 scalar；reader 先验证 current submitted row、manifest 的 exact required
  `source_yaml` tuple、hash-bound result 与 output declaration，才从长度导出坐标。
  direct-output 模块不得返回 raw/decoded bytes 或 entries，reader/evaluator 不得
  再解析 YAML、扫描 artifacts 或建立 source catalog。
- 让同一个 evaluator 在 inspect 和 formal Wave0 gate 中作 candidate-level
  coverage 判定，且保留 root-first 顺序：registry/seed/submitted-source parent
  不可用时先报告 parent，随后才报告某一个 exact coordinate 的缺失；无效 local
  entry 不产生无关 candidate 的噪声。合法 `defers/deferred` entry 必须带 exact
  coordinate 和 `next_hop` limitation，不能用 generic `Wave0 submitted` prose
  或 anonymous disposition 覆盖候选。
- 更新 Seed Topic template 的 Wave0 card、`operate-topic-state` projection
  guidance 和 Wave0 closeout guidance：ordinal 是 current result-declared
  `source.yaml` array ordinal，单个 Wave0 packet 可以为同一 work-id 带多条
  entries；Agent 使用既有 packet -> writer -> same Wave inspect loop，不手改
  Seed Topic 或 source authority。
- 这是 framework behavior change；apply 时版本升至 **v0.54**，同步
  `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。不改变 source acceptance、source
  floor、reference materialization、Wave1 backing、degradation policy、receipt、
  ledger 或 lifecycle 状态。

### Semantic Precision, Control, And Responsibility

`current Wave0 candidate coordinate` 是给 Wave0 closeout Agent、future Seed Topic
reader 和 deterministic evaluator 的一个有界语义层：它只回答“这个 current,
result-declared source intake 中的每一条 candidate 是否已有可导航 entry 或诚实的
deferred disposition”。它不回答来源是否可信、是否为 accepted evidence、是否必须
生成 rich reference，或是否满足 source floor。因而它保留会改变答案的
current-vs-historical row、result/output binding validity、array ordinal、duplicate
candidate、entry-vs-deferred disposition 区别；一旦每个 coordinate 被 exact
entry/disposition 覆盖，reader 可以停止而不必重建 ledger、manifest、result 或任意
Markdown prose。它准确地不承诺 source bytes 的历史快照。

最短合法闭环是：current submitted row + hash-bound result-declared output -> one
shared direct-output cardinality -> one candidate projection result -> Agent
forms/repairs existing Wave0 packet -> existing atomic writer -> same
`inspect-wave0-output` -> existing formal gate。Wave0 count-floor 同时消费该 direct
result，而不再重读/重解析 YAML。这替换了“一个 work-id 代表全部 source array”的
不完整成功路径，避免了每个 caller 自行解析 YAML、增加新 source catalog、second
writer、controller、watcher、retry tree 或 persistent candidate state。Engine 只读取
direct facts 并给出 root-first deterministic verdict；Agent 在既有 Wave0 window 中做
entry 意义、defer reason 和 packet 的机械形成/修复；用户只在真正的新研究语义、risk
或 permission 需要决定时介入。用户请求本身不创造 writer 或 authority。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `research-return-map`: `RRM-003` SHALL teach the Wave0 candidate-coordinate
  entry convention, and `RRM-007` SHALL require candidate-granular rather than
  only parent-work-row coverage for current result-declared Wave0 source arrays.
- `research-wave-gate-implementation`: `RWG-018` SHALL allow the successful
  Wave0 direct-output result to expose only `validated_array_length`, require
  its Wave count-floor consumer to reuse that result, and retain the no raw
  bytes/no second parser boundary for all adapters.
- `seed-topic-materialization`: `STM-001` SHALL make the Wave0 read-only card
  identify the current result-declared `source.yaml` array ordinal as the
  meaning of its existing positive ordinal, without moving packet protocol into
  the template.
- `research-wave-phase-content`: the Wave0 closeout portion of `RWP-016` SHALL
  direct one packet entry or identity-bound disposition per current
  result-declared source-array candidate, then the existing same-inspect loop.

## Impact

- Framework code: the neutral direct-output contract, Wave0 count-floor route,
  submitted-work candidate projection reader, `return-map` readiness path and
  their focused tests; they reuse `ReferenceMetadataArraySchema` and the
  existing topic-state packet writer.
- Framework guidance: Wave0 card/template, Wave0 phase closeout, shared
  return-map authoring and existing `operate-topic-state` packet example.
- Verification: short focused `unit` assets prove direct-output cardinality,
  strict candidate authority binding, exact-coordinate coverage and unchanged
  Wave1 behavior; temporary-bundle `integration` assets prove public packet
  apply plus shared inspect/formal-gate consumption. The Markdown contract
  asset guards template/renderer/playbook parity. `deterministic_e2e` and
  `agent_flow_e2e` are not applicable because this is a bounded deterministic
  navigation contract, not a multi-wave chain or Agent-behavior claim.
- Governance/release: delta specs modify only existing requirement IDs; the
  change root supplies `verification-plan.yaml`, and apply/archival tasks run
  the routing and requirement/spec governance checks. No dependency is added.
