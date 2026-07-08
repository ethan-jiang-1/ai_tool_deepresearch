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
| 1211-1375 | Queue binding 校验 + snapshot/rollback + ledger 读/写 | 9 个函数 |
| 1377-1497 | Submit rejection 路径 | 3 个函数 |
| 1499-1691 | 主提交流程（prepare + submit + durability） | 2 个函数 |
| 1693-1814 | closeWorkUnitAttempt（fail/timeout/abandon） | 3 个函数 |
| 1816-1857 | openWorkUnitBatch | 2 个函数 |
| 1865-2018 | claimWorkUnits + eligibility 判断 | 6 个函数 |
| 2020-2064 | 事务（withWorkUnitTransaction） | 3 个函数 |
| 2066-2311 | inspectWorkUnits + 子检查 | 6 个函数 |

文件开头 `@impl` 注释引用 12 个 requirement 前缀（DEW, FRE, SDC, EXO, FIO, SNC, REF, WAI, WTS），体现了职责混杂的程度。

对应测试文件 `tests/engine/work-unit-core.test.mjs`（276 行）有 3 个 describe block：
- `work_id parsing and binding`（~40 行）— 测试 parseWorkId、validateWorkIdBinding
- `work-unit index and envelope`（~90 行）— 测试 createWorkUnit、spawnPromptForWorkUnit、envelope 表面
- `work-unit inspect`（~100 行）— 测试 inspectWorkUnits

## Goals / Non-Goals

**Goals:**

- 按职责内聚将 2311 行拆分为 8 个子模块，每个 100-470 行
- 原 `work-unit-core.mjs` 保留为 re-export barrel，21 个消费者的 import 路径零改动
- 子模块依赖形成单向无环图（DAG），可独立理解和测试
- `readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow` 作为纯读函数放 utils，避免 inspect 依赖 submit
- `validateCacheTrailContent` 作为纯校验函数放 utils，避免 inspect 依赖 validation
- 将 `tests/engine/work-unit-core.test.mjs` 按 3 个 describe block 拆分为 `work-unit-index.test.mjs`、`work-unit-lifecycle.test.mjs`、`work-unit-inspect.test.mjs`
- 所有现有回归测试在拆分后零改动通过

**Non-Goals:**

- 不改变任何函数的行为、签名、返回值
- 不新增/修改/删除 requirement 或 spec
- 不新增 npm 依赖
- 不修改 schema 文件
- 不移动任何消费者（JS 或 MD playbook）的 import 路径
- 不修改已独立的测试文件（`work-unit-claim.test.mjs`、`work-unit-submit.test.mjs`、`work-unit-terminal.test.mjs`）
- 不对子模块新增额外的测试用例（仅将现有测试按模块边界拆分，不写新测试逻辑）

## Decisions

### Decision 1: 模块切分边界

**选择**: 按"数据/工具 → 状态管理 → 文档生成 → 校验 → 操作"分层切分，而非按 wave 或 kind 切分。

**理由**: 当前代码的复用模式是纵向的——校验函数被 submit 和 inspect 共用，工具函数被所有层使用。按 wave/kind 切会产生大量跨模块循环依赖。按分层切则形成清晰的 `data → logic → operation` 递进。

**备选方案**: 按"公开 API + 内部实现"拆成 2 个文件（`work-unit-core.mjs` + `work-unit-internal.mjs`）。否决原因：内部实现仍有 2000+ 行，问题没有真正解决；且"公开/内部"边界随需求变化，不如按职责域稳定。

### Decision 2: 8 模块的职责划分与依赖方向

经过逐函数调用链验证后的正确依赖图（箭头 = "依赖"，`A → B` 表示 A import B）：

```
work-unit-constants.mjs     ← 零依赖（仅 import schema）
        ↑
work-unit-utils.mjs         ← 依赖 constants
        ↑
   ┌────┼────────┐
   ↑    ↑         ↑
index  validation inspect   ← 三者均依赖 utils
   ↑    ↑         ↑
   │    │    (仅 utils+index)
   │    │
envelope                    ← 依赖 utils, index
   ↑
lifecycle                   ← 依赖 utils, index, envelope
   ↑
submit                      ← 依赖 utils, index, envelope, validation
```

**关键设计选择：消除 inspect 的跨层依赖**

`inspectWorkUnits` 内部的 `ledgerIssues` 需要 `readWorkUnitLedgerRows` 和 `validateCacheTrailContent`。若将这两个函数分别放在 submit 和 validation 模块，inspect 会形成对两个"高阶"模块的依赖边，使 inspect 不再是独立分支。

