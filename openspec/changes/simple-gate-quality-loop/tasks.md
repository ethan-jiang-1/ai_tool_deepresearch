## 1. Scope Lock And Heuristic Inventory

- [x] 1.1 Review active current surfaces for `content_dedup`, duplicate URL, homepage/shallow URL, Jaccard, self-reference, `source_url_article_level`, and `source_url_is_homepage` hits across code, Markdown, JSON, YAML, schemas, fixtures, runner metadata, health/report tooling, `DPT_FRAMEWORK/`, `tests/`, `experiments_playbook/`, `experiments_env/shared/`, `openspec/specs/`, `guidelines/`, and current `_backlog` notes; classify each hit as remove, negative-retired wording, or non-gate research guidance for GSK-006/GSK-008/GSK-009/RWG-015/EEX-001/RTI-003/EXR-003/AGT-009.
- [x] 1.2 Scope lock GSK-008/GSK-009: document during apply that phase-boundary gates SHALL only block deterministic authority surfaces: schema, queue, status, trace, work-unit ledger, provenance, hash, cache coverage/content, and route-bound handoff.
- [x] 1.3 Scope lock GAC-001 through GAC-009: confirm `content_dedup` will be removed rather than preserved as diagnostic-only, warning-only, inspect-only, or playbook-only proof.
- [x] 1.4 Scope lock BUG-047/048/049/050/051/053: before implementation, map every touched fix to degraded handoff, heuristic retirement, root-cause diagnostics, manual authority-edit prohibition, or silent phase-chain continuation; keep built-in `deep-research` cleanup, Wave1/Wave2 depth restoration, broad force flags, and JSONL comment headers out of this change.

Apply notes:

- Inventory classification: active gate/code/test/playbook/health surfaces that presented `content_dedup`, duplicate URL, homepage/shallow URL, Jaccard, self-reference, `source_url_article_level`, or `source_url_is_homepage` as current proof are removal targets. Accepted main specs are left for archive/sync cleanup. Current backlog bug notes remain historical/past-failure context unless they teach current guidance.
- Scope lock: phase-boundary blocking remains limited to deterministic authority surfaces: schema, queue, status, trace, submitted work-unit ledger, provenance, hash/nonce, cache coverage/content, and route-bound handoff. Guess-based content signals do not become diagnostic-only gate advice.
- Bug mapping: BUG-047/049 -> silent phase-chain continuation; BUG-048 -> trace-durable degraded handoff; BUG-050 -> heuristic retirement; BUG-051 -> authority-file/manual-edit prohibition; BUG-053 -> root-cause-first diagnostics. Out of scope remains built-in `deep-research` cleanup, Wave1/Wave2 depth restoration, broad force flags, and JSONL comment headers.

## 2. Retire content_dedup And URL/Text Heuristics

- [x] 2.1 Implement RWG-015/GAC-001..GAC-009: remove `content_dedup` from Wave0 and Wave1 gate definition JSON files.
- [x] 2.2 Implement RWG-015/GAC-001..GAC-009: remove `content_dedup` dispatch branches from `check-gate-wave0-complete.mjs` and `check-gate-wave1-complete.mjs`.
- [x] 2.3 Implement GAC-001..GAC-009: delete or stop exporting active `checkContentDedup()`, URL duplicate, homepage/shallow, Jaccard, and self-reference helper paths when they are no longer used by current accepted contracts.
- [x] 2.4 Implement EEX-001/EEX-002/EEX-003: update reference countability so present, URL-parseable `source_url` is enough for URL shape; remove `source_url_is_homepage`, path-depth, duplicate URL, Jaccard, self-reference, and retired `content_dedup` effects from Engine ref_count and gate advice.
- [x] 2.5 Implement RTI-003/RTI-004: remove `source_url_article_level` and retired `content_dedup` expectations from rerun topic gate guidance and any related gate/check surfaces.
- [x] 2.6 Implement EXR-003/AGT-009: remove or rewrite `experiments_playbook/exp_engine-boundary/case-403-light-gate-content-dedup.md`, runner table entries, shared fixture helpers, and health-report checks so no current experiment requires content_dedup, duplicate URL, homepage, Jaccard, or self-reference failures.
- [x] 2.7 Implement GSK-008/GSK-009: update Agent-facing anti-cheating / quality guidance that currently says `content_dedup` will catch generated or duplicate references; replace it with work-unit submit, ledger, cache, provenance, and hash authority guidance.
- [x] 2.8 Implement GSK-008/GSK-009/GAC-001..GAC-009: add or run a current-surface hygiene scan that fails positive current references to retired content heuristics outside `openspec/changes/archive/`, this change's REMOVED/migration wording, and registry tombstones.

