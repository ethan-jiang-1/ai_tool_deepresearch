## 1. OpenSpec artifact revision

- [x] 1.1 Update `proposal.md` to cover both BUG-007 and runtime reentry debuggability.
- [x] 1.2 Update `design.md` with the authority split: Engine checks/records, Agent explains/repairs, ledger/receipt remain authority.
- [x] 1.3 Remove or clarify the misleading "old topic wave1 artifacts not updated" symptom; Wave1 is not responsible for cross-topic backfill.
- [x] 1.4 Keep Wave2 `action:add` responsible for full cross-topic re-synthesis and projection.

## 2. Delta specs

- [x] 2.1 Add/extend `rerun-topic-integration` requirements for RTI-001..005.
- [x] 2.2 Rename the former "content_dedup filesystem fallback" behavior to "Gate SHALL NOT vacuously pass on empty reference declarations".
- [x] 2.3 Add/extend `gate-content-dedup` requirements for GAC-006..009, including ledger coverage and durable orphan diagnostics.
- [x] 2.4 Add/extend `research-wave-phase-content` requirements for Wave2 `action:add` full re-synthesis and gate coverage.
- [x] 2.5 Add/extend `reference-flat-format` requirements for Wave1 sub-agent reference file format.
- [x] 2.6 Add `runtime-reentry-debuggability` requirements for checkpoint manifests, reentry checking, queue/lifecycle consistency, gate diagnostics, and chat-memory independence.
- [x] 2.7 Add `file-observability` requirements for directory-shape audit, unplanned file diagnostics, durable Agent explanations, and non-authoritative explained files.
- [x] 2.8 Add `logging-conventions` and `agent-output-declaration` deltas for diagnostic density and output creation context.

## 3. Governance registry update

- [x] 3.1 Confirm existing capability `rerun-topic-integration` with prefix `RTI` and add `RTI-005`.
- [x] 3.2 Register new capability `runtime-reentry-debuggability` with prefix `RRD`.
- [x] 3.3 Register new capability `file-observability` with prefix `FIO`.
- [x] 3.4 Register new requirement IDs not already present: `RTI-005`, `RRD-001..005`, `FIO-001..004`, `RWP-012..013`, `GAC-006..009`, `REF-006`, `LOC-010`, and `AGO-005`.

## 3A. Pre-apply implementation reconciliation

- [x] 3A.1 Reconcile current code reality before new edits: inspect existing Wave1/reference/content-dedup implementation and tests, then mark only already-proven tasks complete.
- [x] 3A.2 Confirm no already-correct code path is reimplemented solely because its task checkbox is still unchecked.
- [x] 3A.3 Identify the first new implementation gap as Wave2 `action:add` added-topic pair-scan coverage, unless reconciliation finds a more severe executable-contract gap.
- [x] 3A.4 Keep runtime reentry/file-observability work sequenced after Wave2 pair-scan and durable diagnostic/ledger context primitives.

## 4. Wave1 reference hardening implementation

- [x] 4.1 Update `phase-wave1-subagent.md` Artifacts section with `reference/{topic.slug}-<source-slug>.md` format: metadata block, required fields, five sections, no YAML frontmatter.
- [x] 4.2 Update `phase-wave1.md` primary and supplementary task action text to require metadata block format and forbid YAML frontmatter.
- [x] 4.3 Add gate rule(s) that validate reference metadata fields, standard sections, and `source_url` presence for each topic reference file.
- [x] 4.4 Add gate rule(s) that reject YAML frontmatter reference files.

## 5. Gate/provenance hardening implementation

- [x] 5.1 Keep `content_dedup` inputs limited to `rb_output_declarations.jsonl` entries whose declared output role is `reference`.
- [x] 5.2 Make `content_dedup` fail closed when the ledger is missing, empty, or contains no reference declarations.
- [x] 5.3 Add ledger coverage/orphan detection for reference files that participate in `count_floor`; filesystem scan only detects untrusted files and never makes them pass inputs.
- [x] 5.4 Validate declared reference `source_url` values as non-empty, article-level URLs and compare them with file metadata without allowing conflict.
- [x] 5.5 Expand homepage/shallow URL detection to empty path, `/`, `/index.*`, and single-segment paths such as `/news/`.
- [x] 5.6 Emit durable orphan/reference diagnostics to trace/log and diagnostic artifacts without granting authority to orphan files.

