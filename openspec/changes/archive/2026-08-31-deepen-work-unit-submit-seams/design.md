# Design: deepen-work-unit-submit-seams

## Context

见 proposal.md。本 design 是执行的单一真相：函数级切缝地图（§M）、纠缠清单（§T）、不变量场景（§S）、任务顺序（§T-seq）。**行号为深挖时基线（C2 前），C2 已删除 validation 的死分支并从 submit.mjs 移除 `resultPathInsideAssignedDir` 计算——执行期一律以函数名 `^function NAME`/`^async function NAME` 定位，不得用行号切割。**

## Goals / Non-Goals

- Goals：S1–S12 不变量网（改前先立）；四个内部 seam 落地（snapshot / late-retry / declaration-recovery / transaction 三层）；最大文件 2440→~1030。
- Non-Goals：T6（submit-plan 切分 + validateSubmitPlan/recovery 管线共享）缓期——recovery 的零规范化严格性是行为敏感面；公开导出面零变化；不新增 export。

## 决策

| # | 决策 | 理由 |
|---|---|---|
| D1 | 内部 seam 模块**不经 `work-unit-core` 再导出**，除 T3 的 `lateSubmitWorkUnit`（barrel 直接改从新模块 import） | 不放宽导出；submit re-export late 会造 submit↔late 环 |
| D2 | 4 个共享 durable-state 查询（`readQueueSideEffectFree`/`submittedReplacementConflicts`/`targetLedgerRows`/`buildLedgerRow`）迁入 snapshot 模块（基层） | 它们被四条流共用；留残余会造 snapshot→submit→snapshot 环 |
| D3 | T5 三层：primitives（无 projection 依赖）→ projection（仅依赖 primitives）→ 主文件（mechanics + recover + compat re-exports） | 消解 withWorkUnitTransaction↔inspect/recover 的真实内部环 |
| D4 | move-only 纪律：T2–T5 的每个生产 diff 允许的改动仅限 import 行、函数搬移、必要的 `module-level` 常量随迁；禁止顺手改逻辑 | `buildLedgerRow`/postcondition verifier 是哈希/状态契约；S11 与全量回归是裁决 |
| D5 | T5 顺带两项 primitive 统一：`sha256Bytes`→`work-unit-utils.sha256`（等价实现，Buffer 输入同摘要）；`transactionRoot` 与 `work-unit-index.transactionDir` 统一（注意 path.resolve 语义差，以 index 版为 owner） | 消除两份哈希/路径定义；行为等价 |
| D6 | T6 缓期并登记 | plan §3 C4 原文"可选"；行为敏感面须单独批准 |

## §M 切缝地图（work-unit-submit.mjs，C2 前基线行号）

外部导出（保持不变）：`reasonCodeForSubmit`(:929)、`drySubmitWorkUnit`(:1786)、`lateSubmitWorkUnit`(:1829)、`recoverWorkUnitDeclaration`(:2079)、`inspectWorkUnitDeclarationRecovery`(:2170)、`submitWorkUnit`(:2197)。外部消费者：`work-unit-core.mjs:46-52`（5 个，不含 reasonCodeForSubmit——它零外部消费者）、`work-unit-timeout-preflight.mjs:26`（drySubmitWorkUnit）、`work-unit-supersession.mjs:44`（inspectWorkUnitDeclarationRecovery）。

### Module A → `work-unit-submit-snapshot.mjs`（~300 行，基层，仅依赖 index/queue-manager-core/utils/queue-manager-lifecycle/submitted-ledger/fs）
captureFileSnapshot(93-97)、restoreFileSnapshot(99-105)、captureSubmitSnapshot(107-118)、restoreSubmitSnapshot(120-130)、writeSubmittedStatusAndHashes(132-141)、verifySubmitDurablePostcondition(143-187)、buildSubmitDurabilityFailure(189-214)、**readQueueSideEffectFree(216-220)⭐**、**submittedReplacementConflicts(222-231)⭐**、**targetLedgerRows(234-236)⭐**、verifyLateSubmitDurablePostcondition(310-396)、captureLateSubmitSnapshot(398-413)、buildLateSubmitDurabilityFailure(463-488)、**buildLedgerRow(490-517)⭐**

