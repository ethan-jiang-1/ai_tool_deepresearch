# 将项目 Guidance 集中到 OpenSpec 治理罩下

> 计划记录: 2026-08-09
> Plan ID: `centralize-project-guidance-under-openspec`
> 状态: done；Change A 与 Change B 均已归档，计划索引与归档移动已完成
> 目标 change 候选名: `centralize-project-guidance-under-openspec`
> Progressive tracker: [`centralize-project-guidance-under-openspec-progressive-plan.md`](centralize-project-guidance-under-openspec-progressive-plan.md)

## 1. 结论先行

### 交付状态（2026-08-10）

Change A `centralize-project-guidance-under-openspec` 已通过受治理的 finalizer 归档至
[`openspec/changes/archive/2026-08-10-centralize-project-guidance-under-openspec/`](../../../openspec/changes/archive/2026-08-10-centralize-project-guidance-under-openspec/)。
它完成了 guidance 拓扑迁移，并将 feedback-lifecycle 的项目特定 operation guidance 保留在
`openspec/config.yaml` 的 `operations` 配置中；既有 `.agents/skills/**` 与 `.claude/skills/**`
未被作为迁移目标或改写。

迁移后的观察表明，固定 Charter + Context 入口仍为 866 行 / 6,194 词，且
`openspec/README.md` 仍同时充当阅读清单和 glossary。因此 P5 对
`prune-and-automate-project-guidance` 记录 `go`：它只收敛内容 ownership、入口路由和可确定性
检查，不重做已关闭的路径迁移或修改既有 skill 资产。详见 progressive tracker 的 `E-009`、`E-010`
和 `D-009`、`D-010`。

**最终交付（2026-08-10）：** Change B 已由受治理 finalizer 归档至
`openspec/changes/archive/2026-08-10-prune-and-automate-project-guidance/`。它将 Charter、Context
和控制图分别缩减至 100/74/52 行，保留 `openspec/config.yaml` 的 operation delivery，新增了仅
覆盖当前 guidance topology 的静态契约，并通过 39/39 个选定 integration 测试及全部 finalizer
检查。两个 change 都没有修改 `.agents/skills/**` 或 `.claude/skills/**`；详细证据分别位于两个
OpenSpec archive 及 progressive tracker 的 E-009、E-015、E-016。

本计划建议把当前根目录 `guidelines/` 纳入 `openspec/`，但不做简单的
`guidelines/ -> openspec/guidelines/` 平移。真正目标是让 `openspec/` 成为项目治理的
单一实现中心，并按职责把当前扁平 guidance suite 拆成三个不同表面：

1. `constitution/`: 稳定项目宪法、权威边界和演进方向；
2. `guidance/models/`: 帮助 Agent 与维护者理解系统的概念模型；
3. `operations/`: OpenSpec lifecycle、实验、日志/诊断等可执行操作指导。

根 `AGENTS.md`、`CLAUDE.md`、`README.md` 和 `CONTEXT.md` 不应被误认为第二套治理中心。
它们保留在根目录，是因为 Coding Agent、Claude Code、技能和人类读者需要稳定的自动发现
入口。它们应成为薄的 entry adapter，把任务路由到 `openspec/` 下的真实治理表面。

本计划明确不建议新增一个泛化的 `guardrails/` 目录：

- 能够确定性检查的约束应由 accepted spec、schema、governance checker 或测试拥有；
- 需要人/Agent 设计判断的内容属于 constitution 或 guidance；
- 描述步骤和完成条件的内容属于 operations 或 operation skill；
- 仅靠 Markdown 提醒却命名为 guardrail，会模糊 guidance 与机器裁决之间的权威差异。

## 2. 为什么现在值得做

### 2.1 OpenSpec 已经是实际工程主干，但目录入口仍然分裂

项目已经明确采用以下生命周期：

```text
Explore -> Propose -> Apply -> Archive
```

Accepted behavior、change artifacts、governance checks、requirement registry 和 finalizer 都已位于
`openspec/`。但项目原则、机制模型、操作 guidance 仍位于根 `guidelines/`，导致读者先在两个
顶层控制区之间选择，再判断哪一个拥有真实权威。

将 guidance 纳入 `openspec/` 可以让项目结构直接表达：

```text
openspec/
  constitution   项目为什么这样工作、哪些边界长期成立
  guidance       如何理解系统
  operations     Agent 如何执行项目 lifecycle 工作
  governance     哪些项目纪律由机器检查
  specs          已接受行为
  changes        正在演进的行为
```

### 2.2 当前 `guidelines/` 已经混合了至少三种职责

当前目录共有 13 个 Markdown 文件，约 3,100 行。它们不是同一种文档：

