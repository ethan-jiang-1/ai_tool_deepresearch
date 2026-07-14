# Apply Evidence

## Baseline — 2026-07-14

All commands ran from `/Users/bowhead/ai_tool_deepresearch`. The suites use disposable fixtures/temp directories; no production bundle was selected or mutated.

| Surface | Exact command | Result |
|---|---|---|
| Gate schema/helpers/formal CLIs | `node --test tests/schema/contracts/gate.test.mjs tests/schema/gate-definition-threshold-source.test.mjs tests/schema/gate-rule-audit.test.mjs tests/schema/gate.test.mjs tests/engine/helpers/gate-helpers-*.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/gate-*.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-*.test.mjs` | PASS — 403 passed, 0 failed |
| Canonical topic state/layout | `node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/topic-layout*.test.mjs tests/integration/cli/operate-topic-state.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs` | PASS — 38 passed, 0 failed |
| Queue/work-unit/CLI/guidance | `node --test tests/engine/queue-manager-*.test.mjs tests/engine/work-unit-*.test.mjs tests/integration/cli/operate-queue*.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs tests/integration/md/phase-seedtopics-queue-loop.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs tests/integration/md/cache-leaf-contract-guidance.test.mjs` | PASS — 195 passed, 0 failed |
| Wave inspect/output/purity | `node --test tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/schema/wave-inspect-purity-static.test.mjs tests/engine/helpers/return-map.test.mjs tests/integration/cli/exit-code-convention.test.mjs` | PASS — 49 passed, 0 failed |
| Reference/depth/count/guidance | `node --test tests/engine/helpers/ref-count.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/schema/contracts/reference.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/retired-content-heuristic-hygiene.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs` | KNOWN BASELINE FAILURE — 70 passed, 1 failed |
| File observability/bundle health | `node --test tests/engine/helpers/file-observability.test.mjs tests/integration/cli/inspect-bundle.test.mjs tests/integration/cli/validate-bundle.test.mjs tests/schema/verify-bundle-health.test.mjs tests/schema/health-report-schema.test.mjs` | PASS — 78 passed, 0 failed |
| All Markdown contracts | `node --test tests/integration/md/*.test.mjs` | KNOWN BASELINE FAILURE — 137 passed, 1 failed |

The one repeated baseline failure is `tests/integration/md/retired-content-heuristic-hygiene.test.mjs`. It falsely treats the explanatory `content_dedup` example newly present in `guidelines/evolution-simple-reliable-control.md` as an active retired-rule occurrence. This is unrelated to BUG-081..089 and is not evidence of a normal-path runtime regression. It remains visible for the owning hygiene slice; later slices must not mask it through domain behavior changes.

### Current rerun-only gaps

The baseline suites correctly protect the existing normal first-run path, but do not make the nine reported rerun cases pass:

- BUG-081: `renderSeed()` still emits the minimal new-seed body.
- BUG-082: a rerun-added Topic with only an orphan Wave0 artifact still lacks submitted work-unit coverage.
- BUG-083: delegated queue claim and actor/fallback no-claim outcomes remain difficult to distinguish from the primary CLI feedback.
- BUG-084: result/schema/binding/receipt/output/cache submit failures still require repeated contract discovery.
- BUG-085: reference consumers do not yet share one UID/legacy binding adapter.
- BUG-086: `isCountable()` still blocks short Core Content Capture and fewer than five Key Facts.
- BUG-087: depth review still carries/checks copied source/cache authority instead of deriving it from reviewed submitted rows.
- BUG-088: there is no accepted `recover-declaration` operation for an already-submitted missing ledger row.
- BUG-089: `validateSourceClaims()` still requires every accepted `source_ref` to be declared by the current result's `output_files[]`.

These are recorded defects, not permanent expected-PASS behavior.

## BUG ownership and regression routing

| BUG | Owning slice | Direct Source of Record | Primary final regression location |
|---|---|---|---|
| BUG-081 | 4.1 canonical seed renderer | `rb_plan.md#/topic_registry` + UID-bound seed projection owned by `canonical-topic-state.mjs` | `tests/engine/helpers/canonical-topic-state.test.mjs` |
| BUG-082 | 4.7 normal Wave0 integration/parity | `rb_queue.json`, work-unit index/envelope, Engine-written `rb_output_declarations.jsonl`, normal Wave0 evaluator | `tests/integration/cli/rerun-added-topic-wave0.test.mjs` |
| BUG-083 | 4.2 claim diagnostics | queue active-window front + current role-bound actor observation + work-unit batch/index owner | `tests/integration/cli/rerun-added-topic-claim.test.mjs` |
| BUG-084 | 4.5 shared candidate submit plan | candidate result/receipt/output/cache plus index/manifest/beacon/queue contracts; formal submit remains sole commit authority | `tests/engine/work-unit-submit.test.mjs` |
| BUG-085 | 3.3 canonical reference binding | `rb_plan.md#/topic_registry` + shared UID/current/previous layout resolver + reference metadata adapter | `tests/engine/helpers/reference-topic-binding.test.mjs` |
| BUG-086 | 3.1 numeric count qualification | authority-selected reference metadata: accepted status + parseable `source_url` | `tests/engine/helpers/ref-count.test.mjs` |
| BUG-087 | 3.4 Wave1 depth derivation | reviewed hash-valid submitted rows + Wave0 source authority + profile | `tests/engine/wave-depth-contracts.test.mjs` |
| BUG-088 | 6.2–6.5 declaration recovery | existing submitted index/status hash + direct manifest/beacon/result/receipt/output/cache/queue owners; bundle ledger remains coverage authority | `tests/integration/cli/operate-work-unit.test.mjs` |
| BUG-089 | 5.1 supplementary submitted-output lineage | hash-valid bundle ledger + bound index/manifest/queue topic payload + canonical resolver + kind output contract | `tests/engine/work-unit-submit.test.mjs` |

Each BUG first receives a RED regression only in its owning slice and turns GREEN before that slice closes. Later slices may reuse the production helper/result but must not duplicate validator truth or fixture authority.

## Gate feedback island

### Task 2.1 — Gate-definition common contract

- Added `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` without changing any production definition reader.
- The module owns the common definition/rule skeleton, alternative checked-authority descriptors, `finding.source`, the seven blocking bases, the five repair kinds, registered coordinate placeholders, and the constrained `$checked_target` alias.
- It preserves check-specific fields as passthrough and does not dispatch checks, compute verdicts, inspect `failure_message`, infer responsibility from coordinate strings, or maintain a coordinate/operation catalog.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs && git diff --check`
- Result: PASS — 11 passed, 0 failed; diff check clean.

### Task 2.2 — Shared structured finding

- Extended the existing `wave-contract-findings.mjs` shape with definition/checker ownership, direct observed fact, missing fact, schema-validated blocking basis and repair kind, exact next-action coordinate, masking relation, and checkpoint context.
- A declared blocking root with missing/invalid root metadata now becomes one `configuration_integrity` / `missing_contract` finding that masks the original domain symptom; legacy callers remain compatible until their owning migration task supplies structured metadata.
- `failed_rule_ids` now projects blocking `rule_id`, while concrete `id` and coordinates continue to distinguish multiple instances.
- Exact focused verification: `node --test tests/engine/helpers/wave-contract-findings.test.mjs tests/schema/gate-definition.test.mjs && git diff --check`
- Result: PASS — 22 passed, 0 failed; diff check clean.
- Existing Wave compatibility verification: `node --test tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`
- Result: PASS — 71 passed, 0 failed.

### Task 2.3 — Gate hint/result projection and durable diagnostic

- `buildGateResult()` now projects structured primary roots into top-level `hints[]`; pass always returns `hints: []`.
- Known bundle/current-node coordinates produce an absolute same-Gate command. Missing invocation coordinates retain explicit `<bundle-path>` / `<current-node-ref>` templates rather than inventing runtime facts.
- Unresolved next-action coordinates fail closed as `configuration_integrity` / `missing_contract`.
- The existing failure/pass diagnostic serializers preserve the same `hints[]`; no new trace writer, finalizer, or durable authority was added.
- Exact focused verification: `node --test tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/schema/gate-definition.test.mjs && git diff --check`
- Result: PASS — 66 passed, 0 failed; diff check clean.
- Old-wrapper compatibility verification: `node --test tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`
- Result: PASS — 189 passed, 0 failed.

### Task 2.4 — Instantiation/setup definition metadata

- Added checked-authority/finding-source contracts to all 17 `instantiation-complete` and 21 `setup-ready` rules.
- Scaffold and initial bundle structure route to the existing instantiation operation; recorded HITL1 remains a user decision; plan-body content remains an Agent repair.
- Schema and basename checks are checker-owned so their different direct roots are not flattened. Status/schema/basename rules never authorize direct Agent edits of deterministic authority.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/integration/cli/check-gate-instantiation-complete.test.mjs tests/integration/cli/check-gate-setup-ready.test.mjs && git diff --check`
- Result: PASS — 27 passed, 0 failed; both old-loader Gate suites retain accepted behavior.

### Task 2.5 — HITL1/seed-topics definition metadata

- Added finding-source/root contracts to all 13 `hitl1-recorded` and `seed-topics-ready` rules.
- Research-profile, must-answer, and HITL1 status choices remain `user_decision` at `phases/phase-hitl1.md`; lifecycle status changes use the existing `advance-status` Engine operation instead of suggesting direct status edits.
- Exact Agent-owned seed files may use `$checked_target`; cross-field slug consistency remains checker-owned and no glob/multi-coordinate target is treated as write authorization.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/integration/cli/check-gate-hitl1-recorded.test.mjs tests/integration/cli/check-gate.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs && git diff --check`
- Result: PASS — 99 passed, 0 failed; old-loader Gate and chain behavior remain unchanged.

### Task 2.6 — HITL2/readiness/rerun definition metadata

- Added finding-source/root contracts to all 16 `hitl2-recorded`, `readiness-passed`, and `rerun-ready` rules.
- HITL2 choices and rerun rationale remain `user_decision` at `phases/phase-hitl2.md`; exact Agent-owned artifacts use `$checked_target`.
- Trace completeness/parseability, rerun-count limit, profile parsing, and multi-directory bundle integrity remain checker-owned so branch-specific Engine operations or unavailable boundaries are not flattened into unsafe direct-edit advice.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/integration/cli/check-gate-hitl2-recorded.test.mjs tests/integration/cli/check-gate-readiness-passed.test.mjs tests/integration/cli/check-gate-rerun-ready.test.mjs tests/integration/cli/check-gate.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs && git diff --check`
- Result: PASS — 129 passed, 0 failed; branch-sensitive existing Gate behavior remains unchanged.

### Task 2.7 — Wave0 definition metadata

- Added finding-source/root contracts to all 14 `wave0-complete` rules.
- Single-root artifact/floor checks are definition-owned; source-YAML schema, trace, cache, submitted-ledger/output/submission, and delegated-bypass checks remain checker-owned so direct provenance roots are not flattened.
- Glob rules use the explicit `reference/` repair surface rather than `$checked_target`; no static repair contract points at manual ledger or trace edits.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs && git diff --check`
- Result: PASS — 54 passed, 0 failed; old-loader Wave0 Gate and inspect behavior remain unchanged.

### Task 2.8 — Wave1 metadata and Key Facts quantity retirement

- Removed the blocking `key_facts_min_lines` rule from the active Wave1 definition together with its production evaluator dispatch/helper export, degradation eligibility, and test-only audit inventory entry.
- A focused regression now proves that fewer Key Facts cannot reappear in `failed_rule_ids`; the still-separate numeric count heuristic remains visible for task 3.1 rather than being hidden here.
- Added finding-source/root contracts to all 22 remaining Wave1 rules. Single-root artifacts/floors/stale tokens are definition-owned; depth, reference format/index/backing, presentation-sensitive semantic checks, trace, cache, and provenance remain checker-owned without definition fallback metadata.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs && git diff --check`
- Result: PASS — 83 passed, 0 failed; active Wave1 Gate/inspect behavior is preserved except for the planned retirement of the quantity-only blocker.

