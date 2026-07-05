---
node_type: phase
id: phase-seed-topics
phase: seed-topics
gate: seed-topics-ready
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Seed Topics Materialization

## 0. Execution Brief

- **Objective**: Materialize `rb_plan.md` `topic_registry` into search-relevant seed topic files.
- **Start here**: Read `rb_plan.md` `topic_registry`, `rb_profile.yaml`, and the queue CLI state.
- **Path to pass**: Enqueue one materialization task per topic, drain the queue, repair slug/frontmatter mismatches, then run the seed-topics gate.
- **Completion check**: `check-gate-seed-topics-ready.mjs` passes for `phases/phase-seed-topics.md`.
- **Failure posture**: Treat empty queue or thin queue as work routing, not completion; repair from gate feedback and never invent missing topic semantics.

## 1. Stage Goal

把 `rb_plan.md` frontmatter 的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件——每个 topic 一个 `{slug}.md`（文件名 = `topic.slug` + `.md`）。`slug` 为 `NN_` 编号前缀 + 描述性短名的结构化标识符（如 `01_official-stance`、`02_ai-safety`），`NN` 为零填充 1-based 数组序号。`id` 字段 SHOULD 与 NN 一致（如 `"01"`）；gate 不校验 id 格式——这是 convention 层面的统一。slug 同时承担编号、文件系统排序（`ls` 自然按数字序排列）、人读和跨 wave 引用多重职责。每个文件含 YAML frontmatter（id/slug/title + must_answer/hypothesis/search_guardrails/evidence_route 等必需字段）和正文研究骨架。为 Wave0 的 reference collection 提供可追溯的 topic 入口。

**`seed-topics-ready` 是结构+数量+一致性 gate，不是 topic 语义质量 gate。** 语义质量（topic 是否覆盖关键维度、是否与 research question 对齐）由 HITL1 阶段人类审查（`stop: yes`）负责。

## 2. Required Inputs

- 已通过 `setup-ready` gate 的 active bundle
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `rb_profile.yaml` 的 `root_must_answer_set` 和 `research_profile`（topic 派生的上游约束）
- `shared-schemas.md`（schema、trace、seed_topics/ 目录结构）
- `DPT_FRAMEWORK/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）

## 3. Allowed Actions — Queue-Driven 三阶段

> **`gap_queue_backed` 处理**：Agent SHALL 在 seed-topics 阶段读取 `rb_profile.yaml` 的 `root_must_answer_set`，通过文本模式识别标记为 `gap_queue_backed` 的条目（包含 "不确定"/"先帮我拆"/"不知道具体该问什么" 等不确定性语义标记）。对每个 `gap_queue_backed` 条目，Agent SHALL 生成对应的 **question decomposition task card**——将用户的不确定问题拆解为具体的澄清/探索子问题，排入 queue。Agent SHALL NOT 阻塞流程或要求用户澄清——`gap_queue_backed` 是正常的输入状态，不是错误。

Seed-topics 使用 Agentic Queue 驱动 topic 物化。每个 topic 一个 task，由 Phase Agent 直接执行（当前 wire value 为 `main-agent`；无外部 search，从 topic_registry 的结构化定义写为文件）。seed topic 文件 **不是笼统的标签**——它必须是能驱动后续 search 的决策级文件。

### 3.1 灌料 (Filling) — 首次进入 seed-topics

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health` 为 thin/blocked 或 active_window 为空）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定 topic 集合及其数组顺序
2. 为每个 topic 生成一个 task card JSON 文件，然后 enqueue：

