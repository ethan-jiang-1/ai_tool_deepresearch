# TODO: rb_plan.md — 从空壳到 Host File

> 状态: 已完成（已移入 done/） | 优先级: 中 | 创建: 2026-06-25 | 更新: 2026-06-26
>
> 直接依赖: 无（纯增量，不动现有 schema/CLI/engine）
> 被依赖: `todo-context-reground`（reground 需要 `## Goal` 作为北星锚点）、`todo-rerun-incremental-node`（rerun delta 需要 `## Decisions` 作为累积容器）、`todo-final-output-eval`（评估需要 `## Progress` 作为完成度信号）

## Why

### 当前 `rb_plan.md` 的三层问题

**第一层：语义空洞。** `rb_plan.md` 名叫 plan，里面却没有一个 section 说清楚"我们要研究什么、为什么、边界在哪"。当前 body 只有两个 section：

```markdown
## Purpose
(待填充 — 研究目标和范围)

## Topic Registry
(尚无话题 — 使用 decompose-seed-topics 命令创建)
```

HITL1 之后 Agent 会把 original topic 写进 body（`phase-hitl1.md` line 36），但写进哪个 section？当前没有指定。实际上 Agent 往往把内容写在 `## Purpose` 上面、或者替换 `## Purpose` 内容、或者加一段在 Topic Registry 下面——没有约定，每次不一样。

**第二层：数据无处沉淀。** 随着研究推进，有三类数据需要持久化但无处可去：

| 数据 | 产生时机 | 当前存放处 | 问题 |
|------|---------|-----------|------|
| 研究目标（要回答什么问题、边界在哪） | HITL1 | Agent 上下文 + 散落在 `rb_plan.md` 某处 | 新 session reload 后 Agent 找不到北星 |
| HITL 决策（用户缩小了范围、排除了某维度、要求 rerun 某 topic） | HITL1, HITL2 | 只存在于对话历史 | session 结束就蒸发 |
| 每 wave 完成状态（几个 topic 过了、几个 failed、缺什么） | 每个 gate pass | 散在 `rb_trace.jsonl` + `rb_status.json` | 没有一个 human-readable 的进度总览 |

**第三层：数据散落导致 context reground 没有锚点。** `todo-context-reground.md` 的核心机制是"周期性 reload 工程总图 + root question"。但现在 root question 没有单一权威位置——它在 `rb_plan.md` body 的某个地方、也在 `rb_profile.yaml` 的 `root_must_answer_set`、也在 HITL1 的对话历史里。三处可能不一致，reground 时不知道该信谁。

### 为什么不是 rename

最初的想法是 `rb_plan.md` → `rb_goal.md`，因为内容全是"研究什么"而非"怎么研究"。但：

- `rb_plan` 出现在 ~100 个文件中（代码、MD、test、playbook、spec）
- `plan_basename` 出现在 ~70 个文件中
- 所有 gate CLI 引 `rb_plan.md`，所有 phase node MD 引 `rb_plan.md`
- 纯 rename 改动量 ~80 文件，且是机械替换——工作量不大但风险不小（typo、漏改、与 in-flight change 冲突）

**而且 plan 这个名字本身没错——错的是它里面没内容。** 一个真正的 plan 本来就该包含 goal（目标）、constraints（约束）、progress（进展）、decisions（决策）。把 plan 填满，比把它改名叫 goal 更有价值。

### 为什么是 Host File 而不是多个文件

项目中已有多个 control file：`rb_status.json`、`rb_profile.yaml`、`rb_queue.agq.json`、`rb_trace.jsonl`。再多几个文件（`rb_goal.md`、`rb_constraints.yaml`、`rb_decisions.md`）似乎也合理。

但关键区别在于**读取模式**：

- **Machine state files**（status、queue、trace）— 各自一个文件，schema-validated，Engine 写/读，Agent 偶尔查阅
- **Research brief**（goal、constraints、decisions、progress）— Agent 和人需要**一次性读完**才能建立对研究全貌的认知。如果拆成 4 个文件，reground 时要读 4 次，HITL 审查时要翻 4 个文件

