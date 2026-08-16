# agent-guidance-conflict-drift-remediation

> 创建: 2026-08-16 | 状态: active（plan 就绪，待逐个 OpenSpec change propose）
> 上游 findings: [agent-guidance-conflict-drift-findings.md](./agent-guidance-conflict-drift-findings.md)（同目录；本文件已内联全部必要内容，**不读 findings 也可执行**）
> 修复载体: OpenSpec change 生命周期（`/opsx:propose` → `/opsx:explore` → `/opsx:apply` → `/opsx:archive`）
> 目标: 以**最少数量**的 bounded change 修完 F-01~F-11（推荐 3 个，备选 2/4）。

---

## 0. 给执行 Agent 的话（先读这节）

本 plan 的任务：修复本仓库中一批 **coding-agent 视角的 guidance 冲突/断点/漂移**问题。这些问题不是功能 bug，而是「文档与文档、文档与代码、文档与 spec 之间不一致，导致执行 Agent 会拿错信息」的缺陷。发现方式：以 coding-agent 身份按仓库 onboarding 基线完整走读（charter → CONTEXT.md → invariants-brief → control map → Harness entry 链），并对关键声明做了「文档声称 vs 现实」抽查（diff 配对文件、grep 代码枚举、核对 spec/registry/目录现实）。

### 必须遵守的仓库硬规则（执行前必读，摘要）

- **这是 agent engineering 项目，不是传统程序。** 任何实质任务前先读 `openspec/constitution/project-charter.md`，再读根 `CONTEXT.md`。核心分裂：LLM Agent 供语义判断，JavaScript Engine 供确定性裁决，Markdown 供流程呈现；三者不互替。
- **工程约束**：Node.js >=20，纯 JavaScript ESM（`.mjs`），**无 TypeScript、无 Python**；依赖仅 `zod`/`yaml`；测试用 `node:test` + `node:assert`。
- **OpenSpec 阶段门**：`DEEP_RESEARCH_HARNESS/` 在 `/opsx:apply` 之前**只读**。propose/explore 期间只写 `openspec/changes/`（specs、design、tasks）；目标代码（`DEEP_RESEARCH_HARNESS/`、`tests/`、`experiments_playbook/`）只在 apply 阶段按批准的任务清单修改。流程四阶段：propose → explore → apply → archive，禁止跳阶段。
- **配对文件**：根 `AGENTS.md`/`CLAUDE.md` 与 `DEEP_RESEARCH_HARNESS/AGENTS.md`/`CLAUDE.md` 各是一对，正文除工具名外逐字节一致（run-entry spec 的同步要求）。改动必须两份同步。
- **测试放置**：JS 测试只在 `tests/`（镜像框架目录结构），框架目录内不放测试。分类遵循 `openspec/specs/verification/verification-routing/spec.md`：unit/integration/deterministic_e2e 在 `tests/`，agent_flow_e2e 在 `experiments_playbook/`。
- **归档**：若 change 的 `tasks.md` 声明了 `openspec-feedback:*` marker，apply/archive 前必须读 `openspec/operations/` 对应指导；最终归档唯一入口是 `node openspec/governance/finalize-change-archive.mjs --change <name>`。
- **测试命令**：`npm test`（已 scope 到 `tests/**/*.test.mjs`，勿用裸 `node --test`）。
- **勿读路径**：`node_modules/`、`.env/`、`_backlog/`（本 plan 所在目录除外，执行本 plan 时需要它）、`_temp/`、`.exp-bundles/`、`dpt_rb_*/`（除非用户明确指定）。
- **canonical 纪律**：本项目大量使用「单一 canonical 表述 + 其余位置只放指针」模式（例如入口选择规则的唯一 canonical 在 `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` 的 "Entry Selection (canonical)" 节）。修改规则时遵守此纪律，不要制造新的重述。

### 本 plan 涉及的关键术语（执行时别拿错）

