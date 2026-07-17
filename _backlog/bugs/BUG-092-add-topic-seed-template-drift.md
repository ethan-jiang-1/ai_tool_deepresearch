# BUG-092 — `add_topic` seed 结构与 canonical 模板不一致

**报告日期**: 2026-07-18
**发现环境**: `dpt_rb_ai-era-bpm-process-disruption` rerun_count=3
**严重度**: MEDIUM（gate 不检查 body 格式，但 wave2 synthesis 和人类读者严重依赖回填质量）

## 复现

1. 对一个已有 9 个 canonical seed topic 的 bundle 执行 post-final rerun
2. 通过 phase-rerun `add_topic` 新增 4 个 topic（id 10-13）
3. 对比新 topic 的 `## 研究轮次追加区` 与已有 topic（如 06_allianz）的格式

## 核心问题

### 问题 1：研究轮次追加区格式不符合框架规定的 evidence entry 结构

框架在 `phase-seed-topics.md` §3.1 规定了回填格式（line 168-169, 177）：

| Section | 回填时机 | 框架规定字段 |
|---------|---------|-------------|
| `## 本轮新增证据` | Wave0 inspect/formal gate 前 | `evidence_meaning`, `relationship`, concrete `reference/*.md` refs, `status`, `next_hop` |
| `## 本轮新增机制理解` | Wave1 inspect/formal gate 前 | 同上，mechanism/trend return-map entries |
| `## 本轮新增趋势与难点` | Wave1 inspect/formal gate 前 | 同上 |

框架额外要求（line 177）：
> refs 必须至少枚举一个真实存在的 concrete `reference/*.md` 文件。禁止 `reference/topic-*.md (8 files)` count summary。

**实际产出 vs 预期**：

已有 topic（06_allianz）正确使用了结构化 evidence entry：
```
- evidence_meaning: Project Nemo = central planner 编排 7 专才 agent...
  relationship: supports
  refs: reference/06_allianz-project-nemo-completeai.md; reference/06_allianz-project-nemo-coverager.md
  status: supported（多源，架构+定性方向交叉一致）
  next_hop: —
```

新 topic（10-13）使用了 free-form 记叙段落——没有结构化字段，没有 concrete refs：
```
**Wave0 来源（10 sources）**：Digital Commerce 360 财报报道、Glossy 自研 AI 搜索深度分析...
```
——这是被框架明确禁止的 `count summary` 反模式（"10 sources"）。

### 问题 2：wave0 和 wave1 证据未分离

已有 topic 在 `## 本轮新增机制理解` 中用 `[WAVE1 2026-07]` 标记区分 wave1 新增条目 vs wave0 已有条目。新 topic 将所有内容混在一个段落里，不区分 wave0/wave1 provenance。

### 前端 frontmatter 差异（次要）

新 topic 多了非 canonical 字段（`phase`, `rerun_added`, `rerun_count`），字段顺序与已有 topic 不一致。这不影响 gate（canonicalBinding 只校验 binding 字段），但影响一致性。

## 根因

`add_topic` 路径没有：
1. 使用已有 topic 的结构作为格式模板（Agent 应读取一个已有 seed topic 并复制其 section 结构）
2. 遵循 `phase-seed-topics.md` §3.1 规定的 evidence entry 结构化格式
3. 在 wave0/wave1 完成后正确回填——Agent 用记叙摘要替代了结构化 evidence entry

## "本轮" 命名说明

框架用 "本轮新增证据/机制理解/趋势难点" 而非 "Wave0/Wave1"，因为它在 rerun 场景下不区分"第一轮 wave0"和"rerun 的 wave0"——"本轮"指当前 lifecycle pass。映射关系是确定的：

| Section | 回填 wave | 含义 |
|---------|----------|------|
| `## 本轮新增证据` | Wave0 | source intake findings |
| `## 本轮新增机制理解` | Wave1 | deepening mechanism understanding |
| `## 本轮新增趋势与难点` | Wave1 | trends, limitations, open problems |

命名在 rerun 上下文中确实模糊（"本轮"是哪个 round？），但框架注释已明确映射。这不是 bug，是 UX 问题。

## 影响

- seed-topics-ready gate **可以 pass**（gate 不检查 body section 格式）
- 但 wave2 synthesis **严重依赖回填质量**（line 173：`wave2 synthesis 质量严重依赖回填`）
- 人类读者（HITL2 review）无法从 seed topic 直接导航到 evidence 文件
- 后续 rerun 追加时，缺乏结构化的历史记录

## 建议修复

1. **Agent guidance**：phase-seed-topics.md / phase-rerun.md 应明确要求 Agent 在 `add_topic` 后、wave0/wave1 完成后，以已有 topic 为模板回填 research appendix
2. **或 Engine 层**：`wave0-complete` / `wave1-complete` gate 中添加 `seed_backfill_compliance` 检查（检测 evidence entry 是否包含 `refs:` 指向真实存在的 `reference/` 文件）
3. **模板**：提供一个 `seed_topic_appendix_template.md.tmpl` 明确 evidence entry schema
