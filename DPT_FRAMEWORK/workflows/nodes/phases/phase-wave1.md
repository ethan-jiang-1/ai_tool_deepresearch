---
node_type: phase
id: phase-wave1
phase: wave1
gate: wave1-complete
stop: "no"
requires:
  - shared/shared-profile
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
  - shared/shared-subagent-protocol
  - phases/phase-wave1-subagent
---

# Phase: Wave1 — Topic-Specific Deepening

## 1. Stage Goal

对 topic_registry 中的每个 topic 做定向 deep research，产出 `artifacts/wave1/{topic}/evidence-summary.md` 和 `artifacts/wave1/{topic}/question-list.md`（paired artifacts per topic）。使用 Agentic Queue 驱动的批量 Sub-agent 并行执行——每个 topic 一个 deepening task card，Sub-agent（role: `dpt-evidence-extractor`）通过 `subagent-relay.mjs` 的 slot 契约执行 WebSearch+WebFetch，Phase Agent 通过 relay validation pipeline 收集结果，每完成一个 topic 立刻回填 seed topic 的 backfill token。

**Wave1 产出不再是 foundation-placeholder skeleton**——产出是包含真实 search 结果的 evidence summary + question-list。

## 2. Required Inputs

- 已通过 `wave0-complete` gate 的 active bundle（`reference/` + `seed_topics/` 已就绪）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（research profile 和 root must-answer set）
- `shared-schemas.md`（EvidenceSummary 字段定义和 wave artifact 目录结构）
- `shared-subagent-protocol.md`（relay slot 通信契约、目录结构、并发控制、Forbidden Authority、抓取链）
- `DPT_FRAMEWORK/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）
- `DPT_FRAMEWORK/engine/subagent-relay.mjs`（Sub-agent Relay Engine — slot 生命周期管理）
- 运行 Phase Agent 有页面搜索工具（如 Claude Code `WebSearch` 或 Codex `web_search`）。页面内容抓取：如有内置工具（Claude Code `WebFetch`）则使用，否则走 `shared-subagent-protocol.md` 抓取链

## 3. Allowed Actions — Queue-Driven 三阶段

### 3.1 灌料 (Filling) — 首次进入 wave1

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health: "thin"` 或 `active_window` 为空，无待执行 task）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定 topic 集合
2. 为每个 topic 生成一个 task card JSON 文件，然后 enqueue：

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-wave1-{topic.slug}.json`）：**

> **模板变量来源**：`topic_registry` 数组中的每个条目含 `id`、`slug`、`title` 三个字段。模板中 `{topic.slug}` 取 `slug` 字段值，`{topic.title}` 取 `title` 字段值。搜索关键词从 `seed_topics/{topic.slug}.md` 的 `search_guardrails.required_terms` 和 `## 待验证问题` 中的 open questions 派生。

```json
{
  "work_id": "wave1-deepen-{topic.slug}",
  "title": "Deepen topic: {topic.title}",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "对 [{topic.title}] 做 topic-specific 深度搜索。从 seed_topics/{topic.slug}.md 的 search_guardrails 和 open questions 派生搜索关键词。使用 WebSearch 找到至少 1 条可信的 topic-specific 深度证据来源，使用 WebFetch 获取每个来源的页面内容。如果 WebFetch 被阻止，必须走降级链：curl -L → node fetch → python3 urllib，全部失败才可报告 inaccessible。提取关键发现（mechanisms）、趋势（trends）、难点（pain points），以及当前问题的状态更新。写入 artifacts/wave1/{topic.slug}/evidence-summary.md（含 source URL、key findings、open questions 三部分）。搜索中间结果写入你的 slot 对应的缓存目录——不要写入共享目录。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave1"},
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:artifacts/wave1/{topic.slug}/evidence-summary.md", "file:artifacts/wave1/{topic.slug}/question-list.md"],
  "done_condition": "artifacts/wave1/{topic.slug}/evidence-summary.md 存在（含至少 1 条 source URL 和 key findings section 非空），artifacts/wave1/{topic.slug}/question-list.md 存在（含四节结构：Topic Investigation Targets、Question Reconciliation、Emergent Question Protocol、Exploration/Exploitation Decision）",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "key_findings_non_empty", "question_list_four_sections", "open_questions_canonical_labels"]},
  "writes_to": ["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md"],
  "status_sync": ["wave1_deepening"],
  "completion_receipt": "file:artifacts/wave1/{topic.slug}/evidence-summary.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}"}
}
```

