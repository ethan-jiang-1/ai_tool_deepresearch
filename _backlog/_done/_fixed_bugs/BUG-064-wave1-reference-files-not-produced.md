# BUG-064 — Wave1 sub-agent 不产出 topic-specific reference 文件，reference/ 目录几乎为空

| 属性 | 值 |
|------|-----|
| ID | BUG-064 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 消费者（用户）从 seed_topics → reference/ 的消费路径断裂，reference/ 中只有 wave0 的 00-shared 文件 |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run |
| 相关 Bug | [[BUG-060]]（contract mismatch — sub-agent 不按预期写文件是同一系统性疾病的又一个症状）、[[BUG-039]]（sub-agent 不写声明的输出文件）、[[BUG-011]]（sub-agent 不声明 cache_trails） |

---

## 0. 一句话

**Wave1 phase 的 task card 模板（phase-wave1.md §3.1）明确要求 sub-agent 写 `reference/{topic.slug}-<source-slug>.md`——但 5 个 wave1 sub-agent 中只有 1 个（topic 03）实际写了 reference 文件，其余 4 个 topic 的 reference/ 为空。即使 topic 03 写的那一个，格式也不符合 `shared-reference-template.md` 的 canonical 规范。**

---

## 1. 现象

本次 run 的 `reference/` 目录现状：

```
reference/
  00-shared-fowler-bliki-fose.md          ← wave0 shared ref (非标准格式)
  00-shared-fowler-fragments-2026-02-18.md ← wave0 shared ref
  ... (8 more 00-shared-*.md)              ← 全部 wave0
  03_engelberg-2026-event-details-harness-critique.md ← wave1 topic 03 (非标准格式)
  README.md
  _INDEX.md
```

**Wave1 应该产出但没有产出的文件：**
- `reference/01_fose-retreat-series-background-*.md` — 不存在
- `reference/02_deer-valley-2026-first-retreat-*.md` — 不存在
- `reference/04_technical-dimensions-and-themes-*.md` — 不存在
- `reference/05_industry-impact-and-reception-*.md` — 不存在
- `reference/03_engelberg-2026-event-details-*.md` — 只有一个（应该有多个，对应 ~18 个新 source 中的关键来源）

**与此同时，wave1 evidence-summary.md 和 question-list.md 内容充实（17-32KB），cache leaves 也都在。说明 sub-agent 做了 research 但没把发现物化为独立 reference 文件。**

---

## 2. 为什么这是 bug

### 2.1 消费路径断裂

DPT_FRAMEWORK 的消费者（用户）的阅读路径是：

```
seed_topics/{slug}.md  →  reference/{slug}-*.md  →  _cache/... 或 artifacts/...
    (入口)                  (第一层证据)               (深层数据)
```

Reference 文件是消费者从 seed topic 跳出来后的**第一站**——在这里他们看到 source 的 metadata、key facts、relevance、quotable terms。如果 reference/ 是空的，消费路径在第一跳就断了——用户只能跳到 evidence-summary.md（那是生产中间件，不是为消费设计的）。

### 2.2 生产-消费不对称

| 层级 | 生产者视角（Pipeline 内部） | 消费者视角（外部阅读） |
|------|--------------------------|---------------------|
| 入口 | seed_topics/{slug}.md（搜索指令） | seed_topics/{slug}.md（研究索引） |
| 第一跳 | evidence-summary.md（Agent 汇总） | **reference/{slug}-*.md（独立 source 文件）** ← 缺失 |
| 深层 | _cache/（机器可读缓存） | _cache/ 或 artifacts/（需要时才深入） |

消费者期望在 reference/ 看到**按 topic 组织的、每篇独立 source 一个文件**的知识 map。但生产流程把研究内容都压进了 evidence-summary.md（一个按机制/趋势/局限组织的长文），没有拆成独立 reference 文件。

### 2.3 Phase 指令和 Sub-agent 行为之间的 gap

Phase-wave1.md §3.1 的 task card 模板明确写：
```json
"writes_to": [
    "artifacts/wave1/{topic.slug}/evidence-summary.md",
    "artifacts/wave1/{topic.slug}/question-list.md",
    "reference/{topic.slug}-<source-slug>.md"       ← 第三个产出
]
```

但 sub-agent 只写了前两个。reference 文件的 writing 被 sub-agent 理解为 "optional" 而非 "required"。

---

## 3. 根因

### 3.1 task card 的 `required_receipts` 不包含 reference

```json
"required_receipts": [
    "file:artifacts/wave1/{topic.slug}/evidence-summary.md",
    "file:artifacts/wave1/{topic.slug}/question-list.md"
]
```

`reference/` 文件在 `writes_to` 里但在 `required_receipts` 外——engine 不检查它们是否存在。Sub-agent 自然跳过"非强制"产出。

### 3.2 Reference 文件格式指令不够突出

