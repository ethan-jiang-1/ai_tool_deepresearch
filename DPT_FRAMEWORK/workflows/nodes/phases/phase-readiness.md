---
node_type: phase
id: phase-readiness
phase: readiness
gate: readiness_passed
next: final
stop: "no"
requires: []
suggested_context:
  - shared-gate-rules
---

# Phase: Readiness — Final Deterministic Precheck

## 1. Stage Goal

Final 交付前运行最后一个 deterministic checkpoint：验证所有 required artifacts 可达、所有 non-terminal gate 通过状态可审计、profile/status/queue/trace 无矛盾。Readiness 不做语义 quality judgment。

## 2. Required Inputs

- Active `dpt_rb_*` run bundle（全部 phase 完成）
- 所有 8 个 non-terminal gate 的 CLI output 或 trace evidence
- `rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`

## 3. Allowed Actions

- 检查所有 required artifacts 存在且可解析
- 检查 8 个 non-terminal gate 的通过状态可审计（from trace 或 gate CLI output）
- 检查 profile/status/queue/trace 间的一致性
- 检查 final delivery 的输入来自 verified bundle state

## 4. Expected Artifacts

- Readiness check report（可内嵌在 trace 或 status 中）
- All gates passed evidence 可追溯
- Final delivery input 来自 verified state

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `final`：加载 `phase-final.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，补充缺失的 artifacts 或修复不一致，rerun same gate。Readiness fail 可能导致回到 earlier phase（通过 HITL2 repair/rerun）。

## 8. Stop Behavior

`stop: no` — Agent 自主执行 readiness check。

## 9. Anti-cheating Rules

- Readiness 只能检查 deterministic readiness——artifact 存在、gate evidence 可审计、状态一致
- MUST NOT 做 final writing quality 或 semantic research quality 判断
- 不能因为 "synthesis 写得不够好" 而 fail readiness
- 缺 artifact、缺 trace、缺 gate evidence 时 MUST fail
