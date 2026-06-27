---
node_type: shared
id: phase-wave0-subagent
shared_scope: subagent-protocol
authority: guidance-only
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
---

# Wave0 Sub-agent: Foundation Reference Intake

**Role:** `dpt-source-intake`
**Phase:** wave0 (loaded by Phase Agent as `suggested_context` of `phase-wave0.md`)

## Purpose

Define what the wave0 Sub-agent searches for, produces, and must never do. Phase Agent reads this file to construct the Sub-agent's bounded task (`task.md`). Sub-agent receives only its relay slot files — it does not see this node.

The shared relay contract (`shared-subagent-protocol.md`) defines the communication mechanism (slot files, runtime-receipt.jsonl, result.schema.json). This file defines **what the Sub-agent does within that contract**.

## 1. Search Focus — Foundation Reference

Wave0 does **foundation reference collection** — not deep research, not claim verification, not synthesis. Each topic needs at least the foundation floor number of references.

**What to search for:**
- The topic's canonical definition and scope
- Authoritative sources that establish the baseline facts for the topic
- Official documentation, academic papers, reputable technical media
- Sources that subsequent waves can use as anchors for deeper research

**Where to search:**
- Prefer sources listed in the seed topic's `evidence_route.preferred_sources`
- Avoid sources listed in `evidence_route.noise_to_avoid`
- Respect `search_guardrails.forbidden_broadening` — don't broaden the search beyond the topic boundary
- Use `search_guardrails.required_terms` to anchor the search

**Minimum output:** At least 1 reference per topic that passes `ReferenceMetadata` schema validation.

## 2. Artifact — `artifacts/wave0/{topic.slug}/source.yaml`

The Sub-agent writes ONE file per topic:

```yaml
- url: "https://..."
  title: "Actual page title"
  retrieved_date: "YYYY-MM-DD"
  topic_tag: "{topic.slug}"
  notes: "Brief note about what this source provides (optional)"
```

**Schema:** `ReferenceMetadata` (defined in `shared-schemas.md`; Zod contract at `DPT_FRAMEWORK/schema/contracts/reference.mjs`). The Sub-agent writes valid YAML; the Phase Agent validates it via receipt check (`complete()` → `checkReceipts()` → `file:` prefix). `commitSlotResult()` validates the Sub-agent's returned JSON against the slot's `result.schema.json` (SlotResult schema), not against `ReferenceMetadata`.

**Requirements:**
- `url` — non-empty, points to a real accessible page
- `title` — reflects the actual page title, not a guess
- `retrieved_date` — YYYY-MM-DD format, the actual date of retrieval
- `topic_tag` — must match the topic slug from the task card
- Each entry must come from real WebSearch + page-fetching — no fabricated URLs or titles

## 3. Execution Within Relay Slot

The Sub-agent operates within a relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`). It receives two files:
- `task.md` — the natural-language task (from the queue task card's `action` field)
- `result.schema.json` — the JSON schema the return value must satisfy

**What the Sub-agent does:**
1. Write `agent_runtime_started` event to `runtime-receipt.jsonl` (BEFORE doing any work)
2. Read `task.md` to understand the topic and search parameters
3. Use WebSearch to find relevant sources (respect search_guardrails from seed topic)
4. Use page-fetching to get page content (see §4 degradation chain)
5. Extract structured metadata: url, title, retrieval date, topic tag, optional notes
6. Write `artifacts/wave0/{topic.slug}/source.yaml`
7. Write `agent_result_ready` event to `runtime-receipt.jsonl` (IMMEDIATELY before returning)
8. Return JSON matching `result.schema.json` to the Phase Agent

**Intermediate products:** Raw WebSearch output, fetched page content, and source metadata MUST be written to the cache directory from the spawn prompt (`Cache directory:` line) and task.md (`## Cache Directory` section). The path follows `_cache/wave0/{batch}/{topic_slug}/`. For each source, create `sNN_{source-slug}/` with:
- `websearch.json` — raw WebSearch result
- `page.md` — fetched page content (WebFetch / curl / node / python3)
- `meta.json` — `{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}`

The Phase Agent creates the directory before spawn. `NN` increments from 01 per source. `<source-slug>` matches the qualifier in `reference/` filenames. Cache is non-authority, reconstructable.

## 4. Page Content Fetching

See `shared-subagent-protocol.md` for the full chain. Summary for wave0:

- **Tier 1:** Built-in page-fetching tool (e.g. WebFetch in Claude Code) or browser if user-enabled
- **Tier 1 unavailable/blocked:** `curl -L <url>` → `node -e "fetch(...)"` → `python3 -c "import urllib.request; ..."`
- **All tiers fail:** Record the access failure in source.yaml `notes` field (e.g. "access blocked by bot protection; search snippets only") — do NOT fabricate content

## 5. Anti-Cheating Rules (Wave0-Specific)

- **No fabricated URLs or titles:** Every reference must come from real WebSearch + page-fetching
- **No search-snippet-as-content:** The Sub-agent must attempt actual page-fetching. Search result snippets are not a substitute for page content
- **No skipping the degradation chain:** Must try ALL tiers before recording an access failure
- **No cross-topic synthesis:** Wave0 collects references — it does not compare topics, draw conclusions, or make judgments
- **No claiming completeness:** "Foundation reference" does not mean "comprehensive coverage"
- **Must self-prove:** `runtime-receipt.jsonl` must contain both `agent_runtime_started` and `agent_result_ready` events

See `shared-subagent-protocol.md` Forbidden Authority section for universal Sub-agent prohibitions (no WorkflowState mutation, no gate pass/fail, no queue modification, no stop authorization).

## 6. Relationship to Phase Agent

**Phase Agent (phase-wave0.md) does:**
- Enqueue task cards
- Read queue → map to SlotConfig → stage slots via relay
- Spawn Sub-agent
- Collect via `ingestAgentReceipt()` + `commitSlotResult()`
- Verify artifact against `done_condition`
- Complete queue task
- Backfill seed topic (`__BACKFILL_WAVE0_EVIDENCE__` → actual refs)
- Run gate
- **On count_floor gate fail:** Re-fill queue with supplementary task cards (§3.3.1 of phase-wave0.md) — same sub-agent role (`dpt-source-intake`), same relay contract, focused action: find additional sources only, append to source.yaml (preserving existing entries), write new 00-shared-*.md files if cross-topic

**Sub-agent (this file) does:**
- Search + fetch + extract + write artifact
- Return bounded JSON to Phase Agent
- Stay within relay slot directory

The Sub-agent NEVER sees the WorkflowState, gate, queue, other topics, or the Phase Agent's backfill work.
