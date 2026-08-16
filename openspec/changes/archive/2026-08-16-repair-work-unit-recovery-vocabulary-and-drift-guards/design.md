# Design: repair-work-unit-recovery-vocabulary-and-drift-guards

## Context

CHI-004（`check-inspect-feedback/spec.md:206-224`）已要求决策表每发射值一行 + 锁定回归；现实是 engine 发 10 值、表 5 行、测试人工枚举 5 值——实现违反 accepted spec。CHF（`change-feedback-loop/spec.md:214-250`）锁 finalizer 检查序列，未含 content-drift（finalizer 实际已跑）与新的 drift-guard 检查。约束：engine 发射值集合**不变**；非 recovery 词汇（gate-hint `agent_action` 等）不动；新 checker 必须对当前树（C1/C2 修复后）全绿；finalizer 的 checker 签名与 `check-content-drift.mjs` 一致（可选 positional projectRoot）。

## Goals / Non-Goals

**Goals:** 词汇单一源 + 派生锁定（F-03）；4 类 drift-guard checker 接入 finalizer（F-11/F-08）；F-13 fixture 修复；spec 同步（CHI ADDED + CHF MODIFIED）。

**Non-Goals:** 不改 engine 发射值集合与行为；不归一化词汇（保留方案 a）；不改 gate-hint/其他面词汇；不加 CI；不新增语义裁决。

## Decisions

### D1: 词汇模块 `engine/work-unit-repair-vocabulary.mjs`

```js
export const WORK_UNIT_REPAIR_KIND = Object.freeze({
  wait: 'wait',
  recoverTransaction: 'recover-transaction',
  recoverDeclaration: 'recover-declaration',
  supersede: 'supersede',
  missingContract: 'missing_contract',
  waitForDelegatedCandidate: 'wait_for_delegated_candidate',
  authorExactFallbackAttempt: 'author_exact_fallback_attempt',
  semanticBoundary: 'semantic_boundary',
  claimSuccessor: 'claim_successor',
  inspectCurrentLineageLeaf: 'inspect_current_lineage_leaf',
});
export const WORK_UNIT_REPAIR_KINDS = Object.freeze(Object.values(WORK_UNIT_REPAIR_KIND));
export const REPAIR_KIND_CLI_VERB = Object.freeze({
  'recover-transaction': 'recover-transaction',
  'recover-declaration': 'recover-declaration',
  supersede: 'supersede',
  wait: null,
  missing_contract: null,
  wait_for_delegated_candidate: null,
  author_exact_fallback_attempt: null,
  semantic_boundary: null,
  claim_successor: 'claim',
  inspect_current_lineage_leaf: 'inspect',
});
```

CLI verb 核对：`operate-work-unit.mjs` 现有动词含 `claim`/`inspect`（既有决策表引用与 COMMANDS 已证）；null = 显式 wait/stop 边界（沿用既有测试的 null 语义）。

### D2: RUN.md 决策表 10 行

在既有 5 行后追加（保持既有四列表头与行格式）：

| disposition 反馈面 | `repair_kind` | CLI 动词(exact 命令) | 重跑什么 |
| claimed 且 delegated 作者路由 | `wait_for_delegated_candidate` | 无（等待 delegated actor 正常产出该 attempt） | 同一 checkpoint |
| claimed 且 Phase Agent fallback 路由 | `author_exact_fallback_attempt` | 无（按 `write_to` 指向的 identity.result_path 作者该 attempt，再正常 submit） | 同一 checkpoint |
| 已 submit 且仍 current | `semantic_boundary` | 无（停止边界：更丰富内容不构成替换授权） | 无合法替换路径 |
| 历史 leaf 在 active_window/refill_pool | `claim_successor` | `operate-work-unit.mjs claim` | 从 successor `queue_item_id` 正常 claim/poll/submit 后重跑同一 checkpoint |
| 历史 leaf 其他位置 | `inspect_current_lineage_leaf` | `operate-work-unit.mjs inspect` | 读取返回坐标后继续，重跑同一 checkpoint |

并把表前说明句「本表被 tests/engine/work-unit-recovery-decision-table.test.mjs 锁定」改为「行集从 engine/work-unit-repair-vocabulary.mjs 派生并由该测试锁定」。

### D3: 发射点常量化（行为不变）

