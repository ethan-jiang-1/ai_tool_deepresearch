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
- **Failure posture**: Repair missing bundle surface from gate `inspect`/`advice`; for name collision or illegal name, silently suffix/normalize and re-instantiate through the CLI.

## 1. Stage Goal

为本次 Deep Research request 创建真实 `dpt_rb_*` run bundle，包含 canonical control files、scaffold directories。不替代后续 HITL / setup / wave 阶段。

## 2. Required Inputs

- 用户原始 research question（用于生成合适的 bundle name）
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`

## 3. Allowed Actions

- 基于 research question 生成合适的 kebab-case bundle name（`dpt_rb_<english-slug>`）
- 调用 `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>`
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
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md
```

## 6. On Gate Pass

读取 `check.next`（来自 transition table 查询）。Advance to `hitl1`：加载 `phase-hitl1.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，修复缺失或不合法的 instantiation surface（如补建缺失的 control file 或 scaffold dir），rerun same gate。默认 retry limit 3 次。传 Agent-reported `--attempt N` 给 gate CLI（N 从 1 开始，每次 rerun 递增）。

**Bundle name 相关 fail — 静默处理（`stop: no`）：**
- **Name collision**（目标 production bundle 已存在）→ 自动生成 hex6 后缀替代名（`<original>_<hex6>`），重新调用 `instantiate-run-bundle.mjs <new_name>`。通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"instantiation","reason":"name_collision","action":"auto_suffix","original_name":"<name>","new_name":"<new_name>"}'
  ```
- **非法 bundle name**（不匹配 `[a-z0-9][a-z0-9-]*` 或 `[a-z0-9][a-z0-9_-]*`）→ 自动规范化名称（替换非法字符为 `-`，合并连续 `-` 为单个），重新调用 `instantiate-run-bundle.mjs`。通过 accepted trace/log surface 记录 normalization，不询问用户：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"instantiation","reason":"illegal_name","action":"normalize","original_name":"<name>","normalized_name":"<normalized>"}'
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

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:instantiation START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:instantiation END — <summary>"` |
