# Implementation Evidence: harden-delegated-preflight-and-fetch-hygiene

## Scope Read Before Target-Code Edits

Read before framework/test edits:

- `openspec/changes/harden-delegated-preflight-and-fetch-hygiene/proposal.md`
- `openspec/changes/harden-delegated-preflight-and-fetch-hygiene/design.md`
- `openspec/changes/harden-delegated-preflight-and-fetch-hygiene/tasks.md`
- all delta specs under `openspec/changes/harden-delegated-preflight-and-fetch-hygiene/specs/`
- `_backlog/plans/martin-fowler-run-performance-tuning.md`
- `openspec/changes/archive/2026-07-08-stabilize-agent-facing-work-unit-contracts/implementation-evidence.md`
- `openspec/changes/archive/2026-07-09-align-gate-contracts-and-reference-navigation/implementation-evidence.md`
- `openspec/changes/archive/2026-07-08-parallel-delegated-phase-execution-and-reference-materialization/proposal.md`
- `openspec/changes/archive/2026-07-08-parallel-delegated-phase-execution-and-reference-materialization/design.md`
- `openspec/changes/archive/2026-07-08-parallel-delegated-phase-execution-and-reference-materialization/tasks.md`
- `guidelines/project-charter.md`
- `AGENTS.md`

OpenSpec CLI note: `openspec status --change harden-delegated-preflight-and-fetch-hygiene --json` and `openspec instructions apply --change harden-delegated-preflight-and-fetch-hygiene --json` were attempted before target-code edits, but the local shell reported `openspec: command not found`. Manual apply follows this change's artifacts, registry checks, and Node governance scripts.

Governance baseline before target-code edits:

- Registered requirement IDs confirmed in `openspec/governance/req-registry.yaml`: `DEW-013`, `SNC-007`, and `RWP-017`.
- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- The archived `2026-07-09-align-gate-contracts-and-reference-navigation` req-header cleanup for `AGO-007`, `WPG-013`, `GSK-011`, `RWP-016`, `RWG-018`, `IOC-005`, and `RRM-004` is traceability cleanup separate from this change's functional implementation.

## Scope Boundaries

Implement in this change:

- `operate-work-unit dry-submit` as a read-only preflight over claimed work units.
- Submit-equivalent validation through shared/read-only helpers where practical.
- In-memory virtual canonical view for formal-submit normalizations such as result wrapper unwrapping, receipt canonical JSONL, nonce normalization where formally eligible, Wave1 required-output role normalization, and cache `page-content.md` to virtual `page.md`.
- Structured JSON output for dry-submit pass and fail cases.
- No-side-effect proof across ledger, queue, work-unit index/status/result/receipt, `_work_units/_transactions/`, trace/log, and cache leaf surfaces.
- Wave0/Wave1 Sub-agent guidance for per-URL fallback, multi-URL small batches / bounded parallelism, JS/Node-first fetch tiers, and no snippet evidence.
- Wave0/Wave1 phase guidance for profile/runtime floor plus conservative margin, without fixed unbound fetch aims.
- Regression/static guards and framework `v0.14` release notes.

Explicit exclusions:

- No gate semantic changes.
- No research floor changes.
- No historical submitted-ledger amendment or metadata-only relabel path.
- No new dependencies.
- No Python usage, Python one-liners, `.py` scripts, or Python fetch workaround.
- No Engine-owned JS/browser fetcher, workflow daemon, search/fetch orchestration, or Agent Flow migration into JS.
- No weakening of source coverage, cache trail, source claim, receipt, or gate authority.

## Dry-Submit Mutation Audit

Touched validation/submit surfaces:

