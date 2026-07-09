## 1. Pre-Edit Scope And Registry

- [x] 1.1 @impl DEW-013, SNC-007, RWP-017: Read this proposal/design/tasks, delta specs, `_backlog/plans/martin-fowler-run-performance-tuning.md`, and archived implementation evidence for `stabilize-agent-facing-work-unit-contracts`, `align-gate-contracts-and-reference-navigation`, and `parallel-delegated-phase-execution-and-reference-materialization`; record apply scope before target-code edits.
- [x] 1.2 @impl DEW-013, SNC-007, RWP-017: Confirm `DEW-013`, `SNC-007`, and `RWP-017` are registered in `openspec/governance/req-registry.yaml` before implementation; if missing, register them in sorted capability groups and run the requirement checker after edits.
- [x] 1.3 @impl DEW-013, SNC-007, RWP-017: Confirm this change excludes gate semantics, research floor changes, historical ledger amendment, metadata-only relabel, new dependencies, Python usage, and Engine-owned JS/browser fetch orchestration; JS/Node-first fetch tier changes are limited to Sub-agent guidance.
- [x] 1.4 @impl DEW-013, SNC-007, RWP-017: Create change-local `implementation-evidence.md` using the design evidence shape before target-code edits; record scope readback, exclusions, and confirm the archived `align-gate-contracts-and-reference-navigation` req-header cleanup remains separate from this change's functional implementation.

## 2. Work-Unit Dry-Submit Preflight

- [x] 2.1 @impl DEW-013: Audit `submitWorkUnit`, `prepareWorkUnitSubmit`, `recordSubmitRejection`, and related validation helpers; identify mutation boundaries for result canonicalization, receipt writes, cache writes, ledger append, queue completion, trace/log/status updates, rejection recording, transaction directory writes, and write-capable cache canonicalization helpers.
- [x] 2.2 @impl DEW-013: Extract or add a shared dry validation helper that can read the candidate result and work-unit envelope, run submit-equivalent validation against an in-memory virtual canonical view, collect independent violations, and return planned normalizations without mutating bundle state.
- [x] 2.3 @impl DEW-013: Add `operate-work-unit dry-submit <bundle> --work-id <id> --result <result.json>` with structured JSON output for both pass and fail cases, plus exit-code convention aligned with existing CLI behavior.
- [x] 2.4 @impl DEW-013: Ensure dry-submit does not append `rb_output_declarations.jsonl`, complete queue demand, modify work-unit status, write canonical result/receipt/cache files, call formal `recordSubmitRejection`, write submit rejection state, or create trace/log/transaction/success-ledger effects.
- [x] 2.5 @impl DEW-013: Preserve formal submit candidate path semantics in dry-submit, including temporary/caller-provided `--result` paths and nonce-normalization containment rules.
- [x] 2.6 @impl DEW-013: Keep formal `submit` behavior unchanged except for shared helper refactoring; successful delegated completion remains formal submit only.

## 3. Fetch And Floor Hygiene Guidance

- [x] 3.1 @impl SNC-007: Update `subagent-dpt-source-intake.md` and `subagent-dpt-evidence-extractor.md` so the fetch fallback chain is explicitly per URL and different candidate URLs may be fetched in small batches, with bounded parallelism only when the native tool/runtime supports it and site limits permit.
- [x] 3.2 @impl SNC-007: Replace the current `Python urllib.request` fetch fallback in `subagent-dpt-source-intake.md` with JS/Node-first fallback guidance, preferring built-in page-fetching tools, browser fetch, or Node.js `fetch`; keep `curl` only as an existing CLI fallback. Verify `subagent-dpt-evidence-extractor.md` also uses JS/Node-first fallback wording and contains no Python fetch fallback, Python one-liner, or `.py` script workaround. Keep anti-cheating wording for snippets, cache trails, source claims, and access-failure records.
- [x] 3.3 @impl RWP-017: Update `phase-wave0.md` so delegated source-intake targets are derived from explicit profile floors plus a conservative small margin, with gate repair/refill handling remaining gaps.
- [x] 3.4 @impl RWP-017: Update `phase-wave1.md` so topic deepening targets are derived from explicit Wave1 profile floors / new-source floor semantics plus a conservative small margin, with supplementary work units for remaining gaps.
- [x] 3.5 @impl RWP-017: Remove or rewrite any active Wave0/Wave1 hard-coded fetch aim wording that is not tied to active profile/runtime floor plus named margin derivation; ensure margin wording is not promoted into a new gate threshold or profile field.

## 4. Hygiene And Regression Tests

- [x] 4.1 @impl DEW-013: Add dry-submit tests covering valid preflight, multi-violation reporting, canonicalization reporting without persistence, caller-provided result path behavior, no ledger/queue/status/rejection side effects, and formal submit after dry-submit.
- [x] 4.2 @impl DEW-013: Add CLI integration coverage for `operate-work-unit dry-submit` success and failure exit/output behavior.
- [x] 4.3 @impl DEW-013: Add a no-side-effect snapshot test that compares exact file existence/content and directory entries for authority surfaces before and after dry-submit, including ledger, queue, work-unit index/status/result/receipt, `_work_units/_transactions/`, trace/log files, and cache leaf `page.md` when `page-content.md` exists; prove page-content-only cache is validated through a virtual canonical view without creating `page.md`.
- [x] 4.4 @impl SNC-007, RWP-017: Add Markdown/static tests proving active Sub-agent docs teach per-URL fallback plus multi-URL small-batch/bounded-parallel guidance, include JS/Node-first fallback wording, and contain no Python fetch fallback, Python one-liner, or `.py` script workaround in active fetch sections.
- [x] 4.5 @impl RWP-017: Add Markdown/static tests proving Wave0/Wave1 phase docs teach profile floor + small margin and do not present unbound hard-coded fetch aims.
- [x] 4.6 @impl RWP-017: Add Markdown/static tests proving margin wording is a planning buffer only, not a new gate threshold or profile field.
- [x] 4.7 @impl SNC-007, RWP-017: If `validate-work-unit-hygiene.mjs` is extended, add negative fixtures for Python fetch fallback / Python fetch workaround, missing JS/Node-first fallback wording, and unbound hard-coded aim drift.

## 5. Release And Governance

- [x] 5.1 @impl DEW-013, SNC-007, RWP-017: Update `CHANGELOG.md` with framework `v0.14` and a concise preflight/fetch hygiene summary.
- [x] 5.2 @impl DEW-013, SNC-007, RWP-017: Sync `DPT_FRAMEWORK/RUN.md` version banner with the `v0.14` changelog entry.
- [x] 5.3 @impl DEW-013, SNC-007, RWP-017: Run focused dry-submit, CLI, Markdown/static, and hygiene tests; record PASS/FAIL in implementation evidence.
- [x] 5.4 @impl DEW-013, SNC-007, RWP-017: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [x] 5.5 @impl DEW-013, SNC-007, RWP-017: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [x] 5.6 @impl DEW-013, SNC-007, RWP-017: Run OpenSpec validation for `harden-delegated-preflight-and-fetch-hygiene` if available; if CLI is unavailable, record the exact unavailable outcome and rely on Node governance checks plus artifact review.
- [x] 5.7 @impl DEW-013, SNC-007, RWP-017: Before declaring apply complete, update change-local implementation evidence with touched surfaces, tests, no-side-effect proof for dry-submit, deferred findings, and residual risks.