- **Gate 五面**：Gate 一词的五种含义（transition 表 / definition JSON / engine / CLI wrapper / runtime status）。注意「五面」一词在归档 change 里还被用来指**工作单元五反馈面**（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）——同词异义，见 F-01。
- **`repair_kind` 双枚举**：同名字段在两条反馈面上是两套不相交的 closed enum——(a) gate/phase 反馈面：`agent_action / engine_operation / user_decision / external_action / missing_contract`；(b) work-unit disposition 面：`wait / recover-transaction / recover-declaration / supersede / missing_contract / wait_for_delegated_candidate / author_exact_fallback_attempt / semantic_boundary / claim_successor / inspect_current_lineage_leaf`。见 F-03。
- **C5（伴随 C2/C3）**：Final 之后内容交付/recovery 链上的 checkpoint/event 代号，全仓库无展开定义，见 F-06。
- **current run bundle root**：本次操作显式选中的 `dpt_rb_*`/`dpt_disp_*` 目录，唯一 runtime truth 根；`framework_root`（`DEEP_RESEARCH_HARNESS/`）运行时只读；两层只读（运行时 scope vs 生命周期 scope）不同、不互替。
- **spec req-ID 与 registry**：spec 文件 front-matter 列 `> req: RUE-001, ...` 列表；正文 `### Requirement:` 标题**无 ID 标签**；ID→名称映射在 `openspec/governance/req-registry.yaml`；正文顺序与 ID 列表顺序对应（含 DEPRECATED 缺口）。见 F-08。
- **route-bound handoff witness**：gate pass 后必须先 `enter-phase --bundle <path> --node <check.next>` 再 `advance-status --to <source_gate_enum>`；`enter-phase`/`advance-status` 都不证明 target phase 完成。instantiation/HITL1 是 WNC-010 声明的 bootstrap 兼容例外（见 F-04）。

---

## 1. Findings 全量明细（F-01~F-11）

> 每项含：现象、证据坐标（2026-08-16 working tree）、agent 拿错风险、修复方向。开始修某一项前**重新验证坐标**（漂移可能已变化）。

### F-01【高】`Gate 五面` 断指针 + 一词异义

- **现象**：`CONTEXT.md:55` 说「Gate 一词有五面含义…完整五面表见 `openspec/guidance/models/framework-runtime-boundary.md`」。目标文件全文**无「五面」一词、无五面表**；gate 相关内容散落（definition JSON :135、CLI wrapper :215、runtime status :216），不构成「完整表」。
- **制造来源**：归档 change `openspec/changes/archive/2026-08-16-repair-current-guidance-contract-drift/tasks.md:17` 把「Gate 一行指向 framework-runtime-boundary.md 的五面表」标 `[x]`——只加了指针，没在目标补表。
- **一词异义**：`openspec/changes/archive/2026-08-16-make-work-unit-recovery-feedback-direct/tasks.md:13` 的「五面」指工作单元五反馈面，与 Gate 五面无关。
- **agent 拿错风险**：按 CONTEXT 去找表找不到，可能自造 Gate 五面模型或放弃术语对齐。
- **修复方向**：在 `framework-runtime-boundary.md` 补真正的五面表（transition 表 / definition JSON / engine / CLI wrapper / runtime status，各列 owner 坐标，可收编 :135/:215-216 已有散点），或改 CONTEXT 指向真实 owner；两种「五面」显式区分命名。

### F-02【高】name collision 三处文档三种说法

- **现象**：
  - `DEEP_RESEARCH_HARNESS/README.md:99-101`：「目标目录已存在，必须报错停止」「自动 collision suffix 是 workflow-foundation target，不是当前 production CLI 行为」。
  - `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-instantiation.md` §7(:71-81)/§8(:85)/§9(:93)：「Name collision → 自动生成 hex6 后缀并重试、不询问用户、记 silent_degradation」「禁止浮出水面」。
  - `DEEP_RESEARCH_HARNESS/command_playbook/start-research.md:34`：报错退出，Agent 派生 collision-safe 名称重试。
- **CLI 现状**：`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs:113-114` 目录已存在即报错退出（永不覆盖）。
- **spec 锁定（关键）**：`openspec/specs/research/pre-research-phase-content/spec.md:270` 已锁「collision → Agent 派生 `-<hex6>` 类后缀、记 trace/log、继续 instantiation、不询问用户」；`openspec/specs/bundle/cmd-bundle-instantiation/spec.md:17` 有同名 scenario。**即：spec 与 phase 文档一致，过期的只有 harness README。**
- **agent 拿错风险**：按 phase 文档静默自动后缀 vs 刚在 README 读到的「必须报错停止」矛盾；或按 README 停在报错处不自动恢复，打断 `stop: no` 静默自主节奏。
- **修复方向**：改 harness README 与 start-research 措辞，统一为「CLI 报错是触发点 → Agent 派生后缀重试、静默记录、不询问」；删除 README 的过期句。**无需 spec delta。**

### F-03【高】`repair_kind` 一词两套枚举 + 锁定决策表覆盖不全

