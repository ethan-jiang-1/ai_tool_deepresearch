---
node_type: shared
id: phase-wave1-subagent
shared_scope: subagent-protocol
authority: guidance-only
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
---

# Wave1 Sub-agent: Topic-Specific Deepening

**Role:** `dpt-evidence-extractor`
**Phase:** wave1 (loaded by Phase Agent as `suggested_context` of `phase-wave1.md`)

## Purpose

Define what the wave1 Sub-agent searches for, produces, and must never do. Phase Agent reads this file to construct the Sub-agent's bounded task (`task.md`). Sub-agent receives only its relay slot files — it does not see this node.

The shared relay contract (`shared-subagent-protocol.md`) defines the communication mechanism. This file defines **what the Sub-agent does within that contract** for wave1 topic-specific deepening.

## 1. Search Focus — Topic-Specific Deep Evidence

Wave1 does **single-pass topic deepening** — not comprehensive research, not multi-round iteration, not cross-topic synthesis. Each topic gets one deepening pass that extracts mechanisms, trends, and open questions.

**What to search for:**
- Topic-specific evidence that goes deeper than the wave0 foundation reference
- Mechanisms (how things work, causal relationships)
- Trends (what is changing, emerging patterns, directional shifts)
- Contradictions or tensions in the evidence
- Open questions that remain unanswered

**Where to search:**
- Derive keywords from the seed topic's `search_guardrails.required_terms` and `## 待验证问题` open questions
- Prefer sources listed in `evidence_route.preferred_sources`
- Avoid sources listed in `evidence_route.noise_to_avoid`
- Use `search_guardrails.forbidden_broadening` to constrain scope

**Minimum output:** At least 1 source URL with real page content per topic.

## 2. Artifacts — Paired Files Per Topic

Wave1 produces TWO paired artifacts per topic:

| File | Role |
|------|------|
| `artifacts/wave1/{topic.slug}/evidence-summary.md` | "What We Know" — source URLs, key findings, open questions |
| `artifacts/wave1/{topic.slug}/question-list.md` | "What We Still Don't Know" — four-section exploration ledger |

### 2.1 evidence-summary.md

```markdown
# Evidence Summary: {topic.title}

## Source URLs
- [Source Title 1](https://example.com/source1) — retrieved YYYY-MM-DD
- [Source Title 2](https://example.com/source2) — retrieved YYYY-MM-DD

## Key Findings
1. **机制理解**: <从 source 中提取的关键机制——how something works>
2. **机制理解**: <另一条机制发现>
3. **趋势观察**: <从 source 中提取的趋势——what is changing>
...
```

**Key Findings rules:**
- Each numbered finding MUST start with exactly `**机制理解**:` or `**趋势观察**:` as the bold prefix
- `**机制理解**:` = how something works, causal relationships, structural explanations
- `**趋势观察**:` = what is changing, emerging patterns, directional shifts
- Pain points/难点: report under `**趋势观察**:` — not a separate prefix

**Open Questions section** (standard location: after Key Findings):

```markdown
## Open Questions
1. [开放] <问题 1 — 本轮 evidence 未提供新信息，still open>
2. [部分解答] <问题 2 — 本轮 evidence 提供了部分进展，但未完全解决>
3. [涌现] <问题 3 — 本轮 evidence 中新产生的 emergent question>
```

**Open Questions label rules:**
- Labels MUST be exactly `[开放]`, `[部分解答]`, or `[涌现]`
- `[开放]` = question received no new evidence this round
- `[部分解答]` = question received partial progress but is not resolved
- `[涌现]` = new question that emerged from this round's evidence (not in original seed topic)
- **禁止 topic-descriptor 标签** — 不可以用 `[Bridge gap]`、`[Interpretability reliability]`、`[EU enforcement]` 等描述问题主题的标签。状态标签描述的是答案完整度，不是问题领域

### 2.2 question-list.md

> 当前 wave1 为单轮 deepening（single-pass），question-list.md 作为 reflection artifact 记录本轮 evidence 对问题状态的影响。多轮迭代（full explore/exploit loop with 9 decision states）是 future expansion。

```markdown
# Question List - Topic: {topic.title}

produced_at_ref_count: {本轮 source 数量}
last_updated: YYYY-MM-DD

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| {slug}-T01 | {从 seed topic 继承的 open question} | seed | {开放/部分解答} | {source URL} | {继续 deepening / 移交 wave2} |

（每个 seed topic 的 open question 映射到至少 1 行。`origin`=`seed`=从 seed topic 继承，`emergent`=本轮 evidence 新涌现）

## Question Reconciliation

- [部分进展] {prior question}: {本轮 evidence 提供了什么进展；引用 source URL}
- [仍开放] {prior question}: {原因——source 不覆盖，或需要不同搜索策略}
- no_prior_questions_to_reconcile: {仅在 seed topic 无 prior open questions 时使用}

（标记必须是 `[已解决]`、`[部分进展]`、`[仍开放]` 或 `[需内部数据]`——每个 prior question 必须有对应条目）

## Emergent Question Protocol

- new_concept: checked; {本轮 evidence 引入的新概念/none}; trigger_refs={source URL or none}
- contradiction: checked; {evidence 之间的矛盾/none}; trigger_refs={source URL or none}
- missing_information_gap: checked; {evidence 明显缺失的维度/none}; trigger_refs={source URL or none}
- noise_pattern: checked; {搜索噪声模式/none}; trigger_refs={source URL or none}
- result: [涌现] {new question with trigger evidence} / no_new_questions_after_protocol

（4 项检查必须全部记录——即使结果为 `none` 也要显式写出）

## Exploration / Exploitation Decision

- decision: {continue}  *(single-pass mode: always 'continue'; full explore/exploit loop is future expansion)*
- trigger_refs: {本轮使用的 source URLs}
- unresolved_questions: {still-open targets after this pass}
- queue_consequence: {移交 wave2 cross-topic synthesis / further deepening task}
- next_action: {immediate Queue or Wave 2 action}
- last_updated_ref_count: {本轮 source 数量}
```

