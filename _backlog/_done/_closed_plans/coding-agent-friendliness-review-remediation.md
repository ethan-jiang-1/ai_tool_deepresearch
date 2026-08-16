# coding-agent-friendliness-review-remediation

> 创建: 2026-08-16 | 状态: active（plan 就绪，待逐个 OpenSpec change propose）
> 上游证据: coding-agent 视角全仓库体检（主 agent 走读 onboarding 链 + 三份只读子代理深读：操作面 / 引擎代码 / 治理测试）。证据坐标以 2026-08-16 working tree 为准，执行前**重新验证坐标**。
> 修复载体: OpenSpec change 生命周期（`/opsx:propose` → polish（强制 gate）→ `/opsx:explore` → `/opsx:apply` → `/opsx:archive`）
> 范围: **P0 + P1**（F-01~F-23）。P2 项显式记录为 deferred（见 §5），不进入本波次。
> 目标: 以 **2 个** bounded change 串行修完 F-01~F-23（change 数量最小化——生命周期开销高，宁可单 change 大一点，靠 tasks 分组做失败隔离）；每处可机器锁定的修复**顺手加 drift 测试**，修一处锁一处。

---

## 0. 给执行 Agent 的话（先读这节）

本 plan 的任务：修复仓库中一批 **coding-agent 视角的可读性/歧义/摩擦缺陷**——两个 6 分面（引擎代码、治理/测试）加 8 分操作面的残余尾巴。性质：不是功能 bug，而是「文档与文档、文档与代码、文档与 spec 不一致」或「代码表面存在死重/无导航」导致执行 Agent 拿错信息或多猜一步。体检基线事实（执行时不依赖记忆，需要时重跑）：

- `npm test` 全量 **2913 测试 / 0 fail**（基线，任何 change 归档前必须 ≥ 此并全绿）。
- `node openspec/governance/check-guidance-pointer-targets.mjs` 当前 clean。
- 根 `AGENTS.md`/`CLAUDE.md` 与 harness 配对文件逐字节同步（有 `agent-behavior-file-pair-sync-guard` 测试锁定）。

### 必须遵守的仓库硬规则（摘要，全文以根 AGENTS.md/CLAUDE.md 为准）

- **这是 agent engineering 项目，不是传统程序。** 实质任务前先读 `openspec/constitution/project-charter.md`，再读根 `CONTEXT.md`。
- **工程约束**：Node.js >=20，纯 ESM（`.mjs`），无 TypeScript/Python；依赖仅 `zod`/`yaml`；测试 `node:test` + `node:assert`。
- **OpenSpec 阶段门**：propose/explore 只写 `openspec/changes/`；`DEEP_RESEARCH_HARNESS/`、`tests/`、`experiments_playbook/` 只在 apply 按批准任务清单修改。propose → polish（`openspec-update-change` 类 gate，见根 AGENTS.md 最新约定）→ explore → apply → archive，禁止跳阶段。
- **测试放置**：JS 测试只在 `tests/`；框架目录不放测试；分类遵循 `verification-routing` spec。
- **归档唯一入口**：`node openspec/governance/finalize-change-archive.mjs --change <name>`（16 步 finalizer）。
- **勿读路径**：`node_modules/`、`.env/`、`_temp/`、`.exp-bundles/`、`dpt_rb_*/`、`_backlog/_done/_old_topics/`（本 plan 目录除外）。

### 本 plan 涉及的关键术语（执行时别拿错）

- **`repair_kind` 三套同名枚举**：gate/phase 面（5 值，owner `schema/contracts/gate-definition.mjs`）、work-unit 面（10 值，owner `engine/work-unit-repair-vocabulary.mjs`）、file-observability 面（6 值，owner `engine/helpers/file-observability.mjs`）。`missing_contract` 在两套撞名不同义。见 F-22。
- **Gate 五面 / 工作单元五反馈面**：同词异义，见根 `CONTEXT.md:55-58`。
- **C2/C3/C5**：post-final/reentry 链上的 checkpoint 代号，全仓库无单一展开定义（根 `CONTEXT.md:64` 自认）。见 F-23。
- **单一 canonical + 指针纪律**：修复任何规则时遵守，不要制造新重述。
- **retire 纪律**：删除优于保留；删不掉的历史用 `[DEPRECATED]`/归档标记，不要留"看起来活着"的死值。