**Host file 的核心价值：一次 `Read` 拿到全部北星信息。** 用 `##` section 划边界，人和 JS 各取所需。

## 核心设计

### 设计原则

1. **不改文件名** — `rb_plan.md` 保留。对外接口（gate CLI、phase node、`readBundlePlan()`）全部不变
2. **Frontmatter 不变** — `plan_basename`、`derived_topic_count`、`topic_registry` 字段和 schema 完全不动。这些是机器读写的，Gate 依赖它们
3. **Body section 是增量** — 新 section 往下加，现有 `## Purpose` 挪进 `## Goal` 下面，不删旧内容只是重组
4. **Section = 边界** — 每个 section 有明确的 ownership（谁写、谁读、什么时候写、是否 append-only）
5. **Section 顺序固定** — Goal → Topic Registry → Constraints → Progress → Decisions。最重要的在最上面，累积型的在下面

### Section 所有权模型

这是整个设计最关键的部分——不是"加了几个 header"，而是**谁有权写哪个 section**：

| Section | 写者 | 写时机 | 写模式 | 读者 |
|---------|------|--------|--------|------|
| `## Goal` | Agent（HITL1） | HITL1 阶段 | **写一次**，后续几乎不改（除非 HITL2 要求修正） | Agent（所有 phase 的北星锚点）、人（HITL 审查） |
| `## Topic Registry` | Agent（HITL1 初始，后续 phase 可追加 status） | HITL1 → gate pass 后更新 status | **维护**（追加行、更新 Status 列） | 人（快速看话题覆盖）、Agent（了解全局） |
| `## Constraints` | Agent + 人（HITL1） | HITL1 阶段 | **写一次**，后续 phase 只读 | Sub-agent（搜索时遵守约束）、Agent（wave 执行时对照） |
| `## Progress` | **Engine**（非 Agent） | 每个 gate pass 后 | **Append-only**（新条目追加到底部，不覆盖旧条目） | 人（进度总览）、Agent（reground 时了解完成情况）、`final-output-eval`（完成度信号） |
| `## Decisions` | Agent（HITL1 + HITL2 + rerun 后） | 每次人类交互后 | **Append-only**（新决策追加，旧决策保留） | 新 session 的 Agent（了解历史决策）、人（审计决策链） |

**关键区分：`## Progress` 由 Engine 写，不由 Agent 写。** 这是从 V12 继承的核心教训——Agent 写的 progress 不可信（可能遗漏、美化、或忘记写）。Engine 在 gate pass 后机械追加一行，确定性、可审计。

### 权威模型：Frontmatter vs Body

同一个数据可能出现在两个地方（如 `topic_registry` 在 frontmatter 和 `## Topic Registry` body section 里），需要明确谁赢：

| 数据 | 权威源 | Body section 的角色 | 冲突时 |
|------|--------|-------------------|--------|
| `topic_registry`（id/slug/title） | **Frontmatter** | Human-readable 视图 + 附加 Status 列 | Frontmatter 为准。Body 是派生视图 |
| `plan_basename` | **Frontmatter** | 不出现在 body（只在 `# Deep Research Plan: xxx` 标题里） | Frontmatter 为准 |
| Goal（Purpose/Questions/Scope） | **Body `## Goal`** | 唯一权威源 | 无冲突——frontmatter 里没有这些字段 |
| Progress | **Body `## Progress`** | 唯一权威源 | 无冲突——frontmatter 里没有 |

> **推论：`topic_registry` 的 Status 列只能放在 body。** Frontmatter 保持 identity-only（id/slug/title），因为 identity 在 run 生命周期内不变。Status 是 runtime 信息，放 body 正确。

## 目标结构

### Before（当前模板）

```markdown
---
{"plan_basename":"{{name}}","derived_topic_count":0,"topic_registry":[]}
---

# Deep Research Plan: {{name}}

## Purpose
(待填充 — 研究目标和范围)

## Topic Registry
(尚无话题 — 使用 decompose-seed-topics 命令创建)
```