### Task 2.9 — Wave2 definition metadata

- Added finding-source/root contracts to all 19 `wave2-complete` rules.
- Single-root artifacts, W2F synthesis binding, and seed backfill completion are definition-owned; finding-index/YAML, cross-artifact/reference binding, rerun branch, trace, and delegated provenance remain checker-owned.
- `ledger_fixed_sections` and the presentation-sensitive Wave1-link rule retain checker ownership without artificial static basis/repair metadata; the ordered ledger presentation is simplified only in its planned task 3.5 slice.
- Exact verification: `node --test tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs && git diff --check`
- Result: PASS — 72 passed, 0 failed; old-loader Wave2 Gate and inspect behavior remain unchanged.

### Task 2.10 — Shared production Gate-definition reader and derived audit

- Added one paired-snapshot reader in `schema/contracts/gate-definition.mjs`; formal/inspect loading, workflow consistency, post-final rerun guard, work-unit hygiene, and positive semantic tests now consume the same Zod parser.
- Post-final rerun-limit semantics and `definition_sha256` now come from the same filesystem read's parsed definition and raw bytes.
- Replaced the 123-rule `CHECK_IMPLEMENTATION_ROUTES` / `GATE_RULE_INVENTORY_GROUPS` audit with definition/CLI auto-enumeration, shared-parser raw/parsed parity, and production no-bypass checks. No hard-coded Gate count or rule-granular producer/root/test catalog remains.
- Raw negative fixtures are accepted only as test inputs; production parser/CLI rejection proves invalid JSON, missing finding-source contracts, and unknown evaluator checks at their actual boundaries.
- Reader/audit/consistency/hygiene verification: `node --test tests/schema/gate-definition.test.mjs tests/schema/gate-definition-threshold-source.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/consistency-validator.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs tests/integration/cli/transition-integrity.test.mjs tests/integration/cli/check-gate.test.mjs && git diff --check`
- Result: PASS — 218 passed, 0 failed.
- Post-final and full Gate compatibility verification: `node --test tests/engine/helpers/post-final-recovery.test.mjs tests/integration/cli/post-final-recovery.test.mjs tests/schema/contracts/gate.test.mjs tests/schema/gate-definition-threshold-source.test.mjs tests/schema/gate-rule-audit.test.mjs tests/schema/gate.test.mjs tests/engine/helpers/gate-helpers-*.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/gate-*.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-*.test.mjs && git diff --check`
- Result: PASS — 431 passed, 0 failed; active Gate behavior and post-final lifecycle integration remain accepted.

### Task 2.11 — Helper-owned failure-source findings

- Invocation parsing and safe definition loading now build failed results from checker-owned structured findings, so their current JSON compatibility surface also carries `hints[]`.
- Added helper-owned findings for node/gate binding, routing invalid/config results, handoff/load/status preflight, canonical topic-state prerequisites, and strict Gate-attempt trace durability. Existing `reason/inspect/advice` are projected from those findings.
- `validateNodeGateBinding()` remains a compatibility string adapter over `checkNodeGateBinding()`; routing findings are non-enumerable until wrapper migration, preserving existing routing JSON. Strict trace errors carry the detecting finding rather than requiring wrappers to infer metadata from error text.
- No central root catalog, persistent state, or prose/path inference was introduced.
- Exact verification: `node --test tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/handoff-helpers.test.mjs tests/engine/helpers/canonical-topic-state.test.mjs tests/integration/cli/check-gate.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs && git diff --check`
- Result: PASS — 167 passed, 0 failed; old wrappers and the bootstrap Gate chain remain compatible.

### Task 2.12 — Instantiation/setup formal wrapper migration

- Added one thin definition-rule projector to the existing `wave-contract-findings.mjs` shape. It reads the parsed rule's declared basis/repair contract, resolves `$checked_target`, `{bundle}`, `{topic}`, and `<slug>` against the current evaluation context, and fails unresolved coordinates as configuration integrity; it does not dispatch checks or infer responsibility from path/prose.
- Migrated `instantiation-complete` and `setup-ready` from hand-built binding/rule failures to structured findings and the shared Gate result builder. Pass returns `hints: []`; definition-owned file/directory/status/plan-body failures and checker-owned schema/basename roots now carry complete `rule_id/repair_kind/missing_fact/write_to/rerun`.
- Missing file/schema parents mask dependent status/body/basename symptoms locally. Schema and basename authority never recommends direct edits; absent safe owner operations remain explicit `missing_contract` boundaries.
- Binding, handoff, routing, and strict Gate-attempt trace failures preserve the detecting helper's finding. Binding reruns use the helper-known legal node, routing configuration cannot be reported as Gate pass, and setup progress is not written after a non-durable pass attempt.
- Kept existing Gate-attempt/progress ownership. The shared emitter now writes complete JSON through a blocking stdout descriptor so a multi-hint result is not truncated at the pipe boundary; no second output writer or verdict was added.
- Compatibility `advice[]` is derived from structured repair metadata and deduplicated by action; legacy `failure_message` is not used as repair authority.
- Focused verification: `node --test tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/integration/cli/check-gate-instantiation-complete.test.mjs tests/integration/cli/check-gate-setup-ready.test.mjs`
- Result: PASS — 37 passed, 0 failed.
- Gate/routing/durability compatibility verification: `node --test tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/handoff-helpers.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs tests/integration/cli/transition-integrity.test.mjs && git diff --check`
- Result: PASS — 297 passed, 0 failed; bootstrap chain, routing tri-state, attempt trend, Gate diagnostics, and strict trace durability remain accepted.

### Task 2.13 — HITL1/seed-topics formal wrapper migration

- Migrated `hitl1-recorded` and `seed-topics-ready` to helper-owned findings, definition-rule projection, shared Gate result construction, routing findings, and strict trace-durability failure handling. Neither wrapper hand-builds a failed result or infers repair responsibility from `failure_message`, path shape, or error prose.
- HITL1 now keeps research-profile, must-answer, and recorded HITL1 status as `user_decision`; a missing recorded timestamp is `agent_action` only after the decision status is recorded. Missing/unprobed research access asks the Agent to run and record the real HITL1 search/fetch probe, while a schema-valid unavailable environment is `external_action`. Profile schema failure is one `missing_contract` parent and masks dependent profile-field symptoms.
- Canonical topic-state inspection owns the parent root. HITL1's canonical-but-empty registry asks for the minimum HITL1 Topic decision. Seed-topics treats non-canonical, blocked, failed, or empty topic state as the sole primary prerequisite and masks dependent directory, slug-set, per-file slug, and title rules.
- Seed checker roots retain explicit responsibility for forensic detail: an empty registry is a HITL decision; concrete slug/stem mismatch and missing/extra seed projection coordinates are Agent-owned. Definition-owned per-file title targets resolve `<slug>` to the concrete file coordinate before projection.
- Added focused `check-gate-seed-topics-ready` integration coverage and expanded HITL1 tests for complete hints, parent masking, user/Agent/external responsibility, exact coordinates, and pass `hints: []`.
- Exact verification: `node --test tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/handoff-helpers.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs tests/integration/cli/transition-integrity.test.mjs && git diff --check`
- Result: PASS — 300 passed, 0 failed; normal bootstrap chain, rerun predecessor acceptance, handoff/status preflight, routing tri-state, and shared Gate output remain accepted.

### Task 2.14 — HITL2/readiness/rerun formal wrapper migration

- Migrated `hitl2-recorded`, `readiness-passed`, and `rerun-ready` to helper-owned binding/handoff/routing/durability findings plus definition/checker rule findings and the shared Gate result builder. All failed exits now include `hints[]`; no wrapper hand-builds a failed result.
- Preserved HITL2 branch semantics exactly: `proceed_to_readiness` routes to readiness, `rerun` routes to rerun, and recorded decisions without an accepted automatic transition still pass with `no_transition` rather than defaulting to readiness. Missing/empty decision briefs are Agent actions; recorded status/choice problems remain user decisions; profile parse failure masks dependent decision fields.
- Readiness artifact roots remain Agent-owned. Missing prior Gate lineage and Engine trace corruption remain `missing_contract` boundaries rather than advice to fabricate or edit trace; a YAML-presentation-only profile parse error is an Agent mechanical repair. Invalid trace locally masks derived prior-gate symptoms when rule evaluation is reachable.
- Rerun keeps normal and post-final handoff authorization in the existing shared preflight. Missing accepted profile state is one parent root that masks rationale/count symptoms; rationale and a reached rerun limit remain user decisions, while missing completed-run structure is an explicit bundle-integrity `missing_contract` boundary rather than empty-directory make-believe recovery.
- Strict Gate-attempt trace durability failure is projected as a helper-owned failed result. Focused tests also updated the rerun test JSON extractor to consume the complete structured object instead of selecting the final nested `{` after `hints[]` was added.
- Focused verification: `node --test tests/integration/cli/check-gate-hitl2-recorded.test.mjs tests/integration/cli/check-gate-readiness-passed.test.mjs tests/integration/cli/check-gate-rerun-ready.test.mjs tests/integration/cli/post-final-recovery.test.mjs`
- Result: PASS — 45 passed, 0 failed.
- Gate/post-final compatibility verification: `node --test tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/handoff-helpers.test.mjs tests/engine/helpers/post-final-recovery.test.mjs tests/integration/cli/post-final-recovery.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs tests/integration/cli/transition-integrity.test.mjs && git diff --check`
- Result: PASS — 319 passed, 0 failed; branch-sensitive routing, normal/post-final rerun authorization, lifecycle preflight, and strict formal durability remain accepted.

### Task 2.15 — Wave evaluators, inspect CLIs, and formal Wave wrappers

- Wave0/Wave1/Wave2 pure evaluators and blocking return-map helpers now return structured findings at the detecting boundary. Definition-owned rules use the parsed definition contract; checker-owned provenance, reference/index, cache, depth, finding-index, and return-map roots carry their own root-specific basis and repair coordinates.
- Migrated all three Wave inspect CLIs and all three formal Wave wrappers to the same findings. Shared failures agree on `rule_id`, `repair_kind`, `missing_fact`, and `write_to`; only the checkpoint-specific `rerun` differs. Inspect remains read-only, has no routing/lifecycle authority, preserves exit `0/1/2`, and returns structured invocation/config failures plus pass `hints: []`.
- Canonical topic-registry read/empty failure is one prerequisite root before per-topic rule expansion. The unknown-check regression fixture now supplies a valid non-empty registry so it tests checker dispatch rather than bypassing this prerequisite.
- Formal wrappers retain lifecycle binding, handoff, routing, attempt diagnostic, strict durability, and formal-only trace checks. Delegated-bypass scanning remains pure and only formal invocation writes its existing durable diagnostic, at most once.
- Focused unknown-check verification: `node --test tests/integration/cli/check-gate.test.mjs`
- Result: PASS — 60 passed, 0 failed.
- Exact Task 2.15 verification: `node --test tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/helpers/return-map.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs tests/integration/cli/transition-integrity.test.mjs && git diff --check`
- Result: PASS — 320 passed, 0 failed; diff check clean.

### Task 2.16 — Prose-independent root ordering and attempt trend

