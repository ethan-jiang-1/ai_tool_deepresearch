## 1. Gate / Output Contract Audit And Registry

- [ ] 1.1 @impl RWG-018, GSK-011: Register pending requirement IDs `AGO-007`, `GSK-011`, `IOC-005`, `RRM-004`, `RWG-018`, `RWP-016`, and `WPG-013` in `openspec/governance/req-registry.yaml` before target-code edits; keep groups sorted and run the registry checker after edits.
- [ ] 1.2 @impl RWG-018, GSK-011: Create change-local `implementation-evidence.md` under `openspec/changes/align-gate-contracts-and-reference-navigation/`; read proposal, design, delta specs, tasks, BUG-068, BUG-069 gate portions, BUG-070, and archived `2026-07-08-stabilize-agent-facing-work-unit-contracts/implementation-evidence.md`.
- [ ] 1.3 @impl RWG-018, GSK-011: Create an apply-time rule/output inventory using the design columns: gate/command, rule/check id, implementation route, runtime surface, producer instruction, diagnostic/advice wording, pass/fail consequence, drift status, and test guard; explicitly mark contract closure state across producer instruction, runtime authority, checker implementation, diagnostic feedback, and regression guard.
- [ ] 1.4 @impl RWG-018, GSK-011: Expand or confirm the design gate/output-alignment audit against current active gate definitions before framework edits; enumerate every active rule id even when a design row groups related rules.
- [ ] 1.5 @impl RWG-018, WPG-013, RRM-004, IOC-005: Audit adjacent output contract surfaces beyond the named bugs: gate selectors/output selectors, submitted ledger role/path expectations, depth-review refs, reference projection/backing helpers, return-map refs, inspect CLIs, phase docs, static hygiene, Source-of-Record conflicts, normalization boundaries, and stop:no diagnostic self-sufficiency.
- [ ] 1.6 @impl RWG-018: Classify discovered mismatches as in-scope deterministic judgment/output drift, diagnostic wording drift, hidden stop:no contract drift, or out-of-scope research-quality / unrelated mechanism desire.
- [ ] 1.7 @impl RWG-018, GSK-011: Fix every discovered same-family mismatch in this change when it affects gate pass/fail, submitted coverage, reference/navigation truth, blocking/advisory/diagnostic classification, or stop:no deterministic repair self-sufficiency and is verifiable without broad redesign.
- [ ] 1.8 @impl RWG-018, GSK-011: Record every change to gate definition, helper, CLI, phase docs, inspect output, static audit mapping, and diagnostic wording in implementation evidence before marking final checks complete.
- [ ] 1.9 @impl RWG-018: Record deferred findings separately, with reasons, when a finding is advisory-only research quality, archived history, speculative future behavior, or unrelated lifecycle/queue/routing drift.
- [ ] 1.10 @impl RWG-018, GSK-011: Before code edits, record the judgment-layer contract families audited and the authority used for each truth type: delegated output coverage, artifact shape, work-unit review provenance, consumer navigation, evidence authority, diagnostic severity, and producer guidance.

## 2. Wave1 Required Output Role Alignment

- [ ] 2.1 @impl AGO-007, WPG-013: Implement narrow submit-time normalization so `artifacts/wave1/{topic}/evidence-summary.md` submitted as role `other` is appended to the ledger as `evidence_summary`.
- [ ] 2.2 @impl AGO-007, WPG-013: Implement narrow submit-time normalization so `artifacts/wave1/{topic}/question-list.md` submitted as role `other` is appended to the ledger as `question_list`.
- [ ] 2.3 @impl AGO-007: Record role normalization diagnostics in submit output, trace/log, or equivalent Engine diagnostic surface; diagnostics must name path, original role, normalized role, and reason.
- [ ] 2.4 @impl WPG-013, RWG-018: Ensure Wave1 `work_unit_output_coverage` consumes canonical roles for required paths and keeps `other` only for extra non-blocking outputs.
- [ ] 2.5 @impl AGO-007, WPG-013: Do not add a general amend path for already-submitted historical bad rows; repair historical rows through supplementary/replacement work units unless a future change accepts amend tooling.

## 3. Depth-Review Reference Canonicalization

- [ ] 3.1 @impl RWG-018, RWP-016: Update `phase-wave1.md` depth-review examples to use `_work_units/wave1/<work_id>` without a trailing slash.
- [ ] 3.2 @impl RWG-018: Canonicalize safe `reviewed_work_unit_refs[]` before comparison against submitted ledger refs, allowing harmless trailing slash.
- [ ] 3.3 @impl RWG-018: Continue rejecting absolute paths, `..`, refs outside the accepted work-unit submitted surfaces, and refs not bound to submitted rows.
- [ ] 3.4 @impl RWG-018: Add diagnostics that explain canonicalization separately from unsafe/unsubmitted refs.

## 4. Return-Map Concrete Reference Navigation

