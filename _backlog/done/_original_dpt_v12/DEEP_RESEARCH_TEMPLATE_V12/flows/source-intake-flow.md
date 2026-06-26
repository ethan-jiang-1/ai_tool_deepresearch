---
title: "Source Intake Flow"
role: "provider-neutral source retrieval intake interface"
scope: "stable intake request/response contract, provider profile routing, cache staging, normalization, and promotion boundary"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
  - "flows/source-intake-profiles/native-search.md"
  - "flows/source-intake-profiles/exa-search.md"
  - "flows/reference-artifact-backfill.md"
writes:
  - "<RUN_DIR>/_cache/*"
  - "<REFERENCE_DIR>/* (after promotion)"
---

# Source Intake Flow

This flow is the provider-neutral source retrieval intake interface for V12. Keep this file stable. It is the adapter/router layer: it defines the request, response, cache boundary, normalization contract, promotion boundary, and provider selection contract. Provider-specific behavior lives under `flows/source-intake-profiles/`.

`RUN_DIR/_cache/` is staging, not evidence. Source intake enters `_cache`; only reviewed and promoted material becomes `REFERENCE_DIR/*.md`.

## Stable Interface

The main agent gives an intake runner:

- intake_goal
- research_questions
- topic_scope
- trust_and_tier_targets
- method_constraints
- source_preferences from `PROFILE_PATH -> Search Preference Intake`, topic evidence anchors, and selected research profile defaults
- exclusion_rules from `PROFILE_PATH -> Search Preference Intake` plus webpage/noise policy
- output_paths
- runner_mode: `inline_main_agent / foreground_subagent_runner`
- batch_id

The intake runner returns:

- retrieval_results_path
- candidate_cards_path
- capture_paths
- excluded_path
- provider_profile_used
- promotion_recommendations
- runner_result: `success / fail_soft / fail_hard / suspended`

The provider implementation may change. The interface above must not. Providers normalize raw source material into this shared shape before the main agent reviews promotion.

`runner_result` in the cache output is the source-intake state of record. Process exit code is only an invocation/runtime signal; a fail-soft provider may exit zero after writing complete fallback cache files so queue execution can continue into the fallback provider.

## Intake Runner Modes

An intake runner is a foreground execution unit, not detached background work.

- `inline_main_agent`: main agent performs a small or low-noise intake directly.
- `foreground_subagent_runner`: one delegated subagent performs one source intake batch and writes exact assigned run-local `_cache` files.
Default preference: high-noise source intake uses `foreground_subagent_runner` when a native subagent/task surface is available. If no native subagent/task surface exists, or the intake is small enough that delegation overhead is not worth it, use `inline_main_agent`.

`foreground_subagent_runner` is source-intake delegation inside the ordinary sequential queue. It is not a detached background task and it does not activate a separate execution mode.

## Foreground Delegation Rule

Delegated source intake must stay foreground and queue-visible:

- assign a concrete `batch_id`
- provide the stable intake request fields
- assign exact run-local `_cache` output paths
- provide done and failure criteria
- keep the current queue task open until cache outputs, exclusions, failure, or suspension are recorded
- prevent delegated runners from writing shared control files, topic seed files, shared artifacts, `REFERENCE_DIR`, `REFERENCE_DIR/_INDEX.md`, or `_cache/promote-log.md`

Do not create detached background source intake. Runner output is advisory until the main agent performs fan-in, reviews candidate cards, and decides promotion. `review` here always means main-agent review inside the active Queue task, never user review.

## Wait And Fan-In Rule

- Single runner: keep the current queue task open until candidate cards/exclusions are produced or failure is recorded.
- Multiple independent source-intake runners are not formalized in the current runtime model. Run one foreground runner at a time or queue separate sequential source-intake tasks.
- Waiting is never a user-visible `please wait` state. It is active execution, fan-in review, retry, suspend, or a concrete blocker.
- `fan_in_ready` is not a user-facing review state. It requires the main agent to read candidate cards and continue into promotion/exclusion/closeout work without asking the user.
- The main agent must fan-in before promotion, evidence counting, gate passage, or final citation.

Canonical source-intake active-field values live in `specs/CONSTANTS.md`; this flow owns their lifecycle semantics and cache/fan-in transitions.

Compact queue/status fields use:

