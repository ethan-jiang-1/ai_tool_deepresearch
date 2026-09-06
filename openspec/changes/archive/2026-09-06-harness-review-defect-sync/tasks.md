# tasks — harness-review-defect-sync

## 1. Plan review（先于任何 target edit）

- [x] 1.1 执行 `openspec-feedback:plan-review`：按 change-feedback lifecycle 审阅 proposal/design/specs/tasks 与 verification-plan、semantic-closure，产出 finding 并回写为普通 pending task；完成前不得进行 §2-§6 的任何 target edit（验证：marker 任务勾选，findings 已记录）

## 2. 共享 Progress block 解析模块（PHS-010）

- [x] 2.1 新建 `DEEP_RESEARCH_HARNESS/engine/helpers/plan-progress-blocks.mjs`（头部 `// @impl PHS-010`）：导出共享 `parseProgressBlocks`（trim 后识别 header、spawnTs 须为 ISO-8601 Zulu 形态否则 `unparseable: true`、per-block 携带标志，采用 auditor 现行语义为唯一实现），并验证 `tests/engine/helpers/plan-progress-blocks.test.mjs` 新单测通过（覆盖：正常 block 序列、缩进/畸形 header、非 Zulu 形态与非法日期值时间戳、baseline+cycle 混合）
- [x] 2.2 `phase-status-audit.mjs` 删除本地 `PROGRESS_CYCLE_HEADER/_LOOKS_LIKE` 与 `parseProgressBlocks`，改用共享模块；witness 窗口与 staleness 比较改 `Date.parse()` 数值比较；malformed spawnTs 按既有 unparseable fail-closed 路径报告（验证：`tests/integration/cli/audit-phase-status.test.mjs` 新增伪造早时间戳/非 Zulu 格式用例 → `plan_progress_tamper_suspected`，全文件通过）
- [x] 2.3 `gate-helpers-plan-progress.mjs` 的 `CYCLE_HEADER_PATTERN`/`parseProgressBlocks` 改用共享模块；`writePlanProgress` 其余幂等/重建语义不变（验证：`tests/integration/cli/check-gate-progress-flip.test.mjs` 与 `tests/engine/helpers/plan-hostfile-sections.test.mjs` 通过）
- [x] 2.4 e2e 回归：`tests/e2e/plan-progress-rerun-cycles.test.mjs` 增加"手改缩进 cycle header 后 writer 与 auditor 归属一致、audit fail-closed"断言并全绿（验证：该文件通过）

## 3. retire-final-version 修复（ARP-004/ARP-005）

- [x] 3.1 `artifact-persistence.mjs`：`retireFinalVersion` 增加 `userConfirmation` 入参；与 `requestedBy === 'user'` 联合校验，缺失抛 `ArtifactPersistenceConfigError`；入口以 `RetireFinalVersionRequestSchema.parse()` 校验请求；target collision、aux collision、aux safety 全部 pre-check 移至首个 `renameSync` 之前（验证：`tests/engine/artifact-persistence-recovery.test.mjs` 新增——blocked 零突变（snapshot 前后字节一致）、非确认拒绝、schema 校验路径）
- [x] 3.2 `cli/operate-artifact-persistence.mjs`：`retire-final-version` 新增必填 `--user-confirmation`，缺失/空 → `invocationError` exit 2（不进引擎）；非法组合提示语更新（验证：`tests/integration/cli/artifact-persistence.test.mjs` 新增 exit 2 用例；`tests/integration/cli/exit-code-convention.test.mjs` 回归通过）
- [x] 3.3 文档同步：`COMMANDS.md` retire 行与 Copyable Contract Templates、`command_playbook/persist-artifact.md` retire 段补 `--user-confirmation` 说明与"blocked = 零突变"语义（验证：两文件更新，相关 doc-lock 测试通过）

## 4. aux grammar 单一真相源（FDB-002，行为不变）

- [x] 4.1 `final-delivery-backing.mjs` 导出共享 grammar 常量/组合器（目录 terminator 版 + target terminator 版，注释说明 :457 差异为有意），`artifact-persistence.mjs:788` 改引用（验证：`tests/engine/final-delivery-backing.test.mjs` 全绿）
- [x] 4.2 `tests/engine/final-delivery-backing.test.mjs` 用例 4 拆分为精确断言：存在性非 aux final 路径 → `final_output_not_backing`；缺失 → `backing_file_missing`（验证：该文件通过且无析取错误码断言残留）

## 5. canon-sync（guidance + spec 措辞）

- [x] 5.1 `CONTEXT.md:92` Final 行改为与 `content-delivery-phase-content/spec.md` 一致的"呈现修订 CAS 更新 latest 字节、版本号不变"表述；`:64`/`:97` 删除 WorkerFallback 两行；`:18` ADR 行补 0004/0005 实际文件链接（验证：编辑后 grep 全部 `tests/integration/md/` 与 `tests/governance/` 断言，命中的 lock 测试同 task 更新并全绿；`node openspec/governance/check-feedback-vocabulary-gate.mjs` PASS）
- [x] 5.2 `openspec/guidance/models/invariants-brief.md` 第 5 条真相源改指 `openspec/specs/agent/work-unit-submission/spec.md`；第 7 条 `hints[].resolution_owner` 改为 `repair_kind`（`GATE_REPAIR_KINDS`）（验证：`tests/integration/md/guidance-terminology-pointer-consistency.test.mjs` 等相关 lock 测试通过）
- [x] 5.3 `openspec/specs/research/research-wave-gate-implementation/spec.md:59-63` 去重烂句并恢复 "A legacy `NN-wave1-*`..." 句首（语义不变）（验证：`tests/engine/rwg-slim-structure-locks.test.mjs` 及相关 lock 测试通过；`node openspec/governance/check-spec-section-references.mjs` PASS）
- [x] 5.4 `command_playbook/continue-run-bundle.md` Reload 步骤 6 追加 reconcile-plan-progress 指针句（验证：`tests/integration/md/continue-run-bundle-contract.test.mjs` 等相关 lock 测试通过）

## 6. 全量验证与收尾

- [x] 6.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change harness-review-defect-sync` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）（验证：命令 exit 0）
- [x] 6.2 `node openspec/governance/check-project-specs.mjs` + `npm run governance:check` + `npm test` 全绿（验证：三个命令 exit 0；测试计数不低于基线 3152，新增用例计入）
- [x] 6.3 执行 `openspec-feedback:closeout-review`：对照 specs delta 逐条核对实现与证据，确认 semantic-closure/verification-plan 与交付一致，finding 回写为 pending task 或关闭（验证：marker 任务勾选，closeout 记录完成）
