## 1. Registry & spec prep

- [ ] 1.1 登记 `FRE-004` 到 `openspec/governance/req-registry.yaml`（framework-engine 组：`subagent-relay internal module layout`）
- [ ] 1.2 在将创建的子模块文件头添加 `// @impl FRE-004`（barrel 保留现有 `@impl SUD-001, SUS-001, …`）
- [ ] 1.3 **影响面基线快照**（apply 前记录，便于 archive 对照）：
  - `rg "from ['\"].*subagent-relay" --glob '*.{mjs,js}' DPT_FRAMEWORK tests experiments_playbook` → 确认全部指向 `subagent-relay.mjs`，无 `subagent-relay-*.mjs` 外部 import
  - `rg "import.*subagent-relay|await import.*subagent-relay" DPT_FRAMEWORK/workflows --glob '*.md'` → 确认 **0 匹配**（MD 不 inline import engine）
  - 记录 production 消费者 import 符号清单：`queue-manager.mjs` L65、`drive-relay-slot.mjs` L30–38、`subagent-relay.test.mjs` L9–37

## 2. Scaffold

- [ ] 2.1 在 `DPT_FRAMEWORK/engine/` 下创建空子模块占位（与 barrel 同级，无子目录）：
  - `subagent-relay-schemas-trace.mjs`
  - `subagent-relay-fork-dispatch.mjs`
  - `subagent-relay-stage.mjs`
  - `subagent-relay-slot-runtime.mjs`
  - `subagent-relay-collect-pipeline.mjs`
- [ ] 2.2 各占位文件含 module 注释说明职责域（参照 `gate-helpers-core.mjs` 文件头）
- [ ] 2.3 备份当前 monolith 行数基线：`wc -l DPT_FRAMEWORK/engine/subagent-relay.mjs` 记录到 apply commit message

## 3. Extract schemas-trace (~320 lines) @impl FRE-004

- [ ] 3.1 迁出 trace/logger 单例：`ensureTrace`, `traceEntry`, `logEvent`, `logEventCliPath`, 模块级 `_trace`/`_log`
- [ ] 3.2 迁出全部 Zod schema（public + sibling-only internal：`SubagentSlot`, `SlotConfig`, `SlotStatusFile`, `RuntimeReceiptEvent`, `AgentMetadata`, `ManifestSlotEntry`, `RuntimeMode` 等）
- [ ] 3.3 迁出 `ForkStep` class、`MAX_CONCURRENT_SUBAGENTS`、路径 helpers；**sibling export** `ensureTrace`, `traceEntry`, `logEvent`（barrel 不 re-export）
- [ ] 3.4 从 monolith 删除已迁出代码；临时从 monolith re-export schemas-trace 符号（或直接更新 barrel 指向子模块）
- [ ] 3.5 跑 `node --test tests/engine/subagent-relay.test.mjs` — 0 fail

## 4. Extract fork-dispatch (~200 lines) @impl FRE-004

- [ ] 4.1 迁出 `classifyBranch`, `forkRouter`, `forkMap`, `dispatchMap`, `getDispatchMap`
- [ ] 4.2 迁出 `convergeRepair`, `defaultRepairStep`, `serializeState`, `validateAndDiagnose`, `inspectFailure`
- [ ] 4.3 import 仅来自 `./subagent-relay-schemas-trace.mjs`；确认无 fs 逻辑遗漏
- [ ] 4.4 跑 `node --test tests/engine/subagent-relay.test.mjs` — 0 fail

## 5. Extract stage (~490 lines) @impl FRE-004, SUD-001, SNC-001

- [ ] 5.1 迁出 slot 创建与 JSON schema 生成：`createSlot`, `resultJsonSchemaForSlot`
- [ ] 5.2 迁出 lifecycle 模板与 prompt 生成：`LIFECYCLE_EVENT_SPECS`, `taskMarkdownForSlot`, `buildSpawnPrompt`
- [ ] 5.3 迁出磁盘 staging：`materializeSlotDir`, `createDispatchManifest`, `stageSubagentSlots`, `stageReplacementSlot`, `loadSlotByManifestEntry`
- [ ] 5.4 import schemas-trace + fork-dispatch 的 **`classifyBranch`**；`stageSubagentSlots` / `forkAndStageSubagents` 内 **`dispatchMap` → `getDispatchMap()`**（Decision Open Question A，apply 时统一）；**不得** import slot-runtime
- [ ] 5.5 跑 `node --test tests/engine/subagent-relay.test.mjs` — 0 fail

