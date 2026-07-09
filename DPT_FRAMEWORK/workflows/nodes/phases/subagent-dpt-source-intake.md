---
node_type: shared
id: subagent-dpt-source-intake
shared_scope: subagent-protocol
role: dpt-source-intake
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
suggested_context: []
---

# Work-Unit Role: dpt-source-intake - Foundation Reference Intake

## 0. Role Brief

- **Role key**: `dpt-source-intake`
- **Used by**: Wave0 lifecycle Phase Agent (`phase-wave0.md`) when constructing `wave0_source_intake` work-unit tasks.
- **Receives**: Work-unit `task.md`, `_beacon.json`, `result.schema.json`, assigned `runtime-receipt.jsonl`, and the output/cache contract for `_work_units/wave0/{work_id}/`.
- **Produces**: Foundation source metadata in `artifacts/wave0/{topic.slug}/source.yaml`, optional shared rich references, cache trails, runtime receipt events, and bounded result JSON for `operate-work-unit submit`.
- **Write capability**: Requires filesystem read/write/append and directory creation under `bundle_dir`; before return it verifies `result.json`, `runtime-receipt.jsonl`, declared outputs, and required cache leaf files exist under the active bundle root.
- **Boundary**: This role performs search/fetch/extraction only inside the assigned work-unit contract; it does not read workflow state, mutate queue/status, run gates, append ledgers, or decide phase completion.
- **Handoff**: Phase Agent submits the result through `operate-work-unit submit --work-id <work_id> --result <result.json>`. Successful submit is the Engine boundary that completes queue demand and appends delegated ledger coverage.

## Lifecycle Logging Mandate (always-loaded)

This mandate is loaded from the role spec itself. It applies to every native sub-agent spawn that receives a work-unit task, including prompts copied from `operate-work-unit claim` output.

1. **Read your beacon first.** Open `_beacon.json` in your work-unit directory. It is the single source of truth for `bundle_dir`, `log_cli`, `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and `runtime_receipt_ref`. Do NOT use environment variables or inherited cwd for the bundle path.
2. **Emit lifecycle events via `log-event.mjs`.** Using `log_cli` and `bundle_dir` from the beacon, emit this event set, each carrying `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` in its `--detail` JSON:
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
  node <log_cli> --bundle <bundle_dir> --level info --msg "work_done" --detail '{"event":"work_done","work_id":"<work_id>","queue_item_id":"<queue_item_id>","kind":"wave0_source_intake","receipt_nonce":"<receipt_nonce>","summary":"<summary>"}'

## 1. Purpose

Define what the Wave0 source-intake Sub-agent searches for, writes, and must never do. The Phase Agent reads this role spec to construct bounded work-unit task instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `_beacon.json`, `result.schema.json`, runtime receipt file, and work-unit output/cache paths.

The shared work-unit sub-agent contract (`shared-subagent-protocol.md`) defines the envelope and submit mechanics. This role spec defines what `dpt-source-intake` does within that contract.

## 2. Search Focus

Wave0 does foundation reference collection. It does not do deep research, claim verification, or synthesis. Each delegated task should establish baseline sources that later waves can rely on.

Search for:

- The topic's canonical definition and scope
- Authoritative baseline facts for the topic
- Official documentation, academic papers, reputable technical media, or other high-trust foundation sources
- Shared foundation references that may support multiple topics

Use:

- `seed_topics/{topic.slug}.md` search guardrails and preferred sources
- `search_guardrails.required_terms` to anchor the query
- `search_guardrails.forbidden_broadening` and `evidence_route.noise_to_avoid` to avoid broad or noisy sources

Minimum output: at least one real source per delegated topic when accessible.

## 3. Artifacts

The primary artifact is:

```text
artifacts/wave0/{topic.slug}/source.yaml
```

It is a top-level YAML array of `ReferenceMetadata` entries. The first YAML node must be the list itself; do not wrap entries under `sources:`, `wave:`, or `topic:`.

```yaml
- url: "https://..."
  title: "Actual page title"
  retrieved_date: "YYYY-MM-DD"
  topic_tag: "{topic.slug}"
  notes: "Brief note about what this source provides (optional)"