### After（新模板）

```markdown
---
plan_basename: {{name}}
derived_topic_count: 0
topic_registry: []
---

# Deep Research Plan: {{name}}

## Goal

### Purpose
(待填充 — HITL1 阶段由 Agent 根据用户研究问题撰写)

### Research Questions
(待填充 — 从 Purpose 派生 3-5 个核心研究问题)

### Scope
(待填充 — 地域、时间范围、明确排除的内容)

## Topic Registry

(由 HITL1 填充 — 人类可读的话题列表，与 frontmatter `topic_registry` 保持同步。
Status 列随 wave 推进由 Agent 更新。)

| # | Slug | Title | Status |
|---|------|-------|--------|
|   |      |       |        |

## Constraints

(待 HITL1 填充 — 研究约束与质量标准。后续 phase 和 sub-agent 执行时须遵守。)

## Progress

(由 Engine 在每个 gate pass 后自动追加。Agent 只读，不写。)

## Decisions

(HITL 决策记录 + rerun delta。Append-only — 新决策追加在最新条目上方。)
```

### 格式变更：JSON → YAML frontmatter

跟着 template 重写一起切 YAML frontmatter。理由：

- `parseMdFrontmatter()` 用 `parseYaml()` 实现，**零代码改动**（YAML 1.2 是 JSON 超集）
- `topic_registry` 列表在 YAML 里更直观：每个 topic 占 3 行而非挤在一行 JSON 里
- 人手工编辑 frontmatter 时（虽然罕见），YAML 远比 JSON 友好
- 与 `rb_profile.yaml` 风格统一

**风险：** `topic_registry` 和 `plan_basename` 的值可能含 YAML 特殊字符（如 `:` 在 topic title 里）。但这在 JSON 里也是问题（需转义 `"`）。YAML 里 title 加引号即可：`title: "EV: 电池技术"`。不大。

## 各 Section 详细设计

### `## Goal` — 北星锚点

**为什么需要三个子节而不是一个自由文本块：**

- `### Purpose`：一段话概括。Agent 在 reground 时读它重建"我们在研究什么"
- `### Research Questions`：可枚举的问题列表（`1. 2. 3.`）。Wave2 synthesis 必须逐个回答这些 questions。如果只有 Purpose 段落，synthesis 时 Agent 要自己推断"这段文字隐含了哪些 question"——不可靠
- `### Scope`：明确的 include/exclude。Wave0 source intake 时 sub-agent 读到 "排除：换电模式"，就不会去搜换电相关的内容——减少噪声

**三个子节都是可选的**（Agent 在 HITL1 可能无法全部填充），但 Purpose 至少要有内容。

**写入时机：** HITL1 的 topic rewrite 步骤（`phase-hitl1.md` §3a）。当前指令是"将 original topic 写入 `rb_plan.md` 正文"，改为"写入 `rb_plan.md` 的 `## Goal` section"。

### `## Progress` — Engine 写的进度账本

**为什么由 Engine 写而不是 Agent：**

Agent 写 progress 有三个失败模式：
1. **遗漏** — Agent 在 gate pass 后兴奋地加载下一个 phase，忘了写 progress
2. **美化** — "wave0 全部完成" ——实际上 3 个 topic 里 1 个 source 质量很差，但 Agent 没说
3. **格式漂移** — 每次写的格式不一样，人很难扫读，JS 无法 parse

Engine 写 progress 则：
- 确定性 — gate pass 事件发生 → progress 一定被追加
- 格式统一 — 每次都是相同的模板
- 可审计 — 内容来自 gate result（pass/fail、count、timestamp），不是 Agent 判断

**追加格式（草案）：**

```markdown
### wave0 — 2026-06-25 14:32 UTC — gate: wave0-complete → PASS
- topics processed: 3/3
- sources collected: 45
- gate result: all rules passed
```

每 wave 一条 `###` 条目，~5 行。4 waves = ~20 行。可管理。

