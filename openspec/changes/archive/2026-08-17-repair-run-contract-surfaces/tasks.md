# Tasks: 2026-08-17-repair-run-contract-surfaces

## 1. Plan review（首个 target edit 之前）

- [x] 1.1 `openspec-feedback:plan-review`：apply 前的 plan review——通读 proposal、5 份 delta spec、design、
  tasks、verification-plan、semantic-closure，做整体一致性复核（每个 bug 卡 → proposal 项 → delta
  requirement → 设计决策 → task → verification claim 一一对应）与风险导向复核（WNC-010 spec 修改的
  既有测试连锁、SUD-008 行为锁的回归面、`_scripts/` non-authority 语义不扩张 gate/inspect）。核对
  semantic-closure（affected + catalog_addition `bundle.run-scoped-script-location`）与
  verification-routing（integration selected，其余 not_applicable）对实际变更面的覆盖。Done = 无未决
  finding；所有 finding 已转为普通任务并列出受影响 requirement、owner、最小修复与独立可观察 done
  condition。
  Review record（2026-08-17，polish 3 轮）：(1) SUD-008 属既有 live capability，`requirement-reservation.yaml`
  不适用 → 改 apply 直注册（1.2）；(2) semantic-closure `consumers` schema 强制 ≥1，列出创建者表面并
  在 design D8 注明「按设计无 verdict consumer」的分类细节；(3) CMI-001 要求 playbook 指示 `_scripts/`
  → 补任务 8.6；(4) WNC-010 修正须保留既有测试依赖的「兼容例外（WNC-010）」标签前缀 → 任务 3.1/3.2
  显式要求；(5) 回归测试 fixture 实测被 admission 拒绝（缺 canonical topic registry + producer_rule
  错）→ 任务 2.1 写入正确 fixture 配方。无未决 finding。
- [x] 1.2 在 `openspec/governance/req-registry.yaml` 的 `agent/subagent-dispatch` 组注册 SUD-008
  （既有 live capability 新增 ID 走 registry 直注册，不用 reservation 文件——`SUD` prefix 已 live）。
  Done = 注册后 `node openspec/governance/check-project-reqs.mjs --mode plan` 对 SUD-008 无
  unregistered 报错（归档前必须完成，`--mode archive` 依赖它）。
  Done（2026-08-17）：SUD-008 已注册；`check-project-reqs --mode plan` = "651 registered (57 retired,
  0 orphan)"，无 unregistered。

## 2. BUG-225：claim stdout JSON 回归锁 + result_hash 基准文档

- [x] 2.1 新增 `tests/integration/cli/work-unit-claim-stdout-json.test.mjs`（SUD-008）：disposable bundle
  + canonical topic registry（`rb_plan.md` topic_registry + `setStatusWindow`，复用
  `wave1-target-receipt-gate.test.mjs` 的 createBundle 模式）+ engine enqueue（wave0 item 用
  `producer_rule: source_intake_fan_in`；wave1 用 `kind: wave1_topic_deepening` +
  `producer_rule: topic_deepening` + `payload.assignment_mode: supplementary`）。wave0 delegated 与
  wave1 `phase_agent_fallback`（`--actor-outcome unavailable` + `--execution-actor
  phase_agent_fallback`）各 claim 一次，断言完整 stdout 可 `JSON.parse`、`claimed_work_ids[]` 非空、
  `prompt_refs[0]` 含 task_ref 坐标。Done = 两个场景 `JSON.parse` 通过且断言成立（fixture 细节以真实
  claim 成功为准，若 admission 拒绝则先修 fixture 再断言）。
- [x] 2.2 `workflows/nodes/shared/shared-schemas.md`：在 `_work_units/` 节附近补一句
  「`result_hash` 基准 = `sha256(stableStringify(result))`（`engine/work-unit-utils.mjs` 的
  `hashValue`），不是原始文件字节」。Done = 该句存在且指向 utils 文件。

## 3. BUG-226：WNC-010 bootstrap 例外边界澄清（文档 + 既有测试修正）

- [x] 3.1 `workflows/nodes/phases/phase-instantiation.md` §6（WNC-010）：保留标签前缀「兼容例外
  （WNC-010）：instantiation/HITL1 为 bootstrap status shape 例外」，把「本 phase 不执行
  `enter-phase`/`advance-status` handoff」改为「例外仅豁免 `advance-status` source-gate 同步；
  gate pass 后必须执行 `enter-phase --bundle <path> --node phases/phase-hitl1.md`（check.next）以写入
  `current_node`，之后才可进行 HITL1 topic-state apply」。Done = §6 含 enter-phase 指令与例外边界
  说明，标签前缀保留。
