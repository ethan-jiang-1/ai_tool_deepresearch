# agent-guidance-conflict-drift-findings

> 创建: 2026-08-16 | 状态: active（findings 收集完成，逐项修复计划待建立）
> 来源: coding-agent 视角对项目 guidance/文档/引擎一致性的系统核验（charter → CONTEXT.md → invariants-brief → control map → Harness entry 链，并抽查代码、测试、req-registry、目录现实）。
> 用途: 后续修复计划的 findings 种子。每项含证据坐标、agent 拿错风险、修复方向；修复时逐项打勾或拆分为 bounded OpenSpec changes。
> 承接 plan: [agent-guidance-conflict-drift-remediation.md](./agent-guidance-conflict-drift-remediation.md)（同目录，3 个 OpenSpec change 的划分与进度跟踪在此）。
> 时效: 坐标基于 2026-08-16 working tree；开始修复前应重新验证坐标（漂移可能已变化）。

## 总览

| 编号 | 严重度 | 一句话 |
|------|--------|--------|
| F-01 | 高 | `Gate 五面` 断指针：CONTEXT.md 指向的表在目标文件不存在，且「五面」一词异义 ✅C2 |
| F-02 | 高 | name collision 处理三处文档三种说法，其中 README 与 phase 文档正面冲突 ✅C1 |
| F-03 | 高 | `repair_kind` 一词两套枚举；RUN.md 锁定决策表缺 5 个 engine 实际发射值，锁定测试用人工枚举（术语行 ✅C2；engine/表洞待 C3） |
| F-04 | 中 | phase 文档 §6 交接步骤不齐：instantiation/hitl1 缺 enter-phase，与「完整 instruction sheet」声明矛盾 ✅C1 |
| F-05 | 中 | 触发模型二元并存：「读到 RUN.md 即选定」vs「研究意图才触发」，非研究性阅读无 carve-out ✅C1 |
| F-06 | 中 | `C5` 是 entry 链未定义符号（伴随 C2/C3），Final 场景决策靠推断 ✅C2 |
| F-07 | 中 | 「当前可执行 surface」清单严重过期：声称 4 个 CLI，实际 24 个；cli/gates 已有 10 wrapper 仍标「目标位置」 ✅C1+C2 |
| F-08 | 中 | spec req-ID 引用无法在正文解析，须走 registry + 标题序数，插入即静默错位（引用格式 ✅C2；一致性 checker 待 C3） |
| F-09 | 低 | 归档命名漂移：根 README `_original_*` vs AGENTS.md `_old_topics` ✅C2 |
| F-10 | 低 | harness AGENTS.md 分号邻接歧义，可被误读为「缺 pair 文件 → fallback 到 RUN.md」 ✅C1 |
| F-11 | 机制 | 防漂移机制盲区（F-01/03/04/07/08 的穿透根因），建议补 5 类一致性检查 |
| F-12 | 中 | 【C1 apply 时发现，pre-existing】根 AGENTS.md/CLAUDE.md 缺 "current run bundle root" 短语 → `tests/integration/deep-research-harness-entry-contract.test.mjs` 断言失败 ✅C2 |
| F-13 | 低 | 【C1 apply 时发现，pre-existing】`tests/integration/governance/change-feedback-loop-archive.test.mjs` 的隔离 fixture 缺 governance 脚本（check-content-drift.mjs 未拷贝），finalizer 报 content_drift_failed；归 C3（governance 测试基建面） |

## Findings

### F-01【高】`Gate 五面` 断指针 + 一词异义

- **现象**：`CONTEXT.md:55` 说「Gate 一词有五面含义…完整五面表见 `openspec/guidance/models/framework-runtime-boundary.md`」。目标文件全文无「五面」一词、无五面表；gate 相关内容散落（definition JSON :135、CLI wrapper :215、runtime status :216），与承诺的「完整表」不符。
- **制造来源**：归档 change `openspec/changes/archive/2026-08-16-repair-current-guidance-contract-drift/tasks.md:17` 把「Gate 一行指向 framework-runtime-boundary.md 的五面表」标 `[x]`——只加了指针，未在目标补表。
- **一词异义**：`openspec/changes/archive/2026-08-16-make-work-unit-recovery-feedback-direct/tasks.md:13` 的「五面」指工作单元五个反馈面（submit 拒绝/late-submit 拒绝/transaction 阻塞/dry-submit/inspect），与 Gate 五面无关。
- **agent 拿错风险**：按 CONTEXT 去找表找不到，可能自造 Gate 五面模型或放弃术语对齐。
- **修复方向**：要么在 `framework-runtime-boundary.md` 补真正的五面表（transition 表 / definition JSON / engine / CLI wrapper / runtime status），要么把 CONTEXT 指向真实 owner；「五面」两种含义需显式区分命名。