**实施依赖：** 需要 Engine 侧新增一个小 helper —— `appendPlanSection(bundlePath, 'Progress', entry)`。它在 gate pass 后由 gate CLI 调用（或在 gate loop 的 `checkGate()` 返回 pass 后由调用方写）。这是 Phase 2 的内容，不在 Phase 1 范围。

### `## Decisions` — 决策累积链

**为什么需要：**

HITL1 用户说"排除氢燃料电池"，这个决定影响后续所有 phase。但当前它只存在对话历史里。新 session reload → Agent 不知道这个约束。

Decisions section 把每次人机交互的决策**钉在文件里**：

```markdown
### HITL1 — 2026-06-25
- 用户选择 research_profile: exploratory_map
- 用户缩小范围：排除氢燃料电池、二轮电动车
- 用户要求必须覆盖中国市场

### Rerun Round 1 — 2026-06-27
- HITL2 反馈：电池回收话题证据不足
- 新增 topic: battery-recycling (id: t3)
- 仅 rerun t3 的 wave0+wave1（增量模式）
```

**写入模式：Append-only。** 新决策追加在最新位置，旧决策不覆盖。保留完整决策链——人想知道"为什么我们后来加了电池回收话题"时可以追溯。

**与 `## Constraints` 的关系：** Constraints 是规范性的（"应该怎么做"），Decisions 是记录性的（"做了什么决定、为什么"）。HITL1 用户说"排除氢燃料"→ 这个决定同时写入 Constraints（"排除氢燃料"）和 Decisions（"用户决定排除氢燃料，因为..."）。有重叠，但语义不同——Constraints 给 sub-agent 读，Decisions 给人和未来的 Agent 读。

### `## Constraints` — 给 Sub-agent 的行为边界

**Phase 1 只是占位**（模板里写上 `(待 HITL1 填充)`）。真正的约束内容在 evidence-quality 和 explore-exploit 机制引入后才逐渐充实。

**未来可能的内容：**
- 证据标准：`min 2 independent sources per claim`
- 来源偏好：`prefer academic over commercial`
- 时效要求：`sources must be 2024+`
- 方法论约束：`no paywalled sources`、`must cross-verify marketing claims`

**读者：** Sub-agent 在执行 task 前应读 `rb_plan.md## Constraints`，对照约束执行搜索和提取。这比在 task card 里重复约束更干净——约束写一次，所有 task 共享。

## 与现有系统的交互

### Gate CLI — 零影响

所有 gate checker 当前只读 frontmatter（via `readBundlePlan()`）。Body section 变化完全不触及 gate。`parseMdFrontmatter()` 不变。

**Phase 2 的新交互：** gate pass 后 Engine 追加 `## Progress`。这是 gate loop 调用方（`workflow-chain.mjs` 或 Agent）在 gate pass 后做的事，不是 gate CLI 自己的职责。

### Queue — 间接受益

Task card 的 `action` 字段可以写"搜索时遵守 `rb_plan.md## Constraints`"。Sub-agent relay 时，relay protocol 可以自动把 Constraints section 注入 sub-agent 的 bounded context。

Phase 1 不做这个——只是说清楚未来方向。

### Phase Nodes — 引用更精确

当前 phase node 里写"读 `rb_plan.md`"——但到底读什么？整篇都读？还是只看 topic_registry？

有了 section 后，指令可以精确到：

```
读 rb_plan.md 的 ## Goal section 了解研究目标和边界
读 rb_plan.md 的 ## Constraints 了解证据质量标准
读 rb_plan.md 的 ## Progress 了解当前完成状态
```

Phase 1 只改 `phase-hitl1.md`（写 Goal 的指令）。其他 phase node 的引用可以逐步精化，不是 blocking。

### Context Reground — 直接解锁

`todo-context-reground.md` 的 reground 流程需要三个锚点：
1. **Root question** → `rb_plan.md## Goal`
2. **当前进度** → `rb_plan.md## Progress`
3. **工程总图** → `CLAUDE.md` + workflow nodes

当前三个锚点里前两个都不存在。Phase 1 落地 `## Goal` → reground 有了北星。Phase 2 落地 `## Progress` → reground 有了进度意识。

