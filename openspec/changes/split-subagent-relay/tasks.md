## 1. Registry & spec prep

- [ ] 1.1 登记 `FRE-004` 到 `openspec/governance/req-registry.yaml`（`FRE-004: framework-engine — subagent-relay internal module layout (5 flat sub-modules + barrel, zero behavior change)`）
- [ ] 1.2 子模块文件头：`// @impl FRE-004` + 保留域内既有 `@impl`（stage: SUD/SNC；runtime: SUS/SUC；collect: SUR）；barrel 保留 SUD/SUS/SUC/SUR/FRE 等
- [ ] 1.3 **影响面基线快照**（apply 前）：
  - `rg '^export ' DPT_FRAMEWORK/engine/subagent-relay.mjs` → 记录 **32** 个 public export
  - `rg "from ['\"].*subagent-relay" --glob '*.{mjs,js}' DPT_FRAMEWORK tests experiments_playbook` → 全部指向 `subagent-relay.mjs`
  - `rg "import.*subagent-relay" DPT_FRAMEWORK/workflows --glob '*.md'` → **0 匹配**
  - 记录 consumers：`queue-manager.mjs` L65、`drive-relay-slot.mjs` L30–38、`subagent-relay.test.mjs` L9–37
- [ ] 1.4 **行数基线**（apply 前 `sed` 实测，**仅供参考，非 apply 硬门槛**）：
  - schemas-trace: `sed -n '76,125p;127,274p' subagent-relay.mjs | wc -l` → ~209
  - fork-dispatch: `sed -n '291,372p;376,386p;1412,1517p' …` → ~294
  - stage: `sed -n '397,842p' …` → ~446
  - slot-runtime: `sed -n '871,1334p' …` → ~464
  - collect-pipeline: `sed -n '1336,1411p;1518,1683p' …` → ~242

## 2. Scaffold

- [ ] 2.1 创建 **5 个**占位文件：
  - `subagent-relay-schemas-trace.mjs`
  - `subagent-relay-fork-dispatch.mjs`
  - `subagent-relay-stage.mjs`
  - `subagent-relay-slot-runtime.mjs`
  - `subagent-relay-collect-pipeline.mjs`
- [ ] 2.2 各文件头注释：职责域 + 源码行域 + `@impl FRE-004`（参照 `gate-helpers-core.mjs`）
- [ ] 2.3 确认渐进迁移规则：step 3–8 每步完成后 `subagent-relay.mjs` = **文件头 + 剩余 inline 实现 + `export … from './subagent-relay-…'`**；step 9 删除 inline 实现变纯 barrel

## 3. Extract schemas-trace (~209 lines) @impl FRE-004

- [ ] 3.1 迁出 trace/logger：`ensureTrace`, `traceEntry`, `logEvent`, `logEventCliPath`, `_trace`/`_log`（**sibling export**）
- [ ] 3.2 迁出全部 Zod schema（public + sibling-only internal：`SubagentSlot`, `SlotConfig`, `SlotStatusFile`, `RuntimeReceiptEvent`, `AgentMetadata`, `ManifestSlotEntry`, `RuntimeMode`, `EvidenceReference` 等）
- [ ] 3.3 迁出路径 helpers + **`MAX_CONCURRENT_SUBAGENTS`**
- [ ] 3.4 **不**迁 fork/repair — 留给 step 4
- [ ] 3.5 从 monolith 删除已迁代码；**同一步**在 `subagent-relay.mjs` 追加 `export … from './subagent-relay-schemas-trace.mjs'`
- [ ] 3.6 `node --test tests/engine/subagent-relay.test.mjs` — 0 fail

## 4. Extract fork-dispatch (~294 lines) @impl FRE-004

- [ ] 4.1 迁出 fork/repair 域：`ForkStep` + 步骤常量；`classifyBranch`, `forkRouter`, `forkMap`, `dispatchMap`, `getDispatchMap`, `passStep`…`blockedStep`, `convergeRepair`, `defaultRepairStep`, `serializeState`, `validateAndDiagnose`, `inspectFailure`；repair 诊断块（1412–1517）
- [ ] 4.2 import **仅** `./subagent-relay-schemas-trace.mjs`
- [ ] 4.3 monolith 追加 re-export；跑 test — 0 fail

## 5. Extract stage (~446 lines) @impl FRE-004, SUD-001, SNC-001