- `project-charter.md` 与三个 evolution directions 是 constitutional review laws；
- execution/workflow/queue/subagent/runtime boundary 是概念模型和机制解释；
- change feedback、command experiments、logging 是操作或当前行为说明。

把这三类文档都放在同一扁平目录，并要求它们使用同一种 `defers_to` 与 sibling 关系，已经
开始产生结构冲突。

### 2.3 当前已有一个可复现的 hierarchy drift

2026-08-09 运行：

```bash
node --test \
  tests/integration/md/evolution-direction-governance.test.mjs \
  tests/integration/md/agent-context-routing-contract.test.mjs
```

结果为 10 项通过、1 项失败。失败原因是：

```text
guidelines/change-feedback-loop.md must defer only to Project Charter
```

`change-feedback-loop.md` 实际需要指向：

- Project Charter；
- accepted `governance/change-feedback-loop` spec；
- governed archive finalizer。

这不是简单漏写 frontmatter，而是职责证据：`change-feedback-loop.md` 是 operation guidance，
不是 Charter 的同层 constitutional companion。正确修复应是让测试与目录认识不同文档角色，
而不是把 operation guidance 强行伪装成 Charter-only peer。

### 2.4 强制入口的上下文负载已经偏重

当前每个 substantive repository task 至少强制读取：

- `guidelines/project-charter.md`: 397 行；
- 根 `CONTEXT.md`: 487 行。

合计约 884 行，尚未开始读取任务相关 spec、change、实现或测试。Charter、Guidelines Index、
OpenSpec config 和 Context 还存在部分重复的 authority map、执行模型、术语和阅读路由。

移动目录本身不会解决这个问题。迁移后需要单独进行一次内容瘦身：

- mandatory entry 只保留每个任务都需要的原则和路由；
- task-specific 模型通过明确 trigger 按需读取；
- 可从 config、目录、CLI 或 accepted spec 直接查出的事实不再被 prose 缓存；
- 每个含义只保留一个 Source of Record。

## 3. 设计目标

### 3.1 必须达到

- `openspec/` 成为项目规则、宪法、模型、operations、governance、spec 和 change 的共同上层。
- 根 Agent 行为文件只承担自动发现、硬环境约束和进入 OpenSpec 的路由。
- guidance、operation guidance、accepted behavior 和 deterministic governance 在目录上可区分。
- Charter 仍是 constitutional hierarchy 的唯一根，不被 OpenSpec config 或 capability spec 取代。
- Accepted specs、executable contracts 和 runtime truth 继续裁决各自事实，不因目录移动改变权威。
- 迁移更新所有 current/live 引用、测试和 operation skills。
- archived OpenSpec changes 保持历史原貌，不进行全仓字符串重写。
- 迁移后不得存在两份可漂移的 Charter 或 guidance mirror。
- 后续新文档能够通过角色判断进入明确目录，而不是继续堆入一个 catch-all bucket。

### 3.2 希望达到

- 缩小每个 substantive task 的固定上下文负载。
- 让 OpenSpec proposal author 能快速判断应该读 constitution、model、operation 还是 spec。
- 让确定性约束逐步进入 checker/test，而不是继续积累 Markdown MUST/MUST NOT。
- 让 guidance tests 按角色递归扫描，而不是假设所有 Markdown 都位于一个扁平目录。
- 让 `openspec/README.md` 成为简洁路由器，而不是另一个大型 glossary。

## 4. 非目标

本计划不授权以下工作：

- 不在规划阶段修改 `DEEP_RESEARCH_HARNESS/`、`tests/` 或其他 target code。
- 不用目录移动偷偷改变 capability behavior、schema、CLI、Gate、receipt 或 trace contract。
- 不把所有 guidance 机械转成 validator；语义判断仍由 Agent/人完成。
- 不把 `docs/adr/` 并入 OpenSpec。ADR 继续记录 durable rationale，而不是当前行为或指令。
- 不删除根 `CONTEXT.md`，也不创建 Harness-local glossary。
- 不把 archived OpenSpec artifacts 中的旧路径改写成新路径。
- 不为旧路径长期保留一套完整镜像、symlink tree 或 duplicate compatibility source。
- 不在同一次机械迁移中重写全部 3,100 行正文。
- 不因为名称包含 `constitution` 就把 guidance 提升为 runtime 或 behavior authority。

## 5. 术语和职责

