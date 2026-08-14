---
node_type: shared
id: subagent-dpt-evidence-extractor
shared_scope: subagent-protocol
role: dpt-evidence-extractor
authority: guidance-only
execution_contract:
  surface: work-unit-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: work_unit_task_md
  filesystem_write: required
  required_write_tools:
    - read_file
    - write_file
    - append_file
    - mkdir
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
  - shared/shared-reference-template
  - shared/shared-page-fetch-guidance
suggested_context: []
---

# Work-Unit Role: dpt-evidence-extractor - Topic-Specific Deepening

## 0. Role Brief

- **Role key**: `dpt-evidence-extractor`
- **Used by**: Wave1 lifecycle Phase Agent for topic deepening; Wave2 may reuse it for backing supplementary tasks.
- **Receives**: Work-unit `task.md`, `_beacon.json`, `result.schema.json`, assigned `runtime-receipt.jsonl`, and the output/cache contract for `_work_units/waveN/{work_id}/`.
- **Produces**: `evidence-summary.md`, `question-list.md`, structured source claims, accepted source URLs when available, cache trails, source-candidate notes, runtime receipt events, and bounded result JSON for `operate-work-unit submit`.
- **Write capability**: Requires filesystem read/write/append and directory creation under `bundle_dir`; before return it verifies `result.json`, `runtime-receipt.jsonl`, declared outputs, and required cache leaf files exist under the current run bundle root.
- **Boundary**: This role performs delegated search/fetch/extraction only; it does not run lifecycle phases, mutate queue/status, evaluate gates, or make final synthesis decisions.
- **Handoff**: Phase Agent submits the result through `operate-work-unit submit --work-id <work_id> --result <result.json>`. Successful submit is the Engine boundary that completes queue demand and appends delegated ledger coverage.

## Lifecycle Logging Mandate (always-loaded)

This mandate is loaded from the role spec itself. It applies to every native sub-agent spawn that receives a work-unit task, including prompts copied from `operate-work-unit claim` output.

1. **Read your beacon first.** Open `_beacon.json` in your work-unit directory. It is the single source of truth for `bundle_dir`, `log_cli`, `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and `runtime_receipt_ref`. Do NOT use environment variables or inherited cwd for the bundle path.
2. **Append lifecycle evidence to the assigned receipt.** Write this event set as JSONL lines to `runtime_receipt_ref`, each carrying `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. `log-event.mjs` is optional diagnostic mirroring only and never satisfies or replaces the assigned receipt:
   - `search_batch_started` / `search_batch_done` — before and after each bounded search batch (`search_batch_done` includes `result_count`)
   - `fetch_batch_started` / `fetch_batch_done` — before and after each bounded fetch batch (include URL/count context)
   - `cache_write_started` / `cache_written` — before and after a bounded cache write batch (include bundle-relative cache path)
   - `result_draft_started` / `result_draft_written` — before and after result/output drafting (include bundle-relative path)
   - `error` — when a fetch is blocked or the result degrades (include `reason`)
   - `work_done` — once, when all work is complete (include `summary`)
3. **Never fabricate a nonce.** If `_beacon.json` is missing or unreadable, emit an `error` event noting the missing beacon and proceed without lifecycle logging — do NOT invent a `receipt_nonce`.
4. **Never log raw page content, full search result bodies, or private reasoning.** The logging CLI always exits 0; diagnostics must not block your work.
5. **Progress is diagnostic only.** Keep long operations bounded and write progress as soon as the bundle-root receipt/log surface is available. Progress never replaces `operate-work-unit submit`, source claims, cache validation, ledger coverage, or gate coverage.

Example:
  node <log_cli> --bundle <bundle_dir> --level info --msg "work_done" --detail '{"event":"work_done","work_id":"<work_id>","queue_item_id":"<queue_item_id>","kind":"wave1_topic_deepening","receipt_nonce":"<receipt_nonce>","summary":"<summary>"}'

## 1. Purpose

Define what the topic-deepening Sub-agent searches for and writes. The Phase Agent reads this role spec to construct bounded work-unit task instructions. The generated task directs the selected Sub-agent actor to read this canonical role guidance together with its actor-delivered shared guidance before work begins.

The shared work-unit sub-agent contract (`shared-subagent-protocol.md`) defines the envelope and submit mechanics. This role spec defines what `dpt-evidence-extractor` does within that contract.

