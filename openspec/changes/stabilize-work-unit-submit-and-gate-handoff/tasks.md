## 1. Work-unit submit regression coverage

- [ ] 1.1 @impl DEW-012 Add focused `node:test` coverage for single top-level `result` wrapper acceptance and wrapper-with-sibling rejection; done when tests prove accepted ledger rows are flat canonical results and unsafe wrappers write no ledger row.
- [ ] 1.2 @impl DEW-012 Add receipt identity autofill/rejection tests; done when missing `schema_version`, `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` are filled only from the claimed record, while conflicting identity fields reject submit.
- [ ] 1.3 @impl DEW-012 Add cache leaf normalization tests for `page-content.md`; done when `page-content.md` without `page.md` is accepted through canonical `page.md`, divergent dual page files reject, and missing `websearch.json`/`meta.json`/page authority still rejects.
- [ ] 1.4 @impl DEW-012 Add constrained nonce normalization tests; done when stale nonce is corrected only with matching `work_id`, `queue_item_id`, `kind`, and in-work-unit result path, while wrong identity or path escape rejects.

## 2. Work-unit submit implementation

- [ ] 2.1 @impl DEW-012 Add a pre-validation result canonicalizer in the submit path; done when strict `WorkUnitResultSchema` receives only canonical flat result data and all unsafe wrapper forms fail closed.
- [ ] 2.2 @impl DEW-012 Add receipt JSONL identity autofill before receipt validation; done when parseable receipt events preserve event-specific fields, fill only missing identity fields from the work-unit record, and reject invalid JSONL, empty receipts, or conflicts.
- [ ] 2.3 @impl DEW-012 Add cache leaf `page-content.md` canonicalization; done when cache validation continues to require `websearch.json`, canonical `page.md`, and `meta.json`, and no divergent page pair is accepted.
- [ ] 2.4 @impl DEW-012 Add constrained nonce normalization and diagnostics; done when record/beacon nonce remains canonical, accepted corrections emit structured diagnostics, and invalid submissions remain non-terminal with no queue completion or ledger append.

## 3. Runtime CLI argument guards

- [ ] 3.1 @impl QIV-005 Add integration tests for `operate-queue.mjs --help`, `operate-work-unit.mjs --help`, subcommand help, and `--bundle --help`; done when no `--help/` directory or runtime files are created in temporary cwd/bundle parents.
- [ ] 3.2 @impl QIV-005 Implement early help handling in `operate-queue.mjs`; done when top-level help exits 0, subcommand help is usage or clear argument error, and no queue/log/trace load happens before guard resolution.
- [ ] 3.3 @impl QIV-005 Implement early help handling in `operate-work-unit.mjs`; done when claim/submit/fail style invocations never treat help tokens as bundle paths and valid invocations keep existing behavior.
- [ ] 3.4 @impl QIV-005 Add suspicious bundle argument rejection for both CLIs; done when positional bundle values and `--bundle` values beginning with `-` reject before any runtime side effect.

## 4. Handoff cascade regression coverage

- [ ] 4.1 @impl CPT-008 Add `advance-status` tests for failed source gates and missing route-bound `load_complete`; done when status and trace remain unchanged and advice names the required source-gate/enter-phase remedy.
- [ ] 4.2 @impl CPT-008 Add phase status audit tests for manual downstream status and premature final-adjacent status; done when audit reports drift/manual bypass/failed-gate downstream status without mutating `rb_status.json`.
- [ ] 4.3 @impl GSK-010 Add lifecycle gate preflight tests for Wave2/HITL2/readiness skip scenarios; done when downstream artifacts and manually edited status cannot pass without the predecessor gate pass plus route-bound entry witness.
- [ ] 4.4 @impl GSK-010 Add final delivery authorization tests; done when files under `final/` do not authorize final delivery without readiness-to-final route-bound handoff evidence.

## 5. Handoff cascade implementation

- [ ] 5.1 @impl CPT-008 Harden `advance-status` source-gate selection and failure diagnostics; done when failed, superseded, missing, or downstream gate names cannot write `current_gate`, `next_gate`, or `phase_transition`.
- [ ] 5.2 @impl CPT-008 Harden `audit-phase-status` downstream/final drift classification; done when impossible windows, failed-gate downstream status, missing witnesses, and manual bypass suspicion use stable diagnostic outcomes.
- [ ] 5.3 @impl GSK-010 Wire or tighten shared gate preflight for covered lifecycle gates; done when the actual gate CLIs reject status-only/artifact-only entry and preserve legal degraded handoff behavior.
- [ ] 5.4 @impl GSK-010 Tighten readiness/final preflight and root-cause diagnostics; done when missing handoff evidence is reported before cascade artifact symptoms and advice never recommends hand-editing authority files.

## 6. Version and release surfaces

- [ ] 6.1 @impl DEW-012,QIV-005,CPT-008,GSK-010 Add `v0.9` entry to `CHANGELOG.md`; done when the entry concisely names submit canonicalization, CLI guard, and handoff cascade hardening.
- [ ] 6.2 @impl DEW-012,QIV-005,CPT-008,GSK-010 Update `DPT_FRAMEWORK/RUN.md` version banner to `DPT_FRAMEWORK v0.9`; done when the banner matches the latest changelog entry.

## 7. Verification

- [ ] 7.1 @impl DEW-012,QIV-005,CPT-008,GSK-010 Run targeted regression tests for changed areas; done when the relevant `tests/engine/` and `tests/integration/cli/` suites pass under `node:test`.
- [ ] 7.2 @impl DEW-012,QIV-005,CPT-008,GSK-010 Run `node openspec/governance/check-project-reqs.mjs`; done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired issues.
- [ ] 7.3 @impl DEW-012,QIV-005,CPT-008,GSK-010 Run `node openspec/governance/check-project-specs.mjs`; done when it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader issues.
