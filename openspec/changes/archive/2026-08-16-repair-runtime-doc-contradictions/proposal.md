# Proposal: repair-runtime-doc-contradictions

## Why

评审发现 DEEP_RESEARCH_HARNESS 运行时文档面存在一组"同一概念多套表述"的矛盾：一处退出码文档与已接受契约和代码直接矛盾（`cli/README.md:78` 陈旧漂移注记），gate 命名 kebab/snake 双拼写无对照表，rerun/readiness 生命周期顺序三处不一致，bootstrap status 例外只在一处括号里说明，`repair_kind` 第三套词汇未入 glossary，以及若干小口径的键名/计数/语法歧义。这些矛盾都发生在 coding agent 每次运行都会读到的控制面上，直接违反本项目对自身的"无二义、低负担"要求；且大部分已与 accepted spec 的既有 requirement 相抵触（是文档落后于 spec，不是新行为）。

## What Changes

- 删除 `DEEP_RESEARCH_HARNESS/cli/README.md:78` 的陈旧漂移注记（`validate-workflow-package.mjs` 实际已实现 `0/1/2` 三态退出码，该注记声称只有 `0/1`）。
- 在 `COMMANDS.md` 与 `cli/README.md` 写明 gate 命名派生规则：`advance-status --to` 接受 `CurrentGate` 的 snake_case 值，其与 `workflows/manifest.json` gate key 的对应关系是机械的 `-` ↔ `_` 替换（单一派生规则，不新增手写对照表以免再造漂移源）；两个单一真相源分别是 manifest（kebab key、生命周期顺序）与 `schema/enums.mjs`（snake enum）。
- 将 `rb_plan.md.tmpl` 的 `## Progress` 勾选顺序改为与 `workflows/manifest.json` 一致（`readiness-passed` 在 `rerun-ready` 前），并加注释标明两者是 HITL2 的两个互斥出口；`schema/enums.mjs` 的 `CurrentGate` 顺序同步对齐并加注释"值序 = manifest 生命周期序；`none` 是终态哨兵，不属于任何 gate"。
- 在 `rb_templates/rb_status.json.tmpl` 加注释说明 instantiation/HITL1 bootstrap status 例外（初始 `current_gate: setup_ready`、`state: not_started` 是 WNC-010 声明过的兼容例外），并在 `DEEP_RESEARCH_HARNESS/README.md` 执行模式段与 `BUNDLE_MAP.md.tmpl` 交叉引用。
- 在根 `CONTEXT.md` 补记 `repair_kind` 的第三套词汇（`bundle/file-observability` 面：`materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`），明确三套同名不同枚举、以各自 owner surface 为准。
- 将 `RUN.md` work-unit 恢复决策表第一列名由"disposition 反馈面"改为更中性的"适用情形/触发条件"（表实际以 `repair_kind` 为键）。
- 在 `command_playbook/instantiate-run-bundle.md`、`workflows/nodes/phases/phase-instantiation.md` 与 `BUNDLE_MAP.md.tmpl` 注明 `rb_output_declarations.jsonl` 是第 6 个 control file、由 Engine 在首次 `submit` 时惰性创建（新 bundle 缺失不构成漂移）。
- 在 `command_playbook/post-final-recovery.md` 加半句说明 `check-reentry --at` 同时接受 gate enum（如 `hitl2_recorded`）与 phase（如 `phase-rerun`）。
- 在 `DEEP_RESEARCH_HARNESS/README.md` 立一条语言约定：精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文；同一控制面内不混用两套主语言。
- 扩展 `tests/integration/cli/transition-integrity.test.mjs`：既有 manifest↔enum 1:1 覆盖断言保持不变，新增两条顺序断言（`CurrentGate` 声明序 == manifest 生命周期序；`rb_plan.md.tmpl` Progress 勾选序 == manifest 生命周期序）。

**不改行为**：不改变任何 CLI 退出码、gate 规则、schema 字段、状态转移、receipt 或 trace 契约；`enums.mjs` 仅调整枚举值排列顺序（行为中立，Zod 校验语义不变），全部现有回归必须保持绿色。

**净简化**：本 change 不新增任何具名 state / projection / 概念 / 命令 / 状态字段，反而收敛三处既有同义多形（gate 命名派生规则单一化、生命周期顺序单一化、control-file 计数边界单一化），以一条既有测试的扩展断言替代 Agent 的永久心算转换。direct Source of Record 保持为 manifest（kebab key + 生命周期序）与 `schema/enums.mjs`（snake enum）；文档只放派生规则指针，不再造第二份手写映射。

**责任边界**：用户决策、Agent 执行、Engine 裁决的责任分配不变；本 change 不创建任何新 permission、capability 或 authority 面。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `engine/schema-core`: SCO-001「Six domain enums defined as Zod schemas」——新增规范化声明：`CurrentGate` 枚举值是 manifest gate key 的 snake_case 渲染、按 manifest 生命周期顺序排列，`none` 是终态哨兵值（不属于任何 gate）；manifest ↔ enum 对应关系与顺序必须保持回归锁定（既有 `tests/integration/cli/transition-integrity.test.mjs` 已锁 1:1 覆盖，本次补锁顺序）。
- `bundle/cmd-bundle-instantiation`: CMI-001「Command playbook guides agent to produce a complete bundle」——明确实例化时刻的内容是 `BUNDLE_MAP.md` + 五个 `rb_*` control files，并规定 playbook SHALL 说明第 6 个 ledger 文件 `rb_output_declarations.jsonl` 由 Engine 在首次成功 `submit` 时惰性创建、不属于实例化时点内容、新 bundle 缺失不构成漂移。