## 6. Extract slot-runtime (~500 lines) @impl FRE-004, SUS-001, SUC-001

- [ ] 6.1 迁出 status 状态机：`slotTransitions`, `readSlotStatus`, `writeSlotStatus`
- [ ] 6.2 迁出 spawn/receipt/result 路径：`recordAgentSpawnRequested`, `readReceiptEvents`, `validateRuntimeReceipt`, `ingestAgentReceipt`
- [ ] 6.3 迁出 result commit：`validateSlotResult`, `commitSlotResult`, `markSlotFailed`, `readSlotResult`, `failedResultForSlot`
- [ ] 6.4 import `./subagent-relay-schemas-trace.mjs` + `./subagent-relay-stage.mjs`（`buildSpawnPrompt`）；确认 stage 不反向依赖本模块
- [ ] 6.5 跑 `node --test tests/engine/subagent-relay.test.mjs` — 0 fail

## 7. Extract collect-pipeline (~310 lines) @impl FRE-004, SUR-001

- [ ] 7.1 迁出 `collectResults`, `mergeResults`
- [ ] 7.2 迁出高层 orchestrators：`forkAndStageSubagents`, `collectAndMergeSubagentResults`
- [ ] 7.3 迁出 `resolveSlotFromResultRef`（queue-manager 依赖）
- [ ] 7.4 import 上游子模块 + **`./helpers/ref-count.mjs` 的 `isCountable`**（`mergeResults` 依赖）；确认 DAG 无 cycle；`forkAndStageSubagents` 同样使用 `getDispatchMap()`
- [ ] 7.5 跑 `node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs` — 0 fail

## 8. Barrel & cleanup @impl FRE-004

- [ ] 8.1 将 `subagent-relay.mjs` 重写为 barrel：保留文件头 role/pipeline 注释 + Sub-modules 列表（参照 `gate-helpers.mjs`）+ `export { … } from './subagent-relay-….mjs'`
- [ ] 8.2 对照 **barrel export 完整清单**（`rg '^export ' DPT_FRAMEWORK/engine/subagent-relay.mjs`，当前 32 个 public export；**不以**文件头 L63–74 注释为唯一依据）：
  - production：`queue-manager.mjs`（3 符号）+ `drive-relay-slot.mjs`（7 符号）
  - tests：`subagent-relay.test.mjs` + `queue-manager.test.mjs` + `subagent-logging-contract.test.mjs`
- [ ] 8.3 确认 monolith 内无残留实现代码（仅 barrel）
- [ ] 8.4 `wc -l DPT_FRAMEWORK/engine/subagent-relay*.mjs` — 每个 `subagent-relay-*.mjs` 子模块 200–800 行（barrel 可更短）
- [ ] 8.5 grep 确认 `_trace =` / `_log =` 仅出现在 `subagent-relay-schemas-trace.mjs`
- [ ] 8.6 **影响面验收 grep**：
  - 外部代码无 `subagent-relay-*.mjs` import（barrel 自身 re-export 除外）
  - `DPT_FRAMEWORK/workflows/**/*.md` 仍 0 处 engine inline import
  - workflow MD **无需修改**（仍引用 `subagent-relay.mjs` 路径 + `drive-relay-slot` CLI）

## 9. Regression & governance

- [ ] 9.1 全量 engine 回归：`node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs tests/engine/helpers/relay-provenance-gate.test.mjs`
- [ ] 9.2 确认 production CLI import 链：`node --check DPT_FRAMEWORK/cli/drive-relay-slot.mjs`
- [ ] 9.3 确认 integration test + MD 契约：`node --test tests/integration/md/subagent-logging-contract.test.mjs`；`node DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs` — exit 0
- [ ] 9.4 运行 `node openspec/governance/check-project-reqs.mjs` — PASS
- [ ] 9.5 运行 `node openspec/governance/check-project-specs.mjs` — PASS

## 10. Documentation touch (minimal, 非阻塞)

- [ ] 10.1 确认 `openspec/specs/framework-engine/spec.md` delta 与实现一致（archive 时 sync）
- [ ] 10.2 （可选）更新 `guidelines/agentic-subagent-mechanism.md` 中 monolith 行数描述；`_backlog/` 行号引用 stale 可留待单独 docs change
