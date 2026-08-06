# workflows/ — Read-Only Workflow Topology

## Role

此目录定义 workflow-foundation 的生命周期拓扑和 Agent 指令。所有文件是 **read-only Harness assets**（git tracked），不是 run state。Run state 在 current run bundle root 中：production 为选中的 `dpt_rb_*`，disposable experiment 为选中的 `dpt_disp_*`。

Workflow node 中的裸 runtime path（如 `rb_queue.json`、`rb_trace.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`_work_units/...`）都以 current run bundle root 为根，不以 repo root 或 `DEEP_RESEARCH_HARNESS/` 为根。

## Structure

```
workflows/
  manifest.json              ← 生命周期拓扑权威（phase 排序 + gate 绑定）
  transitions.chain.json     ← 路由表（node → outcome → next_node）
  nodes/
    phases/                  ← phase body MD（Agent 在每个 phase 的行动指令）
    shared/                  ← shared node MD（跨 phase 的行为约定和参考文档）
    brief/                   ← brief MD（HITL 决策点的用户可见文案——Agent 照着念）
```

## manifest.json — Topology Authority

`manifest.json` 是 **lifecycle 拓扑的 single source of truth**。Phases 数组按生命周期顺序排列，每个 phase 声明其 `gate` key（`null` = terminal node，如 final）。

**谁依赖 manifest：**
- `consistency-validator.mjs` — 验证 package 完整性（node 存在、gate 绑定一致、chain 覆盖）
- Gate CLI 的 `validateNodeGateBinding()` — 验证 `--current-node` 与 gate 的绑定
- `check-gate-readiness-passed.mjs` — 从 manifest 推导 prior gate 集合（无需硬编码阈值）

**修改 manifest 时 MUST 同步更新：**
1. `transitions.chain.json` — 新/改 phase 的 routing entry
2. `DEEP_RESEARCH_HARNESS/schema/enums.mjs` 的 `CurrentGate` — 新 gate enum token
3. Gate definitions（`schema/gate_definitions/`）— 新 gate 的规则定义
4. `openspec/specs/` — 受影响的 capability spec

## transitions.chain.json — Routing Table

Chain 只编码 `passed` 分支的 normal next。`failed`、`rerun` 等 branch 路由归 Agent decision authority，不编码进 chain。

## nodes/ — Agent Instructions

`phases/` 下的每个 `.md` 是 Agent 在对应 phase 的行动指令。`shared/` 是跨 phase 共享的行为约定和参考文档（规则契约、schema 摘要、gate 规则摘要等）。`brief/` 是 HITL 决策点的用户可见文案——Agent 在 `stop: yes` 阶段按需读取，照着念，不改模板文字。

**三层分工**：`phases/` 管**做**（何时、做什么），`shared/` 管**守规矩**（怎么交互、怎么自律），`brief/` 管**说**（对用户说什么词）。

这些 MD 不是 executable code — 它们是 Agent 读的。Go/No-Go 由 gate CLI（`DEEP_RESEARCH_HARNESS/cli/gates/`）通过 definition JSON 强制执行。
