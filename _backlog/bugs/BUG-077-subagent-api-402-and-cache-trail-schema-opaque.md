# BUG-077: Subagent API 402 blocks delegated work-unit execution; cache-trail schema is undocumented

**Reported:** 2026-07-11
**Bundle:** `dpt_rb_ai-era-sdlc-aidlc-bpm-information-industries-disruption`
**Phase:** Wave0 (source intake)
**Severity:** High — blocks formal work-unit submission path; requires ~2 hours of manual recovery per wave
**Reporter:** Claude Code main agent

## Environment

- Host: macOS, Claude Code CLI
- Node.js: v20.19.6
- Bundle: `/Users/bowhead/ai_tool_deepresearch/dpt_rb_ai-era-sdlc-aidlc-bpm-information-industries-disruption`
- Research profile: `exploratory_map` (5 topics, `wave0_shared_ref_total: 9`)
- Related bugs: `BUG-076-webfetch-domain-verification-blocks-research-fetch.md`

## Symptom 1: Subagent API 402

All 5 delegated `dpt-source-intake` subagents launched for Wave0 failed immediately with:

```
API Error: 402 Access denied: this model is only available to accounts with a balance greater than 0. This is an anti-abuse measure, not a usage charge.
```

### Reproduction

1. Enqueue 5 `wave0_source_intake` tasks via `operate-queue.mjs`.
2. Claim 5 work units via `operate-work-unit.mjs claim --phase wave0 --count 5`.
3. Spawn 5 `dpt-source-intake` subagents with `Agent` tool.
4. Each subagent terminates before producing any output.

### Observed work-unit IDs

- `wu-w0-b000-src-i0001` through `wu-w0-b000-src-i0005` — all ended in `failed` status with API 402.

### Impact

- Zero delegated research work can execute.
- Main agent must absorb the entire source-intake workload, defeating the purpose of the Engine-mediated work-unit path.
- Queue state ends with 5 failed attempts that must be explicitly abandoned or superseded before new work can be claimed.

## Symptom 2: Cache-trail schema undocumented / validation opaque

After the main agent manually produced `source.yaml` and `reference/00-shared-*.md` files, formal `operate-work-unit submit` was attempted. The submit validation rejected the result in at least four distinct ways:

1. `cache_trails path is not a directory: _cache/wave0/primary/01_bpm-as-information-processing-disrupted-by-ai/search-queries.txt`
2. `cache trail _cache/wave0/primary/01_bpm-as-information-processing-disrupted-by-ai missing websearch.json, page.md, meta.json`
3. `cache trail _cache/wave0/primary/01_bpm-as-information-processing-disrupted-by-ai has incomplete cache content: meta.json lacks url/source mapping`
4. `cache trail _cache/wave0/primary/01_bpm-as-information-processing-disrupted-by-ai has incomplete cache content: page.md is placeholder-only`

### What the validator actually requires

Only by reading `DPT_FRAMEWORK/engine/work-unit-utils.mjs:216-233` and `DPT_FRAMEWORK/engine/work-unit-validation.mjs:268-291` did we discover the exact contract:

- `cache_trails[]` must contain **directory** paths, not files.
- Each directory must live under `_cache/wave0/primary/<topic>/`.
- Each directory must contain exactly three files: `websearch.json`, `page.md`, `meta.json`.
- `page.md` must be non-empty and not "placeholder-only" (defined as ≤2 non-empty lines that look like `# Cache page for...` / `placeholder` / `todo` / `tbd`).
- `meta.json` must be a JSON object containing at least one of: `url`, `source_url`, `final_url`, `fetched_url`, or `source_slug`.
- `websearch.json` existence is checked but content is not validated.

None of this is documented in `phase-wave0.md`, `shared-subagent-protocol.md`, or the task-card template.

### Additional schema friction discovered during recovery

