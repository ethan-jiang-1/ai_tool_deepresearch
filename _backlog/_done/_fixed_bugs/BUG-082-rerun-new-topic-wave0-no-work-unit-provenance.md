# BUG-082: Rerun 中 add_topic 的新 topic 在 wave0 gate 缺少 work-unit provenance

## 发现时间
2026-07-13，rerun 中通过 `operate-topic-state apply add_topic` 新增 topic 06、07，完成 source intake 后 wave0 gate 拒绝通过。

## 严重程度
**P1** — rerun 是 sanctioned path（正常 HITL2 rerun 或 C5 post-final rerun），新增 topic 是 rerun 的核心用例。gate 要求 work-unit provenance 但 framework 未提供 rerun 中新 topic 的 delegation 设置路径。

## 症状

wave0 gate 对 rerun 中新增的 topic 报告：

```
delegated_bypass_suspected: No submitted work-unit ledger coverage for 2 wave0 artifact(s)
Delegated output lacks submitted work-unit coverage or projection backing:
  artifacts/wave0/06_tw-recent-2026-ai-coding/source.yaml
  artifacts/wave0/07_tw-landscape-2026-ai-coding/source.yaml
```

与此同时，原有的 01-05 因为已有 submitted work-unit ledger 覆盖，gate 不报。

## 复现条件

1. 在 rerun 中通过 `operate-topic-state apply add_topic` 新增 topic
2. seed-topics → wave0 正常流转
3. Phase Agent 收集 source（手动或通过 sub-agent），产出 `source.yaml`
4. 运行 wave0 gate → `delegated_bypass_suspected`

## 根因

`add_topic` 只写 `rb_plan.md` 和 `seed_topics/{slug}.md`。它**不创建**：
- `rb_queue.json` 中的 queue item
- `_work_units/wave0/` 中的 work-unit 目录
- `rb_output_declarations.jsonl` 中的 submitted declaration

而 wave0 gate 的 `work_unit_output_coverage` 和 `delegated_bypass_suspected` 规则要求每个 topic 的 `source.yaml` 必须有对应的 submitted work-unit ledger row。

正常 pipeline（首次执行）中，Phase Agent 在 wave0 通过 `operate-queue.mjs` 入队所有 topic、`operate-work-unit.mjs claim/submit` 走完整 delegation 流程。但在 rerun 中：
- 旧 topic（01-05）已有历史 submitted declarations，gate 接受
- 新 topic（06-07）从未入队，gate 拒绝
- Phase Agent 可以手动入队新 topic，但 `phase-wave0.md` 和 command playbook 中**没有 rerun 场景下为新 topic 入队的明确指令**

更深层的设计问题：**wave0 gate 的 provenance 检查是"全有或全无"的**——它检查**所有** topic 的 artifact 是否有 work-unit 覆盖，但实际上 rerun 场景应该只检查**本轮新增/变更**的 topic。

## 建议修复

### 短期（当前 bundle 手工修复）
1. 用 `operate-queue.mjs` 为新 topic 06/07 单独入队
2. 用 `operate-work-unit.mjs claim → submit` 走完 delegation 流程
3. 或接受 gate 不通过，记录为已知 bypass

### 中期（框架改进，三选一）

**方案 A：gate 层面——rerun 模式下的增量 provenance 检查**
- wave0 gate 检测到 rerun context（`rerun_count > 0` 或 trace 中有 rerun 证据）时
- provenance 检查只覆盖**本轮新增**的 topic（registry 中 topic_uid 在上一轮不存在的）
- 旧 topic 的 artifact 接受"已有历史 provenance"为合法

**方案 B：add_topic 层面——自动创建 queue 占位**
- `add_topic` 成功后自动在 `rb_queue.json` 中为新 topic 创建 `wave0-source-*` 和 `wave1-deepen-*` queue items（状态：`queued`）
- Phase Agent 在 wave0/wave1 按正常流程 claim/submit
- 需要额外处理：add_topic 本身不创建 work-unit 目录，只创建 queue demand

**方案 C：playbook 层面——明确 rerun 新 topic 的 delegation 指令**
- 在 `phase-wave0.md` 或 `command_playbook/` 中增加 rerun 场景指引：
  - "If new topics were added during rerun, enqueue them via `operate-queue.mjs` before starting wave0 delegated work"
  - "Existing topics retain their prior provenance and do not need re-delegation unless their scope changed"

推荐 **方案 A + C 组合**：gate 做增量检查（不误报旧 topic），playbook 给 Phase Agent 明确的新 topic delegation 指令。

## 相关

- BUG-078: post-final HITL2 rerun reentry blocked（rerun 入口问题，已修复）
- BUG-080: rerun seed backfill quality（rerun 质量问题）
- BUG-081: add_topic seed skeleton 过于简陋
- `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs` — wave0 gate
- `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs:365-476` — work_unit_output_coverage + delegated_bypass_suspected 规则
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` — wave0 phase 指令
- `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` — add_topic 逻辑