**Question Reconciliation markers** (different from evidence-summary Open Question labels — these track state CHANGE, not current state):
- `[已解决]` = question resolved by this round's evidence
- `[部分进展]` = partial progress made
- `[仍开放]` = no material progress
- `[需内部数据]` = requires data the Sub-agent cannot access

**Note:** Question Reconciliation (§2) uses `[已解决]`/`[部分进展]`/`[仍开放]`/`[需内部数据]` to mark what CHANGED. Evidence-summary Open Questions uses `[开放]`/`[部分解答]`/`[涌现]` to mark CURRENT state. These are different label sets for different purposes — do not mix them.

## 3. Execution Within Relay Slot

The Sub-agent operates within a relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`). It receives two files:
- `task.md` — the natural-language task (from the queue task card's `action` field)
- `result.schema.json` — the JSON schema the return value must satisfy

**What the Sub-agent does:**
1. Write `agent_runtime_started` event to `runtime-receipt.jsonl` (BEFORE doing any work)
2. Read `task.md` to understand the topic and deepening parameters
3. Use WebSearch to find topic-specific deep evidence (derive keywords from seed topic)
4. Use page-fetching to get page content (see §4 degradation chain)
5. Extract mechanisms, trends, contradictions, open questions
6. Write `evidence-summary.md` with canonical labels
7. Write `question-list.md` with complete four-section structure
8. Write `agent_result_ready` event to `runtime-receipt.jsonl` (IMMEDIATELY before returning)
9. Return JSON matching `result.schema.json` to the Phase Agent

**Intermediate products:** Raw WebSearch output, fetched page content, and source metadata MUST be written to the cache directory from the spawn prompt (`Cache directory:` line) and task.md (`## Cache Directory` section). The path follows `_cache/wave1/{batch}/{topic_slug}/`. For each source, create `sNN_{source-slug}/` with:
- `websearch.json` — raw WebSearch result
- `page.md` — fetched page content (WebFetch / curl / node / python3)
- `meta.json` — `{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}`

The Phase Agent creates the directory before spawn. `NN` increments from 01 per source. `<source-slug>` matches the qualifier in `reference/` filenames. Cache is non-authority, reconstructable.

## 4. Page Content Fetching

See `shared-subagent-protocol.md` for the full chain. The Sub-agent MUST exhaust all tiers before recording an access failure.

## 5. Anti-Cheating Rules (Wave1-Specific)

- **No fabricated evidence:** Every source URL and key finding must come from real page-fetching. Search snippets are not a substitute for page content
- **No placeholder question-list.md:** All four sections must contain substantive content — no "TBD" or "待补充" placeholders
- **Canonical labels only:** Question status labels must be `[开放]`/`[部分解答]`/`[涌现]` (evidence-summary) and `[已解决]`/`[部分进展]`/`[仍开放]`/`[需内部数据]` (question-list Reconciliation). Topic-descriptor labels like `[Bridge gap]` are forbidden
- **No fake key finding prefixes:** Each Key Finding must start with `**机制理解**:` or `**趋势观察**:`
- **Partial evidence is acceptable:** If a source is inaccessible after exhausting the degradation chain, record the access failure — do not fabricate. Partial evidence-summary with honest access limitations is valid output
- **No claiming comprehensive coverage:** Wave1 is single-pass deepening, not exhaustive research
- **Must self-prove:** `runtime-receipt.jsonl` must contain both events

See `shared-subagent-protocol.md` Forbidden Authority section for universal Sub-agent prohibitions.

## 6. Relationship to Phase Agent

**Phase Agent (phase-wave1.md) does:**
- Enqueue deepening task cards
- Read queue → map to SlotConfig → stage slots via relay
- Spawn Sub-agent
- Collect via `ingestAgentReceipt()` + `commitSlotResult()`
- Verify both artifacts (evidence-summary.md + question-list.md) against `done_condition`
- Complete queue task
- Backfill seed topic (3 tokens: `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_PENDING_QUESTIONS__`)
- Run gate
- **On count_floor gate fail:** Re-fill queue with supplementary task cards (§3.3.2 of phase-wave1.md) — same sub-agent role (`dpt-evidence-extractor`), same relay contract, focused action: find additional sources only, write `reference/{topic.slug}-*.md` files only, do NOT modify evidence-summary.md or question-list.md

**Sub-agent (this file) does:**
- Search + fetch + extract + write TWO artifacts (evidence-summary.md + question-list.md)
- Return bounded JSON to Phase Agent
- Stay within relay slot directory

The Sub-agent NEVER sees the WorkflowState, gate, queue, other topics, or the Phase Agent's backfill work.