> **注意**：文件名直接使用 `{topic.slug}.md`（`slug` 含 `NN_` 编号前缀，如 `01_meal-timing-...`——`NN` 取自 topic_registry 数组 1-based 位置）。不需二次拼接 index。

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-seed-{topic.slug}.json`）：**

```json
{
  "work_id": "seed-topic-{topic.slug}",
  "title": "Materialize seed topic: {topic.title}",
  "targets": { "controller": "main-agent" },
  "action": "将 topic_registry 中的 [{topic.slug}]（标题：{topic.title}）物化为 seed_topics/{topic.slug}.md。该文件必须是 search-relevant decision document——能告诉后续 wave0 source intake 搜索什么、怎么搜、避免什么。具体要求见本 phase body §3.1 的 Seed Topic 文件结构。从 rb_plan.md topic_registry 和 rb_profile.yaml 中提取该 topic 的 must_answer、hypothesis、scope、search_guardrails、evidence_route 等信息填入。",
  "producer_rule": "seed_topic_materialize",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "seed-topics"},
  "priority_class": "P3_current_gate_gap",
  "required_receipts": ["file:seed_topics/{topic.slug}.md"],
  "done_condition": "seed_topics/{topic.slug}.md 存在，YAML frontmatter 含 id/slug/title（均非空），slug 与文件名 stem 一致，正文初始化区含 §3.1 文件结构规定的全部 sections（主题定位/must_answer/初始假设/why now/研究边界/证据锚点/交付价值/下游位置），轮次追加区为空占位（含分隔标记和回填责任表）",
  "verification": {"engine": ["receipt_check"], "agent": ["frontmatter_completeness", "slug_consistency", "content_has_all_sections"]},
  "writes_to": ["seed_topics/{topic.slug}.md"],
  "status_sync": ["seed_topics_materialized"],
  "completion_receipt": "file:seed_topics/{topic.slug}.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}"}
}
```

3. Enqueue 每个 task card：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-seed-{topic.slug}.json
```

4. 全部 topic 灌入后验证：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```

**Seed Topic 文件结构（每个 `seed_topics/{slug}.md` 必须满足）：**

文件名格式：`{slug}.md`，其中 `slug` 为 registry 中该 topic 的 `slug` 字段值（含 `NN_` 前缀的描述性短名，如 `01_official-stance`）。`NN` 取自该 topic 在 `topic_registry` 数组中的 1-based 位置（两位零填充）。`id` 字段 SHOULD 与 `NN` 一致（如 `"01"`）。gate 校验 `filename_stem == registry_slug == frontmatter_slug`（三重一致）。

**frontmatter 使用 YAML 格式**（gate 通过 `parseMdFrontmatter()` 内部调 `parseYaml()` 解析，YAML 1.2 是 JSON 的超集——JSON frontmatter 同样合法）。frontmatter `slug` 必须与文件名 stem 完全一致（byte-for-byte）。

**文件分两段：上半段（初始化区）在 seed-topics phase 写入，下半段（轮次追加区）预埋为空占位，由 wave0/wave1/wave2 回填。** seed-topics-ready gate 不检查轮次追加区内容——留空是合法状态。

```markdown
---
id: "<topic-id>"
slug: "{topic.slug}"
title: "<topic 标题>"
must_answer:
  - "<该 topic 需要回答的具体问题 1>"
  - "<该 topic 需要回答的具体问题 2>"
hypothesis: "<初始假设或 known gap>"
in_scope: "<搜索边界>"
out_of_scope: "<排除边界>"
search_guardrails:
  required_terms:
    - "<必含词>"
  forbidden_broadening:
    - "<禁止泛化的方向>"
evidence_route:
  preferred_sources:
    - "<可信来源类型 1>"
  noise_to_avoid:
    - "<已知噪音方向>"
---

# <topic 标题>

## 主题定位
<一段叙述：这个 topic 为什么值得研究，核心问题是什么，在本轮研究中的角色（上限参照 / 组织变革案例 / 信任锚点等）>

## must_answer
1. <该 topic 需要回答的具体 investigatable 问题 1>
2. <该 topic 需要回答的具体 investigatable 问题 2>