### Module B → `work-unit-submit-late-retry.mjs`（~610 行；依赖 Module A + 残余的 validateSubmitPlan/applyCandidateCanonicalizations/drySubmitRerun/reasonCodeForSubmit/formalSubmitRerun）
planLateSubmitRetryCleanup(238-300)、applyLateSubmitQueueCleanup(302-308)、lateSubmitRejection(415-461)、reasonCodeForLateSubmit(1316-1324)、cleanupPlanSignature(1326-1335)、loadLateSubmitTarget(1337-1341)、prepareLateSubmitIdempotent(1343-1392)、prepareLateSubmitWorkUnit(1394-1554)、invokeTransactionMutationBoundary(1780-1784)、lateSubmitWorkUnit 导出(1829-2077)

### Module C → `work-unit-submit-declaration-recovery.mjs`（~470 行；依赖 Module A，不依赖残余 submit）
declarationRecoveryCommand(519-525)、declarationRecoveryFailure(527-545)、readOriginalSubmitEvidence(547-598)、recoveryAuditOptions(600-633)、prepareCurrentDeclarationRecovery(635-851)、writeRecoveredDeclaration(853-875)、recoverWorkUnitDeclaration 导出(2079-2168)、inspectWorkUnitDeclarationRecovery 导出(2170-2195)

### 残余 submit.mjs（~1030 行）
头/imports/常量(1-81)、formalSubmitRerun(82-91)、reasonCodeForSubmit(929-940)、submitRejectionPayload(942-952)、rejectionGuidance(954-966)、recordSubmitRejection(968-1104)、jsonPointer(1106-1109)、drySubmitRerun(1111-1118)、repairContractForPhase(1120-1146)、violationForError(1148-1187)、violationsForError(1189-1194)、repairTargetForReason(1196-1205)、validateSubmitPlan(1207-1293)、applyCandidateCanonicalizations(1295-1299)、prepareWorkUnitSubmit(1301-1314)、directOutputViolation(1556-1572)、finalizeCandidatePlan(1574-1588)、collectDrySubmitPlan(1590-1774)、publicNormalizations(1776-1778)、drySubmitWorkUnit(1786-1827)、submitWorkUnit(2197-2447)

## §T 纠缠清单（执行约束）

1. 共享查询必须入 Module A（见 D2）——submit 内唯一真环风险。
2. late→残余边：lateSubmitWorkUnit 调 validateSubmitPlan(:1891)/applyCandidateCanonicalizations(:1921)；lateSubmitRejection 调 drySubmitRerun(:434)；reasonCodeForLateSubmit 回退 reasonCodeForSubmit(:1323)；formalSubmitRerun 共享(:2282/:1854)。late 在 plan 之上——无环 ✓。
3. **recovery 重实现了 validation 管线**（prepareCurrentDeclarationRecovery 721-745 ↔ validateSubmitPlan 1249-1278，更严格 flags）——本轮不合并（T6 缓期）。
4. **recovery 直接解析 `_work_units/_transactions/*.json` journal + 按 tx_id/result_hash/ledger_record_hash join rb_trace 事件**——late(:1995-2030) 与 submit(:2370-2414) 写的 trace payload 是承重墙，T3/T5 逐字节保留；S11 钉死。
5. `buildLedgerRow` 精确形状是哈希契约（recovery 用 ledger_record_hash 暴力候选重建 :780-807）——T2 纯 move-only。
6. submit commit body(:2317-2441) 与 late commit body(:1888-2065) 是近似重复管线（差异：late_accept_context/retry cleanup/boundaries）——**保持各自独立，不抽共享 commit helper**。
7. recovery 需要 captureFileSnapshot/restoreFileSnapshot(:2123/:2161)→ **T2 必须先于 T4**。
8. barrel 更新：`work-unit-core` 从新模块导入 late/recovery 导出；`work-unit-supersession.mjs:44` 同步。

