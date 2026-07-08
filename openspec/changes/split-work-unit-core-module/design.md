## Context

`DPT_FRAMEWORK/engine/work-unit-core.mjs` 当前 2311 行，是框架中 work-unit 子系统的唯一实现文件。它承担以下全部职责：

| 行范围 | 职责 | 函数/符号数 |
|--------|------|------------|
| 1-37 | import（node 内置 + 内部模块 + schema） | — |
| 39-121 | 常量定义（WORK_UNITS, DEFAULT_KIND_REGISTRY, DEFAULT_KIND_CONTRACTS） | 3 个对象 |
| 123-238 | 通用工具（now, clone, writeJson, hashValue, ledger 读写, 路径安全, kind contract） | 18 个函数 |
| 240-298 | 路径解析 + work_id 解析/校验 | 6 个函数 |
| 300-371 | 状态计数 + health/inspect 投影 | 4 个函数 |
| 373-464 | Index CRUD + ID 分配（wave/batch/claim） | 9 个函数 |
| 466-681 | Envelope 生成（manifest, beacon, task.md, spawn prompt） | 7 个函数 |
| 683-778 | Envelope 写入 + trace/diagnostic wrapper | 3 个函数 |
| 780-855 | Work unit 创建（createWorkUnitInIndex + createWorkUnit） | 2 个函数 |
| 857-941 | 提交前校验：manifest, beacon, result | 3 个函数 |
| 943-1026 | 提交前校验：runtime receipt JSONL | 1 个函数 |
| 1028-1209 | 提交前校验：output files, cache trails, source claims | 10 个函数 |
| 1211-1375 | Queue binding 校验 + snapshot/rollback + ledger | 9 个函数 |
| 1377-1497 | Submit rejection 路径 | 3 个函数 |
| 1499-1691 | 主提交流程（prepare + submit + durability） | 2 个函数 |
| 1693-1814 | closeWorkUnitAttempt（fail/timeout/abandon） | 3 个函数 |
| 1816-1857 | openWorkUnitBatch | 2 个函数 |
| 1865-2018 | claimWorkUnits + eligibility 判断 | 6 个函数 |
| 2020-2064 | 事务（withWorkUnitTransaction） | 3 个函数 |
| 2066-2311 | inspectWorkUnits + 子检查 | 6 个函数 |

文件开头 `@impl` 注释引用 12 个 requirement 前缀（DEW, FRE, SDC, EXO, FIO, SNC, REF, WAI, WTS），体现了职责混杂的程度。

## Goals / Non-Goals

**Goals:**

- 按职责内聚将 2311 行拆分为 7 个子模块，每个 125-530 行
- 原 `work-unit-core.mjs` 保留为 re-export barrel，12 个消费者的 import 路径零改动
- 子模块依赖形成单向无环图（DAG），可独立理解和测试
- 所有现有回归测试在拆分后零改动通过

**Non-Goals:**

- 不改变任何函数的行为、签名、返回值
- 不新增/修改/删除 requirement 或 spec
- 不新增 npm 依赖
- 不修改 schema 文件
- 不移动 `tests/` 或 `experiments_env/` 中的 import 路径
- 不对子模块编写新的单元测试（现有测试覆盖已足够；拆分后测试是回归手段而非新测试目标）

## Decisions

### Decision 1: 模块切分边界

**选择**: 按"数据/工具 → 状态管理 → 文档生成 → 校验 → 操作"分层切分，而非按 wave 或 kind 切分。

**理由**: 当前代码的复用模式是纵向的——校验函数被 submit 和 inspect 共用，工具函数被所有层使用。按 wave/kind 切会产生大量跨模块循环依赖。按分层切则形成清晰的 `data → logic → operation` 递进。

**备选方案**: 按"公开 API + 内部实现"拆成 2 个文件（`work-unit-core.mjs` + `work-unit-internal.mjs`）。否决原因：内部实现仍有 2000+ 行，问题没有真正解决；且"公开/内部"边界随需求变化，不如按职责域稳定。

### Decision 2: 7 模块的职责划分与依赖方向

```
work-unit-constants.mjs     ← 零依赖（仅 import schema）
        ↑
work-unit-utils.mjs         ← 依赖 constants
        ↑
work-unit-index.mjs         ← 依赖 utils, constants
        ↑
work-unit-envelope.mjs      ← 依赖 utils, constants, index
        ↑
   ┌────┴────┐
   ↑         ↑
validation  lifecycle       ← 依赖 utils, constants, index, envelope
   ↑         ↑
   └────┬────┘
        ↑
work-unit-submit.mjs        ← 依赖 utils, constants, index, envelope, validation

work-unit-inspect.mjs       ← 依赖 utils, constants, index（独立分支）
```

