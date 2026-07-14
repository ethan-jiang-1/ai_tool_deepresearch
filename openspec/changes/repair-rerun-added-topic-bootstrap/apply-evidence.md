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
