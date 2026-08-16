# Proposal: repair-guidance-terminology-pointer-drift

## Why

C1 修复了 Harness 面文档；本 change 承接 `_backlog/plans/agent-guidance-conflict-drift-findings.md` 的**根/openspec guidance 面**问题：F-01（`Gate 五面` 断指针——CONTEXT 指向的表在目标文件不存在）、F-06（`C5`/`C2`/`C3` 是 entry 链未定义符号）、F-03 的术语行（`repair_kind` 一词两套枚举、CONTEXT 只定义了其一）、F-07 的 guidance 侧（`framework-runtime-boundary.md` 复制同一份过期 CLI 清单）、F-08（invariants-brief 的 `(RUE-004)` 式引用无法在 spec 正文解析，且已发现一处真实错引用）、F-09（根 README `_original_*` vs AGENTS.md `_old_topics` 命名漂移）、F-12（根 AGENTS/CLAUDE 缺 `current run bundle root` 坐标命名，既有回归测试失败）。执行 Agent 会在这些点上拿错术语、查不到表、按错 requirement。本 change 只修文档措辞，无行为变更、无 spec delta。

## What Changes

- `openspec/guidance/models/framework-runtime-boundary.md`：Gate Boundary 节显式命名「Gate 五面」（transition 表 / definition JSON / engine / CLI wrapper / runtime status，各列 owner），definition JSON 与 CLI wrapper 的过期「target」标注改为当前状态（engine/gates 诚实保留 target）；两处过期四工具 CLI 清单改为「核心工具 + 以 `cli/` 目录为准」指针。
- `CONTEXT.md`：Gate 行指向五面表精确位置，并显式区分「工作单元五反馈面」同词异义；新增 C2/C3/C5 glossary 行（按 owner spec 用法归纳，标注全仓库无单一展开定义）；`hints[]`/`repair_kind` 行拆分为 gate/phase 面与 work-unit 面两套 closed enum 的区分表述。
- `openspec/guidance/models/invariants-brief.md`：spec 引用格式统一为「requirement 标题 + registry ID」（标题在正文可检索、ID 经 `req-registry.yaml` 可解析）；顺带更正 #8/#15 的 `(RUE-004)` 错引用为 RUE-005。
- 根 `README.md`/`AGENTS.md`/`CLAUDE.md`：统一归档命名（`_old_topics` 目录 + `_original_*` 前缀关系说清）；根 AGENTS/CLAUDE 的 Deep Research Routing 段补 `current run bundle root` 坐标命名（转绿既有 `deep-research-harness-entry-contract` 回归测试）。
- 新增 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs` 静态锁定上述 canonical 表述。

无 **BREAKING** 变更；无 spec 级行为变化，故本 change 声明 `skip_specs: true`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无（纯文档修复：全部改动位于非权威 guidance 面与根入口文档，无 requirement 文本变化）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`（RUE-005 块正文）、`req-registry.yaml:368-369` | Verify-only | F-08 引用格式修正只改 invariants-brief 的引用写法，不改 requirement 文本 |
| `agent/agent-command-surface` | `req-registry.yaml:128`（ACS-001 标题） | Verify-only | F-08 引用改为标题+ID，不改 requirement |
| `engine/runtime-reentry-debuggability` | `req-registry.yaml:460`（RRD-008 标题） | Verify-only | 同上 |
| `research/research-styles` | `spec.md:131-134`（C2 用法） | Verify-only | C-series glossary 只在 CONTEXT 归纳，不改 spec |
| `research/post-final-recovery` | `spec.md:366-368`（C3 用法）、`:44-76`（C5 用法） | Verify-only | 同上 |
| `research/content-delivery-phase-content` | `spec.md:350-353`（C5 lineage 用法） | Verify-only | 同上 |
| `workflow/workflow-node-contract` | WNC-010（C1 已核验） | Verify-only | 本 change 不触碰该 spec |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md:71-77` | Verify-only | 新增一个 integration 静态断言测试，分类遵循现有 spec |
| `agent/delegated-work-units` | CHI-004 归属（C1 已核验） | Excluded | F-03 的 engine/决策表契约属后续 C3 |
| `engine/check-inspect-feedback` | CHI-004 归属（C1 已核验） | Excluded | 同上 |

## Impact

- 修改文件：`CONTEXT.md`、根 `README.md`/`AGENTS.md`/`CLAUDE.md`、`openspec/guidance/models/framework-runtime-boundary.md`、`openspec/guidance/models/invariants-brief.md`；新增 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`。
- 无依赖、API、CLI、schema、Engine、gate 变更；无 spec delta（`skip_specs: true`）。

## 简化与责任边界

- **Direct Source of Record**：Gate 五面各面 owner（transitions.chain.json / gate_definitions / engine / cli/gates / rb_status.json）在表中逐一列出；C-series 术语 owner 指向 post-final-recovery 与 content-delivery-phase-content specs；repair_kind 两套枚举各标 owner（phase §7 / RUN.md 决策表）。文档只指向 owner，不新增重述。
- **Net simplification**：断指针接上真实表；过期清单改目录指针；错引用更正；两种「五面」与两套 `repair_kind` 显式区分——全部是消除歧义，不新增 state/概念/checkpoint。
- **Semantic-precision reflection**：不新增具名 state；只把同词异义显式拆开（Gate 五面 vs 工作单元五反馈面；repair_kind 双枚举；C2/C3/C5 按 owner 用法归纳）。读者（执行 Agent）的有界问题：「这个词此刻指哪一面」；必须保留的区别：五面/五反馈面、两套 repair_kind、C-series 三代号各自归属；正常推理停止点：查到 owner 后不再引申。
- **责任边界**：全部为 guidance 文档措辞；用户决定（HITL1/HITL2）不变；Agent 执行边界不变；Engine verdict 不变。