3. Enqueue 每个 task card：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-wave1-{topic.slug}.json
```

4. 全部 topic 灌入后，验证：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```
确认 `queue_health: "ready"` 且 active_window 已填充。

### 3.2 Batch Parallel Execution — 引用 Shared Sub-agent Protocol

Wave1 的 claim→execute→complete 使用 relay 批量并行执行（灌料→stage→并行 spawn→collect-as-return→backfill→补位→merge→gate）。Sub-agent 的具体搜索和产出指令见 `phase-wave1-subagent.md`（via `suggested_context`）。Relay 基础设施（slot 契约、目录结构、并发控制、禁区清单）见 `shared-subagent-protocol.md`。

**Wave1 参数表**：

| 参数 | 值 |
|------|-----|
| `role_key` | `dpt-evidence-extractor` |
| `artifact_template` | `artifacts/wave1/{topic.slug}/evidence-summary.md` |
| `question_list_template` | `artifacts/wave1/{topic.slug}/question-list.md` |
| `artifact_schema` | `EvidenceSummary` |
| `backfill_tokens` | `["__BACKFILL_WAVE1_MECHANISMS__", "__BACKFILL_WAVE1_TRENDS__", "__BACKFILL_PENDING_QUESTIONS__"]` |
| `per_topic_backfill` | `true` |
| `search_focus` | topic-specific deep evidence |
| `timeout_ms` | `600000` |

**执行约束**（wave1 特有，叠加 `shared-subagent-protocol.md` Forbidden Authority）：

- **不跳过 task**：只要 claim 返回了 task card（`item` 非 null），就必须执行并 complete，不得无故跳过
- **不伪造 evidence**：每条 key finding 必须来自 WebSearch + WebFetch 获取的真实页面。不允许拿搜索摘要当 evidence 凑合
- **网页内容抓取**（`shared-subagent-protocol.md` Page Content Fetching Chain）：内置工具（如 `WebFetch`）或用户显式开启的浏览器优先，没有则从 `curl` → `node` → `python3`。所有手段都失败才能报告"无法获取内容"
- **complete 阻塞**：如果 complete 时 receipt check 失败（evidence-summary.md 不存在或 schema 不对），engine 自动生成 repair task（`producer_rule: queue_repair`），Phase Agent 必须修复而不是跳过
- **上下文隔离**：由 relay slot 契约在机制上强制（见 `shared-subagent-protocol.md` Communication Contract）。Sub-agent 只收到 bounded 上下文，Phase Agent 通过 `commitSlotResult()` 收集结构化 `result.json`，不读 Sub-agent 原始搜索 trail
- **即时回填 seed topic（不可跳过）**：每个 topic 的 deepening task complete 成功后，**在 claim 下一个 task 之前**，必须立刻回填 `seed_topics/{topic.slug}.md`。回填规则见下节

#### 3.2.1 Inline Backfill 规则（Per-Topic 即时回填）

与 wave0 一样，wave1 采用 per-topic 即时回填。每个 deepening task complete 后立刻回填对应 seed topic，再 claim 下一个。趁 evidence extraction 还在 fresh 就写，等全部做完再回填第一个 topic 的细节已丢失。

每次回填动作（按顺序执行三个 token 替换）：