| 名称 | 在本计划中的含义 | 拥有什么 | 不拥有什么 |
|---|---|---|---|
| Constitution | 长期有效、实现中立的项目边界与设计审查原则 | 项目姿态、authority split、演进方向 | capability behavior、runtime truth |
| Guidance model | 帮助读者对系统形成精确概念模型的按需文档 | 术语、关系、推理停止点 | schema/CLI/Gate verdict |
| Operation guidance | Agent 执行项目操作时读取的步骤、输入边界和完成条件 | procedure 和 reader route | permission、semantic verdict、archive authority |
| Governance | 项目级机器检查、registry、finalizer 和结构 contract | deterministic project checks | 研究语义判断、Agent flow |
| Accepted spec | 已接受 observable behavior 的 Source of Record | capability requirements | 当前 runtime state |
| Root adapter | Agent 或人自动发现的薄入口 | instruction discovery 和路由 | 第二套治理内容 |

### 5.1 为什么不用 `guardrails/`

`guardrail` 只有在读者能明确回答“谁执行、失败怎样表现、哪个结果是 authority”时才有价值。
否则它只是一个更强硬的 guideline 名称。本项目已经拥有更准确的三个词：

```text
guidance   -> 提供判断与理解
spec       -> 定义已接受行为
governance -> 执行确定性项目检查
```

因此本计划保留这些现有概念，不再增加第四个语义重叠的 catch-all 名称。

## 6. 建议目标拓扑

```text
repo-root/
├── AGENTS.md                         # Codex discovery adapter
├── CLAUDE.md                         # Claude discovery adapter
├── README.md                         # human orientation adapter
├── CONTEXT.md                        # root shared vocabulary interface
├── docs/
│   └── adr/                          # durable rationale, on demand
└── openspec/
    ├── README.md                     # project control map and trigger router
    ├── config.yaml                   # OpenSpec artifact context/rules
    ├── constitution/
    │   ├── project-charter.md
    │   └── evolution/
    │       ├── abstraction-semantic-precision.md
    │       ├── simple-reliable-control.md
    │       └── helper-oriented-agent.md
    ├── guidance/
    │   └── models/
    │       ├── framework-runtime-boundary.md
    │       ├── agentic-execution-model.md
    │       ├── agentic-workflow-mechanism.md
    │       ├── agentic-queue-mechanism.md
    │       └── agentic-subagent-mechanism.md
    ├── operations/
    │   ├── change-feedback-loop.md
    │   ├── command-experiments.md
    │   └── logging-conventions.md
    ├── governance/                   # existing deterministic extensions
    ├── specs/                        # existing accepted capabilities
    └── changes/                      # existing active/archive changes
```

### 6.1 关于文件名

第一阶段建议尽量保留现有文件名，只改变目录归属。以下更精确的重命名可以在内容瘦身阶段再
决定，避免 `git mv` 和语义改写混在同一个 diff：

- `agentic-workflow-mechanism.md` -> `chain-model.md`；
- `agentic-subagent-mechanism.md` -> `work-unit-model.md`；
- `logging-conventions.md` -> `runtime-observability.md`；
- `command-experiments.md` -> `experiment-authoring.md`。

只有当正文也已经收敛到新名称的 bounded question 时才应重命名，不能只为了目录美观创造
另一个术语层。

## 7. 当前文件的建议归类

| 当前文件 | 当前主要角色 | 第一阶段目标 | 第二阶段处理 |
|---|---|---|---|
| `guidelines/README.md` | suite index + glossary + route | `openspec/README.md` | 缩成 trigger router，移除重复 glossary |
| `guidelines/project-charter.md` | repo-wide charter | `openspec/constitution/project-charter.md` | 缩短 mandatory core，细节下沉 |
| `guidelines/evolution-abstraction-semantic-precision.md` | constitutional direction | `openspec/constitution/evolution/abstraction-semantic-precision.md` | 保留 EWD 340 原文与 bounded reflection |
| `guidelines/evolution-simple-reliable-control.md` | constitutional direction | `openspec/constitution/evolution/simple-reliable-control.md` | 去除可由下游 contract 决定的当前细节 |
| `guidelines/evolution-helper-oriented-agent.md` | constitutional direction | `openspec/constitution/evolution/helper-oriented-agent.md` | 保留责任分配，不扩成 permission system |
| `guidelines/framework-runtime-boundary.md` | architecture/model guidance | `openspec/guidance/models/framework-runtime-boundary.md` | 分离稳定模型和当前路径缓存 |
| `guidelines/agentic-execution-model.md` | terminology/model canon | `openspec/guidance/models/agentic-execution-model.md` | 与 `CONTEXT.md` 去重，保留完整模型 |
| `guidelines/agentic-workflow-mechanism.md` | Chain mechanism model | `openspec/guidance/models/agentic-workflow-mechanism.md` | 评估改名 `chain-model.md` |
| `guidelines/agentic-queue-mechanism.md` | Queue mechanism model | `openspec/guidance/models/agentic-queue-mechanism.md` | 当前行为细节回到 accepted specs |
| `guidelines/agentic-subagent-mechanism.md` | Work Unit/Sub-agent model | `openspec/guidance/models/agentic-subagent-mechanism.md` | 评估以 Work Unit 为主名称 |
| `guidelines/change-feedback-loop.md` | OpenSpec operation guidance | `openspec/operations/change-feedback-loop.md` | 保留 spec/finalizer 路由，不进入 Charter-only peer test |
| `guidelines/command-experiments.md` | experiment operation guidance | `openspec/operations/command-experiments.md` | 只保留作者/执行者需要的步骤和判断 |
| `guidelines/logging-conventions.md` | operation guide + behavior cache | `openspec/operations/logging-conventions.md` | concrete envelope/API 由 accepted spec 拥有，operation doc 只讲使用路径 |

