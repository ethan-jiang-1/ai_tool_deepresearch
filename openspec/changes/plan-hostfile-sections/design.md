## Context

`rb_plan.md` 的 body 是空壳——`## Purpose (待填充)` + `## Topic Registry (尚无话题)`。Agent 在 HITL1 做 topic rewrite 时不知道该往哪写，自创 `## Original Topic`，template 里的 `## Purpose` 从未被碰过。body 没有 gate 检查。

## Goals / Non-Goals

**Goals:**
- Template body 从 2 个空占位符变为 6 section 结构
- `phase-hitl1.md` 指令明确指定写入 section
- setup-ready gate 防御：body 非空、required-fill markers 被替换
- Engine 在 gate pass 时写 `## Progress`（Phase 1 接入 setup-ready，其他 gate 后续 change 接入）
- Frontmatter JSON → YAML
- 提取 `stripMdFrontmatter()` 到 gate-helpers，统一所有 gate 的 pattern_match/field_non_empty 行为
- 更新 `new-disposable-bundle.mjs` 从 template 生成 plan body（单一真相源、E2E 可测 placeholder FAIL 路径）

**Non-Goals:**
- 不激活 Constraints/Decisions section（保留 intentionally-allowed markers 作为空占位符）
- 不改 `PlanSchema` frontmatter 字段
- 不在其他 gate CLI 接入 `writePlanProgress()`（仅 setup-ready，其余 follow-up）

> **Scope note（相对 `_backlog/todo-plan-hostfile-sections.md`）：** backlog 把 gate/engine/schema 改动划在 Phase 1 之外（"不动 engine、不动 gate、不动 schema"）。本 change 把 gate（2 条 body 检查 + handler）、schema（PlanSchema YAML 注记 + stripMdFrontmatter）、engine（helper 提取 + wave2/hitl2 重构 + writePlanProgress）全拉进了 Phase 1。理由：① body 检查是 template 的自然配套——template 改写后不检查等于白改；② helper 提取是现成重构机遇；③ Progress 写让 plan file 在长程 Agent 运行中保持"心跳"——防止从上下文淡忘。blast radius 比 backlog 大了，但每项都有独立动机。

## Decisions

### D1: 检查点选 `setup-ready`

research waves 开始前最后一道结构闸。HITL1 已完成、topic_registry 已填充——此时 body 必须有内容。

### D2: 两条 gate rule——最小防御 + marker 约定

模板使用两类 marker 区分"必填"与"延迟填充"：

| Marker class | Examples | Gate 行为 |
|-------------|----------|----------|
| Required-fill | `(待填充 — …)`, `(尚无话题 — …)` | FAIL — Agent 必须替换 |
| Intentionally-allowed | `(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)` | PASS — 合法延迟 |

Gate rules:

| Rule | Check Type | Target | 防什么 |
|------|-----------|--------|--------|
| `plan_body_non_empty` | `field_non_empty` | `rb_plan.md` body | Agent 忘了写（完全空 body） |
| `plan_body_no_unfilled_marker` | `pattern_match` (negate) | `\((?:待填充\|尚无话题)` | Agent 没替换 required-fill marker |

`field_non_empty` handler 的分支解析顺序：target 含 `#/` → YAML path 变体（现有逻辑）；target 以 `.md` 结尾 → file body 变体（strip frontmatter → check 剩余非空）。不含 `#/` 且不以 `.md` 结尾 → fail closed（报 "unknown field_non_empty target"）。此顺序与 hitl2-recorded gate 一致。

### D3: Template — `## Purpose` → `## Goal`，JSON → YAML

Frontmatter 字段名不变。JSON→YAML——`parseMdFrontmatter()` 基于 `parseYaml()`，YAML 1.2 是 JSON 超集，parser 代码零改动。

```
## Goal                   ← Agent 写（HITL1），required-fill markers
  ### Purpose
  ### Research Questions
  ### Scope
    **In scope:**        ← required-fill (待填充 — …)
    **Out of scope:**    ← required-fill (待填充 — …)
    **待定:**             ← intentionally-allowed (待 HITL2 确认 — …)
## Topic Registry        ← Markdown table，intentionally-allowed marker
## Constraints           ← 5 类结构化 bullet list，intentionally-allowed markers
  - 语言 / 时间预算 / 地域 / 方法 / 来源偏好
## Progress              ← Engine 写（gate pass 翻转 checkbox）
## Decisions             ← intentionally-allowed marker (append-only)
```

### D4: 提取 `stripMdFrontmatter()` 并统一 pattern_match 行为

`stripMdFrontmatter()` 已在 wave2-complete 和 hitl2-recorded 中重复。setup-ready 是第 3 个 caller。`parseMdFrontmatter()` 已存在——`stripMdFrontmatter()` 是其自然逆操作。

**一并统一 `pattern_match`：** 当前 wave2 的 `pattern_match` 不对目标文件 strip frontmatter（读原始 `content`），且 flag 用 `'i'`；setup-ready 的 `pattern_match` 会先 strip 再 match，flag 用 `'g'`。借 helper 提取之机统一：所有 gate 的 `pattern_match` 对 `.md` 文件统一先 `stripMdFrontmatter()` 再匹配，去掉无意义的 `'g'` flag（每个 rule 新建 regex 只 `.test()` 一次，`'g'` 的 `lastIndex` 有状态是隐患）。同步更新 wave2-complete。

