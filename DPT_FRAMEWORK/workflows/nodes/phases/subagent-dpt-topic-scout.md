---
node_type: shared
id: subagent-dpt-topic-scout
shared_scope: subagent-protocol
role: dpt-topic-scout
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
  - shared/shared-page-fetch-guidance
suggested_context: []
---

# Work-Unit Role: dpt-topic-scout - Gap-Fill Search

## 0. Role Brief

- **Role key**: `dpt-topic-scout`
- **Used by**: Wave2 lifecycle Phase Agent for gap-fill, cross-topic, and emergent search tasks.
- **Receives**: Work-unit `task.md`, `_beacon.json`, `result.schema.json`, assigned `runtime-receipt.jsonl`, and the output/cache contract for `_work_units/wave2/{work_id}/`.
- **Produces**: bounded targeted evidence payloads, source URLs, `fills_gap`, confidence, cache trails, runtime receipt events, and bounded result JSON for `operate-work-unit submit`.
- **Write capability**: Requires filesystem read/write/append and directory creation under `bundle_dir`; before return it verifies `result.json`, `runtime-receipt.jsonl`, declared outputs, and required cache leaf files exist under the active bundle root.
- **Boundary**: This role searches and extracts for a specific finding or topic gap; it does not make cross-topic synthesis judgments, update final ledger state, run gates, or mutate workflow state.
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
  node <log_cli> --bundle <bundle_dir> --level info --msg "work_done" --detail '{"event":"work_done","work_id":"<work_id>","queue_item_id":"<queue_item_id>","kind":"wave2_targeted_evidence","receipt_nonce":"<receipt_nonce>","summary":"<summary>"}'

## 1. Purpose

Define the Wave2 gap-fill/search role. The Phase Agent reads this role spec to construct bounded work-unit task instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `_beacon.json`, `result.schema.json`, runtime receipt file, and work-unit output/cache paths.

`dpt-topic-scout` is used only for targeted search prompted by Wave2 finding decisions or quality refill gaps. It does not replace the Phase Agent's cross-topic synthesis judgment.

For backfill-ready research output, retain only the concise return-map cue `evidence_meaning`, `relationship`, `refs`, `status`, `next_hop`; the Phase Agent owns seed backfill and `shared-return-map-authoring.md` owns the complete definition.

## 2. Search Focus

Search only for the concrete finding, cross-topic gap, or emergent question described in `task.md`.

Valid dispatch contexts include:

- `decision=exploit_search` for a finding needing targeted backing evidence
- `decision=explore_search` for a finding needing broader exploratory evidence
- `gap_status=needs_search` for a public evidence gap that must be resolved before pure synthesis eligibility
- supplementary cross-topic depth search
- supplementary emergent search rounds

Search for:

- Evidence that supports, falsifies, or narrows the specific finding
- Source pages with enough substance to be promoted to `reference/00-cross-*.md` by the Phase Agent after submit
- Concrete URLs and snippets that explain whether the gap was filled

Do not search broadly beyond the finding. Do not decide final finding status.

## 3. Artifacts

The role returns bounded targeted evidence through the work-unit result contract. The exact schema comes from `result.schema.json`, but the semantic payload includes:

```json
{
  "found_evidence": ["evidence snippet 1", "evidence snippet 2"],
  "source_urls": ["https://example.com/page1", "https://example.com/page2"],
  "fills_gap": true,
  "confidence": "medium"
}
```

Expected meanings:

| Field | Meaning |
|-------|---------|
| `found_evidence` | Evidence snippets extracted from fetched pages |
| `source_urls` | Specific source URLs corresponding to the evidence |
| `fills_gap` | Whether the search found evidence that helps the assigned gap |
| `confidence` | Low/medium/high confidence in the evidence quality |

If the task asks the Sub-agent to write source files directly, declared output paths must be included in `output_files[]`; otherwise, the Phase Agent promotes suitable sources to `reference/00-cross-*.md` during ingestion. In both cases, cache_trails[] for real fetched sources must be returned when available. The Phase Agent, not the Sub-agent, updates `finding-index.yaml` after submit with `subagent_receipt_refs[]`, `gap_status`, confidence, and backing refs.