### 实验 Playbook — 少量更新

现有 playbook 里写 `rb_plan.md` 的地方（主要是 HITL1 和 wave chain 的 case），把 `## Purpose` 改为 `## Goal### Purpose`。改动量 ~15 个 case 文件，每个改动 1-2 行。

## 实施计划

### Phase 1：结构落地 + Goal 激活（本 change）

**范围：** 新 template + HITL1 指令更新 + 文档更新。不动 engine、不动 gate、不动 schema。

| 文件 | 改动 | 风险 |
|------|------|------|
| `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` | 完整重写——YAML frontmatter + 6 section 结构（见上方 After 模板） | 低——template 内容替换，变量 `{{name}}` 不变 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | §3a step 2 改为"写入 `rb_plan.md` 的 `## Goal` section（含 `### Purpose`、`### Research Questions`、`### Scope`）" | 低——两行指令更新 |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` | 更新 `rb_plan.md` 的文档描述——从"Markdown + YAML frontmatter (FRE-003)"更新为完整 section 结构说明 | 低——文档更新 |
| `DPT_FRAMEWORK/command_playbook/start-research.md` | Step 3 更新：引 `## Goal` section 而非笼统的"rb_plan.md 正文" | 低——一行改动 |
| 实验 playbook（~15 个 `case-*.md`） | 写 `rb_plan.md` body 时用新 section 名 | 低——每个 1-2 行 |

**不改的（零改动）：**
- `DPT_FRAMEWORK/schema/contracts/plan.mjs` — `PlanSchema` frontmatter 字段不变
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — `readBundlePlan()` 不变
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` — template 变量替换不变
- 所有 gate CLI — 只读 frontmatter
- 所有 phase node MD（除 hitl1）— 只读 `topic_registry`
- `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` — `plan_basename` 不变

**验证：**
- `node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundle>` — `rb_plan.md` 仍通过 `PlanSchema` 校验
- 全量回归测试 PASS
- 抽样实验 playbook（HITL1 + wave0 至少 2 个 case）PASS

### Phase 2：Engine 写 Progress（后续 change）

**依赖：** Phase 1 完成（模板有 `## Progress` 占位）

**范围：**

| 新增 | 说明 |
|------|------|
| `DPT_FRAMEWORK/engine/helpers/plan-sections.mjs` | `appendPlanSection(bundlePath, sectionName, entry)` — 按 `##` header 定位，在下一个 `##` 前插入 entry |
| Gate loop 调用方改动 | 每个 gate pass 后调用 `appendPlanSection(bundlePath, 'Progress', entry)` |

**不改 Phase node MD。** Progress 写入是 Engine 的事，Agent 不需要被指令"去写 progress"。

### Phase 3：Constraints + Decisions 激活（按需）

当 `todo-evidence-quality` 和 `todo-rerun-incremental-node` 引入后：
- `## Constraints` 从 quality 机制接收可机器验证的约束
- `## Decisions` 从 rerun delta 和 HITL2 交互中累积

Phase 3 不需要独立 change——每个依赖 TODO 落地时顺手激活对应的 section。

## 与相关 TODO 的关系

| TODO | 关系 | 方向 |
|------|------|------|
| `todo-context-reground` | **被 unlock** — Phase 1 提供北星锚点（`## Goal`），Phase 2 提供进度意识（`## Progress`） | plan → reground |
| `todo-rerun-incremental-node` | **被 unlock** — `## Decisions` 成为 rerun delta 的自然容器 | plan → rerun |
| `todo-final-output-eval` | **被 unlock** — `## Progress` 提供每 wave 完成度信号（几个 topic 过了、几个 failed） | plan → eval |
| `todo-evidence-quality` | **未来关联** — `## Constraints` 可承载证据质量标准 | quality → plan |
| `todo-system-logging` | 正交 — 日志是另一层 | — |

## 开放问题

### 1. YAML frontmatter 现在切还是以后？