- [ ] 4.1 @impl RRM-004: Define and document a deterministic evidence-bearing vs limitation predicate based on return-map fields/status/relationship/ref presence; do not rely on broad prose interpretation.
- [ ] 4.2 @impl RRM-004: Add helper extraction for concrete bundle-relative `reference/*.md` refs from evidence-bearing seed-topic return-map entries.
- [ ] 4.3 @impl RRM-004: Reject refs containing `*` globs and count summaries such as `reference/topic-*.md (8 files)` or `reference/topic-*.md（8 个）`.
- [ ] 4.4 @impl RRM-004: Validate that each extracted concrete `reference/*.md` ref exists under the active bundle root and is safe.
- [ ] 4.5 @impl RRM-004, IOC-005: Fail evidence-bearing entries that have only `artifacts/`, `_cache/`, or `_work_units/` refs without any concrete existing `reference/*.md`, unless they match the deterministic limitation / no materializable evidence predicate.
- [ ] 4.6 @impl RRM-004, RWP-016: Update `phase-seed-topics.md`, `phase-wave0.md`, `phase-wave1.md`, and `phase-wave2.md` so return-map refs teach `reference/` as the primary consumer navigation layer, internal build surfaces as secondary provenance, and limitation entries as explicit deterministic states.
- [ ] 4.7 @impl RRM-004: Preserve the rule that return maps do not create evidence authority; submitted ledgers and backing checks still own delegated coverage.

## 5. Diagnostic Classification And Static Gate Audit

- [ ] 5.1 @impl IOC-005: Update inspect CLIs and shared return-map helpers so `blocking`, `advisory`, and `diagnostic-only` wording matches each command's `check.passed` behavior.
- [ ] 5.2 @impl IOC-005: Rename or remove `diagnosticOnly` labels where the finding contributes to a non-gate inspect command failure or a gate failure.
- [ ] 5.3 @impl IOC-005, RWG-018: Make blocking deterministic diagnostics self-sufficient for stop:no repair by naming failing rule/finding id, bundle-relative surface, expected shape/canonical value, classification, and nearest repair target.
- [ ] 5.4 @impl GSK-011: Add a static audit test or validator that reads active gate definition JSON and fails on unknown `check` names or unsupported delegated-provenance check names.
- [ ] 5.5 @impl GSK-011, RWG-018: Ensure the static audit or companion mapping proves every active gate rule id has a known helper/CLI dispatch, documented artifact contract category, producer instruction surface or explicit exemption, runtime authority surface, diagnostic/pass-fail classification, and test guard.
- [ ] 5.6 @impl GSK-011, RWG-018: Extend static or focused regression coverage for any additional output-contract drift classes discovered by the apply-time audit.
- [ ] 5.7 @impl GSK-011: Keep archives out of the static audit scope; only active gate definitions and current framework CLIs/helpers are checked.

## 6. Regression And Fixture Tests

- [ ] 6.1 @impl AGO-007, WPG-013: Add submit regression tests proving Wave1 required outputs submitted as `other` normalize to canonical ledger roles before gate, and extra outputs remain `other`.
- [ ] 6.2 @impl WPG-013, RWG-018: Add fixture-level Wave1 gate tests proving canonical required output roles pass and missing canonical coverage fails.
- [ ] 6.3 @impl RWG-018: Add depth-review tests proving trailing slash refs pass after canonicalization, while unsafe refs and unsubmitted refs fail.
- [ ] 6.4 @impl RRM-004, IOC-005: Add return-map helper / inspect tests proving deterministic evidence-bearing entries with internal-only refs fail, glob/count `reference/` refs fail, missing concrete refs fail, concrete existing `reference/*.md` refs pass, and explicit limitation entries may omit concrete references.
- [ ] 6.5 @impl IOC-005, RWG-018: Add diagnostic classification and self-sufficiency tests proving blocking/advisory/diagnostic-only labels match pass/fail behavior and blocking findings include repair coordinates.
- [ ] 6.6 @impl GSK-011: Add static gate-rule audit tests covering active gate definitions.
- [ ] 6.7 @impl RWG-018: Add or update tests for every additional in-scope deterministic mismatch found during the apply-time audit.
- [ ] 6.8 @impl RWG-018: Run focused gate/helper tests and fixture-level gate tests; fix failures rather than weakening contracts.

## 7. Release And Governance

- [ ] 7.1 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Update root `CHANGELOG.md` with framework `v0.13` and a concise gate/reference-navigation alignment summary.
- [ ] 7.2 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Sync `DPT_FRAMEWORK/RUN.md` version banner with the `v0.13` changelog entry.
- [ ] 7.3 @impl GSK-011, RWG-018: Run the new static gate audit and existing work-unit / phase hygiene validators; record commands and PASS/FAIL in implementation evidence.
- [ ] 7.4 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [ ] 7.5 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [ ] 7.6 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Run OpenSpec validation for `align-gate-contracts-and-reference-navigation` if the CLI is available; record command and outcome.
- [ ] 7.7 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Perform a final consistency review proving proposal, design, delta specs, tasks, touched framework surfaces, diagnostics, and tests all describe the same judgment-layer contract model; fix contradictions rather than documenting around them.
- [ ] 7.8 @impl AGO-007, GSK-011, IOC-005, RRM-004, RWG-018, RWP-016, WPG-013: Before declaring apply complete, update implementation evidence with touched surfaces, tests, governance outcomes, deferred findings, residual risks, and the final consistency review result.