- **现象**：两套枚举见上文「关键术语」。`CONTEXT.md:57` 术语表只定义了 phase 义（gate/phase 面），没提 work-unit 面。
- **锁定表洞**：`DEEP_RESEARCH_HARNESS/RUN.md:38-46` 决策表声称「engine 可发出的每个恢复 repair_kind 都必须有表行」，实际只有 5 行；engine 实际还发 `wait_for_delegated_candidate / author_exact_fallback_attempt / semantic_boundary / claim_successor / inspect_current_lineage_leaf`（发射点 `DEEP_RESEARCH_HARNESS/engine/work-unit-attempt-disposition.mjs:118-174`），这 5 个值在 RUN.md 与锁定测试中**均无行**。
- **锁定测试的洞**：`tests/engine/work-unit-recovery-decision-table.test.mjs:25-31` 词汇数组是人工枚举的 5 值（`recover-transaction / recover-declaration / supersede / wait / missing_contract`），注释自称 source of truth 是 4 个 engine 发射点，但既不从 engine 派生也未覆盖全。
- **spec 归属**：`CHI-004` 在 `openspec/specs/agent/delegated-work-units/spec.md` 与 `openspec/specs/engine/check-inspect-feedback/spec.md`。
- **agent 拿错风险**：收到表外 `repair_kind` 值时查表为空，只能猜下一步 CLI 动词/重跑坐标。
- **修复方向**（方案在 propose 前定）：a = 决策表扩展覆盖全部 10 个发射值（保守，不动 engine 行为）；b = 词汇归一化（如 `wait_for_delegated_candidate`→`wait`、`semantic_boundary`→`missing_contract`）。默认推荐 a。锁定测试词汇数组改为从 engine 发射点**派生**（从 `work-unit-attempt-disposition.mjs` 导出或反射），把「engine 发什么、表就必须有什么」变成机器事实。需 spec delta（CHI-004 两个主 spec）。

### F-04【中】phase 文档 §6 交接步骤不齐

- **现象**：`RUN.md` §2 规定 gate pass 后必须先 `enter-phase --node <check.next>`（route-bound witness）再 `advance-status`；setup/wave0/1/2/seed-topics/rerun/readiness/hitl2 的 §6 都带这两步（例：`phase-wave0.md:297-306`、`phase-seed-topics.md:190-194`）。但 `phase-instantiation.md` §6(:55-57) 只有「Advance to hitl1：加载 phase-hitl1.md」，`phase-hitl1.md` 全文无 enter-phase（仅 :103 `advance-status --to hitl1_recorded`）。`start-research.md:66` 还声称「每个 phase node 本身就是一个完整的 instruction sheet」。
- **spec 锁定（关键）**：`openspec/specs/workflow/workflow-node-contract/spec.md:275-292`（WNC-010）要求「lifecycle phase nodes SHALL instruct 经 enter-phase 消费 check.next」，但**明确声明 instantiation/HITL1 bootstrap status shape 是兼容例外、「SHALL NOT 被 phase wording update 静默重写」**。即：缺 enter-phase 是 spec 认可的例外，不是要补的行为；问题在于文档没把这个例外说清楚。
- **agent 拿错风险**：按 instantiation/hitl1 文档执行会漏掉 witness 或对「为什么这里和其他 phase 不一样」产生困惑；事后 `audit-phase-status` 报 missing witness 才返工。
- **修复方向**：phase-instantiation §6 / phase-hitl1 §6 显式标注 bootstrap 兼容例外（引 WNC-010 措辞或指针到 shared section）；start-research 的「完整 instruction sheet」句补例外说明。**无行为变更、无需 spec delta。**

### F-05【中】触发模型二元并存

- **现象**：`DEEP_RESEARCH_HARNESS/RUN.md` §0(:3-5)/§1(:16) 说「读到即已选定、别再问用户、Section 2 接管」；`DEEP_RESEARCH_HARNESS/README.md:21-29` 与根 AGENTS.md 说触发条件是「用户有研究意图」。对非研究性阅读（代码探索时读 RUN.md）没有任何 carve-out（harness README 的 pre-read 豁免只覆盖 charter/CONTEXT）。
- **spec 锁定（关键）**：RUN.md §0/§1 表述被 `openspec/specs/bundle/run-entry/spec.md` 锁定（含「Reading RUN.md means DEEP_RESEARCH_HARNESS was selected」scenario :157-161）。改 RUN.md 措辞**必须带 run-entry delta**；另预查 `openspec/specs/agent/agent-command-surface/spec.md` 的 trigger-vs-execution 要求（RUN.md:16 提到的 pre-pipeline routing exception 条款）是否需同步 delta。
- **agent 拿错风险**：探索框架代码的 agent 读 RUN.md 后按「已接管」逻辑开跑研究流程，任务性质被文档自我声明改变。
- **修复方向**：RUN.md 加一句显式 carve-out（主动阅读/代码探索不构成 entry 选择；entry = 用户研究意图 + 用户提供/指向 entry），措辞与 RUE 要求协调（explore 阶段定稿）；harness README 触发规则同步；run-entry spec delta 更新对应 scenario。

