# Tasks: 提升 rerun 上限并修正 rerun 剔除指引

## 0. Feedback 计划评审

- [x] 0.1 `openspec-feedback:plan-review` 评审 REI-003 计划（proposal / design / delta spec / tasks / verification-plan）：whole-change coherence + 风险（definition_sha256 在飞 post-final recovery 迁移、MODIFIED scenario 标题的 tooling 约束、verification claim 引用准确性）。由 polish Pass 1 / Pass 2 完成并在首次 target edit 前闭环；无未决 actionable finding。

## 1. Rerun 边界值提升

- [x] 1.1 实现 REI-003：改 `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json` 的 `rerun_count_valid` 规则 `value: 11 → 33`，并把该规则 `failure_message` 里的「maximum of 10 rerun cycles」改为「maximum of 32 rerun cycles」（保留其余文案）。Done when：definition 内 `value: 33` 且 `failure_message` 含 "maximum of 32"，且全仓无第二处手写 10/11 的 rerun 上限比较。
- [x] 1.2 确认 REI-003 既有 boundary 回归在 `value: 33` 后仍 PASS：`tests/integration/cli/check-gate-rerun-ready.test.mjs` 读 production definition 得 `EXCLUSIVE_LIMIT` 并证 `<limit` 通过、`==limit` 与 `>limit` 失败；`tests/engine/helpers/rerun-availability.test.mjs` 证 evaluator 形状不变。Done when：两测试 PASS 且未硬编码数字。
- [x] 1.3 确认 `tests/integration/md/iterative-interaction-contract.test.mjs` 仍断言 brief 不硬编码 `rerun_count`/`less_than`/`exclusiveLimit` 比较。Done when：该测试 PASS。

## 2. phase-rerun.md 剔除指引修正（B1-a）

- [x] 2.1 改 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md` Stage 2 表，把行 `| 用户要求 remove/rename/renumber/path move | unsupported C3B | 保留现状并报告 missing capability；禁止直接多文件编辑 |` 替换为 `| 用户要求 remove/rename/renumber/path move | \`mutate_layout\`（rename/reorder/renumber/safe-remove）+ 新 bundle（已研究 topic 剔除） | rename/reorder/renumber 走完整 \`mutate_layout\` target；safe-remove 仅限无依赖、无历史 topic；已研究 topic 的剔除 = 起新 bundle（不原地 retire）；path move 不支持（历史路径原位）；禁止直接多文件编辑 |`。Done when：Stage 2 行与 Stage 3、`command_playbook/operate-topic-state.md`、accepted spec 无矛盾。
- [x] 2.2 扩 `tests/integration/md/topic-rewrite-fixtures-contract.test.mjs`：在「names only canonical topic-state paths for current rerun」断言中加 `assert.doesNotMatch(rerun, /unsupported C3B/)` 与 `assert.match(rerun, /safe-remove|新 bundle/)`。Done when：该测试 PASS，锁定 Stage 2 不再出现 `unsupported C3B`。

## 3. 收尾验证

- [x] 3.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change raise-rerun-limit-and-fix-removal-guidance`，PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 3.2 运行 `node openspec/governance/check-project-specs.mjs`，PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
- [x] 3.3 运行受影响测试 + 全量 `npm test`，PASS。
- [x] 3.4 `openspec-feedback:closeout-review` 归档前评审实际 diff（definition `value: 11→33` + failure_message、phase-rerun.md Stage 2 行、MD 契约测试扩展、REI-003 main spec 同步）与验证证据（37/37 focused + 2851/2851 full + 治理检查全绿）；semantic-closure `not_applicable` 理由对实际 surface 仍成立；无未决 finding。