For backfill-ready research output, retain only the concise return-map cue `evidence_meaning`, `relationship`, `refs`, `status`, `next_hop`; the Phase Agent owns seed projection, `templates/seed-topic-template.md` owns the rendered entry shape, and the command playbook owns packet execution.

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

Minimum output: at least one fetched source with real page content per delegated topic when accessible. Wave0 URLs may be cited as background, but accepted Wave1 source claims must identify whether each URL is new relative to the Wave0 URL set supplied in the task.

## 3. Artifacts

For a primary assignment whose current `required_outputs[]` contains the pair, this role produces paired topic artifacts and submitted source backing. A supplementary assignment with empty `required_outputs[]` does not recreate, redeclare or overwrite a prior evidence-summary or question-list; it uses only authorized prior source-ref lineage plus its current contract-authorized output, cache, source, result and receipt facts. Canonical topic reference Markdown is Phase-owned: the Phase Agent materializes `reference/{topic.slug}-<source-slug>.md` after successful submit unless a future accepted work-unit task explicitly assigns rich reference output to the Sub-agent.

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

### 3.3 Source Backing For Phase-Owned References

For each accepted fetched source, return enough source substrate for the Phase Agent to materialize a consumer reference:

- source URL and title;
- source claim with `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs[]`, and optional `degraded_capture_ref`;
- accepted source URL surface in `accepted_source_urls[]` when the source is countable;
- cache leaf path and page/meta content;
- evidence-summary/question-list refs where the source is discussed;
- concise source-candidate note if the source is suitable for `reference/{topic.slug}-<source-slug>.md`.

If and only if the task explicitly assigns rich reference Markdown as a delegated output, the file uses the same format below and must be declared in `output_files[]`. Otherwise do not treat omission of a rich reference file as Sub-agent failure.

```markdown
---
source_url: "<specific article/source URL>"
acceptance_status: accepted
source_type: "<primary|secondary|mixed|meta>"
tier: "<Tier 1|Tier 2|Tier 3|Tier 4>"
evidence_role: deepening_reference
trust_level: "<academic|practitioner|official|caution|analyst|community>"
why_it_matters: "<one sentence tied to this topic>"
accessed_at: "YYYY-MM-DD"
related_topic_uid: "{topic.topic_uid}"
---

# <Source-specific title>

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

- New rich-reference metadata is one opening YAML-frontmatter mapping; serialize its metadata object with `yaml.stringify(...)` and place that mapping between the opening `---` fences. Legacy `- key: value` metadata is read-compatible only and is not a new-output option.
- Provide the eight common metadata fields plus exactly one current UID binding: exact registered `related_topic_uid`, `related_topic_uid: all`, or a non-empty duplicate-free `related_topic_uids` array for an exact selected subset. Do not write `related_topic` in new output; retained historical files remain human-readable but are rejected by the current Engine.
- All five semantic sections are required and non-empty. Use the canonical headings when convenient; heading case, level, spacing, order, and list presentation may vary without changing the contract.
- `source_url` must be present, URL-parseable, and recoverable through submitted cache/source trails.
- `Key Facts` must contain concrete facts from the fetched page, while `Core Content Capture` must separately preserve a non-empty narrative capture; no fixed fact count is required.
- Interpret fetched page content into Markdown facts and narrative. Do not copy raw document markup (`<!doctype` or `html`, `head`, `body`, `script`, `style`, or `iframe` tags) into a required semantic-section body; when literal syntax itself must be discussed, keep it in fenced code and still provide the interpreted facts.
- If a check reports `reference_metadata_frontmatter_invalid`, repair the opening YAML mapping; if it names a required metadata field, repair that field in the valid mapping and rerun the same checkpoint.
- This guidance does not decide reference-format acceptance; use the existing checkpoint feedback as the format verdict.

**Output serialization:** All structured output files MUST be written via standard library serialization, never hand-concatenated:

- JSON files (e.g. `meta.json`, `websearch.json`) → `JSON.stringify(data, null, 2)`
- YAML content (e.g. `source.yaml` when produced) → `yaml.stringify(data)` from the `yaml` npm package
- Markdown with rich-reference metadata → serialize a metadata object with `yaml.stringify(data)`, put the result in the opening YAML-frontmatter mapping, then assemble Markdown sections after it — do NOT inline raw values into template literals without escaping

Construct a plain JavaScript object, serialize it, then write the result. NEVER hand-concatenate structured formats with template literals, string interpolation, or shell heredocs. Values containing double quotes, colons, newlines, emoji, or CJK characters will produce malformed output when hand-concatenated.

## 4. Execution Within Work Unit

The Sub-agent works only inside the assigned work-unit directory (`_work_units/waveN/{work_id}/`). It receives `task.md`, `_beacon.json`, and `result.schema.json`; the task text includes the topic, cache directory, action, and required output declarations.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for topic slug, question targets, source expectations, cache path, and output contract.
3. Search for topic-specific evidence using seed-topic guardrails.
4. Fetch page content using the fetching chain in §5.
5. Extract mechanisms, trends, contradictions, and open questions.
6. Write `evidence-summary.md`, `question-list.md`, source-candidate notes when useful, and any explicitly assigned reference output. Do not write canonical topic reference Markdown unless the task assigns it.
7. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
8. Write `agent_result_ready` immediately before returning.
9. Return JSON matching `result.schema.json`, including `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `output_files[]`, `source_claims[]`, `accepted_source_urls[]`, and `cache_trails[]`.