- [x] 3.2 `workflows/nodes/phases/phase-hitl1.md` §6（WNC-010）：同一标签前缀保留 + 措辞修正——
  gate pass 后读取 `check.next` 并 `enter-phase --node phases/phase-setup.md`；bootstrap 例外只豁免
  advance-status 同步。Done = §6 含 enter-phase 指令与例外边界说明，标签前缀保留。
- [x] 3.3 `tests/integration/md/harness-entry-doc-consistency.test.mjs`：把「must not gain an
  enter-phase instruction」断言改为锁修正后措辞——phase-instantiation/phase-hitl1 §6 含
  `enter-phase --node` 指令，且例外语句只豁免 advance-status（两文件断言一致）。Done = 新断言在旧
  文档上失败、在新文档上通过。

## 4. BUG-227：research-access envelope 示例修正 + 文档锁

- [x] 4.1 `workflows/nodes/shared/shared-hitl1-research-access-envelope.md`：「Available」示例
  `rfc_editor` 样本的 `outcome: not_attempted` 改为 `round_budget_not_attempted`（与同文件 :92-97
  叙述、`ProfileSchema`、`shared-profile.md` 一致）。Done = 示例中不再有单样本 `not_attempted`；
  whole-probe 示例保持不变。

## 5. BUG-228：Wave1 ref floor definition 文案修正 + 文档锁

- [x] 5.1 `schema/gate_definitions/gate-wave1-complete.definition.json`：
  `per_topic_ref_md_count_floor` 的 `failure_message` 改为声明「有效阈值来自
  `rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor`，且仅 Wave1 submitted backing
  的 canonical 候选计入该计数」。Done = 文案含 threshold_source 语义与计数口径；`threshold` 字段本身
  保持 1（fallback 语义，不改）。

## 6. BUG-229：setup phase 状态窗口修正 + 文档锁

- [x] 6.1 `workflows/nodes/phases/phase-setup.md` §3（PRP-003）：status 检查条目改为「gate 前窗口
  `current_gate: hitl1_recorded` / `next_gate: setup_ready`；运行 gate 前经 bootstrap 兼容窗口执行
  `advance-status --to setup_ready` 到达 gate 期望的 `setup_ready`/`seed_topics_ready`」；§5 补
  「`advance-status --to setup_ready` 是 setup gate 通过的前置（bootstrap `hitl1_to_setup` 窗口）」；
  §6 措辞说明 gate pass 后的 `enter-phase --node <check.next>` + covered `advance-status --to
  setup_ready` 是常规 handoff。Done = §3/§5/§6 与 gate definition 的 status 期望一致。
- [x] 6.2 Apply 回归 finding（transition-integrity.test.mjs:384）：既有测试断言「phase body 在 §6 前
  不得出现 `advance-status --to <source_gate>`」，对 setup 的 bootstrap 前置（`hitl1_to_setup` 窗口）
  是错误解读——gate definition 自身的 repair hint 就是该命令。修复 = 测试对 phase-setup.md 加
  WNC-010 carve-out（§6 前必须含该 bootstrap 命令），其余 covered phase 保持禁止；新增正向断言。
  Done = `transition-integrity.test.mjs` 23/23 绿，且断言语义与 PRP-003/WNC-010 delta 一致。

## 7. BUG-230：finding-index 必填键文档化 + 文档锁

- [x] 7.1 `workflows/nodes/shared/shared-schemas.md` finding-index 节：top-level keys 列表标注
  `ledger`/`synthesis` 为必填（含合法形状示例）；15 字段表 `origin_refs` 行补全——
  `cross_topic_resolution` 必填非空、`wave1_legacy_question` 必填来源、`cross_topic_emergent_question`
  可显式 `[]`。Done = 两处约束与 `wave-depth-contracts.mjs` checker 语义一致。

## 8. BUG-231：run-scoped 脚本落点（scaffold + 文档 + gitignore + 测试）

- [x] 8.1 `cli/instantiate-run-bundle.mjs`（CMI-001/WDC-004）：dirs 列表加 `_scripts`，templates 映射加
  `_scripts/README.md.tmpl`（non-authority 声明 + 目录说明，与 `_cache/README.md.tmpl` 同模式），
  控制台输出计数同步（9 → 10 data directories / 5 → 6 scaffolds）。Done = 新 bundle 含
  `_scripts/README.md`，既有 instantiate 测试全绿。