### F-02【高】name collision 三处文档三种说法

- **现象**：
  - `DEEP_RESEARCH_HARNESS/README.md:99-101`：「目标目录已存在，必须报错停止」「自动 collision suffix 是 workflow-foundation target，不是当前 production CLI 行为」。
  - `workflows/nodes/phases/phase-instantiation.md` §7(:71-81)/§8(:85)/§9(:93)：「Name collision → 自动生成 hex6 后缀并重试、不询问用户、记 silent_degradation」「禁止浮出水面」。
  - `command_playbook/start-research.md:34`：报错退出，Agent 派生 collision-safe 名称重试。
- **CLI 现状**：`cli/instantiate-run-bundle.mjs:113-114` 目录已存在即报错退出（永不覆盖）。
- **agent 拿错风险**：执行 instantiation 的 agent 按 phase 文档静默自动后缀，与刚在 README 读到的「必须报错停止」矛盾；或按 README 停在报错处不自动恢复，打断 `stop: no` 静默自主节奏。
- **修复方向**：定一个 canonical 说法（建议：CLI 报错 + Agent 自动派生后缀重试，README 改为指针），三处统一；附带把「collision suffix 非当前行为」的过期表述删掉。

### F-03【高】`repair_kind` 一词两套枚举 + 锁定决策表覆盖不全

- **现象**：
  - gate/phase 反馈面 enum（`phase-instantiation.md` §7 :63-67）：`agent_action / engine_operation / user_decision / external_action / missing_contract`。
  - work-unit disposition enum（`engine/work-unit-attempt-disposition.mjs:118-174` 实际发射）：`wait / recover-transaction / recover-declaration / supersede / missing_contract / wait_for_delegated_candidate / author_exact_fallback_attempt / semantic_boundary / claim_successor / inspect_current_lineage_leaf`。
  - 同一字段名、两套不相交 closed enum；`CONTEXT.md:57` 术语表只定义 phase 义。
- **锁定表洞**：RUN.md:38-46 决策表声称「engine 可发出的每个恢复 repair_kind 都必须有表行」，但实际只覆盖 5 个核心值；`wait_for_delegated_candidate / author_exact_fallback_attempt / semantic_boundary / claim_successor / inspect_current_lineage_leaf` 在 RUN.md 与锁定测试中均无行。锁定测试 `tests/engine/work-unit-recovery-decision-table.test.mjs:25-31` 词汇表是人工枚举的 5 值，注释自称 source of truth 是 4 个 engine 发射点，但未从 engine 动态提取，也未覆盖全。
- **agent 拿错风险**：收到 `repair_kind: author_exact_fallback_attempt` 等值时查表为空，只能猜测下一步 CLI 动词/重跑坐标。
- **修复方向**：CONTEXT.md 区分两套 enum；决定 RUN.md 表纳入全部发射值或显式声明 scope；锁定测试词汇表改为从 engine 发射点派生（import 或反射）或至少完整枚举，堵住「表声称完备但不完备」。

### F-04【中】phase 文档 §6 交接步骤不齐

- **现象**：RUN.md §2 规定 gate pass 后必须先 `enter-phase --node <check.next>`（route-bound witness）再 `advance-status`；setup/wave0/1/2/seed-topics/rerun/readiness/hitl2 的 §6 都带这两步（例：`phase-wave0.md:297-306`、`phase-seed-topics.md:190-194`）。但 `phase-instantiation.md` §6(:55-57) 只有「Advance to hitl1：加载 phase-hitl1.md」，`phase-hitl1.md` 全文无 enter-phase（仅 :103 `advance-status --to hitl1_recorded`）。
- **矛盾声明**：`start-research.md:66` 声称「每个 phase node 本身就是一个完整的 instruction sheet」。
- **agent 拿错风险**：按 instantiation/hitl1 文档执行会漏掉 enter-phase witness，`audit-phase-status` 事后报 missing witness，需返工修复。
- **修复方向**：统一所有 phase 文档的 §6 handoff 段落（enter-phase + advance-status 顺序、失败边界），或指针化到共享 section；建议加跨 phase 文档结构一致性检查（见 F-11）。

### F-05【中】触发模型二元并存

- **现象**：`RUN.md` §0(:3-5)/§1(:16) 说「读到即已选定、别再问用户、Section 2 接管」；`DEEP_RESEARCH_HARNESS/README.md:21-29` 与根 AGENTS.md 说触发条件是「用户有研究意图」。对非研究性阅读（如代码探索时读 RUN.md）没有任何 carve-out（harness README 的 pre-read 豁免只覆盖 charter/CONTEXT）。
- **agent 拿错风险**：探索框架代码的 agent 读 RUN.md 后按「已接管」逻辑开跑研究流程，任务性质被文档自我声明改变。
- **修复方向**：在 RUN.md（或 README 触发规则）加一句显式 carve-out：主动阅读/代码探索不构成 entry 选择；entry = 用户研究意图 + 用户提供/指向 entry。写入 canonical 而非只在指针处补。

