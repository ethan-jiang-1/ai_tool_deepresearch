# Proposal: make-feedback-name-contract-roots

## Why

一次完整 real-actor Deep Research run（`dpt_rb_enterprise-ai-harness-platforms`，
HITL1→Wave0→Wave1→Wave2→HITL2→Final）中，Phase Agent 遇到 5 个"确定性规则存在但
Agent 看不见"的摩擦点：Engine feedback 泛化、schema 显示不全、指引/模板漏掉隐藏规则，
导致每个点都要 1-3 个修复轮次才能继续（BUG-206/207/208/210/211）。核心问题是
Engine 知道缺哪个契约事实，但 feedback / schema / guidance 没有把它讲出来。

## What Changes

- **BUG-206**：reference `acceptance_status` 的 `accepted :warning:` 值必须可写为合法
  YAML（引号约束入文档），且 frontmatter 解析失败时错误信息点名出错的 key/value，
  而不是泛化 "YAML parse failed"。
- **BUG-207**：`operate-topic-state schema --context wave_projection` 的输出按
  wave/slot 展开允许的 `source_identity` forms（wave0/1 为 `submitted_work`，
  wave2 为 `finding`），使作者仅凭 schema 输出即可构造合法 apply packet。
- **BUG-208**：Wave2 finding-index 契约文档化 `created_in_rerun_count` currentness 与
  3 位 `W2F-\d{3}` id 格式；apply 反馈点名缺失/不匹配的 currentness 事实。
- **BUG-210**：Wave1 supplementary deepening work unit 提交后，depth-review
  `reviewed_work_unit_refs` 需要包含它；reference-floor-deficit 反馈点名该更新，
  不再让补充证据看起来"没效果"。
- **BUG-211**：Wave1 canonical reference 文件名的确定性推导（`{slug}-{host+path
  token}-{12-hex}`）在 Agent-facing 指引中可见，inspect 对每个未闭合 candidate 给出
  canonical 名，而不是要求 Agent 读 engine 源码。

这些都不改变 evaluator 的合法接受/拒绝集合（除 206 引号约束这一文档化选择）；
只改变"反馈/显示/指引如何点名确定性契约根"。**BREAKING**: 无。

## Capabilities

### New Capabilities

无——本 change 只修改既有契约的可见性/文档，不引入新行为面。

### Modified Capabilities

- `bundle/reference-flat-format`: acceptance_status YAML 引号约束与 canonical Wave1
  locator 推导的 Agent-facing 可见性（BUG-206, BUG-211 文档面）。
- `engine/check-inspect-feedback`: Engine feedback 对泛化解析/校验失败必须点名缺失
  契约事实、授权写面与同一 checkpoint rerun（跨 BUG-206/207/208/210/211 的反馈面）。
- `research/canonical-topic-state`: `operate-topic-state schema` 按 wave 显示
  `source_identity` forms（BUG-207）。
- `research/wave1-intake`: supplementary depth-review 同步与 reference-floor-deficit
  反馈点名该同步；canonical reference 文件名推导反馈可见（BUG-210, BUG-211 反馈面）。
- `research/wave2-synthesis`: finding-index currentness 契约（`created_in_rerun_count`
  与 3 位 id）文档化 + apply 反馈点名缺失事实（BUG-208）。

## Impact

- **代码面**（apply 阶段才改，本 change 不触碰）：
  - `DEEP_RESEARCH_HARNESS/engine/helpers/markdown-semantic-sections.mjs` 不在本
    change 范围（BUG-205 归 Change 2）。
  - `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`（schema 显示、
    wave2 finding currentness 反馈）。
  - `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs` /
    `gate-helpers-checks.mjs`（frontmatter 错误点名、reference 收敛反馈）。
  - `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-reference-template.md`、
    `shared-schemas.md`、`workflows/nodes/phases/phase-wave1.md` 指引文档。
- **版本**: 修改 `DEEP_RESEARCH_HARNESS/` 行为与指引 → 需要 version bump，目标
  **v0.77**（implementation 阶段更新 CHANGELOG 与 RUN.md banner）。
- **依赖**: 无新增 npm 依赖；仅 Node 内置 + 既有 zod/yaml。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|----------------|---------------|----------|--------|
| `bundle/reference-flat-format` | main spec（REF-001..009，命名/前缀/locator 契约） | Modify | acceptance_status YAML 引号与 canonical locator 推导的可见性归属此契约 |
| `engine/check-inspect-feedback` | main spec（CHI-001..004，根因优先/反馈驱动纠正） | Modify | 泛化错误点名契约根是 feedback 契约的核心义务 |
| `research/canonical-topic-state` | main spec（CTS-001..009，topic-state writer/seed projection） | Modify | `operate-topic-state schema` 的 wave 感知 `source_identity` 显示归属此 writer 契约 |
| `research/wave1-intake` | main spec（WAI-001..008，深度/参考物化/depth-review） | Modify | supplementary depth-review 同步与 canonical 文件名反馈归属此契约 |
| `research/wave2-synthesis` | main spec（WTS-001..011，finding taxonomy/一致性） | Modify | finding currentness（`created_in_rerun_count`、3 位 id）归属此契约 |
| `research/seed-topic-materialization` | main spec（seed projection writer） | Excluded | 本 change 不改 seed 物化行为，只改 feedback/schema/文档 |
| `engine/schema-core` | main spec（schema 契约） | Excluded | `operate-topic-state schema` 显示属 topic-state writer 契约，不属 schema-core |

## 语义精度反思（semantic-precision reflection）

本 change 新增/实质改变的具名 reader-facing 面：feedback 错误文本、`schema` CLI 显示、
depth-review 同步提示、canonical reference 文件名提示。读者是 Phase Agent（有界问题：
"这次失败缺哪个契约事实、写去哪、重跑哪个 checkpoint"）。必须保留的区别：合法/非法值、
wave 之间的 source_identity 形式、current 与 stale finding。正常推理停止点：Agent 读到
点名后可直接修复并 rerun 同一 checkpoint，无需回读 engine 源码。

## 责任边界

- 用户：无新语义/风险/权限决定（均为已接受契约的可见性修正）。
- Agent：apply 阶段按 tasks 做机械修复与文档更新。
- Engine：feedback/schema/校验是确定性 verdict 的载体，本 change 只让它更明确。

## Net simplification

本 change 不新增控制层。它删除的是"Agent 必须读 engine 源码或猜契约"这条隐式路径，
把既有确定性事实直接反馈给 Agent——用更直接的反馈替代隐性逆向工程。
