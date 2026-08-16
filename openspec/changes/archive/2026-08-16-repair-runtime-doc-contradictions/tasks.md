# Tasks: repair-runtime-doc-contradictions

## 1. 代码面（唯一代码改动）

- [x] 1.1 `DEEP_RESEARCH_HARNESS/schema/enums.mjs`：将 `CurrentGate` 的 `readiness_passed` 移到 `rerun_ready` 之前（`none` 保持末位），并在枚举上方加注释「值序 = workflows/manifest.json 生命周期序；none 是终态哨兵，不属于任何 gate」。Done = 枚举声明顺序与 manifest gate 顺序一致（含 `none` 末位），`node --test tests/schema/enums.test.mjs` 通过。

## 2. 文档面修复（全部按 proposal.md 的 F1–F9）

- [x] 2.1 删除 `DEEP_RESEARCH_HARNESS/cli/README.md:78` 整条陈旧漂移注记（`Known doc/code drift: validate-workflow-package.mjs ...`）。Done = 文件中不再出现该注记；该命令的退出码只由 `COMMANDS.md` 三态条目表述。
- [x] 2.2 在 `COMMANDS.md` 的「Selected Operation Invocation Contract」段（`advance-status` 行附近）与 `cli/README.md` 的「Selected Public Operation Parsing」段（`advance-status` 行附近）写明 gate 命名派生规则：「`advance-status --to` 接受 `schema/enums.mjs` `CurrentGate` 的 snake_case 值；它与 `workflows/manifest.json` gate key 的对应是机械的 `-` ↔ `_` 替换；两个单一真相源是 manifest（kebab key、生命周期序）与 enums.mjs（snake enum），文档不另立手写对照表」。Done = 两处各含该规则一句话，指向 manifest 与 enums.mjs。
- [x] 2.3 `DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl`：`## Progress` 勾选顺序改为 `readiness-passed` 在 `rerun-ready` 之前（与 manifest 一致），并在该段加一行注释「readiness 与 rerun 是 HITL2 的两个互斥出口，不是先后顺序」。Done = 模板顺序与 manifest 一致且含互斥注释。
- [x] 2.4 bootstrap 例外可见化：`DEEP_RESEARCH_HARNESS/README.md`「执行模式」段加一条交叉引用（例外解释指向 `workflows/nodes/phases/phase-instantiation.md`）；`rb_templates/BUNDLE_MAP.md.tmpl` 的 gate-window 说明补同一例外注记。实现修正：`rb_status.json.tmpl` 是纯 JSON、不能携带注释（实例化后必须通过 JSON/Zod 校验），故原本计划的"模板顶部注释"改由上述两个 Markdown 表面承担；JSON 内容不变。Done = README 与 BUNDLE_MAP 模板均含该说明，rb_status.json.tmpl 校验不受影响。
- [x] 2.5 根 `CONTEXT.md`：在 `hints[]` / `repair_kind` 术语行补记第三套词汇——file-observability 面的 `repair_kind` 取值 `materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`，owner 为 `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs`，并强调三套 `repair_kind` 同名不同枚举、以各自 owner surface 为准。Done = CONTEXT.md 出现第三面与 owner 指针，仍是压缩定义。
- [x] 2.6 `DEEP_RESEARCH_HARNESS/RUN.md`：work-unit 恢复决策表第一列名由「disposition 反馈面」改为「适用情形/触发条件」。Done = 表头改名完成，行集与 `repair_kind` 键不变。
- [x] 2.7 `command_playbook/instantiate-run-bundle.md` 步骤 2 与 `workflows/nodes/phases/phase-instantiation.md` 的控制文件表述：保留「5 个 `rb_*` control files」字样（CMI-001 术语），补一句「第 6 个 ledger 文件 `rb_output_declarations.jsonl` 由 Engine 在首次成功 `submit` 时惰性创建，新 bundle 尚无此文件不构成漂移」；`rb_templates/BUNDLE_MAP.md.tmpl` 的 Runtime Control Map 同样补「首次 submit 后由 Engine 创建」注记。Done = 三处均含惰性创建说明且不改变「five」计数。
- [x] 2.8 `command_playbook/post-final-recovery.md`：在 `--at hitl2_recorded` 与 `--at phase-rerun` 两处命令附近补半句「`--at` 接受 gate enum（如 `hitl2_recorded`）或 phase（如 `phase-rerun`），两者语义见 check-reentry 契约」。Done = 半句存在。
- [x] 2.9 `DEEP_RESEARCH_HARNESS/README.md`：加一条语言约定「精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文；同一控制面内不混用两套主语言」。Done = 约定一句存在。