### F-06【中】`C5` 是 entry 链未定义符号

- **现象**：`RUN.md:30`、`start-research.md:75`、`continue-run-bundle.md:83-88` 使用「accepted C5 recovery / post-C5 return / retired C5 lineage」，整条 entry 链无定义；specs 纯使用（`openspec/specs/research/post-final-recovery/spec.md:44-76`、`openspec/specs/research/content-delivery-phase-content/spec.md:353/449`），伴随 C2/C3 同样无展开（`openspec/specs/research/research-styles/spec.md:133-134`、`post-final-recovery/spec.md:368`）。
- **agent 拿错风险**：Final 场景判断「是否走 accepted C5 recovery」时对 C5 含义、资格、入口全靠推断，容易错误触发 post-final recovery。
- **修复方向**：`CONTEXT.md` 加 C-series glossary（C2/C3/C5 各自是什么 event/checkpoint，owner 指向 post-final-recovery 与 content-delivery-phase-content specs）。CONTEXT 是全项目唯一术语对齐 glossary 且是强制预读，放这里即可，entry 链不必逐个加注。

### F-07【中】「当前可执行 surface」清单严重过期

- **现象**：`DEEP_RESEARCH_HARNESS/README.md:74-79` 称 cli/ 当前只有 `instantiate-run-bundle.mjs / validate-bundle.mjs / inspect-bundle.mjs / operate-queue.mjs` 四个工具；实际 cli/ 有 26 个工具（含 RUN.md 依赖的 `operate-work-unit / enter-phase / advance-status / check-reentry / audit-phase-status / log-event / operate-post-final-recovery` 等），`cli/gates/` 已有 10 个 `check-gate-*.mjs` wrapper，却仍被 README:89 与 `openspec/guidance/models/framework-runtime-boundary.md:215-216` 标为「target/目标位置」。`framework-runtime-boundary.md:82-97/:119-122` 复制同一份过期清单。（`engine/gates/` 确实不存在，该部分表述无误。）
- **agent 拿错风险**：先读 README 的 agent 误判能力边界，以为 operate-work-unit/enter-phase 尚不可用，犹豫或找替代路径。
- **修复方向**：更新两份清单为当前真实 surface；或改成「以 `cli/` 目录为准」的指针 + 目录-清单一致性检查（后者见 F-11）。

### F-08【中】spec req-ID 引用无法在正文解析

- **现象**：`openspec/guidance/models/invariants-brief.md:24/31/36` 引用「run-entry/spec.md（RUE-004）」等；spec 正文 requirement 标题无 ID 标签，仅 front-matter 列表（`run-entry/spec.md:1` 还缺 RUE-003，`openspec/governance/req-registry.yaml:367` 标 DEPRECATED 但 front-matter 未说明）。解析 RUE-004 须经 registry 再按正文 `### Requirement:` 标题**序数**对应；中间插入一条即全部静默错位。
- **agent 拿错风险**：按编号查不到正文位置；序数错位时引用指向错误 requirement 而不自知。
- **修复方向**：invariants-brief 的引用格式改为可解析格式（spec 路径 + registry 中的 requirement 名称），并加解析规则说明；一致性 checker 见 F-11（归 C3）。spec 正文加 ID 标签是更大工程，本 plan **不做**，只做引用格式 + checker。

### F-09【低】归档命名漂移

- **现象**：根 `README.md:65` 说勿读 `_original_*`；根 AGENTS.md Hard Rules 说勿读 `_old_topics`；现实两者共存于 `_backlog/_done/_old_topics/`（含 `_original_dpt_v12/` 等）。两个入口文档各用各的名字。
- **修复方向**：根 README/AGENTS/CLAUDE 统一归档命名（`_old_topics` 目录与 `_original_*` 前缀的关系一句话说清，一处 canonical、其余指针）。

### F-10【低】harness AGENTS.md 分号邻接歧义