- Removed `gateMessagePriority()` / `prioritizeMessages()` and their keyword regexes. Compatibility `inspect[]` / `advice[]` now retain caller/evaluator order with exact-string deduplication; primary hint order remains the structured finding order.
- Gate-attempt comparison now uses only current/prior `check.failed_rule_ids` (or the compatible top-level structured field). It never falls back to `inspect[]`; a legacy diagnostic without stable IDs is non-comparable, so the current result becomes the first comparable sample.
- `findingsFromCheckResult()` now accepts only `advisory` or `diagnostic-only` conversion. A caller cannot turn an `[id]` prose prefix or array position into a blocking root; blocking checks must return a structured finding from the detecting boundary.
- Updated the lifecycle regression to compare stable rule IDs while retaining Topic instances in finding/hint coordinates.
- Large structured Gate results exposed a pre-existing monitor-forwarding flaw: `run-gate-with-monitor.mjs` captured the full child output but immediately exited after `process.stdout.write`, truncating forwarded JSON at 8192 bytes. It now waits for stdout completion and preserves the wrapped exit code; a >8192-byte regression verifies forwarded stdout and the durable observability artifact are identical.
- Focused verification: `node --test tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs`
- Result: PASS — 58 passed, 0 failed.
- Monitor/lifecycle verification: `node --test tests/helpers/run-gate-with-monitor.test.mjs tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`
- Result: PASS — 15 passed, 0 failed; the lifecycle playbook reported 74/74 internal checks passed.
- Exact Task 2.16 verification: `node --test tests/helpers/run-gate-with-monitor.test.mjs tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/helpers/return-map.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/engine/handoff-helpers.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/gate-chain-consistency.test.mjs tests/integration/cli/handoff-witnessing-lifecycle.test.mjs tests/integration/cli/transition-integrity.test.mjs && git diff --check`
- Result: PASS — 418 passed, 0 failed; diff check clean.

### Task 2.17 — Early-phase Controller hint consumption

- Updated instantiation, HITL1, setup, and seed-topics Controllers to consume top-level `hints[]` before compatibility `inspect[]` / `advice[]` prose.
- `agent_action` and `engine_operation` remain Agent-executed mechanical work followed by the hint's exact same-Gate `rerun`; ordinary commands are not delegated to the user.
- `user_decision` is limited to genuinely missing HITL semantics. `external_action` and `missing_contract` expose only the smallest non-delegable or unavailable boundary; once satisfied, execution returns to the Agent.
- Hint coordinates do not create permission. The Controllers explicitly prohibit direct edits to Engine-owned status/trace/ledger/index/receipt/hash/provenance authority, remove legacy prose-table repair authority, and do not reconstruct an empty canonical Topic registry without recorded intent.
- HITL1 preserves already recorded choices across an unavailable research-access environment, remains before Setup, and reruns the same bounded probe and Gate after the external prerequisite is restored.
- Focused verification: `node --test --test-reporter=spec tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/phase-hitl1-research-access.test.mjs`
- Result: PASS — 16 passed, 0 failed.
- Exact Task 2.17 verification: `node --test tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/md/phase-hitl1-research-access.test.mjs tests/integration/md/phase-seedtopics-queue-loop.test.mjs && git diff --check`
- Result: PASS — 23 passed, 0 failed; diff check clean.
- Broader Markdown observation: `node --test tests/integration/md/*.test.mjs` reported 144 passed and 1 unrelated hygiene failure. `retired-content-heuristic-hygiene.test.mjs` matched the illustrative `content_dedup` name in `guidelines/evolution-simple-reliable-control.md`; no early-phase Controller contract failed, and this wording-scan false positive is not used to weaken or bypass Task 2.17 behavior.

### Task 2.18 — Wave and late-phase Controller hint consumption

- Updated Wave0, Wave1, Wave2, HITL2, readiness, and rerun Controllers to consume top-level root-first `hints[]` before compatible `inspect[]` / `advice[]` detail.
- `agent_action` and `engine_operation` are executed by the Agent through the named authorized surface/operation, followed by the exact same-check `rerun`; ordinary pipeline commands are not pushed to the user.
- Wave-specific refill/materialization guidance now runs only when the structured `missing_fact` / `write_to` identifies that legal path. The old prose tables no longer decide root identity, authorization, fields, commands, or routing.
- Autonomous `stop: no` phases expose `user_decision`, `external_action`, or `missing_contract` only as the smallest boundary. A hint does not create a new HITL, controller, lifecycle, route, retry tree, or permission.
- HITL2 waits only for a genuinely missing recorded decision; once that decision exists, remaining legal mechanical work returns to the Agent.
- Removed readiness advice to hand-edit `rb_trace.jsonl` / status and removed rerun's prose-only `silent_unpassable` final shortcut. Engine-owned status/trace/ledger/index/receipt/hash/provenance remain repairable only through accepted operations or an explicit missing-contract boundary.
- Focused verification: `node --test --test-reporter=spec tests/integration/md/gate-hint-late-controller-contract.test.mjs`
- Result: PASS — 10 passed, 0 failed.
- Exact Task 2.18 verification: `node --test tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/md/gate-hint-late-controller-contract.test.mjs tests/integration/md/no-phase-bypass-advice.test.mjs tests/integration/md/fetch-and-floor-hygiene.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-queue-loop.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/post-final-recovery-contract.test.mjs tests/integration/md/self-documenting-workflow-nodes.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs && git diff --check`
- Result: PASS — 110 passed, 0 failed; diff check clean.
- Broader Markdown observation: `node --test tests/integration/md/*.test.mjs` reported 154 passed and the same 1 unrelated guideline-example hygiene false positive already recorded under Task 2.17. All Wave/HITL2/readiness/rerun Controller and compatibility suites passed.

### Task 2.19 — Gate feedback island checkpoint

- Verified the complete Gate feedback vertical slice as one island: shared definition schema/paired reader, derived active-rule audit, helper-owned failure sources, structured findings/masking, root-first result/hint projection, all ten formal Gate wrappers, three read-only Wave inspect CLIs, routing/handoff/durability, workflow/hygiene readers, and all ten Markdown Controllers.
- The matrix covers active Gate pass and representative definition/checker/preflight failures, invocation/configuration roots, unknown checks, checker-owned missing-root-contract failure, placeholder resolution, prose-independent ordering/trend, inspect/formal parity, lifecycle routing, post-final binding, and Controller same-check repair responsibility.
- Exact verification: `node --test tests/helpers/run-gate-with-monitor.test.mjs tests/schema/gate-definition.test.mjs tests/schema/gate-definition-threshold-source.test.mjs tests/schema/gate-rule-audit.test.mjs tests/schema/contracts/gate.test.mjs tests/schema/gate.test.mjs tests/engine/consistency-validator.test.mjs tests/engine/helpers/gate-helpers-core.test.mjs tests/engine/helpers/gate-failure-sources.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/helpers/return-map.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/helpers/post-final-recovery.test.mjs tests/engine/handoff-helpers.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/engine/gate-*.test.mjs tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs tests/integration/cli/check-gate*.test.mjs tests/integration/cli/gate-*.test.mjs tests/integration/cli/handoff-witnessing-lifecycle.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/post-final-recovery.test.mjs tests/integration/cli/transition-integrity.test.mjs tests/integration/cli/validate-work-unit-hygiene.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/md/gate-hint-late-controller-contract.test.mjs && git diff --check`
- Result: PASS — 572 passed, 0 failed; diff check clean. The Gate island is green before any Task 3.x domain simplification.

## Quality/reference/depth simplification island

### Task 3.1 — BUG-086 narrow numeric reference eligibility

- Added the BUG-086 regression first. The initial focused run produced 5 expected RED assertions: short Core Content, fewer/missing Key Facts, count audit, and the old four-condition threshold export still reflected the duplicate content heuristics.
- Narrowed `isCountable()` to the two numeric-eligibility facts it owns: `acceptance_status: accepted` and at least one URL-parseable `source_url` value. It no longer imports or calls the semantic-section parser.
- Short or missing Core Content, fewer or missing Key Facts, heading/list presentation, and prose richness no longer affect count. Required semantic-section availability remains independently strict in the shared reference-format evaluator.
- `countReferences()` still selects candidates from submitted or deterministically backed authority in normal mode. Filesystem-only references remain uncounted; missing/invalid URL, non-accepted status, unreadable files, invalid submitted backing, cache drift, and normal Gate provenance remain fail-closed.
- Updated the Wave1 quantity regression from the obsolete degraded-pass expectation to a normal pass with no `per_topic_ref_md_count_floor` or retired `key_facts_min_lines` failure.
- Focused verification: `node --test --test-reporter=spec tests/engine/helpers/ref-count.test.mjs`
- Result: PASS — 22 passed, 0 failed.
- Exact Task 3.1 verification: `node --test tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/schema/contracts/reference.test.mjs && git diff --check`
- Result: PASS — 101 passed, 0 failed; diff check clean.

### Task 3.2 — Shared tolerant reference/question semantic contract

- Added one exported `parseMarkdownSemanticSections()` authority and routed `extractSection()`, reference-format checks, Wave1 question-list checks, Key Findings checks, and the existing Wave2 section reader through it. The parser normalizes heading case, level, whitespace, slash spacing, and section order; no parallel Markdown validator remains in the Wave evaluator.
- Required semantic availability stays strict: all five reference sections and all four question-list sections must be present and non-empty. An empty question section produces the single existing `question_list_has_four_sections` root; harmless list style, heading presentation, and Key Facts quantity do not create failures or hints.
- `parseReferenceMetadata()` now stops at the first recognized semantic heading across tolerant heading levels instead of assuming exact H2 presentation. Evidence-summary URL detection accepts URL-parseable bare HTTP(S) URLs and Markdown-link destinations.
- Added the shared reference template to Wave1's actual `requires` chain. Updated Wave1 materialization, shared template, and evidence-extractor guidance to state eight common metadata fields plus the current resolvable topic binding, five required/non-empty semantic sections, tolerant presentation, distinct Key Facts/Core Content semantics, and no fixed Key Facts count.
- Focused RED/green verification: `node --test --test-reporter=spec --test-name-pattern="semantic sections|Wave1 loads|1d\\.|1f\\." tests/engine/helpers/gate-helpers-checks.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs`
- Result: PASS — 5 selected tests passed, 0 failed; 38 non-matching tests skipped. Before implementation, the same command failed on the missing shared parser export, empty question-section acceptance, missing Wave1 template requirement, and fixed-presentation guidance.
- Exact Task 3.2 verification: `node --test tests/engine/helpers/gate-helpers-checks.test.mjs tests/schema/contracts/reference.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs && git diff --check`
- Result: PASS — 69 passed, 0 failed; diff check clean.

### Task 3.3 — BUG-085 canonical reference binding and index parent short-circuit