### F-06【中】`C5` 是 entry 链未定义符号

- **现象**：`RUN.md:30`、`start-research.md:75`、`continue-run-bundle.md:83-88` 使用「accepted C5 recovery / post-C5 return / retired C5 lineage」，整条 entry 链无定义；specs 纯使用（`openspec/specs/research/post-final-recovery/spec.md:44-76`、`content-delivery-phase-content/spec.md:353/449`），伴随 C2/C3（`research-styles/spec.md:133-134`、`post-final-recovery/spec.md:368`）同样无展开。
- **agent 拿错风险**：Final 场景判断「是否走 accepted C5 recovery」时对 C5 的含义、资格、入口全靠推断，容易错误触发 post-final recovery 或误判 eligibility。
- **修复方向**：在 CONTEXT.md 或 post-final-recovery playbook/spec 顶层给 C-series 一个 glossary 定义（C2/C3/C5 各自是什么 event/checkpoint），entry 链首次出现处加引用。

### F-07【中】「当前可执行 surface」清单严重过期

- **现象**：`DEEP_RESEARCH_HARNESS/README.md:74-79` 称 cli/ 当前只有 `instantiate-run-bundle.mjs / validate-bundle.mjs / inspect-bundle.mjs / operate-queue.mjs` 四个工具；实际 cli/ 有 26 个工具（含 RUN.md 依赖的 `operate-work-unit / enter-phase / advance-status / check-reentry / audit-phase-status / log-event / operate-post-final-recovery` 等），`cli/gates/` 已有 10 个 `check-gate-*.mjs` wrapper，却仍被 README:89 与 `framework-runtime-boundary.md:215-216` 标为「target/目标位置」。`openspec/guidance/models/framework-runtime-boundary.md:82-97/:119-122` 复制同一份过期清单。（`engine/gates/` 确实不存在，该部分无误。）
- **agent 拿错风险**：先读 README 的 agent 会误判能力边界，以为 operate-work-unit/enter-phase 尚不可用，犹豫或另找替代路径。
- **修复方向**：更新两份清单为当前真实 surface；或改成「以 `cli/` 目录为准」的指针并加目录-清单一致性检查（见 F-11）。

### F-08【中】spec req-ID 引用无法在正文解析

- **现象**：`invariants-brief.md:24/31/36` 引用「run-entry/spec.md（RUE-004）」等；但 spec 正文 requirement 标题无 ID 标签，仅 front-matter 列表（`run-entry/spec.md:1` 还缺 RUE-003，`req-registry.yaml:367` 标 DEPRECATED 但 front-matter 未说明）。解析 RUE-004 须经 `openspec/governance/req-registry.yaml:368` 再按 `### Requirement` 标题**序数**对应；中间插入一条即全部静默错位。
- **agent 拿错风险**：按编号查不到正文位置；序数错位时引用指向错误 requirement 而不自知。
- **修复方向**：spec 正文 requirement 标题加 ID 标签，或约定引用一律走 registry 路径；加 front-matter↔registry↔正文序数一致性检查（见 F-11）。

### F-09【低】归档命名漂移

- **现象**：根 `README.md:65` 说勿读 `_original_*`；根 AGENTS.md Hard Rules 说勿读 `_old_topics`；现实两者共存于 `_backlog/_done/_old_topics/`（含 `_original_dpt_v12/` 等）。两个入口文档各用各的名字。
- **agent 拿错风险**：低（都在 `_backlog/` 勿读范围），但命名不统一削弱「勿读」规则的可识别性。
- **修复方向**：统一命名，一处 canonical 一处指针。

### F-10【低】harness AGENTS.md 分号邻接歧义

- **现象**：`DEEP_RESEARCH_HARNESS/AGENTS.md` 第一优先 bullet 2：「显式 candidate 缺少任一文件即报告 `unsupported_current_entry_contract` 并停止；没有 explicit candidate 才读 `RUN.md`」。分号两侧规则相邻，读太快的 agent 可能把「candidate 缺 pair 文件」滑进「无 explicit candidate」分支去读 RUN.md。canonical（`continue-run-bundle.md:52-59`）明确禁止这种 fallback。
- **修复方向**：改措辞明确「preflight 失败 ≠ 无 candidate，不得 fallback 到 RUN.md」；harness AGENTS/CLAUDE 两份同步改。

### F-11【机制】防漂移机制盲区（前几项穿透的根因）

现有治理机制（`check-content-drift.mjs`、`check-semantic-closure.mjs`、req-registry、决策表锁定测试、配对文件同步要求）无法捕获上述缺陷，盲区清单：