- [ ] 5.1 迁出 `createSlot` … `loadSlotByManifestEntry`（源码行域 397–842）及 stage 专属 internal（`LIFECYCLE_EVENT_SPECS`, `taskMarkdownForSlot`, `buildSpawnPrompt`, `materializeSlotDir`, `createDispatchManifest` 等）
- [ ] 5.2 import `./subagent-relay-schemas-trace.mjs` + `./subagent-relay-fork-dispatch.mjs`；**不得** import slot-runtime 或 collect-pipeline
- [ ] 5.3 **`getDispatchMap()` 策略**：`stageSubagentSlots` L748 改为 `const map = customDispatchMap || getDispatchMap()`（满足 `drive-relay-slot` 两参数调用）
- [ ] 5.4 monolith 追加 re-export；跑 test — 0 fail

## 6. Extract slot-runtime (~464 lines) @impl FRE-004, SUS-001, SUC-001

- [ ] 6.1 迁出 871–1334：`readSlotStatus` … `readSlotResult` + internal（`slotTransitions`, `readReceiptEvents`, `validateSlotResult`, `failedResultForSlot`, `extractParentRuntimeId`）
- [ ] 6.2 import schemas-trace + stage（`buildSpawnPrompt` only）
- [ ] 6.3 确认 stage **不**反向 import 本模块
- [ ] 6.4 monolith 追加 re-export；跑 test — 0 fail

## 7. Extract collect-pipeline (~242 lines) @impl FRE-004, SUR-001

- [ ] 7.1 迁出 1336–1411 + 1518–1683：`collectResults`, `mergeResults`, `forkAndStageSubagents`, `collectAndMergeSubagentResults`, `resolveSlotFromResultRef`
- [ ] 7.2 import：
  - schemas-trace — `ensureTrace`, `traceEntry`, `logEvent`, `SubagentWorkflowState`
  - fork-dispatch — `forkRouter`, `convergeRepair`, `validateAndDiagnose`, `getDispatchMap()`
  - stage — `stageSubagentSlots`
  - slot-runtime — **`readSlotResult`**（`collectResults` 硬依赖）
  - `./helpers/ref-count.mjs` — `isCountable`
- [ ] 7.3 **`forkAndStageSubagents`**：L1522 `customDispatchMap || getDispatchMap()`；L1542 仍传 resolved `map` 给 `stageSubagentSlots`
- [ ] 7.4 确认 DAG 无 cycle；monolith 追加 re-export
- [ ] 7.5 `node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs` — 0 fail

## 8. Barrel & cleanup @impl FRE-004

- [ ] 8.1 删除 `subagent-relay.mjs` 内全部 inline 实现；保留文件头 + Sub-modules 列表（5 文件，参照 `gate-helpers.mjs`）+ 完整 re-export 块
- [ ] 8.2 对照 **32 个** `^export` 逐项验收（production + tests + 文件头注释交叉核对）
- [ ] 8.3 `wc -l DPT_FRAMEWORK/engine/subagent-relay-*.mjs` — sanity check（无单文件 >1000；<100 仅 review 追问，**非 fail 条件**）
- [ ] 8.4 grep：`_trace =` / `_log =` 仅出现在 `subagent-relay-schemas-trace.mjs`
- [ ] 8.5 grep：`from '.*subagent-relay-` 在 `DPT_FRAMEWORK/ tests/ experiments_playbook/` 仅出现在 `engine/subagent-relay*.mjs`

## 9. Regression & governance

- [ ] 9.1 `node --test tests/engine/subagent-relay.test.mjs tests/engine/queue-manager.test.mjs tests/engine/helpers/relay-provenance-gate.test.mjs`
- [ ] 9.2 `node --test tests/integration/md/subagent-logging-contract.test.mjs`
- [ ] 9.3 `node --check DPT_FRAMEWORK/cli/drive-relay-slot.mjs`
- [ ] 9.4 `node DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs` — exit 0
- [ ] 9.5 `node openspec/governance/check-project-reqs.mjs` — PASS
- [ ] 9.6 `node openspec/governance/check-project-specs.mjs` — PASS

## 10. Documentation touch (非阻塞)

- [ ] 10.1 archive 时 sync `openspec/specs/framework-engine/spec.md`
- [ ] 10.2 （可选）更新 guidelines/backlog 行号与行数描述
