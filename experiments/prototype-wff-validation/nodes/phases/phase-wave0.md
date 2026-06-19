---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0_complete
next: wave1
stop: "no"
requires:
  - shared/shared-anti-cheating-rules
suggested_context:
  - shared/shared-schemas
---

# Phase: Wave0 — Shared Foundation Evidence

## 1. Stage Goal

产出少量真实的 shared reference artifacts 作为后续 research 的 foundation evidence。Wave0 不涉及 topic-specific deepening——那是 Wave1 的范围。

## 2. Required Inputs

- Validated `dpt_rb_*` run bundle（setup gate passed）
- `shared-anti-cheating-rules.md`

## 3. Allowed Actions

- 搜索并收集 shared foundation reference materials
- 写入 reference artifact files（metadata 必须可解析）
- 更新 `seed_topics/` 的 topic index
- 更新 `rb_status.json` 和 `rb_trace.jsonl`

## 4. Expected Artifacts

- `reference/` 下新增至少满足 foundation floor 数量的 reference artifacts
- Artifact metadata 可解析
- Topic index 更新
- Trace 中有 Wave0 completion evidence

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `wave1`：加载 `phase-wave1.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，补充不足的 reference artifacts 或修复 metadata，rerun same gate。

## 8. Stop Behavior

`stop: no` — Agent 自主收集 shared reference。

## 9. Anti-cheating Rules

- Reference artifacts MUST be real——不能写 fake source 或 fake metadata
- Artifact count 必须达到 foundation floor（由 gate definition 定义）
- Metadata 必须可解析（by design，不是 by luck）