## 6. Wave2 rerun integration implementation

- [x] 6.1 Update `phase-wave2.md` Rerun-Aware Behavior with an `action:add` vs `action:supplement` scenario table.
- [x] 6.2 For `action:add`, require full re-synthesis: reread all topics, rebuild scan matrix, rewrite `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml`.
- [x] 6.3 Add Wave2 gate coverage for `action:add`: delta-only synthesis must fail, outputs must cover all topic slugs, and the added topic must have pair-scan coverage with pre-existing topics.

## 7. Runtime reentry and file observability implementation

- [x] 7.1 Add checkpoint manifest writing at gate/phase boundaries under `_checkpoints/<iso>-<gate>.json`, including `schema_version`, `trigger`, `gate_result_ref`, `status_snapshot`, `cursors`, and `hashes`.
- [x] 7.2 Add reentry helper/CLI, `DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <path> --at <target>`, returning stable JSON with `check`, `normalized_target`, `blockers`, `warnings`, `drift`, `findings`, `inspect`, and `advice` without mutating runtime files.
- [x] 7.3 Implement CLI exit codes: `0` for clean/warnings-only reentry, `1` for blockers, `2` for configuration/invocation errors.
- [x] 7.4 Implement closed `--at` target normalization derived from `DPT_FRAMEWORK/workflows/manifest.json`, returning `normalized_target` with `status_gate`, `gate_key`, `node_ref`, and `phase_key`, with configuration failure for unknown targets.
- [x] 7.5 Select the latest checkpoint matching the requested target, with explicit inspect/advice when falling back to the latest global checkpoint.
- [x] 7.6 Audit status/queue compatibility, required artifacts, ledger/reference coverage, checkpoint drift, and unresolved unplanned files.
- [x] 7.7 Classify checkpoint drift severity as `info`, `warning`, or `blocker` according to cursor advance, non-authority artifact drift, and authority/control artifact drift.
- [x] 7.8 Classify file observability findings as `expected`, `declared_authoritative`, `unplanned_nonblocking`, `unplanned_needs_explanation`, `orphan_authority_blocking`, or `explained_non_authoritative`, and include finding fields `path`, `classification`, `severity`, `phase`, `reason`, `authority_status`, and `required_repair`; classify `_subagents/**/runtime-receipt.jsonl` through relay slot structure rather than as unexplained artifacts.
- [x] 7.9 Provide Agent-facing file explanation diagnostics through `log-event.mjs`, allowing only `explained_non_authoritative` or `ignored_with_reason` as Agent-written authority statuses.
- [x] 7.10 Add deterministic queue conflict severity using current QueueSchema statuses: blockers for prior-phase `queued`/`running` work that can affect target pass conditions, warnings for `done`/`failed`/`blocked`/future-phase work or work with optional `reentry_disposition.reason`.
- [x] 7.11 Add `creation_reason` to delegated ledger declarations for accepted outputs.
- [x] 7.12 Preserve failed gate full diagnostics under `_diagnostics/gates/*.json` with `schema_version`, `kind`, `source_event_ref`, full gate result objects, and link them from compact trace/log events.
- [x] 7.13 Increase long-running workflow logging density for phase, queue, receipt, ledger, rerun action, file diagnostic, and gate failure events with stable diagnostic `kind` values.

## 8A. Regression tests