## 8. Authority 模型保持不变

目录迁移后仍应使用以下裁决关系：

```text
Root adapters
  -> 告诉 Agent 先读什么、何时进入哪个 OpenSpec surface

OpenSpec constitution
  -> 决定长期项目姿态和设计审查边界

OpenSpec guidance/models
  -> 提供理解当前系统所需的概念模型

OpenSpec operations
  -> 提供当前 Agent 操作步骤与 completion criteria

OpenSpec specs
  -> 裁决已接受 capability behavior

Executable implementation + tests
  -> 实施并验证 executable contracts

Selected current run bundle
  -> 裁决当前 research run runtime truth
```

任何目录名都不得改变上述 Source of Record。特别是：

- `openspec/constitution/` 不是 accepted behavior spec；
- `openspec/operations/` 不是 permission 或 archive verdict；
- `openspec/governance/` 不做语义研究判断；
- `openspec/README.md` 不成为第二份 config 或 glossary。

## 9. Root adapter 策略

### 9.1 必须保留的根入口

以下文件应留在根目录，因为它们是工具或读者的发现接口：

- `AGENTS.md`；
- `CLAUDE.md`；
- `README.md`；
- `CONTEXT.md`。

### 9.2 它们应该承担的最小职责

`AGENTS.md` / `CLAUDE.md`：

- 项目一句话定位；
- 必须使用的语言、依赖和测试技术；
- OpenSpec phase gate；
- 禁止读取的路径；
- Charter -> Context 的顺序路由；
- Deep Research Harness 特殊入口路由。

根 `README.md`：

- 人类项目定位；
- 目录选择入口；
- Charter -> Context 路由；
- 不复制整个 OpenSpec control map。

根 `CONTEXT.md`：

- 项目 shared language；
- 每个术语的简短区分；
- 指向完整 model canon、Charter 和可选 ADR；
- 不定义 behavior 或 operation steps。

### 9.3 不建议使用的兼容方案

- 不保留完整的根 `guidelines/` mirror；
- 不让旧路径和新路径同时成为 supported entry；
- 不用 symlink 掩盖双重入口；
- 不复制 Charter 到根和 OpenSpec 两处。

若确有外部消费者无法原子更新，应在 proposal 中列出具体消费者及有界迁移期，而不是预设一个
永久 redirect。当前仓库内 live references 应在同一 apply 中原子更新。

## 10. 已知影响面

### 10.1 Root 与 Harness entry documents

至少需要检查并更新：

- `AGENTS.md`；
- `CLAUDE.md`；
- 根 `README.md`；
- `CONTEXT.md`；
- `DEEP_RESEARCH_HARNESS/AGENTS.md`；
- `DEEP_RESEARCH_HARNESS/CLAUDE.md`；
- `DEEP_RESEARCH_HARNESS/README.md`；
- `DEEP_RESEARCH_HARNESS/COMMANDS.md`。

Harness entry 仍必须先回到父项目 Charter，再读根 Context；迁移不得改变 `RUN.md` 与
`continue-run-bundle.md` 的研究入口选择。

### 10.2 OpenSpec configuration and accepted specs

至少需要检查：

- `openspec/config.yaml` 中 evolution triad、runtime boundary、experiments 和 feedback guidance 路径；
- `openspec/specs/governance/guidance-constitution/spec.md`；
- `openspec/specs/agent/agent-context-routing/spec.md`；
- `openspec/specs/governance/change-feedback-loop/spec.md`；
- `openspec/specs/engine/logging-conventions/spec.md`；
- capability catalog / requirement registry 中与 modified capability 对应的记录。

预期主要是 Modified capabilities，不应仅因目录移动创建重复 capability：