### D5: 更新 `phase-hitl1.md` §3a 指令

Agent 不会因为 template 改了 section 名就自动换地方写。指令必须明确。

§3a step 2: "写入 `rb_plan.md` 正文" → "写入 `rb_plan.md` 的 `## Goal` section。至少填写 `### Purpose`（一段话概述研究目标）。`### Research Questions` 和 `### Scope` 按 HITL1 用户提供的信息填写——信息不足时标注 `(待 HITL2 确认)`，不编造。"

### D6: 一次性实施

Template + gate + phase node + start-research.md 一起上。四者互为补充。

### D7: gate 的 body 检查是"文件级"非"section 级"

`field_non_empty` 检查的是 `rb_plan.md` 整个 body（strip frontmatter 后）是否有内容——不是 `## Goal` section 是否填写。新 template 的 H1 标题 + section header 本身就构成"非空 body"。实际干活的是 `plan_body_no_unfilled_marker`——它通过 marker 约定间接定位 Goal 子节：只有 Goal 子节用 required-fill marker `(待填充…)`，保留节用 intentionally-allowed marker。这意味着 gate PASS 不等于 Goal 已填写——Agent 把 marker 删了却啥也没写也能 PASS。这是 design intent，不是缺陷——Phase 1 不做 section-level 校验，marker 约定已覆盖 90% 的"忘了填"情况。

### D8: Engine 写 `## Progress` —— 长程 Agent 心跳

长程 Agent 运行中，不改动的文件会从上下文渐渐淡忘。`rb_plan.md` 如果从头到尾不变一字，而 `rb_status.json`/`rb_queue.json`/`rb_trace.jsonl` 持续跳动——Agent 注意力自然流失。Progress 更新是保持 plan file 在上下文窗口中存活的"心跳"。

- `## Progress` 预列所有 gate 的 checkbox（`- [ ] <gate>`），初始全未勾
- Engine 在 gate pass 后翻转对应行：`- [x] <gate> (<ISO8601 ts>)`
- 幂等：重跑同一 gate 只更新时间戳、不重复行
- gate 列表从 template 预填（workflow manifest 的已知生命周期 gate）
- `writePlanProgress()` 放 `gate-helpers.mjs`，与 `writeGateAttempt()` 同级
- Phase 1 仅 `check-gate-setup-ready.mjs` 接入；其他 gate 后续 change 逐步接
- try/catch 包裹，写失败不影响 gate 输出

## Risks

- **marker 约定依赖模板纪律** — `plan_body_no_unfilled_marker` 靠"只有 Goal 子节用 required-fill marker"这一约定精准定位。模板变更时若把保留节也改成 `(待填充…)`，gate 会误报。Mitigation：marker 约定已编码进 PHS-002 spec 与 design D2。模板作者须遵守。
- **marker pattern 只覆盖中文** — 将来新模板引入非中文 marker 需同步更新 gate pattern。当前 required-fill marker 前缀为 `(待填充` 和 `(尚无话题`，regex `\((?:待填充|尚无话题)` 用 prefix match 覆盖 `(待填充 — 任意描述…)` 变体。
- **`plan_body_non_empty` 近乎空转** — 对任何系统生成的 bundle 恒真（模板有 6 个 section 标题）；只对手工/出 bug 的空 body 有效。保留它是因为代价极低（一行 rule 配置），且捕获的是与 marker 正交的"Agent 完全没写任何东西"模式。
- **helper 提取后 wave2/hitl2 行为回归** — `stripMdFrontmatter()` 替换内联代码后，如果正则或 trim 逻辑有细微差异，wave2-complete 和 hitl2-recorded gate 会静默改变行为。Mitigation：提取前先写单元测试锁定当前 behavior，替换后跑相关 gate 的集成测试。同步统一 `pattern_match` 的 strip 行为。
- **`start-research.md` 与 `phase-hitl1.md` 指令冲突** — `start-research.md` Step 3 指示 Agent append `## Research Question`，`phase-hitl1.md` §3a 指示写入 `## Goal`。如果不更新 `start-research.md`，Agent 会在 `rb_plan.md` 里创建两个 section，内容重复。Mitigation：本 change 同步更新 `start-research.md` Step 3，新增 PHS-002 scenario 覆盖此指令变更。
- **disposable bundle 分裂** — `new-disposable-bundle.mjs:150` 内联生成 JSON frontmatter + 1 行 body，不走 `rb_plan.md.tmpl`。如果不更新，disposable/experiment bundle 永远是旧格式，`plan_body_no_unfilled_marker` 的 FAIL 路径在 controlled E2E 里永远触发不了。Mitigation：本 change 更新 `new-disposable-bundle.mjs` 从 template 生成 plan body（YAML + 6 section + required-fill markers）。同步新增 E2E case 验证 placeholder FAIL → PASS 路径。
- **gate PASS 不等于 Goal 已填写** — `field_non_empty` 是文件级检查，不是 section 级。Agent 删掉 marker 却啥也没写也能 PASS。这不是缺陷——Phase 1 不做 section 级校验，marker 约定已覆盖约 90% 的"忘了填"——但需在 spec 里明确文档化，防止将来误解。
