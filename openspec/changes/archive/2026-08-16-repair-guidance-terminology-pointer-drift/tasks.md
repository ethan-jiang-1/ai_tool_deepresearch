# Tasks: repair-guidance-terminology-pointer-drift

## 0. Feedback lifecycle reviews

- [x] 0.1 Plan review（openspec-feedback:plan-review）：按 `openspec/operations/change-feedback-loop.md` Apply Review 完成——whole-change coherence（artifact 同轮校验）+ semantic-closure.yaml（not_applicable，reason 对实际 surface 成立）+ F-08 的 RUE-004→RUE-005 更正按 front-matter 序数 + registry 双向核对。无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。

## 1. framework-runtime-boundary.md（F-01 / F-07 guidance 侧）

- [x] 1.1 "## Gate Boundary" 节引言改为 design D1 的五面命名，七行表 label 修正（definition JSON / CLI wrapper 改当前状态，engine 保留 target）。Done condition：节内含「Gate 一词有五面含义」与五面名称；`Gate CLI wrapper target` 措辞移除。
- [x] 1.2 "Current executable framework surfaces" 块的 cli/ 节改为 design D4 的核心工具 + gates 形状 + 目录指针注释。Done condition：块内含 `check-gate-*.mjs（当前 10 个）` 与「完整 CLI 清单以 `cli/` 目录为准」。
- [x] 1.3 "Workflow-foundation route map" 块的 cli/ 节删除过期四工具枚举、保留 gates 形状行；散文句 "target" → "live at ...（当前 10 个）"（design D4）。Done condition：route map 的 cli/ 节不再枚举四工具。

## 2. CONTEXT.md（F-01 指针 / F-06 / F-03 术语行）

- [x] 2.1 Gate 行改为 design D1 的指针表述（指向「Gate Boundary」节 + 五反馈面区分句）。Done condition：Gate 行含「Gate Boundary」与「五反馈面」。
- [x] 2.2 新增 C2/C3/C5 三行 glossary + 归纳性质注释（design D2）。Done condition：三行均含 owner spec 路径与「按 owner spec 用法归纳」注释。
- [x] 2.3 `hints[] / repair_kind` 行拆为 gate/phase 面与 work-unit 面两行（design D3），含「同名不同枚举」区分。Done condition：两行存在且 work-unit 行指向 RUN.md 决策表为 owner。

## 3. invariants-brief.md（F-08）

- [x] 3.1 #8 与 #15 的 run-entry 引用改为 requirement「Entry trigger hands control to Agent-run Harness execution」（registry: RUE-005）。Done condition：`（RUE-004）` 错引用移除，RUE-005 标题引用存在两处。
- [x] 3.2 #15 的 agent-command-surface 引用与 #13 的 RRD-008 引用改为标题 + registry ID 格式（design D5）。Done condition：ACS-001 / RRD-008 标题引用存在。
- [x] 3.3 维护规则节补引用格式约定一行。Done condition：格式约定说明存在。

## 4. 根 README / AGENTS / CLAUDE（F-09 / F-12）

- [x] 4.1 根 README "Rules In One Screen" 归档句改为 design D6 的 canonical 表述。Done condition：含 `_old_topics` 与 `_original_*` 关系表述。
- [x] 4.2 根 AGENTS.md Hard Rules 归档句改为 design D6 表述，并在 Deep Research Routing 段追加 design D7 的 current run bundle root 句。Done condition：含两处新表述。
- [x] 4.3 根 CLAUDE.md 同步 4.2。Done condition：`diff AGENTS.md CLAUDE.md` 仅头部差异。

## 5. 验证资产（verification-routing integration）

- [x] 5.1 新建 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`：静态断言 design D1-D7 各 canonical 短语存在、过期表述移除。Done condition：`node --test tests/integration/md/guidance-terminology-pointer-consistency.test.mjs` 绿。
- [x] 5.2 `node --test tests/integration/deep-research-harness-entry-contract.test.mjs` 绿（F-12 转绿）。Done condition：0 fail。
- [x] 5.3 `npm test` 全量：2897 个测试，2896 pass；唯一失败为 F-13 feedback-archive fixture（C3 修）；entry-contract、pair-sync guard、C2 guard 全绿。Done condition：与预期一致。
- [x] 5.4 `node openspec/governance/check-semantic-closure.mjs --change repair-guidance-terminology-pointer-drift --mode plan` PASS。
- [x] 5.5 `node openspec/governance/check-verification-routing.mjs --change repair-guidance-terminology-pointer-drift --mode assets` PASS。

## 6. 收尾检查（归档前硬性）

- [x] 6.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-guidance-terminology-pointer-drift` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 6.2 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

## 7. Closeout review（archive 前置）

- [x] 7.1 Closeout review（openspec-feedback:closeout-review）：按 `openspec/operations/change-feedback-loop.md` Closeout Review 完成——change-scoped diff 边界可建立（六个 guidance/根文件 + 一个测试）；semantic-closure.yaml（not_applicable）对实际 diff 重新核验仍成立；RUE-005 更正引用与 main spec 正文逐条核对；无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。
