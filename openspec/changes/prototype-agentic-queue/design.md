# Design: prototype-agentic-queue

## Context

当前生产 `DPT_FRAMEWORK/schema/contracts/queue.mjs` 只有 `queue_health`、`stop_authorization_state`、五个 null slot 和 `refill_pool: unknown[]`。这能让 bundle 通过最小校验，但还不是 deep research 需要的 queue engine。

V12 的 queue 资料提供了重要反例：

- `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/QUEUE_CONTRACT.md` 定义了 work unit、producer rule、receipt grammar 和 critical checkpoint receipts。
- `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/flows/queue-agentic-flow.md` 定义了 reload → preflight → execute → verify → refill/promote → pre-response gate 的固定循环。
- `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/output_templates/QUEUE.md` 把 active queue、stop authorization、source intake、preemption、refill pool、candidate templates 都塞进运行时 Markdown。
- `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/command_playbooks/check-queue-receipts.md` 提供了 fail-closed receipt checker 思路。

要保留的是 task card 自包含性、receipt fail-closed、producer rule lineage、projection、Maker != Checker 和 trace memory。要丢掉的是 Markdown queue 作为机器权威、hook/gate/receipt 规则散落多处、Agent 自己裁决 queue/gate/stop 状态。

## Goals / Non-Goals

Goals:

- 用 prototype 验证结构化 `AgenticQueueState`，而不是扩写生产 `rb_queue.json`。
- 明确 producer、verifier、repair、synthesizer 四类 slot role。
- 让 Engine 验证 deterministic receipt、推进 slot lifecycle、生成 repair/retry、检查 stop condition、写 trace/ledger。
- 让 Agent-readable Markdown projection 只作为结构化 queue 的视图，不作为 Source of Record。
- 用 simple/medium/complex command experiment 在真实 disposable bundle 上证明机制闭环。

Non-goals:

- 不实现生产 `DPT_FRAMEWORK/cli/ds.mjs`。
- 不修改现有 production `QueueSchema` 的 nullable slot 合同。
- 不迁移 V12 的巨型 `QUEUE.md`。
- 不让 Engine 判断来源质量、claim 真伪、综合质量或最终报告表达。
- 不引入 daemon、后台 watcher、数据库、TypeScript 或新 npm dependency。
- 不要求 prototype 使用真实多模型 verifier；role boundary 先由不同 role/instruction 和独立 result contract 表达。

## Decisions

### 1. Prototype-local schema, production queue 不动

`experiments/prototype-agentic-queue/agentic-queue.mjs` 定义自己的 Zod schema：

```js
AgenticQueueState = {
  queueId,
  waveIndex,
  iteration,
  maxIterations,
  status,
  slots,
  activeSlotKey,
  stopCondition,
  projectionPath,
  ledgerPath,
}
```

理由：当前 production schema 是已接受的最小 bundle contract。直接升级 `rb_queue.json` 会扩大 blast radius，把 prototype 变成迁移 change。先在 `experiments/` 验证 engine shape，后续再决定如何进入 `DPT_FRAMEWORK/schema/` 和 CLI。

Alternatives considered:

- 直接修改 `DPT_FRAMEWORK/schema/contracts/queue.mjs`：太早，容易把实验字段变成生产承诺。
- 继续用 Markdown queue：会复活 V12 的自治理问题。

### 2. Slot role 是 queue engine 的一等字段

Slot schema 包含：

```js
{
  key,
  role: "producer" | "verifier" | "repair" | "synthesizer",
  status: "pending" | "ready" | "running" | "done" | "failed" | "blocked" | "skipped",
  dependsOn,
  verifies,
  repairs,
  retryOf,
  artifactPath,
  resultPath,
  requiredReceipts,
  completionReceipt,
  verdict,
  retryCount,
  maxRetries,
  priority,
}
```

Producer 产出内容或 evidence artifact；verifier 只验证另一个 slot 的 result/artifact 并写 verdict；repair 由 Engine 根据 failed verifier 生成；synthesizer 只在 stop condition 允许时合并通过项。

理由：`producer 永远不验证自己的产出` 是 queue 和普通 task list 的分界。role 进入 schema 后，Engine 可以拒绝 self-verification、错误依赖和非法 lifecycle。

### 3. Lifecycle 用显式转换表

状态转换用 Map/object：

```text
pending -> ready | blocked
ready -> running
running -> done | failed | blocked
failed -> ready (only retry/repair-created path)
done/blocked/skipped -> terminal
```

Engine API 示例：

- `loadQueue(path)`
- `validateQueue(state)`
- `selectReadySlot(state)`
- `startSlot(state, key)`
- `completeSlot(state, key, result)`
- `verifyReceipts(state, key)`
- `advanceQueue(state)`
- `spawnRepairSlot(state, failedVerifierKey)`
- `evaluateStopCondition(state)`
- `renderProjection(state, bundleDir)`

理由：状态机必须可读、可测、可拒绝非法跳转。不能把“下一步怎么走”藏在 prose 或 Agent 判断里。

### 4. Receipt grammar 先做最小可测子集

Prototype 支持 deterministic receipt：