## 3. 测试锁定

- [x] 3.1 扩展 `tests/integration/cli/transition-integrity.test.mjs`：(a) `CurrentGate` 声明顺序 == manifest gate 顺序（`readiness_passed` 在 `rerun_ready` 前、`none` 末位）；(b) `rb_plan.md.tmpl` `## Progress` 勾选顺序 == manifest 顺序。Done = 两个新断言在未修复代码上会失败、修复后通过。
- [x] 3.2 跑受影响回归并全绿：`node --test tests/engine/command-contract-docs.test.mjs tests/integration/cli/exit-code-convention.test.mjs tests/integration/md/agent-context-routing-contract.test.mjs tests/integration/md/work-unit-attempt-recovery-guidance.test.mjs tests/integration/md/post-final-recovery-contract.test.mjs tests/integration/md/harness-entry-doc-consistency.test.mjs tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/integration/cli/transition-integrity.test.mjs tests/schema/enums.test.mjs`。Done = 全部通过。
- [x] 3.3 全量 `npm test`（2909 tests 基线）。Done = 0 fail。

## 4. 治理校验

- [x] 4.1 `openspec validate "repair-runtime-doc-contradictions" --strict` 通过。
- [x] 4.2 `node openspec/governance/check-content-drift.mjs`、`check-guidance-pointer-targets.mjs`、`check-surface-inventory.mjs`、`check-spec-req-ids.mjs`、`check-phase-node-structure.mjs`、`check-capability-taxonomy.mjs` 全部 clean。
- [x] 4.3 `git diff --check` 无输出（无空白错误）。
- [x] 4.4 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review：通读 proposal、2 份 delta spec、design、tasks、verification-plan、semantic-closure，做整体一致性复核（polish Pass 1：修 proposal 两处自相矛盾、Discovery 表头/行格式、F6 owner 归 CIF、D1 归因 WNC-001）与 risk-led 复核（Pass 2：CurrentGate 无按序消费方 + writePlanProgress 按名匹配；Pass 3：command-contract-docs 断言为 marker 存在性、与编辑无冲突；delta/main 逐字 diff 只含预期修改）。核对 semantic-closure（not_applicable：文档对齐 + 枚举序规范化，不改任何 runtime resolver/verdict consumer）。Done：plan-mode 治理检查全绿（capability-discovery / semantic-closure / verification-routing / project-reqs 0 orphan）+ 无未决 finding。
- [x] 4.5 `openspec-feedback:closeout-review` 归档前完成 closeout review：建立 change-scoped 边界（git status 全部属于本 change：12 个目标文件 + change 目录，无越界编辑）；复核实际 diff（文档 10 文件 + enums.mjs 顺序 + 测试 1 文件，零引擎行为变化）；semantic-closure（not_applicable）对实际变更面复核——对齐已接受契约 + 枚举声明序规范化，未触碰任何 runtime fact family 的 resolver/authority/verdict；选定验证证据：transition-integrity 23/23（含 2 条新顺序断言）、受影响回归 126/126、全量 npm test 2913/2913、六项 governance checker clean、openspec validate --strict 通过；delta/main 同步对比完成（SCO-001 / CMI-001 需求正文逐字一致）。Done：无未决 finding 且全部任务完成。