**关键边界**:

| 模块 | 拥有哪些函数 | 不拥有哪些函数 |
|------|-------------|---------------|
| **constants** | `WORK_UNITS`, `WORK_UNIT_OUTPUT_LEDGER`, `DEFAULT_KIND_REGISTRY`, `WORK_UNIT_REQUIRED_RECEIPT_FIELDS`, `DEFAULT_KIND_CONTRACTS` | 无逻辑 |
| **utils** | `now`, `clone`, `rel`, `writeJson`, `readJson`, `stableStringify`, `sha256`, `hashValue`, `ledgerPath`, `readLedgerRows`, `appendLedgerRow`, `isSafeBundleRelative`, `isPlainObject`, `isPathInsideDir`, `recordSubmitNormalization`, `logCliPath`, `bundleName`, `defaultKindContract`, `kindContractForQueueItem`, `traceWorkUnitEvent`, `emitWorkUnitInspectDiagnostics` | 不碰 index、envelope、校验 |
| **index** | `workUnitsRoot`, `workUnitIndexPath`, `transactionDir`, `ensureWorkUnitDirs`, `parseWorkId`, `resolveKindCode`, `resolveKind`, `validateWorkIdBinding`, `computeStatusCounts`, `countTraceEvents`, `computeWorkUnitHealthProjection`, `computeInspectProjection`, `createEmptyWorkUnitIndex`, `loadWorkUnitIndex`, `saveWorkUnitIndex`, `waveKey`, `batchId`, `claimId`, `ensureBatch`, `nextAttemptIndex`, `allocateWorkId`, `transactionPath`, `writeTransaction`, `withWorkUnitTransaction` | 不碰 envelope 生成、提交校验 |
| **envelope** | `refsForWorkUnit`, `resultSchemaDocument`, `jsonBlock`, `absolutePathMap`, `lifecycleReceiptExample`, `logDetailExample`, `taskMarkdown`, `spawnPromptForWorkUnit`, `writeWorkUnitEnvelope` | 不碰 index 修改、提交 |
| **validation** | `requireWorkUnitRecord`, `readAndValidateManifest`, `readAndValidateBeacon`, `readAndValidateResult`, `validateSubmitRuntimeReceipt`, `validateOutputFiles`, `canonicalizeCacheLeafPage`, `validateCacheTrails`, `acceptedClaimStatus`, `normalizeUrlForSourceCache`, `cacheTrailMapping`, `validateSourceClaims`, `readOptionalJson`, `hasExplicitDegradedCapture`, `validateCacheTrailContent`, `validateQueueBindingForSubmit` | 不修改状态 |
| **lifecycle** | `createWorkUnitInIndex`, `createWorkUnit`, `parsePhase`, `defaultKindForWave`, `itemWave`, `isEligibleDelegatedItem`, `countUnclaimedDelegated`, `phaseInFlight`, `openWorkUnitBatch`, `claimWorkUnits`, `statusToEvent`, `statusToQueueTerminal`, `closeWorkUnitAttempt` | 不做提交校验 |
| **submit** | `captureFileSnapshot`, `restoreFileSnapshot`, `captureSubmitSnapshot`, `restoreSubmitSnapshot`, `verifySubmitDurablePostcondition`, `buildSubmitDurabilityFailure`, `buildLedgerRow`, `computeWorkUnitLedgerRecordHash`, `readWorkUnitLedgerRows`, `findSubmittedLedgerRow`, `reasonCodeForSubmit`, `submitRejectionPayload`, `recordSubmitRejection`, `prepareWorkUnitSubmit`, `submitWorkUnit` | 不做 inspect |
| **inspect** | `listWorkUnitDirs`, `transactionIssues`, `runtimeReceiptIssues`, `beaconIssues`, `ledgerIssues`, `inspectWorkUnits` | 不修改状态 |

### Decision 3: Barrel 模式，不迁移消费者

**选择**: `work-unit-core.mjs` 保留为 re-export barrel，所有消费者 import 路径不变。

**理由**: 12 个消费者分布在 `tests/`、`DPT_FRAMEWORK/cli/`、`DPT_FRAMEWORK/engine/helpers/`、`experiments_env/` 四个目录。逐一修改 import 路径是纯机械劳动，增加 diff 噪音而无实际价值，且与拆分本身的"零行为变更"目标矛盾。