1. **`__BACKFILL_WAVE1_MECHANISMS__`** → `grep` 定位 token 行 → 从刚写入的 `artifacts/wave1/{topic.slug}/evidence-summary.md` 的 key findings 中提取至少 1 条机制理解（编号列表）→ **替换 token 行**（不追加，不保留 token）
2. **`__BACKFILL_WAVE1_TRENDS__`** → `grep` 定位 token 行 → 追加趋势和难点（难点用 `**趋势观察**:` prefix 表达，不作为独立 prefix）→ **替换 token 行**
3. **`__BACKFILL_PENDING_QUESTIONS__`** → `grep` 定位 token 行 → 更新该 topic 问题的状态标签——**必须**使用规范标签：`[开放]`（本轮未获新证据）、`[部分解答]`（本轮获取了部分进展）、`[涌现]`（本轮 evidence 中新产生的 emergent question）——**禁止**使用 topic-descriptor 标签（如 `[Bridge gap]`、`[EU enforcement]`）→ **替换 token 行**

**Evidence-summary.md 文件结构（每个 `artifacts/wave1/{topic.slug}/evidence-summary.md` 必须满足）：**

```markdown
# Evidence Summary: {topic.title}

## Source URLs
- [Source Title 1](https://example.com/source1) — retrieved YYYY-MM-DD
- [Source Title 2](https://example.com/source2) — retrieved YYYY-MM-DD

## Key Findings
1. **机制理解**: <从 source 中提取的关键机制——如何工作的？>
2. **机制理解**: <另一条机制发现>
3. **趋势观察**: <从 source 中提取的趋势——什么在变？>
...
（每条 Key Finding 的 bold prefix 必须是 `**机制理解**:` 或 `**趋势观察**:`。难点/pain points 归入 `**趋势观察**:` 表达，不作为独立 prefix）

## Open Questions
1. [开放] <问题 1 — 本轮 evidence 未提供新信息>
2. [部分解答] <问题 2 — 本轮 evidence 提供了部分进展，但仍未完全解决>
3. [涌现] <问题 3 — 本轮 evidence 中新产生的 emergent question>
...
（每条 Open Question 的状态标签必须是 `[开放]`、`[部分解答]` 或 `[涌现]`。禁止使用 topic-descriptor 标签如 `[Bridge gap]`、`[Interpretability reliability]`——状态标签描述的是答案完整度，不是问题主题）
```

**question-list.md 文件结构（每个 `artifacts/wave1/{topic.slug}/question-list.md` 必须满足）：**

> **设计说明**：question-list.md 是四节探索账本（exploration ledger），与 evidence-summary.md 成对产出。当前 wave1 为单轮 deepening（single-pass），question-list.md 作为 reflection artifact 记录本轮 evidence 对问题状态的影响。多轮迭代（full explore/exploit loop with 9 decision states）是 future expansion track。

```markdown
# Question List - Topic: {topic.title}

produced_at_ref_count: {本轮 source 数量}
last_updated: YYYY-MM-DD

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| {slug}-T01 | {从 seed topic 继承的 open question} | seed | {开放/部分解答} | {source URL} | {继续 deepening / 移交 wave2} |
| {slug}-T02 | ... | seed | ... | ... | ... |

（每个 seed topic 的 open question 必须映射到至少 1 行。`origin` 是问题来源：`seed`=从 seed topic 继承，`emergent`=本轮 evidence 新涌现）

## Question Reconciliation

- [部分进展] {从 seed topic 带来的原始问题}: {本轮 evidence 提供了什么进展；引用 source URL}
- [仍开放] {本轮 evidence 未触及的问题}: {原因——source 不覆盖，或需要不同搜索策略}
- no_prior_questions_to_reconcile: {仅在 seed topic 无 prior open questions 时使用}

（标记必须是 `[已解决]`、`[部分进展]`、`[仍开放]` 或 `[需内部数据]`。每个 prior question 必须有对应的条目——不能跳过）

## Emergent Question Protocol

- new_concept: checked; {本轮 evidence 引入的新概念 / none}; trigger_refs={source URL or none}
- contradiction: checked; {evidence 之间的矛盾 / none}; trigger_refs={source URL or none}
- missing_information_gap: checked; {evidence 明显缺失的维度 / none}; trigger_refs={source URL or none}
- noise_pattern: checked; {搜索噪声模式 / none}; trigger_refs={source URL or none}
- result: [涌现] {new question with trigger evidence} / no_new_questions_after_protocol

（4 项检查必须全部记录结果——即使某项结果为 `none` 也要显式写出）

## Exploration / Exploitation Decision

- decision: {continue}  *(single-pass mode: always 'continue'; full explore/exploit loop is future expansion)*
- trigger_refs: {本轮使用的 source URLs}
- unresolved_questions: {still-open targets after this pass — 映射回 Topic Investigation Targets 表中 status 为 `开放` 的行}
- queue_consequence: {移交 wave2 cross-topic synthesis / further deepening task}
- next_action: {immediate Queue or Wave 2 action}
- last_updated_ref_count: {本轮 source 数量}
```