- `governance/guidance-constitution`；
- `agent/agent-context-routing`；
- `governance/change-feedback-loop`，仅当 supported operation path contract 发生可观察变化；
- 其他 capability 只有在 accepted behavior 确实变化时才声明 Modified。

### 10.3 Operation skills

当前 apply/archive skills 直接读取 `guidelines/change-feedback-loop.md`，至少包括：

- `.agents/skills/openspec-apply-change/SKILL.md`；
- `.agents/skills/source-command-opsx-apply/SKILL.md`；
- `.agents/skills/openspec-archive-change/SKILL.md`；
- `.agents/skills/source-command-opsx-archive/SKILL.md`；
- 对应 `.claude` supported entry surfaces。

迁移不得只改 `.agents` 而让 `.claude` entry drift。Accepted change-feedback contract 中的
`SUPPORTED_ENTRY_SURFACES` 仍是 supported entry inventory authority。

### 10.4 Focused regressions

至少需要更新或重新评估：

- `tests/integration/md/evolution-direction-governance.test.mjs`；
- `tests/integration/md/agent-context-routing-contract.test.mjs`；
- `tests/integration/md/verification-routing-knowledge-surfaces.test.mjs`；
- `tests/integration/md/agent-experiment-autorun-terminology.test.mjs`；
- `tests/integration/governance/change-feedback-finalizer.test.mjs`；
- 任何读取具体 guidance path 的 focused regression。

### 10.5 Historical references

`openspec/changes/archive/` 中包含大量 `guidelines/...` 历史引用。默认策略：

- 不修改 archived artifacts；
- live-reference checker 明确排除 archive；
- 历史文档按当时路径解释；
- Git history 负责恢复旧文档，不为 archive 建兼容 mirror。

## 11. OpenSpec change 划分

建议拆成两个有界 change。这样可以保持 rename diff 可审查，也避免一次性把 topology、语义、
自动化和内容删改揉成 mega-change。

## Change A: `centralize-project-guidance-under-openspec`

### 目标

建立目标目录职责，原子迁移 current guidance，更新 accepted path contracts、entry adapters、
skills 和 focused regressions。除职责澄清与路径契约外，尽量不改正文语义。

### 预期 delta specs

- Modified `governance/guidance-constitution`；
- Modified `agent/agent-context-routing`；
- 根据 capability discovery 决定是否需要 Modified `governance/change-feedback-loop`；
- 不为纯文件移动创建没有 observable behavior 的 capability。

### 主要任务

1. 使用 OpenSpec CLI scaffold change，不手建 active change directory。
2. 完成 capability discovery，读取 main spec catalog 和候选 specs。
3. 在 proposal 中明确这是 project-control topology migration，不是 Harness behavior change。
4. 在 design 中记录：
   - semantic precision: 每个新目录回答哪个读者的哪个 bounded question；
   - simple reliable control: 一个 canonical path、无长期 mirror、无重复 router；
   - helper responsibility: Agent 执行机械迁移，用户只决定结构语义；
   - root adapters 与 OpenSpec implementation center 的关系。
5. 创建 change-root verification plan 和 semantic-closure record。
6. 修改 delta specs，使 constitutional hierarchy 可以递归位于 `openspec/constitution/`，并让
   operations 不再被当作 Charter-only peers。
7. 使用 `git mv` 迁移 current files，保留历史和 blame 可读性。
8. 更新 frontmatter：
   - `scope`；
   - `defers_to`；
   - `siblings`；
   - internal relative links；
   - suite identity / role names。
9. 更新 root/Harness adapters、Context links 和 OpenSpec config。
10. 更新 apply/archive operation skill paths，并保持 supported entry pairs 同步。
11. 把 guidance topology regression 改为 role-aware recursive scan：
    - constitution hierarchy 扫 `openspec/constitution/**/*.md`；
    - guidance model navigation 扫 `openspec/guidance/**/*.md`；
    - operation guidance 由其 owning contract 单独检查；
    - 不再把 `openspec/README.md`、operations 和 constitution 强行视作同一 peer set。
12. 更新所有 current/live path assertions。
13. 扫描 live surfaces 中残留的 `guidelines/` 引用，明确排除 archive 和用户指定的历史材料。
14. 删除空的根 `guidelines/`，不留下双重 source。
15. 运行 selected regressions、OpenSpec validation 和 project governance checks。

### Change A 完成条件

- 根 `guidelines/` 不再作为 current surface 存在；
- 新拓扑中的每个文档只有一个 canonical path；
- root/Harness entry 的 Charter -> Context 顺序仍通过 regression；
- operation skills 能从新路径取得 feedback guidance；
- constitutional triad 顺序和 Charter root 仍由 focused regression 保护；
- current/live surfaces 无旧 `guidelines/` 路径；
- archived changes 未被机械改写；
- 当前 `change-feedback-loop` hierarchy failure 被角色正确分类所消除，而不是删除其真实依赖；
- 没有对 Harness runtime behavior 作未被 delta spec 覆盖的改变。