Apply notes:

- Retired case-403 has been replaced by `case-403-light-work-unit-authority.md`; `RUN_EXPS.md` and `run-fixture-backed-case.mjs` now prove missing submitted ledger fails, clean submitted coverage passes, parseable root-looking URLs remain valid, and cache drift fails through cache coverage.
- Health tooling now reports `source_recoverability` from submitted references and cache/source trails. It does not consume retired content heuristic evidence.
- Current implementation/guidance hygiene is covered by `tests/integration/md/retired-content-heuristic-hygiene.test.mjs`; current helper text in `experiments_env/shared/` no longer teaches retired dedup proof.

## 3. Degraded Handoff Contract

- [x] 3.1 Implement GSK-006/GSK-007/GSK-008/GSK-009: add degraded pass result fields for eligible repeated gate failures: `passed: true`, `degraded: true`, `degraded_reason`, `degraded_rules`, `currentNodeRef`, and normal deterministic `next`.
- [x] 3.2 Implement GSK-007/GSK-008: fail closed when deterministic runtime-truth blockers exist, including missing submitted work-unit ledger rows, stale in-flight queue state, invalid status window, failed handoff preflight, hash drift, nonce mismatch, or non-durable trace writes.
- [x] 3.3 Implement CPT-003/CPT-004/CPT-007: update `enter-phase` and source-gate `advance-status` so trace-durable degraded gate attempts are legal handoff witnesses only when all normal source/target route binding checks pass.
- [x] 3.4 Implement SWE-001..SWE-005: update silent execution guidance so fatigue follows repair, strategy change, legal degraded handoff, legal next-node continuation, or silent hold without surfacing, phase skipping, or premature final output.

## 4. Root-Cause-First Diagnostics

- [x] 4.1 Implement GSK-008/GSK-009/CHI-001/RWG-016: update gate result builders so primary `inspect[]` and `advice[]` group blocking root causes before downstream symptoms while preserving full diagnostic detail in durable artifacts where available.
- [x] 4.2 Implement WPG-001/WPG-002/WPG-003/WPG-007/WPG-008/WPG-009/WPG-010: preserve submitted-row work-unit identity in provenance diagnostics and distinguish cache coverage failures from ledger/hash/manual-edit root causes.
- [x] 4.3 Implement RWG-016: ensure YAML shape, missing source fields, ledger-only reference counting gaps, cache trail mapping gaps, delegated bypass suspicion, submitted work-unit hash drift, and degraded-pass eligibility receive specific repair-targeted diagnostics.
- [x] 4.4 Implement GSK-008/GSK-009/WPG-008/RWG-016: remove advice that tells the Agent to hand-edit `rb_status.json`, `rb_output_declarations.jsonl`, `_work_units/_index.json`, submitted work-unit result files, or cache/hash-bound authority surfaces.
- [x] 4.5 Implement WPG-008/RWG-016/CHI-001: authority-file drift diagnostics SHALL say the affected file is Engine-owned and route to restore, retry/replacement submit, rollback, or Engine-mediated repair if available; do not add comment/header lines to JSONL or JSON authority files as the protection mechanism.

Apply notes:

- `buildGateResult()` now deduplicates primary feedback and orders root-cause-like cache/ledger/provenance/handoff diagnostics before downstream count/coverage symptoms.
- Work-unit/cache diagnostics preserve submitted row context where available and separate cache coverage drift from missing ledger, submitted-row hash drift, and delegated bypass suspicion.
- Authority-file advice now points to Engine-owned restore, retry/replacement submit, rollback, or Engine-mediated repair paths; it does not tell the Agent to hand-edit JSON/JSONL authority surfaces or add comment headers.

