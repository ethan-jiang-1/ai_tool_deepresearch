---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2-complete
stop: "no"
requires:
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Wave2 — Cross-Topic Synthesis

## 1. Stage Goal

从已验证的 Wave0 reference 和 Wave1 skeleton 派生一份 cross-topic synthesis artifact，用标准 Markdown link `[label](relative/path.md)` 格式显式引用来源 artifact。Synthesis 不需要 comprehensive——它只需要从 foundation evidence 中派生出跨 topic 的模式、差异或主题线。

**Wave2 是 minimum cross-topic synthesis，不是 final report。** 引用链必须可验证（Markdown link 目标真实存在），但不要求 synthesis 覆盖所有维度或具有最终结论性。

## 2. Required Inputs

- Wave0 产出的 `reference/index.md` 和所有 `reference/<topic>/source.yaml`
- Wave1 产出的所有 `artifacts/wave1/<topic>/skeleton.md`
- `shared-schemas.md`（synthesis 引用格式和 wave artifact 目录结构）

## 3. Allowed Actions

- 读取 Wave0 的 reference index 和所有 topic metadata
- 读取 Wave1 的所有 topic skeleton（重点关注 open questions 和关键维度）
- 派生 synthesis artifact `artifacts/wave2/synthesis.md`
- Synthesis 必须使用标准 Markdown link `[label](relative/path.md)` 显式引用 Wave0/Wave1 artifacts：
  - 引用路径相对于 `artifacts/wave2/`（如 `../wave1/<topic>/skeleton.md` 指向 Wave1 artifact，`../../reference/<topic>/source.yaml` 指向 Wave0 metadata）
- 更新 `rb_status.json`（推进 `current_gate` / `next_gate`）与 `rb_trace.jsonl`
- 在 `rb_trace.jsonl` 中记录 `wave2_completion` trace event

## 4. Expected Artifacts

- `artifacts/wave2/synthesis.md`（非空）
- Synthesis 包含至少 1 个 Markdown link，指向 `reference/` 或 `artifacts/wave1/` 下的文件
- 至少 1 条引用目标在 bundle 中真实存在（gate 通过 `cross_field` Markdown link 解析验证）
- `rb_trace.jsonl` 中有 `wave2_completion` event
- `rb_status.json` 中 `current_gate: wave2_complete` / `next_gate: hitl2_recorded`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `hitl2`：加载 `phase-hitl2.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `synthesis.md` 缺失或为空 | 基于 Wave0/Wave1 artifact 派生 synthesis 内容 |
| 无 Markdown link | 为 synthesis 中的声明添加 Markdown link 引用 |
| 所有 link target 不存在 | 检查引用路径是否正确，确认目标 artifact 存在 |
| 部分 link target 不存在 | gate 仍可 pass（≥1 有效引用即可），但 advice 会列出失效路径供修复 |
| `trace_event_present` fail | 确认已记录 `wave2_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave2_complete`/`hitl2_recorded` |

**Persistent failure：** 若 wave2 gate 连续 3 次修复无进展，记录 escalation。

## 8. Stop Behavior

`stop: no` — Agent 自主派生 synthesis。Wave2 不做 stop-and-wait 人类审查（HITL2 是独立的审查阶段）。

## 9. Anti-Cheating Rules

- **禁止凭空总结（不引用任何 Wave0/Wave1 artifact）**：synthesis 中的每个关键声明必须有 Markdown link 指向来源 artifact
- **禁止伪造引用路径**：Markdown link 目标必须是在 bundle 中真实存在的文件
- **禁止声称 synthesis 是完整的 research conclusion**：Wave2 是 cross-topic synthesis，不是 final report——HITL2 和 readiness 阶段还会进行人类审查
- **禁止在引用链不完整时声称 synthesis 已验证**：至少 1 条引用目标必须真实存在
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