- Added one thin `resolveReferenceTopicBinding()` adapter inside the existing `topic-layout.mjs` authority. It consumes the same current/previous layout facts and accepts exact registered `related_topic_uid`, legacy exact current/previous id or slug lists, the unique unpadded numeric equivalent, and `all`; dual forms must resolve to the same identity set.
- Canonical UID-only and legacy metadata now share one resolver outcome. Unknown, ambiguous, or conflicting forms fail closed once with a `reference_format` binding finding and exact metadata repair coordinate; no filename inference, persistent identity map, mass rewrite, or second Gate path was introduced. Legacy-plan exact id/slug references remain compatible through the same in-memory layout facts without fabricating a UID.
- Reference format now owns eight common required metadata fields plus one resolvable binding form. Wave1 formal Gate and read-only inspect both accept UID-only metadata; existing legacy normal-path references continue to pass. Shared template and evidence-extractor guidance expose the same UID-or-legacy contract.
- `checkReferenceIndexCoverage()` now reuses `validateIndexMD()` for the accepted eight-column parent. A missing/invalid parent returns one `index_table_invalid` root and stops per-file checks; after a valid parent, missing/wrong-layer rows remain independent navigation failures. A rule with zero matched materialized references returns vacuous row coverage, preserving legal Wave2 pure synthesis while Wave0 remains the index-existence owner.
- Initial RED verification: `node --test --test-reporter=spec --test-name-pattern="reference bindings|UID-only|topic-binding conflict|reference index parent" tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs`
- Result before implementation: expected failures for the missing adapter export, UID-only rejection, unreported dual conflict, and invalid-parent row cascade.
- Focused green verification: `node --test --test-reporter=spec --test-name-pattern="1g\\.|reference bindings|conflicting or ambiguous|UID-only|topic-binding conflict|reference index parent" tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs`
- Result: PASS — 6 selected tests passed, 0 failed; 50 non-matching tests skipped.
- Exact Task 3.3 verification: `node --test tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/topic-layout-target.test.mjs tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/ref-count.test.mjs tests/schema/contracts/reference.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs && git diff --check`
- Result: PASS — 167 passed, 0 failed; diff check clean.

### Task 3.4 — BUG-087 Engine-derived Wave1 depth facts

- Reduced the blocking `depth-review.yaml` shape to Phase-owned facts that cannot be reconstructed: version/topic identity, `reviewed_work_unit_refs[]`, three depth judgments, profile judgments, closed decision, and supplementary queue IDs. The Phase Agent no longer has to copy ledger source/cache arrays or profile-derived counts.
- `checkWave1DepthReviewContract()` now resolves `reviewed_work_unit_refs[]` first against schema-valid/hash-valid submitted declaration rows. Unsafe, empty, or unsubmitted refs produce one binding finding and mask source/cache/novelty/floor implications; invalid ledger authority remains a separate `missing_contract` root.
- Source claims, accepted cache/degraded refs, and source/output mapping are read only from the exact reviewed rows. Cache mapping is scoped to those rows, so review-only claims and filesystem-only cache cannot expand coverage. Wave0 baseline URLs come from Wave0 `source.yaml`; required floor comes from explicit profile parameters; exact-new observed count is derived rather than copied or trusted from `is_new_vs_wave0`.
- Legacy `wave0_source_urls`, `source_claims`, `new_source_urls`, and `new_source_floor` fields remain readable but are diagnostic-only. Drift is reported as ignored projection detail and cannot override the Engine-derived verdict.
- Updated Wave1 guidance and integration fixtures to use the minimal review shape and explicitly tell the Agent not to retype ledger/cache/profile truth. Normal supplementary repair remains the nearest action when reviewed submitted evidence is below the derived floor or its submitted cache mapping drifts.
- Focused RED/green verification: `node --test --test-reporter=spec --test-name-pattern="minimal Wave1|unsafe and unsubmitted|missing required|legacy copied|exact URL novelty|review-only claims|Wave1 phase teaches" tests/engine/wave-depth-contracts.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs`
- Result: PASS — 7 selected tests passed, 0 failed; 12 non-matching tests skipped. Before implementation, four selected regressions failed because copied fields were required/authoritative and reviewed-ref failures did not own one parent finding.
- Exact Task 3.4 verification: `node --test tests/engine/wave-depth-contracts.test.mjs tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/ref-count.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs && git diff --check`
- Result: PASS — 159 passed, 0 failed; diff check clean.

### Task 3.5 — Tolerant Wave2 ledger semantic sections

- Kept the stable `ledger_fixed_sections` rule ID but routed its six required sections through the shared semantic-section parser. Heading case, level, spacing, and order are presentation-only; every named section must still be present and non-empty.
- Removed the ordered six-heading regex and `negate` shadow fields from the active Gate definition. Definition description/failure wording and Phase guidance now state one six-section semantic set with tolerant presentation rather than a fixed Markdown layout.
- Missing or empty sections produce one checker-owned `ledger_fixed_sections` finding/hint whose `missing_fact` names the semantic section set; no quantity or ordered-presentation rule is introduced.
- Focused RED/green verification: `node --test --test-reporter=spec --test-name-pattern="1d\\.|1e\\.|presentation-tolerant" tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs`
- Result: PASS — 3 selected tests passed, 0 failed; 33 non-matching tests skipped. Before implementation, the reordered ledger already demonstrated parser tolerance, while the empty section incorrectly passed and the Phase doc still described fixed presentation.
- Exact Task 3.5 verification: `node --test tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs && git diff --check`
- Result: PASS — 124 passed, 0 failed; diff check clean. A follow-up schema-only wording check passed 34/34 after removing the last stale ordered-presentation test label.

### Task 3.6 — Shared reference binding in file observability and Wave inspect

- Removed file observability's local raw Markdown identity regex. Reference files now use the shared `parseReferenceMetadata()` plus `resolveReferenceTopicBinding(evaluateTopicLayouts(...))`; registered UID-only, legacy current/previous layout, list, `all`, and agreeing dual forms share one canonical result.
- Unknown UID/legacy identities remain visible as one unregistered durable-topic root and can still group with the same artifact-path fact. Conflicting dual metadata produces one `reference_topic_binding_conflict` root for the reference instead of competing raw-field findings. Missing topic metadata is left to the shared format owner rather than being invented as canonical drift.
- Current and previous artifact/seed path identities normalize to the same canonical topic key. Arbitrary Markdown filename/body text is no longer scanned as identity authority; cache-only scratch remains non-authoritative and phase-relative surface-gap behavior is unchanged.
- Wave0 and Wave2 inspect removed their hard-coded metadata/heading regexes and raw `related_topic` requirement. Their advisory reference presentation checks now reuse `checkReferenceFormatFiles()`, including the shared semantic parser and canonical binding adapter. Wave0 `_INDEX.md` presentation diagnostics reuse `validateIndexMD()` rather than a second header parser. Shared blocking truth remains the existing pure Wave evaluator/root projection.
- Initial RED verification: `node --test tests/engine/helpers/file-observability.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`
- Result before implementation: 4 expected failures — unknown UID was invisible, dual conflict had no canonical root, and Wave0/Wave2 inspect advised adding legacy `related_topic` to valid UID-only references.
- Focused green verification: `node --test tests/engine/helpers/file-observability.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs`
- Result: PASS — 35 passed, 0 failed; canonical footprint audit and all three inspect CLIs preserve recursive bundle snapshots.
- Exact Task 3.6 verification: `node --test tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/engine/helpers/file-observability.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs && git diff --check`
- Result: PASS — 75 passed, 0 failed; normal Wave0/Wave2 Gate behavior, return-map classification, phase-relative completeness, identity/provenance diagnostics, and read-only inspect/audit behavior remain green; diff check clean.

### Task 3.7 — Quality/reference/depth simplification checkpoint

- Verified the complete 3.x quality island together: narrow reference countability, tolerant-but-required semantic sections, canonical UID/legacy binding, reference-index parent short-circuit, Engine-derived depth facts, tolerant Wave2 ledger sections, shared inspect roots, and canonical file observability.
- Exact verification: `node --test tests/schema/contracts/reference.test.mjs tests/schema/gate-definition.test.mjs tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/topic-layout-target.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/helpers/file-observability.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs`
- Result: PASS — 283 passed, 0 failed. Normal Wave0/Wave1/Wave2 compatibility remains green; BUG-085/086/087 regressions pass through the shared normal path.
- Shadow audit: `rg -n "key_facts_min_lines|metadataKeys = \\[|const sections = \\['Key Facts'|explicitTopicMetadata|ledger_fixed_sections.*regex|Cross-Topic Scan Matrix.*Wave1 Legacy Questions.*Cross-Topic Resolutions" DPT_FRAMEWORK tests -g '*.mjs' -g '*.json' -g '*.md' && git diff --check`
- Result: PASS — matches are limited to explicit retired-rule negative assertions, tolerant six-section wording/fixtures, and the Markdown structure test's semantic list. No active quantity blocker, ordered-regex authority, local raw reference parser, or parent-cascade shadow remains; diff check clean.

## Normal Topic Wave0 producer island

### Task 4.1 — BUG-081 complete canonical new-seed renderer

- Added BUG-081 regressions before implementation. HITL1 `add_topic`, sanctioned rerun `add_topic`, and legacy `migrate_legacy` with `seed_binding:new` now prove the same complete body contract rather than separate rerun templates.
- Refactored the existing `canonical-topic-state.mjs` renderer only; no new template file, Gate, owner, or rerun branch was introduced. A new seed receives canonical UID/registry intent plus explicit gap-valued enrichment fields, the complete seed-topics initialization headings, one research-round append area, and exactly the five accepted Wave0/Wave1/Wave2 backfill tokens.
- `scope_role` remains structured frontmatter and is no longer rendered as Topic-positioning prose. No generic `__FILL_*__`, legacy generic backfill tokens, or second placeholder family is generated.
- Re-rendering an existing seed now merges its existing frontmatter first and overwrites only canonical registry keys. Custom enrichment fields and the existing body remain preserved across update-intent and layout mutation; canonical topic identity/title/intent fields remain authoritative.
- Topic-state ownership is unchanged: apply/recover still stage only `rb_plan.md`, explicitly touched `seed_topics/*.md`, and the existing topic-state workspace. Queue, work-unit, ledger, submitted artifacts, historical references, and immutable provenance remain outside this renderer.
- Initial RED verification: `node --test --test-reporter=spec --test-name-pattern="complete shared seed|same complete skeleton|preserves existing enrichment" tests/engine/helpers/canonical-topic-state.test.mjs`
- Result before implementation: 3 expected failures — missing initialization/append skeleton, migration-new used the minimal body, and existing custom enrichment frontmatter was dropped.
- Focused green verification: the same command passed 3 selected tests with 21 unrelated tests skipped.
- Exact Task 4.1 verification: `node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/topic-layout-target.test.mjs tests/integration/cli/operate-topic-state.test.mjs tests/integration/cli/post-final-recovery.test.mjs tests/integration/cli/check-gate-seed-topics-ready.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/phase-seedtopics-queue-loop.test.mjs && git diff --check`
- Result: PASS — 59 passed, 0 failed; atomic prepare/recover, lifecycle authorization, previous-layout handling, seed Gate compatibility, CLI exit contracts, no cross-owner mutation, and diff hygiene remain green.

### Task 4.2 — BUG-083 distinct queue/work-unit claim roots

- Added BUG-083 regressions before changing claim behavior. The allocator regression proved that terminal b000 history followed by an explicitly opened b001 can already claim a new Topic demand as `wu-w0-b001-src-i0001`; no allocator rewrite or rerun branch was needed.
- Non-delegated `operate-queue claim` now distinguishes `delegated_requires_work_unit_claim` from `empty_active_window`. Delegated rejection names the blocked queue item, role-bound actor-observation/claim input, `repair_kind: engine_operation`, the direct ownership fact, and one exact `operate-work-unit claim` checkpoint.
- Delegated queue-front rejection returns the validated unchanged queue and the CLI does not call `saveQueue()` for that failure, so queue authority bytes remain unchanged. Empty-window handling retains its existing queue-health/stop-state owner but now has a distinct stable reason and checkpoint feedback.
- Work-unit actor preflight now projects owner-local structured roots. Missing current observation returns `observation_required` with one probe/claim input and same-command rerun; an available actor plus requested fallback returns `fallback_unnecessary` and the exact `delegated_subagent` rerun; unavailable actors with permitted fallback point to one explicit fallback claim; prohibited fallback and kind-policy mismatch retain external/missing-contract boundaries.
- These fields are read-only feedback projections. They do not persist a new actor state, create permission, change queue routing, or add a fallback controller. No-claim cases continue to allocate no work-unit index/envelope and preserve queue bytes.
- Initial RED verification: `node --test --test-reporter=spec tests/engine/queue-manager-window-lifecycle.test.mjs tests/engine/work-unit-actor.test.mjs tests/engine/work-unit-claim.test.mjs`
- Result before implementation: 4 expected diagnostic failures; the b000→b001 new-demand allocator regression already passed, proving implementation should remain focused on feedback rather than allocation.
- Focused green verification: the same command passed 25/25 after adding distinct roots and no-mutation behavior.
- Exact Task 4.2 verification: `node --test tests/engine/queue-manager-*.test.mjs tests/engine/work-unit-actor.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs && git diff --check`
- Result: PASS — 122 passed, 0 failed; normal queue lifecycle, logging, receipt/projection behavior, batch/retry/terminal semantics, CLI output, role policy, no-allocation rejection, and diff hygiene remain green.