- `DPT_FRAMEWORK/engine/work-unit-submit.mjs`
  - Added shared `validateSubmitPlan(..., { dryRun })` for formal submit validation.
  - Added `collectDrySubmitPlan()` for dry-submit diagnostics that accumulates independently evaluable violations.
  - Added public `drySubmitWorkUnit()` returning structured JSON with `ok`, `dry_run`, `side_effects`, `expected_submit`, `reason_codes`, `violations[]`, `normalizations[]`, `candidate_result_path`, and repair advice.
  - Formal `submitWorkUnit()` still calls `prepareWorkUnitSubmit()` and remains the only path that writes result/receipt/status, appends ledger rows, completes queue demand, writes trace/log success events, and creates submit transactions.
- `DPT_FRAMEWORK/engine/work-unit-validation.mjs`
  - Split cache `page-content.md` -> `page.md` canonicalization with `writeCanonicalCache`.
  - `validateCacheTrails()` now returns `virtualCachePages` so dry-submit can validate the same canonical content without writing `page.md`.
  - `validateSourceClaims()` and `cacheTrailMapping()` accept virtual cache page content for dry-submit source-claim checks.
  - `validateQueueBindingForSubmit(..., { sideEffects:false })` reads `rb_queue.json` directly through queue parsing helpers for dry-submit, avoiding `loadQueue()` trace/log writes.
- `DPT_FRAMEWORK/engine/work-unit-utils.mjs`
  - `validateCacheTrailContent()` accepts virtual page text while preserving existing on-disk behavior.
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
  - Added `dry-submit` subcommand with stdout JSON and exit 0/1 aligned to `ok`.

Identified write boundaries and dry-submit exclusion:

- Result canonicalization: dry-submit reports wrapper/nonce/role normalizations but never writes assigned `result.json`.
- Receipt canonicalization: dry-submit reads and reports canonical receipt content but never writes `runtime-receipt.jsonl`.
- Cache canonicalization: dry-submit validates a virtual `page.md` view from `page-content.md` and reports `cache_page_content_canonicalized` but does not create `page.md`.
- Ledger append: dry-submit never calls `appendLedgerRow()`.
- Queue completion: dry-submit never calls `saveQueue()` or `refill()` and uses side-effect-free queue binding validation.
- Status/index mutation: dry-submit never writes `_status.json` or saves `_work_units/_index.json`.
- Rejection recording: dry-submit never calls `recordSubmitRejection()` and therefore never writes `last_submit_rejection`.
- Trace/log/transaction: dry-submit never calls `withWorkUnitTransaction()`, `traceWorkUnitEvent()`, or `logToRun()`. A focused test caught and fixed an initial `loadQueue()` trace/log side effect by adding the side-effect-free queue read path.

## No-Side-Effect Proof

`tests/engine/work-unit-submit.test.mjs` snapshots exact file existence/content and directory entries before and after dry-submit over:

- `_work_units/_index.json`
- `rb_queue.json`
- `rb_output_declarations.jsonl`
- assigned `_status.json`
- assigned `result.json`
- assigned `runtime-receipt.jsonl`
- `_work_units/_transactions/`
- `rb_trace.jsonl`
- `_logs/`
- cache leaf `page.md` / `page-content.md`

Covered cases:

- Passing dry-submit over a valid claimed result leaves every snapshotted authority surface unchanged, then formal submit still succeeds and appends exactly one ledger row.
- Failing dry-submit with invalid output role plus missing cache file reports both independent violations, leaves all snapshotted surfaces unchanged, writes no ledger row, and does not set `last_submit_rejection`.
- Canonicalization-reporting dry-submit validates a result wrapper, defaultable receipt identity, and `page-content.md`-only cache through virtual canonical content; it reports planned normalizations, leaves `page.md`, assigned `result.json`, and receipt content unchanged, then later formal submit persists the canonical cache/result/receipt surfaces.
- Caller-provided result path outside the assigned work-unit directory passes dry-submit and later formal submit when identity already matches, preserving existing nonce containment semantics.

## Fetch/Floor Guidance Audit

Changed active Sub-agent docs:

- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md`
  - Replaced `Python urllib.request` fallback with JS/Node-first tiers: built-in page-fetching tool, browser fetch, Node.js `fetch`, then existing CLI `curl`.
  - Added explicit per-URL fallback semantics.
  - Added multi-URL small-batch guidance and bounded parallelism only when native tool/runtime supports it and site politeness, timeout, and context budget permit it.
  - Preserved no-snippet-evidence, cache trail, receipt, and honest access-failure wording.
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md`
  - Added the same JS/Node-first per-URL fallback and multi-URL batching/bounded-parallel guidance.
  - Verified no Python fallback, Python one-liner, or `.py` workaround remains in the active fetch section.

Changed active phase docs:

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
  - Delegated source-intake target planning now derives from explicit `wave0_per_topic_source_floor`, shared-reference target surfaces such as `wave0_shared_ref_total`, and a conservative small margin.
  - Margin is described as a planning buffer only, not a gate threshold, profile field, quality override, or pass authority.
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
  - Topic-deepening target planning now derives from `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and depth-review `new_source_floor` semantics plus a conservative small margin.
  - Gate repair/refill remains the route for remaining gaps; no floors were changed.

Guard coverage:

- Added `tests/integration/md/fetch-and-floor-hygiene.test.mjs`.
- It asserts per-URL fallback, JS/Node-first tiers, existing CLI `curl`, multi-URL small batches, bounded parallel only when supported, no snippet evidence, no Python/urllib/`.py`/one-liner wording in active Sub-agent docs, profile floor + small margin wording in Wave0/Wave1, and no unbound hard-coded numeric fetch aims.
- `validate-work-unit-hygiene.mjs` was not extended; task 4.7 was satisfied by not taking that optional branch and by adding focused static Markdown tests instead.

## Test And Governance Ledger

Initial pre-edit checks:

- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- UNAVAILABLE: `openspec status --change harden-delegated-preflight-and-fetch-hygiene --json` -> `zsh:1: command not found: openspec`
- UNAVAILABLE: `openspec instructions apply --change harden-delegated-preflight-and-fetch-hygiene --json` -> `zsh:1: command not found: openspec`

Apply verification:

- PASS: `node --check DPT_FRAMEWORK/engine/work-unit-utils.mjs && node --check DPT_FRAMEWORK/engine/work-unit-validation.mjs && node --check DPT_FRAMEWORK/engine/work-unit-submit.mjs && node --check DPT_FRAMEWORK/engine/work-unit-core.mjs && node --check DPT_FRAMEWORK/cli/operate-work-unit.mjs`
- PASS: `node --check tests/engine/work-unit-submit.test.mjs && node --check tests/integration/cli/operate-work-unit.test.mjs && node --check tests/integration/md/fetch-and-floor-hygiene.test.mjs`
- PASS: `node --test tests/engine/work-unit-submit.test.mjs`
- PASS: `node --test tests/integration/cli/operate-work-unit.test.mjs`
- PASS: `node --test tests/integration/md/fetch-and-floor-hygiene.test.mjs`
- PASS: `node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs`
- PASS: `node --test tests/engine/work-unit-submit.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/md/fetch-and-floor-hygiene.test.mjs`
- PASS: `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`
- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- PASS: `git diff --check`
- UNAVAILABLE: `openspec validate harden-delegated-preflight-and-fetch-hygiene --strict` -> `zsh:1: command not found: openspec`
- UNAVAILABLE: `openspec validate openspec/changes/harden-delegated-preflight-and-fetch-hygiene --strict` -> `zsh:1: command not found: openspec`

## Residual Risks And Deferred Findings

- OpenSpec CLI is unavailable in this shell, so validation relies on artifact review plus Node governance scripts.
- dry-submit accumulates independently evaluable violations, but dependent checks still skip naturally when prerequisite parsing/result/manifest validation fails; this matches the design's dependency-diagnostic allowance.
- JS/Node-first fetch tiers remain Sub-agent guidance only; no Engine-owned fetch orchestration was added.
- No unrelated backlog files or historical archives were modified.