---

## 1. Findings 全量明细（F-01~F-23）

> 每项含：现象、证据坐标、agent 拿错/负担风险、修复方向。开始修某一项前**重新验证坐标**（漂移可能已变化）。

### 操作面残留（→ A）

**F-01【高】`workflows/README.md:38` 与 `transitions.chain.json:9` 的 rerun 矛盾**
- 现象：README 说「Chain 只编码 `passed` 分支；`failed`、`rerun` 归 Agent decision authority，不编码进 chain」；chain 实际编码 `"phases/phase-hitl2.md": { "passed": "phases/phase-readiness.md", "rerun": "phases/phase-rerun.md" }`。
- 风险：agent 按 README 以为 rerun 路由自己决定，而 `advance-status` 实际会解析 chain。
- 修复方向：改 README 一句（Chain 编码 passed + 已声明的 rerun 分支；未编码分支归 Agent decision authority）；加 drift 测试锁 README 与 chain 一致。

**F-02【中】`RUN.md:38` "CLI-verb spelling" 失真**
- 现象：说 work-unit 面 `repair_kind` 是「CLI-verb spelling」，但 10 值里只有 3 个是 CLI 动词拼写（`recover-transaction`/`recover-declaration`/`supersede`），其余是 snake_case 或裸 `wait`。`tests/engine/work-unit-repair-vocabulary.test.mjs:36` 允许 `[a-z][a-z0-9_-]*`。
- 风险：agent 误以为 `repair_kind` 值可直接当 CLI 动词运行。
- 修复方向：措辞改为「closed enum（部分值即 CLI 动词拼写，映射以 `REPAIR_KIND_CLI_VERB` 与决策表为准）」；顺手让决策表锁测试断言该句措辞。

**F-03【中】`CONTEXT.md:58` 漏指 `engine/work-unit-repair-vocabulary.mjs`**（→ B：CONTEXT 面改动与 F-22/F-23 同批，避免跨 change 同文件冲突）
- 现象：work-unit 面 `repair_kind` 的权威指为「RUN.md 决策表 + 锁定测试」，但引擎唯一真相源现在是 `work-unit-repair-vocabulary.mjs`（`RUN.md:53` 明说行集从该模块导出派生）。
- 风险：agent 按 CONTEXT 找词表源头会先读错地方。
- 修复方向：CONTEXT.md:58 权威指针补上词汇模块（保持「同名词典以各自 owner surface 为准」句式）。

**F-04【中】入口指针缺反 fallback 句（`README.md:31` / `RUN.md:59`）**
- 现象：canonical（`continue-run-bundle.md:18-20`）与 harness AGENTS/CLAUDE 禁止「preflight 失败后 fallback 读 `RUN.md`、新建或另选 bundle」；这两个指针面只写「以 `unsupported_current_entry_contract` 停止」，没带反 fallback 澄清。`README.md:31` 的「没有 explicit existing candidate 才读 `RUN.md`」可被误读。
- 风险：preflight 失败的 agent 被诱惑 fallback 到 `RUN.md`——正是 canonical 禁止的分支。
- 修复方向：两处指针各补一句与 harness 行为文件一致的澄清；harness-entry-doc-consistency 测试加断言。

**F-05【低】孤儿 playbook `command_playbook/plan-hostfile-sections.md`**
- 现象：10 个 playbook 之一，全仓库无任何指针指向它；其 renderer 指引内联在 `phase-hitl1.md:119` 与 `COMMANDS.md:69`，且只引 `cli/plan-hostfile-sections.mjs`（CLI），不引 playbook。
- 风险：沿指针链阅读的 agent 永远发现不了这份 playbook（死重）。
- 修复方向：propose 时二选一定夺——retire 该 playbook（renderer 指引已由 CLI/phase 文档覆盖），或挂指针。倾向 retire。

