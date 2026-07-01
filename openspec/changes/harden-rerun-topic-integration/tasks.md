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

- [ ] 3.1 Confirm existing capability `rerun-topic-integration` with prefix `RTI` and add `RTI-005`.
- [ ] 3.2 Register new capability `runtime-reentry-debuggability` with prefix `RRD`.
- [ ] 3.3 Register new capability `file-observability` with prefix `FIO`.
- [ ] 3.4 Register new requirement IDs not already present: `RTI-005`, `RRD-001..005`, `FIO-001..004`, `RWP-012..013`, `GAC-006..009`, `REF-006`, `LOC-010`, and `AGO-005`.

## 4. Wave1 reference hardening implementation

- [ ] 4.1 Update `phase-wave1-subagent.md` Artifacts section with `reference/{topic.slug}-<source-slug>.md` format: metadata block, required fields, five sections, no YAML frontmatter.
- [ ] 4.2 Update `phase-wave1.md` primary and supplementary task action text to require metadata block format and forbid YAML frontmatter.
- [ ] 4.3 Add gate rule(s) that validate reference metadata fields, standard sections, and `source_url` presence for each topic reference file.
- [ ] 4.4 Add gate rule(s) that reject YAML frontmatter reference files.

## 5. Gate/provenance hardening implementation

- [ ] 5.1 Keep `content_dedup` inputs limited to `rb_output_declarations.jsonl` entries whose declared output role is `reference`.
- [ ] 5.2 Make `content_dedup` fail closed when the ledger is missing, empty, or contains no reference declarations.
- [ ] 5.3 Add ledger coverage/orphan detection for reference files that participate in `count_floor`; filesystem scan only detects untrusted files and never makes them pass inputs.
- [ ] 5.4 Validate declared reference `source_url` values as non-empty, article-level URLs and compare them with file metadata without allowing conflict.
- [ ] 5.5 Expand homepage/shallow URL detection to empty path, `/`, `/index.*`, and single-segment paths such as `/news/`.
- [ ] 5.6 Emit durable orphan/reference diagnostics to trace/log and diagnostic artifacts without granting authority to orphan files.

## 6. Wave2 rerun integration implementation

- [ ] 6.1 Update `phase-wave2.md` Rerun-Aware Behavior with an `action:add` vs `action:supplement` scenario table.
- [ ] 6.2 For `action:add`, require full re-synthesis: reread all topics, rebuild scan matrix, rewrite `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml`.
- [ ] 6.3 Add Wave2 gate coverage for `action:add`: delta-only synthesis must fail, outputs must cover all topic slugs, and the added topic must have pair-scan coverage with pre-existing topics.

## 7. Runtime reentry and file observability implementation

- [ ] 7.1 Add checkpoint manifest writing at gate/phase boundaries under `_checkpoints/<iso>-<gate>.json`, including `schema_version`, `trigger`, `gate_result_ref`, `status_snapshot`, `cursors`, and `hashes`.
- [ ] 7.2 Add reentry helper/CLI, `DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <path> --at <target>`, returning `{ check, inspect, advice }` without mutating runtime files.
- [ ] 7.3 Implement closed `--at` target normalization for gate/checkpoint values and phase aliases, returning `normalized_target` with `status_gate`, `gate_key`, `node_ref`, and `phase_key`, with configuration failure for unknown targets.
- [ ] 7.4 Audit status/queue compatibility, required artifacts, ledger/reference coverage, checkpoint drift, and unresolved unplanned files.
- [ ] 7.5 Classify file observability findings as `expected`, `declared_authoritative`, `unplanned_nonblocking`, `unplanned_needs_explanation`, `orphan_authority_blocking`, or `explained_non_authoritative`, and include finding fields `path`, `classification`, `severity`, `phase`, `reason`, `authority_status`, and `required_repair`.
- [ ] 7.6 Provide Agent-facing file explanation diagnostics through `log-event.mjs`, allowing only `explained_non_authoritative` or `ignored_with_reason` as Agent-written authority statuses.
- [ ] 7.7 Add deterministic queue conflict severity using current QueueSchema statuses: blockers for prior-phase `queued`/`running` work that can affect target pass conditions, warnings for `done`/`failed`/`blocked`/future-phase work or work with optional `reentry_disposition.reason`.
- [ ] 7.8 Add `creation_reason` to delegated ledger declarations for accepted outputs.
- [ ] 7.9 Preserve failed gate full diagnostics under `_diagnostics/gates/*.json` with `schema_version`, `kind`, `source_event_ref`, full gate result objects, and link them from compact trace/log events.
- [ ] 7.10 Increase long-running workflow logging density for phase, queue, receipt, ledger, rerun action, file diagnostic, and gate failure events with stable diagnostic `kind` values.

## 8. Tests

- [ ] 8.1 Unit tests: `content_dedup` fails closed on empty/missing/no-reference declarations.
- [ ] 8.2 Unit tests: ledger coverage rejects orphan reference files; fully declared references pass.
- [ ] 8.3 Unit tests: declared reference URL validation rejects empty/homepage/shallow paths and passes article URLs.
- [ ] 8.4 Unit tests: reference metadata parsing rejects YAML frontmatter and passes metadata block format.
- [ ] 8.5 Unit tests: checkpoint manifest records schema/version, inventory/cursors/hash fields; changed file after checkpoint reports drift.
- [ ] 8.6 Unit tests: reentry checker detects unknown targets, target normalization, status/queue conflicts, and blocker/warning severity.
- [ ] 8.7 Integration tests: Wave1 gate cannot be satisfied by orphan reference files.
- [ ] 8.8 Integration tests: Wave1 gate fails reference files missing metadata, sections, or `source_url`.
- [ ] 8.9 Integration tests: Wave2 `action:add` rerun with delta-only synthesis fails.
- [ ] 8.10 Integration tests: Wave2 `action:add` rerun with slug-only coverage but missing added-topic pair scan fails.
- [ ] 8.11 Integration tests: Wave2 `action:add` rerun with full scan coverage passes.
- [ ] 8.12 Integration tests: `check-reentry --at wave1_complete` passes a clean fixture and flags stale wave0 tasks after `hitl2_recorded`.
- [ ] 8.13 Unit tests: file observability emits stable finding schema/classifications and explained files remain non-authoritative.
- [ ] 8.14 Unit tests: file explanation diagnostics are append-only and audit uses the latest valid explanation for a path.
- [ ] 8.15 Unit tests: delegated ledger declaration includes non-empty `creation_reason`.

## 9. Governance and validation

- [ ] 9.1 Run relevant unit/integration tests.
- [ ] 9.2 Run `node openspec/governance/check-project-reqs.mjs`.
- [ ] 9.3 Run `node openspec/governance/check-project-specs.mjs`.