## 初始假设、缺口或张力
**已知**：<从 topic_registry 和 rb_profile.yaml 中已有的确定信息>
**缺口**：<上游未提供、需要 wave0 搜索才能填补的信息>
**张力**：<已知信息之间的矛盾、需要独立验证的声称、需要警惕的叙事偏差>

## why now
- <触发事件和时间窗口——为什么这个 topic 现在需要研究，不是半年前也不是半年后>
- <法规时钟、市场窗口、技术里程碑等>

## 研究边界与不深挖范围
**在范围内**：
- <具体的研究边界>

**不深挖**：
- <明确排除的方向>

## 证据锚点与优先来源
- <具体来源名称 1> — 为什么优先，可信度评估
- <具体来源名称 2> — 注意事项或已知 bias
- **注意**：<需要额外警惕的来源类型>

## 为什么对最终交付物重要
<这个 topic 对 final deliverable 的价值——不是抽象的"很重要"，而是具体的：在最终方案中作为什么类型的证据/启发/案例？>

## 下游位置（可选）
- <流向哪个 section/breakout>

---

## ═══ 研究轮次追加区 ═══

> **预埋说明**: 以下 sections 在 seed-topics 阶段**不填充**。
> 每个后续 wave 完成后**必须回到本文件追加对应内容**：
>
> | 触发 Phase | 追加内容 | 写入 Section |
> |-----------|---------|-------------|
> | wave0 complete | 每条 ref 的 url/title/tier/trust/key data | `## 本轮新增证据` |
> | wave1 complete | 学到的机制理解、涌现的趋势和难点 | `## 本轮新增机制理解` `## 本轮新增趋势与难点` |
> | wave2 complete | 综合后的最终判断 | `## 当前判断` |
> | 每轮 complete 后 | 更新问题状态标签 | `## 待验证问题` |
>
> **不遵守此规则的后果**: gate 不检查正文完整性，但 wave2 synthesis 质量严重依赖回填。
>
> **回填方式**: 每个 section 下的 `__BACKFILL_*__` 是唯一占位 token。Agent 回填时 grep 定位 token → **直接替换该行为实际内容**（不追加，不保留 token）。例如 wave0 回填 `__BACKFILL_WAVE0_EVIDENCE__` → `- **ref-01-01**: ...`。

## 历史摘要
*(seed-topics: 本 topic 为新建，无历史轮次)*

## 本轮新增证据
__BACKFILL_WAVE0_EVIDENCE__

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
```

若 `rb_plan.md` 和 `rb_profile.yaml` 中不足以填充初始化区字段（如 hypothesis 或 evidence_route 缺失），**标注为显式 gap**（如 `hypothesis: "pending — HITL1 未提供足够约束"`），不要编造。gap 本身是有效的 seed topic 信息——它告诉 wave0 "这个 topic 目前搜索范围较宽，需要 source intake 过程中收敛"。

正文中的 `## 原始语境约束` block 已合并到初始化区各对应 section（search_guardrails → `## 证据锚点与优先来源`，in_scope/out_of_scope → `## 研究边界与不深挖范围`），不再单独列出。

