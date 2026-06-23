## Why

Agentic Queue (AGQ) 的 JS 底盘已经完整——`queue-manager.mjs` (619行) + `operate-queue.mjs` (7个子命令) + AGQ-001~006 全部 accepted + 3 个 playbook 通过。但**没有任何 workflow phase 使用它**——没有一份 phase node MD 引用 `operate-queue`。wave0 的 source intake 目前是自由文本 "Allowed Actions"，Agent 需要自己记住"每个 topic 搜 source、写 source.yaml、检查 schema"，没有结构化 todo list 驱动执行。

这就是 `_backlog/queue/agentic-queue-landing-analysis.md` 和 `guidelines/agentic-queue-mechanism.md` 共同定调的核心 gap：**queue engine 存在但没有接入 workflow loop**。

本 change 选最小路径 (Path A)：只改 phase-wave0.md body，零新 JS 代码。让 wave0 成为第一个 queue-driven phase，验证"claim → execute → complete → repeat"的循环可行性，为后续 wave1/wave2 推广提供实战反馈。

## What Changes

- **phase-wave0.md body 重写 §3 Allowed Actions**：从自由文本变为三阶段 queue-driven 模式（灌料 → 执行循环 → 收尾+gate），其余 §1/§2/§4–§9 不变
- **新增 producer_rule `source_intake_fan_in`**：在 AGQ spec 中正式定义 wave0 source intake 的 task card 模板，Agent 根据 topic_registry 批量生成 enqueue CLI 命令
- **灌料方式**：Agent 模板化生成——MD 给 Agent 一个 task card 模板，Agent 根据 `rb_plan.md` frontmatter `topic_registry` 为每个 topic 生成一条 `operate-queue enqueue` 命令。一个 topic 一个 task，一次性灌满
- **不产出**：无新 JS 代码、无新 engine、无新 CLI、不碰 `queue-manager.mjs`

## Capabilities

### New Capabilities

（无新增 capability——本 change 只修改已有 spec 的 requirement）

### Modified Capabilities

- `research-wave-phase-content`: MODIFIED — RWP-001 (phase-wave0.md body) 的 Allowed Actions 从自由文本变为 queue-driven 三阶段模式（灌料、执行循环、收尾+gate）
- `agentic-queue`: MODIFIED — 新增 AGQ-007 producer_rule `source_intake_fan_in`，定义 wave0 source intake task card 的正规模板和灌料行为

## Impact

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`：§3 重写（唯一改动的代码文件）
- `openspec/specs/research-wave-phase-content/spec.md`：RWP-001 行为变更
- `openspec/specs/agentic-queue/spec.md`：新增 AGQ-007
- `openspec/governance/req-registry.yaml`：新增 RWP-008, AGQ-007
- 不影响：gate definition、gate CLI、transitions.chain.json、queue-manager.mjs、其他 phase node
