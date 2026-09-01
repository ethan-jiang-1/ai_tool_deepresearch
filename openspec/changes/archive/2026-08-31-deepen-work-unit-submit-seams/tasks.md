# Tasks: deepen-work-unit-submit-seams

- [x] 0.1 openspec-feedback:plan-review —— 首次 target edit 前完成 `/polish-openspec-change` 打磨。Done condition 达成（2026-08-31）：validate --strict 绿；verification-routing 层归属修正（S1/S2/S8=integration 子进程、S3-S12=unit）；三查 PASS。
- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成实际 diff 复核（逐文件纯搬动核验）与验证证据在案。Done condition 达成（2026-08-31）：diff 复核（4 新模块 + 2 拆分文件 + barrel/supersession import + 2 测试文件 + change 工件）；全量 0 fail；无 open finding。

## 1. Apply 前置检查

- [x] 1.1 `check-project-reqs --mode plan`、`check-semantic-closure --mode plan`、`check-verification-routing --mode plan`。Done condition 达成（2026-08-31）：三查 PASS。
- [x] 1.2 基线：全量 `npm test` 2906/2906 在案；`git status` 干净。Done condition 达成（2026-08-31）：2906/2906 基线在案。

## 2. T1 不变量测试（零生产改动）

- [x] 2.1 （2026-08-31）两文件落地：unit S3-S12 十场景 + integration S1/S2/S8 三场景（Atomics.wait 同步阻塞 + SIGKILL）。deviation 记录：①S1 注入点实测为 afterMutation（afterQueueSave 在 ledger append 之后，窗口语义与 design 相反），幂等重放即恢复路径（retry duplicate=true）；②S12 拒绝记录本身是 committed 事务（非零 journal）；③S8 改为"先删 ledger 行再 recovery"的 fault+clean 双段。Done condition 达成：13/13 ×3 稳定、生产零 diff。

## 3. T2 提取 snapshot 模块

- [x] 3.1 按 design §M Module A 提取 `work-unit-submit-snapshot.mjs`（14 函数 + ⭐4 共享查询同迁；函数名定位非行号）；submit.mjs import 之；**不经 barrel 再导出**。Done condition 达成（2026-08-31）：codemod 搬动 + export 前缀；snapshot 315 行；submit 2439→~975。

## 4. T3 提取 late-retry 模块

- [x] 4.1 按 Module B 提取 `work-unit-submit-late-retry.mjs`；`work-unit-core.mjs` barrel 改从新模块导入 lateSubmitWorkUnit（不得由 submit re-export）；late-retry 从残余 submit import 共享 helper。Done condition 达成（2026-08-31）：late-retry 640 行；barrel 按新模块分块再导出。

## 5. T4 提取 declaration-recovery 模块

- [x] 5.1 按 Module C 提取 `work-unit-submit-declaration-recovery.mjs`；barrel + `work-unit-supersession.mjs` import 同步。Done condition 达成（2026-08-31）：declaration-recovery 494 行；S8/S11 绿。

## 6. T5 transaction 三层拆分

- [x] 6.1 按 design §T5 拆 `work-unit-transaction-primitives.mjs`/`work-unit-transaction-projection.mjs`/主文件（compat re-exports 保持 work-unit-index/work-unit-core/timeout-preflight 导入面不变）；`sha256Bytes` 并入 utils；`transactionRoot` 统一至 index owner。Done condition 达成（2026-08-31）：primitives 200/projection ~330/主 425；导入面不变；deviation：sha256Bytes 与 transactionRoot 未并入 utils/index（等价私有实现，避免范围膨胀，已登记）。

## 7. 回归与收尾

- [x] 7.1 全量 `npm test`。Done condition 达成（2026-08-31）：全量 0 fail（2906+13 不变量用例）。
- [x] 7.2 `check-project-reqs --mode archive` 与 `check-project-specs` PASS。Done condition 达成（2026-08-31）：exit 0。
- [x] 7.3 归档转场与提交：本勾选表示 §1–§6 全部就绪；勾选后立即执行 finalizer 与 git commit（引擎切缝 + 不变量测试 + change 工件一个提交）；快照 Post-C4 追加至 plan §10。
