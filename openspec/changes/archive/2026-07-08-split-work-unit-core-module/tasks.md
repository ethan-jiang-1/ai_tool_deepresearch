## 1. 创建子模块 — 数据层

- [x] 1.1 创建 `work-unit-constants.mjs`：从 `work-unit-core.mjs` 迁移 `WORK_UNITS`、`WORK_UNIT_OUTPUT_LEDGER`、`DEFAULT_KIND_REGISTRY`、`WORK_UNIT_REQUIRED_RECEIPT_FIELDS`、`DEFAULT_KIND_CONTRACTS`，保持 `Object.freeze` 语义不变

- [x] 1.2 创建 `work-unit-utils.mjs`：迁移工具函数（`now`、`clone`、`rel`、`writeJson`、`readJson`、`stableStringify`、`sha256`、`hashValue`、`ledgerPath`、`readLedgerRows`、`appendLedgerRow`、`isSafeBundleRelative`、`isPlainObject`、`isPathInsideDir`、`recordSubmitNormalization`、`logCliPath`、`bundleName`、`defaultKindContract`、`kindContractForQueueItem`）、trace/diagnostic wrapper（`traceWorkUnitEvent`、`emitWorkUnitInspectDiagnostics`）、ledger 读函数（`readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow`）、cache 校验函数（`validateCacheTrailContent`、`readOptionalJson`、`hasExplicitDegradedCapture`）

## 2. 创建子模块 — 状态管理层

- [x] 2.1 创建 `work-unit-index.mjs`：迁移路径函数（`workUnitsRoot`、`workUnitIndexPath`、`transactionDir`、`ensureWorkUnitDirs`）、ID 解析/校验（`parseWorkId`、`resolveKindCode`、`resolveKind`、`validateWorkIdBinding`）、状态计数（`computeStatusCounts`、`countTraceEvents`、`computeWorkUnitHealthProjection`、`computeInspectProjection`）、索引 CRUD（`createEmptyWorkUnitIndex`、`loadWorkUnitIndex`、`saveWorkUnitIndex`）、ID 分配（`waveKey`、`batchId`、`claimId`、`ensureBatch`、`nextAttemptIndex`、`allocateWorkId`）、记录查找（`requireWorkUnitRecord`）、事务（`transactionPath`、`writeTransaction`、`withWorkUnitTransaction`）

## 3. 创建子模块 — 文档生成层

- [x] 3.1 创建 `work-unit-envelope.mjs`：迁移 `refsForWorkUnit`、`resultSchemaDocument`、`jsonBlock`、`absolutePathMap`、`lifecycleReceiptExample`、`logDetailExample`、`taskMarkdown`、`spawnPromptForWorkUnit`、`writeWorkUnitEnvelope`

## 4. 创建子模块 — 校验层

- [x] 4.1 创建 `work-unit-validation.mjs`：迁移 `readAndValidateManifest`、`readAndValidateBeacon`、`readAndValidateResult`、`validateSubmitRuntimeReceipt`、`validateOutputFiles`、`canonicalizeCacheLeafPage`、`validateCacheTrails`、`acceptedClaimStatus`、`normalizeUrlForSourceCache`、`cacheTrailMapping`、`validateSourceClaims`、`validateQueueBindingForSubmit`（注意：`validateCacheTrailContent`、`readOptionalJson`、`hasExplicitDegradedCapture` 已移至 utils）

## 5. 创建子模块 — 操作层

- [x] 5.1 创建 `work-unit-lifecycle.mjs`：迁移 `createWorkUnitInIndex`、`createWorkUnit`、`parsePhase`、`defaultKindForWave`、`itemWave`、`isEligibleDelegatedItem`、`countUnclaimedDelegated`、`phaseInFlight`、`openWorkUnitBatch`、`claimWorkUnits`、`statusToEvent`、`statusToQueueTerminal`、`closeWorkUnitAttempt`

- [x] 5.2 创建 `work-unit-submit.mjs`：迁移 snapshot/rollback（`captureFileSnapshot`、`restoreFileSnapshot`、`captureSubmitSnapshot`、`restoreSubmitSnapshot`）、durability（`verifySubmitDurablePostcondition`、`buildSubmitDurabilityFailure`）、ledger 写入（`buildLedgerRow`）、rejection（`reasonCodeForSubmit`、`submitRejectionPayload`、`recordSubmitRejection`）、主流程（`prepareWorkUnitSubmit`、`submitWorkUnit`）。注意：`readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow` 已移至 utils，submit 模块从 utils import 这些读函数

- [x] 5.3 创建 `work-unit-inspect.mjs`：迁移 `listWorkUnitDirs`、`transactionIssues`、`runtimeReceiptIssues`、`beaconIssues`、`ledgerIssues`、`inspectWorkUnits`。inspect 模块仅依赖 utils + index（`readWorkUnitLedgerRows` 和 `validateCacheTrailContent` 从 utils import）

## 6. 连接子模块 import 并调整可见性

- [x] 6.1 验证子模块间 import 形成单向无环图 — 正确依赖关系：
  - `constants`：无依赖
  - `utils`：依赖 constants
  - `index`：依赖 utils, constants
  - `envelope`：依赖 utils, index
  - `validation`：依赖 utils, index
  - `lifecycle`：依赖 utils, index, envelope
  - `submit`：依赖 utils, index, envelope, validation
  - `inspect`：依赖 utils, index