- **现象**：`DEEP_RESEARCH_HARNESS/AGENTS.md` 第一优先 bullet 2：「显式 candidate 缺少任一文件即报告 `unsupported_current_entry_contract` 并停止；没有 explicit candidate 才读 `RUN.md`」。分号两侧规则相邻，读太快的 agent 可能把「candidate 缺 pair 文件」滑进「无 explicit candidate」分支去读 RUN.md。canonical（`command_playbook/continue-run-bundle.md:52-59`）明确禁止这种 fallback。
- **修复方向**：改措辞为显式「preflight 失败 ≠ 无 candidate，禁止 fallback 到 RUN.md」；harness AGENTS/CLAUDE 两份同步。

### F-11【机制】防漂移机制盲区（前几项穿透的根因）

现有治理机制（`openspec/governance/` 下的 `check-content-drift.mjs`、`check-capability-taxonomy.mjs`、`check-project-specs.mjs`、`check-semantic-closure.mjs`、`check-verification-routing.mjs`、req-registry、决策表锁定测试、配对文件同步要求）无法捕获上述缺陷。盲区清单（本 plan 要补的 4 类 checker 即此）：

1. **无指针目标存在性检查** → F-01 穿透（指针指向不存在的表照样归档）。
2. **锁定测试词汇表人工枚举、不从 engine 派生** → F-03 穿透（表声称完备但不完备）。
3. **「当前 surface」清单无目录一致性验证** → F-07 穿透（清单与 `cli/` 现实脱节）。
4. **spec front-matter↔registry↔正文序数三角映射无一致性检查** → F-08 穿透。
5. **无跨 phase 文档结构一致性检查**（§6 handoff 模式）→ F-04 穿透。

### 已验证自洽项（勿重复修）

| 编号 | 结论 | 证据 |
|---|---|---|
| V-01 | 根/harness 两对 AGENTS/CLAUDE 配对同步属实 | diff 仅头部标题 + 一句工具名 |
| V-02 | invariants-brief #4 的 StopAuthorizationState 4 值与代码一致 | `engine/queue-manager-core.mjs:57` zod enum 四值 |
| V-03 | RUN.md 引用的全部命令/文件存在 | cli/ 26 工具、cli/gates/ 10 wrapper、playbooks、phase docs、rb_templates 均在 |
| V-04 | entry-selection 三处指针一致、无矛盾重述 | 根 AGENTS.md、harness README:29、RUN.md:52 均指向 `continue-run-bundle.md` "Entry Selection (canonical)" |
| V-05 | npm test 与根 README 声明一致 | package.json test = `find tests/ -name '*.test.mjs'` |

---

## 2. Change 划分（推荐 3 个）

| Change | 主题 | 覆盖 findings | 文件面 | spec delta | 预计成本 |
|---|---|---|---|---|---|
| **C1** `harness-entry-doc-consistency` | Harness 面 Agent-facing 文档与 accepted contract 对齐 | F-02、F-04、F-05、F-07(harness 侧)、F-10 | `DEEP_RESEARCH_HARNESS/`（README、RUN、AGENTS/CLAUDE、phase-instantiation、phase-hitl1、start-research） | run-entry（F-05）；预查 agent-command-surface | 中（1 个 spec delta） |
| **C2** `repair-guidance-terminology-pointer-drift` | 根/openspec guidance 面断指针、术语、归档命名 | F-01、F-06、F-03(仅 CONTEXT 术语行)、F-07(guidance 侧)、F-08(引用格式约定)、F-09、F-12 | 根 CONTEXT/README/AGENTS/CLAUDE + `openspec/guidance/models/`（framework-runtime-boundary、invariants-brief） | 预计无（需跑 governance checker 验证） | 低 |
| **C3** `repair-work-unit-recovery-vocabulary-and-drift-guards` | 反馈词汇契约闭环 + 防漂移检查器 | F-03(engine/tests/RUN.md 表)、F-08(checker)、F-11(4 类 checker)、F-13 | `DEEP_RESEARCH_HARNESS/`（engine、RUN.md 决策表）+ `tests/engine/` + `openspec/governance/` + specs | delegated-work-units + check-inspect-feedback（F-03）；governance 面 spec 预查 | 高（行为契约 + 新机制） |

**盘算逻辑**：change 的代价在流程成本（propose/explore/apply/archive + spec sync + governance finalizer），不在 change 内部大小。所以同文件面、同性质合并；不同性质（纯文档 vs 行为契约 vs 治理机制）分开。文件面闭合：一个文件尽量只在一个 change 里改（RUN.md 被 C1 与 C3 都需要 → 串行）。

### C1: harness-entry-doc-consistency