### Task 4.3 — BUG-084 canonical bundle root and side-effect-free existing reads

- Added the BUG-084 wrong-root regression before implementation. From inside a valid claimed bundle, `inspect`, `dry-submit`, and formal `submit` are invoked with the bundle basename, which resolves to the nonexistent same-name nested root. Each command must reject and preserve a recursive byte snapshot of the valid parent bundle.
- `loadWorkUnitIndex(..., { createIfMissing: false })` now checks for `_work_units/_index.json` before any directory initialization. A missing existing authority throws one direct error that points the Agent back to the canonical absolute `bundle_dir`; only explicit create paths may initialize `_work_units` and `_transactions`.
- `operate-work-unit inspect` explicitly requires existing work-unit authority. It no longer reports a nonexistent nested root as a successful empty work-unit set, and its missing-authority return is deliberately diagnostic-write-free.
- Claim/envelope projections now expose one Engine-resolved absolute root through beacon `bundle_dir`, task binding, absolute runtime paths, spawn prompt, claim `prompt_refs`, and copyable dry-submit/submit CLI examples. Bundle-relative refs remain relative exactly once.
- Inspect now reuses the submit-side `readAndValidateBeacon()` evaluator. The shared check rejects relative/drifted beacon roots against `path.resolve(bundleDir)`; inspect, dry-submit, and formal submit all reject the same drift while leaving immutable beacon bytes unchanged.
- The wrong nested-root matrix proves no nested directory, `_work_units`, `_transactions`, lock, trace, log, submit rejection, queue/index/status, or beacon mutation. Normal create/claim/inspect/dry-submit/submit/late-submit/terminal behavior remains green.
- Initial RED verification: `node --test tests/engine/work-unit-index.test.mjs tests/engine/work-unit-lifecycle.test.mjs tests/integration/cli/operate-work-unit.test.mjs`
- Result before implementation: expected failures for read-only loader creation, CLI inspect accepting the nested root, missing claim `bundle_dir`, and absent absolute work-unit CLI examples.
- Focused green verification: `node --test tests/engine/work-unit-index.test.mjs tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-inspect.test.mjs tests/integration/cli/operate-work-unit.test.mjs`
- Result: PASS — 34 passed, 0 failed.
- Exact Task 4.3 verification: `node --test tests/engine/work-unit-*.test.mjs tests/integration/cli/operate-work-unit.test.mjs && git diff --check`
- Result: PASS — 107 passed, 0 failed; normal first-run work-unit behavior and diff hygiene remain green.

### Task 4.4 — Contract-derived Result JSON Starter and checklist

- Added focused envelope regressions before implementation. Wave0, Wave1, and Wave2 actor-aware envelopes now prove that task guidance contains one parseable Result JSON Starter whose keys exactly equal the generated `result.schema.json` properties.
- The starter is generated from that schema object, not from a second field list. It carries the exact result schema version, work ID, queue item ID, kind, receipt nonce, actor contract version and execution actor class when present, plus schema-authorized default output/source/cache fields.
- `actor_execution` is intentionally absent because the enforced result schema rejects it. The starter itself parses through `WorkUnitResultSchema`, but it remains a task-only draft: envelope generation does not create the assigned `result.json`, outputs, cache, receipt completion, or ledger authority.
- The existing write-before-return checklist now projects required and allowed result fields, allowed output roles, reference source-URL requirements, source-claim/cache binding guidance, and required cache leaf files from the current manifest output/cache contract.
- Envelope generation validates the current output/cache contract before creating the assigned work-unit directory. Required result fields must be unique, contain the binding identity fields, and exist in the generated schema; output roles and required cache leaf files must be non-empty unique values. An invalid contract therefore fails before task/schema/beacon/status files can diverge.
- No supplementary prior-output role field or BUG-089 acceptance behavior was introduced in this island.
- Initial RED verification: `node --test tests/engine/work-unit-lifecycle.test.mjs`
- Result before implementation: 2 expected failures — no Result JSON Starter and an invalid current contract still generated envelope files.
- Focused green verification: the same command passed 6/6.
- Exact Task 4.4 verification: `node --test tests/engine/work-unit-*.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs && git diff --check`
- Result: PASS — 117 passed, 0 failed; normal submit/claim/terminal, CLI, actor guidance, parser-aligned guidance, and diff hygiene remain green.

### Task 4.5 — BUG-084 shared candidate plan and transaction-owned submit authority

- Removed final declaration construction from pre-transaction validation. Shared dry/formal candidate planning now reads index, manifest, immutable beacon, candidate, receipt, output, cache, source claims, and queue through side-effect-free readers; it returns result hash, virtual canonicalization facts, and violations only, with no `declared_at`, ledger row, or ledger hash.
- Formal submit acquires the existing transaction lock, reruns the same candidate plan against current mutable facts, then applies accepted result/receipt/cache canonicalizations, generates one submission timestamp, builds the final ledger row/hash, and writes ledger/index/status/queue terminal surfaces. Normal and late submit rows now prove `declared_at === index.terminal_at === status.updated_at === queue.completed_at`, and the recorded ledger hash is reproducible from the final row.
- Cache `page-content.md -> page.md` canonicalization now occurs only inside the submit transaction. Dry-submit remains virtual/read-only, and a forced durable-postcondition failure proves transaction rollback removes the newly materialized canonical page along with ledger/index/status/queue writes.
- Candidate result parsing now accumulates independent schema/binding issues rather than collapsing Zod output into one opaque rejection. Wrong/missing `schema_version`, required actor fields, conflicting execution actor, rejected `actor_execution`, and arbitrary unknown keys are returned together with exact RFC-6901-style JSON pointers.
- Every dry-submit violation now includes `repair_kind`, direct `missing_fact`, exact `write_to`, and the same absolute dry-submit `rerun`. Candidate/output/cache/source owners provide concrete JSON/file coordinates; manifest/beacon/index/status/queue roots remain `missing_contract` owner boundaries rather than manual-edit advice.
- Output-role and cache-leaf failures identify `/output_files/<index>/role` and the exact missing cache file. Source/cache URL mapping failures identify `/source_claims/<index>/url`. Runtime receipt roots identify the assigned receipt path. Cache parent failure locally masks dependent source-claim URL mapping while independent receipt/output roots still accumulate.
- Repairable formal rejection reuses the same candidate-plan violations, records the existing rejection authority where accepted, and exposes only the same-candidate dry-submit checkpoint; no competing submit/recovery route is projected.
- Existing strict actor, receipt, nonce, manifest/beacon, queue snapshot/in-flight, output/source/cache and ledger provenance checks remain active. Candidate-side `work_id` drift is now correctly treated as repairable candidate JSON, while Engine-owned binding drift continues to route to inspect/missing-contract.
- BUG-089 prior-submitted source eligibility was intentionally not introduced; source claims remain current-attempt-only until Task 5.1.
- Focused transaction/root verification: `node --test tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs && git diff --check`
- Result: PASS — 79 passed, 0 failed.
- Exact Task 4.5 verification: `node --test tests/engine/work-unit-*.test.mjs tests/integration/cli/operate-work-unit.test.mjs && git diff --check`
- Result: PASS — 112 passed, 0 failed; normal first-run work-unit lifecycle, terminalization, actor provenance, CLI behavior, rollback, idempotency, late-submit, and diff hygiene remain green.

### Task 4.6 — Normal Wave0 producer and Agent-owned dry-submit repair loop

- Added direct-fact classification before Wave0 queue fill: existing Topic plus valid submitted Wave0 coverage reuses that authority; a new Topic without coverage enters the normal Topic pipeline; supplement intent creates normal supplementary demand; orphan `source.yaml` remains non-coverage.
- Wave0 and the shared subagent protocol now consume the claim's canonical absolute `bundle_dir` and absolute prompt/result/receipt/output/cache paths. They explicitly prohibit cwd/basename root reconstruction, same-name nested bundles, and edits to immutable `_beacon.json`.
- Corrected candidate ownership guidance: the selected actor prepares `result.json` from the task-embedded, contract-derived Result JSON Starter; Engine dry-submit validates the candidate and formal submit owns canonicalization/acceptance. The starter remains guidance, not a prewritten result or success authority.
- The Agent now runs dry-submit itself, reads all structured violations, repairs the same candidate and claimed attempt only at exact authorized coordinates, reruns the same dry-submit, and then performs formal submit. Ordinary work-unit commands are not pushed to the user.
- Anti-fabrication guidance now states that work predating claim cannot become claimed-attempt execution evidence and forbids retrospective receipt/result or post-hoc provenance. No rerun-only Gate, submit validator, provenance namespace, controller, mode, or user co-runner was added.
- Initial RED verification: `node --test tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs`
- Result before implementation: 3 expected failures for missing direct-fact wording, canonical-root/starter/dry-submit loop, and Agent/anti-retrospective-provenance responsibility.
- Exact Task 4.6 verification: `node --test tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/cache-leaf-contract-guidance.test.mjs && git diff --check`
- Result: PASS — 14 passed, 0 failed; diff check clean.
- Broader Markdown observation: `node --test tests/integration/md/*.test.mjs` reported 159 passed and the same 1 pre-existing guideline-example hygiene false positive recorded under Tasks 2.17/2.18. `retired-content-heuristic-hygiene.test.mjs` matches illustrative `content_dedup` text in `guidelines/evolution-simple-reliable-control.md`; all Task 4.6 and adjacent Markdown contracts passed, and the constitutional guideline was not altered to hide the unrelated failure.

### Task 4.7 — BUG-082 normal Wave0 integration and bounded parity

- Added a dedicated production-path integration with three cases: fresh target Topic, historical bundle with `rerun_count: 1` plus the same canonical target UID added after an earlier submitted Topic, and a rerun-added orphan `source.yaml` without a target work-unit submit.
- Both valid target cases execute the real queue enqueue, role-bound work-unit claim, generated envelope, contract-derived starter, dry-submit, formal submit, Engine ledger append, and formal Wave0 Gate. The rerun bundle preserves the historical submitted row/terminal queue facts and adds target demand afterward; it does not reset or fabricate historical authority.
- A bounded in-memory projection compares only the planned contract-bearing facts: demand kind/producer/priority/role/topic binding, work-unit kind and actor/output/cache contract, Result Starter/result-schema shape, dry-submit/formal-submit evaluator outcome, and normal Gate failed/masked rule outcome. Bundle/work IDs, nonce, batch/index, timestamps, concrete output set, and legitimate historical reuse remain outside the comparison; no signature or field catalog is persisted.
- Fresh and rerun-added target projections are equal and both normal Gates pass. The historical bundle uses the historical reference while the new Topic still supplies its own submitted `source_yaml` coverage.
- In the orphan case, the historical submitted row remains valid so `wave0_work_unit_ledger_exists` passes, but the new Topic's filesystem-only `artifacts/wave0/added-topic/source.yaml` fails `wave0_work_unit_output_coverage`. This proves direct presence is not retrospectively promoted to provenance.
- A narrow static assertion confirms the normal Wave0 kind/lifecycle/envelope/submit/evaluator/definition owners contain no `rerun_count` or rerun-only branch. The integration was green without production changes, so no artificial allocator, submit, or Gate patch was added.
- Focused verification: `node --test --test-reporter=spec tests/integration/cli/rerun-added-topic-wave0.test.mjs`
- Result: PASS — 3 passed, 0 failed.
- Wave0 Gate/inspect verification: `node --test tests/integration/cli/rerun-added-topic-wave0.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`
- Result: PASS — 29 passed, 0 failed.
- Work-unit compatibility verification: `node --test tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs`
- Result: PASS — 65 passed, 0 failed; `git diff --check` clean.