### 3.2 Queue-Driven 执行循环

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUEUE-DRIVEN EXECUTION LOOP                      │
│                                                                      │
│  ┌─ 1. claim ──────────────────────────────────────────────────────┐│
│  │   operate-queue claim <bundle> --actor main-agent               ││
│  │   → stdout JSON: { item: {...task card...}, ... }                ││
│  │   → item 为 null → queue 空 → 跳到 §3.3                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 2. execute ────────────────────────────────────────────────────┐│
│  │   targets.controller = main-agent（当前 wire value；seed topic     ││
│  │   物化不涉及搜索，Phase Agent 直接从 topic_registry + profile 写入）││
│  │   a. 读取 task.payload.topic_slug                                 ││
│  │   b. 从 rb_plan.md topic_registry 获取该 topic 的完整定义        ││
│  │   c. 从 rb_profile.yaml 获取 root_must_answer_set,               ││
│  │      research_profile 等上游约束                                 ││
│  │   d. 按 §3.1 Seed Topic 文件结构创建 seed_topics/{topic.slug}.md ││
│  │   e. 缺失信息标注为 gap（不编造）                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 3. complete ───────────────────────────────────────────────────┐│
│  │   a. 创建 result JSON → /tmp/wfq-seed-result-{work_id}.json:    ││
│  │      { "work_id": "...",                                         ││
│  │        "receipt": "file:seed_topics/{topic.slug}.md",             ││
│  │        "summary": "materialized seed topic {topic.slug}",         ││
│  │        "writes": ["seed_topics/{topic.slug}.md"] }                ││
│  │   b. 运行:                                                       ││
│  │      operate-queue complete <bundle> --result <result.json>      ││
│  │   → receipt check PASS → promote → refill → render               ││
│  │   → receipt check FAIL → engine 自动生成 repair task             ││
│  │       → 读 inspect/advice → 修复 → 回到 claim                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 4. 读投影 → 回到 step 1 ───────────────────────────────────────┐│
│  │   cat <bundle>/_cache/agentic-queue/current-task.md              ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**执行约束：**
- **不跳过 task**：只要 claim 返回了 task card，就执行+complete
- **不编造信息**：`must_answer`、`hypothesis`、`search_guardrails`、`evidence_route` 如果上游（topic_registry / profile）未提供，标注为显式 gap，不编造
- **complete 阻塞**：receipt check 失败 → engine 生成 repair → 修复 → re-claim
- **seed topic 不是 chapter label**：每个 seed topic 必须包含足够的 search-relevant 约束（search_guardrails + evidence_route），否则 wave0 sub-agent 无法做定向搜索

### 3.3 Queue 空后 — 收尾与 Gate

#### Transition trigger

当 `operate-queue claim <bundle> ...` 返回 `item: null` 时，表示 active queue 已被 drain。Agent 应进入本节的 closeout/gate 流程，不得因为没有新 task 就自行发明 work item。

当 claim 返回 `item: null`（queue 空）时：

1. 跑 gate：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```
2. gate pass → 进入 §6：通过 `enter-phase --node <check.next>` 消费 `phase-wave0.md`，再同步 `seed_topics_ready`
3. gate fail → 按 §7 On Gate Fail 处理

## 4. Expected Artifacts

- `seed_topics/` 目录非空，其中对于 `topic_registry` 中的每个 topic 存在一个 `{slug}.md` 文件（slug 已含编号前缀）
- 每个文件的 frontmatter `slug` 与文件名 stem 一致，`title` 非空
- `seed_topics/` 下文件 slug 集合与 `topic_registry` slug 集合双向一致（无缺失、无多余）
- `rb_trace.jsonl` 中有 `seed_topics_completion` event（通过 CLI 写入）：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event seed_topics_completion --detail '{"topic_count":<N>}'
  ```
- Gate 前 status window 为 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（首次运行）或 `current_gate: rerun_ready` / `next_gate: seed_topics_ready`（rerun 回流）。Seed-topics gate pass 后，§6 的 `advance-status --to seed_topics_ready` 才会写入 `current_gate: seed_topics_ready` / `next_gate: wave0_complete`。

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-wave0.md`）。先消费 handoff，再同步 source gate status：

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to seed_topics_ready
```

