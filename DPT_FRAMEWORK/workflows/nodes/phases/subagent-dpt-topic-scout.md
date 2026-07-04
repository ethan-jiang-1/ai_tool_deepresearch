---
node_type: shared
id: subagent-dpt-topic-scout
shared_scope: subagent-protocol
role: dpt-topic-scout
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

# Relay Role: dpt-topic-scout — Gap-Fill Search

## 0. Role Brief

- **Role key**: `dpt-topic-scout`
- **Used by**: Wave2 lifecycle Phase Agent for gap-fill, cross-topic, and emergent search tasks.
- **Receives**: Relay slot `task.md`, `result.schema.json`, runtime receipt path, and slot-local/cache paths.
- **Produces**: Search evidence JSON, source URLs, optional promoted cross-reference inputs, cache trails, runtime receipt events, and a bounded SlotResult.
- **Boundary**: This role searches and extracts for a specific finding or topic gap; it does not make cross-topic synthesis judgments, update final ledger state, run gates, or mutate workflow state.
- **Handoff**: Phase Agent collects via `drive-relay-slot commit` (which ingests the runtime receipt and validates through the engine), then completes the queue item through `operate-queue complete --result` with `slot_result_ref`.

## Lifecycle Logging Mandate (always-loaded)

This mandate is loaded from the role spec itself — it applies to **every spawn path** (the runtime driver `drive-relay-slot` or a hand-written spawn prompt), not only to the engine-generated spawn prompt.

1. **Read your beacon first.** Open `_beacon.json` in your slot directory. It is the single source of truth for `bundle_dir`, `log_cli`, `slot_key`, and `receipt_nonce`. Do NOT use environment variables or inherited cwd for the bundle path.
2. **Emit lifecycle events via `log-event.mjs`.** Using `log_cli` and `bundle_dir` from the beacon, emit this event set, each carrying the beacon `receipt_nonce` in its `--detail` JSON:
   - `search_start` / `search_done` — around each bounded search (`search_done` includes `result_count`)
   - `fetch_done` — when a page fetch completes (include `url`)
   - `file_written` — when you write an artifact file (include bundle-relative `path`)
   - `error` — when a fetch is blocked or the result degrades (include `reason`)
   - `work_done` — once, when all work is complete (include `summary`)
3. **Never fabricate a nonce.** If `_beacon.json` is missing or unreadable, emit an `error` event noting the missing beacon and proceed without lifecycle logging — do NOT invent a `receipt_nonce`.
4. **Never log raw page content, full search result bodies, or private reasoning.** The logging CLI always exits 0; diagnostics must not block your work.

Example:
  node <log_cli> --bundle <bundle_dir> --level info --msg "work_done" --detail '{"kind":"work_done","slotKey":"<slot_key>","receipt_nonce":"<receipt_nonce>","summary":"<summary>"}'

## 1. Purpose

Define the Wave2 gap-fill/search role. The Phase Agent reads this role spec to construct bounded relay slot instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache paths.

`dpt-topic-scout` is used only for targeted search prompted by Wave2 finding decisions or quality refill gaps. It does not replace the Phase Agent's cross-topic synthesis judgment.

## 2. Search Focus

Search only for the concrete finding, cross-topic gap, or emergent question described in `task.md`.

Valid dispatch contexts include:

- `decision=exploit_search` for a finding needing targeted backing evidence
- `decision=explore_search` for a finding needing broader exploratory evidence
- supplementary cross-topic depth search
- supplementary emergent search rounds

Search for:

- Evidence that supports, falsifies, or narrows the specific finding
- Source pages with enough substance to be promoted to `reference/00-cross-*.md` by the Phase Agent
- Concrete URLs and snippets that explain whether the gap was filled

Do not search broadly beyond the finding. Do not decide final finding status.

## 3. Artifacts

The role returns structured JSON through the relay slot. The exact schema comes from `result.schema.json`, but the semantic payload includes:

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

If the task asks the Sub-agent to write source files directly, declared output paths must be included in `output_files[]`; otherwise, the Phase Agent promotes suitable sources to `reference/00-cross-*.md` during ingestion. In both cases, cache trails for real fetched sources must be returned when available.

**Output serialization:** All structured output files MUST be written via standard library serialization, never hand-concatenated:

- Return JSON → `JSON.stringify(result, null, 2)` matching `result.schema.json`
- JSON files (e.g. `meta.json`) → `JSON.stringify(data, null, 2)`
- YAML content (e.g. `reference/00-cross-*.md` YAML frontmatter, `source.yaml`) → `yaml.stringify(data)` from the `yaml` npm package

Construct a plain JavaScript object, serialize it, then write the result. NEVER hand-concatenate structured formats with template literals, string interpolation, or shell heredocs. Values containing double quotes, colons, newlines, emoji, or CJK characters will produce malformed output when hand-concatenated.

## 4. Execution Within Relay Slot

The Sub-agent works only inside the relay-assigned slot directory (`_subagents/wave_02/slot_MM/`). It receives `task.md` and `result.schema.json`; the task text includes the finding/gap, keywords, cache directory, and output contract.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for finding description, search keywords, source expectations, cache path, and output contract.
3. Search using the provided keywords and bounded gap description.
4. Fetch page content using the fetching chain in §5.
5. Extract evidence snippets, source URLs, confidence, and whether the gap is filled.
6. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
7. Write `agent_result_ready` immediately before returning.
8. Return JSON matching `result.schema.json`, including declared outputs/cache trails when the task requires them.

The cache path follows the task's provided cache directory. Each source leaf should look like:

```text
_cache/wave2/.../{finding_id-or-topic}/sNN_<source-slug>/
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

Only after all tiers fail may the Sub-agent record a source as inaccessible. Honest failure is allowed: return `fills_gap: false` with attempted keywords/URLs when search does not find useful evidence.

## 6. Anti-Cheating Rules

- Do not fabricate source URLs, evidence snippets, cache trails, or receipt events.
- Do not claim search happened if it did not.
- Do not make cross-topic synthesis judgments or final finding decisions.
- Do not update `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, queue state, status, profile, or plan unless the slot task explicitly declares a bounded output path and schema.
- Do not run gates or decide pass/fail.
- Do not skip WebSearch and jump straight to unsupported claims.
- Do not directly append `rb_output_declarations.jsonl`; delegated `complete()` is the ledger boundary.

Universal relay prohibitions from `shared-subagent-protocol.md` also apply.

## 7. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Builds queue task cards and relay `task.md` for `exploit_search`, `explore_search`, cross-topic, or emergent search gaps
- Spawns the Sub-agent through relay
- Collects the returned result via `drive-relay-slot commit` (engine ingests the runtime receipt and validates the result)
- Completes the queue item with `operate-queue complete --result <result.json>` and `slot_result_ref`
- Updates `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, seed-topic backfill, and gate execution

Sub-agent:

- Searches, fetches, extracts, writes declared output files/cache leaves when requested
- Emits runtime receipt events
- Returns bounded SlotResult JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or final synthesis authority
