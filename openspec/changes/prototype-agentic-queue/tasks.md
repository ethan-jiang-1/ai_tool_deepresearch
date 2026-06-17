# Tasks: prototype-agentic-queue

## 1. 实验目录和基础文件

- [ ] 1.1 创建 `experiments/prototype-agentic-queue/`、`package.json`（`"type": "module"`）和空的 `nodes-agentic-queue/` 目录 — @impl AGQ-001, AGQ-006
- [ ] 1.2 创建 `trace.mjs`，提供 `setTraceFile/getTraceFile/traceEntry/traceCleanup/traceSummary`，trace source 前缀使用 `agq-` — @impl AGQ-005
- [ ] 1.3 创建 `agentic-queue.mjs` 和 `agentic-queue.test.mjs`，使用纯 ESM、`node:test`、`node:assert`，不 import 其他 prototype — @impl AGQ-001
- [ ] 1.4 创建 `EXPERIMENT.md` 初稿，记录本 prototype 验证范围、不验证范围和与 V12 queue 的边界 — @impl AGQ-006

## 2. Queue Schema 与 Lifecycle

- [ ] 2.1 定义 `AgenticQueueState`、`AgenticQueueSlot`、`StopCondition`、`SlotResult`、`LedgerEntry` Zod schema — @impl AGQ-001, AGQ-005
- [ ] 2.2 添加跨字段校验：slot key 唯一、依赖 slot 存在、verifier 不验证自己、repair 指向 failed/needs_rework lineage — @impl AGQ-001, AGQ-002
- [ ] 2.3 定义显式 slot status transition table，并实现 `canTransition()` / `transitionSlot()` — @impl AGQ-002
- [ ] 2.4 实现 `validateQueue(state)` 和 `hashQueueState(state)`，用于 schema gate 与 stall detection — @impl AGQ-001, AGQ-003

## 3. Receipt Checker 与 Projection

- [ ] 3.1 实现最小 receipt parser/checker，支持 `file:`、`json:`、`ledger:`、`slot:`、`verdict:`，未知 prefix fail-closed — @impl AGQ-004
- [ ] 3.2 实现 `verifyRequiredReceipts(state, slot, bundleDir)`，缺 receipt 时拒绝启动并返回 inspect/advice 结构 — @impl AGQ-004
- [ ] 3.3 实现 `verifyCompletionReceipt(state, slot, bundleDir)`，用于 closeout 前 receipt 检查 — @impl AGQ-004
- [ ] 3.4 实现 `renderProjection(state, bundleDir)`，从 JSON state 生成 Markdown task card/window，禁止从 projection 反向更新 state — @impl AGQ-004

## 4. Engine Loop 与 Repair

- [ ] 4.1 实现 `selectReadySlot(state)`，按 dependency、status、priority 选择下一个 executable slot — @impl AGQ-002, AGQ-003
- [ ] 4.2 实现 `startSlot(state, key)` 和 `completeSlot(state, key, result, bundleDir)`，完成时写 trace 和 ledger — @impl AGQ-002, AGQ-005
- [ ] 4.3 实现 `recordVerifierVerdict(state, verifierKey, verdict, bundleDir)`，支持 `pass`、`fail`、`needs_rework` — @impl AGQ-002, AGQ-005
- [ ] 4.4 实现 `spawnRepairSlot(state, failedVerifierKey)`，生成 repair slot、维护 retry count 和 lineage — @impl AGQ-003
- [ ] 4.5 实现 `evaluateStopCondition(state)`，支持 `all_required_verified`、`max_iterations`、`stalled` outcome — @impl AGQ-003
- [ ] 4.6 实现 `advanceQueue(state, bundleDir)`，串联 receipt preflight、slot lifecycle、repair/retry、projection、stop condition 和 trace/check event — @impl AGQ-003, AGQ-004, AGQ-005

## 5. Fixtures 与 Unit Tests

- [ ] 5.1 添加 simple fixture：producer → verifier pass → synthesizer complete — @impl AGQ-001, AGQ-003
- [ ] 5.2 添加 medium fixture：producer → verifier fail → repair → verifier pass — @impl AGQ-003, AGQ-005
- [ ] 5.3 添加 complex fixture：missing receipt、self-verifier rejection、max iteration/stalled case — @impl AGQ-001, AGQ-003, AGQ-004
- [ ] 5.4 测试 schema validation：valid queue、unknown role、duplicate key、missing dependency、self-verification rejection — @impl AGQ-001
- [ ] 5.5 测试 lifecycle：合法 transition、terminal rollback rejection、verifier waits for producer done — @impl AGQ-002
- [ ] 5.6 测试 receipt checker：existing/missing file、valid/invalid json、ledger receipt、slot/verdict receipt、unknown prefix fail-closed — @impl AGQ-004
- [ ] 5.7 测试 ledger/trace：produced、verified、rejected、repaired、synthesized entries 和 trace `check` verdict — @impl AGQ-005
- [ ] 5.8 测试 Engine loop：simple complete、medium repair complete、complex blocked/escalated/stalled — @impl AGQ-003

## 6. Command Experiment Playbooks

- [ ] 6.1 创建 `DPT_FRAMEWORK/command_experiments/exp_agentic-queue/test-simple.md`，使用 `dpt_disp_agq_simple/` 和 `_trace_agq_simple.jsonl` — @impl AGQ-006
- [ ] 6.2 创建 `test-medium.md`，验证 verifier fail 后 Engine 生成 repair slot 并通过 re-verification — @impl AGQ-006
- [ ] 6.3 创建 `test-complex.md`，验证 fail-closed receipt 或 max iteration/stalled outcome 不产生假 pass — @impl AGQ-006
- [ ] 6.4 三个 playbook 均使用 `DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`，并从 trace JSONL 的 `check` events 裁决 — @impl AGQ-006
- [ ] 6.5 三个 playbook 成功后清理 disposable bundle，失败时保留足够路径用于诊断 — @impl AGQ-006

## 7. 文档、回归和治理

- [ ] 7.1 完成 `EXPERIMENT.md`：记录 simple/medium/complex 结果、保留的 V12 lesson、未生产化字段和后续 ds/ledger 问题 — @impl AGQ-006
- [ ] 7.2 运行 `node --test experiments/prototype-agentic-queue/agentic-queue.test.mjs`，必须 PASS — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005
- [ ] 7.3 手动执行或 dry-run 三个 command experiment playbook，确认 verdict 只来自 trace JSONL `check` events — @impl AGQ-006
- [ ] 7.4 运行 `node openspec/governance/check-project-reqs.mjs`，确保 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
- [ ] 7.5 运行 `node openspec/governance/check-project-specs.mjs`，确保 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
- [ ] 7.6 运行 `openspec status --change prototype-agentic-queue` 和 `openspec validate prototype-agentic-queue --strict`，确认 change artifacts 完整且可进入 `/opsx:apply` — @impl AGQ-006