- `source.yaml` must be a YAML array of objects with **exactly** `url`, `title`, `retrieved_date` (YYYY-MM-DD), and `topic_tag`. Extra top-level keys such as `schema_version`, `source_count`, or `sources` cause schema validation failures in `inspect-wave0-output.mjs`.
- `reference/00-shared-*.md` files must use a bullet-style metadata block (not YAML frontmatter) before the first `##` section, containing 9 required keys: `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, `accessed_at`, `related_topic`.
- Reference files must contain five exact section headers: `## Key Facts`, `## Core Content Capture`, `## Relevance To This Research`, `## Quotable Terms / Concepts`, `## Risks And Limitations`.
- Return-map entries in reference files must use field names without Markdown bold (`evidence_meaning:`, not `**evidence_meaning**:`), otherwise `inspect-wave0-output.mjs` cannot detect them.
- `inspect-wave0-output.mjs` has a secondary bug: it splits the reference file on `/^#{1,6}\s+/m`, which matches the H1 title and therefore reports the metadata block as missing in advisory diagnostics. The Engine's `ref-count.mjs` uses the correct `\n##\s+` split and counts the files properly.

## Workaround in use

1. Abandon the 5 API-402-failed work units (`wu-w0-b000-src-i0001`…`i0005`).
2. Re-enqueue 5 new `wave0_source_intake` tasks and claim 5 new work units (`wu-w0-b000-src-i0006`…`i0010`).
3. Create 9 countable `reference/00-shared-*.md` files (5 topic clusters + 4 individual-source deep-dives) with full metadata, 5 standard sections, and return-map entries.
4. Hand-craft 9 cache-trail directories, each with `websearch.json`, substantive `page.md`, and `meta.json` containing a `url`.
5. Write runtime-receipt JSONL files with lifecycle events (`claimed`, `started`, `search_completed`, `fetch_completed`, `output_written`) including `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
6. Submit each work unit through `operate-work-unit submit` to produce ledger rows in `rb_output_declarations.jsonl`.

Total recovery time for Wave0: approximately 2 hours of manual bookkeeping.

## Impact

- Delegated Wave0 cannot complete through the Engine-mediated work-unit path when subagents are unavailable.
- Recovery requires the main agent to reverse-engineer three undocumented contracts (cache trail, source.yaml schema, reference file format) from the Engine source code.
- The barrier is high enough that a less persistent agent would either bypass formal submission or abandon the run.

## Suggested fix

### Immediate

1. **Subagent billing/availability**: Document which subagent models are available in the current host environment and provide an official fallback to main-agent execution when subagents are unavailable. Do not rely on API 402 as the only signal.
2. **Cache-trail documentation**: Add a "Cache Trail Contract" section to `phase-wave0.md` and/or `shared-subagent-protocol.md` specifying:
   - Directory under `_cache/wave0/primary/<topic>/`
   - Required files: `websearch.json`, `page.md`, `meta.json`
   - `page.md` must have substantive content
   - `meta.json` must contain `url`, `source_url`, `final_url`, `fetched_url`, or `source_slug`
3. **Reference file contract**: Add the 9 required metadata keys and 5 required sections to `shared-reference-template.md` (they are already there in text, but make them explicit in a checklist).
4. **source.yaml schema**: Document that `artifacts/wave0/<topic>/source.yaml` must be a flat YAML array of `{url, title, retrieved_date, topic_tag, notes?}` objects.
5. **Return-map format**: Document that return-map field names must not be wrapped in Markdown bold.

### Medium-term

6. **Graceful degradation**: Allow `degraded_capture` metadata to satisfy cache validation when the fetch tool is policy-blocked, without requiring placeholder page content.
7. **Inspect diagnostic fix**: Change `inspect-wave0-output.mjs` to split reference files on `\n##\s+` (H2 sections) rather than `^#{1,6}\s+` (any header), so the advisory metadata check does not falsely report missing keys.
8. **Single source of truth**: Consider generating the cache-trail contract from the same schema file that `work-unit-validation.mjs` uses, so documentation cannot drift from implementation.

## Related

- `_backlog/bugs/BUG-076-webfetch-domain-verification-blocks-research-fetch.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-reference-template.md`
- `DPT_FRAMEWORK/schema/contracts/reference.mjs`
- `DPT_FRAMEWORK/engine/work-unit-utils.mjs`
- `DPT_FRAMEWORK/engine/work-unit-validation.mjs`
- `DPT_FRAMEWORK/cli/inspect-wave0-output.mjs`