四个模块中 `repair_kind: '<literal>'` 与 supersession 的 `'semantic_boundary'` failure 实参改为 `WORK_UNIT_REPAIR_KIND.*` 引用（import 自 D1 模块）。`repair_kind: repairKind` / `transaction.repair_kind` 等变量透传不动；`work-unit-validation.mjs` 的 `agent_action`（gate-hint 面）不动；queue-location 字符串（`active_window` 等）不动。apply 时用 grep 逐处核对：`grep -n "repair_kind: '" <4 modules>` 应归零。

### D4: 锁定测试派生化

`tests/engine/work-unit-recovery-decision-table.test.mjs`：删除人工 `RECOVERY_REPAIR_KINDS`/`REPAIR_KIND_TO_CLI_VERB`/`ENGINE_SPELLINGS`，改为 `import { WORK_UNIT_REPAIR_KINDS, REPAIR_KIND_CLI_VERB } from ...work-unit-repair-vocabulary.mjs`；行集断言、CLI 动词断言照旧；新增：四个发射模块源码中不得出现 `repair_kind: '<literal>'` 裸字面量；保留下划线拼写扫描。新增 `tests/engine/work-unit-repair-vocabulary.test.mjs`：断言 10 值集合、verb map 键完整、无下划线值。

### D5: 4 个 drift-guard checker（openspec/governance/，签名 `node <checker> [projectRoot]`，缺省 cwd）

1. `check-guidance-pointer-targets.mjs`：扫描 curated 面（CONTEXT.md、根 README/AGENTS/CLAUDE、harness README/RUN/AGENTS/CLAUDE、`openspec/guidance/models/*.md`、invariants-brief、COMMANDS.md）中反引号包覆的、含 `/` 且以 `.md/.mjs/.json/.yaml/.yml` 结尾的路径；跳过 `<...>` 占位、含 `*` 的 glob、`dpt_rb_*`/`dpt_disp_*` 模式、纯 `#anchor`；按 repo root 解析（含 `../`）并 `existsSync`；缺失路径逐条报告并 exit 1。目标文件缺失时跳过该面（fixture 兼容）。
2. `check-surface-inventory.mjs`：断言 harness README 与 framework-runtime-boundary 中点名的核心工具名在 `cli/` 存在；`cli/gates/` wrapper 计数与「当前 10 个」声明一致；「完整清单以 `cli/` 目录为准」指针句存在。
3. `check-phase-node-structure.mjs`：lifecycle phase 列表 = instantiation/hitl1/setup/seed-topics/wave0/wave1/wave2/hitl2/readiness/rerun/final；instantiation+hitl1 必须含「兼容例外（WNC-010）」标注且不含 `enter-phase.mjs`；setup..rerun（除 bootstrap）§6 必须含 `enter-phase.mjs` 与 `advance-status.mjs`；final 必须含 `advance-status --to readiness_passed`。subagent-* 节点不检查。
4. `check-spec-req-ids.mjs`：对每个含 `> req:` 头的 main spec：头内 ID 必须在 `req-registry.yaml` 注册且非 [DEPRECATED]；registry 值中的 capability 名与 spec 路径 leaf 一致；正文 `### Requirement:` 计数 == 头内 ID 数（序数映射完整性）。

### D6: finalizer 接线

`finalize-change-archive.mjs`：`RootCodeSchema` 增加 `guidance_pointer_targets_failed` / `surface_inventory_failed` / `phase_node_structure_failed` / `spec_req_ids_failed`；在 content_drift 步骤后、native archive 前依次跑 4 个 checker（同一 runStep 模式，传 planningRoot）。CHF delta 已同步（MODIFIED 序列）。

### D7: F-13 fixture 修复

`copyGovernanceClosure` 文件清单 += `check-content-drift.mjs` + 4 个新 checker；`FINALIZER_CHECKS` += `content_drift` + 4 个新检查名。fixture 树缺 guidance 面文件时，新 checker 按 D5 的缺失面跳过规则通过。

## Risks / Trade-offs

- [发射点常量化误改语义] → 只替换已枚举的 10 个字面量位置，apply 前后各跑一次 `npm test` 的 engine 相关套件 + 全量；变量透传与 gate-hint 面明确排除。
- [checker 对当前树误报] → checker 落地时以当前树为基准逐条跑绿再归档；缺失面跳过规则覆盖 fixture。
- [finalizer 序列变更破坏既有归档] → CHF delta 与实现同步；C3 自身归档即是对新序列的首次完整验证（fixture 集成测试同时转绿）。
- [RUN.md 表行措辞与 CHI-004 既有要求冲突] → 新行沿用既有行格式与「CLI 动词或显式边界」语义，ADDED requirement 只锁派生机制。