## Impact

- 文档面：`DEEP_RESEARCH_HARNESS/cli/README.md`、`COMMANDS.md`、`RUN.md`、`README.md`、`command_playbook/instantiate-run-bundle.md`、`command_playbook/post-final-recovery.md`、`workflows/nodes/phases/phase-instantiation.md`、`rb_templates/rb_plan.md.tmpl`、`rb_templates/rb_status.json.tmpl`、`rb_templates/BUNDLE_MAP.md.tmpl`、根 `CONTEXT.md`。
- 代码面：`DEEP_RESEARCH_HARNESS/schema/enums.mjs`（仅 `CurrentGate` 枚举值顺序，行为中立，Zod 校验语义不变）。
- 测试面：扩展 `tests/integration/cli/transition-integrity.test.mjs`（补 enum 顺序 == manifest 生命周期顺序断言 + `rb_plan.md.tmpl` Progress 顺序断言）；既有回归必须保持绿色（`command-contract-docs`、`exit-code-convention`、`agent-context-routing-contract`、`work-unit-attempt-recovery-guidance`、`post-final-recovery-contract`、`harness-entry-doc-consistency`、`transition-integrity`、`instantiate-run-bundle`、`validate-workflow-package` 等）。
- 无新依赖、无新 CLI、无运行时行为变化。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/cli-exit-code-conventions` | CLE-003 Scenario「Reconcile-workflow-package exit two is documented as current behavior」(spec.md:140-144)：docs SHALL state current tri-state `2` and SHALL NOT present it as pending drift | Verify-only | F1 删除陈旧注记正是该 requirement 已要求的对齐，spec 无需改 |
| `engine/cli-phase-transition` | CPT-001（advance-status 基于 chain.json 推进 current_gate/next_gate）；`advance-status.mjs:7` 头注「--to 是 snake_case gate enum value」、`:38-44` 纯 `-`↔`_` 替换实现 | Verify-only | F2 的派生规则是文档化的既有实现事实；对应关系已有 transition-integrity 锁 |
| `engine/schema-core` | SCO-001「Six domain enums defined as Zod schemas」；`schema/enums.mjs` CurrentGate 值序与 manifest 不一致（rerun_ready 在 readiness_passed 前） | Modify | 把「枚举序 == manifest 生命周期序 + `none` 哨兵」写成规范化声明并锁定，三面（manifest/enums/plan 模板）收敛到单一序 |
| `research/plan-hostfile-sections` | PHS-004「Engine writes Progress on gate pass」(spec.md:142-148)：Progress SHALL contain all workflow gates **in lifecycle order** | Verify-only | 模板 Progress 顺序修复是对既有 requirement 的对齐，annotation 属呈现 |
| `workflow/workflow-node-contract` | WNC-010：instantiation/HITL1 bootstrap status shape 是 compatibility exception，SHALL NOT be silently rewritten | Verify-only | F4 给模板/README 加注释与交叉引用，exception 本身已由 spec 声明 |
| `bundle/run-entry` | RUE-005「Entry trigger hands control to Agent-run Harness execution」：不 pin 决策表列名 | Verify-only | F6 表列名非 RUE 管面 |
| `engine/check-inspect-feedback` | CIF（spec.md 162-224「Attempt recovery feedback SHALL expose one ownership-safe legal action」+ 334-354「Engine-owned recovery vocabulary export locks the decision table」）：锁行集、未规定表头措辞 | Verify-only | F6 改列名为呈现措辞；表行集已由 decision-table 测试锁定 |
| `agent/delegated-work-units` | DEW（spec.md:1995 附近）：统一 `attempt_disposition` + `next` 形状由 CHI-004 定义；表第一列实际以 `repair_kind` 为键 | Verify-only | 列名改中性措辞不改契约；spec 无列名要求 |
| `bundle/cmd-bundle-instantiation` | CMI-001：playbook SHALL instruct 创建含「five `rb_*` control files」的 bundle | Modify | F7 的「5 vs 6」矛盾源头是 spec 计数本身不含第 6 个 ledger；需 spec 澄清惰性创建边界 |
| `bundle/bundle-map` | BUM-002：Runtime Control Map SHALL 含 `rb_output_declarations.jsonl` | Verify-only | 地图已合规；只补「首次 submit 惰性创建」注释 |
| `agent/agent-context-routing` | ACR-001 (spec.md:42-49)：CONTEXT.md SHALL include `hints[]` / `repair_kind` 反馈词汇并以 owner 为界 | Verify-only | F5 补记第三套词汇是对该 requirement 的补齐，spec 不枚举 face 清单 |
| `research/post-final-recovery` | POF-001：playbook 提供 Agent copyable 完整链 | Verify-only | F8 补半句 `--at` 双语法说明，链完整性不变 |
| `engine/runtime-reentry-debuggability` | RRD (spec.md:51-57)：`--at` 目标词表 closed，normalize 为 kind gate / kind phase；spec.md:104 明确 `--at phase-rerun` 语义 | Verify-only | 双语法已由 spec 钉死；playbook 只是复述指针 |
| `agent/agent-command-surface` | 无文档主语言 requirement | Excluded | F9 语言约定是 guidance 呈现约定，无 spec owner，design 记录即可 |
| `governance/guidance-constitution` | 无文档主语言 requirement | Excluded | 同上；最接近的 HIU-002「Chinese-first interaction convention」只覆盖 HITL 交互 |