```

Requirements:

- `url` points to a real page found through search and page fetching
- `title` reflects the actual page title
- `retrieved_date` is the actual retrieval date in `YYYY-MM-DD`
- `topic_tag` matches the task topic slug
- each entry is backed by real fetched content or an honest access-failure note after the fetch chain is exhausted

**Output serialization:** YAML files MUST be written via `yaml.stringify()` (the `yaml` npm package). Construct a plain JavaScript object, then pass it to `yaml.stringify()`. NEVER hand-concatenate YAML with template literals, string interpolation, or shell heredocs — these produce malformed output when values contain special characters (double quotes, colons, newlines, emoji, CJK). Example:

```js
import yaml from 'yaml';
const data = [{ url: "https://...", title: "Actual page title", retrieved_date: "2026-07-03", topic_tag: "my-topic", notes: "..." }];
const yamlString = yaml.stringify(data);
// write yamlString to artifacts/wave0/{topic.slug}/source.yaml
```

JSON files (e.g. `meta.json`) MUST be written via `JSON.stringify()` — same principle, same anti-pattern prohibition.

When the task discovers a cross-topic foundation source, it may also write:

```text
reference/00-shared-<slug>.md
```

Rich reference files must follow `shared-reference-template.md` and declare their `output_files[]` entry with role `reference` and `source_url`.

## 4. Execution Within Work Unit

The Sub-agent works only inside the assigned work-unit directory (`_work_units/wave0/{work_id}/`). It receives `task.md`, `_beacon.json`, and `result.schema.json`; the task text includes the topic, cache directory, action, and required output declarations.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for topic slug, title, source expectations, cache path, and output contract.
3. Search using the topic's guardrails and preferred sources.
4. Fetch page content using the fetching chain in §5.
5. Extract source metadata and write `source.yaml`; optionally write `reference/00-shared-*.md`.
6. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
7. Write `agent_result_ready` immediately before returning.
8. Return JSON matching `result.schema.json`, including `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `output_files[]`, and `cache_trails[]`.

The cache path follows the task's provided cache directory. Each source leaf should look like:

```text
_cache/wave0/.../{topic.slug}/sNN_<source-slug>/
  websearch.json
  page.md
  meta.json
```

`meta.json` includes `url`, `title`, `source_domain`, `source_name`, `fetched_at`, `fetch_method`, `fetch_chain`, `content_type`, `reliability_tier`, `reliability_basis`, and `whitelist_status`.

## 5. Page Content Fetching

Use the full chain from `shared-subagent-protocol.md`.

Apply fallback per URL. For one candidate URL, try each allowed tier in order until real page content is fetched or every allowed tier for that URL fails:

- Built-in page-fetching tool if available
- Browser fetch if available
- Node.js `fetch`
- Existing CLI fallback: `curl -L <url>`

Across different candidate URLs, do not force the full fallback chain to run serially for all URLs. Fetch candidates in small batches when the task has several URLs to evaluate. Use bounded parallel fetching only when the native tool or runtime already supports it and site politeness, timeout, and context budget permit it.

Only after all JS/Node-first tiers and the existing CLI fallback fail for that specific URL may the Sub-agent record an access failure. Small-batch or bounded-parallel fetching does not reduce cache trail, source claim, receipt, or accepted URL requirements. Do not use search snippets as page content, and do not fabricate titles, facts, or URLs.

## 6. Anti-Cheating Rules

- Do not fabricate URLs, titles, source metadata, cache trails, or receipt events.
- Do not treat search snippets as fetched page content.
- Do not skip the page-fetch degradation chain.
- Do not perform cross-topic synthesis, conclusion writing, gate evaluation, queue mutation, or status mutation.
- Do not claim comprehensive coverage; Wave0 only collects foundation references.
- Do not directly append `rb_output_declarations.jsonl`; `operate-work-unit submit` is the delegated ledger boundary.

Universal work-unit prohibitions from `shared-subagent-protocol.md` also apply.

## 7. Relationship to Phase Agent

Phase Agent:

- Loads this role spec as guidance via `suggested_context`
- Claims eligible queue demand through `operate-work-unit claim`
- Spawns the Sub-agent with the generated work-unit task prompt
- Submits the returned result through `operate-work-unit submit --work-id <work_id> --result <result.json>`
- Repairs submit rejection, closes terminal attempts, or retries with a new `work_id` when needed
- Performs seed-topic backfill and gate execution

Sub-agent:

- Searches, fetches, extracts, writes declared output files and cache leaves
- Emits runtime receipt events
- Returns bounded work-unit result JSON
- Does not see lifecycle routing, gate pass/fail, queue authority, or unrelated topics