- [x] 8.2 `rb_templates/BUNDLE_MAP.md.tmpl`：目录外形与裸路径说明加入 `_scripts/`（run-scoped 脚本
  落点）。Done = 模板含 `_scripts/` 条目。
- [x] 8.3 `DEEP_RESEARCH_HARNESS/README.md`「运行时边界」：裸 runtime path 族与 Run Bundle 外形加
  `_scripts/`，注明「run-scoped 辅助脚本必须写入 current run bundle root `_scripts/`，不得写入 repo
  根或框架目录」。Done = 两处出现 `_scripts/` 且含落点规则。
- [x] 8.4 根 `AGENTS.md`（及 `CLAUDE.md` 同步）：Hard Rules 区加一条「run-scoped 辅助脚本必须写入
  current run bundle root `_scripts/`，禁止写入 repo 根或 `DEEP_RESEARCH_HARNESS/`」。Done = 两条
  规则存在（AGENTS/CLAUDE 逐字一致）。
- [x] 8.5 根 `.gitignore`：删除 `/.gen-*.mjs` 与 `/.wu*-*.mjs` 两条补丁模式及其尾部空行（治本后不再
  掩盖）。Done = 两行与尾部空行消失，`git diff --check` 对该文件无报错。
- [x] 8.6 `command_playbook/instantiate-run-bundle.md`：在 bundle 内容说明（第 22 行附近）点名
  `_scripts/`——「canonical scaffold directories 含 `_scripts/`（run-scoped 辅助脚本落点，
  non-authority 运行时区域，与 `_logs/`/`_cache/` 同类）」；CMI-001 要求 playbook 指示 Agent 将
  run-scoped 脚本写入 bundle `_scripts/` 而非 repo 根。Done = playbook 含 `_scripts/` 落点说明。

## 9. 文档锁测试（一个文件收口 BUG-227/228/229/230/225-hash/231-docs）

- [x] 9.1 新增 `tests/integration/md/run-contract-surfaces-doc-lock.test.mjs`：静态断言——
  (a) envelope Available 示例无单样本 `not_attempted`；(b) gate-wave1 definition
  `per_topic_ref_md_count_floor` failure_message 含 threshold_source 路径与「submitted backing」
  口径；(c) phase-setup.md §3 含 pre-gate 窗口与 bootstrap `advance-status --to setup_ready` 前置；
  (d) shared-schemas.md finding-index 节含 ledger/synthesis 必填与 resolution 非空 origin_refs 约束；
  (e) shared-schemas.md 含 result_hash 基准句；(f) README/根 AGENTS.md/BUNDLE_MAP.md.tmpl 含
  `_scripts/` 落点规则；(g) 根 `.gitignore` 不含 `/.gen-*.mjs` 与 `/.wu*-*.mjs` 补丁模式（负向锁，
  防掩盖模式回归）。Done = 全部断言在未修复文件上失败、修复后通过（先写测试红，再修文档绿）。

## 10. 回归验证

- [x] 10.1 跑新增/修改测试：`tests/integration/cli/work-unit-claim-stdout-json.test.mjs`、
  `tests/integration/cli/instantiate-run-bundle.test.mjs`、
  `tests/integration/md/run-contract-surfaces-doc-lock.test.mjs`、
  `tests/integration/md/harness-entry-doc-consistency.test.mjs` 全绿。Done = 0 fail。
- [x] 10.2 受影响回归子集：`tests/integration/cli/`、`tests/integration/md/`、`tests/engine/` 相关文件
  （含 gate-chain-consistency、setup-ready、hitl1-recorded、wave1-complete、operate-topic-state、
  command-contract-docs、validate-workflow-package 等）全绿。Done = 0 fail。
- [x] 10.3 全量 `npm test` 0 fail（当前基线全绿，变更后不得引入 fail）。Done = 0 fail。
- [x] 10.4 Apply 回归 finding（pre-existing，HEAD 即失败）：`check-phase-node-structure.mjs` 机器
  checker 把「bootstrap 节点禁止 enter-phase」当 WNC-010 例外执行——与 BUG-226 修正语义相反；
  已改为「§6 必须指示 enter-phase 加载 check.next、§6 禁止 advance-status source-gate 同步」
  （checker + `drift-guard-checkers.test.mjs` 全绿）。另有 pre-existing 测试缺陷：
  `check-all.test.mjs` 的 `--change` fixture 引用已归档 change
  （`cleanup-engine-surface-and-disambiguate-repair-kinds`，HEAD 上 3/3 失败，git worktree 验证）；
  已改为测试自建 disposable active change fixture（3/3 绿）。两个修复均为测试/governance
  表面，零框架代码改动。Done = 两个测试文件全绿。