For a supplementary assignment, read the task's `Completion Contract -> Cache And Source Facts` before choosing `source_ref`. You may cite one exact listed prior submitted `evidence_summary` path; the list contains only contract-authorized outputs for the same canonical Topic, wave, and kind. Cite it without redeclaring or overwriting that file. Otherwise `source_ref` must be a genuinely current path declared in this candidate's `output_files[]`. New cache trails or degraded-capture refs created by this attempt remain current-attempt facts: declare every one in this result's `cache_trails[]` and in the matching claim; do not infer eligibility from filesystem presence.

For every accepted source, include a structured claim:

```json
{
  "url": "https://example.com/source",
  "source_ref": "artifacts/wave1/{topic.slug}/evidence-summary.md",
  "acceptance_status": "accepted",
  "is_new_vs_wave0": true,
  "cache_trail_refs": ["_cache/wave1/primary/{topic.slug}/s01_source"],
  "degraded_capture_ref": null
}
```

Only accepted/countable claims should appear in `accepted_source_urls[]`. Prose links in `evidence-summary.md` are useful for readers but do not replace structured claims.

The cache path follows the task's provided cache directory. Each source leaf should look like:

```text
_cache/wave1/.../{topic.slug}/sNN_<source-slug>/
  websearch.json
  page.md
  meta.json
```

`meta.json` includes `url`, `title`, `source_domain`, `source_name`, `fetched_at`, `fetch_method`, `fetch_chain`, `content_type`, `reliability_tier`, `reliability_basis`, and `whitelist_status`.

## 5. Page Content Fetching

Read and follow `shared-page-fetch-guidance.md` for the one per-URL access sequence, bounded diagnostic receipt details, batching and exhausted-failure boundary. This role does not maintain another fetch chain. The current assignment still determines whether the paired outputs are required and what cache/source facts may be declared.

## 6. Anti-Cheating Rules

- Do not fabricate evidence, source URLs, key findings, reference metadata, cache trails, or receipt events.
- Do not write placeholder `question-list.md` content.
- Do not use legacy bullet metadata as a new rich-reference form; use the loaded template's one opening YAML-frontmatter mapping.
- Do not use non-canonical question labels.
- Do not claim comprehensive coverage; Wave1 is single-pass deepening.
- Do not count Wave0 URLs as new Wave1 source evidence.
- Do not return accepted source coverage without `source_claims[]` and matching `cache_trails[]` or explicit degraded-capture refs.
- Do not claim canonical topic reference Markdown as a delegated receipt unless the task explicitly assigns that output.
- Do not use placeholder-only cache pages as fetched content.
- Do not modify queue/status, run gates, or decide lifecycle completion.
- Do not directly append `rb_output_declarations.jsonl`; `operate-work-unit submit` is the delegated ledger boundary.

Universal work-unit prohibitions from `shared-subagent-protocol.md` also apply.

## 7. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Claims eligible queue demand through `operate-work-unit claim`
- Spawns the Sub-agent with the generated work-unit task prompt
- Submits the returned result through `operate-work-unit submit --work-id <work_id> --result <result.json>`
- Materializes canonical topic references from submitted source backing after submit
- Repairs submit rejection, closes terminal attempts, or retries with a new `work_id` when needed
- Performs seed-topic backfill and gate execution

Sub-agent:

- Searches, fetches, extracts, writes declared output files and cache leaves
- Emits runtime receipt events
- Returns bounded work-unit result JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or unrelated topics
