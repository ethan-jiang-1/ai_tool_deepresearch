# Proposal: close-verification-landing-loop

## Why

HEAD `d1d3ec781`（工作树干净、已提交）当前带 3 个失败测试（`tests/integration/md/canonical-harness-vocabulary-contract.test.mjs` 1 个 + `tests/engine/static-regression.test.mjs` 2 个）。根因有两层：

1. **过时锁**：入口文档 Execution Brief 重塑（`2026-08-30-reshape-agent-entry-as-execution-brief` + `2026-08-30-prove-entry-selection-at-canonical-source`）已同步更新 main specs（`bundle/run-entry`、`agent/agent-context-routing`），但全仓库有约 30 个测试文件对治理文档做字符串锁，无任何索引可查"哪些测试锁着哪份文档"。该 change 手工枚举并改写了 6 个已知锁（其 tasks 3.1–3.7），漏掉第 7、8 个（即上述两文件），它们仍在断言已被删除的旧措辞。
2. **无落地门**：没有任何机制在 change 落地前强制回归绿——finalizer 的机械前置清单（CHF-004）不含测试执行，且明文禁止 finalizer 自带 test runner；`tests/README.md` 自称 quick lane 是 "convenience, not a verification substitute"；无 CI、无 hooks；apply/archive 的 guidance 不要求跑任何车道。因此"五件套仪式做满 + 红灯落地"可以同时成立。

两层合起来：**绿不可信**。本 change 同时修症状（rebaseline 过时锁）与病根（把回归绿变成归档的机械前置 + 让锁可查询）。

## What Changes

1. **Rebaseline 两个过时锁测试**（只改测试，不改文档；main spec 已是现行真相）：
   - `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs`：把 3 条精确短语断言（`这个 Deep Research Harness` / `Deep Research Harness work` / `触发这个 Harness`）替换为现行 spec 实质断言（Execution Brief 存在、身份句 `本 Harness 就是项目的 Deep Research Harness` 存在、entry-selection 指针三件不复述）。
   - `tests/engine/static-regression.test.mjs` RUE-004 套件：把英文精确短语断言（`research shortcut`、`do not invoke` 等）替换为实质级断言（禁用工具枚举 + `DEEP_RESEARCH_HARNESS/RUN.md` 路由存在）。
   - 两者保留负向证明义务：若文档再丢失捷径压制/入口路由实质，锁必须变红。
2. **窄幅修订 CHF-004**：finalizer 的有序机械前置在全部廉价结构检查之后、native archive 之前，增加最后一个直接事实——planning root 的 canonical 回归套件 `npm test` 退出码为 0。失败即 blocked（code `regression_suite_failed`），携带失败摘要与同一 finalizer rerun 坐标；**不实现**任何测试选择、过滤、局部车道或重试循环（原"test runner"禁令收窄为禁自定义 runner/选择逻辑，恰好放行对 canonical 脚本的一次性调用与退出码读取）。
3. **锁可发现性**：新增只读查询脚本 `scripts/list-doc-locks.mjs <doc-path>`（扫描 `tests/` 输出哪些测试文件读取/断言该文档），`tests/README.md` 增加一句"改治理文档措辞前先查锁"。无持久索引、无新状态。
4. **operations 同步**：`openspec/operations/change-feedback-loop.md` 的 Closeout Review 增加一句回归绿前置说明（Agent-facing 交付面，不改变权威）。

