# Proposal: carve-canonical-topic-state

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W2，AUD-1 §1 排名第 1）。**流程注记（诚实记录）**：本 change 的搬动 codemod 在 change 目录建立之前先行执行——违反 phase gate 顺序；发现后立即补建全套工件，且搬动为 move-only、经 W1 行为基线 + 全量回归验证零行为漂移。此顺序违规登记为过程缺陷，不改变工作内容的有效性。

## Why

`canonical-topic-state.mjs` 是 C4 后 engine 最大文件（1879 行，32 个消费者），五个关注簇（plan schema/introspection、bundle IO、wave-projection 写引擎、inspect 读模型、transaction core）交错。AUD-1 判定：零模块级可变状态、零环、测试安全网最强（4/5 簇符号级 + crashAt 注入 + e2e 环）——是下一优先切缝目标。

## What Changes

- 4 个新模块（move-only，函数体逐字搬运 + export 前缀）：
  - `topic-state-plan-schema.mjs`（~663）：plan zod schemas、schema introspection、validation projection（纯计算无 fs）；
  - `topic-state-bundle-io.mjs`（~177）：bundle/seed IO 原语、workspace 路径、seed render、`evaluateCanonicalSeedBindings`（下沉基层，供全部流）；
  - `topic-state-wave-projection.mjs`（~389）：wave projection 写引擎、authority 检查、slot 物化；
  - `topic-state-inspect.mjs`（~263）：inspect 读模型、blockers、progress rows。
- 主文件保留 transaction core（lifecycleAuthorization/buildMutation/apply/recover）+ facade re-exports（`TOPIC_STATE_SCHEMA_VERSION`/`TopicApplyPlanSchema`/`describeTopicApplyPlanSchema`/`projectTopicApplyValidationErrors`/`evaluateCanonicalSeedBindings`/`inspectCanonicalTopicState`）+ topic-schema-projection passthrough。
- **不产出**：任何行为变化；公开导出面变化；T6 式的 validateSubmitPlan/recovery 管线合并。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
（无——`skip_specs: true`，纯内部布局搬动。）

## Impact

- 4 新模块 + 主文件 1879→604 行；32 消费者经 facade 零改动；新增 W1 基线测试守护。
- `tests/integration/md/canonical-topic-state-contract.test.mjs` 源文本锁重指到模块族（helper 读五文件并集）。

## Capability Discovery

Evidence read：CTS 相关 main spec + 32 消费者清单（AUD-1）+ 模块导出面盘点。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/canonical-topic-state` | CTS-001..012 现行文本 | Excluded | 纯内部布局搬动，requirement 零变化 |
| `engine/framework-engine` | 导出面 grep 前后对照 | Excluded | 公开接口零变化 |
