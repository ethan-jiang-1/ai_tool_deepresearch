---
node_type: shared
id: subagent-dpt-source-intake
shared_scope: subagent-protocol
role: dpt-source-intake
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

# Relay Role: dpt-source-intake — Foundation Reference Intake

## 0. Role Brief

- **Role key**: `dpt-source-intake`
- **Used by**: Wave0 lifecycle Phase Agent (`phase-wave0.md`) when constructing delegated source-intake relay tasks.
- **Receives**: Relay slot `task.md`, `result.schema.json`, runtime receipt path, and slot-local/cache paths.
- **Produces**: Foundation source metadata in `artifacts/wave0/{topic.slug}/source.yaml`, optional shared rich references, cache trails, runtime receipt events, and a bounded SlotResult.
- **Boundary**: This role performs search/fetch/extraction only inside a relay slot; it does not read workflow state, mutate queue/status, run gates, or decide phase completion.
- **Handoff**: Phase Agent ingests the runtime receipt, calls `commitSlotResult()`, then completes the queue item through `operate-queue complete --result` with `slot_result_ref`.

## 1. Purpose

Define what the Wave0 source-intake Sub-agent searches for, writes, and must never do. The Phase Agent reads this role spec to construct bounded relay slot instructions. The Sub-agent actor does not directly load this Markdown node; it receives the generated `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache paths.

The shared relay contract (`shared-subagent-protocol.md`) defines the slot mechanics. This role spec defines what `dpt-source-intake` does within that contract.

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

It is a YAML array of `ReferenceMetadata` entries:

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

## 4. Execution Within Relay Slot

The Sub-agent works only inside the relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`). It receives `task.md` and `result.schema.json`; the task text includes the topic, cache directory, action, and required output declarations.

Execution steps:

1. Write `agent_runtime_started` to `runtime-receipt.jsonl` before work begins.
2. Read `task.md` for topic slug, title, source expectations, cache path, and output contract.
3. Search using the topic's guardrails and preferred sources.
4. Fetch page content using the fetching chain in §5.
5. Extract source metadata and write `source.yaml`; optionally write `reference/00-shared-*.md`.
6. Write cache leaf directories for each source, including `websearch.json`, `page.md`, and `meta.json`.
7. Write `agent_result_ready` immediately before returning.
8. Return JSON matching `result.schema.json`, including `output_files[]` and `cache_trails[]`.

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

- Built-in page-fetching tool or browser if available
- `curl -L <url>`
- Node `fetch`
- Python `urllib.request`

Only after all tiers fail may the Sub-agent record an access failure. Do not use search snippets as page content, and do not fabricate titles, facts, or URLs.

## 6. Anti-Cheating Rules

- Do not fabricate URLs, titles, source metadata, cache trails, or receipt events.
- Do not treat search snippets as fetched page content.
- Do not skip the page-fetch degradation chain.
- Do not perform cross-topic synthesis, conclusion writing, gate evaluation, queue mutation, or status mutation.
- Do not claim comprehensive coverage; Wave0 only collects foundation references.
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