### 3.3 收尾与 Gate

当所有 Sub-agent 已返回、queue 无 pending task card 时：

1. `collectAndMergeSubagentResults(state, slots, baseDir)` — collect 所有 slot 结果，merge evidence counts 到 WorkflowState
2. 检查 artifact 完整性：
   - 对于 `topic_registry` 中的每个 topic， `artifacts/wave1/{topic.slug}/evidence-summary.md` 是否存在、含至少 1 条 source URL、key findings section 非空
   - 对于 `topic_registry` 中的每个 topic， `artifacts/wave1/{topic.slug}/question-list.md` 是否存在、含全部四节（Topic Investigation Targets、Question Reconciliation、Emergent Question Protocol、Exploration/Exploitation Decision）
3. 跑 gate：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md
```
4. gate pass → 读取 `check.next` → 加载 `phase-wave2.md`
5. gate fail → 按 §7 On Gate Fail 处理

## 4. Expected Artifacts

- `artifacts/wave1/{topic}/evidence-summary.md`（对于 topic_registry 中的每个 topic，含至少 1 条 source URL + key findings（prefix `**机制理解**:`/`**趋势观察**:`）+ open questions（标签 `[开放]`/`[部分解答]`/`[涌现]`））
- `artifacts/wave1/{topic}/question-list.md`（对于 topic_registry 中的每个 topic，与 evidence-summary.md 成对存在。四节结构：Topic Investigation Targets 表、Question Reconciliation（`[已解决]`/`[部分进展]`/`[仍开放]`/`[需内部数据]`）、Emergent Question Protocol（4 项检查）、Exploration/Exploitation Decision（decision + unresolved_questions + queue_consequence + next_action）。单轮模式下 decision 固定为 `continue`）
- `seed_topics/{slug}.md` 中所有 `__BACKFILL_WAVE1_MECHANISMS__`、`__BACKFILL_WAVE1_TRENDS__`、`__BACKFILL_PENDING_QUESTIONS__` token 已被替换（无 stale token）
- `rb_trace.jsonl` 中有 `wave1_completion` event
- `rb_status.json` 中 `current_gate: wave1_complete` / `next_gate: wave2_complete`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `wave2`：加载 `phase-wave2.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| 某 topic 缺 `evidence-summary.md` | 为该 topic 创建 deepening task card → Sub-agent execute → complete |
| evidence-summary 不含 source URL | 补做 WebSearch + WebFetch，补充 source URL 和 key findings |
| key findings section 为空 | 从 source 内容中提取关键发现，补充到 evidence-summary |
| 某 topic 缺 `question-list.md` | 基于 evidence-summary.md 和 seed topic 创建 question-list.md（四节结构），填充 Topic Investigation Targets 表（映射 seed topic open questions）、Question Reconciliation（标记 prior question 状态变化）、Emergent Question Protocol（记录 4 项检查结果）、Exploration/Exploitation Decision（decision=`continue`） |
| question-list.md 缺少四节结构 | 补充缺失 section：Topic Investigation Targets（表）、Question Reconciliation、Emergent Question Protocol、Exploration/Exploitation Decision |
| question-list.md Emergent Question Protocol 4 项检查未记录 | 逐一检查 new_concept / contradiction / missing_information_gap / noise_pattern，即使结果为 `none` 也要显式写 `checked; none; trigger_refs=none`。注意：gate 的 `question_list_has_four_sections` 规则只验证 section header 存在，不验证 4 项检查是否填写——此项由 phase body 约束和 anti-cheating rules 兜底 |
| `__BACKFILL_WAVE1_*__` token stale（未替换） | grep 定位 stale token → 从 evidence-summary 提取内容 → 替换 token 行 |
| `trace_event_present` fail | 确认已记录 `wave1_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave1_complete`/`wave2_complete` |
| registry 为空 | 回到 HITL1 补充 topic_registry |

