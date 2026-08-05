---
node_type: phase
id: phase-instantiation
phase: instantiation
gate: instantiation-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-silent-execution
suggested_context: []
---

# Phase: Instantiation

## 0. Execution Brief

- **Objective**: Create a real run bundle surface for the user's research question.
- **Start here**: Derive a legal bundle name from the original question, then run `instantiate-run-bundle.mjs`.
- **Path to pass**: Instantiate the bundle through the CLI, reload the created control files and scaffold directories, then run the instantiation gate.
- **Completion check**: `check-gate-instantiation-complete.mjs` passes for `phases/phase-instantiation.md`.
- **Failure posture**: Consume top-level `hints[]` first, execute authorized mechanical repair, and run the exact same-Gate `rerun`; use `inspect[]`/`advice[]` only as compatible detail.

## 1. Stage Goal

为本次 Deep Research request 创建真实 `dpt_rb_*` run bundle，包含 canonical control files、scaffold directories。不替代后续 HITL / setup / wave 阶段。

## 2. Required Inputs

- 用户原始 research question（用于生成合适的 bundle name）
- `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`

## 3. Allowed Actions

- 基于 research question 生成合适的 kebab-case bundle name（`dpt_rb_<english-slug>`）
- 调用 `node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>`
- 读取 CLI 返回的 bundle 路径
- Reload 新建 bundle 的 control files 和目录结构以确认创建成功
- 检查 CLI 返回的 bundle surface

## 4. Expected Artifacts

- 新建 bundle 目录（`dpt_rb_<name>` 或 disposable experiment 的 `dpt_disp_<name>_<hex>`）
- `BUNDLE_MAP.md` passive bundle map
- 5 个 `rb_*` control files（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`）
- Canonical scaffold directories：`seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/`

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md
```

## 6. On Gate Pass

读取 `check.next`（来自 transition table 查询）。Advance to `hitl1`：加载 `phase-hitl1.md`。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority，也不得用其 prose 猜 repair kind、路径或命令。`repair_kind` 只分配责任，当前 loaded node 的 `stop` 才决定 interaction placement；本 phase 为 `stop: no`，任何分类都不得主动发起提问、状态/进度、approval、acknowledgement 或等待。用户主动的 current turn 可从 direct facts 得到直接回答，但回答不创建 checkpoint、state、permission、route、mutation 或 reentry authority。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：确认 `write_to` 是 hint 已声明的 authorized mutable surface，由 Agent 完成最小修复。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal Engine operation；不得直接编辑 status、trace、ledger、index、receipt、hash 或其他 Engine-owned authority。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的新语义/风险决定；只有已存在的 HITL owner 可发起并记录该决定，本 phase 不创建交互，暂无 legal path 时保持 failed checkpoint。
4. `repair_kind: external_action`：识别不可代理的外部前置条件；不主动请求 acknowledgement，条件经现有边界满足后由 Agent 继续。
5. `repair_kind: missing_contract`：保留 `write_to` 指出的缺失 capability/contract boundary，不发明替代 mutation、手写 authority、用户等待或第二条成功路径。

Hint 不创造 permission。完成可执行动作后，Agent MUST 运行该 hint 的 exact `rerun`，回到同一个 `instantiation-complete` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 补猜 blocking repair；按 `missing_contract` 暴露最小边界。默认 retry limit 3 次；仅把 `--attempt N` 作为 Agent-reported retry hint（N 从 1 开始递增），不得让 fatigue wording 覆盖 direct hint。

**Bundle name 相关 fail — 静默处理（`stop: no`）：**
- 仅当 structured hint/instantiate CLI 的直接 invocation fact 指向以下 name repair 时使用这些分支；不得用本表覆盖不同的 `repair_kind` 或 `write_to`。
- **Name collision**（目标 production bundle 已存在）→ 自动生成 hex6 后缀替代名（`<original>_<hex6>`），重新调用 `instantiate-run-bundle.mjs <new_name>`。通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户：
  ```bash
  node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"instantiation","reason":"name_collision","action":"auto_suffix","original_name":"<name>","new_name":"<new_name>"}'
  ```
- **非法 bundle name**（不匹配 `[a-z0-9][a-z0-9-]*` 或 `[a-z0-9][a-z0-9_-]*`）→ 自动规范化名称（替换非法字符为 `-`，合并连续 `-` 为单个），重新调用 `instantiate-run-bundle.mjs`。通过 accepted trace/log surface 记录 normalization，不询问用户：
  ```bash
  node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"instantiation","reason":"illegal_name","action":"normalize","original_name":"<name>","normalized_name":"<normalized>"}'
  ```
- **已创建的 illegal bundle**：不得 rename 或 patch `rb_plan.md` / `rb_profile.yaml` 伪装为合法。恢复必须走 fresh legal instantiation path——删除非法 bundle，用规范化名称重新调用 `instantiate-run-bundle.mjs`。

## 8. Stop Behavior

`stop: no` — Agent 自主完成此 phase，不暂停请求用户输入，不发送创建进度或 idle/no-work 汇报。Name collision 和 illegal name 均静默处理（自动 hex6 后缀或规范化）。

创建 bundle directory/control files 只是本地子步骤，不是用户 checkpoint。创建后必须 reload instantiated surface，运行 `instantiation-complete` gate，并只按 gate CLI `check.next` 加载下一 phase。若本地创建看似完成但 gate 尚未 pass，继续按 §7 修复或静默降级，不浮出水面。

## 9. Anti-Cheating Rules

- **禁止跳过 CLI 直接手搓 "看起来像 bundle" 的结果**：bundle 必须通过 `instantiate-run-bundle.mjs` 创建
- **禁止声称 evidence coverage 或 research completion**：此 phase 只创建 bundle shell，不做任何 research work
- **禁止在 bundle name 冲突时浮出水面询问用户**：必须自动生成 hex6 后缀或规范化名称，静默处理
- **禁止 rename 已创建的 illegal bundle 或修改 rb_plan.md/rb_profile.yaml 伪装为合法**：恢复必须走 fresh legal instantiation path
- **禁止在这个阶段提 HITL 问题**：HITL1 是下一 phase
- **禁止搜索 / 阅读 / 产出 evidence**：此 phase 不做 research
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:instantiation START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:instantiation END — <summary>"` |