## Change B: `prune-and-automate-project-guidance`

### 目标

在路径稳定后，减少 mandatory context、消除重复 truth、把确定性结构约束交给 governance tests，
并使每个 Agent-facing 文档拥有清晰 trigger 和 completion boundary。

### 主要任务

1. 对 Charter 逐节做 constitutional admission review：
   - 删除实现名后仍有效吗；
   - 是否约束 invariant 而不是 selected mechanism；
   - 是否能拒绝未来同类坏设计；
   - 是否有清晰反例或边界。
2. 把 Charter 缩为所有 substantive tasks 都需要的最小 core：
   - 项目本质；
   - Agent/Markdown/Engine/runtime authority split；
   - evidence honesty；
   - OpenSpec lifecycle；
   - 触发式阅读路由。
3. 把 `openspec/README.md` 缩为短 router：
   - “你正在做什么” -> “读哪个 surface”；
   - 不重复 glossary、directory manifest 或 accepted behavior。
4. 比较 Charter、Context、OpenSpec config 和 model canon：
   - 每个术语保留一个完整定义；
   - 其他位置只保留 trigger pointer 或压缩 orientation；
   - 删除容易过时的目录/API 缓存。
5. 审查 `logging-conventions.md`：
   - concrete envelope、level enum、CLI flag、exit behavior 由 accepted specs/executable docs 拥有；
   - operation guide 只保留何时记录、如何诊断、读哪个 authority；
   - 如果删减后不再提供独立 leverage，则删除 operation doc，直接由 trigger 指向 accepted surfaces。
6. 审查三个 agentic mechanism 文件：
   - 保留跨 capability 的概念模型；
   - current fields/commands/line-level facts 回到 specs 和 executable surfaces；
   - 评估 Chain/Queue/Work Unit 的命名是否已形成更精确的 reader stop point。
7. 把可确定性验证的规则转为 focused governance checks：
   - canonical path uniqueness；
   - role-specific frontmatter；
   - broken internal link；
   - root adapter route order；
   - forbidden duplicate mirrors；
   - live old-path references。
8. 不把以下内容转成机械 verdict：
   - semantic precision reflection 的质量；
   - abstraction 是否真正有意义；
   - research evidence 的语义充分性；
   - helper responsibility 的具体风险决定。
9. 测量瘦身结果并记录：
   - mandatory Charter 行数/字数；
   - Charter + Context 固定负载；
   - root adapter 行数；
   - 删除的 duplicate definitions；
   - 新增 pointer 的 trigger branches。

### Change B 完成条件

- mandatory entry 明显短于当前 884 行固定读取组合，且没有丢失 accepted route requirements；
- Charter、Context、config、models 和 specs 不再完整重复同一含义；
- 每个 operation doc 都有明确 reader、trigger、steps 和 completion criteria；
- 每个 model doc 都回答一个 bounded question，并允许读者在该层得出 precise conclusion 或 unknown；
- 确定性 topology 由测试保护，语义判断仍留给 Agent/人；
- 删除文档时没有遗留断链或隐藏 required procedure。

## 12. Change A 的推荐执行顺序

```text
Resolve OpenSpec context
  -> Capability discovery
  -> Proposal / delta specs / design / tasks
  -> Plan-review marker complete
  -> Verification + semantic-closure plan checks
  -> Create target directories
  -> git mv canonical documents
  -> Repair frontmatter and internal navigation
  -> Update root/Harness adapters and Context
  -> Update config, skills, accepted path consumers
  -> Update role-aware regressions
  -> Scan live old-path references
  -> Run focused tests and governance checks
  -> Closeout review
  -> Sync specs
  -> Governed finalizer
```

顺序要求：

- 先修改 active delta contract，再在 Apply 中触碰 target files；
- 先移动 canonical files，再修复引用，避免产生两套长时间共存的 source；
- 先修 root adapters，再执行需要重新进入仓库的 Agent flow 验证；
- 测试应验证最终角色模型，不应先用兼容 shim 让旧假设继续通过；
- archive 前重新扫描 actual diff，确保没有把历史 archive 纳入迁移。

## 13. 验证策略

### 13.1 Deterministic integration coverage