The Phase Agent, not the Sub-agent, updates `cross-topic-ledger.md`, `synthesis.md`, seed-topic backfill, final finding status, and any `reference/00-cross-*.md` projection. The Sub-agent does not update `cross-topic-ledger.md`. A Sub-agent may provide source candidates and declared fetched-source files only when the task explicitly assigns those outputs.

**Output serialization:** All structured output files MUST be written via standard library serialization, never hand-concatenated:

- Return JSON → `JSON.stringify(result, null, 2)` matching `result.schema.json`
- JSON files (e.g. `meta.json`) → `JSON.stringify(data, null, 2)`
- YAML content such as `source.yaml` → `yaml.stringify(data)` from the `yaml` npm package. Reference Markdown uses bullet metadata blocks, not YAML frontmatter.

Construct a plain JavaScript object, serialize it, then write the result. NEVER hand-concatenate structured formats with template literals, string interpolation, or shell heredocs. Values containing double quotes, colons, newlines, emoji, or CJK characters will produce malformed output when hand-concatenated.

## 4. Execution Within Work Unit

The Sub-agent works only inside the assigned work-unit directory (`_work_units/wave2/{work_id}/`). It receives `task.md`, `_beacon.json`, and `result.schema.json`; the task text includes the finding/gap, keywords, cache directory, and output contract.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for finding description, search keywords, source expectations, cache path, and output contract.
3. Search using the provided keywords and bounded gap description.
4. Fetch page content using the fetching chain in §5.
5. Extract evidence snippets, source URLs, confidence, and whether the gap is filled.
6. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
7. Write `agent_result_ready` immediately before returning.
8. Return JSON matching `result.schema.json`, including `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and declared outputs/cache trails when the task requires them.

The cache path follows the task's provided cache directory. Each source leaf should look like:

```text
_cache/wave2/.../{finding_id-or-topic}/sNN_<source-slug>/
  websearch.json
  page.md
  meta.json
```

`meta.json` includes `url`, `title`, `source_domain`, `source_name`, `fetched_at`, `fetch_method`, `fetch_chain`, `content_type`, `reliability_tier`, `reliability_basis`, and `whitelist_status`.

## 5. Page Content Fetching

Read and follow `shared-page-fetch-guidance.md` for the one per-URL access sequence, bounded diagnostic receipt details, batching and exhausted-failure boundary. This role does not maintain another fetch chain. Honest failure remains allowed only with the current task's bounded evidence facts.

## 6. Anti-Cheating Rules

- Do not fabricate source URLs, evidence snippets, cache trails, or receipt events.
- Do not claim search happened if it did not.
- Do not make cross-topic synthesis judgments or final finding decisions.
- Do not update `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, queue state, status, profile, or plan unless the work-unit task explicitly declares a bounded output path and schema.
- Do not write or decide `reference/00-cross-*.md` as canonical consumer projection unless the task explicitly assigns a fetched-source reference output.
- Do not run gates or decide pass/fail.
- Do not skip WebSearch and jump straight to unsupported claims.
- Do not mark a finding resolved, pure-synthesis-eligible, or HITL2-ready; return bounded evidence only.
- Do not directly append `rb_output_declarations.jsonl`; `operate-work-unit submit` is the delegated ledger boundary.

Universal work-unit prohibitions from `shared-subagent-protocol.md` also apply.

## 7. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Claims eligible queue demand through `operate-work-unit claim` for `wave2_targeted_evidence`
- Spawns the Sub-agent with the generated work-unit task prompt
- Submits the returned result through `operate-work-unit submit --work-id <work_id> --result <result.json>`
- Repairs submit rejection, closes terminal attempts, or retries with a new `work_id` when needed
- Updates `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, seed-topic backfill, Phase-owned `reference/00-cross-*.md` projections, and gate execution

Sub-agent:

- Searches, fetches, extracts, writes declared output files/cache leaves when requested
- Emits runtime receipt events
- Returns bounded work-unit result JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or final synthesis authority
