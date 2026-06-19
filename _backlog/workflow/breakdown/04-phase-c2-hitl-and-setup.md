---
schema: workflow-breakdown/v1
doc_id: wf-04-phase-c2-hitl-and-setup
title: "Phase C2：HITL1 与 Setup"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2.2 从输入材料得出的关键判断"
  - "6. 生命周期模型（Lifecycle Model）"
  - "9. Stop Semantics"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase C: Full Content Migration by Phase"
source_context:
  - guidelines/project-charter.md
  - openspec/specs/schema-core/spec.md
  - DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl
  - DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl
  - DPT_FRAMEWORK/cli/validate-bundle.mjs
  - DPT_FRAMEWORK/cli/inspect-bundle.mjs
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
  - wf-03-phase-c1-shared-and-instantiation
owns:
  - HITL1 的 stop: yes 行为和 profile 写入
  - setup phase 的 bundle consistency 验证边界
  - hitl1_recorded 与 setup_ready gate 的检查方向
does_not_own:
  - instantiation scaffold 创建
  - wave evidence 产出
  - HITL2/final 用户反馈路径
  - complete readiness gate
downstream_targets:
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md
  - DPT_FRAMEWORK/schema/gate_definitions/gate-hitl1-recorded.definition.json
  - DPT_FRAMEWORK/schema/gate_definitions/gate-setup-ready.definition.json
  - DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs
  - DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs
---

# Phase C2：HITL1 与 Setup

## 1. 本段目标

Phase C2 定义 instantiation 之后的两个关键阶段：

1. `hitl1`：停下来问用户，记录 profile/must-answer/user constraints。
2. `setup`：不问用户，验证已实例化 bundle 和 HITL1 写入结果足以进入 Wave0。

关键原则：HITL1 是 human interaction node，但用户答案必须写进 active bundle，尤其是 `rb_profile.yaml`。不能让用户回答只停留在 chat memory。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 2.2 节 | 明确 HITL 是独立 node，但不应停留在 chat memory。 |
| baseline 第 6 节 | 定义 HITL1 在 instantiation 后，setup 在 HITL1 后。 |
| baseline 第 9 节 | 定义 `stop: yes` 仅用于 HITL nodes，`stop: no` 阶段应自主推进。 |
| baseline 第 11 节 | 给出 HITL1 和 setup 的 minimum real verifiable actions。 |
| `schema-core/spec.md` | profile/HITL/status/queue/trace 等 schema surface 背景。 |
| `rb_profile.yaml.tmpl` | 当前 profile template 的实际位置。 |
| `validate-bundle.mjs` / `inspect-bundle.mjs` | setup 可复用的 deterministic bundle inspection 入口。 |

## 3. 范围内

Phase C2 范围内：

- 定义 `phase-hitl1.md` 的用户交互边界。
- 定义 `phase-setup.md` 的检查边界。
- 定义 HITL1 写入 `rb_profile.yaml` 的要求。
- 定义 `hitl1_recorded` gate 的检查方向。
- 定义 `setup_ready` gate 的检查方向。
- 定义 HITL1/Setup 的 repair posture。

## 4. 范围外

Phase C2 不负责：

- 自动生成 `dpt_rb_*` 名称。
- 创建 initial topic/reference/artifact scaffold。
- 搜集 evidence。
- Wave1 placeholder/subagent boundary。
- HITL2 final review。

## 5. 目录归属和下游位置

未来实现落点：

```text
DPT_FRAMEWORK/workflows/
  nodes/
    phases/
      phase-hitl1.md
      phase-setup.md

DPT_FRAMEWORK/schema/gate_definitions/
  gate-hitl1-recorded.definition.json
  gate-setup-ready.definition.json

DPT_FRAMEWORK/cli/gates/
  check-gate-hitl1-recorded.mjs
  check-gate-setup-ready.mjs
```

HITL1 的具体问题可以写在 node body 中；字段解释可进入 `shared-profile.md`。字段合法性最终由 schema/gate/CLI 检查。

## 6. 必须达标的结果

A04-1. `phase-hitl1.md` 必须声明：

```yaml
node_type: phase
id: phase-hitl1
phase: hitl1
gate: hitl1_recorded
next: setup
stop: yes
```

A04-2. HITL1 必须定义要问用户的问题类型，并把答案写入 active bundle。最低要求包括：

- `research_profile`
- `root_must_answer_set`
- HITL1 recorded/status marker

A04-3. `hitl1_recorded` gate 至少应检查：

- `rb_profile.yaml` 存在且可解析。
- required HITL1/profile fields 已写入。
- 空值、placeholder、未回答状态不能通过。
- trace 或状态中有 HITL1 recorded evidence。

A04-4. `phase-setup.md` 必须声明：

```yaml
node_type: phase
id: phase-setup
phase: setup
gate: setup_ready
next: wave0
stop: no
```

A04-5. Setup 必须验证：

- canonical control files 可达且可解析。
- initial topic/reference/artifact scaffold 存在。
- HITL1 profile data 已记录。
- plan/profile/status/queue 的基本一致性。
- 没有跳过 gate 或提前写入 wave complete 状态。

A04-6. Setup 不能替 Agent 做 research，也不能把 setup pass 当成 readiness pass。

A04-7. `setup_ready` gate fail 后，Agent 必须按 inspect/advice repair 并重跑同一 gate。

## 7. 风险、缺口、容易混淆点

R04-1. HITL1 很容易变成“问完用户，Agent 记住了”。必须强调写入 active bundle，gate 检查 bundle，不检查聊天摘要。

R04-2. Setup 很容易膨胀成 preflight + research planning + readiness。Foundation 阶段 setup 只检查进入 Wave0 前的结构和状态。

R04-3. `stop: yes` 不等于 gate 可以跳过。HITL1 问完用户后仍必须运行 `hitl1_recorded` gate。

R04-4. `stop: no` 的 setup 如果遇到权限/工具/结构性 blocker，需要记录 escalation，而不是假装 setup ready。

## 8. Review Questions

Q04-1. HITL1 是否明确写入 `rb_profile.yaml`，而不是 chat memory？

Q04-2. `hitl1_recorded` gate 的检查方向是否足够 deterministic？

Q04-3. Setup 的职责是否被限制在进入 Wave0 前的 bundle consistency？

Q04-4. Setup 是否避免提前承担 readiness 或 research quality 职责？

Q04-5. HITL1 和 setup 的 stop behavior 是否符合 baseline？
