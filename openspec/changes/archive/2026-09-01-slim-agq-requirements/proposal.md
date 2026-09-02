# Proposal: 2026-09-01-slim-agq-requirements

## Why

`agent/agentic-queue` 的 "Producer rule topic_deepening" requirement（294 行、13 散文段 + 16 场景）是全库 p90（100 行）的近 3 倍异常值，混合了三个不同主题：demand 形态绑定、assignment-mode 审计修复、多项 claim 校验（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.4，C3d 批次）。

## What Changes

- **一个 requirement 拆为三个**（全部文本逐字节保留，仅换标题）：
  - `Producer rule topic_deepening SHALL bind primary paired or supplementary deepening demand`（demand 形态 + assignment_mode 语义 + convergence 补充触发）
  - `Assignment-mode repair SHALL stay a single audited queue repair operation`（未认领项修复、克隆、trace 事件）
  - `Multi-item topic_deepening claims SHALL validate assignment modes without partial allocation`（批量 claim 零部分分配）
- **16 个场景全数保留**（6+9+1），组内原相对顺序。
- **header `> req:` 不变**（AGQ-001..028）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/agentic-queue` | 主 spec + "Producer rule topic_deepening" 块结构勘察（13 散文段 + 16 场景） | Modify | requirement 结构重组（1→3），文本逐字保持；无行为变更。 |
| `research/wave1-intake` | catalog 行 | Excluded | wave1 深化语义由其自身 capability 拥有；本批不动。 |
| `agent/delegated-work-units` | catalog 行 | Excluded | work-unit 生命周期无涉。 |

## Impact

- `openspec/specs/agent/agentic-queue/spec.md`：REM（1 旧块）+ ADD（3 新块）。
- 零代码触点；新增一个 unit 结构锁。
- 文本锁面：apply 前 `list-doc-locks` 复核 AGQ spec 锁定测试（`residual-spec-drift-text-locks` 的 AGQ-007/027 verbatim 对比所涉块不在本批范围，apply 后全量验证确认）。

## Source of Record 与责任边界

- Source of Record 不变：同一 `operate-queue`/queue-manager 行为。最短合法闭环：纯结构。Net simplification：审阅粒度回归常态。
- Semantic-precision reflection：3 标题各对应一个有界问题（demand 绑定 / 审计修复 / 批量 claim）；停止点不变。
- 责任边界：无 user decision、无 permission 变化；Engine verdict 面零触碰。