## §T5 work-unit-transaction.mjs 三层（838 行基线）

- **Layer 0 `work-unit-transaction-primitives.mjs`**（~180）：rootPath/lockPath/transactionLockOwnerPath(54)/transactionRoot(58)/journalPath/journalRef(60-68)/sha256Bytes(70-72)/canonicalTargetPath(74-84)/captureMutationTargets(86-107)/mutationManifestFor(109-117)/targetMatchesBeforeImage(119-125)/restoreMutationTargets(127-152)/listBundleFiles(163-191)/changedFiles(193-196)/belongsToOtherWorkUnit(206-210)/isExactIsoTimestamp(263-265)/currentTargetsMatchManifest(267-277)。
- **Layer 1 `work-unit-transaction-projection.mjs`**（~250；仅依赖 L0）：callerFor(212-218)、defaultRerun(220-223)、rawSuspectHolder(225-239)、isCompleteCommittedV1Diagnostic(241-261)、recoverTransactionRerun(279-281)、suspectProjection(283-316)、readHeldTransactionProjection(318-367)、unresolvedOrphanJournals(369-395)、firstRecoverableOrphan(401-421)、**inspectWorkUnitTransaction 导出(423-470)**、transactionBlockedResult(472-482)。
- **Layer 2 主文件保留名**（~410）：header(1-44)、WORK_UNIT_TRANSACTION_TRANSITIONS(36)、normalizeOptions(484-502)、invokeTransactionHook(504-506)、**withWorkUnitTransaction(508-681)**、**recoverWorkUnitTransaction(683-838)**；**re-export** `inspectWorkUnitTransaction`/`transactionLockOwnerPath`/`WORK_UNIT_TRANSACTION_TRANSITIONS` 使 work-unit-index/work-unit-core/timeout-preflight 导入面不变。
- 真实内部环（机制 :513/:529/:542/:544/:545 调 projection；recoverWorkUnitTransaction :798 反向调 withWorkUnitTransaction）由三层消除；suspectProjection :293 调 L0 ✓。
- hoist：`sha256Bytes`→utils.sha256；`transactionRoot`↔`work-unit-index.transactionDir` 统一。

## §S 不变量场景（T1，全部对当前 seam 可写，零生产改动；**层归属**：S1/S2/S8 使用子进程 kill -9 = integration，落 `tests/integration/work-unit-submit-crash-invariants.test.mjs`；S3-S12 in-process = unit，落 `tests/engine/work-unit-submit-invariants.test.mjs`）

注入点：`transactionHooks.afterMutation(ctx)`（tx:604 前）、`afterCommittedBeforeRelease(ctx)`(:619)、late-submit `afterMutationBoundary` 5 个命名边界（targeted_attempt_saved:1936/retry_statuses_saved:1952/ledger_appended:1970/index_saved:1975/queue_saved:1980）、`submitWorkUnit` 的 `afterQueueSave`(:2200/:2359)、`withWorkUnitTransaction` 的 `options.hooks`、chmod 0o444 击穿、手写 v2 journal、子进程（hook 永久阻塞 + kill -9）。断言避免 pin 墙钟（declared_at/completed_at）。真 kill：spawn 子进程脚本 import work-unit-core，hook 内 `await new Promise(()=>{})`，父进程见 marker 后 `kill('SIGKILL')`。

