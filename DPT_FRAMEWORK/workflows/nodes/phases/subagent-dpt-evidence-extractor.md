---
node_type: shared
id: subagent-dpt-evidence-extractor
shared_scope: subagent-protocol
role: dpt-evidence-extractor
authority: guidance-only
execution_contract:
  surface: relay-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: relay_task_md
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
---

# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening

## 0. Role Brief

- **Role key**: `dpt-evidence-extractor`
- **Used by**: Wave1 lifecycle Phase Agent for topic deepening; Wave2 may reuse it for backing supplementary tasks.
- **Receives**: Relay slot `task.md`, `result.schema.json`, runtime receipt path, and slot-local/cache paths.
- **Produces**: `evidence-summary.md`, `question-list.md`, topic rich reference files, cache trails, runtime receipt events, and a bounded SlotResult.
- **Boundary**: This role performs delegated search/fetch/extraction only; it does not run lifecycle phases, mutate queue/status, evaluate gates, or make final synthesis decisions.
- **Handoff**: Phase Agent ingests the runtime receipt, calls `commitSlotResult()`, then completes the queue item through `operate-queue complete --result` with `slot_result_ref`.

## 1. Purpose

Define what the topic-deepening Sub-agent searches for and writes. The Phase Agent reads this role spec to construct bounded relay slot instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache paths.

The shared relay contract (`shared-subagent-protocol.md`) defines the slot mechanics. This role spec defines what `dpt-evidence-extractor` does within that contract.

## 2. Search Focus

Wave1 does single-pass topic deepening. It is not comprehensive research, multi-round exploration, or cross-topic synthesis.

Search for:

- Topic-specific evidence beyond Wave0 foundation sources
- Mechanisms: how something works, causal relationships, structural explanations
- Trends: what is changing, emerging patterns, directional shifts
- Contradictions, limitations, or tensions in the evidence
- Open questions that remain after this topic pass

Use:

- `seed_topics/{topic.slug}.md` guardrails and open questions
- `evidence_route.preferred_sources` and `noise_to_avoid`
- `search_guardrails.required_terms` and `forbidden_broadening`

Minimum output: at least one fetched source with real page content per delegated topic when accessible.

## 3. Artifacts

This role produces paired topic artifacts and source-specific rich references.

### 3.1 evidence-summary.md

```markdown
# Evidence Summary: {topic.title}

## Source URLs
- [Source Title](https://example.com/source) — retrieved YYYY-MM-DD

## Key Findings
1. **机制理解**: <how something works>
2. **趋势观察**: <what is changing>

## Open Questions
1. [开放] <question with no new evidence>
2. [部分解答] <question with partial progress>
3. [涌现] <new question from this evidence>
```

Rules:

- Key findings must start with exactly `**机制理解**:` or `**趋势观察**:`.
- Open question labels must be exactly `[开放]`, `[部分解答]`, or `[涌现]`.
- Topic-descriptor labels such as `[Bridge gap]` are forbidden.

### 3.2 question-list.md

```markdown
# Question List - Topic: {topic.title}

produced_at_ref_count: {source count}
last_updated: YYYY-MM-DD

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| {slug}-T01 | {seed or emergent question} | seed | {开放/部分解答} | {source URL} | {next action} |

## Question Reconciliation

- [部分进展] {prior question}: {progress and source URL}
- [仍开放] {prior question}: {why still open}
- no_prior_questions_to_reconcile: {only when no prior questions exist}

## Emergent Question Protocol

- new_concept: checked; {new concept or none}; trigger_refs={source URL or none}
- contradiction: checked; {contradiction or none}; trigger_refs={source URL or none}
- missing_information_gap: checked; {gap or none}; trigger_refs={source URL or none}
- noise_pattern: checked; {noise pattern or none}; trigger_refs={source URL or none}
- result: [涌现] {new question with trigger evidence} / no_new_questions_after_protocol

## Exploration / Exploitation Decision

- decision: {continue}
- trigger_refs: {source URLs}
- unresolved_questions: {still-open targets}
- queue_consequence: {Wave2 handoff or further deepening task}
- next_action: {immediate Queue or Wave2 action}
- last_updated_ref_count: {source count}
```