- [x] 6.2 按设计 Decision 6 将跨模块调用的内部函数改为 `export`：`ensureWorkUnitDirs`、`refsForWorkUnit`、`hashValue`、`readLedgerRows`、`appendLedgerRow`、`isSafeBundleRelative`、`isPathInsideDir`、`recordSubmitNormalization`、`kindContractForQueueItem`、`requireWorkUnitRecord`、`traceWorkUnitEvent`、`emitWorkUnitInspectDiagnostics`、`readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow`、`validateCacheTrailContent`

## 7. 分配 @impl header 到子模块

- [x] 7.1 将原 `work-unit-core.mjs` 头部的 `@impl` 注释（DEW-002, DEW-004, FRE-005, SDC-001, SDC-002, SDC-003, EXO-001, FIO-001, SNC-005, REF-006, WAI-008, WTS-010）按函数归属分配到 8 个子模块，每个子模块仅保留其实现函数的 requirement ID。constants 模块不需要 `@impl`（纯数据）。分配参考（实现时逐函数确认，不盲贴）：index — DEW-002/DEW-004/SDC-001/SDC-002/SDC-003/FRE-005；envelope — DEW-002/WAI-008/WTS-010；validation — DEW-004/SNC-005/REF-006；lifecycle — DEW-002/DEW-004/EXO-001；submit — DEW-005/FRE-005/EXO-001；inspect — EXO-001/FIO-001；utils — FRE-005/FIO-001

- [x] 7.2 将原 `tests/engine/work-unit-core.test.mjs` 头部的 `@impl` 注释（DEW-002, DEW-004, FRE-005, SDC-001, SDC-002, SDC-003, EXO-001）按 test case 归属分配到 3 个新测试文件：`work-unit-index.test.mjs` — DEW-002/SDC-001；`work-unit-lifecycle.test.mjs` — DEW-002/DEW-004/FRE-005；`work-unit-inspect.test.mjs` — EXO-001

## 8. 拆分测试文件

- [x] 8.1 创建 `tests/engine/work-unit-index.test.mjs`：从 `work-unit-core.test.mjs` 迁移 `work_id parsing and binding` describe block（3 个 test case：parse canonical IDs、reject malformed IDs、validate binding）。import 从 barrel 保持不变

- [x] 8.2 创建 `tests/engine/work-unit-lifecycle.test.mjs`：从 `work-unit-core.test.mjs` 迁移 `work-unit index and envelope` describe block（3 个 test case：envelope surfaces、spawn prompt、attempt_index retry）。import 从 barrel 保持不变

- [x] 8.3 创建 `tests/engine/work-unit-inspect.test.mjs`：从 `work-unit-core.test.mjs` 迁移 `work-unit inspect` describe block（6 个 test case：consistent inspect、status-count drift、orphan dirs、uncommitted tx、expired lease、receipt event identity）。import 从 barrel 保持不变

- [x] 8.4 删除 `tests/engine/work-unit-core.test.mjs`（内容已全部迁移至上述 3 个文件）

## 9. 将 work-unit-core.mjs 变为 barrel

- [x] 9.1 删除 `work-unit-core.mjs` 中所有函数/常量定义，仅保留从 8 个子模块的 import + re-export

- [x] 9.2 核对 barrel 覆盖全部公开导出 — 常量（5 个）：`WORK_UNITS`、`WORK_UNIT_OUTPUT_LEDGER`、`DEFAULT_KIND_REGISTRY`、`WORK_UNIT_REQUIRED_RECEIPT_FIELDS`、`DEFAULT_KIND_CONTRACTS`；函数（23 个）：`workUnitsRoot`、`workUnitIndexPath`、`transactionDir`、`parseWorkId`、`resolveKindCode`、`resolveKind`、`validateWorkIdBinding`、`createEmptyWorkUnitIndex`、`loadWorkUnitIndex`、`saveWorkUnitIndex`、`allocateWorkId`、`spawnPromptForWorkUnit`、`writeWorkUnitEnvelope`、`createWorkUnit`、`computeWorkUnitLedgerRecordHash`、`readWorkUnitLedgerRows`、`submitWorkUnit`、`closeWorkUnitAttempt`、`openWorkUnitBatch`、`claimWorkUnits`、`transactionPath`、`withWorkUnitTransaction`、`inspectWorkUnits`

## 10. 回归验证

- [x] 10.1 运行 `node --test tests/engine/` — 全部通过（含拆分后的 3 个新测试文件 + 已有的 claim/submit/terminal 测试），零退化

- [x] 10.2 运行 `node --test tests/schema/` — 全部通过

- [x] 10.3 运行 `node --test tests/integration/` — 全部通过

- [x] 10.4 运行 `node -e "import('./DPT_FRAMEWORK/engine/work-unit-core.mjs').then(m => console.log(Object.keys(m).sort().join('\n')))"` — 确认 barrel 加载成功且导出完整（28 个符号）

- [x] 10.5 验证 MD playbook 兼容性：grep `experiments_playbook/` 下 7 个引用 `work-unit-core.mjs` 的 playbook 文件，确认所有 import 路径通过 barrel 可解析（barrel 路径不变，此项为静态确认）

## 11. 收尾检查

- [x] 11.1 运行 `node openspec/governance/check-project-reqs.mjs` — PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）

- [x] 11.2 运行 `node openspec/governance/check-project-specs.mjs` — PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