**F-06【低】`persist-artifact.md:80` 的 `(--expect-absent | --expect-sha256 <digest>)` 记法**
- 现象：`persist-final-report` 唯一出现的形态用了 `(A | B)` 记法——shell 里是子 shell 管道，不可直接粘贴。
- 风险：agent 必须手工展开二选一，多了猜一步。
- 修复方向：给两个完整可复制形态（照 generic `persist` 的写法 `persist-artifact.md:14-28`）。

**F-07【低】`operate-work-unit.mjs:3` 过期头注释 + `COMMANDS.md:89` verb 清单缺 `timeout-preflight`**
- 现象：头注释说「terminal commands are added in later apply sections」，但 `fail/timeout/abandon` 已在 `:228-240` 实现；verb 清单缺已实现的 `timeout-preflight`（仅 `COMMANDS.md:128` 散文提及）。
- 风险：agent 以为功能没实现而绕路。
- 修复方向：删过期注释；verb 清单补 `timeout-preflight`；drift 测试锁 CLI verb 清单 = 实现。

**F-08【低-中】语言约定未在 root 层声明，且执行面不统一**
- 现象：约定（精确 token 英文、推理中文、同一控制面不混用）只在 `DEEP_RESEARCH_HARNESS/README.md:7` 声明；`RUN.md:11` 声称「任意 coding agent 通用」；10 个 playbook 里 8 个用英文推理，`post-final-recovery.md:69` 同一文档内混语。
- 风险：英文优先宿主（Cursor/Windsurf）对中文推理正文付出理解税；agent 不知道混写是否合规。
- 修复方向：root 层补一句全局语言约定声明（CONTEXT.md 或根 README）；`post-final-recovery.md:69` 统一为单主语言；对 playbook 语言给出明确规则（推荐：新写推理用中文，已有英文面逐步归一，不强行一次全改）。

### 引擎死重与真相源（→ B）

**F-09【高】死代码还活着**
- 现象（2026-08-16 全仓 grep 验证）：
  - `engine/esm-dirname.mjs` 生产零引用（仅自测 import），且其「Do NOT hand-roll fileURLToPath」与 engine 各处手写 `fileURLToPath`（如 `gate-helpers-core.mjs:26`）矛盾；
  - `queue-manager-core.mjs:226` `advice()`、`queue-manager-lifecycle.mjs:557` `makeItem`、`queue-manager-window.mjs:16` `rank()` 全仓无 import；
  - `queue-manager-ledger.mjs:8` `OutputDeclarationLedgerRecord` 零 import（仅 `tests/.test-tmp/` 冻结副本）；
  - `work-unit-repair-vocabulary.mjs:20,24` `WORK_UNIT_REPAIR_KINDS`/`REPAIR_KIND_CLI_VERB` 生产零 import（仅锁定测试引用——这是"测试专用导出"合理，但头注释应说清）。
- 风险：agent 改代码会被死代码误导（以为有第二路径/第二真相源）。
- 修复方向：retire（删模块/导出）；测试专用导出改为显式命名或注释声明；新增一条「死导出零引用」静态检查（模式现成：validate-work-unit-hygiene）。

**F-10【高】"唯一真相源"被违反：enum/schema 双定义 + helper 重复**
- 现象：`queue-manager-core.mjs:56-57` 本地重定义 `QueueHealth`/`StopAuthorizationState`，与 `schema/enums.mjs:20,27` 重复；queue 由两套 schema 校验（`contracts/queue.mjs` `QueueSchema` vs 本地 `QueueStateSchema`）；`submitRerun` 在 `work-unit-submit-integrity.mjs:15` 与 `work-unit-attempt-disposition.mjs:15` 重复实现。
- 风险：改一处另一处漂移——正是项目教义要杜绝的事。
- 修复方向：engine 改 import `schema/enums.mjs`；`QueueStateSchema` 与 `QueueSchema` 的差异显式收敛或注释声明用途；`submitRerun` 合一。

**F-11【中】CLI 路径魔法字符串 29 处**
- 现象：`DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs`/`operate-queue.mjs` 路径在 11 个 engine 模块硬编码 29 处；已有 `logCliPath()`（`work-unit-utils.mjs:105`）但仅一处用。
- 风险：改 CLI 位置/名字时批量漏改。
- 修复方向：收敛到常量表（`work-unit-constants.mjs` 或 utils 导出）。