### Task 4.8 — Wave0 producer island checkpoint

- Closed the combined BUG-081/082/083/084 Wave0 producer island after running canonical topic-state/layout, queue lifecycle/window, actor/claim/index/envelope/inspect/submit/terminal work-unit suites, all affected queue/topic/work-unit CLIs, formal/read-only Wave0 checkpoints, rerun-added parity/orphan coverage, and the owning Markdown contracts.
- Topic-state/queue/work-unit Engine verification: `node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/topic-layout-target.test.mjs tests/engine/queue-manager-*.test.mjs tests/engine/work-unit-*.test.mjs`
- Result: PASS — 170 passed, 0 failed.
- CLI/Gate/inspect verification: `node --test tests/integration/cli/operate-topic-state.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/rerun-added-topic-wave0.test.mjs`
- Result: PASS — 80 passed, 0 failed.
- Owning Markdown verification: `node --test tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/phase-seedtopics-queue-loop.test.mjs tests/integration/md/gate-hint-late-controller-contract.test.mjs tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/cache-leaf-contract-guidance.test.mjs`
- Result: PASS — 35 passed, 0 failed; `git diff --check` clean.
- The combined 285-test checkpoint preserves normal first-run Topic rendering and Gate pass, historical layout compatibility, canonical absolute/immutable beacon binding, no-write wrong-root reads, role-bound actor decisions, strict result/receipt/cache/queue/ledger provenance, terminal/retry behavior, and read-only inspect semantics. No rerun-specific success authority was introduced.

## Wave1 supplementary source lineage island

### Task 5.1 — BUG-089 contract-authorized prior submitted source refs

- Added `source_claims.prior_submitted_output_roles: ['evidence_summary']` to the default `wave1_topic_deepening` kind contract. Envelope validation requires the field, when present, to be a non-empty unique subset of `output_files.allowed_roles[]` and rejects it when source claims are disabled, before assigned files are created.
- Added one in-memory source-ref lineage projection consumed by both generated claim guidance and the existing submit validator. It reads only schema/hash-valid bundle ledger rows and cross-checks submitted index/result hash, immutable manifest, terminal queue snapshot hash, and canonical Topic binding. It persists no index, graph, signature, or compatibility state.
- Prior eligibility requires one exact path, same canonical Topic UID, same wave, same kind, and a role explicitly allowed by the current kind contract. Current-candidate `output_files[]` remain independently valid and do not depend on prior authority health.
- Generated task guidance now lists the two legal forms and bounded exact eligible prior path/work/role candidates. It explicitly says not to redeclare or overwrite prior output merely to cite it; formal submit reloads all direct authority before acceptance.
- Added positive regressions for current output and exact prior `evidence_summary`, including formal supplementary submit without redeclaring the old evidence path. Negative matrix covers filesystem-only/unsubmitted, cross-topic, wrong role, wrong wave/kind, path-derived/unbound Topic, and ambiguous duplicate exact paths.
- Source-ref rejection now carries stable `source_ref_not_authorized` / `source_ref_prior_ambiguous` codes, candidate path, both searched sets, observed prior work/topic/wave/kind/role/reason facts, exact `/source_claims/<index>/source_ref` coordinate, and the same dry-submit command. An unreadable/hash-drifted prior authority is a parent `source_ref_prior_authority_invalid` missing-contract root and does not authorize editing the candidate.
- Initial RED verification: `node --test --test-reporter=spec --test-name-pattern="prior submitted|filesystem-only|prior submitted source roles" tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-submit.test.mjs`
- Result before implementation: 3 expected failures — missing default prior-role contract, valid prior evidence rejected by the current-output-only rule, and opaque current-output-only diagnostics.
- Focused green verification after ambiguity/authority-parent coverage: `node --test tests/engine/work-unit-lifecycle.test.mjs tests/engine/work-unit-submit.test.mjs`
- Result: PASS — 54 passed, 0 failed.
- Full work-unit verification: `node --test tests/engine/work-unit-*.test.mjs`
- Result: PASS — 96 passed, 0 failed.
- CLI/Wave1/inspect verification: `node --test tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`
- Result: PASS — 51 passed, 0 failed; `git diff --check` clean.

### Task 5.2 — Supplementary source-lineage Agent guidance

- Updated the Wave1 Phase Agent at both normal result handling and supplementary-demand convergence: `source_ref` may name a genuinely current declared output or one exact path listed in the claimed task's `Authorized Source-Ref Lineage` for same canonical Topic/wave/kind `evidence_summary` authority.
- Updated the evidence-extractor actor at its result-writing decision point with the same contract. The actor must consume the generated list rather than infer Topic/kind from a path.
- Both surfaces explicitly prohibit redeclaring, copying, or overwriting historical evidence merely to satisfy supplementary validation. If no authorized prior candidate is listed, the actor must produce a genuinely current assigned output.
- New cache trails and degraded-capture refs remain current-attempt facts and must be declared in the current `result.json#/cache_trails` and matching source claim. Prior output eligibility grants no implicit cache reuse and filesystem presence remains non-authoritative.
- The Phase supplementary loop now explicitly returns source-ref rejection to the same candidate's exact dry-submit checkpoint before formal submit; ordinary mechanical repair remains Agent-owned.
- Added a Markdown/contract agreement test that reads the live default kind contract and verifies the exact `['evidence_summary']` role plus all Phase/actor/shared guidance boundaries.
- Exact Task 5.2 verification: `node --test tests/integration/md/supplementary-source-lineage-guidance.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs && git diff --check`
- Result: PASS — 23 passed, 0 failed; diff check clean.

### Task 5.3 — Wave1 lineage and normal-pipeline parity checkpoint

- Closed the combined BUG-085/086/087/089 Wave1 island across source-ref authority, submitted depth derivation, tolerant reference materialization, Wave1 Gate/inspect, and Agent-facing guidance.
- Added one bounded fresh-versus-rerun-added Wave1 parity regression. It compares the normal `wave1_topic_deepening` kind/actor/output/cache/prior-role contract, shared reference template, minimal Agent-owned depth-review shape, absence of copied ledger truth, and formal Gate failed/masked outcome while excluding bundle/work IDs, timestamps, historical reuse, and other legitimate run identity.
- The rerun fixture preserves historical terminal queue/work-unit authority rather than resetting it. Both paths use the same production contract and evaluator; no rerun-only validator, Gate branch, reference parser, depth contract, or persisted projection was added.
- Engine/source/depth/reference verification: `node --test tests/engine/work-unit-*.test.mjs tests/engine/helpers/ref-count.test.mjs tests/engine/helpers/topic-layout.test.mjs tests/engine/helpers/wave-depth-contracts.test.mjs tests/engine/helpers/file-observability.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`
- Result: PASS — 163 passed, 0 failed.
- Wave1 Gate/CLI verification: `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/cli/operate-work-unit.test.mjs`
- Result: PASS — 55 passed, 0 failed.
- Markdown/contract verification: `node --test tests/integration/md/supplementary-source-lineage-guidance.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/parallel-delegated-reference-materialization.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs`
- Result: PASS — 26 passed, 0 failed; `git diff --check` clean. The combined checkpoint covers 244 passing tests.

## Declaration recovery island

### Task 6.1 — Minimal late-accept reconstruction context

- Added one strict optional `late_accept_context` to the existing work-unit index record. It owns exactly `late_accept_reason`, literal prior status `timed_out`, and unique `superseded_retry_work_ids`; context on a non-submitted attempt, a self retry ID, an empty reason, duplicate IDs, or any extra copied field is schema-invalid.
- Late-submit writes the context inside its existing commit transaction beside the result/ledger hash and shared terminal timestamp. Its durable postcondition now verifies the exact persisted context before reporting success. Normal submit does not write the field.
- No ledger row, result/output/source/cache/receipt/actor fact, recovery witness, second ledger, or new persistent owner was added. The schema's exact-key regression rejects even an extra `output_files` field.
- Coverage remains ledger-owned: a transaction regression deletes the bundle ledger after a valid late-submit and proves `readSubmittedWorkUnitDeclarations()` returns zero rows even though the index retains reconstructable context.
- Initial RED verification: `node --test tests/schema/contracts/work-unit.test.mjs` and `node --test --test-name-pattern="submits an out-of-order|late-submit accepts an eligible" tests/engine/work-unit-submit.test.mjs`.
- Result before implementation: expected missing schema export and missing persisted index context; the normal-submit no-context assertion already passed.
- Schema verification: `node --test tests/schema/contracts/work-unit.test.mjs` — PASS, 5 passed, 0 failed.
- Full work-unit verification: `node --test tests/engine/work-unit-*.test.mjs` — PASS, 97 passed, 0 failed.
- CLI verification: `node --test tests/integration/cli/operate-work-unit.test.mjs` — PASS, 20 passed, 0 failed; `git diff --check` clean. The combined checkpoint covers 122 passing tests.

### Task 6.2 — Existing-owner hash-identical declaration operation

- Added `recoverWorkUnitDeclaration()` to the existing work-unit submit owner and exposed exactly `node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>`. The operation rejects `--result` and does not create a second CLI, mode, controller, result acceptance path, or work-unit attempt.
- Recovery reuses the production manifest, canonical Topic binding, immutable beacon, assigned result, runtime receipt, output, cache, source-claim, queue snapshot, ledger schema/hash, and work-unit index readers. It requires submitted index/status result and ledger hashes plus the shared terminal timestamp to agree before rebuilding through the same `buildLedgerRow()` used by normal/late submit.
- Current normal and late-submit rows are reconstructed from their direct owners. Late rows consume only the Task 6.1 bounded context. A submitted replacement, malformed ledger prefix, missing/drifted direct owner, normalization need, timestamp mismatch, or reconstructed-hash mismatch blocks before append.
- The existing transaction lock reruns the full read-only evaluator and appends only the exact row. Recovery does not rewrite result/receipt/output/cache, complete queue demand, save index/status, or change either recorded hash. A post-append check reloads the hash-valid ledger; append failure restores the exact prior ledger bytes.
- Exact-row replay is idempotent and transaction-free. Engine regression covers current normal and late rows, byte-identical row restoration, unchanged queue/index/status bytes, and repeated unchanged success.
- Updated the existing CLI usage, `COMMANDS.md`, shared work-unit protocol, and provenance forensics playbook with one copyable command and explicit no-result/no-manual-ledger/no-direct-coverage boundaries.
- Initial RED verification: focused Engine import failed because no public recovery owner existed; focused CLI returned usage because the operation was unregistered.
- Work-unit verification: `node --test tests/engine/work-unit-*.test.mjs` — PASS, 98 passed, 0 failed.
- CLI verification: `node --test tests/integration/cli/operate-work-unit.test.mjs` — PASS, 21 passed, 0 failed.
- Command/Markdown verification: `node --test tests/integration/md/work-unit-declaration-recovery-guidance.test.mjs tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs tests/engine/command-contract-docs.test.mjs` — PASS, 15 passed, 0 failed; `git diff --check` clean. The combined checkpoint covers 134 passing tests.

