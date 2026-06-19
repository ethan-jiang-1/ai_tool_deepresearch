---
node_type: phase
id: phase-instantiation
phase: instantiation
gate: instantiation_complete
next: hitl1
stop: "no"
requires: []
suggested_context: []
---

# Phase: Instantiation

## 1. Stage Goal

为本次 Deep Research request 创建真实 `dpt_rb_*` run bundle，包含 canonical control files、initial topic data 和 reference/artifact directory scaffold。

## 2. Required Inputs

- 用户原始 research question
- `DPT_FRAMEWORK/rb_templates/` 中的 bundle 模板

## 3. Allowed Actions

- 生成 `dpt_rb_<english-slug>` 目录名
- 从模板创建 `rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`
- 创建 `seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/` 目录
- 写入初始 topic / seed-topic data

## 4. Expected Artifacts

- `dpt_rb_<slug>/` 目录存在且命名合法
- 全部 5 个 canonical control files 存在且可解析
- `seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/` 目录存在

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `hitl1`：加载 `phase-hitl1.md`。

## 7. On Gate Fail

读取 CLI 返回的 `inspect` / `advice`，修复缺失或不合法的 control files / directories，rerun same gate。默认 retry limit 3 次；no-progress 或超限后 escalate/block。

## 8. Stop Behavior

`stop: no` — Agent 自主完成此 phase，不暂停请求用户输入。

## 9. Anti-cheating Rules

- MUST NOT 声称 evidence coverage 或 research completion
- MUST NOT 提前执行 HITL、setup、wave 或 readiness 检查
- Initial topic data 是 instance data，不是 research conclusion
- 所有创建动作必须在 active `dpt_rb_*` 内，不写回 `DPT_FRAMEWORK/`