### 治理机制缝（→ A）

**F-12【高】RET-006 硬门清单（5 项）与真实 finalizer（16 步）脱节**
- 现象：`openspec/specs/governance/requirement-traceability/spec.md:308-314` 把归档硬门列为 5 个 checker；真实 `openspec/governance/finalize-change-archive.mjs:71-89,350-440` 的 `CheckSchema` 枚举 16 步检查。spec 还提「delegated-work hygiene check」为硬门，实际它是 CLI+测试、不在 finalizer 16 步里。
- 风险：**定义"检查是硬门"的 spec 本身与机器不一致**——traceability 最伤信心的点；agent 按 spec 自测会漏 11 项。
- 修复方向：spec 把清单改为指针「硬门清单以 finalizer `CheckSchema` 为唯一真相源」，不手抄列表；spec 中 hygiene 措辞改述为正确归属。

**F-13【高】guidance 散文中的 requirement ID 无校验**
- 现象：`check-project-reqs.mjs:209-266` 只扫 `openspec/specs` 与 `openspec/changes/<active>/specs`；`invariants-brief.md:26,36,40` 等 guidance/operations/models 散文里的 `[A-Z]{3}-\d{3}` 不在任何 checker 范围。
- 风险：agent 在 guidance 里引用不存在的 ID（如 `ZZZ-999`）机器检查全绿——「引用的 ID 一定解析到真实 requirement」信心不成立。
- 修复方向：扩展现有 checker（或新 checker）扫描 guidance/operations/models/constitution 散文的 ID 并对照 registry（DEPRECATED ID 引用也要报警或白名单）。

**F-14【中】无「治理健康检查」单一入口**
- 现象：`openspec/governance/` 下 11 个 `check-*.mjs` 各只有 `// Usage:` 头注释；`tests/governance/README.md:11` 只一句「use the scripts under openspec/governance/」；唯一聚合入口是归档 finalizer（会真的做 native archive，不是日常检查）。`package.json` 无任何 governance script。
- 风险：agent 想自查治理健康只能手工逐个跑。
- 修复方向：新增 `check-all.mjs`（只读、聚合 11 个 checker、聚合退出码 + 每项 PASS/FAIL 汇总），挂 `package.json` script；`tests/governance/README.md` 补索引。

**F-15【中】"非权威 model"走私 MUST/MUST-NOT 规则**
- 现象：`openspec/guidance/models/agentic-execution-model.md:208-221` 有「## 8. MUST / MUST NOT」节 11 条规范性规则，而该文件定位是 non-authoritative model。
- 风险：fresh agent 无法判断这些是行为规则还是术语纪律；spec 变了这份 MUST 不会跟机器走，变成活的过期规则。
- 修复方向：改写为「术语/理解纪律」措辞，或显式标注「本节规范效力以 accepted spec 为准，MUST 仅约束术语使用」；加 drift 测试禁止 model 文档出现 MUST/MUST-NOT 规范性句式（或允许但强制带效力声明）。

**F-16【中】spec 结构缺陷**
- 现象：`openspec/specs/bundle/run-entry/spec.md:1`、`openspec/specs/governance/version-management/spec.md:1` 无 `#` 一级标题直接以 `> req:` 开头；`requirement-traceability/spec.md:77-93` 有一句话被插入块拦腰切断。
- 风险：机器检查不报（缺 H1 不在 4 项硬检查里），人和 agent 阅读时断裂。
- 修复方向：补 H1、修复断句；把「必须有一级标题」加进 `check-project-specs.mjs`。

**F-17【低】catalog 缺「accepted vs historical」一句**
- 现象：`openspec/specs/README.md` 没说「这里列的就是当前 accepted；历史/废弃在 `changes/archive/` 与 registry `[DEPRECATED]`」。
- 风险：agent 分不清 catalog 与归档 change 哪个是当前行为。
- 修复方向：catalog 头部补一句。

