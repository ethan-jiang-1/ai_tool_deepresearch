---
bug_id: BUG-124
title: "Shared reference Phase Agent bypass — repair_kind: agent_action hint is misleading when fix requires delegated sub-agent"
severity: P2
discovered: 2026-07-26
status: fixed_archived_change
resolved: 2026-07-27
fixed_by: 2026-07-27-align-wave0-shared-reference-guidance
bundle: dpt_rb_openspec-influence-landscape
phase: wave0
node: phases/phase-wave0.md
gate: wave0-complete
---

# BUG-124: Shared reference 的 repair hint 指向 Phase Agent，但修复只能由 delegated sub-agent 完成

## Resolution (2026-07-27)

Archived Change 3, `align-wave0-shared-reference-guidance` (v0.52), corrected
the Wave0 gate repair coordinates and producer guidance to name the existing
`wave0_source_intake` declared-output/formal-submit path. Focused unit and CLI
integration regressions prove that a submitted shared reference counts while a
direct Phase-created orphan remains unbacked. No new work-unit kind or queue
operation was introduced.

## 现象

Wave0 gate 报 `shared_ref_count_floor` 失败时，`hints[]` 返回 `repair_kind: agent_action` 和 `write_to: reference/`。Phase Agent 按 hint 创建了 22 个 `reference/00-shared-*.md` 文件（第一轮 YAML frontmatter 格式，第二轮 bullet metadata 格式），但 gate 始终判为 `filesystem_only_not_backed: delegated_bypass`——Phase Agent 直接写的 reference 文件不被接受，因为它们未出现在任何 submitted work-unit 的 output declaration 中。

两次格式化修复都失败后，Phase Agent 尝试通过 `operate-queue.mjs enqueue` + `operate-work-unit.mjs claim` 创建新的 delegated work unit 来产出 shared refs，但 claim 阶段的 `assignment preflight` 要求 payload 中有 `topic_uid` 和 `topic_slug`，而 shared ref 本质上是跨 topic 的，不属于单一 topic。

最终 gate 以 `passed: true` 但 `shared_ref_count_floor` 仍 failed 的 degraded 状态通过。

## 重现线索

1. 跑完 8 个 topic 的 wave0 source intake（每个 topic 的 sub-agent 只产出 `source.yaml`，未产出 `reference/00-shared-*.md`）
2. 运行 `check-gate-wave0-complete.mjs` → `shared_ref_count_floor` 失败
3. 读 hints：`repair_kind: agent_action`, `write_to: reference/`
4. Phase Agent 在 `reference/` 下创建带正确 metadata 的文件
5. Rerun gate → 文件被判 `delegated_bypass`
6. 尝试创建 queue item + claim → `assignment preflight failed`（缺 topic_uid/topic_slug）
7. 无法推进，只能接受 degraded pass

## 根因假设

**主因**：`repair_kind: agent_action` + `write_to: reference/` 这个 hint 组合在 `shared_ref_count_floor` 场景下是**语义错误**的。`agent_action` 暗示 Phase Agent 可以直接修复，但 gate 的 reference backing 检查要求文件有 delegated work-unit provenance。这个修复**只能**通过 `engine_operation`（重新 claim + delegated sub-agent 产出）完成——但 hint 把它分类为 `agent_action`。

**副因**：Wave0 的 sub-agent task card 模板（phase-wave0.md §3.1）的 `writes_to` 字段写了 `reference/00-shared-<slug>.md`，但 task card 的 `action` 描述只说 "optionally write reference/00-shared-<slug>.md"——optional 意味着 sub-agent 可以不产出。当 sub-agent 选择不产出时，Phase Agent 没有合法的补救路径。

**第三因**：跨 topic 的 shared reference 不适合当前 wave0 的 topic-bound work-unit 模型。每个 work unit 绑定到一个 topic（`payload.topic_slug`, `payload.topic_uid`），但 shared ref 本质上是跨 topic 的。强行把它塞进单一 topic 的 work unit 会导致 provenance 归属混乱。

## 框架层面的问题

1. `repair_kind` 的分类逻辑没有考虑 " Phase Agent 能做但 gate 不接受" 的场景——hint 应该能区分 `agent_action_on_mutable_surface` 和 `agent_action_requires_delegated_provenance`
2. Gate 的 backing 检查（`delegated_bypass`）和 repair hint 的 `write_to` 指向同一路径，但语义冲突——一个说"你不能直接写"，另一个说"写到这"
3. Shared/cross-topic reference 的产出模型在 wave0 中没有一等公民支持——既不是纯 topic-bound work unit，也不是纯 Phase Agent materialization

## 建议方向

- **短期**：`shared_ref_count_floor` 失败时，hint 的 `repair_kind` 应该是 `engine_operation`，`write_to` 指向具体的 `operate-work-unit.mjs claim` 命令（带正确的 phase/topic 参数），而不是裸的 `reference/` 路径
- **中期**：为 cross-topic shared reference 引入专门的 work-unit kind（如 `wave0_shared_reference`），不绑定单一 topic_uid，有独立的 assignment preflight 规则
- **中期**：或者允许 Phase Agent materialization 作为 shared reference 的合法 backing 路径——如果 shared ref 的内容完全派生自已提交的 topic-bound source.yaml，Phase Agent 的 materialization 应该被视为合法的 projection 而非 bypass
- **长期**：wave0 task card 模板中去掉 "optionally"——如果 shared ref 是 gate 的硬性要求，task card 的 `required_receipts` 和 `done_condition` 应该强制执行
