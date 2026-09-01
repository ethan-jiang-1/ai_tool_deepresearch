# Proposal: cut-archive-noise-and-pin-repair-vocabularies

## Why

两个来自仓库评审（2026-09-01 会话）的 agent 阅读摩擦点需要在不改任何 runtime 行为语义的前提下收敛：

1. **archive 搜索噪声**：`openspec/changes/archive/` 有 1758 个 md（约 16 万行），占 openspec 全部 md 的约 95%，全仓库 grep/glob 命中被历史 change 淹没；当前没有任何规则把它从默认 task context 排除，agent 只能靠自觉绕开（来源：根 `AGENTS.md`「Do Not Read」清单、`openspec/changes/archive/` 实测文件数）。
2. **三个 repair 词汇的阅读成本与防腐缺口**：`repair_kind`（gate/phase 门禁面）、`next.recovery_action`（work-unit 恢复面）、`repair_directive`（file-observability 面）是三套故意物理隔离的闭合枚举（来源：根 `CONTEXT.md`「术语罗塞塔石碑」表）。前两者已由 `openspec/governance/check-spec-enum-restatements.mjs` pin 住 `GATE_REPAIR_KINDS` 与 `WORK_UNIT_RECOVERY_ACTIONS`；第三个没有代码导出闭集——六个值是散在 `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs`（L559/599/619/635/692/714）的字符串字面量，翻译层（CONTEXT.md 罗塞塔行）可能随代码漂移而无机器警报。

本 change 不合并、不重命名任何既有词汇（三面语义不同：Who 修 / What to run / 文件自愈，合并是契约级破坏），只做阅读侧与防腐侧的收敛。

## What Changes

- 根 `AGENTS.md` 与 `README.md` 的「Do Not Read」清单各新增一行：`openspec/changes/archive/` 是 historical record，仅在用户明确点名 archive/history 时打开；其下的 grep/glob 命中不构成 task context 或 authority。不改 `_backlog/` 等既有条目。
- 根 `CONTEXT.md` 罗塞塔表增加「字段名分诊」头行：见到 `repair*` 字段先按字段名归类（`repair_kind` → 门禁面/Who；`next.recovery_action` → 恢复面/What to run；`repair_directive` → file-observability 面/文件自愈），并声明混用即 bug、字段名不同是故意的。
- `file-observability.mjs` 提取冻结导出 `FILE_REPAIR_DIRECTIVES`（六值闭集），发射点改引用导出；`check-spec-enum-restatements.mjs` 注册该集合（带 pins），使罗塞塔表/文档复述与代码闭集漂移时 governance 变红。
- `governance/requirement-traceability` 增加一条「新增闭合反馈词汇」复用优先关卡：新增 Agent-facing 闭合枚举反馈字段名前，必须证明三个既有面装不下；确需新增时同一 change 内必须 (a) 在 CONTEXT.md 罗塞塔表加行 (b) 有单一代码导出闭集 (c) 注册进 enum-restatement checker。把词汇扩张从隐性漂移变成显式关卡。

**不产出**：不合并/重命名三个词汇；不移动、不压缩、不剪枝 `openspec/changes/archive/`（机械方案留待后续 explore）；不改 `finalize-change-archive.mjs` 归档路径；不改任何 gate/CLI/work-unit runtime 行为。

## Capabilities

### New Capabilities

（无。全部为既有 capability 的 requirement 修改。）

### Modified Capabilities

- `agent/agent-context-routing`：
  - MODIFY「Project glossary preserves canonical terminology boundaries」——glossary 对三个 repair 词汇 SHALL 提供字段名分诊（按字段名归类而非语义猜），并声明混用即缺陷；
  - ADDED requirement——根 `AGENTS.md`/`README.md` 的 Do-Not-Read 清单 SHALL 命名 `openspec/changes/archive/` 为 historical record 边界，并由既有 focused deterministic regression 锁定。
- `bundle/file-observability`：
  - MODIFY「File observability names its feedback field repair_directive」——六值闭集 SHALL 为单一代码导出冻结数组（emitter 与 consumer 共同引用），SHALL 注册进 enum-restatement governance checker（与 `GATE_REPAIR_KINDS` / `WORK_UNIT_RECOVERY_ACTIONS` 同等对待）。
- `governance/requirement-traceability`：
  - ADDED requirement——新增闭合反馈词汇 SHALL 通过复用优先关卡（justify → 代码闭集 → checker 注册 → glossary 行，同一 change 内完成）。

## Impact

- **文档**：根 `AGENTS.md`、`README.md`（各 +1 行）、根 `CONTEXT.md`（罗塞塔表 +1 头行）。
- **框架代码**：`DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs`（提取导出 + 调用点改引用；纯等价重构，无行为变化）。
- **治理**：`openspec/governance/check-spec-enum-restatements.mjs`（+1 注册集合）。
- **测试**：既有 doc-lock / static-regression / restatement checker / FIO 相关测试按 doc-locks 程序同步；apply 前用 `node scripts/list-doc-locks.mjs` 盘点（已知：`CONTEXT.md` 被 `change-feedback-finalizer.test.mjs` L271 与 `change-feedback-loop-archive.test.mjs` L105 exact 引用；`AGENTS.md` 被 `static-regression.test.mjs` 引用；`repair_directive` 六值出现在 FIO spec 与 file-observability 相关测试）。
- **registry**：apply 阶段向 `openspec/governance/req-registry.yaml` 登记新增 requirement ID（ACR-005、RET-012 候选号，以 plan-mode check 通过为准）。
- **不改**：run bundle 布局、gate/CLI 行为、三个词汇的枚举值域与 owner。
