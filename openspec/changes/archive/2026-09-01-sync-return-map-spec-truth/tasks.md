# Tasks: 2026-09-01-sync-return-map-spec-truth

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 按 `openspec/operations/change-feedback-loop.md` 对本 change 的 proposal/design/delta 做一次 plan review（在 2.x 任何 target edit 之前）；每个 actionable finding 必须登记为普通未完成 task（受影响 requirement、authoritative owner、最小修复、可观察 done condition），不得只留在 chat。完成判据：review 执行且无未处置 finding。

## 2. 主 spec 整块替换（research/research-return-map）

- [x] 2.1 整块替换 RRM-003 块 "Shared guidance SHALL teach the same return-map shape across waves"（现 L76–153）：用 `specs/research/research-return-map/spec.md` 中对应块整体替换，替换前重核块边界。验证：主 spec 该块与 delta 块 `diff` 为空。
- [x] 2.2 整块替换 RRM-006 块 "Return-map inspection SHALL filter backfill tokens by target wave"（现 L264–291，替换后边界以实际文件为准）。验证：主 spec 该块与 delta 块 `diff` 为空。
- [x] 2.3 整块替换 RRM-007 块 "Return-map inspection SHALL verify current-round projection identities"（现 L292–878）。验证：主 spec 该块与 delta 块 `diff` 为空。
- [x] 2.4 修正 `DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs` L1 导航注释：删除已 de-export 的 `inspectSeedTopicReturnMaps` 符号名，其余注释内容不动。验证：`grep -rn inspectSeedTopicReturnMaps DEEP_RESEARCH_HARNESS/ tests/` 0 命中。

## 3. 回归锁与既有锁定面

- [x] 3.1 创建 `tests/engine/rrm-spec-truth-sync-text-locks.test.mjs`（头部 `// @impl RRM-003`、`// @impl RRM-006`、`// @impl RRM-007`）：断言（a）主 spec 无伪函数名模式 `retired per-wave backfill token check` / `retired return-map inspection`；（b）主 spec 无退役规则现在时 SHALL 句式（`SHALL be retired`）；（c）`return-map.mjs` 导航注释中列出的每个符号均有真实 `export`；（d）token→wave 归属表与 per-wave skip 语义关键句仍存在。验证：`node --test tests/engine/rrm-spec-truth-sync-text-locks.test.mjs` 全绿。
- [x] 3.2 复核既有锁定面：`node scripts/list-doc-locks.mjs openspec/specs/research/research-return-map/spec.md` 列出的全部测试逐个运行通过；如某断言因本 change 的文本修正而失配，属预期修正，同 change 更新该断言并注明。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail（含 `residual-spec-drift-text-locks.test.mjs` 的 delta verbatim 同步断言）。失败先孤立复跑定性（tests/README triage 规则）。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 归档前置 closeout review（按 `openspec/operations/change-feedback-loop.md`），确认 delta/main 整块一致、无 chat-only finding。每个 actionable finding 登记为普通未完成 task。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-sync-return-map-spec-truth` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-sync-return-map-spec-truth`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交（消息引用 change 名）。