**Persistent failure：** 若 wave1 gate 连续 3 次修复无进展，记录 escalation。

## 8. Stop Behavior

`stop: no` — Phase Agent 自主执行 deepening 循环。每个 topic 的 deepening 和 backfill 不需要停下来等待用户审批。

## Rerun-Aware Behavior

> 当 rerun 路径被触发，Phase Agent MUST 按增量模式执行 deepening——已有维度的 deepening 结果保留，仅对新角度做 deepening。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`，当前为 rerun 轮次。同时读取各 topic 的 `seed_topics/{slug}.md` 中的 `## 本轮重跑方向` section。

### 增量行为

| 场景 | 行为 |
|------|------|
| **已有 topic，无变更** | 已完成的 deepening（`evidence-summary.md` + `question-list.md`）保留。跳过该 topic 的 deepening task card（不重复执行）。 |
| **已有 topic，有 `action: supplement`** | 保留已有 `evidence-summary.md` 和 `question-list.md`。只为 `new_search_dimensions` 中新增的角度做 deepening——创建 task card，action 聚焦新维度而非全量重搜。已有维度的 key findings 保留，新增 findings 以 "Rerun Supplement" 标记追加。`question-list.md` 的 Emergent Question Protocol 基于新 evidence 更新。 |
| **新增 topic（`action: add`）** | 全量 deepening——与首次 wave1 一致。创建 standard task card。 |
| **移除 topic（`action: remove`）** | 已有 `evidence-summary.md` 和 `question-list.md` 保留，不再为该 topic 创建 deepening task card。 |

### Backfill 约束

回填 seed topic 时，对于 `action: supplement` 的 topic：`__BACKFILL_WAVE1_MECHANISMS__` 和 `__BACKFILL_WAVE1_TRENDS__` token 行需同时保留已有内容和新增内容，用 `**(Rerun N 追加)**` 标记新增部分以便区分。`__BACKFILL_PENDING_QUESTIONS__` token 行更新时，已解答的问题标记为 `[部分解答]`，新增的 emergent question 标记为 `[涌现]` 并注明 `source_layer: rerun_N`。

## 9. Anti-Cheating Rules

