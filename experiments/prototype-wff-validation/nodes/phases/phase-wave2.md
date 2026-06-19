---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2_complete
next: hitl2
stop: "no"
requires: []
suggested_context:
  - shared-schemas
---

# Phase: Wave2 — Cross-Topic Synthesis

## 1. Stage Goal

从已验证的 Wave0 和 Wave1 artifacts 派生一个小的 cross-topic synthesis artifact。Synthesis 必须引用来源 artifacts。

## 2. Required Inputs

- Wave0 shared reference artifacts（`reference/`）
- Wave1 topic-scoped artifacts（`artifacts/wave1/`）
- `rb_status.json` 中 Wave0/Wave1 completion 状态

## 3. Allowed Actions

- 阅读已验证的 Wave0/Wave1 artifacts
- 派生 cross-topic synthesis artifact 写入 `artifacts/wave2/`
- 在 synthesis 中引用来源 artifacts
- 更新 `rb_status.json` 和 `rb_trace.jsonl`

## 4. Expected Artifacts

- `artifacts/wave2/` 下至少 1 个 synthesis artifact
- Synthesis 明确引用已验证的 Wave0/Wave1 artifacts
- Trace 中有 Wave2 completion evidence

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `hitl2`：加载 `phase-hitl2.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，补充 artifact references 或修正 synthesis，rerun same gate。

## 8. Stop Behavior

`stop: no` — Agent 自主完成 synthesis。

## 9. Anti-cheating Rules

- Synthesis MUST 从 verified wave artifacts 派生，不能凭空总结
- MUST NOT 使用未通过对应 gate 的 artifact 作为 synthesis 输入
- Source reference links 或 artifact references 必须可追踪