## 11. 治理校验

- [x] 11.1 `openspec validate "2026-08-17-repair-run-contract-surfaces" --strict` 通过。
- [x] 11.2 `node openspec/governance/check-project-reqs.mjs --mode plan`（SUD-008 已按 1.2 注册，无
  unregistered/duplicate）与 `--mode archive --change 2026-08-17-repair-run-contract-surfaces` PASS
  （0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
  Done（2026-08-17）：plan 与 archive 两模式均 "651 registered (57 retired, 0 orphan)，0 violation"。
- [x] 11.3 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain /
  0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
- [x] 11.4 `node openspec/governance/check-semantic-closure.mjs --change 2026-08-17-repair-run-contract-surfaces --mode plan`
  通过；`check-content-drift.mjs`、`check-guidance-pointer-targets.mjs`、`check-surface-inventory.mjs`、
  `check-spec-req-ids.mjs`、`check-phase-node-structure.mjs`、`check-capability-taxonomy.mjs` 全部
  clean。
- [x] 11.5 `git diff --check` 无输出（无空白错误）。
- [x] 11.6 delta→main spec 同步（openspec-sync-specs）：WNC-010/PRP-003/CMI-001/WDC-004 的
  MODIFIED 需求正文与新增场景逐字并入 main specs；SUD-008 作为 ADDED 需求并入
  `agent/subagent-dispatch` main spec 并把 `> req:` 头补上 SUD-008。Done = `openspec validate
  --specs` 82/82 通过；`check-project-specs` 0 violations；`check-project-reqs --mode plan` 无
  unregistered/duplicate（SUD-008 在 delta + main 各声明一次）。

## 12. Closeout review（归档前置）

- [x] 12.1 `openspec-feedback:closeout-review`：归档前 closeout review——建立 change-scoped 边界
  （git status 全部属于本 change：24 个修改/新增文件 + change 目录 + 源材料（BUG 卡、plan 卡、
  backlog README 登记），无越界编辑）、复核实际 diff（definition JSON 文案 + instantiate scaffold +
  3 处 phase 文档 + envelope 示例 + shared-schemas + README/AGENTS/gitignore + governance checker
  修正 + main spec 同步，零引擎裁决逻辑改动）、semantic-closure 对实际变更面复核
  （`bundle.run-scoped-script-location` 已写入 global catalog，closure record `catalog_additions`
  清空、affected 坐标与 verification 选择一致；consumers 仅创建者表面，按设计无 verdict consumer）、
  选定验证证据（10.1 26/26、10.2 cli+md 1294/1294 + engine 1023/1023、10.3 全量 npm test
  2975/2975 0 fail、11.x governance 全部 clean、openspec validate --strict 通过、git diff --check
  clean）、delta/main 同步对比完成（5 份 delta 与 main spec 逐字一致，脚本比对 MATCH×5）。
  Done：无未决 finding 且全部任务完成。
  Review record（2026-08-17）：closeout 期间补做的两件事——(1) `check-phase-node-structure.mjs`
  机器 checker 的 WNC-010 解读修正（与 10.4 记录一致）；(2) `bundle.run-scoped-script-location`
  family 写入 global catalog（closure record 随之清空 catalog_additions，plan-mode closure 校验
  重新通过）。两处均已闭环，无未决 finding。

> 归档后处理（不在本 change 任务内，按 `_backlog/bugs/README.md`「修完一个 bug 的步骤」与
> `_backlog/plans/README.md`「完成一个 plan 的步骤」执行）：BUG-225..231 七张卡 `git mv` 到
> `_done/_fixed_bugs/`，更新 `_done/_fixed_bugs/README.md`（表格行 + Next available bug ID）、
> `_backlog/bugs/README.md`（删卡 + 计数）、`_backlog/_done/README.md`（计数）；plan 卡
> `bug-225-231-run-contract-surface-remediation` 移入 `_done/_closed_plans/` 并更新三个 README。
> 该处理在 change 归档与提交之后执行，与仓库既有 bug 收口惯例一致。