- [x] 8A.1 Unit tests: `content_dedup` fails closed on empty/missing/no-reference declarations. (existing: `tests/engine/helpers/gate-helpers.test.mjs`)
- [x] 8A.2 Unit tests: ledger coverage rejects orphan reference files; fully declared references pass. (existing: `tests/engine/helpers/gate-helpers.test.mjs`)
- [x] 8A.3 Unit tests: declared reference URL validation rejects empty/homepage/shallow paths and passes article URLs. (existing: `tests/engine/helpers/gate-helpers.test.mjs`)
- [x] 8A.4 Unit tests: reference metadata parsing rejects YAML frontmatter and passes metadata block format. (existing: `tests/engine/helpers/gate-helpers.test.mjs`)
- [x] 8A.5 Unit tests: checkpoint manifest records schema/version, inventory/cursors/hash fields; checkpoint selection chooses latest matching target and reports fallback. (new: `tests/engine/helpers/checkpoint-manifest.test.mjs`)
- [x] 8A.6 Unit tests: reentry checker detects unknown targets, manifest-derived target normalization, exit codes, status/queue conflicts, and blocker/warning severity. (new: `tests/integration/cli/check-reentry.test.mjs`)
- [x] 8A.7 Unit tests: reentry checker classifies drift as info/warning/blocker according to cursor advance, non-authority artifact drift, and authority/control drift. (new: `tests/integration/cli/check-reentry.test.mjs`)
- [x] 8A.8 Integration tests: Wave1 gate cannot be satisfied by orphan reference files. (existing: wave1 gate tests + ledger_coverage rule)
- [x] 8A.9 Integration tests: Wave1 gate fails reference files missing metadata, sections, or `source_url`. (existing: wave1 gate tests + reference_format/source_url_article_level rules)
- [x] 8A.10 Integration tests: Wave2 `action:add` rerun with delta-only synthesis fails. (existing: wave2 gate tests + rerun_add_full_synthesis rule)
- [x] 8A.11 Integration tests: Wave2 `action:add` rerun with slug-only coverage but missing added-topic pair scan fails. (existing: wave2 gate tests + rerun_add_full_synthesis rule)
- [x] 8A.12 Integration tests: Wave2 `action:add` rerun with full scan coverage passes. (existing: wave2 gate tests + rerun_add_full_synthesis rule)
- [x] 8A.13 Unit tests: file observability emits stable finding schema/classifications and explained files remain non-authoritative. (new: `tests/engine/helpers/file-observability.test.mjs`)
- [x] 8A.14 Unit tests: file explanation diagnostics are append-only and audit uses the latest valid explanation for a path. (new: `tests/integration/cli/file-explanation.test.mjs`)
- [x] 8A.15 Unit tests: delegated ledger declaration includes non-empty `creation_reason`. (extended: `tests/engine/queue-manager.test.mjs`)
- [x] 8A.16 Unit tests: relay slot runtime receipts are classified as expected when slot shape is valid, while root-level or malformed receipt files are reported as unplanned. (new: `tests/engine/helpers/file-observability.test.mjs`)

## 8B. Controlled command experiments

- [x] 8B.1 Add `experiments_playbook/exp_reentry-debuggability/` playbook(s) using a real disposable `dpt_disp_*` bundle, canonical framework CLIs/APIs, Reality Distance Ledger, trace-backed verdict, PASS cleanup, and FAIL preserve. (3 cases: 307-309)
- [x] 8B.2 Command experiment: clean `check-reentry --at wave1_complete` passes on a valid disposable bundle and returns stable JSON contract plus exit code 0. (case-307)
- [x] 8B.3 Command experiment: stale prior-phase queue work after `hitl2_recorded` produces a reentry blocker, actionable inspect/advice, and exit code 1. (case-308)
- [x] 8B.4 Command experiment: checkpoint drift is surfaced with deterministic severity and appears in trace-backed verdict. (case-309)
- [x] 8B.5 Add `experiments_playbook/exp_file-observability/` playbook(s) using a real disposable bundle and command-experiment Reality Distance Ledger. (3 cases: 310-312)
- [x] 8B.6 Command experiment: orphan reference file fails gate authority and produces durable trace/log/diagnostic evidence. (case-310)
- [x] 8B.7 Command experiment: Agent records a file explanation through `log-event.mjs`; trace/log retain the explanation, but the file remains non-authoritative until ledger/receipt authority exists. (case-311)
- [x] 8B.8 Command experiment: Wave2 `action:add` slug-only coverage fails, while full pair-scan coverage passes through the canonical gate path. (case-312)
- [x] 8B.9 Ensure any fixture-backed playbook states its production distance and does not claim to prove Agent search, judgment, writing, or synthesis without a real Agent/sub-agent actor. (production_distance in all 6 cases)

## 9. Governance and validation

- [x] 9.1 Run relevant unit/integration regression tests. (892 tests, 0 failures)
- [x] 9.2 Execute controlled command experiments from clean repo state; committed-but-never-run playbooks do not count as done. (31/31 CLI validations pass against real disposable bundles; cases 307-312 verified)
- [x] 9.3 Run `node openspec/governance/check-project-reqs.mjs`. (326 requirement IDs consistent, 0 orphan)
- [x] 9.4 Run `node openspec/governance/check-project-specs.mjs`. (59 main specs valid, 0 violations)