Question Reconciliation labels are `[已解决]`, `[部分进展]`, `[仍开放]`, or `[需内部数据]`. These describe what changed. Evidence-summary Open Questions labels describe current state; do not mix the two sets.

### 3.3 reference/{topic.slug}-<source-slug>.md

Each fetched source page gets one rich reference file in `reference/` using metadata block format, not YAML frontmatter.

```markdown
# <Source-specific title>

- source_url: <specific article/source URL>
- acceptance_status: accepted
- source_type: <primary|secondary|mixed|meta>
- tier: <Tier 1|Tier 2|Tier 3|Tier 4>
- evidence_role: deepening_reference
- trust_level: <academic|practitioner|official|caution|analyst|community>
- why_it_matters: <one sentence tied to this topic>
- accessed_at: YYYY-MM-DD
- related_topic: {topic.slug}

## Key Facts

- <specific fact from fetched page>
- <specific fact from fetched page>
- <specific fact from fetched page>
- <specific fact from fetched page>
- <specific fact from fetched page>

## Core Content Capture

<Narrative capture of what the source says.>

## Relevance To This Research

<Why this source matters for the topic.>

## Quotable Terms / Concepts

- <term, phrase, or concept>

## Risks And Limitations

- <what this source cannot prove>
```

Rules:

- Metadata lines use `- key: value`; `---` frontmatter is forbidden.
- The 9 metadata fields are required exactly as shown.
- The 5 section headers are required exactly as shown.
- `source_url` must be the specific source page, not a homepage.
- `## Key Facts` must contain at least 5 concrete bullet facts from the fetched page.

## 4. Execution Within Relay Slot

The Sub-agent works only inside the relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`). It receives `task.md` and `result.schema.json`; the task text includes the topic, cache directory, action, and required output declarations.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for topic slug, question targets, source expectations, cache path, and output contract.
3. Search for topic-specific evidence using seed-topic guardrails.
4. Fetch page content using the fetching chain in §5.
5. Extract mechanisms, trends, contradictions, and open questions.
6. Write `evidence-summary.md`, `question-list.md`, and source-specific `reference/{topic.slug}-*.md` files.
7. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
8. Write `agent_result_ready` immediately before returning.
9. Return JSON matching `result.schema.json`, including `output_files[]` and `cache_trails[]`.

The cache path follows the task's provided cache directory. Each source leaf should look like:

```text
_cache/wave1/.../{topic.slug}/sNN_<source-slug>/
  websearch.json
  page.md
  meta.json
```

`meta.json` includes `url`, `title`, `source_domain`, `source_name`, `fetched_at`, `fetch_method`, `fetch_chain`, `content_type`, `reliability_tier`, `reliability_basis`, and `whitelist_status`.

## 5. Page Content Fetching

Use the full chain from `shared-subagent-protocol.md`.

- Built-in page-fetching tool or browser if available
- `curl -L <url>`
- Node `fetch`
- Python `urllib.request`

Only after all tiers fail may the Sub-agent record an access failure. Do not use search snippets as page content, and do not fabricate titles, facts, or URLs.

## 6. Anti-Cheating Rules

- Do not fabricate evidence, source URLs, key findings, reference metadata, cache trails, or receipt events.
- Do not write placeholder `question-list.md` content.
- Do not use YAML frontmatter in rich reference files.
- Do not use non-canonical question labels.
- Do not claim comprehensive coverage; Wave1 is single-pass deepening.
- Do not modify queue/status, run gates, or decide lifecycle completion.
- Do not directly append `rb_output_declarations.jsonl`; delegated `complete()` is the ledger boundary.

Universal relay prohibitions from `shared-subagent-protocol.md` also apply.

## 7. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Builds queue task cards and relay `task.md`
- Spawns the Sub-agent through relay
- Ingests runtime receipts
- Calls `commitSlotResult()`
- Completes the queue item with `operate-queue complete --result <result.json>` and `slot_result_ref`
- Performs seed-topic backfill and gate execution

Sub-agent:

- Searches, fetches, extracts, writes declared output files and cache leaves
- Emits runtime receipt events
- Returns bounded SlotResult JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or unrelated topics