**明确不做**（各带升级条件，防教条）：不做 git hooks（升级条件：出现绕过 finalizer 的裸 commit）；不做 CI（升级条件：有了远端基建）；不定义"快速车道"为 spec 概念（升级条件：全量套件时长使归档不可接受）；不做 deferral/override 机制（升级条件：真实发生"被无关红卡死归档"且记录在案）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/change-feedback-loop` | main spec CHF-004 现行文本（含 "SHALL not implement its own ... test runner" 禁令与有序检查清单） | Modify | finalizer 机械前置清单是本 capability 的 requirement 行为；增加回归套件前置必须修订该 requirement，而非绕过 |
| `bundle/run-entry` | main spec RUE-004（"Agent behavior files stay synchronized on the research shortcut override"）现行文本 + 两重塑 change 的 delta | Verify-only | 锁测试断言需对齐已接受的现行行为；requirement 本身不变 |
| `verification/verification-routing` | main spec（四类分类、execution profile、native verdict） | Verify-only | 本 change 不新增测试类/车道概念；新证据按既有四类路由，`node_test_exit` 已是 native verdict |
| `engine/framework-engine` | 无涉及面（不改任何引擎运行时行为） | Excluded | 本 change 只动治理层与测试，不触碰框架引擎/CLI/schema 行为 |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `governance/change-feedback-loop`: CHF-004（"Governed archive finalization SHALL establish one mechanical closeout verdict"）增加 canonical 回归套件退出码作为最后一个机械前置，并收窄原 test-runner 禁令的表述边界。

## Impact

- `openspec/governance/finalize-change-archive.mjs`：新增 `regression_suite` 有序检查（位于 drift guards 之后、native archive 之前）。
- `openspec/governance/check-project-reqs.mjs` / `check-project-specs.mjs`：不变（无新 requirement ID；CHF-004 已注册）。
- `tests/governance/change-feedback-finalizer.test.mjs`、`tests/integration/governance/change-feedback-finalizer.test.mjs`：新增 regression_suite 阻塞/放行断言；integration fixture root 需带最小可绿套件。
- `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs`、`tests/engine/static-regression.test.mjs`：rebaseline（见 What Changes #1）。
- `scripts/list-doc-locks.mjs`（新增）+ `tests/engine/` 下其单元测试；`tests/README.md` 一句指引。
- `openspec/operations/change-feedback-loop.md`：Closeout Review 一句同步。
- 工程约束不变：Node >=20 纯 ESM，依赖仅 zod/yaml。

## Source of Record 与责任边界

- **Source of Record**：归档机械前置清单的唯一权威是 accepted `governance/change-feedback-loop` spec + `openspec/governance/finalize-change-archive.mjs` 可执行契约；回归绿事实的 SoR 是 `npm test` 退出码（canonical 脚本，package.json 单一定义）。
- **最短合法闭环**：红灯 → finalizer blocked（失败摘要 + `npm test` 直接重跑坐标 + 同一 finalizer rerun 坐标）→ 修复或确认 flake 后重跑同一命令。不新增状态、不新增层。
- **Net simplification**：用一次 canonical 调用替换"每 change 手工枚举自己认识的验证资产"这一不可枚举义务；删除"绿不可信"这一隐性债务。未新增任何运行时状态或恢复分支。
- **责任边界**：Engine verdict = `npm test` 退出码与 blocked 结构化输出；Agent execution = 修复失败/更新过时锁/重跑同一 checkpoint；User decision = 无新增（deferral 机制明确不做，见升级条件）。human-directed 不因本 change 获得任何新权限。

## Semantic Precision Reflection

新具名概念仅一个：finalizer 的 `regression_suite` 机械前置。

- **读者的有界问题**："归档前，仓库 canonical 回归套件绿吗？"——是/否一个事实，读退出码即答。
- **必须保留的区别**：它是**一个退出码事实**，不是测试选择器、不是车道定义、不是重试策略、不是语义审查；与 change 自身 verification-plan 的 per-claim 证据（apply 期间 Agent 执行）分工不变——前者守"全仓库未枚举漂移"，后者守"本 change 的声明证据"。
- **正常推理停止点**：拿到退出码即停；红→按 blocked 输出修复后重跑，绿→native archive。不存在"部分绿"解释空间。

## 语言与义务

本 proposal 按仓库语言约定撰写（token/命令/枚举英文，推理中文）。所有 Why 事实均可在当前工作树直接复核：3 个失败测试名、`d1d3ec781` 的 stat（含 verification-plan 而不含被漏锁）、CHF-004 第 231–232 行禁令、`tests/README.md` 第 19–20 行自称 convenience。