- `QUEUE.Active Queue` fields represent active control state only.
- `STATUS.Directory / Integration State.source_intake_status` records lifecycle state: `not_started / running / fan_in_ready / integrated / failed / suspended`.
- While `QUEUE` is `running` or `fan_in_ready`, `STATUS` mirrors runner mode, batch id, wait state, and the same run-local candidate-card path.
- After closeout, `QUEUE` resets to `source_intake_runner_mode=not_applicable`, `source_intake_batch_id=not_applicable`, and `source_intake_wait_state=not_started`; `STATUS` records the latest terminal outcome in `source_intake_status`, keeps the latest concrete batch id, resets `source_intake_wait_state=not_started`, and records candidate-card path when available plus `_cache/promote-log.md`.
- Reset values are exact: `none`, `unknown`, `n/a`, and other generic empty tokens are not valid substitutes for `not_applicable / not_applicable / not_started`.
- source_intake_runner_mode: `inline_main_agent / foreground_subagent_runner / not_applicable`
- source_intake_batch_id
- source_intake_wait_state: `not_started / running / fan_in_ready / integrated / failed / suspended`

State table:

| state | active queue shape | legal writes | closeout |
| --- | --- | --- | --- |
| `running` | current task is source retrieval/search/local lookup/database or API query/fetch/page triage for a concrete batch | exact run-local `_cache/intake/<batch-id>/intake-request.md`, `_cache/intake/<batch-id>/retrieval-results.md`, `_cache/intake/<batch-id>/candidate-cards.md`, `_cache/intake/<batch-id>/capture-manifest.md`, and `_cache/excluded/<batch-id>-excluded.md` | move to `fan_in_ready` when candidate cards/exclusions or failure/suspension notes exist |
| `fan_in_ready` | current task is main-agent candidate-card review/promotion for a concrete batch and names `_cache/intake/<batch-id>/candidate-cards.md` | `REFERENCE_DIR`, `_INDEX.md`, topic seeds, artifacts, STATUS, QUEUE, TRACE when needed, and `_cache/promote-log.md` | record accepted/excluded/failed/suspended outcome |
| `integrated` / `failed` / `suspended` | latest batch outcome only; active queue fields normally reset to `not_applicable / not_applicable / not_started` | no runner writes; only main-agent fan-in closeout may still write shared files | reset active source-intake fields unless the current task is still closing fan-in for the concrete batch |

`running` is the only valid wait state while the current queue-visible source-intake task is actively producing cache outputs. After cache outputs or a failure are produced, move the queue to fan-in/review work with `source_intake_runner_mode=not_applicable`, the same concrete `source_intake_batch_id`, and `source_intake_wait_state=fan_in_ready`. `not_applicable / not_applicable / not_started` is the reset state when the current task is not source intake or fan-in. Terminal `STATUS.source_intake_status=integrated / failed / suspended` records the latest batch outcome, while `STATUS.source_intake_wait_state` resets to `not_started` after closeout unless the current task is still actively closing fan-in. All source-intake runner write targets must be exact run-local `_cache/intake/<batch-id>/intake-request.md`, `_cache/intake/<batch-id>/retrieval-results.md`, `_cache/intake/<batch-id>/candidate-cards.md`, `_cache/intake/<batch-id>/capture-manifest.md`, and `_cache/excluded/<batch-id>-excluded.md` paths, not absolute external cache paths, traversal paths, nested scratch cache paths, `_framework/_cache`, `REFERENCE_DIR`, topic seeds, artifacts, promote logs, shared control files, or predeclared `_cache/captures/<source-slug>.md` placeholders.

Fan-in candidate-card paths use the same run-local `_cache` resolver as runner `writes_to`: relative `_cache/intake/<batch-id>/candidate-cards.md` or absolute paths under `RUN_DIR/_cache` are valid; external absolute cache paths, traversal paths, nested scratch `_cache`, `_framework/_cache`, wrong batch ids, placeholders, and arbitrary prose are invalid. Fan-in and terminal closeout tasks must write `_cache/promote-log.md`; a fan-in task without a promote-log write target is incomplete.

## Provider Profiles

Before starting any intake batch, read `PROFILE_PATH -> Search Preference Intake`.

- Concrete user preferences guide source types/families, source date window, geography/jurisdiction, language, must-include sources, and exclusion rules.
- `search_preference_intake_status=not_specified_use_profile_defaults` means the runner uses the selected research profile, topic evidence anchors, trust/tier targets, and normal evidence-quality rules.
- Preferences are guidance for retrieval and triage, not gate bypasses. They cannot weaken local-reference requirements, source floors, webpage diagnostic checks, cross-verification, or critical-claim checks.
- If user preferences conflict with gate requirements, keep the preference visible but record the conflict in cache notes or STATUS and satisfy the stricter gate/evidence rule.

Use one profile per intake batch:

- `native_search`: current default; native model/search tool plus direct fetch/browser follow-up when available
- `exa_search`: advanced Exa provider for filtered, category-specific, date-sensitive, structured, or claim-testing retrieval; falls back to `native_search` on credential/API/coverage failure