### Task 6.3 — Audited current and uniquely reproducible legacy recovery

- Successful append now records one committed existing work-unit transaction plus `work_unit_declaration_recovered` on the existing trace/log surfaces. The restored declaration row remains byte-semantically identical to the originally submitted row and contains no recovery timestamp, marker, or second-row schema.
- Current submissions use the shared index/status/queue timestamp and Task 6.1 context. Legacy evaluation remains inside the same direct-owner evaluator: it enumerates only the finite timestamps already present on index/status/queue, the bound original submit trace, and its committed transaction, then rebuilds through the normal ledger-row constructor.
- Legacy late-submit audit fields come only from a same-work/result/hash/transaction-bound `work_unit_late_submitted` event whose transaction operation is `late_submit_work_unit`. Selected superseded retry IDs are cross-checked once against current abandoned index state and absence of submitted ledger coverage.
- Recovery appends only when exactly one candidate row reproduces both recorded index and status ledger hashes. Zero matches, multiple matches, absent original submit/transaction evidence for divergent legacy timestamps, hash drift, submitted replacement conflict, malformed evidence, and unsubmitted attempts block with `repair_kind: missing_contract`.
- Focused tests cover current normal/late audit, pre-context late reconstruction, pre-unified timestamp reconstruction, missing evidence, forged recorded hash, submitted replacement conflict, unsubmitted attempt, exact row identity, and zero index/status/queue/result mutation on failure. Diagnostics do not offer backup copying, manual ledger/hash construction, or a new attempt.
- Focused Engine verification: `node --test tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/engine/work-unit-index.test.mjs` — PASS, 70 passed, 0 failed.
- Full work-unit verification: `node --test tests/engine/work-unit-*.test.mjs` — PASS, 100 passed, 0 failed.
- CLI verification: `node --test tests/integration/cli/operate-work-unit.test.mjs` — PASS, 21 passed, 0 failed; `git diff --check` clean.

### Task 6.4 — Submitted-declaration parent root and dependent masking

- Added a read-only `inspectWorkUnitDeclarationRecovery()` projection that invokes the same direct-owner evaluator as formal recovery without appending or auditing. It reports exact current/legacy eligibility, recorded hash, reconstruction source, and the existing resolved operation.
- The shared work-unit provenance helper now compares submitted index records against hash-valid ledger work IDs for the active wave scope. A missing row becomes one `submitted_declaration_missing:<work_id>` finding owned by the existing `work_unit_submission_presence` rule.
- When exact reconstruction is reachable, the finding uses `repair_kind: engine_operation` and one absolute `operate-work-unit.mjs recover-declaration <bundle> --work-id <id>` coordinate. When it is not reachable, the same root uses `missing_contract`. Neither form points to JSONL/index/status edits.
- Wave0/Wave1/Wave2 evaluators call that shared detector once. For a declaration gap they mask only dependent cache, ledger-existence, output-coverage, reference-count/ledger, depth, submission-presence duplicate, and delegated-bypass checks. Independent artifact/content/return-map roots remain visible.
- Bypass diagnostic emission is suppressed for this parent fault, so one missing Engine row does not get mislabeled as direct Agent bypass. Real filesystem orphan/bypass cases with no submitted binding remain unchanged.
- Reconstruction facts still do not count: the helper regression proves the normal ledger coverage reader returns zero rows while the parent can nevertheless expose recovery eligibility.
- Shared provenance/work-unit verification: `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/helpers/wave-contract-findings.test.mjs tests/engine/work-unit-submit.test.mjs` — PASS, 78 passed, 0 failed.
- Wave Gate verification: `node --test tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs` — PASS, 68 passed, 0 failed.
- Shared inspect verification: `node --test tests/integration/cli/inspect-wave-contract-output.test.mjs` — PASS, 8 passed, 0 failed; `git diff --check` clean. The combined checkpoint covers 154 passing tests.

### Task 6.5 — BUG-088 real-CLI declaration fault checkpoint

- Added one disposable real-CLI integration covering both normal submit and audited late-submit. Each case reaches a valid submitted row and recorded index/status hash through the production claim/submit path before fault injection.
- The test removes only the generated bundle-ledger row, confirms the Wave0 Gate reports the normal `submitted_declaration_missing` parent rather than counting reconstruction facts, and invokes only the existing-owner `recover-declaration` operation.
- Recovery restores the exact original row/hash contract without hand-writing a replacement row, result, runtime receipt, output, cache trail, queue state, index/status hash, or provenance. The subsequent Wave0 Gate consumes the restored row through its normal ledger authority path.
- Exact verification: `node --test tests/integration/cli/work-unit-declaration-recovery.test.mjs`
- Result: PASS — 2 passed, 0 failed (normal submit recovery and late-submit recovery).

## Full deterministic regression

### Task 7.1 — Combined schema, Engine, Gate, CLI, Wave, and Markdown regression

- Ran the complete related schema/contracts, Engine/helpers, all formal Gate CLIs, Wave inspect CLIs, queue/work-unit CLIs, rerun-added Wave0 integration, declaration-recovery integration, and Markdown contract suites in one process.
- The first run produced 1395 passes and one known unrelated false positive: `retired-content-heuristic-hygiene.test.mjs` token-scanned `guidelines/evolution-simple-reliable-control.md` and rejected the constitutional example that explicitly explains why `content_dedup`-style opaque blocking feedback must be retired.
- Exact isolated failure command: `node --test tests/integration/md/retired-content-heuristic-hygiene.test.mjs`. It reported two `content_dedup` matches in the contract-lineage-aware rejection example; no executable checker, definition, runtime guidance, or active rule failed.
- Corrected the hygiene test boundary instead of editing the constitutional guideline: the token scan still covers framework implementation/runtime guidance, experiment playbooks/shared fixtures, backlog plans, release/root docs, and package metadata, while project-level guidelines remain free to name anti-patterns in order to prohibit them.
- Full green verification: `node --test --test-reporter=dot tests/schema/*.test.mjs tests/schema/contracts/*.test.mjs tests/engine/*.test.mjs tests/engine/helpers/*.test.mjs tests/integration/cli/check-gate-*.test.mjs tests/integration/cli/inspect-*.test.mjs tests/integration/cli/operate-queue*.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/rerun-added-topic-wave0.test.mjs tests/integration/cli/work-unit-declaration-recovery.test.mjs tests/integration/md/*.test.mjs`
- Result: PASS — 1396 passed, 0 failed; `git diff --check` clean.

### Task 7.2 — Existing case-163 real continuation canary

- Reworked the existing case-163 playbook in place; no second rerun-add canary was created. The historical fixture is bounded to two previously covered normal-run Topics and is explicitly excluded from all real-Agent verdict checks.
- The actual canary now requires the formal HITL2 handoff, `operate-topic-state apply` for exactly two added Topics, their normal Wave0 and Wave1 producer paths, two initial Wave1 attempts plus one supplementary attempt using contract-authorized prior `evidence_summary`, minimal submitted-row-derived depth reviews, and tolerant complete reference/index materialization.
- Added one reversible Wave0 Gate fault. The Agent must consume a complete `hints[]` root, execute the authorized mechanical repair without Engine-source inspection or user command delegation, and rerun the exact same Gate.
- Added one declaration fault after a real Wave1 supplementary submit. The playbook records the original row/hash, removes only that ledger row, proves reconstruction facts do not count, and allows restoration only through the existing-owner `recover-declaration` operation followed by the same Wave1 Gate.
- Expanded trace-backed verdict checks for canonical new seeds, real submitted/cache coverage, supplementary source lineage, minimal depth/reference contracts, hint repair, hash-identical recovery, immutable beacons/no nested bundle, and unchanged historical reference hashes.
- Removed the old optional single-result smoke path. `run-fixture-backed-case.mjs --case case-163`, even with `--real-result`, now reports `NOT_RUN` and points to the multi-stage Markdown playbook; it cannot overclaim Wave1/hint/recovery evidence.
- Synchronized `exp_evidence-extraction/README.md` and `experiments_playbook/RUN_EXPS.md` with the expanded proof role.
- Focused verification: `node --test tests/integration/md/case-163-rerun-canary-contract.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs tests/integration/md/supplementary-source-lineage-guidance.test.mjs tests/integration/md/work-unit-declaration-recovery-guidance.test.mjs`
- Result: PASS — 19 passed, 0 failed. `node --check experiments_env/shared/run-fixture-backed-case.mjs` and `git diff --check` also passed.

### Task 7.3 — Real Wave0 canary (in progress)

- The first retained real bundle exposed a canary-prerequisite error rather than a rerun production failure: historical work was created under the shared fixture's bounded `debug` profile, but the playbook changed it to `quick_factual` only during rerun, retroactively raising Wave0/Wave1 floors for historical Topics. The bundle `dpt_disp_case-163_eex_real_agent_rerun_add_a` is preserved as FAIL evidence and is not counted as canary proof.
- Corrected the existing case-163 playbook to keep one unchanged `debug` profile across historical normal-run and rerun execution. Historical fixture references now use the shared semantic contract, exact Topic binding, complete return maps, concrete consumer navigation, and one combined accepted index. Step 1 now requires production Wave0 and Wave1 inspect PASS before rerun begins.
- Added explicit normal historical-batch ownership: Wave0 and Wave1 each use the existing `operate-work-unit open-batch --reason rerun_added_topics` operation before claiming new demand. No rerun lifecycle, allocator, or alternate submit path was added.
- Final clean bundle: `dpt_disp_case-163_eex_real_agent_rerun_add_f`. Historical Wave0 inspect PASS and historical Wave1 inspect PASS. Formal HITL2 Gate, rerun entry/status, atomic two-Topic topic-state apply, rerun-ready Gate, seed-topics Gate, and Wave0 entry/status all PASS.
- Canonical new Topics: `tp_108f0def-0791-4a81-a882-3a28a59fec11 -> 03_economic-impact`; `tp_a9f2e4a9-de6a-452a-bc3b-28ec60f438dc -> 04_workforce-transition`. Topic-state preserved exact hashes of `rb_queue.json`, `rb_output_declarations.jsonl`, and `_work_units/_index.json`.
- Wave0 b001 claims are `wu-w0-b001-src-i0001` and `wu-w0-b001-src-i0002`, both with real task action, Topic-specific write coordinates, new immutable beacons, and current role-bound delegated-subagent observations. Real actors are executing fresh fetch/output/cache/receipt/result work under the new bundle and nonce; Task 7.3 remains unchecked until both formal submits, hint-only same-Gate repair, final Wave0 PASS, beacon/no-nested checks, and trace evidence complete.
- Focused playbook contract after correction: `node --test tests/integration/md/case-163-rerun-canary-contract.test.mjs` — PASS, 8 passed, 0 failed; `git diff --check` clean.

### Task 7.3 — Real Wave0 canary complete