**选择**: 将 `readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow` 放在 **utils**（而非 submit），将 `validateCacheTrailContent` 也放在 **utils**（而非 validation）。这四个都是纯读/纯校验函数，无副作用，语义上属于"工具"层。

**结果**: inspect 仅依赖 utils + index，validation 仅依赖 utils + index，submit 依赖 utils（含 ledger 读函数），无循环。

**关键边界**:

| 模块 | 拥有哪些函数 | 不拥有哪些函数 |
|------|-------------|---------------|
| **constants** | `WORK_UNITS`, `WORK_UNIT_OUTPUT_LEDGER`, `DEFAULT_KIND_REGISTRY`, `WORK_UNIT_REQUIRED_RECEIPT_FIELDS`, `DEFAULT_KIND_CONTRACTS` | 无逻辑 |
| **utils** | `now`, `clone`, `rel`, `writeJson`, `readJson`, `stableStringify`, `sha256`, `hashValue`, `ledgerPath`, `readLedgerRows`, `appendLedgerRow`, `isSafeBundleRelative`, `isPlainObject`, `isPathInsideDir`, `recordSubmitNormalization`, `logCliPath`, `bundleName`, `defaultKindContract`, `kindContractForQueueItem`, `traceWorkUnitEvent`, `emitWorkUnitInspectDiagnostics`, `readWorkUnitLedgerRows`, `computeWorkUnitLedgerRecordHash`, `findSubmittedLedgerRow`, `validateCacheTrailContent`, `readOptionalJson`, `hasExplicitDegradedCapture` | 不修改状态 |
| **index** | `workUnitsRoot`, `workUnitIndexPath`, `transactionDir`, `ensureWorkUnitDirs`, `parseWorkId`, `resolveKindCode`, `resolveKind`, `validateWorkIdBinding`, `computeStatusCounts`, `countTraceEvents`, `computeWorkUnitHealthProjection`, `computeInspectProjection`, `createEmptyWorkUnitIndex`, `loadWorkUnitIndex`, `saveWorkUnitIndex`, `waveKey`, `batchId`, `claimId`, `ensureBatch`, `nextAttemptIndex`, `allocateWorkId`, `requireWorkUnitRecord`, `transactionPath`, `writeTransaction`, `withWorkUnitTransaction` | 不碰 envelope 生成、提交校验 |
| **envelope** | `refsForWorkUnit`, `resultSchemaDocument`, `jsonBlock`, `absolutePathMap`, `lifecycleReceiptExample`, `logDetailExample`, `taskMarkdown`, `spawnPromptForWorkUnit`, `writeWorkUnitEnvelope` | 不碰 index 修改、提交 |
| **validation** | `readAndValidateManifest`, `readAndValidateBeacon`, `readAndValidateResult`, `validateSubmitRuntimeReceipt`, `validateOutputFiles`, `canonicalizeCacheLeafPage`, `validateCacheTrails`, `acceptedClaimStatus`, `normalizeUrlForSourceCache`, `cacheTrailMapping`, `validateSourceClaims`, `validateQueueBindingForSubmit` | 不修改状态；validateCacheTrailContent 已移至 utils；requireWorkUnitRecord 在 index |
| **lifecycle** | `createWorkUnitInIndex`, `createWorkUnit`, `parsePhase`, `defaultKindForWave`, `itemWave`, `isEligibleDelegatedItem`, `countUnclaimedDelegated`, `phaseInFlight`, `openWorkUnitBatch`, `claimWorkUnits`, `statusToEvent`, `statusToQueueTerminal`, `closeWorkUnitAttempt` | 不做提交校验 |
| **submit** | `captureFileSnapshot`, `restoreFileSnapshot`, `captureSubmitSnapshot`, `restoreSubmitSnapshot`, `verifySubmitDurablePostcondition`, `buildSubmitDurabilityFailure`, `buildLedgerRow`, `reasonCodeForSubmit`, `submitRejectionPayload`, `recordSubmitRejection`, `prepareWorkUnitSubmit`, `submitWorkUnit` | 不做 inspect；ledger 读函数已移至 utils |
| **inspect** | `listWorkUnitDirs`, `transactionIssues`, `runtimeReceiptIssues`, `beaconIssues`, `ledgerIssues`, `inspectWorkUnits` | 不修改状态；仅依赖 utils + index |

### Decision 3: Barrel 模式，不迁移消费者

**选择**: `work-unit-core.mjs` 保留为 re-export barrel，所有消费者 import 路径不变。