Default to `native_search`. Select `exa_search` only when the user explicitly requested Exa search, or when the Queue work unit records why native search is insufficient and names the Exa-specific capability required. Date windows, include/exclude domains, source-family filters, geography, claim verification, counterexample/limitation search, structured extraction, entity enrichment, and category surfaces are capability signals that may justify Exa, but they do not activate Exa by themselves.

## Provider File Convention

Provider-specific files live in this directory:

```text
flows/source-intake-profiles/
```

Current provider files:

```text
flows/source-intake-profiles/native-search.md
flows/source-intake-profiles/exa-search.md
flows/source-intake-profiles/scripts/exa-source-intake.mjs
```

`native-search.md` is the current default. `exa-search.md` is callable for advanced search and owns its script entrypoint. Add new provider profiles by creating a file in this directory, keeping the stable interface and cache shape unchanged.

## Cache Shape

```text
RUN_DIR/_cache/
  intake/<batch-id>/intake-request.md
  intake/<batch-id>/retrieval-results.md
  intake/<batch-id>/candidate-cards.md
  intake/<batch-id>/capture-manifest.md
  captures/                       # optional concrete captures listed by capture-manifest.md; not predeclared as runner write targets
  excluded/<batch-id>-excluded.md
  promote-log.md              # main-agent fan-in/promotion only
```

## Normalized Intake Rule

- Source retrieval, web search, local lookup, database query, API query, fetch, and webpage triage write to run-local `_cache` first.
- Do not write retrieval/search/fetch results directly to `REFERENCE_DIR`.
- Direct `REFERENCE_DIR` creation is allowed only for already-known local or user-provided sources where no retrieval, no search, and no fetch was used; the queue task text must state all three negatives explicitly: `no retrieval`, `no search`, and `no fetch`.
- Prefer foreground subagent-first source intake when a native subagent/task surface is available.
- The main agent reads candidate cards, local paths, queue state, and status pointers first.
- Full webpages, large retrieval result bodies, raw database/API payloads, large local-file excerpts, and low-alignment material stay out of the main conversation unless full-read triggers apply.

## Candidate Card

Each candidate card records:

- candidate_source
- cache_path
- proposed_reference_path: `REFERENCE_DIR/00-shared-<source-or-claim-slug>.md` for Wave 0 shared foundation, or `REFERENCE_DIR/<topic-id>-<source-or-claim-slug>.md` for Wave 1 topic evidence
- provider_profile
- trust_level / tier
- topic_alignment
- supports_claims
- source_diagnostic_summary
- noise_risk
- decision: `promote / exclude / needs_full_read`
- why_main_agent_should_care

Provider-specific fields are allowed only as cache-local diagnostics inside existing fields. For example, Exa search type, category, highlights, summaries, capped text excerpts, output grounding, request id, or cost may appear in retrieval notes and `source_diagnostic_summary`, but they must not add a second candidate schema or bypass fan-in. Native and Exa candidate cards must be reviewable by the same promotion routine.

## Promotion Rule

Promote only after reviewing:

- topic alignment
- trust/tier
- source diagnostic
- noise risk
- supports_claims
- whether a full read is required

Promotion creates or patches `REFERENCE_DIR/*.md`, updates `_INDEX.md`, syncs STATUS inventories, and either performs declared topic seed backfill in the active task or queues the backfill when the source affects a topic. Fan-in for `fan_in_ready` must name the concrete batch, valid candidate-card path, `_cache/promote-log.md`, and at least one promoted reference, index, STATUS, or QUEUE write target.

Do not promote newly counted V12 evidence with opaque global names such as `ref-001-*`. If a candidate card proposes such a path, fan-in must correct it before promotion or exclude/defer the candidate. The promoted filename must make the evidence origin visible without opening the file, and inventories, seed citations, artifacts, and Wave 2 backing refs must use the same local path.

`_cache/promote-log.md` is written only by the main agent during fan-in/promotion or terminal source-intake closeout. It records which candidates were promoted, excluded, failed, or suspended, and why. Intake runners must not write it.

## Full-Read Triggers

Read full cache captures or source bodies only for:

- P0/P1 claims
- gate audit
- contradictory evidence
- topology delta
- final citation
- failed or ambiguous promote review
- explicit user request

For webpage-derived candidates, the source diagnostic must include the Webpage Material Diagnostic Gate fields before the candidate can become accepted evidence.

## Non-Evidence Rule

`_cache` does not count toward source floors, authorize gates, or replace `REFERENCE_DIR/*.md`. Cache files may be cleaned after promotion or exclusion without affecting accepted evidence.