**备选方案**: 删除 `work-unit-core.mjs`，让所有消费者直接从子模块 import。否决原因：破坏性太大，且消费者不应该关心内部模块边界。

### Decision 4: `withWorkUnitTransaction` 放在 index 模块

**选择**: 事务函数放在 `work-unit-index.mjs`。

**理由**: 事务管理 `_work_units/` 目录下的锁文件和事务 JSON，与 index 管理同一文件系统子树。`withWorkUnitTransaction` 调用的 `traceWorkUnitEvent` 和 `logToRun` 已放在 utils 模块（index 可依赖 utils），不存在循环依赖。

**备选方案**: 放在 `work-unit-envelope.mjs`。否决原因：事务逻辑与 envelope 生成无关，语义上不属于 envelope；且 envelope 依赖 index 的路径函数，若事务也放在 envelope 则 index 内调用事务时形成循环。

### Decision 5: Trace/diagnostic 函数提前到 utils

**选择**: `traceWorkUnitEvent` 和 `emitWorkUnitInspectDiagnostics` 放在 `work-unit-utils.mjs`。

**理由**: 这两个函数被 index（事务）、lifecycle（create/claim/close）、submit（提交/拒绝）多处调用。放在 utils 层避免了这些调用方必须依赖 envelope 模块才能打 trace 的问题。

**备选方案**: 放在 envelope 模块。否决原因：会造成 index → envelope 的依赖，而 envelope 又依赖 index 的路径函数，形成循环。

### Decision 6: 内部函数可见性策略

**选择**: 以下函数从 `function` 改为 `export function`（子模块间调用需要），但 barrel 不 re-export：

- `ensureWorkUnitDirs` — index 定义，envelope/lifecycle/submit 调用
- `refsForWorkUnit` — envelope 定义，lifecycle 调用
- `hashValue` — utils 定义，submit/inspect 调用
- `readLedgerRows` — utils 定义，submit/inspect 调用
- `appendLedgerRow` — utils 定义，submit 调用
- `isSafeBundleRelative` — utils 定义，validation 调用
- `isPathInsideDir` — utils 定义，validation 调用
- `recordSubmitNormalization` — utils 定义，validation 调用
- `readOptionalJson` — validation 定义，submit 调用（已内联于 validation）
- `hasExplicitDegradedCapture` — validation 定义，submit 调用
- `validateCacheTrailContent` — validation 定义，inspect 调用
- `requireWorkUnitRecord` — validation 定义，lifecycle/submit 调用
- `kindContractForQueueItem` — utils 定义，lifecycle 调用
- `parsePhase` — lifecycle 定义，无外部调用（仅 CLI 入口使用）

**不导出**的函数：仅在定义模块内部使用、无跨模块调用者的保持 `function`。

## Risks / Trade-offs

- **[R1] 循环依赖风险**：拆分后子模块间可能出现意外的 import 循环。→ **缓解**: 严格按 DAG 方向实现；在拆分完成后用 `node -e "import('./DPT_FRAMEWORK/engine/work-unit-core.mjs')"` 验证所有子模块可成功加载。

- **[R2] 内部函数遗漏**：某个 `function` 实际被跨模块调用但未改为 `export function`，导致运行时 `ReferenceError`。→ **缓解**: 运行全部回归测试套件（`node --test tests/engine/ tests/schema/ tests/integration/`），任何遗漏都会在测试中暴露。

- **[R3] Barrel 与子模块不同步**：未来新增函数时，开发者可能只在子模块中 `export` 而忘记在 barrel 中 re-export，导致外部消费者看不到新 API。→ **缓解**: 在 barrel 文件中添加注释提醒；现有测试覆盖了所有公开 API，遗漏会导致测试失败。长期可以通过 CLI lint 规则自动检查。

- **[R4] 模块数量增加**：从 1 个文件变为 8 个（7 子 + 1 barrel），`engine/` 目录文件数增加。→ **权衡**: 文件数增加是模块化的必然代价，但每个文件职责单一、可独立阅读，总认知负荷下降而非上升。

- **[R5] Git blame 断裂**：函数移动到新文件后，`git blame` 无法直接追踪到原始 commit。→ **缓解**: 在 commit message 中注明 "pure code move from work-unit-core.mjs, no logic changes"，便于未来用 `git log --follow` 追溯。

## Open Questions

（无。拆分方案已在分析阶段充分验证，所有函数归属和依赖方向已确认。）