从 `enter-phase` 渲染出的 wave0 Markdown 继续执行下一 phase。`advance-status` 只同步 just-passed source gate；它不是加载或执行下一 phase 的动作。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `seed_topics/` 为空目录 | 按 registry 创建对应 `{slug}.md` 文件 |
| slug 缺失（registry 有但磁盘无） | 为缺失的 topic 创建文件 |
| slug 多余（磁盘有但 registry 无） | 删除不在 registry 中的多余文件 |
| frontmatter `title` 为空 | 补充对应文件的 `title` 字段 |
| slug 与文件名 stem 不一致 | 统一为 registry 中的 slug |
| `trace_event_present` fail | 确认已记录 `seed_topics_completion` trace event |
| status drift | Gate 前恢复合法 predecessor window：首次运行用 `setup_ready`/`seed_topics_ready`，rerun 回流用 `rerun_ready`/`seed_topics_ready` |
| registry 为空 | 通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: blocks_must_answer`），从 `rb_plan.md` frontmatter 尝试重建 topic_registry，不浮出水面 |

**Persistent failure：** 若 seed-topics gate 连续 3 次修复无进展，通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: partial`）：
```bash
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"seed-topics","gate":"seed-topics-ready","gap_impact":"partial","reason":"persistent_failure_3x","attempts":3}'
```
不写 `state: blocked`。降级后 Agent 仍有责任继续尝试不同的修复策略，不浮出水面。

## 8. Stop Behavior

`stop: no` — Agent 自主物化，不发送阶段进度或 idle/no-work 汇报。Queue thin、active window 为空、registry 为空、或 seed topic 本地文件已写完，都不是停顿点；它们分别触发继续灌料、drain、registry repair、运行 gate 或静默降级。

若 registry 为空（topic 集合未建立），通过 accepted trace/log surface 记录 `silent_degradation`，尝试从 `rb_plan.md` frontmatter 重建 topic_registry。Phase handoff 完成条件是 `seed-topics-ready` gate pass + `enter-phase --node <check.next>` 写入 route-bound load witness + `advance-status --to seed_topics_ready`；不得自判完成或自行加载下一 phase。

## Rerun-Aware Behavior

> 本 phase 被 `phase-rerun.md` gate pass 后 chain 直接路由进入（`rerun → seed-topics`）。当 `rerun_count > 0` 时，Agent MUST 按增量模式执行，而非从零重新发现 topic。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`（或缺失/0），当前为 rerun 轮次。

### 增量行为

- **保留已有 topic**：`seed_topics/` 中已有的 topic 文件全部保留——不删除、不重建。已有 topic 若有 `## 本轮重跑方向` section，按其中的 `action` 调整后续 wave0 行为。
- **新增 topic**：若 `## 本轮重跑方向` section 指示 `action: add` 的新 topic，Agent MUST 为其创建 seed topic 文件（格式同首次 seed-topics）。新 topic 的 `## 本轮重跑方向` section 已在 phase-rerun 中写入。
- **移除 topic**：若 `action: remove`，topic_registry 已在 phase-rerun 中同步（条目已移除，seed_topic 文件已重命名为 `{slug}.md.deprecated`）。Agent MUST NOT 为其创建 wave0 task card。seed-topics 无需再操作 registry。
- **补充 topic**：若 `action: supplement`，已有 topic 文件不变，但 wave0 灌料时需读其 `## 本轮重跑方向` section 中的 `new_search_dimensions` 作为追加搜索角度。
- **无变更 topic**：若 topic 文件无 `## 本轮重跑方向` section 或 section 已处理完毕，按正常模式处理。

### 灌料时读方向 hints

在 enqueue 每个 topic 的 task card 前，Agent MUST 读取对应 `seed_topics/{slug}.md`——若存在 `## 本轮重跑方向` section 且 `action: supplement`，task card 的 action 字段中需包含 `new_search_dimensions` 作为追加搜索关键词。若 `action: add`（新 topic），全量搜索——与首次 wave0 一致。

## 9. Anti-Cheating Rules

- **禁止物化空目录就声称完成**：每个 registry topic 必须有对应文件
- **禁止创建与 `topic_registry` slug 不一致的文件**：slug 以 registry 为 source of truth
- **禁止编造 `must_answer_refs` 引用**：seed topic 正文只写研究骨架（维度/前提/open questions），不编造不存在的 reference
- **禁止在 seed-topics 阶段做 research**：seed-topics 是物化已有的 topic 定义，不做搜索/阅读/evidence 工作
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:seed-topics START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:seed-topics END — <summary>"` |