**F-18【中】spec 结构 lint（防漂移机器化）**
- 现象：结构统一只靠 `check-project-specs.mjs` 的 4 项（Purpose/Requirements/`> req:`/禁 delta 头），H1、标题层级、断句这类不查。
- 修复方向：在 F-16 修复的同时扩展该 checker 的最小结构集（H1 必查、`### Requirement:`/`#### Scenario:` 层级白名单）；长度 lint（>600 行警告）**deferred**，见 §5。

**F-19【低-中】root 层规则重述无 drift guard**
- 现象：根 `README.md` "Rules In One Screen"、`AGENTS.md`/`CLAUDE.md` Hard Rules、`openspec/config.yaml` rules 三处重述工程约束；`check-content-drift.mjs` 扫描面不含根 README/行为文件/config.yaml。
- 风险：改一处其余漂移。
- 修复方向：评估后把根 README/行为文件纳入 drift 扫描面（或加一条"三处 Hard Rules 一致"断言）。若成本高可 deferred。

### 引擎导航（→ B）

**F-20【高】god modules 无导航，公共 API 埋底**
- 现象：`work-unit-submit.mjs`(2446 行，`submitWorkUnit` 在 :2196、`drySubmitWorkUnit` :1785，前 ~1800 行私有 helper 无分节)、`work-unit-lifecycle.mjs`(1234)、`work-unit-supersession.mjs`(1025)、`consistency-validator.mjs`(904)、`work-unit-validation.mjs`(847)、helpers 里 `canonical-topic-state.mjs`(2092)、`gate-helpers-core.mjs`(1442)、`wave-depth-contracts.mjs`(1357)、`gate-helpers-checks.mjs`(1293)、`artifact-persistence.mjs`(1283)、`wave-contract-evaluators.mjs`(1263)、`handoff-helpers.mjs`(1143)、`return-map.mjs`(1030)、`file-observability.mjs`(936) 无 section banner/TOC。正面样板：`gate-fork.mjs`、`ask-next.mjs`（头注释即契约）、`gate-helpers-core.mjs`(:50 起)、`consistency-validator.mjs`(:41 起) 有分节。
- 风险：修「work-unit submission」bug 要通读 1800 行才找到入口。
- 修复方向：**纯注释 change**——每个 god module 加文件头契约注释（职责/公共 API 位置/分节目录）+ section banner；不拆文件（拆分 deferred）。

**F-21【中】四个 work-unit 投影模块边界不清**
- 现象：`work-unit-projection.mjs` vs `work-unit-candidate-projection.mjs` vs `work-unit-current-profile.mjs` vs `work-unit-attempt-disposition.mjs` 名字都含 projection/profile/disposition，仅凭文件名无法区分输入输出；`work-unit-assignment-contract.mjs`(203 行) 头只有 `@impl` 零 prose。
- 风险：agent 靠 grep 而非文件名定位。
- 修复方向：各加一句「输入→输出→谁消费」头注释；`work-unit-assignment-contract.mjs` 补职责 prose。

### 行为契约级（→ B）

**F-22【高】三套同名 `repair_kind` + `missing_contract` 撞义**
- 现象：gate/phase 面 5 值（`schema/contracts/gate-definition.mjs:15-21`）、work-unit 面 10 值（`engine/work-unit-repair-vocabulary.mjs:7-18`）、file-observability 面 6 值（`engine/helpers/file-observability.mjs`），另有 journal 级子集（`work-unit-transaction.mjs:236`）。`missing_contract` 两套撞名不同义。`CONTEXT.md:57-59` 已显式对冲但根因未除。
- 风险：agent 看到 `repair_kind:'missing_contract'` 必须追 emitter 判断归属——真实的歧义税。
- 修复方向：file-observability 面字段改名（如 `repair_directive`），gate/phase 面与 work-unit 面保留（两者已在 CONTEXT 命名「gate/phase 反馈面」vs「work-unit 反馈面」且 owner 清晰）；涉及 spec delta + engine 发射/消费点 + 测试。**唯一动行为契约的 change，最后做。**