1. **无指针目标存在性检查** → F-01 穿透（指针指向不存在的表照样归档）。
2. **锁定测试词汇表人工枚举、不从 engine 派生** → F-03 穿透（表声称完备但不完备）。
3. **「当前 surface」清单无目录一致性验证** → F-07 穿透（README 清单与 `cli/` 现实脱节）。
4. **spec front-matter↔registry↔正文序数三角映射无一致性检查** → F-08 穿透。
5. **无跨 phase 文档结构一致性检查**（§6 handoff 段落是否齐备）→ F-04 穿透。

- **修复方向**：把上述 5 类检查并入 `openspec/governance/` check-*.mjs 体系（或 tests/ 对应层，分类遵循 verification-routing spec）；优先级建议最高——先堵洞，再逐条修文档，避免同类缺陷复发。

### F-12【中】根 AGENTS/CLAUDE 缺 explicit runtime coordinate 短语（C1 apply 时由回归测试暴露）

- **现象**：`tests/integration/deep-research-harness-entry-contract.test.mjs:101` 断言 6 个路由 surface（含根 `AGENTS.md`/`CLAUDE.md`）必须含 `/current run bundle root/i`；根两份文件该短语**零出现**（grep -c = 0），测试失败。该失败在 C1 之前已存在（C1 未触碰根行为文件），全量 `npm test` 的 2 个 pre-existing 失败之一。
- **agent 拿错风险**：根行为文件的 Deep Research Routing 段不点名 explicit runtime coordinate，弱化了「裸路径相对 current run bundle root 解析」的入口级提醒。
- **修复方向**：根 `AGENTS.md`/`CLAUDE.md` 的 Deep Research Routing 段补 "current run bundle root" 坐标命名（与 RUE-006 pointer 纪律兼容，只点名坐标、不重述流程）；两份同步；回归测试自然转绿。**归 C2**（与 F-09 同文件面）。

### F-13【低】feedback-loop-archive 测试 fixture 缺 governance 脚本（C1 apply 时暴露）

- **现象**：`tests/integration/governance/change-feedback-loop-archive.test.mjs:245` 在 `/tmp` 隔离 fixture 中跑 `finalize-change-archive.mjs`，finalizer 的 content-drift 检查因 `openspec/governance/check-content-drift.mjs` 未被拷贝进 fixture 而报 `Cannot find module ...`，断言 expected 0 / actual 1。该失败在 C1 之前已存在，全量 `npm test` 的 2 个 pre-existing 失败之二。
- **修复方向**：修测试基建——fixture 组装时把 finalizer 依赖的 governance 脚本（或整个 `openspec/governance/` 必要面）拷贝进隔离树；done condition 为 `node --test tests/integration/governance/change-feedback-loop-archive.test.mjs` 绿。**归 C3**（governance 面）。

## 已验证自洽项（勿重复修）

| 编号 | 结论 | 证据 |
|------|------|------|
| V-01 | 根/harness 两对 AGENTS/CLAUDE 配对同步属实 | diff 仅头部标题 + 一句工具名，与 harness 注记「除工具名外逐字节一致」吻合 |
| V-02 | invariants-brief #4 的 StopAuthorizationState 4 值与代码一致 | `engine/queue-manager-core.mjs:57` zod enum 四值；`syncQueueHealth` 实际写入两值(:98-110)，与简报相符 |
| V-03 | RUN.md 引用的全部命令/文件存在 | cli/ 26 工具、cli/gates/ 10 wrapper、playbooks、phase docs、rb_templates、workflows/nodes 均在 |
| V-04 | entry-selection 三处指针一致、无矛盾重述 | 根 AGENTS.md、harness README:29、RUN.md:52 均指向 `continue-run-bundle.md` "Entry Selection (canonical)" |
| V-05 | npm test 与根 README 声明一致 | package.json test = `find tests/ -name '*.test.mjs'`，符合「scoped to tests/**/*.test.mjs」 |

## 修复路由注意事项

- 涉及 `DEEP_RESEARCH_HARNESS/`（RUN.md、README、phase docs、engine、cli）与 `tests/` 的修复：先走 OpenSpec propose/explore，`/opsx:apply` 前目标只读；建议每个 finding（或 F-11 的每类检查）拆成一个 bounded change。
- 根 `AGENTS.md`/`CLAUDE.md` 改动必须两份同步（run-entry spec 同步要求，V-01 已验证当前同步状态）。
- `CONTEXT.md` / openspec guidance 修改注意 guidance 非权威边界与 defer-to 链。
- 建议修复顺序：F-11 先行或与首个文档修复同 change → F-01/F-02/F-03（高严重度）→ 其余按依赖。
- 本文件状态随修复推进更新；完成按 `_backlog/plans/README.md` 约定移入 `../_done/_closed_plans/`。
