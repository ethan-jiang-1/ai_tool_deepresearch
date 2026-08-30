## Context

- GSK-011（`engine/gate-skeleton`）确立审计姿态：**派生/发现式**（"discover direct read sites rather than maintain a second permanent reader inventory"）、消费共享 schema/parser、不得 regex `failure_message` 推断语义；且已通过 `tests/schema/gate-rule-audit.test.mjs` 尾部用例显式退役规则级目录（`CHECK_IMPLEMENTATION_ROUTES`、`GATE_RULE_INVENTORY_GROUPS`）。
- 现有派生审计覆盖：definition↔CLI 双射 + 共享 loader、逐规则共享 schema 解析、typed descriptor、共享 reader 路由。**未覆盖**：`rule.check` 与 evaluator 实现的静态对应。
- `research/research-wave-gate-implementation` 的对齐 requirement（L1108 起）明文："unknown active check name fails hygiene / static gate audit SHALL fail"——目前该 scenario 无机器执行者（只有 evaluator 运行时 fail-closed）。
- 33 个活跃 check 值；全部 `rule.check ===` 实现比较集中在 `engine/helpers/wave-contract-evaluators.mjs` 单文件（grep 证实其余 engine 文件零命中）；`consistency-validator.mjs` 对 `.check` 零逻辑。
- 降级策略字面量（阈值 `3` + `['phases/phase-wave0.md','phases/phase-wave1.md','phases/phase-wave2.md']`）恰好出现在 3 个 wave wrapper 的 `maybeDegradedHandoff` 内。

See proposal.md – Why。

## Goals / Non-Goals

**Goals:**

- "unknown active check name" 的静态审计落地（shift-left，运行时 fail-closed 之前）。
- 降级阈值与节点清单单一真相源化，3 处拷贝归 1。
- 审计自身同步获得自防：注入未知 check 必须让审计变红。

**Non-Goals:**

- 不改 evaluator 判定逻辑与 fail-closed 行为（运行时兜底保留，静态审计是前置防线而非替代）。
- 不迁移 reference-target descriptor（D3：评估后暂缓）。
- 不扩展 `consistency-validator.mjs`（静态覆盖由派生测试承载即可，避免双实现）。
- 不新增 capability、不改任何 spec 文本。

## Decisions

**D1 — GSK-011 相容性结论：本 change 是姿态内扩展，不是姿态变更。**
逐条对照 GSK-011 文本：(a) "discover direct read sites rather than maintain a second permanent reader inventory"——分发覆盖用**源码反射派生**（正则扫描 evaluator 实现文件），审计运行时才构造集合，无永久清单；(b) 不 regex `failure_message`——本审计只扫 `rule.check` 标识符比较，不碰任何 prose；(c) 全部 definition 读取走既有 `readGateDefinitionSnapshot` 共享 reader；(d) 不复活已退役的目录名。运行时 fail-closed 保留为第二道防线（spec 已有 evaluator-family unknown-check 测试）。备选"把覆盖校验放进 consistency-validator"被否：会造成审计双实现且超出 GSK-011 审计的测试级定位。

**D2 — 分发覆盖的派生源 = `wave-contract-evaluators.mjs` 单文件正则扫描。**
grep 证实全部 `rule.check ===` 比较集中于该文件；审计用 `/rule\.check === '([a-z_]+)'/g` 派生已实现集合，断言 33 个 definition check 值 ⊆ 集合。若 apply 期发现个别 check 以其他形式实现（查表/解构），扩展扫描面到对应文件并在审计内注明——派生面是开放的 discovery，不是封闭清单。正则匹配的是实现源码的标识符比较，与 GSK-011 禁止的 prose-regex 有本质区别。

**D3 — reference-target descriptor 迁移暂缓。**
评估结论：`startsWith('reference/')` 形状嗅探（evaluators L555）的迁移需要全量 definition JSON 与 evaluator 同改并过 e2e 回归，diff 半径与 C3 其余部分不成比例；且 RWG-005 的 typed descriptor 先例仅覆盖 question-list 族。登记为后续独立工作（沿用本 plan 的批三记录），本 change 不做。

**D4 — 降级共享模块落在 `engine/helpers/gate-degradation-policy.mjs`。**
导出 `WAVE_FATIGUE_PHASE_NODES`（三元素数组）与 `FATIGUE_ATTEMPT_THRESHOLD = 3`。3 个 wrapper 从 `../../engine/helpers/gate-degradation-policy.mjs` import，删除本地字面量；`evaluateWaveDegradationEligibility` 调用与降级行为完全不变。备选"放进既有 gate-helpers-handoff"被否：降级策略是独立关注点，独立小模块使审计断言（wrapper 引用共享模块）更直接。

**D5 — skip_specs + semantic-closure `not_applicable`。**
零 requirement 变更（审计实现既有 scenario；配置抽取同值同行为），故 `skip_specs: true`。semantic-closure：不改任何 cataloged family 的 resolver/establishing surface/conclusion——wrapper 的 import 方式变化不构成行为事实变化；审计本身是测试层防护。理由全文见 `semantic-closure.yaml`。

## Risks / Trade-offs

- [派生正则漏掉非 `rule.check === 'x'` 形式的实现（查表/变量比较）导致假绿] → apply 期以 33 个 check 值全集对照派生结果，逐一确认命中；未命中的补充扫描面。审计用例同时做反向注入测试（临时未知 check 须变红）证明审计有效。
- [wrapper 迁移 import 时引入行为差异（求值顺序/常量引用错误）] → 迁移为纯字面量替换；既有 wrapper 测试（`gate-failure-sources` 等）+ 全量 `npm test` 兜底。
- [静态审计与运行时 fail-closed 的重复] → 有意保留双防线（D1）；审计注释明示分工。

## Migration Plan

Apply：前置检查 → 新建共享模块 → 3 wrapper 迁移 → 审计扩展（含注入反证）→ 相关套件 + `governance:check` → 全量 `npm test`。回滚即 revert；无数据/运行时迁移。

## Open Questions

（无。）