- Final bundle remains `dpt_disp_case-163_eex_real_agent_rerun_add_f`. Wave0 b001 submitted two new-nonce delegated Agent attempts through production dry-submit and formal submit: `wu-w0-b001-src-i0001` (`03_economic-impact`) and `wu-w0-b001-src-i0002` (`04_workforce-transition`).
- Economic result hash `0e8a527ddf3a64de31afa896148314c7e0d03e64d0112993ab577b8b9a20a151`, ledger hash `e130c1057882730838aed74265dd53c6497ad5a31b8f24cd2b95e35173c18848`; workforce result hash `d456bc8b28d31483292466a984b14db42fe81e661a7234ad3c5546c551c5d7e6`, ledger hash `7280feecb5cea44b1b30e5b004caf5198cf1458dc84ca95fefddb80ecebeb9dd`.
- Real sources were the European Commission/Council AI Act impact assessment substrate for economic impact and the European Commission AI literacy guidance for workforce transition. Each attempt wrote a Topic-specific shared-template-complete reference, thin `source.yaml`, complete three-file cache leaf, current runtime receipt, and exact-binding result.
- Read-only baseline `inspect-wave0-output` passed before fault injection. Formal Wave0 Gate then failed only on deliberate missing `reference/README.md`, and the same formal checkpoint passed after repair.
- `case-163-wave0-verification.json` proves both canonical Topic UIDs have real submitted rows, delegated actor binding, complete cache leaves, both initial beacon hashes remain unchanged, no same-name nested bundle exists, and the formal Wave0 Gate passed. Task 7.3 is complete.

### Task 7.6 — Hint-only same-check repair complete

- `case-163-wave0-failed.json` contains one primary root: `rule_id: reference_readme_exists`, `repair_kind: agent_action`, `missing_fact: Missing file: reference/README.md`, `write_to: reference/README.md`, and the exact formal Wave0 Gate command in `rerun`.
- The Agent read that top-level hint, restored the authorized README surface, and invoked that exact same Gate. It did not inspect Engine source, infer responsibility from path shape, ask the user to run a command, or edit status/trace/ledger/index/receipt/hash authority.
- `case-163-wave0-hint-repair-proof.json` records failed-before, the complete hint, passed-after, and pass `hints: []`. This satisfies the required real canary repair loop for CHI-001/CHI-003/GSK-002/GSK-004/GSK-011.

### Task 7.4 — Real Wave1 canary complete

- Continued the same final bundle through formal Wave0 handoff/status, opened Wave1 b001 with existing `open-batch --reason rerun_added_topics`, and submitted three real Agent attempts through production dry-submit/formal submit.
- Initial economic: `wu-w1-b001-deep-i0001`, result hash `8b181cd19b0d95cd8ef7c69bc926c78c013842118ad99e8bf07f7c24fa413707`, ledger hash `f0d1a3cad20e6511c2991cb9f688da0715b03109618af186c30f4d561ed678e6`; fresh current EC AI Act framework source.
- Initial workforce: `wu-w1-b001-deep-i0002`, result hash `53250a57183abdd9c329559d5647646ff9e7b0ea621dc3f5fa89a55098686268`, ledger hash `a21f26573647bcf2cb3284d95d7905e6405a2a7eaf078131d7eb89850cdbca6d`; fresh NIST AI RMF 1.0 source.
- Economic supplement: `wu-w1-b001-deep-i0003`, result hash `b555c73b81c828f435c519b79cb4a3da6d35ca675e977e93ac6bc19036faabf1`, ledger hash `c3a2a80ed2a9d7917b242c9fed5e57b7d668c7dd90a85024bc9eb013059ce34c`; fresh EC simplification/timing source. Its accepted `source_claims[].source_ref` is the exact task-authorized prior `artifacts/wave1/03_economic-impact/evidence-summary.md`; that prior file was neither redeclared nor overwritten.
- Phase Agent materialized three complete references from submitted source claims through retained staging plus `operate-artifact-persistence persist --expect-absent`; all three persistence verdicts were `committed`. It then updated the accepted eight-column index, wrote minimal submitted-row-derived depth reviews, and replaced new Topic Wave0/Wave1 seed tokens with concrete consumer navigation.
- Read-only Wave1 inspect passed after adding only the two hinted missing Wave0 navigation rows. The formal Gate then exposed one exact `wave1_completion` Engine-operation hint; after the Phase Agent executed that operation and reran the same Gate, `case-163-wave1-pre-fault.json` passed with no failed rules or hints.
- `case-163-wave1-verification.json` proves all three real submits, exact prior-output lineage, no prior-output redeclaration, committed reference presence, minimal depth-review shape without copied ledger/cache/source arrays, unchanged historical reference hashes, and unchanged Wave1 beacons. Task 7.4 is complete.

### Task 8.1 — Anti-fabrication wording and hygiene

- Re-read the active Wave0/Wave1 producer guidance, shared subagent protocol, command index, provenance forensics guide, recovery guidance, and case-163 proof contract against DEW-005/WPG-001/WPG-008/RWP-014.
- The active surfaces explicitly reject filesystem-only/direct-artifact recognition, retrospective or post-hoc receipt/result/provenance, immutable beacon edits, hand-written ledger/index/status/hash/trace authority, and reconstruction facts as delegated coverage.
- The same guidance preserves the legal normal path (`claim -> actor output/cache/receipt/result -> dry-submit -> formal submit`) and the narrow already-submitted `recover-declaration` operation; it does not turn anti-fabrication wording into a blocker for those accepted paths.
- Exact verification: `node --test tests/integration/md/retired-content-heuristic-hygiene.test.mjs tests/integration/md/rerun-wave0-normal-producer-guidance.test.mjs tests/integration/md/work-unit-declaration-recovery-guidance.test.mjs tests/integration/md/supplementary-source-lineage-guidance.test.mjs`
- Result: PASS — 9 passed, 0 failed.

### Task 8.2 — Requirement annotations and registry summaries

- Updated the stale GSK-002 registry summary from the old `check/inspect/advice` shape to the shared root-first `check/routing/inspect/advice/hints` contract with explicit repair coordinates.
- Updated GSK-003 from a hard-coded eight-wrapper count to the definition/CLI-derived current inventory of ten independent wrappers, including `rerun-ready`; added the implementation annotation to the derived bijection audit rather than duplicating it across every wrapper.
- Updated GSK-004 from the obsolete nine-CLI/check-type list to schema-parsed definitions plus definition/checker-owned structured findings, parent masking, and derived active inventory.
- Updated EEX-001 to the accepted narrow countability contract: authority-selected accepted status plus parseable source URL, with content/presentation heuristics explicitly outside numeric eligibility.
- Exact verification: `node --test tests/schema/gate-rule-audit.test.mjs tests/engine/helpers/ref-count.test.mjs`
- Result: PASS — 26 passed, 0 failed; the audit confirms ten definition/CLI pairs and no rule-count drift.

### Task 8.4 — Governance checks

- `node openspec/governance/check-project-reqs.mjs` — PASS: 530 registered IDs, 53 retired, 0 orphan, 602 occurrences in main specs/active deltas.
- `node openspec/governance/check-project-specs.mjs` — PASS: 74 main spec files, 0 violations.

### Task 8.3 — v0.28 release synchronization

- Added the v0.28 changelog entry covering normal Topic pipeline reconnection, all-Gate root-first hints, net blocking simplification, explicit supplementary submitted-output lineage, and hash-identical declaration recovery.
- Updated the `DPT_FRAMEWORK/RUN.md` banner and Current Release summary to v0.28 with the same authority/helper-oriented boundaries.
- Release wording describes shipped contracts and does not claim that historical fixture work proves real-Agent research quality or that recovery creates a second success path.
- Exact verification: `node --test tests/engine/command-contract-docs.test.mjs tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/md/gate-hint-late-controller-contract.test.mjs`
- Result: PASS — 27 passed, 0 failed; `git diff --check` clean.

### Task 7.5 — Real declaration fault and hash-identical recovery complete

- Preserved the earlier `_f` bundle as diagnostic evidence for the playbook-ordering defect; no recovery or handoff normalization was applied to that failed site.
- Corrected case-163 ordering and repeated the real continuation in clean bundle `dpt_disp_case-163_eex_real_agent_rerun_add_e`: read-only Wave1 inspect passed, Engine recorded `wave1_completion`, and the supplementary declaration row was deleted before the first formal Wave1 Gate attempt.
- The first formal Gate failed only on `wave1_work_unit_submission_presence`, returned one `engine_operation` hint with the exact absolute `recover-declaration` command, and masked depth/count/ledger/cache/output/bypass dependent symptoms. It did not emit `handoff_target_mismatch`, proving no successful Wave1 Gate/Wave2 handoff existed before fault injection.
- Pre-fault supplementary row hash: `742b7f8a3ea21def3525473dde55506d6130dbd79727ee6c56e607a9860641ec` for `wu-w1-b001-deep-i0003`.
- Executed only the hinted existing-owner recovery operation. `case-163-declaration-recovery-verification.json` proves exact raw row equality, exact ledger-record-hash equality, unchanged index/status/queue bytes, and the same formal Gate's first PASS after recovery with a Wave2 handoff.
- Reconstruction facts did not count directly: the formal Gate remained failed until the bundle ledger row was restored.
- The clean rerun also exercised normal timeout/retry authority for an unrelated slow workforce fetch: `wu-w1-b001-deep-i0002` was terminalized only after production timeout-preflight recommended `timeout`; retry `wu-w1-b001-deep-i0004` used a new nonce, fresh fetch, dry-submit, and formal submit. No retrospective provenance or late-result rebinding was used.

### Task 8.5 — Strict validation and final regression

- Full related regression command: `node --test --test-reporter=dot tests/schema/*.test.mjs tests/schema/contracts/*.test.mjs tests/engine/*.test.mjs tests/engine/helpers/*.test.mjs tests/integration/cli/check-gate-*.test.mjs tests/integration/cli/inspect-*.test.mjs tests/integration/cli/operate-queue*.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/rerun-added-topic-wave0.test.mjs tests/integration/cli/work-unit-declaration-recovery.test.mjs tests/integration/md/*.test.mjs`
- Result: PASS, exit 0.
- `openspec validate repair-rerun-added-topic-bootstrap --type change --strict --no-interactive --json` — PASS: change valid, 0 issues.
- `openspec status --change repair-rerun-added-topic-bootstrap --json` — PASS: proposal/design/specs/tasks artifacts all done under the spec-driven schema.
- `git diff --check` — PASS.

### Task 8.6 — Final structural and consistency review

- Re-read the proposal/design decisions, all 16 modified capability specs, the complete task list, and the apply diff against the Project Charter plus the simple-control/helper-oriented guidelines.
- Confirmed all nine rerun-only bugs resolve through the normal Topic producer path or its direct authorities: canonical seed, queue/work-unit claim, dry/formal submit, canonical reference binding, narrow count, submitted-row-derived depth, explicit declaration recovery, and contract-authorized supplementary lineage.
- Confirmed ten formal Gate definitions and ten independent Gate CLIs remain bijective; all three Wave inspect commands preserve root-first structured feedback and no-write/no-routing behavior.
- Static review found no retained `GATE_RULE_INVENTORY_GROUPS`, `CHECK_IMPLEMENTATION_ROUTES`, `GATE_FAILURE_ROOTS`, `gateMessagePriority`, or `prioritizeMessages`; no persistent lineage graph, shadow ledger, new Gate, controller, lifecycle, retry tree, or success authority was introduced.
- Recovery remains one operation on the existing work-unit owner, and supplementary lineage remains an in-memory projection from hash-valid submitted authority. Rerun-added Topics do not introduce a rerun-only kind, validator, Gate branch, reference namespace, or provenance path.
- Final focused review command: `node --test tests/schema/gate-rule-audit.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs tests/integration/md/case-163-rerun-canary-contract.test.mjs tests/integration/cli/work-unit-declaration-recovery.test.mjs`
- Result: PASS — 23 passed, 0 failed; `git diff --check` clean.