**主题**：让 Harness 面 Agent-facing 文档与已 accepted 的 contract 一致；只改文档措辞，不改行为（F-05 的 run-entry delta 除外）。

**tasks 概要**（propose 时细化）：
1. **F-02**：`DEEP_RESEARCH_HARNESS/README.md:99-101` collision 段落改为与 `pre-research-phase-content` spec 一致：CLI 报错退出 → Agent 派生 `-<hex6>` 后缀重试、经 trace/log 记录、不询问用户；删除「collision suffix 是 workflow-foundation target、非当前行为」过期句。`start-research.md:34` 措辞对齐同一说法。
2. **F-04**：`phase-instantiation.md` §6 与 `phase-hitl1.md` §6 显式标注 bootstrap 兼容例外（引 WNC-010 措辞或指针到 shared section），不静默补 enter-phase；`start-research.md:66` 句补例外说明。
3. **F-05**：`RUN.md` §0/§1 加非研究阅读 carve-out（主动阅读/代码探索不构成 entry 选择；entry = 用户研究意图 + 用户提供/指向 entry），措辞与 run-entry RUE 要求协调（explore 阶段定稿）；`DEEP_RESEARCH_HARNESS/README.md` 触发规则同步；**run-entry spec delta**（对应 scenario 更新）；预查 `agent-command-surface` 的 trigger-vs-execution 要求是否需同步 delta。
4. **F-07**：`DEEP_RESEARCH_HARNESS/README.md:74-79`「当前可执行 surface」更新为真实清单（26 个 CLI 工具 + `cli/gates/` 10 个 wrapper），`cli/gates/` 的「目标位置」表述改为当前状态；`engine/gates/` 保留 target 表述（确实不存在）。
5. **F-10**：harness `AGENTS.md`/`CLAUDE.md` 第一优先 bullet 2 措辞改（preflight 失败 ≠ 无 candidate，禁 fallback）；两份同步。
6. **验收**：配对 diff 仅头部；`npm test` 全绿；run-entry 相关 governance checker（如有）通过；spec sync 完成。

**依赖**：无（与 C2 并行）。

### C2: repair-guidance-terminology-pointer-drift

**主题**：根/openspec guidance 面断指针、未定义术语、归档命名的纯文档修复。

**tasks 概要**：
1. **F-01**：`openspec/guidance/models/framework-runtime-boundary.md` 补真正的 Gate 五面表（transition 表 / definition JSON / engine / CLI wrapper / runtime status，各列 owner 坐标，可把 :135/:215-216 已有散点收编成表）；`CONTEXT.md:55` Gate 行指向该表精确位置；两种「五面」显式区分命名（如「Gate 五面」vs「工作单元五反馈面」）。
2. **F-06**：`CONTEXT.md` 加 C-series glossary（C2/C3/C5 各自是什么 event/checkpoint，owner 指向 `post-final-recovery` spec 与 `content-delivery-phase-content` spec）。CONTEXT 是强制词汇对齐入口，entry 链不改（避免跨 change 动 RUN.md）。
3. **F-03 术语行**：`CONTEXT.md` 的 `hints[]`/`repair_kind` 行拆分为两套 closed enum 的区分表述（gate/phase 反馈面 vs work-unit disposition 面），各标 owner。
4. **F-07 guidance 侧**：`framework-runtime-boundary.md:82-97/:119-122` 的 CLI 清单与 C1 更新后的 README 清单语义对齐（同一份事实，避免复制粘贴——用指针）。
5. **F-08 引用格式约定**：`invariants-brief.md` 的 `(RUE-004)` 式引用改为可解析格式（spec 路径 + `req-registry.yaml` 中的 requirement 名称），加解析规则说明；checker 本身归 C3。
6. **F-09**：根 `README.md`/`AGENTS.md`/`CLAUDE.md` 统一归档命名（`_old_topics` 目录与 `_original_*` 前缀关系一句话说清，一处 canonical、其余指针）。
7. **F-12**：根 `AGENTS.md`/`CLAUDE.md` 的 Deep Research Routing 段补 "current run bundle root" 坐标命名（与 RUE-006 pointer 纪律兼容；转绿 `deep-research-harness-entry-contract.test.mjs`）。两份同步。
8. **验收**：根/harness 配对 diff 检查；`check-capability-taxonomy`、`check-content-drift` 等 governance checker 通过；CONTEXT 与 charter defer-to 链不冲突；`node --test tests/integration/deep-research-harness-entry-contract.test.mjs` 绿。

**依赖**：无（与 C1 并行）。

### C3: repair-work-unit-recovery-vocabulary-and-drift-guards

