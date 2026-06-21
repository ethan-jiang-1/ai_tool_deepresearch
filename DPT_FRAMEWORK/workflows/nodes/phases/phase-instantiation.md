---
node_type: phase
id: phase-instantiation
phase: instantiation
gate: instantiation-complete
stop: "no"
requires: []
suggested_context: []
---

# Phase: Instantiation

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
- `START_FROM_HERE.md`
- 5 个 `rb_*` control files（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`）
- Canonical scaffold directories：`seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md
```

## 6. On Gate Pass

读取 `check.next`（来自 transition table 查询）。Advance to `hitl1`：加载 `phase-hitl1.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，修复缺失或不合法的 instantiation surface（如补建缺失的 control file 或 scaffold dir），rerun same gate。默认 retry limit 3 次。

**Bundle name 相关 fail 特殊处理：**
- Name collision（目标 production bundle 已存在）→ **报错停止**，请求用户提供新名称，重新 instantiate。不要自动追加 `-2` / `-3`。
- 非法 bundle name（不匹配 `[a-z0-9][a-z0-9-]*` 或 `[a-z0-9][a-z0-9_-]*`）→ **fail-stop**，重新选择合法名称，重新走 `instantiate-run-bundle.mjs`。不要 rename 已创建目录，不要修改 `rb_plan.md` / `rb_profile.yaml` 的 `plan_basename` 来追认非法名。

## 8. Stop Behavior

`stop: no` — Agent 自主完成此 phase，不暂停请求用户输入。

## 9. Anti-Cheating Rules

- **禁止跳过 CLI 直接手搓 "看起来像 bundle" 的结果**：bundle 必须通过 `instantiate-run-bundle.mjs` 创建
- **禁止声称 evidence coverage 或 research completion**：此 phase 只创建 bundle shell，不做任何 research work
- **禁止在 bundle name 冲突时自动改名**：必须报错停止，请求用户提供新名称
- **禁止在这个阶段提 HITL 问题**：HITL1 是下一 phase
- **禁止搜索 / 阅读 / 产出 evidence**：此 phase 不做 research
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