- **禁止伪造 source URL 或 key findings**：每条 evidence 必须来自真实搜索/阅读，Sub-agent 必须写出真实的 WebSearch 和 WebFetch 结果
- **禁止跳过 Sub-agent 直接编造 evidence-summary**：Phase Agent 不允许在不 spawn Sub-agent 的情况下直接写 evidence-summary.md。Sub-agent 的 `runtime-receipt.jsonl` 必须记录 `agent_runtime_started` + `agent_result_ready` 两个 trace event
- **禁止声称 full evidence coverage**：Wave1 做单轮 deepening，不是 comprehensive research。partial evidence（某 topic 只找到有限 source）是合法产出
- **禁止在无法获取页面内容时编造**：`shared-subagent-protocol.md` 的抓取链是强制要求——不管有没有内置工具，必须试完 `curl` → `node` → `python3` 全部手段。禁止拿搜索摘要当网页内容
- **禁止移除 backfill token 而不替换内容**：token 必须被实际内容替换——不能删掉 token 留空 section
- **禁止产出只有占位符的 question-list.md**：question-list.md 必须包含实质性内容——Topic Investigation Targets 表中至少 1 行映射到 seed topic 的 open question，Question Reconciliation 至少标记 1 个问题的状态变化，Emergent Question Protocol 记录全部 4 项检查（即使结果是 `no_new_questions_after_protocol`），Exploration/Exploitation Decision 记录 decision 和 queue_consequence。不得用 "TBD"、"待补充" 等占位符填充各 section
- **禁止使用非规范问题状态标签**：evidence-summary.md 的 `## Open Questions` 标签必须是 `[开放]`、`[部分解答]` 或 `[涌现]`——不允许 topic-descriptor 标签（如 `[Bridge gap]`、`[Interpretability reliability]`）。question-list.md 的 `## Question Reconciliation` 标记必须是 `[已解决]`、`[部分进展]`、`[仍开放]` 或 `[需内部数据]`。这两套标签用于不同目的，不可混用
- **禁止声称 Sub-agent fan-in/fan-out complete**：multi-round iteration 是 future expansion track
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

---

## Future Expansion Guidance

> **本节是只读参考，不作为 `wave1-complete` gate 的 pass 条件。** 以下 tracks 描述了 full deepening 之后的扩展方向。当前 phase 已完成 track 1/2/4。剩余 track 3/5/6 留给后续 change。

### Expansion Tracks

| Track | 能力 | 状态 |
|-------|------|------|
| 1. topic-specific deepening | 对每个 topic 的 open questions 做定向 deep research，产出 evidence-summary.md | ✅ **已实现**（本 phase） |
| 2. Sub-agent dispatch | 启动独立 Sub-agent（`dpt-evidence-extractor`），通过 relay slot 契约执行 WebSearch+WebFetch，Phase Agent 通过 `ingestAgentReceipt` + `commitSlotResult` 收集结果 | ✅ **已实现**（通过 `subagent-relay.mjs` + `phase-wave1-subagent.md`） |
| 3. candidate intake | 从 deepening 产出中提取 candidate evidence particle，按 schema 入库 | ❌ 留给后续 |
| 4. repair/backfill | 对 gate fail 的 topic 做定向补充，per-topic 即时回填 `__BACKFILL_WAVE1_*__` token | ✅ **已实现**（本 phase §3.2.1 + gate repair） |
| 5. fan-in review | 收集 Sub-agent 结果后进行跨 topic 交叉验证和冲突解决 | ❌ 留给后续 |
| 6. quality gates | 对 deepening 产出的 evidence particle 做 schema 校验和引用一致性检查 | ❌ 留给后续 |

### Capability Boundary Summary

| 能力 | Foundation (旧 wave1) | Deepening (当前 wave1) |
|------|----------------------|------------------------|
| Topic-scoped deepening | ❌ 只写 skeleton + `foundation-placeholder` | ✅ 真实 search + evidence extraction |
| Sub-agent dispatch via relay | ❌ 不启动 | ✅ `dpt-evidence-extractor` Sub-agent via relay |
| Evidence-summary with real sources | ❌ placeholder only | ✅ 至少 1 条 source URL + key findings |
| Per-topic inline backfill | ✅ skeleton → `__BACKFILL_WAVE1_*__` | ✅ evidence → `__BACKFILL_WAVE1_*__`（refined） |
| Page content fetching chain | ❌ 未定义 | ✅ 内置工具/浏览器（如有）→ curl → node → python3 |
| Candidate intake | ❌ 不做 | ❌ 留给后续 |
| Fan-in review | ❌ 不做 | ❌ 留给后续 |

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave1 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave1 END — <summary>"` |
