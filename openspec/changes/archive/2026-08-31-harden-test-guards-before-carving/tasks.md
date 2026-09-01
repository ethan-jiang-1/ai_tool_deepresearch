# Tasks: harden-test-guards-before-carving

- [x] 0.1 openspec-feedback:plan-review —— 首次 target edit 前完成 `/polish-openspec-change` 打磨。Done condition 达成（2026-08-31）：validate --strict 绿；verification-routing 层归属修正（基线归 integration）；三查 PASS。
- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成实际 diff 复核与验证证据在案。Done condition 达成（2026-08-31）：diff 复核（2 测试文件修 + 2 测试新/改 + package.json + change 工件；生产零改动）；全量 ×2 绿；无 open finding。

## 1. 测试缺陷修复（AUD-3 S1/S2/S3）

- [x] 1.1 `tests/engine/residual-spec-drift-text-locks.test.mjs`：C2 residue 负向扫描的 3 文件清单改为 `readdirSync` glob 覆盖全部 `engine/work-unit-*.mjs`。Done condition 达成（2026-08-31）：glob 化 + 26 模块全扫 + 5 个 C4 模块显式 pin。
- [x] 1.2 `tests/integration/cli/rerun-added-topic-wave0.test.mjs`：normalOwners 清单补 5 个新 C4 模块路径。Done condition 达成（2026-08-31）：5 个新模块入清单。
- [x] 1.3 `tests/engine/work-unit-attempt-recovery.test.mjs`：结构锁 `indexOf` 三锚点（helperStart/helperEnd/release）加边界守卫，任一缺失即 assert.fail 带锚点名。Done condition 达成（2026-08-31）：三锚点守卫。

## 2. 并发竞态缓解（AUD-3 check-all）

- [x] 2.1 `package.json` test script 加 `--test-concurrency=4`。Done condition 达成（2026-08-31）：--test-concurrency=4 生效，全量 ×2 绿。
- [x] 2.2 `tests/engine/work-unit-transaction.test.mjs` `waitForFile` 3s→10s。Done condition 达成（2026-08-31）：10s。
- [x] 2.3 `evaluateWorkUnitSubmitIntegrity` 计数断言附精确计数注记（当前恰 3 处）。Done condition 达成（2026-08-31）：精确计数注记。

## 3. canonical-topic-state 行为基线

- [x] 3.1 新增 `tests/integration/canonical-topic-state-baseline.test.mjs`：①公开导出面逐名断言；②fixture bundle 上 apply/inspect/recover 公开 API smoke；③`evaluateCanonicalSeedBindings` 源文件锚点。Done condition 达成（2026-08-31）：4/4 绿（export 面 + 操作集 + smoke + 源锚点）。

## 4. 验证与收尾

- [x] 4.1 全量 `npm test`（含并发限流后新时长）。Done condition 达成（2026-08-31）：×2 全量 0 fail（217s/221s）。
- [x] 4.2 `check-project-reqs --mode archive` 与 `check-project-specs` PASS。Done condition 达成（2026-08-31）：exit 0。
- [x] 4.3 归档转场与提交：本勾选表示 §1–§3 全部就绪；勾选后立即执行 finalizer 与 git commit（测试守护 + 基线 + package.json + change 工件一个提交）；快照 Post-W1 追加至 plan §10。
