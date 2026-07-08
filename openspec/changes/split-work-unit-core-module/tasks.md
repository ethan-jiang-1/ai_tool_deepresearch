## 1. 创建子模块 — 数据层

- [ ] 1.1 创建 `work-unit-constants.mjs`：从 `work-unit-core.mjs` 迁移 `WORK_UNITS`、`WORK_UNIT_OUTPUT_LEDGER`、`DEFAULT_KIND_REGISTRY`、`WORK_UNIT_REQUIRED_RECEIPT_FIELDS`、`DEFAULT_KIND_CONTRACTS`，保持 `Object.freeze` 语义不变

- [ ] 1.2 创建 `work-unit-utils.mjs`：迁移 `now`、`clone`、`rel`、`writeJson`、`readJson`、`stableStringify`、`sha256`、`hashValue`、`ledgerPath`、`readLedgerRows`、`appendLedgerRow`、`isSafeBundleRelative`、`isPlainObject`、`isPathInsideDir`、`recordSubmitNormalization`、`logCliPath`、`bundleName`、`defaultKindContract`、`kindContractForQueueItem`、`traceWorkUnitEvent`、`emitWorkUnitInspectDiagnostics`

## 2. 创建子模块 — 状态管理层

- [ ] 2.1 创建 `work-unit-index.mjs`：迁移 `workUnitsRoot`、`workUnitIndexPath`、`transactionDir`、`ensureWorkUnitDirs`、`parseWorkId`、`resolveKindCode`、`resolveKind`、`validateWorkIdBinding`、`computeStatusCounts`、`countTraceEvents`、`computeWorkUnitHealthProjection`、`computeInspectProjection`、`createEmptyWorkUnitIndex`、`loadWorkUnitIndex`、`saveWorkUnitIndex`、`waveKey`、`batchId`、`claimId`、`ensureBatch`、`nextAttemptIndex`、`allocateWorkId`、`transactionPath`、`writeTransaction`、`withWorkUnitTransaction`

## 3. 创建子模块 — 文档生成层

- [ ] 3.1 创建 `work-unit-envelope.mjs`：迁移 `refsForWorkUnit`、`resultSchemaDocument`、`jsonBlock`、`absolutePathMap`、`lifecycleReceiptExample`、`logDetailExample`、`taskMarkdown`、`spawnPromptForWorkUnit`、`writeWorkUnitEnvelope`

## 4. 创建子模块 — 校验层

- [ ] 4.1 创建 `work-unit-validation.mjs`：迁移 `requireWorkUnitRecord`、`readAndValidateManifest`、`readAndValidateBeacon`、`readAndValidateResult`、`validateSubmitRuntimeReceipt`、`validateOutputFiles`、`canonicalizeCacheLeafPage`、`validateCacheTrails`、`acceptedClaimStatus`、`normalizeUrlForSourceCache`、`cacheTrailMapping`、`validateSourceClaims`、`readOptionalJson`、`hasExplicitDegradedCapture`、`validateCacheTrailContent`、`validateQueueBindingForSubmit`

## 5. 创建子模块 — 操作层

- [ ] 5.1 创建 `work-unit-lifecycle.mjs`：迁移 `createWorkUnitInIndex`、`createWorkUnit`、`parsePhase`、`defaultKindForWave`、`itemWave`、`isEligibleDelegatedItem`、`countUnclaimedDelegated`、`phaseInFlight`、`openWorkUnitBatch`、`claimWorkUnits`、`statusToEvent`、`statusToQueueTerminal`、`closeWorkUnitAttempt`

- [ ] 5.2 创建 `work-unit-submit.mjs`：迁移 `captureFileSnapshot`、`restoreFileSnapshot`、`captureSubmitSnapshot`、`restoreSubmitSnapshot`、`verifySubmitDurablePostcondition`、`buildSubmitDurabilityFailure`、`buildLedgerRow`、`computeWorkUnitLedgerRecordHash`、`readWorkUnitLedgerRows`、`findSubmittedLedgerRow`、`reasonCodeForSubmit`、`submitRejectionPayload`、`recordSubmitRejection`、`prepareWorkUnitSubmit`、`submitWorkUnit`

- [ ] 5.3 创建 `work-unit-inspect.mjs`：迁移 `listWorkUnitDirs`、`transactionIssues`、`runtimeReceiptIssues`、`beaconIssues`、`ledgerIssues`、`inspectWorkUnits`

## 6. 连接子模块 import 并调整可见性

- [ ] 6.1 验证子模块间 import 形成单向无环图（`constants ← utils ← index ← envelope ← {validation, lifecycle} ← submit`；`inspect ← index`），无循环依赖

- [ ] 6.2 按设计 Decision 6 将跨模块调用的内部函数改为 `export`：`ensureWorkUnitDirs`、`refsForWorkUnit`、`hashValue`、`readLedgerRows`、`appendLedgerRow`、`isSafeBundleRelative`、`isPathInsideDir`、`recordSubmitNormalization`、`kindContractForQueueItem`、`requireWorkUnitRecord`、`validateCacheTrailContent`、`traceWorkUnitEvent`、`emitWorkUnitInspectDiagnostics`

## 7. 将 work-unit-core.mjs 变为 barrel

- [ ] 7.1 删除 `work-unit-core.mjs` 中所有函数/常量定义，仅保留从 7 个子模块的 import + re-export

- [ ] 7.2 核对 barrel 覆盖全部 22 个公开导出：`workUnitsRoot`、`workUnitIndexPath`、`transactionDir`、`parseWorkId`、`resolveKindCode`、`resolveKind`、`validateWorkIdBinding`、`createEmptyWorkUnitIndex`、`loadWorkUnitIndex`、`saveWorkUnitIndex`、`allocateWorkId`、`spawnPromptForWorkUnit`、`writeWorkUnitEnvelope`、`createWorkUnit`、`computeWorkUnitLedgerRecordHash`、`readWorkUnitLedgerRows`、`submitWorkUnit`、`closeWorkUnitAttempt`、`openWorkUnitBatch`、`claimWorkUnits`、`transactionPath`、`withWorkUnitTransaction`、`inspectWorkUnits`、`WORK_UNITS`、`WORK_UNIT_OUTPUT_LEDGER`、`DEFAULT_KIND_REGISTRY`、`WORK_UNIT_REQUIRED_RECEIPT_FIELDS`、`DEFAULT_KIND_CONTRACTS`

## 8. 回归验证

- [ ] 8.1 运行 `node --test tests/engine/` — 全部通过，零退化

- [ ] 8.2 运行 `node --test tests/schema/` — 全部通过

- [ ] 8.3 运行 `node --test tests/integration/` — 全部通过

- [ ] 8.4 运行 `node -e "import('./DPT_FRAMEWORK/engine/work-unit-core.mjs').then(m => console.log(Object.keys(m).sort().join('\n')))"` — 确认 barrel 加载成功且导出完整

## 9. 收尾检查

- [ ] 9.1 运行 `node openspec/governance/check-project-reqs.mjs` — PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）

- [ ] 9.2 运行 `node openspec/governance/check-project-specs.mjs` — PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
