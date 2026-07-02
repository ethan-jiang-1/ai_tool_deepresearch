---
title: "Source Intake Exa Search"
role: "provider-specific Exa advanced search source intake policy"
scope: "Exa search planning, advanced retrieval modes, cache normalization, and native-search fallback"
reads:
  - "flows/source-intake-flow.md"
  - "flows/source-intake-profiles/scripts/exa-source-intake.mjs"
writes:
  - "<RUN_DIR>/_cache/*"
---

# Source Intake Exa Search

This file implements `provider_profile=exa_search` while preserving the stable interface in `flows/source-intake-flow.md`.

## Provider Status

- implementation_status: `implemented`
- callable_now: `yes`
- fallback_provider: `native_search`

Use Exa when source intake needs advanced retrieval controls or synthesized search planning. If Exa credentials are unavailable, the API fails, or every Exa pass returns no usable candidates, record `runner_result=fail_soft` and reroute the same request through `native_search`.

## Credential Rule

- Read the API key from `EXA_API_KEY`.
- The project root `.env` is the stable credential location for `EXA_API_KEY`; `.env` must stay untracked and outside the template package.
- Node does not automatically load `.env`. The bundled runner loads it explicitly. `--env-file <PROJECT_ROOT>/.env` is authoritative and disables secondary discovery; otherwise the runner searches upward at most four directory levels from `--project-root <PROJECT_ROOT>`, `--run-dir`, the request file directory, current working directory, and the script directory. If launch location is ambiguous or the run directory is deeply nested, pass `--project-root` or `--env-file`.
- Never write the API key into `_cache`, `REFERENCE_DIR`, root control files, logs, candidate cards, or chat output.
- Missing credentials are a source-intake `fail_soft`, not a gate failure by themselves; fallback to `native_search` using the same stable intake request. The Markdown `runner_result` field is the source-intake state of record; the process exit code only distinguishes malformed invocation/parser failures from completed cache writes.

## Script Entrypoint

Use the bundled runner when local Node execution is available:

```text
node <RUN_DIR>/_framework/flows/source-intake-profiles/scripts/exa-source-intake.mjs --project-root <PROJECT_ROOT> --run-dir <RUN_DIR> --batch-id <batch-id> --request <request.json>
```

If you intentionally execute from `<RUN_DIR>/_framework`, the relative script path is `flows/source-intake-profiles/scripts/exa-source-intake.mjs`. From the run root, always include the `_framework/` prefix.

The request file should contain the stable intake request fields from `flows/source-intake-flow.md`. The runner writes:

- accept the same intake request fields
- `_cache/intake/<batch-id>/intake-request.md`
- `_cache/intake/<batch-id>/retrieval-results.md`
- `_cache/intake/<batch-id>/candidate-cards.md`
- `_cache/intake/<batch-id>/capture-manifest.md`
- `_cache/excluded/<batch-id>-excluded.md`

If the script is unavailable but Exa can be called by another native tool, use this file as the provider policy and preserve the same cache files and candidate-card shape.

## Exa Capability Signals

The default provider remains `native_search`. Select `exa_search` only when the user explicitly requested Exa search, or when the Queue work unit records why native search is insufficient and names the Exa-specific capability required.

The signals below may justify that Queue work-unit decision, but they do not activate Exa by themselves:

- Date-sensitive retrieval: latest/current/recent evidence, explicit date windows, or source freshness constraints.
- Strong filters: preferred or excluded domains/source families, must-include sources, geography/jurisdiction, official-only, standards, regulation, filing, dataset, or benchmark preferences.
- Claim testing: support/weakening judgment, counterexamples, limitations, failure modes, disputes, or high-consequence critical claims.
- Structured discovery: compare/rank/list/extract/enrich requests where a grounded output map helps candidate triage.
- Category-specific retrieval: academic papers, news, companies, people/experts, personal sites/blogs, or financial reports.
- Multi-question source intake where one batch should run several coordinated query routes without flooding the main conversation.

Do not select `exa_search` merely because a normal broad web search, freshness check, or filtered query is needed. `native_search` remains the default for low-noise discovery unless the Queue work unit makes the Exa-specific requirement explicit.

## Exa Search Method

Use multiple targeted Exa passes when justified by the intake request:

- `auto` for broad semantic discovery.
- Category passes for `research paper`, `news`, `company`, `people`, `personal site`, and `financial report` when the request points to those source families.
- `includeDomains`, `excludeDomains`, `startPublishedDate`, `endPublishedDate`, crawl-date filters, and `userLocation` when concrete preferences are available and the selected category permits them.
- `contents.highlights=true`, summaries, and capped text excerpts as the default content mode so retrieval cache keeps hard source material, not only metadata.
- `deep-lite`, `deep`, or `deep-reasoning` only when the request benefits from multi-step planning, structured extraction, or counterexample search.
- `additionalQueries`, `systemPrompt`, and `outputSchema` for deeper passes, treating synthesized output as retrieval guidance rather than accepted evidence.

Respect Exa category restrictions. In particular, do not apply `includeDomains`, `excludeDomains`, published-date filters, crawl-date filters, or `userLocation` to `company` or `people` category passes. Encode those constraints in the natural-language query and rely on non-category general/domain passes for API-level filters.

## Native Fallback

Fallback is required when:

- `EXA_API_KEY` is missing
- the Exa API is unreachable or returns provider errors for all passes
- all Exa passes return no usable candidates
- Exa category/filter restrictions make the selected plan impossible without changing the user's stated preference

Fallback behavior:

- write the normal Exa cache outputs with `runner_result=fail_soft`
- include suggested native query groups in retrieval and excluded notes
- set `fallback_provider=native_search`
- return process exit code `0` after fail-soft cache files are written, so queue execution can continue into native fallback
- queue or run the same stable intake request through `native_search`
- do not promote an Exa cache-only failure note as evidence

If some Exa passes fail but at least one Exa pass returns usable normalized candidates, keep the successful candidates, record failed passes in excluded notes, and keep `runner_result=success`. Mark `fail_soft` only when Exa cannot produce usable candidates for promotion triage.

## Normalization Rule

Exa results must normalize into the same candidate-card fields used by native search:

- `candidate_source`
- `cache_path`
- `proposed_reference_path`
- `provider_profile`
- `trust_level / tier`
- `topic_alignment`
- `supports_claims`
- `source_diagnostic_summary`
- `noise_risk`
- `decision`
- `why_main_agent_should_care`

Provider-specific Exa material stays inside cache notes: search type, category, highlights, summaries, capped text excerpts, grounding, request id, cost, and failed pass notes. Preserve Exa-returned summaries, highlights, and text excerpts in `retrieval-results.md` without additional summarization; keep `candidate-cards.md` concise for triage. The candidate card may mention these fields inside `source_diagnostic_summary`, but main-agent fan-in must still complete webpage diagnostics and promotion review before evidence counts.

Do not create a second Exa-only promotion path. Exa output is advisory until the main agent promotes reviewed candidates into `REFERENCE_DIR/*.md`.