| 风险 | 验证 |
|---|---|
| Charter/Context 路由丢失或反序 | 更新 `agent-context-routing-contract.test.mjs` |
| Constitution triad 断裂 | 更新 `evolution-direction-governance.test.mjs` |
| Operations 被误当 constitution peer | role-aware scan + change-feedback focused test |
| Apply/archive skill 仍读旧路径 | finalizer supported-entry conformance test |
| Experiments guidance 路径断裂 | experiment terminology/knowledge-surface tests |
| Verification docs 路径断裂 | verification routing knowledge-surface test |
| live surface 保留旧路径 | bounded old-path reference scan |
| internal Markdown link 断裂 | recursive link existence check，若已有 checker 则复用 |
| 双重 canonical source | assert root `guidelines/` absent after migration |

### 13.2 OpenSpec/governance checks

实际命令以 change instructions 和 repository current scripts 为准，至少覆盖：

- strict OpenSpec validation；
- requirement traceability；
- main-spec structure；
- capability taxonomy；
- capability discovery；
- verification-routing plan/assets；
- semantic-closure plan/assets；
- selected focused `node:test` regressions。

### 13.3 不允许的证明替代

- `git mv` 成功不证明 entry routing 正确；
- `rg` 无旧路径不证明 Markdown links 全部可达；
- frontmatter parse 通过不证明 hierarchy 语义正确；
- fixture 文档通过不证明真实 Agent 一定读取；
- 用户同意目录树不替代 accepted spec 修改；
- archived artifacts 仍含旧路径不应被误报为 current migration failure。

## 14. Live reference 扫描策略

迁移必须显式区分 current/live 和 historical：

### 扫描 current/live

- root behavior/orientation files；
- `CONTEXT.md`；
- `openspec/config.yaml`；
- live main specs；
- active changes；
- current `.agents` / `.claude` operation entries；
- `DEEP_RESEARCH_HARNESS/` current docs；
- `tests/`；
- `experiments_playbook/` 和 `experiments_env/` 中的 current knowledge pointers。

### 默认排除

- `openspec/changes/archive/`；
- `_backlog/` 中未被本 change 明确选择的历史/规划材料；
- `_temp/`；
- `.exp-bundles/` 和 run bundle directories；
- `_old_topics`；
- `node_modules/`；
- Git history。

扫描命令和 checker 必须把这些范围编码清楚，不能依靠执行者记忆。

## 15. 风险与缓解

### 风险 1: 把 OpenSpec root 变成另一个杂物箱

缓解：只接受 constitution、guidance/models、operations 三个具有 reader question 的表面；每个新增
文件必须说明角色、reader、trigger 和不拥有的 authority。

### 风险 2: 自定义 OpenSpec 子目录影响 CLI

缓解：在 proposal/apply 前验证 current OpenSpec CLI 对未知 sibling directories 的发现、status、
validate 和 archive 行为；如果 CLI 有保留目录约束，调整为 `openspec/project/` 下的同样分层，
但不退回根部双中心。

### 风险 3: Root bootstrap 形成循环

例如 Agent 需要读 OpenSpec 才知道先读 Charter，而 Charter 又依赖 Agent 已进入 OpenSpec。

缓解：根 `AGENTS.md` 保留一条无歧义的 absolute-repo-relative pointer：先读新 Charter，再读根
Context。OpenSpec README 不负责发现自身。

### 风险 4: 大量 rename 掩盖语义变化

缓解：Change A 保持正文语义，内容瘦身留给 Change B；使用 `git mv`，review 时分别检查 rename、
path repair 和 contract delta。

### 风险 5: 长期兼容 shim 重新制造双 Source of Record

缓解：仓库内 current consumers 原子更新；没有已识别 external consumer 时不保留 shim。需要临时
adapter 时必须有明确 owner、removal condition 和 regression。

### 风险 6: 把所有 MUST/MUST NOT 自动化

缓解：只自动化结构化、可重复、无语义判断的事实。Constitutional reflection 与研究质量不进入
deterministic verdict。

### 风险 7: `CONTEXT.md` 继续膨胀

缓解：Context 只保留压缩 vocabulary orientation；完整定义位于一个 model canon；新增术语时先
判断它是否所有任务都需要。

### 风险 8: 历史 archive 被批量改写

缓解：所有 migration scans 和 rewrites 默认排除 archive；archive 中旧路径是历史证据，不是 live
consumer。

### 风险 9: 当前 failing test 被“修绿”但职责仍然错误

缓解：新测试必须证明 operations 与 constitution 是不同 role，并继续验证 operation guidance 的
accepted spec/finalizer routes，不能仅从 active scan 中删掉该文件。

## 16. 需要在 proposal 前确认的设计决策

### 已有推荐默认值