**理由**: 21 个消费者（14 JS/mjs + 7 MD playbook）分布在 `tests/`、`DPT_FRAMEWORK/cli/`、`DPT_FRAMEWORK/engine/helpers/`、`experiments_env/`、`experiments_playbook/` 五个目录。逐一修改 import 路径是纯机械劳动，增加 diff 噪音而无实际价值，且与拆分本身的"零行为变更"目标矛盾。MD playbook 中的代码块同样从 barrel 导入，无需变更。

**备选方案**: 删除 `work-unit-core.mjs`，让所有消费者直接从子模块 import。否决原因：破坏性太大，且消费者不应该关心内部模块边界。

### Decision 4: `withWorkUnitTransaction` 放在 index 模块

**选择**: 事务函数放在 `work-unit-index.mjs`。

**理由**: 事务管理 `_work_units/` 目录下的锁文件和事务 JSON，与 index 管理同一文件系统子树。`withWorkUnitTransaction` 调用的 `traceWorkUnitEvent`（已放 utils）和 `logToRun`（来自 `logger.mjs`，外部模块），index 均可合法依赖，不存在循环。

**备选方案**: 放在 `work-unit-envelope.mjs`。否决原因：事务逻辑与 envelope 生成无关，语义上不属于 envelope；且 envelope 依赖 index 的路径函数，若事务也放在 envelope 则 index 内调用事务时形成循环。

### Decision 5: Trace/diagnostic 和 ledger 读函数提前到 utils

**选择**: `traceWorkUnitEvent`、`emitWorkUnitInspectDiagnostics`、`readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow`、`validateCacheTrailContent` 放在 `work-unit-utils.mjs`。

**理由**:
- `traceWorkUnitEvent` 被 index（事务）、lifecycle（create/claim/close）、submit（提交/拒绝）多处调用，必须放在底层
- `readWorkUnitLedgerRows` 被 submit（prepare/durability check）和 inspect（ledgerIssues）共用，放 utils 避免 inspect → submit
- `validateCacheTrailContent` 被 validation（validateCacheTrails）和 inspect（ledgerIssues）共用，放 utils 避免 inspect → validation
- 这四个 ledger/cache 函数都是纯读/纯校验，无副作用，语义上适合工具层

**备选方案**: 放在各自"归属"模块（ledger 读放 submit，cache 校验放 validation），inspect 跨层依赖它们。否决原因：inspect 应保持独立分支，不应依赖 submit/validation 等高层模块。

### Decision 6: 内部函数可见性策略

**选择**: 以下函数从 `function` 改为 `export function`（子模块间调用需要），但 barrel 不 re-export：

- `ensureWorkUnitDirs` — index 定义，envelope/lifecycle/submit 调用
- `refsForWorkUnit` — envelope 定义，lifecycle 调用
- `hashValue` — utils 定义，submit/inspect 调用
- `readLedgerRows` — utils 定义，内部调用
- `appendLedgerRow` — utils 定义，submit 调用
- `isSafeBundleRelative` — utils 定义，validation 调用
- `isPathInsideDir` — utils 定义，validation 调用
- `recordSubmitNormalization` — utils 定义，validation 调用
- `kindContractForQueueItem` — utils 定义，lifecycle 调用
- `requireWorkUnitRecord` — index 定义，lifecycle/submit 调用（本质是 index record lookup，放 index）
- `traceWorkUnitEvent` — utils 定义，index/lifecycle/submit 调用
- `emitWorkUnitInspectDiagnostics` — utils 定义，inspect 调用
- `readWorkUnitLedgerRows` — utils 定义，submit/inspect 调用
- `computeWorkUnitLedgerRecordHash` — utils 定义，submit/inspect 调用
- `findSubmittedLedgerRow` — utils 定义，submit 调用
- `validateCacheTrailContent` — utils 定义，validation/inspect 调用

**不导出**的函数：仅在定义模块内部使用、无跨模块调用者的保持 `function`。

### Decision 7: 测试文件同步拆分

**选择**: 将 `tests/engine/work-unit-core.test.mjs` 按 3 个 describe block 拆分为 3 个文件，与源模块边界对齐。

| 新测试文件 | 对应源模块 | 迁移自 |
|-----------|-----------|--------|
| `work-unit-index.test.mjs` | `work-unit-index.mjs` | `work_id parsing and binding` describe |
| `work-unit-lifecycle.test.mjs` | `work-unit-lifecycle.mjs` + `work-unit-envelope.mjs` | `work-unit index and envelope` describe |
| `work-unit-inspect.test.mjs` | `work-unit-inspect.mjs` | `work-unit inspect` describe |

