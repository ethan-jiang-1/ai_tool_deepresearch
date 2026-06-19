---
node_type: phase
id: phase-wave1
phase: wave1
gate: wave1-complete
stop: "no"
subagent: true
requires:
  - shared/shared-anti-cheating-rules
suggested_context:
  - shared/shared-repair-guidance
---

# Phase: Wave1 — Topic-Specific Deepening (Placeholder)

> **Foundation Status**: 此 phase 在 Workflow Foundation 阶段为 **placeholder capability boundary**。
> 完整 subagent dispatch、candidate intake、repair/backfill、fan-in review 属于后续 Phase D / future capability track。
> Foundation 阶段只要求写入简单、topic-scoped skeleton artifact(s)，让 workflow 能实验性跑通。

## 1. Stage Goal

（Foundation placeholder）写入简单、topic-scoped、可实验跑通的 skeleton artifact(s)，标记 placeholder capability boundary。不声称 full subagent research 完成。

## 2. Required Inputs

- Wave0 shared reference artifacts
- Topic index from `seed_topics/`
- `shared-anti-cheating-rules.md`

## 3. Allowed Actions

- 按 topic index 选择 topic scope
- 写入少量 topic-scoped skeleton artifact(s) 到 `artifacts/wave1/`
- 标记 artifact 为 foundation placeholder
- 更新 `rb_status.json`
- **不允许**：subagent dispatch、candidate intake、full deepening、fan-in review

## 4. Expected Artifacts

- `artifacts/wave1/` 下至少 1 个 topic-scoped skeleton artifact
- Artifact 明确标记 foundation placeholder 状态
- Trace 中有 Wave1 skeleton completion evidence

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path>
```

## 6. On Gate Pass

Advance to `wave2`：加载 `phase-wave2.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，补充 skeleton artifact 或修正 placeholder marker，rerun same gate。

## 8. Stop Behavior

`stop: no` — Agent 自主产出 topic skeleton artifact(s)。

## 9. Anti-cheating Rules

- MUST NOT 声称 full subagent coverage completed
- MUST NOT 声称 topic-specific deepening completed
- MUST NOT 声称 candidate intake/backfill completed
- `subagent: true` 在 foundation 阶段只是 future marker——不表示必须 dispatch subagent
- Skeleton artifact 必须明确标记 placeholder，不能伪装为完整研究输出