- `file:<path>`
- `json:<path>`
- `ledger:<slotKey>:<action>`
- `slot:<slotKey>=<status>`
- `verdict:<slotKey>=pass|fail|needs_rework`

未知 prefix fail-closed。多 receipt 用数组，不复刻 V12 的分号和 `A or B` grammar。

理由：V12 receipt grammar 很完整但复杂，prototype 目标是证明 Engine-owned preflight/closeout，不是一次实现全 receipt DSL。

### 5. Ledger 与 trace 分工

`rb_trace.jsonl` 或 prototype trace 记录 engine events 和 `check` verdict：

- `queue_loaded`
- `slot_selected`
- `slot_started`
- `receipt_checked`
- `slot_completed`
- `verdict_recorded`
- `repair_spawned`
- `projection_rendered`
- `stop_condition_checked`
- `check`

`rb_ledger.jsonl` 或 prototype ledger 记录 evidence lifecycle：

- `produced`
- `verified`
- `rejected`
- `repaired`
- `synthesized`

Ledger entry 必须带 `slotKey`、`role`、`action`、`artifactPath/resultPath`、`sourceTag` 和 timestamp。`[PRODUCED]` 不等于 `[VERIFIED]`；`[INFERRED]` 不能自动满足 verifier receipt。

理由：trace 是 engine diagnostics，ledger 是 evidence provenance。两者混在一起会让“循环跑完”和“内容可信”再次混淆。

### 6. Projection 是可再生视图

`renderProjection()` 从 state 生成 Markdown task card/window，写入 bundle 下的 projection path，例如 `_cache/agentic-queue/current-task.md`。Projection 含当前 slot 的 role、action、required receipts、expected writes 和 failure route。

Projection 不可作为 mutation input；Engine 下次仍从 JSON state 和 ledger/trace 文件读取事实。

理由：Markdown 是 LLM-facing control surface，但机器 authority 必须留在 JSON/JSONL。

### 7. Command experiment 三层验证

Playbook 目录：

```text
DPT_FRAMEWORK/command_experiments/exp_agentic-queue/
  test-simple.md
  test-medium.md
  test-complex.md
```

Prototype 目录：

```text
experiments/prototype-agentic-queue/
  EXPERIMENT.md
  package.json
  agentic-queue.mjs
  agentic-queue.test.mjs
  trace.mjs
  nodes-agentic-queue/
```

Case shape:

- simple：producer → verifier pass → synthesizer → stop condition met。
- medium：producer → verifier fail → repair slot → verifier pass → complete。
- complex：missing receipt / invalid dependency / max iteration 或 stalled，Engine 不推进并写 repair/advice/check failure。

理由：queue 是 loop mechanism，必须在 real disposable bundle 中验证真实文件写入、真实 receipt 检查和 trace verdict，不能只跑 unit test。

## Risks / Trade-offs

- [Risk] Prototype schema 和未来生产 schema 发生偏差。→ Mitigation: `EXPERIMENT.md` 明确哪些字段是 candidate contract，哪些只是 fixture；归档前再决定是否提 production change。
- [Risk] 同一模型不同 instruction 不能完全证明 Maker != Checker。→ Mitigation: prototype 只证明 role separation 和 self-verification rejection；真实多模型路由留给后续 runtime adapter change。
- [Risk] Ledger 变成另一份不受控状态。→ Mitigation: ledger 只 append evidence lifecycle，不决定 queue transition；transition 仍由 queue state + receipt checker 裁决。
- [Risk] command experiment 里写 fixture result 被误认为 mock。→ Mitigation: 只允许 playbook/driver 通过 prototype API 执行 declared slot completion；trace 必须显示 Engine 校验 receipt 和 ledger 后才通过，不允许手写 trace/result 冒充执行。
- [Risk] stop condition 太简单。→ Mitigation: v1 只支持 `all_required_verified`、`max_iterations` 和 `stalled`，复杂 coverage predicate 作为 open question。

## Migration Plan

1. 实现 prototype-local schema 和 Engine API。
2. 用 node:test 覆盖 schema、lifecycle、receipt、projection、ledger、repair、stop condition。
3. 增加 command experiment playbooks，通过 real `dpt_disp_*` bundle 和 trace JSONL 裁决。
4. 更新 `EXPERIMENT.md` 记录结论和生产化建议。
5. 归档后再评估是否提出生产 `agentic-dispatch-scheduler` / `queue-engine` change，把可行字段迁入 `DPT_FRAMEWORK/schema/` 和 CLI。

Rollback: 删除 active change 和 prototype/experiment 新文件即可；生产 runtime schema 不受影响。

## Open Questions

- `agentic-queue` 与未来 `ds.mjs` 是同一个 capability，还是 queue engine 被 ds 调用？
- `rb_ledger.jsonl` 应进入 queue v1，还是独立 claim/evidence provenance capability？
- 复杂 stop condition 是否需要 predicate DSL，还是保持枚举 + Engine 内建检查？
- Repair slot 是修改原 producer artifact，还是始终写新 artifact 并以 lineage 连接？
- Agent-readable projection 最终应是独立 Markdown 文件，还是嵌入 `START_FROM_HERE.md` / next-task surface？
