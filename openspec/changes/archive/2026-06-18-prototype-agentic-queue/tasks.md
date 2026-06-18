# Tasks: prototype-agentic-queue

## 1. 实验目录和基础文件

- [x] 1.1 创建 `experiments/prototype-agentic-queue/`、`package.json`（`"type": "module"`）和 `nodes-agentic-queue/` 目录 — @impl AGQ-001, AGQ-006
- [x] 1.2 创建 `trace.mjs`，提供 `setTraceFile/getTraceFile/traceEntry/traceCleanup/traceSummary`，trace source 前缀使用 `agq-` — @impl AGQ-005, AGQ-006
- [x] 1.3 创建 `agentic-queue.mjs`、`agentic-queue-cli.mjs` 和 `agentic-queue.test.mjs`，使用纯 ESM、`node:test`、`node:assert` — @impl AGQ-001, AGQ-006
- [x] 1.4 创建 `EXPERIMENT.md`，记录 Queue Manager API-first 目标、V12 lesson 和非生产边界 — @impl AGQ-006

## 2. Schema 和 Queue Manager API

- [x] 2.1 定义 `QueueItemSchema`、`QueueStateSchema`、`QueueResultSchema`、`QueueFailureSchema` 和 slot 常量 — @impl AGQ-001
- [x] 2.2 实现 `loadQueue(bundleDir)`、`saveQueue(bundleDir, queue)`、`validateQueue(queue)` — @impl AGQ-001
- [x] 2.3 实现 `enqueue(queue, item, { mode })`，先填 active window，再进 refill pool — @impl AGQ-002
- [x] 2.4 实现 `claimCurrent(queue, { actor })`，只返回并标记 `slot_1_current` — @impl AGQ-002
- [x] 2.5 实现 `completeCurrent(queue, result, bundleDir)` 和 `failCurrent(queue, failure, bundleDir)` — @impl AGQ-002, AGQ-004
- [x] 2.6 实现 `promote(queue)`、`refill(queue)` 和 priority ordering — @impl AGQ-002
- [x] 2.7 实现 `preempt(queue, item, { reason, unsafeCurrent })`，默认只插 pending slots，保留 displaced tail restore metadata — @impl AGQ-003

## 3. Receipts、Projection、Inspect 和 CLI

- [x] 3.1 实现 `checkReceipts(queue, item, bundleDir)`，支持 `file:`、`json:`、`queue:`、`slot:`、`trace:`、`none`，未知 prefix fail-closed — @impl AGQ-004
- [x] 3.2 实现 `inspectQueue(queue, bundleDir)`，返回 check/inspect/advice 风格反馈 — @impl AGQ-004
- [x] 3.3 实现 `renderProjection(queue, bundleDir)`，从 JSON state 生成 Markdown task card/window — @impl AGQ-005
- [x] 3.4 实现薄 CLI：`check/enqueue/claim/complete/fail/preempt/render`，读写 `rb_queue.agq.json` — @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005

## 4. Unit Tests

- [x] 4.1 测试 schema：valid item、missing required field、payload object、queue validation — @impl AGQ-001
- [x] 4.2 测试 enqueue/claim：五个 active slots 填满后进入 refill pool，claim 只返回 current — @impl AGQ-002
- [x] 4.3 测试 complete/promote/refill：completion receipt 通过后 slot_2 promoted，tail 从 pool refill — @impl AGQ-002, AGQ-004
- [x] 4.4 测试 fail：失败创建 repair work，不授权 chat progress — @impl AGQ-002, AGQ-004
- [x] 4.5 测试 preempt：pending 插队、full window displaced tail restore、unsafe current guard — @impl AGQ-003
- [x] 4.6 测试 receipts/projection：unknown prefix fail-closed，missing receipt blocks promotion，projection drift 不改变 JSON state — @impl AGQ-004, AGQ-005
- [x] 4.7 测试 CLI：check/enqueue/claim/complete/preempt/render 的最小真实文件路径 — @impl AGQ-006

## 5. Command Experiment Playbooks

- [x] 5.1 创建 `DPT_FRAMEWORK/command_experiments/exp_agentic-queue/test-simple.md`，验证 enqueue→claim→complete→promote→projection — @impl AGQ-006
- [x] 5.2 创建 `test-medium.md`，验证 full window、refill pool、urgent preemption、displaced tail restore — @impl AGQ-006
- [x] 5.3 创建 `test-complex.md`，验证 invalid task、missing receipt、unsafe-current guard、empty queue/blocker path — @impl AGQ-006
- [x] 5.4 三个 playbook 均使用 `new-disposable-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`，verdict 只来自 trace JSONL `check` events，成功后清理 bundle — @impl AGQ-006

## 6. 文档、回归和治理

- [x] 6.1 完成 `EXPERIMENT.md`：记录 API、CLI、simple/medium/complex 结果、未生产化字段和后续 ds 问题 — @impl AGQ-006
- [x] 6.2 运行 `node --test experiments/prototype-agentic-queue/agentic-queue.test.mjs`，必须 PASS — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
- [x] 6.3 执行三个 command experiment playbook 中的 shell 流程，确认 verdict 只来自 trace JSONL `check` events — @impl AGQ-006
- [x] 6.4 运行 `node openspec/governance/check-project-reqs.mjs`，确保 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
- [x] 6.5 运行 `node openspec/governance/check-project-specs.mjs`，确保 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
- [x] 6.6 运行 `openspec status --change prototype-agentic-queue` 和 `openspec validate prototype-agentic-queue --strict`，确认 artifacts 完整 — @impl AGQ-006
