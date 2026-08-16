---
node_type: phase
id: phase-setup
phase: setup
gate: setup-ready
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-schemas
---

# Phase: Setup

## 0. Execution Brief

- **Objective**: Verify the instantiated bundle is structurally consistent before research waves begin.
- **Start here**: Load the control files, scaffold directories, HITL1 marker, and basename fields.
- **Path to pass**: Repair missing or malformed setup surface, keep status aligned, then run the setup gate.
- **Completion check**: `check-gate-setup-ready.mjs` passes for `phases/phase-setup.md`.
- **Failure posture**: Consume top-level `hints[]`, execute authorized mechanical repair, and run the exact same-Gate `rerun`; compatible prose never authorizes direct control-state edits.

## 1. Stage Goal

验证已实例化 bundle 的 structural consistency — 确认 canonical control files 可解析、scaffold 存在、HITL1 已记录、basename 跨文件一致 — 使 bundle 具备进入 wave0 的条件。

**`setup-ready` 不是 `readiness-passed`。** 此 phase 只检查结构一致性，不做研究质量、evidence coverage、synthesis adequacy 判断。

## 2. Required Inputs

- 已实例化的 run bundle（含 HITL1 写入的 `rb_profile.yaml`）
- `shared-profile.md`（字段 reference）
- `shared-schemas.md`（schema 和 trace 区分说明）

## 3. Allowed Actions

- 检查 control files 存在且可解析：
  - `rb_plan.md` → `PlanSchema`
  - `rb_profile.yaml` → `ProfileSchema`
  - `rb_status.json` → `StatusSchema`
  - `rb_queue.json` → `QueueSchema`
  - `rb_trace.jsonl`（存在即可，不要求非空）
- 检查 directory scaffold 存在：`seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/`
- 检查 HITL1 marker 已写入 profile：`human_decision_checkpoints.hitl1.status == recorded`
- 检查 `rb_status.json` 仍然是 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（无 status drift）
- 按 normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 三者一致

## 4. Expected Artifacts

一致的 pre-wave0 bundle surface：所有 control files 存在且可解析、scaffold 完整、HITL1 已记录、basename 一致、无 status drift。

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md
```

Retry 时传 Agent-reported `--attempt N`（N 从 1 开始，每次 rerun 递增）。若 gate 返回 `step_back: true`，暂停并重新阅读本 phase instructions §0 和 §5 后再决定策略。

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-seed-topics.md`）。先消费 handoff，再同步 source gate status：

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to setup_ready
```

从 `enter-phase` 渲染出的 seed-topics Markdown 继续执行下一 phase。`advance-status` 只同步 just-passed source gate；它不是加载或执行下一 phase 的动作。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。也不得用其 prose 猜 repair kind、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：由 Agent 对 `write_to` 已授权的 exact mutable surface 做最小修复，例如修正允许 Agent 修改的 YAML/Markdown field 或创建明确授权的 scaffold projection。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal operation；status、trace、ledger、index、receipt、hash 和 Engine-owned scaffold/binding 不得直接编辑或按 template 手搓。
3. `repair_kind: user_decision`：识别真正缺失的 HITL1 语义；只有 existing HITL1 owner 可发起并记录，已有决定不得重复询问，本 phase 暂无 legal path 时保持 failed checkpoint。
4. `repair_kind: external_action`：识别不可代理的权限/环境前置条件；不主动请求 acknowledgement，满足后由 Agent 继续。
5. `repair_kind: missing_contract`：保留 exact unavailable contract boundary，不猜测 fallback、手工恢复 control authority、用户等待或建设第二路径。

Hint 不创造 permission。完成可执行动作后 Agent MUST 运行该 hint 的 exact `rerun`，回到同一个 `setup-ready` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 补猜 blocking repair；按 `missing_contract` 暴露最小边界。尤其 status drift、basename binding、缺失 control authority 或 HITL marker 必须遵循 hint 所指 owner operation/decision，不得直接改 `rb_status.json`、伪造 HITL marker 或用文件重建绕过 instantiation/HITL1 owner。

**Persistent failure：** 若 setup gate 连续 3 次修复无进展，通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: partial`），不写 `state: blocked`：
```bash
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"setup","gate":"setup-ready","gap_impact":"partial","reason":"persistent_failure_3x","attempts":3}'
```
降级后 Agent 仍有责任继续尝试不同的修复策略（换方向、换诊断策略），而非放弃或浮出水面。静默阶段不设 `state: blocked`。若所有修复路径穷尽后仍然无法通过 gate，记录 `silent_unpassable`（见 §8）并保持 non-blocked/in-progress holding。

## 8. Stop Behavior

`stop: no` — Agent 自主验证，不发送 setup progress 或 idle/no-work 汇报。Setup 本地校验完成后必须运行 `setup-ready` gate；phase handoff 完成条件是 gate pass + `enter-phase --node <check.next>` 写入 seed-topics route-bound load witness + `advance-status --to setup_ready`，不是“看起来已验证”。

若遇到权限/工具/结构性 blocker 无法修复，保留 direct hint；只有 `user_decision`、`external_action` 或 `missing_contract` 才暴露其最小边界，不能把普通命令推给用户。可通过 accepted trace/log surface 记录 `silent_degradation` 或 `silent_unpassable`（保持 non-blocked/in-progress），但 fatigue/degradation wording不得替代 `missing_fact`、`write_to` 和 exact `rerun`。所有下一 phase 路由只来自 gate CLI `check.next`。

## 9. Anti-Cheating Rules

- **禁止把 setup pass 当 readiness pass**：`setup-ready` 只确认结构一致性，不意味研究质量过关
- **禁止手动修改 control files 冒充 ready**：gate fail 必须通过真实 repair → rerun 解决
- **禁止跳过 setup gate 直接进入 wave0**：必须 `setup-ready` gate pass 后才能推进
- **禁止在 setup 阶段做 research**：setup 是结构检查，不做搜索/阅读/evidence 工作
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:setup START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:setup END — <summary>"` |
