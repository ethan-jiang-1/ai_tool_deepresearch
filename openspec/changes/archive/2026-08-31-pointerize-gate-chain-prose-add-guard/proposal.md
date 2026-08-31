# Proposal: pointerize-gate-chain-prose-add-guard

## Why

`DEEP_RESEARCH_HARNESS/COMMANDS.md` L159 手写了「六大生命周期 gate 的 `check.next` 推进链」，把 `hitl1-recorded` 排到 `wave2-complete` 之后，与引擎单一真相源 `workflows/transitions.chain.json` + `workflows/manifest.json` 的真实序（`instantiation-complete → hitl1-recorded → setup-ready → seed-topics-ready → wave0/wave1/wave2-complete → hitl2-recorded → readiness-passed`，共 10 gate）矛盾。该链由 change `2026-08-28-commands-md-coverage-and-copyable-contracts`（commit `938806958`，2026-08-28）引入——coverage 动机附带手写链、排序出错，当时无任何 checker 能拦 prose 中的顺序性枚举：`check-content-drift.mjs` 只查路径存在性，`check-guidance-pointer-targets.mjs` 只查指针目标是否存在。本 change 承接 `_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §1 的 C1 finding（2026-08-31 全量复核通过）。

## What Changes

- `DEEP_RESEARCH_HARNESS/COMMANDS.md` L159：删除手写推进链与「六大」计数句，保留一句 pointer——gate 全集与推进序的单一真相源是 `workflows/manifest.json` + `workflows/transitions.chain.json`，`engine/ask-next.mjs` 的 `resolveNodeTransitionDetailed()` 提供详细查询。同行的 `--current-node` 必带参数说明不变。
- 新增 `openspec/governance/check-gate-chain-prose.mjs`：扫描 `DEEP_RESEARCH_HARNESS/**/*.md`，单行出现 ≥2 个不同 gate enum 且以 `→`/`->` 连接即 fail（报告 file/line/匹配序列）；gate enum 集合在检查时从 `workflows/manifest.json` 的 gate keys 读取，checker 自身不维护枚举清单。
- 机器面接入：`check-all.mjs` 按目录自动发现（`npm run governance:check` 即覆盖，零注册改动）；`finalize-change-archive.mjs` 检查序列在 content-drift 之后加入 `check-gate-chain-prose.mjs`（对齐 `2026-08-16-repair-work-unit-recovery-vocabulary-and-drift-guards` 四个 drift-guard checker 的先例位置）；`tests/integration/governance/change-feedback-loop-archive.test.mjs` 的 fixture 拷贝清单与 FINALIZER_CHECKS 期望同步。
- 新增 `tests/governance/gate-chain-prose-guard.test.mjs`：真实树 green、故意错序链 red、pointer 句 green、enum 集合派生自 manifest 四类断言。
- spec delta：`governance/change-feedback-loop` MODIFIED「Governed archive finalization SHALL establish one mechanical closeout verdict」——检查序列加入 gate-chain-prose，并规定其扫描范围、fail 形状与 enum 派生源。

无 **BREAKING**：不改 gate 判定语义、枚举、CLI 动词与退出码契约；`workflows/` 两份真相源文件不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `governance/change-feedback-loop`: MODIFIED「Governed archive finalization SHALL establish one mechanical closeout verdict」——finalizer 检查序列加入 gate-chain-prose 检查，并补充该检查的行为条款与场景。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `governance/change-feedback-loop` | `openspec/specs/governance/change-feedback-loop/spec.md:214-317`（finalizer 检查序列 requirement CHF-003） | Modify | 归档 hard-gate 序列加入 gate-chain-prose；先例（`2026-08-16-repair-work-unit-recovery-vocabulary-and-drift-guards`）即以该 requirement 承载 drift-guard 检查序列，不新增 requirement ID |
| `governance/requirement-traceability` | `spec.md`「Check script compliance as hard gate」 | Verify-only | 该 requirement 规定 hard-gate 全集由 finalizer `CheckSchema` 这唯一机器面定义、spec 不手抄检查清单——把 checker 注册进 finalizer 即完成合规登记，RET prose 无需变更 |
| `agent/agent-command-surface` | catalog 行（Agent-facing command responsibility；COMMANDS.md 为其文档面） | Verify-only | L159 修正使 prose 对齐既有 manifest 单一真相源；该 spec 未规定链序 prose，无 requirement 变化 |
| `engine/transition-table` | catalog 行（transition declaration owner） | Verify-only | `transitions.chain.json`/`manifest.json` 不改，权威序不变，仅被 pointer 引用 |
| `verification/verification-routing` | accepted 四类 taxonomy（`verification/verification-routing/spec.md`） | Verify-only | 新测试仅用 unit/integration 既有类，无分类变更 |
| `workflow/workflow-node-contract` | 不涉及 node 元数据/结构 | Excluded | 不触及 |

## Impact

- 修改：`DEEP_RESEARCH_HARNESS/COMMANDS.md`（L159 一行）、`openspec/governance/finalize-change-archive.mjs`（检查序列 +1）、`tests/integration/governance/change-feedback-loop-archive.test.mjs`（fixture 拷贝清单 + FINALIZER_CHECKS 期望）。
- 新增：`openspec/governance/check-gate-chain-prose.mjs`、`tests/governance/gate-chain-prose-guard.test.mjs`。
- 无依赖变更；无引擎行为变更；不新增 requirement ID / capability。

## 简化与责任边界

- **Direct Source of Record**：gate 全集与推进序的唯一真相源保持为 `workflows/manifest.json`（gate key 集）+ `workflows/transitions.chain.json`（推进序）；本 change 不新增第二真相，guard 的枚举集合同样运行时从 manifest 派生。
- **Net simplification**：删除 COMMANDS.md 手写链这份重复真相（它已经漂移错序一次）；新增复杂度止于一个只读、无状态的单文件扫描 checker，判定规则是「非 pointer 的 gate 枚举序列直接报红」——比「比对拓扑序」更简单、更不易漏（plan 方案 B 的选择）。一份手写对照表换一个机械 checker，删除量与新增量成正比。
- **Semantic-precision reflection**：不新增 state/概念/模块边界。新 checker 名 `check-gate-chain-prose` 即其语义层：读者（归档前的 governance 面）的有界问题是「Harness guidance prose 是否手写了 gate 推进序」；必须保留的区别是「pointer（命名真相源文件）」vs「枚举链（复述顺序）」——前者合法、后者报红；正常推理停止点：报红即删链改 pointer、重跑同一 checker。
- **责任边界**：Engine/checker 只裁机械形状事实（某行是否枚举 gate 序列），不做语义裁决；Agent 的语义工作与用户决策路径不变；finalizer 仍只做机械归档前置检查。
- **Complexity burden 短答**：捕获 content-drift/pointer-targets 均无法捕获的「顺序性 prose 枚举」故障；读取 manifest.json 这一直接 authority；不并入现有 checker 因职责不同（路径存在性/指针目标 vs 枚举顺序性），并入会模糊单一职责；删除一份手写对照表；失败时唯一最近动作 = 删链改 pointer、重跑同一 checker；focused unit test（green/red/派生源断言）证明 guard 不误阻塞。