**主题**：engine 实际发射的 feedback 词汇、RUN.md 决策表、锁定测试、spec 与防漂移检查器形成闭环。**最重，最后做。**

**tasks 概要**：
1. **F-03 explore 决策**（propose 前定）：方案 a = 决策表扩展覆盖全部 10 个发射值（保守，不动 engine 行为）；方案 b = 词汇归一化（如 `wait_for_delegated_candidate`→`wait`、`semantic_boundary`→`missing_contract`）。默认推荐 a；若选 b 需按 charter 设计审查顺序走（abstraction-semantic-precision → simple-reliable-control → helper-oriented-agent，见 `openspec/constitution/project-charter.md` Design Review Route）。
2. **锁定测试改造**：`tests/engine/work-unit-recovery-decision-table.test.mjs` 词汇数组不再人工枚举，改为从 engine 发射点派生（从 `work-unit-attempt-disposition.mjs` 导出/常量反射）。
3. **RUN.md 决策表**：补齐全部发射值的行（或按方案 b 归一后对齐）。
4. **spec delta**：`openspec/specs/agent/delegated-work-units/spec.md`（CHI-004）与 `openspec/specs/engine/check-inspect-feedback/spec.md` 更新表完备性/词汇来源要求。
5. **F-11 检查器 ×4**（`openspec/governance/` 下，遵循既有 check-*.mjs 模式；运行入口按既有 governance 调用方式接入；若新 checker 需要 JS 测试，放 `tests/governance/`，分类遵循 verification-routing spec）：
   - `check-guidance-pointer-targets.mjs`：guidance/entry 文档中的相对路径/文件指针目标存在性（F-01 类）。
   - `check-surface-inventory.mjs`：README/模型中的 CLI surface 清单 vs `cli/`、`cli/gates/` 目录现实（F-07 类）。
   - `check-phase-node-structure.mjs`：phase 文档 §6 必须含 enter-phase+advance-status 模式；**豁免 instantiation/hitl1 bootstrap**（按 WNC-010 例外写死豁免表，防 F-04 类再犯）。
   - `check-spec-req-ids.mjs`（或扩展 `check-project-specs.mjs`）：spec front-matter req 列表 ↔ `req-registry.yaml` ↔ 正文 requirement 序数三方一致性（F-08 类）。
6. **F-13**：修 `tests/integration/governance/change-feedback-loop-archive.test.mjs` 的隔离 fixture 组装，拷贝 finalizer 依赖的 governance 脚本（至少 `check-content-drift.mjs` 及其依赖面）进隔离树。
7. **验收**：4 个新 checker 对 C1/C2 修复后的当前树全部通过；`npm test` 全绿（含改造后的锁定测试与 F-13 修复后的 feedback-archive 测试）；spec sync；`node openspec/governance/finalize-change-archive.mjs --change <name>` 归档。

**依赖**：必须在 C1、C2 之后（checker 落地即绿；RUN.md 与 C1 同文件面）。

---

## 3. 顺序与依赖

```text
C1（harness 文档）──┐
                     ├──→ C3（词汇契约 + 检查器，最后）
C2（guidance 文档）──┘
```

- C1 与 C2 无文件交集，可并行。
- C3 必须最后：其 checker 验证的是「C1/C2 修完后的树」，且与 C1 共享 RUN.md 文件面。
- findings 文件里曾建议「F-11 先行」，本 plan 取代之：checker 先行会红在当前树上，需要 allowlist 过渡期（额外成本）；修完文档再上 checker 一次落地即绿。

---

## 4. 备选方案（change 数量权衡）

- **2-change 极简方案**：C1+C2 合并为一个「全库文档一致化」change。代价：文件面跨 harness 与根/guidance 共 ~15 个文件，spec delta 混入 run-entry；propose 篇幅与 review 面显著变大，apply 改动面过宽、回滚粒度差。**不推荐，除非流程成本远高于 review 成本。**
- **4-change 稳健方案**：C3 拆为 C3a（词汇契约：engine/tests/RUN.md 表/spec）与 C3b（治理检查器）。收益：行为变更与纯机制新增隔离，review 更聚焦。代价：多一个完整生命周期。
- **结论**：默认 3-change；若 C3 propose 时 spec surface 超出预期（governance 面 spec 牵连多），再按 4-change 拆。

---

## 5. 执行指引（给执行 Agent 的操作步骤）

