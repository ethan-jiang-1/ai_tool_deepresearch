# Tasks: hygiene-pointer-rewrite-and-registry-truth

- [x] 0.1 openspec-feedback:plan-review —— 首次 target edit 前完成 `/polish-openspec-change` 打磨。Done condition 达成（2026-08-31）：validate --strict 绿、三查 PASS；风险预检证实 deprecated ID 不计 orphan（check-project-reqs.mjs:414-416）。
- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成实际 diff 复核与验证证据在案。Done condition 达成（2026-08-31）：diff 复核（2 main spec + RRM/CTS/RWP header + registry + 锁测试 + change 工件；DEEP_RESEARCH_HARNESS/ 0 改动）；锁测试全绿；governance exit 0；npm test 2906/2906；reqs archive 0 orphan。

## 1. Apply 前置检查

- [x] 1.1 `check-project-reqs --mode plan`、`check-semantic-closure --mode plan`、`check-verification-routing --mode plan`。Done condition 达成（2026-08-31）：三查 PASS。
- [x] 1.2 `list-doc-locks.mjs` 于 RWP 与 gate-skeleton。Done condition 达成（2026-08-31）：basename 级通用锁，无红锁。

## 2. RWP 指针化（D4/D6/D9）

- [x] 2.1 按 delta 修改 main spec："Rerun action:add SHALL include full cache trail" 内 return-map 字段清单改 RRM 所有权指针 + no-projection 示例对齐 RRM 规范形。Done condition 达成（2026-08-31）：diff 复核通过。
- [x] 2.2 按 delta 修改 main spec："Work unit index record SHALL carry Engine-owned rerun_count" 与 "Wave2 finding SHALL carry created_in_rerun_count" 改 WPG-015/WTS-012 教学指针（全部 scenario 标题保留 + retention 注记）。Done condition 达成（2026-08-31）：diff 复核通过。

## 3. gate-skeleton 去重（D1）

- [x] 3.1 按 delta 修改 main spec：GSK-009 删除士气规则段，High-friction scenario 正文改 convention 归属（标题保留）。Done condition 达成（2026-08-31）：diff 复核通过。

## 4. registry 账本（C2 项 + D2）

- [x] 4.1 `req-registry.yaml`：新增 RRM-008 与 CTS-012（标题与 main heading 一致）；RWP-005/008 描述末尾追加 `[DEPRECATED]`；AGO-006 标题对齐 AGO 正文口径。Done condition 达成（2026-08-31）：678 registered / 59 retired / 0 orphan，PASS。
- [x] 4.2 RRM/CTS main spec header `> req:` 补 RRM-008/CTS-012；RWP header 移除 RWP-005/008。Done condition 达成（2026-08-31）：两查 PASS。

## 5. 回归锁与验证

- [x] 5.1 扩展 `tests/engine/residual-spec-drift-text-locks.test.mjs`：RWP 三块指针锚点（WPG-015/WTS-012/RRM 归属句 + retention 注记）与旧复述句消失；GSK-009 morale 禁令句消失且 convention 归属存在；registry 四条目断言；header 集合断言。Done condition 达成（2026-08-31）：全绿（10 tests）。
- [x] 5.2 `npm run governance:check`。Done condition 达成（2026-08-31）：exit 0。
- [x] 5.3 全量 `npm test`。Done condition 达成（2026-08-31）：2906/2906 exit 0。

## 6. 收尾硬性检查（归档前置）

- [x] 6.1 `check-project-reqs --mode archive` 与 `check-project-specs` PASS。Done condition 达成（2026-08-31）：exit 0。
- [x] 6.2 归档转场与提交：本勾选表示 §1–§5 全部就绪；勾选后立即执行 finalizer（唯一归档转场）与 git commit；快照 Post-C3 追加至 plan §10。
