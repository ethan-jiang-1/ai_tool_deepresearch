---
node_type: phase
id: phase-wave1
phase: wave1
gate: wave1-complete
stop: "no"
subagent: true
requires:
  - shared/shared-profile
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Wave1 — Topic-Scoped Placeholder Skeleton

## 1. Stage Goal

为 topic_registry 中的每个 topic 写入 topic-scoped skeleton artifact，显式标记 `capability: foundation-placeholder`。Wave1 在 foundation 阶段只建立 placeholder structure——不做 topic-specific deepening、subagent dispatch 或 candidate intake。

**`subagent: true` frontmatter 在 foundation 只是 future marker**，不启用真实 subagent dispatch。当前 foundation 阶段只做单 Agent 写入 skeleton 文件。

## 2. Required Inputs

- Wave0 产出的 `reference/index.md` 和 `reference/<topic>/source.yaml`
- `rb_plan.md` frontmatter 的 `topic_registry`
- `shared-profile.md`（research profile）
- `shared-schemas.md`（wave artifact 目录结构）

## 3. Allowed Actions — Current Phase Actions

### 3a. 读取 Wave0 产出

- 读取 `reference/index.md` 获取 foundation reference 概览
- 读取每个 topic 的 `reference/<topic>/source.yaml` metadata

### 3b. 写入 topic-scoped skeleton

- 为 topic_registry 中的每个 topic 创建 `artifacts/wave1/<topic>/skeleton.md`
- 每个 skeleton 必须显式标注 `capability: foundation-placeholder`
- Skeleton 内容：
  - **Topic 名称与 slug**（与 registry 一致）
  - **已知前提**（从 Wave0 reference 派生）
  - **关键维度**（从 reference metadata 和 research profile 中提取）
  - **open questions**（需要后续 deepening 回答的问题）
  - **引用**（Markdown link 格式，指向 Wave0 `reference/<topic>/source.yaml`）
- 更新 `rb_status.json`（推进 `current_gate` / `next_gate`）与 `rb_trace.jsonl`
- 在 `rb_trace.jsonl` 中记录 `wave1_completion` trace event

### 3c. Foundation Placeholder Boundary

**禁止声称的内容**（这些是 future expansion 的范围，foundation 阶段不应出现）：
- "full subagent coverage completed"
- "topic-specific deepening completed"
- "candidate intake completed"
- "fan-in review completed"
- "native subagent fan-out/fan-in completed"

## 4. Expected Artifacts

- `artifacts/wave1/<topic>/skeleton.md`（对于 topic_registry 中的每个 topic 至少 1 个文件）
- 每个 skeleton 显式标记 `capability: foundation-placeholder`
- 每个 skeleton 不含上述禁止声称的内容
- `rb_trace.jsonl` 中有 `wave1_completion` event
- `rb_status.json` 中 `current_gate: wave1_complete` / `next_gate: wave2_complete`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `wave2`：加载 `phase-wave2.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| 某 topic 缺 `skeleton.md` | 为该 topic 创建 skeleton 文件 |
| 缺失 `capability: foundation-placeholder` marker | 在 skeleton 中显式加回 marker |
| 包含 false completion claim | 移除或改写禁止声称的内容 |
| `trace_event_present` fail | 确认已记录 `wave1_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave1_complete`/`wave2_complete` |

**Persistent failure：** 若 wave1 gate 连续 3 次修复无进展，记录 escalation。

## 8. Stop Behavior

`stop: no` — Agent 自主写入 skeleton。每个 topic 的 skeleton 不需要 Agent 停下来等待用户审批。

## 9. Anti-Cheating Rules

- **禁止声称 full subagent coverage completed**：foundation 阶段不做 subagent dispatch
- **禁止声称 topic-specific deepening completed**：skeleton 只是 placeholder，不做 deepening
- **禁止声称 candidate intake/backfill completed**：future expansion track
- **禁止声称 fan-in review completed**：future expansion track
- **禁止移除或弱化 `capability: foundation-placeholder` marker 以通过 gate**：marker 是 foundation boundary 的显式标签
- **禁止写 fake skeleton 内容冒充真实 artifact**：skeleton 必须基于 Wave0 的真实 reference
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

---

## Future Expansion Guidance

> **本节是只读参考，不作为 `wave1-complete` gate 的 pass 条件。** 以下 tracks 描述了 foundation 之后的扩展方向。当前 phase 只做 Current Phase Actions（上方 Section 3a-3c）。

### Expansion Tracks

1. **topic-specific deepening**：对每个 topic 的 open questions 做定向 deep research，产出 topic 级 evidence 报告
2. **subagent dispatch**：启动独立 subagent，按 topic 分配 deepening 任务，每个 subagent 产出自己的 `result.md` + `receipt.md`
3. **candidate intake**：从 deepening 产出中提取 candidate evidence particle，按 schema 入库
4. **repair/backfill**：对 gate fail 的 topic 做定向补充，按 inspect/advice 逐项修复
5. **fan-in review**：收集 subagent 结果后进行跨 topic 交叉验证和冲突解决
6. **topic artifact quality gates**：对 deepening 产出的 evidence particle 做 schema 校验和引用一致性检查

### Capability Boundary Summary

| 能力 | Foundation (当前) | Future Expansion |
|------|-------------------|------------------|
| Topic-scoped skeleton | ✅ 写入 | — |
| `capability: foundation-placeholder` marker | ✅ 必须 | — |
| Subagent dispatch | ❌ 不启动 | 启动 |
| Topic deepening | ❌ 不做 | 定向 deep research |
| Candidate intake | ❌ 不做 | schema 化入库 |
| Fan-in review | ❌ 不做 | 跨 topic 交叉验证 |
| Quality gates | ❌ 不做（只有 skeleton structural check） | evidence particle 级校验 |
