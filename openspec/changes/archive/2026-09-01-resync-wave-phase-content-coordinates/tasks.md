# Tasks: 2026-09-01-resync-wave-phase-content-coordinates

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 按 `openspec/operations/change-feedback-loop.md` 对本 change 的 proposal/design/delta 做一次 plan review（在 2.x 任何 target edit 之前）；每个 actionable finding 登记为普通未完成 task。完成判据：review 执行且无未处置 finding。

## 2. 主 spec 整块替换（research/research-wave-phase-content）

- [x] 2.1 整块替换 requirement 块 "Wave2 rerun full re-synthesis on topic addition"（现 L432–479）：用 delta 对应块整体替换，替换前重核边界。验证：主 spec 该块与 delta 块 `diff` 为空。
- [x] 2.2 整块替换 requirement 块 "Rerun action:add SHALL include full cache trail"（现 L481–566）：同上。验证：主 spec 该块与 delta 块 `diff` 为空。

## 3. 回归锁与既有锁定面

- [x] 3.1 创建 `tests/engine/rwp-coordinate-resync-text-locks.test.mjs`（头部 `// @impl RWP-014` 等，覆盖两块涉 及的 requirement）：断言（a）主 spec 无死段名 `Rerun-Aware Behavior`；（b）无 changelog 语态 `SHALL add a §3.0`；（c）修正后坐标 `§3.4（Seed Projection Update）`、`§3.2 Execution Loop` 存在；（d）wave2 documentation-token 语义句存在；（e）phase 节点零改动（`workflows/nodes/phases/phase-wave*.md` 在 git 工作树中无 diff）。验证：`node --test tests/engine/rwp-coordinate-resync-text-locks.test.mjs` 全绿。
- [x] 3.2 复核既有锁定面：`node scripts/list-doc-locks.mjs openspec/specs/research/research-wave-phase-content/spec.md` 列出的全部测试逐个运行通过；因文本修正失配的断言同 change 更新并注明。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。失败先孤立复跑定性（tests/README triage 规则）。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 归档前置 closeout review，确认 delta/main 整块一致、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-resync-wave-phase-content-coordinates` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-resync-wave-phase-content-coordinates`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交（消息引用 change 名）。