**建议：现在切。** 理由：
- `parseMdFrontmatter()` 用 `parseYaml()` 实现，零代码改动
- Template 反正要重写，一步到位比以后再切少一次 template 变更
- `topic_registry` 在 YAML 里可读性远超一行 JSON
- 与 `rb_profile.yaml` 风格统一

**风险：** 标题含 YAML 特殊字符（`:`）需加引号。处理方式：Agent 写 YAML 时自动加引号，或 template 示例里展示正确写法。低风险。

### 2. `## Topic Registry` body section 是手写还是自动渲染？

**建议：Phase 1 手写，Phase 2 考虑自动渲染。** 理由：
- Body table 有 Status 列，frontmatter 没有——body 比 frontmatter 丰富
- 自动渲染需要 Engine 读 frontmatter → 生成 MD table → 替换 body section。不是 trivial 的
- Phase 1 时 topic 数量 ≤5，手写负担低
- 如果 Agent 忘了更新 body table，frontmatter 仍是权威——只是 body 视图过时，不是数据丢失

**冲突处理：** frontmatter `topic_registry` 是 topic identity 的权威源。如果 body table 和 frontmatter 不一致（比如 body 少了一个 topic），以 frontmatter 为准。这是 convention，不是 Engine 强制——Phase 1 不做自动校验。

### 3. `## Progress` 的 Engine helper 签名应该是什么？

**建议：**
```javascript
appendPlanSection(bundlePath, 'Progress', entry)
// entry 是 string（MD 片段），由调用方构造
```

不是：
```javascript
recordGatePass(bundlePath, gateResult)  // 太高层，绑定 gate
```

低层 helper 更灵活——Engine 追加任何东西到任何 section。调用方（gate loop）负责构造 Progress entry 的内容。这样如果以后想追加其他 section（如 Engine 自动更新 Status 列），同一个 helper 可以复用。

### 4. Section 名用英文还是中文？

**建议：英文。** 理由：
- 与代码、schema、gate definition 的风格一致
- `## Goal` 比 `## 研究目标` 更短、更不容易被 LLM 误解析
- 项目所有 phase node MD 都是英文 header

### 5. 旧 bundle 需要 migrate 吗？

**不需要。** 理由：
- Bundle 是 disposable 的（`dpt_disp_*`）或单次 run 的（`dpt_rb_*`）
- 旧 bundle 的 `rb_plan.md` 有 `## Purpose` section——不影响 gate（gate 只读 frontmatter）
- 新 bundle 用新 template，结构自然正确
- 如果 Agent 重跑旧 bundle 的 phase，读到 `## Purpose`（不是 `## Goal`）时应该自适应——LLM 对 section 名变化有容错

### 6. 要不要给 Engine 加 "section 存在性" 的 gate rule？

**建议：Phase 1 不加，Phase 2 考虑。** 理由：
- 当前 gate 只 check frontmatter，不管 body
- `## Goal` 缺失时，受影响的是 Agent 的北星锚点——不是正确性问题，是健壮性问题
- 可以在 `setup-ready` gate 加一个非阻塞 warning（不是 fail）："Goal section 为空——建议在继续前填充"
- 但这不是 Phase 1 scope——Phase 1 只改 template + HITL1 指令，不碰 gate definition

## 相关文件

| 文件 | 角色 |
|------|------|
| `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` | 当前模板——Phase 1 重写目标 |
| `DPT_FRAMEWORK/schema/contracts/plan.mjs` | Frontmatter schema——Phase 1 **不动** |
| `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` | `readBundlePlan()` + `parseMdFrontmatter()`——Phase 1 **不动** |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | 写 plan 的 phase——Phase 1 更新 §3a 指令 |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` | Schema 文档——Phase 1 更新 |
| `DPT_FRAMEWORK/command_playbook/start-research.md` | 入口 playbook——Phase 1 更新引用 |
| `_backlog/todo-context-reground.md` | Reground TODO——Phase 1 解锁北星锚点 |
| `_backlog/DONE-agentic-queue-landing-analysis.md` | 上游分析——queue-loop 定调与本设计互补 |