1. `openspec/` 是唯一治理实现中心。
2. 根 `AGENTS.md` / `CLAUDE.md` / `README.md` / `CONTEXT.md` 是 adapters/interfaces。
3. 不创建 `guardrails/`。
4. Change A 做 topology + path contract，Change B 做 pruning + automation。
5. 第一阶段保留大多数文件名，避免 rename 与 rewrite 同时发生。
6. archived OpenSpec artifacts 不改写。
7. 不保留长期 `guidelines/` redirect。

### Proposal 中仍需核实

1. `openspec/README.md` 是否会与 OpenSpec CLI/tooling 的 convention 冲突。
2. constitution 是直接位于 `openspec/constitution/`，还是统一位于
   `openspec/project/constitution/`；只有 CLI 约束才应迫使增加 `project/` 层。
3. `logging-conventions.md` 在 Change B 后是否仍有独立 operation leverage。
4. `agentic-subagent-mechanism.md` 是否应在内容收敛时改名为 Work Unit model。
5. 是否存在仓库外 consumer 硬编码 `guidelines/project-charter.md`；没有具体 consumer 就不预设 shim。
6. Change A 是否改变 `change-feedback-loop` 的 observable supported-entry contract，还是仅改路径实现。

## 17. Acceptance criteria

### Topology

- [x] `openspec/constitution/` 存在并拥有唯一 Project Charter。
- [x] 三个 evolution directions 位于 constitution 的明确子层。
- [x] 系统模型位于 `openspec/guidance/models/`。
- [x] operation guidance 位于 `openspec/operations/`。
- [x] 根 `guidelines/` 不再是 current supported surface。
- [x] 不存在 duplicate/symlink mirror。

### Authority

- [x] Charter 仍明确 defer accepted specs、executable contracts 和 runtime truth。
- [x] Operations 不被 constitution peer invariant 误分类。
- [x] `change-feedback-loop` 仍能路由 accepted spec 和 finalizer。
- [x] Logging behavior 仍由 accepted spec/executable contract 拥有。
- [x] Root Context 仍明确是 glossary，不是 behavior authority。

### Entry routing

- [x] Root Agent entries 先读新 Charter，再读 root Context。
- [x] Harness Agent entries 通过父路径读同一 Charter 和 Context。
- [x] Harness research entry selection 未改变。
- [x] Apply/archive supported entries 使用新 operation guidance 路径。
- [x] Root/Harness paired files 保持其 accepted synchronization requirements。

### Verification

- [x] Current baseline hierarchy failure 已以 role-aware contract 正确关闭。
- [x] Focused context-routing regression 通过。
- [x] Focused constitution/evolution regression 通过。
- [x] Feedback finalizer/entry conformance regressions 通过。
- [x] Experiment and verification knowledge-surface regressions 通过。
- [x] OpenSpec validation 和适用 project governance checks 通过。
- [x] current/live scan 无旧 `guidelines/` 路径。
- [x] archive paths 没有被修改以制造假 clean scan。

### Documentation quality

- [x] `openspec/README.md` 是 router，不是第二 glossary。
- [x] 每个 target directory 的 README 或 entry text 说明 reader、trigger、role 和 authority limit。
- [x] Change B 有固定上下文负载的 before/after 记录。
- [x] 删除或下沉的内容都有新的 canonical owner，不靠聊天记忆补足。

## 18. Rollout 和恢复

迁移应在一个 Apply change 内原子完成，不采用多周双路径共存。

推荐 rollout：

1. delta specs 与 tests 先表达最终结构；
2. target directories 和 canonical moves 在同一 implementation series 中完成；
3. 所有 current consumers 同步更新；
4. focused regressions 和 live reference scan 关闭；
5. closeout review 确认无 dual source；
6. governed finalizer archive。

若迁移失败，恢复单位应是整个 Change A diff，而不是保留一半新路径和一半旧路径。不要通过复制
文件回旧目录来临时修复；应回到 change task，恢复 canonical topology 后重新验证。

## 19. 建议的 proposal 摘要

后续 OpenSpec proposal 可以使用以下核心叙述：

> The repository currently splits project control between a root guidance suite and the
> OpenSpec lifecycle that already owns accepted behavior and deterministic governance. The
> flat guidance suite also treats constitutional principles, conceptual models, and operation
> procedures as one peer class, creating a current hierarchy regression and increasing Agent
> entry load. This change will make OpenSpec the project-control implementation center,
> preserve root files as discovery adapters, and relocate current guidance into explicit
> constitution, model, and operation roles without changing Harness runtime behavior.

## 20. 关闭结果

本计划的两个有界 OpenSpec change 都已通过 governed finalizer archive。未来若要改变 guidance
topology、ownership、operation delivery 或 static topology coverage，必须以新的有界 plan/change
重新完成 capability discovery 和范围审查；本文件不再是 active Apply 授权或当前工作入口。