**F-23【中】C2/C3/C5 无单一展开定义**
- 现象：`CONTEXT.md:60-64` 已有 compact 行但自认「全仓库无单一展开定义」；三个代号散落 ≥10 个 spec 与 entry 链（RUN.md:30、start-research.md:75、continue-run-bundle.md:83-88）。
- 风险：Final/reentry 场景 agent 对 C5 含义/资格靠推断，容易错误触发 post-final recovery。
- 修复方向：CONTEXT.md 加 C-series 展开小节（各自是什么 event/checkpoint、owner spec、资格判定指向）——CONTEXT 是强制预读且是全项目唯一术语对齐点，放这里即可。

---

## 2. Change 打包（2 个 bounded change，串行；数量最小化）

> 依据：change 生命周期开销高（propose/polish/explore/apply/finalizer 16 步 + 人工 review），
> 因此把同主题、同风险档的 findings 合并为 2 个 change，宁可单 change 大一点，也不多开 lifecycle。
> 失败隔离靠 tasks 分组：每个 task 独立 done condition、可单独 verify，分组顺序先低风险后行为级。

| # | Change 名（建议） | 覆盖 findings | 面 | 关键风险/备注 |
|---|---|---|---|---|
| A | `repair-doc-and-governance-drift-and-machine-gaps` | F-01, F-02, F-04~F-08, F-12~F-19 | 文档 + openspec 治理 | 全部文档级 + 治理脚本新增；tasks 按 surface 分组（harness docs / specs / governance tooling / tests）；F-13/F-14/F-18 新增 checker 需过 design review（semantic precision 三连）；F-12 只改指针不重抄清单；F-05 在 propose 时定夺 retire vs 挂指针；F-08 只加声明与单点统一，不强行全改英文面 |
| B | `cleanup-engine-surface-and-disambiguate-repair-kinds` | F-03, F-09~F-11, F-20~F-23 | engine + CONTEXT + file-observability spec | tasks 顺序：先死代码 retire → 再导航注释 → 最后 repair_kind 面改名（唯一行为变更，带 spec delta）；CONTEXT.md 全部改动（F-03/F-22/F-23）集中在本 change，避免跨 change 同文件冲突 |

顺序理由：A 先清「文档↔现实」矛盾并把治理机器缝补上（后续 change 的 spec 基线与检查都干净）→ B 再做引擎清理与唯一的行为契约消歧（风险最高的殿后）。

---

## 3. 执行节奏

- 串行：先 A 后 B，一次一个 change 走完 propose → polish（强制 gate）→ explore → apply → archive，再开下一个。
- 大 change 的 tasks 按 §2 分组排序：低风险组先行、行为级组殿后；单个 task 的 done condition 独立可 verify，一组失败不阻塞其他组。
- 每个 change 的 tasks 带明确 done condition + 两条收尾检查 task（`check-project-reqs.mjs --mode archive` + `check-project-specs.mjs`，见 `openspec/config.yaml` rules）。
- 每个 change apply 后、archive 前跑全量 `npm test`（基线 2913/0 fail，只增不减）。
- 涉及 `openspec-feedback:*` marker 的 change 按 `openspec/operations/change-feedback-loop.md` 执行。

## 4. 关闭标准

1. A~B 全部经 `finalize-change-archive.mjs` 归档（16 步 finalizer 通过）。
2. F-01~F-23 全部 closed；F-05 的 retire/挂指针决策已落。
3. `npm test` 全绿且测试数 ≥ 基线 + 新增 drift guard。
4. `node openspec/governance/check-all.mjs`（Change A 新增）跑通。
5. Deferred 清单（§5）保持显式记录。

## 5. Deferred（P2，不进本波次）

- **CLI invocation/exit 统一**：24 个 CLI 文件 ~200 处 `process.exit` 手写、exit 2 语义不一致（`operate-work-unit.mjs` 调用错误 exit 1）。理由：改造量大、回归风险真实；Change B retire 后再评估，且只做「统一 exit 2 语义 + 新 CLI 强制共享 helper」的渐进版。
- **god module 拆分**：Change B 只加导航注释；真正拆文件（如 `work-unit-submit.mjs` 2446 行）单独 change。
- **spec 长度 lint / 超长 spec 拆分**：82 spec 共 28,994 行、最长 `delegated-work-units/spec.md` 2274 行；先上结构 lint（F-18），长度治理另行评估。
- **root 规则重述 drift guard**（F-19 若 Change A 评估成本过高则落入此处）。
