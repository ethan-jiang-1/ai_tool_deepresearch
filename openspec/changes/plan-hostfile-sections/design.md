## Context

`rb_plan.md` 是 bundle 的计划文件，当前的创建路径有三条：

| 路径 | 来源 | Body 写入 |
|------|------|----------|
| Production (`instantiate-run-bundle.mjs`) | `rb_plan.md.tmpl` → `{{name}}` 替换 | `## Purpose`（占位符）+ `## Topic Registry`（占位符） |
| Disposable (`new-disposable-bundle.mjs`) | 代码生成 | `# Deep Research Plan: <name>`（仅标题行） |
| Agent at HITL1 (`phase-hitl1.md` §3a) | Agent 自由写 | `## Original Topic` / `## Research Question`（header 不在 template 里） |

当前 body 没有任何 gate 检查。Agent 的写入行为无约束——可能忘了写、写错 section、或者没填占位符。

`backlog/todo-plan-hostfile-sections.md` 提出了完整的 host file 设计（5 section + frontmatter YAML），但需要根据最近的实验经验做取舍：**Phase 1 只做 template + gate 防御，不动 Engine、不动 schema、不写 Progress。**

## Goals / Non-Goals

**Goals:**
- Template 重写为可生长的 section 结构，Agent 知道"我该往哪写"
- Gate 能做最基本的防御：body 非空、占位符被替换
- 完全向后兼容——现有 bundle、现有 gate、现有 schema 不受影响
- Frontmatter JSON → YAML，可读性提升，零代码改动

**Non-Goals:**
- **不实现 Engine 写 Progress**——那是 Phase 2，需要 `plan-sections.mjs` helper
- **不激活 Constraints/Decisions section**——Phase 1 只放空占位符
- **不改 `phase-hitl1.md`**——Agent 看到 `## Goal` 自然知道往哪写（LLM 对 section 名有容错）；将来可精化指令但非 Phase 1 必须
- **不改 `PlanSchema`**——frontmatter 字段完全保留
- **不加新的检查类型到 gate engine**——复用已有的 `field_non_empty`（file body 变体）和 `pattern_match`

## Decisions

### D1: 检查点选 `setup-ready` 而非 `hitl1-recorded`

`hitl1-recorded` 只检查 `rb_profile.yaml` 的字段（profile schema、research_profile 非 not_selected、root_must_answer_set 非空）。此时 plan body 可能还是草稿——Agent 正在跟用户交互，body 还没写完。过早检查会 false positive。

`setup-ready` 是 research waves 开始前最后一道结构闸——HITL1 已 recorded、topic_registry 已填充、seed_topics 已 materialize。此时 plan body 必须有内容——Agent 有足够的时间写，而且再不写就没有理由了。

`seed-topics-ready` 太晚——topics 已经 materialize 了才发现 plan 是空的，修复代价高。

（来源：agent 3 对比了所有 gate 的生命周期位置和检查类型）

### D2: 只加最小防御，不做质量判断

两条 rule：
1. `field_non_empty` — target 是 `rb_plan.md` body（strip frontmatter → check remaining non-empty）。防御"Agent 完全忘了写"
2. `pattern_match` negate — pattern `/(待填充)|(尚无话题)/`。防御"Agent 没填模板占位符"

不做的事：
- 不检查 goal 内容质量（"Purpose 写得好不好"——那是人的事）
- 不检查 topic_registry table 格式（Phase 1 body table 非权威——frontmatter 是权威）
- 不检查 Constraints/Progress/Decisions section（可选，空的允许）

（来源：agent 1 发现 `field_non_empty` file body 变体和 `pattern_match` negate 已在 wave1/wave2/hitl2 gate 中实现，可以直接移植模式）

### D3: Template 最小改动，保留旧结构

不改 frontmatter 字段名。`plan_basename`、`derived_topic_count`、`topic_registry` 全部保留。

JSON → YAML 是纯安全操作——`parseMdFrontmatter()` 用 `parseYaml()`（`yaml` npm 包）实现，YAML 1.2 是 JSON 超集。现成的一行 JSON 照样能 parse。

Body 改动：`## Purpose` 改名为 `## Goal`（加子节 `### Purpose`/`### Research Questions`/`### Scope`），`## Topic Registry` 从文本占位符换成 Markdown table 模板。以下新增：`## Constraints`、`## Progress`、`## Decisions`——全是空占位符。

（来源：agent 2 调查了所有 case 文件——没有 case 使用 `## Purpose` header。Agent 实际写的是 `## Original Topic`。改名零影响）

### D4: `field_non_empty` file body 变体在 gate CLI 中实现，不提取到 gate-helpers

按 framework README 原则：新增 check type 先在需要它的 gate CLI 中实现，>=2 个 CLI 共用时再提取。当前 `field_non_empty` file body 变体存在于 wave2 和 hitl2 两个 gate（代码相同：`content.replace(/^---[\s\S]*?---\n?/, '').trim()`）。加上 setup-ready 就是第 3 个——但实际上这 3 处的用法相同，可以考虑提取。Phase 1 在 `check-gate-setup-ready.mjs` 中直接实现（复用同一行代码），Phase 2 考虑提取到 gate-helpers 作为 `readPlanBody()` 或类似的 helper。

（来源：agent 1 发现 strip-frontmatter 代码在 wave2 和 hitl2 中重复）

## Risks / Trade-offs

- **现有 bundle 的 `rb_plan.md` 没有 `## Goal` section** → 不是问题。Gate 只检查 body 非空+无占位符，不要求特定 section 名。旧 bundle 如果 body 有内容（如 `## Original Topic`），检查通过。
- **Agent 可能把 goal 写在 `## Original Topic` 下而不是 `## Goal`** → Phase 1 不强制 section 名。如果后续发现 Agent 一直用旧 header，可以在 `phase-hitl1.md` §3a 中加明确指令。当前 LLM 对 section 名有容错——看到 `## Goal` 自然知道这是放 goal 的地方。
- **YAML frontmatter 特殊字符风险** → topic title 含 `:` 需加引号。YAML 中：`title: "EV: 电池技术"`。低风险——几乎所有 title 都不含 YAML 特殊字符。