| # | 函数 | 注入 | durable 断言（queue/ledger/index/trace/journal） |
|---|---|---|---|
| S1 | submitWorkUnit（子进程） | afterQueueSave 永久阻塞 + kill -9 | 恰 1 个 `started` v2 journal；lock owner 存在；done 行已落+in-flight 已删（queue save 已落）；ledger 无行；index 仍 claimed；trace 无 work_unit_submitted；inspect=busy/suspect 且 holder tx_id；重试 submit 被阻；recoverWorkUnitTransaction fail-closed（before-image 不匹配）且 journal 仍 `started` |
| S2 | lateSubmitWorkUnit（子进程） | afterMutationBoundary('targeted_attempt_saved') 阻塞 + kill -9 | `started` journal(late_submit_work_unit)；targeted result/status/receipt 已写；declarations 对该 work_id 零行；index 仍 timed_out；in-flight+queued retry 原样；superseded retry 未动；无 rolled_back/committed journal；后续 submit 被阻 |
| S3 | lateSubmit 5 边界逐点 throw | afterMutationBoundary 每 named boundary | 递归 authority snapshot 字节等价（除 .lock/_transactions/trace/_logs）；恰 1 rolled_back journal；lock 移除；index timed_out；ledger 空；queue 原样 |
| S4 | submit postcondition 失败 | afterQueueSave 清空 terminal_history | rolled_back journal（error 提及 postcondition）；rb_trace work_unit_transaction_failed rollback_restored=true；ledger 无行；index claimed；in-flight 恢复 |
| S5 | 不可证明回滚 | afterQueueSave 损坏 queue + chmod 0o444 | journal=suspect；inspect=suspect_transaction + repair_kind missing_contract（非 recoverTransaction）；recover 拒绝且零变更；chmod 恢复后仍 suspect（无自愈） |
| S6 | submit 重复回放 | 无注入，同字节两次 | 第二次 duplicate=true 且 result_hash/ledger_record_hash 相同；ledger 恰 1 行；恰 1 done 行；无新 journal；无第二条 work_unit_ledger_appended；index hash 字段相等 |
| S7 | late-submit 幂等回放 | 无注入 | idempotent=true；authority snapshot 除 trace/_logs 不变；零新 journal；恰 1 late_accept=true 行；superseded retry 以 superseded_by_late_accept 终态；恰 1 targeted done 行 |
| S8 | recoverWorkUnitDeclaration（子进程，drifted-row 场景） | 泛 afterMutation 阻塞 + kill -9 | `started` journal(recover_work_unit_declaration)；ledger 0 或 1 行（若 1 行其 hash=accepted hash，单行 replace/append 原子）；lock 在；inspect 阻塞；对该 journal 的 recovery fail-closed 且不复制行 |
| S9 | orphan wrapper 次序 | orphan B manifest 指向 orphan A journal_ref | inspect 先报 A；recover(B) 以 wrapper message 拒绝；先 A 后 B 成功；双 journal rolled_back；authority 零漂移 |
| S10 | busy 争用（submit 侧 API） | 子进程 CLI 持锁对 | submit/lateSubmit/recover 全返回 transactionBlockedResult(disposition busy)；authority snapshot 字节等价；被阻调用不写 journal |
| S11 | trace↔ledger↔result↔journal 哈希绑定 | 无注入 | submit/late/recovery 后：每个 work_unit_submitted/late_submitted 事件的 (work_id, queue_item_id, result_hash, ledger_record_hash, tx_id) 匹配既有 ledger 行、行字节重哈希=result_hash、引用 journal 存在且 committed |
| S12 | 拒绝路径不触 authority | 无注入（非法候选 + 无 reason late） | 无 ledger 行；queue 字节等价；index 前状态不变；仅 status_ref.last_submit_rejection + trace/log；**不创建 journal 文件** |

## T-seq 任务顺序

T1（全绿、3×稳定、生产零 diff）→ T2（submit≈2150；回归网：submit 1363-1460/transaction 845-1099/e2e attempt-recovery/S1-S12）→ T3（barrel 改 import；回归：submit late 块/transaction 945-1042/S2/S3/S7/S10/S11）→ T4（supersession:44 + barrel；回归：evidence/audit-drift/recovery-chain/S8/S11）→ T5（独立文件；import 面 grep 不变；回归：transaction 全量/S1/S2/S5/S8/S9/S10）→ T6 缓期。

## Risks / Trade-offs

- S11 是 T3/T5 的安全带：trace payload 承重墙在任何搬动中必须逐字节不变。
- `reasonCodeForSubmit` 零外部消费者——保留在残余并维持导出（本 change 不删导出）。
- 大文件切割的机械风险由"程序化定位函数名 + 逐文件 git diff 复核 + S 网全绿"三重缓解。
