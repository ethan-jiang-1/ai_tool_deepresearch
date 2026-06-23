> req: RWP-001

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

`phase-wave0.md` SHALL 包含完整的 9-section body，引导 Agent 产出 foundation shared reference evidence。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式。

Section 内容要求：

- **Stage Goal**: 搜集少量真实 shared reference，创建结构化 metadata 并更新 index/status/trace。单个 topic 内至少达到 foundation floor 的 reference 数量
- **Required Inputs**: 已通过 `setup-ready` gate 的 active bundle、`shared-profile.md`、`shared-schemas.md`、`rb_plan.md` 中的 `topic_registry`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave0，如果 queue 为空：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 为每个 topic 生成一个 `source_intake_fan_in` task card
  - 使用 `operate-queue enqueue` CLI 灌入全部 task card（一次性灌满）
  - 灌料完毕后跑 `operate-queue check` 确认 active_window 已填充

  **§3.2 Queue-driven 执行循环**：
  - `operate-queue claim` → 读取 task card 的 action → sub-agent 执行搜索/抓取 → `operate-queue complete --result ...`
  - 读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
  - claim 返回新 task → 重复；claim 返回 null → queue 空，跳到 §3.3
  - 行为约束：不跳过 task、不伪造产出、complete 时 receipt check 失败则 engine 自动生成 repair task——必须修复

  **§3.3 收尾与 gate**：
  - 检查并更新 `reference/index.md`
  - 跑 gate CLI，按 §5–§7 处理 pass/fail

- **Expected Artifacts**: `reference/index.md`（非空）、`reference/<topic>/source.yaml`（每条 reference 满足 ReferenceMetadata schema，数量 ≥ 1 per topic）、trace 中有 `wave0_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 reference、修复 schema violation 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止使用 fake URL 或伪造 source metadata；禁止声称 evidence coverage 或 research depth completeness；禁止跳过实际搜索直接编造 reference；禁止在不跑 queue claim/complete 的情况下直接跑 gate

#### Scenario: Agent executes wave0 phase via queue-driven loop

- **WHEN** Agent 加载 `phase-wave0.md`
- **THEN** §3 body SHALL 引导 Agent 进入 queue-driven 三阶段：灌料 → 执行循环 → 收尾+gate
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Filling generates one task per topic

- **WHEN** `topic_registry` 含 N 个 topic，queue 为空
- **THEN** Agent SHALL 为每个 topic 生成一条 `operate-queue enqueue` 命令
- **AND** 每条命令 SHALL 带有 `--producer-rule source_intake_fan_in`、`--target sub-agent`、`--priority 1`
- **AND** 全部 topic 的 task card SHALL 在进入执行循环前一次性灌入

#### Scenario: Execution loop processes tasks until queue empty

- **WHEN** queue active_window 中有 task card
- **THEN** Agent SHALL claim → execute → complete 循环
- **AND** Agent SHALL NOT 跳过 task 或无故中间停机
- **AND** 当 claim 返回 `item: null` 时循环终止

#### Scenario: Sub-agent executes source-intake search

- **WHEN** task card 的 `target` 为 `sub-agent`
- **THEN** 搜索和抓取 SHALL 由 sub-agent 执行
- **AND** bounded 输出 SHALL 写入 `_cache/search-results/`
- **AND** main-agent SHALL 在 complete 后只读 render projection 确认 done-condition