1. **开工前**：读 `openspec/constitution/project-charter.md` 与根 `CONTEXT.md`（强制）；重跑本节「证据复核命令速查」验证 findings 坐标仍成立；若某项已被其他 change 修复，在 findings 文件对应项标注并跳过。
2. **启动一个 change**：`/opsx:propose` 创建 `openspec/changes/<change-name>/`（proposal、design、specs、tasks）；期间目标代码只读。若方向/边界不清，先 `/opsx:explore`。禁止跳阶段；阶段耗时过长就把摩擦点报告给人，不要跳过实现。
3. **apply**：按批准的 tasks 执行；每次改动后跑对应验证（见各 change 验收口径 + 命令速查）。
4. **归档**：语义收口 + spec sync 后，用 `node openspec/governance/finalize-change-archive.mjs --change <name>`（唯一入口）。若 tasks 声明 `openspec-feedback:*` marker，先读 `openspec/operations/` 对应指导。
5. **进度回写**：每个 change 的 propose/apply/archive 完成后，更新本文件「进度跟踪」表与 `_backlog/plans/README.md` 对应行；findings 文件逐项打勾（可加 `[x]` 标注归属 change）。
6. **全部闭合后**：按 `_backlog/plans/README.md` 的「完成一个 plan 的步骤」归档本 plan 与 findings（git mv 到 `_done/_closed_plans/`，更新两处 README 计数）。

### 证据复核命令速查（开工前重跑）

```bash
# F-01 断指针
grep -n "五面" CONTEXT.md openspec/guidance/models/framework-runtime-boundary.md
# F-02 collision 三说法 + spec 锁定
sed -n '99,101p' DEEP_RESEARCH_HARNESS/README.md
grep -n "collision\|hex6" DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-instantiation.md | head
sed -n '270p' openspec/specs/research/pre-research-phase-content/spec.md
# F-03 表洞（这 5 值应无输出，证明仍在表外）
grep -n "wait_for_delegated_candidate\|author_exact_fallback_attempt\|semantic_boundary\|claim_successor\|inspect_current_lineage_leaf" DEEP_RESEARCH_HARNESS/RUN.md tests/engine/work-unit-recovery-decision-table.test.mjs
# F-04 例外声明
sed -n '275,292p' openspec/specs/workflow/workflow-node-contract/spec.md
grep -L "enter-phase" DEEP_RESEARCH_HARNESS/workflows/nodes/phases/*.md
# F-07 清单 vs 现实
ls DEEP_RESEARCH_HARNESS/cli | wc -l; ls DEEP_RESEARCH_HARNESS/cli/gates | wc -l
sed -n '74,79p' DEEP_RESEARCH_HARNESS/README.md
# F-08 req-ID 可解析性
grep -n "RUE-004" openspec/specs/bundle/run-entry/spec.md openspec/governance/req-registry.yaml
# 配对文件同步（应只有头部差异）
diff AGENTS.md CLAUDE.md; diff DEEP_RESEARCH_HARNESS/AGENTS.md DEEP_RESEARCH_HARNESS/CLAUDE.md
# 测试与 checker
npm test
node openspec/governance/check-content-drift.mjs   # 及同目录其他 check-*.mjs（按需）
```

---

## 6. 进度跟踪

| Change | 状态 | propose | apply | archive | 备注 |
|---|---|---|---|---|---|
| C1 `harness-entry-doc-consistency` | ✅ archived | ✓ 2026-08-16（propose+polish ready） | ✓ 2026-08-16（16/16 tasks） | ✓ 归档为 `2026-08-16-harness-entry-doc-consistency`（finalizer 12/12 checks） | F-02/04/05/07/10 闭合；含 run-entry delta（F-05） |
| C2 `repair-guidance-terminology-pointer-drift` | ✅ archived | ✓ 2026-08-16 | ✓ 2026-08-16（13 处编辑 + guard 测试 8/8） | ✓ 归档为 `2026-08-16-repair-guidance-terminology-pointer-drift`（12/12） | F-01/06/09/12 + F-03术语/F-07guidance侧/F-08格式 闭合；全量 2896/2897（仅剩 F-13） |
| C3 `repair-work-unit-recovery-vocabulary-and-drift-guards` | propose+polish ready | ✓ 2026-08-16（polish ready for apply） | 待 apply | — | 2 spec delta（CHI ADDED + CHF MODIFIED）；10 值字面量清单已精确定位 |

- findings 逐项勾选随各 change 推进；F-01~F-11 全部闭合后，本 plan 与 findings 一起按约定归档。
- 每个 change 正式启动前，先重跑对应 findings 的证据坐标验证（漂移可能已变化）。
