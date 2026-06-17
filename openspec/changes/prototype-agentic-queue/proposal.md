## Why

当前 `rb_queue.json` 仍是五个 nullable slot 加 refill pool 的占位结构，能表达“下一项任务”，但不能表达 Deep Research 真正需要的迭代闭环：谁生产、谁验证、失败如何修复、何时停止、哪些 receipt 证明状态可推进。

V12 已经暴露了反面经验：`_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/QUEUE_CONTRACT.md`、`flows/queue-agentic-flow.md`、`output_templates/QUEUE.md` 和 `command_playbooks/check-queue-receipts.md` 把 work unit、receipt、gate hook、stop authorization、projection 和 search policy 都压进 Markdown，语义很全，但机器权威边界过宽，最终依赖 Agent 自我遵守。这个 change 要把 queue 的确定性部分推进到 JS prototype，而不是复制 V12 的 Markdown 自治理。

## What Changes

- 新增 `agentic-queue` capability，定义 prototype 阶段的结构化 queue state、role slot、iteration loop、receipt promotion、projection、ledger/trace 和 command experiment 验收要求。
- 新增 `experiments/prototype-agentic-queue/`，实现自包含 JS Engine prototype，用 Zod 校验 queue state 和 slot 结果，用显式转换表推进 slot lifecycle。
- 新增 `DPT_FRAMEWORK/command_experiments/exp_agentic-queue/`，用 simple/medium/complex playbook 在真实 `dpt_disp_*` disposable bundle 中验证 queue loop。
- prototype 只验证机制形状：producer → verifier → repair/retry → synthesizer/complete、receipt fail-closed、max iteration/stall guard、Agent-readable projection、ledger/trace 裁决。
- 不直接修改生产 `DPT_FRAMEWORK/schema/contracts/queue.mjs` 的 nullable slot 合同，不引入 daemon，不新增依赖，不让 Engine 做内容质量判断。
- 不引入真实多模型路由；prototype 可用不同 role/instruction 或 deterministic fixture 模拟 role boundary，但最终验收必须来自真实文件写入、schema/receipt 检查和 trace JSONL。

## Capabilities

### New Capabilities

- `agentic-queue`: 结构化 agentic queue prototype，覆盖 task card schema、role slot lifecycle、Engine-owned iteration loop、receipt-checked promotion/repair、projection、ledger/trace 和 command experiment 验收。

### Modified Capabilities

- None.

## Impact

- 新增 OpenSpec delta：`openspec/changes/prototype-agentic-queue/specs/agentic-queue/spec.md`
- 新增 prototype：`experiments/prototype-agentic-queue/`
- 新增 command experiment playbooks：`DPT_FRAMEWORK/command_experiments/exp_agentic-queue/test-simple.md`、`test-medium.md`、`test-complex.md`
- 更新 requirement registry：`AGQ-001` 到 `AGQ-006`
- 可能补充 `_backlog/todo-prototype-loop-engineering-queue.md` 的完成状态或链接，但不把 backlog 作为运行时权威
- 不改变现有 production runtime bundle 结构，不新增 npm dependency
