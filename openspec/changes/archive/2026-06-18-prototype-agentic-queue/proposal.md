## Why

当前 `rb_queue.json` 仍是五个 nullable slot 加 `refill_pool` 的占位结构。它能表示“现在没有结构化任务”，但不能让 Agent 通过一个清晰 JS 接口管理 Q 的进出、插队、完成/失败回写、receipt 检查和下一张任务卡投影。

V12 的痛苦不只是 queue 文件太长，而是 queue mechanics 由 Markdown 自己承担：`_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/QUEUE_CONTRACT.md` 定义了丰富 work unit 字段，`flows/queue-agentic-flow.md` 定义 promotion/preemption/receipt loop，`output_templates/QUEUE.md` 把 active window、refill pool、stop authorization、candidate block 全部塞进运行时 Markdown。rewrite 要保留这些经验里的结构化信息和 5-slot rolling window，但把机器权威搬到 JS/JSON。

## What Changes

- 新增 `agentic-queue` prototype，重心是 **Queue Manager API**，不是 producer/verifier research loop。
- 定义结构化 `QueueState` 和 `QueueItem`：固定 core fields 承载可执行任务合同，`payload` 承载 source-intake、artifact repair、verifier、HITL 等可变领域细节。
- 实现 5-slot active window + `refill_pool`：
  - 入队：把 concrete work 加入 open active slot 或 refill pool。
  - 出队：只暴露 `slot_1_current` 给 Agent 执行。
  - 插队：urgent work 可插入 pending slots；默认不打断 `slot_1_current`。
  - 回写/推进：完成或失败当前任务后，Engine 检查 receipt，promote/refill，并生成下一张 Agent-readable Markdown projection。
- 增加 prototype JS API 和薄 CLI，供 command experiment 模拟 Agent/MD 调用。
- command experiments 改为验证 queue mechanics：simple 入队/出队/推进，medium 满窗口+插队+恢复，complex fail-closed receipt/invalid task/unsafe-current/empty-after-refill。

## Capabilities

### New Capabilities

- `agentic-queue`: JS-owned Queue Manager prototype，覆盖 `QueueItem` schema、5-slot active window、refill pool、enqueue/claim/complete/fail/preempt/promote/refill API、receipt fail-closed、Markdown projection、trace verdict 和 command experiment 验收。

### Modified Capabilities

- None.

## Impact

- 更新 OpenSpec delta：`openspec/changes/prototype-agentic-queue/specs/agentic-queue/spec.md`
- 新增 prototype：`experiments/prototype-agentic-queue/`
- 新增 command experiment playbooks：`DPT_FRAMEWORK/command_experiments/exp_agentic-queue/test-simple.md`、`test-medium.md`、`test-complex.md`
- 保留 requirement registry：`AGQ-001` 到 `AGQ-006`
- 不修改生产 `DPT_FRAMEWORK/schema/contracts/queue.mjs`；当前 production `rb_queue.json` nullable slot 合同不变
- 不新增 npm dependency，不引入 daemon，不让 Markdown projection 成为机器 authority
