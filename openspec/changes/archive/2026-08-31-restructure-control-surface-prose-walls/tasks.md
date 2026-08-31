## 1. Plan review

- [x] 1.1 `openspec-feedback:plan-review` — 完成 plan review：对照 proposal/design 与 `_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §2，确认七段 scope、skip_specs 决策与行数预算披露口径无误。Done condition: 本 task 勾选，结论留痕。（✓ 2026-08-31 review PASS：scope=七段首批、次级段按 plan 明示延后；预算张力已在 proposal/design 披露）

## 2. Owner 归属验证（降级前置）

- [x] 2.1 按 design D4 分解逐条 grep owner spec，记录每条规则的「保留 / 降级」结论（验证不过即保留）。Done condition: 七段全部规则有留痕结论，无未验证的降级。（✓ 全部降级经 grep 验证：hitl1×25→hitl-ux；acknowledgement×7、用户消息×5→silent-wave-execution；ReopenResearchPass×128→post-final-recovery；publish-final-report→artifact-persistence-recovery+agent-command-surface；late-submit×33、幂等×10→delegated-work-units；complete×41→agentic-queue；bundle root×35→workflow-directory-contract；attempt_disposition×2、timeout-preflight×4→check-inspect-feedback；DPT_CONTINUATION_CUE×2、do_not_initiate→cli-phase-transition；entry selection×20→run-entry；human-directed×5→agent-command-surface；REPAIR_KIND_CLI_VERB 无 spec 承载→owner 标为 executable contract 本体）

## 3. RUN.md 重构

- [x] 3.1 L34（HITL/静默/Final）重构为原子规则表，token 全保留。Done condition: 表格成形、原 backtick token 集合 ⊆ 新块、无语义增删。
- [x] 3.2 L36（delegated work-unit 路径）同上。Done condition 同上。
- [x] 3.3 L40（recovery 反馈形状）同上；保留段尾对下方 test-locked 决策表的引入句；L42–53 决策表零改动。Done condition 同上。
- [x] 3.4 L55（late-submit/preflight/锁定声明）同上。Done condition 同上。

## 4. COMMANDS.md 重构

- [x] 4.1 L17（受众契约六合一）重构为原子规则表，token 全保留。Done condition 同 3.1。
- [x] 4.2 L33（continuation cue 边界）同上。
- [x] 4.3 L11（ordinary authorized 执行边界）同上。

## 5. 机检与回归

- [x] 5.1 token 保留机检：脚本对比 HEAD 版本与工作树的七段 backtick token 集合 + 枚举形态 token，断言原 ⊆ 新；测量两文件行数差并记录。Done condition: 机检通过、行差数字留痕。
- [x] 5.2 `npm run governance:check` 全绿（content-drift / pointer-targets / gate-chain-prose 校验新指针与结构）；`node --test tests/engine/work-unit-recovery-decision-table.test.mjs` 与 `tests/governance/`、`tests/integration/governance/` 全绿且测试文件零改动。Done condition: 各命令退出码 0。
- [x] 5.3 全量 `npm test`。Done condition: 退出码 0、0 fail。

## 6. 归档前置

- [x] 6.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change restructure-control-surface-prose-walls`、`node openspec/governance/check-semantic-closure.mjs --change restructure-control-surface-prose-walls --mode assets`、`openspec validate restructure-control-surface-prose-walls --strict` 全部 PASS。Done condition: 三命令退出码 0。
- [x] 6.2 `openspec-feedback:closeout-review` — 对照 change-scoped diff 复核七段终稿、token 机检结果、行差披露、无 gate 枚举链混入；无未处理 finding。Done condition: 本 task 勾选，随后由 governed finalizer 完成归档。