Phase-wave1.md §3.2 第 123 行说 "Reference files must follow `shared-reference-template.md`"——但这是一句 prose，夹在一个很长的 bullet list 中。Sub-agent 读 task.md（不读 phase MD），task.md 的 Output Contract section 没有重复这个要求。

### 3.3 BUG-060 背景

Sub-agent 产出物和 engine contract 之间的系统性 mismatch（BUG-060）在这里表现为：sub-agent 产出了 research 内容（evidence-summary 里详细记录了每个 source），但没有把它们物化成 engine 和消费者都期望的独立 reference 文件。

---

## 4. 修复方向

三个选项。**推荐选项 C（长期方案，但应该现在做）。**

### 选项 A（短期 — 不推荐）：把 reference 加入 required_receipts

做法：task card 的 `required_receipts` 加 `"file:reference/{topic.slug}-<source-slug>.md"`，强制 sub-agent 写 reference。

**为什么不行**：sub-agent 已经是 BUG-060 的重灾区——连 result.json 格式、receipt 字段、cache 文件命名这些更基础的事都做不对。让它再多写一个 reference 文件，只会：
- 多一个出错点（格式不符合 canonical template）
- 多一个 gate 卡住的原因（reference format validation）
- sub-agent 做 6 件事（搜索、evidence-summary、question-list、reference、result.json、receipt），每件都可能出错

给不可靠的环节加更多责任 = 更多 whack-a-mole。

### 选项 B（中期 — 不够彻底）：Phase Agent post-submit 检查 + gate enforcement

做法：Phase Agent 在 submit 后检查 reference 文件是否存在，缺失时自己补充。Gate 加 per-topic reference file count。

**为什么不够**：这是一个补丁，不是修复。Phase Agent 仍然在"弥补 sub-agent 的遗漏"——根因（职责混乱）没有解决。而且 gate 加新规则 = 又一个可能卡住的地方。

### 选项 C（长期 — 推荐，应该现在做）：解耦搜索和呈现

**核心思路：sub-agent 只做搜索+采集。Phase Agent 做物化+呈现。**

```
现在（错的）：
  sub-agent 做 6 件事：搜索 → evidence-summary → question-list → reference → result.json → receipt
  一个 LLM 承担全部，每件都可能出错

应该（对的）：
  sub-agent:  搜索 → 写 evidence-summary（含 source 详情）→ 写 cache leaves
  Phase Agent: 读 evidence-summary → 提取 source → 按 shared-reference-template.md 写 reference 文件
```

**为什么这是对的：**

1. **职责匹配能力**：Phase Agent 能精确遵循 canonical 格式（9 字段 5 section）——这是格式化输出，不是创造性工作。Sub-agent 的能力在搜索和内容提取，不在格式精确性。

2. **数据已经有了**：evidence-summary 里每个 source 的 URL、author、trust tier、content summary 都在。写 reference 只是把这些信息按模板重新组织——不需要新搜索，不需要新 fetch。

3. **不给 sub-agent 增加任何责任**：不改 task card 模板，不加 required_receipts，不改 engine contract。Sub-agent 继续做它已经在做的事（而且做得不错——evidence-summary 17-32KB，内容质量高）。

4. **降低 gate 卡住风险**：reference 文件由 Phase Agent 生成 → 不存在 sub-agent 产出格式错误 → 不增加 gate 失败点。如果 Phase Agent 生成错了，格式问题一眼就能看出来（而 sub-agent 的错藏在 work-unit submit 的深处）。

5. **消费路径自然修复**：Phase Agent 写完 reference 后，消费者从 seed_topics → reference/ 的路径就通了。Reference 文件格式统一、质量可控。

**具体改动**（最小化、不改 engine）：

| 改什么 | 怎么改 |
|--------|--------|
| Phase-wave1.md §3.2 | 增加 "After each successful submit, before backfill: Phase Agent reads evidence-summary.md, extracts key new sources, writes at least one reference/{topic.slug}-{source-slug}.md per topic following shared-reference-template.md." |
| Task card 模板 | **不改**。reference 保持在 writes_to 但不在 required_receipts。Sub-agent 不写 reference 不再是 bug，而是 design。 |
| Sub-agent 定义 | **不改**。Sub-agent 继续只做搜索+采集。 |

**工作量**：每个 topic 写 1-3 个 reference 文件，Phase Agent 从 evidence-summary 提取信息，每个文件 ~5 分钟。对 wall-clock 影响可忽略（sub-agent 运行 7 分钟，Phase Agent 在等待期间就可以写）。

---

### 为什么不能随便挑一个

选项 A 和 B 都是"让 sub-agent 做更多事"的方向——这正是 BUG-060 的根源模式。**修复 BUG-064 不能重复 BUG-060 的错误。** Sub-agent 的可靠性问题（BUG-060）应该在 engine 层通过防御性容错解决，而不是通过给 sub-agent 加更多责任来解决。把呈现层从 sub-agent 剥离到 Phase Agent，是一劳永逸地消除这个 failure mode。