**理由**: 拆分后的源模块各司其职，测试文件应对齐同一边界。`work-unit-claim.test.mjs`、`work-unit-submit.test.mjs`、`work-unit-terminal.test.mjs` 已经独立存在，无需变更。

**注意**: `work-unit-lifecycle.test.mjs` 的测试依赖 `createWorkUnit`（lifecycle 模块导出的公开 API），因为 envelope 表面（task.md、beacon、manifest）必须在真实 work unit 创建后才能验证。这自然覆盖了 lifecycle + envelope 两个模块的交互。测试从 barrel import（与拆分前一致），不直接依赖子模块内部路径。

## Risks / Trade-offs

- **[R1] 循环依赖风险**：拆分后子模块间可能出现意外的 import 循环。→ **缓解**: 严格按 DAG 方向实现；在拆分完成后用 `node -e "import('./DPT_FRAMEWORK/engine/work-unit-core.mjs')"` 验证所有子模块可成功加载。

- **[R2] 内部函数遗漏**：某个 `function` 实际被跨模块调用但未改为 `export function`，导致运行时 `ReferenceError`。→ **缓解**: 所有集成测试（`work-unit-claim.test.mjs`、`work-unit-submit.test.mjs`、`work-unit-terminal.test.mjs`）通过 barrel 调用公开 API，其内部链路经过所有跨模块调用点（如 submit → validation → utils），任何遗漏 export 都会在端到端路径上暴露为 `ReferenceError`。barrel 不 re-export 内部函数，因此仅靠拆分后的 barrel-import 测试无法捕捉此类遗漏——真正的安全网是已有集成测试的完整调用链覆盖。

- **[R3] Barrel 与子模块不同步**：未来新增函数时，开发者可能只在子模块中 `export` 而忘记在 barrel 中 re-export，导致外部消费者看不到新 API。→ **缓解**: 在 barrel 文件中添加注释提醒；现有测试覆盖了所有公开 API，遗漏会导致测试失败。

- **[R4] 模块数量增加**：从 1 个文件变为 9 个（8 子 + 1 barrel），测试从 1 个变为 3 个，`engine/` 和 `tests/engine/` 目录文件数增加。→ **权衡**: 文件数增加是模块化的必然代价，但每个文件职责单一、可独立阅读，总认知负荷下降而非上升。

- **[R5] Git blame 断裂**：函数移动到新文件后，`git blame` 无法直接追踪到原始 commit。→ **缓解**: 在 commit message 中注明 "pure code move from work-unit-core.mjs, no logic changes"，便于未来用 `git log --follow` 追溯。

- **[R6] MD playbook 兼容性**：7 个 `experiments_playbook/` 下的 MD 文件包含 `import ... from './DPT_FRAMEWORK/engine/work-unit-core.mjs'` 代码块。→ **缓解**: barrel 保留原路径不变，MD playbook 中的 import 无需修改；拆分后在代表性 playbook 上做静态路径验证。

## Open Questions

- **模块级单元测试缺口**：当前测试策略以回归验证为目标——拆分后所有现有测试通过即视为成功。但拆分暴露了测试覆盖的结构性缺口：`work-unit-utils.mjs` 中的纯函数（`hashValue`、`isSafeBundleRelative`、`validateCacheTrailContent` 等）和 `work-unit-validation.mjs` 中的校验函数没有独立的模块级单元测试，目前仅通过 submit/claim 等集成测试间接覆盖。这些函数输入输出确定、无副作用，实际上是最容易写单元测试的。建议在后续 change 中为 utils 和 validation 模块补充 `tests/engine/work-unit-utils.test.mjs` 和 `tests/engine/work-unit-validation.test.mjs`，直接 import 子模块（而非 barrel），实现真正的模块级隔离测试。

- **`@impl` header 分配**：原文件头部 `@impl` 注释覆盖 12 个 requirement ID，拆分为 8 个模块后每个子模块仅应保留其实现的 requirement。具体分配需在实现时逐函数确认——例如 index 模块带 DEW-002/DEW-004/SDC-*，envelope 模块带 WAI-008/WTS-010，validation 模块带 SNC-005/REF-006 等。此步骤不影响运行时行为（`@impl` 是文档注释），但影响 `check-project-reqs.mjs` 的扫描结果和代码可追溯性。测试文件的 `@impl` header 同理需要拆分。