## 5. Regression Coverage

- [x] 5.1 Add/update gate definition and CLI tests for RWG-015/GAC-001..GAC-009 proving active Wave0/Wave1 definitions reject or omit `content_dedup`, and gate CLIs do not dispatch it.
- [x] 5.2 Add/update ref-count tests for EEX-001/EEX-002/EEX-003 proving homepage/shallow-looking URLs are not countability blockers when URL-parseable and other deterministic conditions pass.
- [x] 5.3 Remove or invert positive `content_dedup`, Jaccard, homepage, URL duplicate, and self-reference tests so current tests prove absence from the quality loop rather than success of the retired patch.
- [x] 5.4 Add degraded handoff tests for GSK-006/GSK-007/CPT-003/CPT-004/CPT-007 proving eligible repeated failures can advance with trace-visible degraded witness, while runtime-truth failures cannot degrade.
- [x] 5.5 Add silent execution tests/static checks for SWE-001..SWE-005 proving `stop: no` fatigue does not surface to the user, skip required phases, or write final artifacts.
- [x] 5.6 Add root-cause-first diagnostic tests for CHI-001/GSK-008/RWG-016/WPG-008 proving cache/provenance/ledger/hash cascades identify the root cause and avoid manual authority edit advice.
- [x] 5.7 Add experiment runner/health tests for EXR-003/AGT-009 proving current runner surfaces no longer require `content_dedup` evidence and evidence-extraction metrics report source recoverability instead of homepage/shallow URL heuristics.

## 6. Registry, Version, And Archive-Ready Cleanup

- [x] 6.1 Prepare `openspec/governance/req-registry.yaml` retirement sequencing for GAC-001 through GAC-009, RWG-015, EXR-003, and RTI-004 according to RET-005; do not append `[DEPRECATED]` while this active delta still declares those IDs. The actual tombstone update SHALL happen during archive/sync after active delta declarations are removed, or as an atomic archive step that keeps `check-project-reqs.mjs` free of `reusedRetired` failures.
- [x] 6.2 During archive/sync, remove active `openspec/specs/gate-content-dedup/` so `gate-content-dedup` is no longer a current accepted capability after this change is complete.
- [x] 6.3 During apply, clean current code/docs/playbooks/JSON/YAML/schema fixtures/runner metadata outside `openspec/changes/archive/`; during archive/sync, clean accepted main specs so no active surface presents retired content heuristics as gate, advice, experiment proof, health evidence, or implementation guidance.
- [x] 6.4 Implement VEM-002/VEM-003/VEM-004: update repo-root `CHANGELOG.md` with target version `v0.7` and update `DPT_FRAMEWORK/RUN.md` banner to `DPT_FRAMEWORK v0.7`.

Apply notes:

- Registry/main-spec retirement is deliberately sequenced for archive/sync, not apply, because this active delta still declares the removed IDs and premature tombstones would risk `reusedRetired` governance failures.
- Current apply cleanup covers code, tests, playbooks, runner metadata, health tooling, guidance, and current backlog planning notes outside archived OpenSpec history.
- Version surfaces now use proposal-declared `v0.7`: repo-root `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md`, and version-management regression coverage.

## 7. Verification

- [x] 7.1 Run targeted Node regression tests for changed gate definitions/CLIs, ref-count helpers, phase transition/degraded handoff, work-unit provenance diagnostics, silent execution guidance, runner/health cleanup, and version management.
- [x] 7.2 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- [x] 7.3 Run `npm test`.
- [x] 7.4 Run `node openspec/governance/check-project-reqs.mjs` and ensure 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired issues.
- [x] 7.5 Run `node openspec/governance/check-project-specs.mjs` and ensure 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader issues.
- [x] 7.6 Run `openspec validate simple-gate-quality-loop --strict` and `openspec status --change "simple-gate-quality-loop"` and confirm the change remains apply-ready.
