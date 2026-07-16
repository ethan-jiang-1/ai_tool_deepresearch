U## 1. Apply preflight and regression baselines

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change harden-repairable-checkpoints --mode plan` before any target edit; done when all eight claims validate with no routing issue.
- [x] 1.2 Add WTS-009/RWP-003 pair-fact regression cases for direct-array and `{pairs:[...]}` wrapper containers, rejected object maps/key encodings, UID and legacy current/previous-slug normalization, malformed/self/unknown/duplicate pairs, count drift, multi-topic empty-scan rejection, profile-reduced partial coverage, depth-zero semantics, and ordinary supplement; done when scan presence remains distinct from full-pair policy.
- [x] 1.3 Add RWP-012/RWP-013 `action:add` regression cases for three-topic missing pairs, full exact pairs, slug-only false coverage and Delta Synthesis; done when the weak current proxy is exposed and the expected exact result is asserted.
- [x] 1.4 Add GSK-004 regression cases for invalid queue authority, delegated/non-delegated active-front owner routing, refill-only missing-contract, `delegated_in_flight`, mixed residual precedence, future-looking residual, empty queue pass and inspect/formal-Gate parity; snapshot queue bytes before/after to prove no side effect.
- [x] 1.5 Add DEW-004/DEW-012/DEW-013 regression cases for object/string receipt detail, rejected array/number/boolean/null detail, real identity fault, receipt-vs-log guidance and Agent-owned dry-submit repair; isolate diagnostic tolerance from authority validation.

## 2. One normalized Wave2 pair fact path

- [x] 2.1 Implement WTS-009 pair container/entry normalization in the existing Wave2 finding-index helper, supporting only direct array and `{pairs:[...]}` wrapper forms; use UID or evaluator-local legacy canonical keys with current/previous layout resolution and current slugs in diagnostics, with no new persistent pair state.
- [x] 2.2 Implement WTS-009/RWP-003 prerequisite masking and general self-consistency: parent/container/entry roots first, then canonical topic count, `pair_count_expected == C(n,2)`, bounded checked count, `pair_count_checked == observed unique pairs`, and non-empty observed set for multi-topic runs; done when partial coverage can remain below expected universe without allowing skipped scan or claiming profile-depth proof.
- [x] 2.3 Implement RWP-012/RWP-013 `action:add` as a policy consumer of the shared pair result, requiring exact full canonical pairs and full counts while retaining the rerun-only Delta Synthesis rule and existing shared direction-resolver activation semantics; mask the pair implication when general normalization fails, and delete nonzero-count/slug-presence proxy verdicts without adding round-state parsing or duplicate roots.
- [x] 2.4 Update Wave2 producer guidance and shared schema examples to expose the accepted structured pair grammar, reduced/full policy boundary, exact repair coordinate and Agent-owned same-check repair; do not add a completion manifest or duplicate validator prose.

## 3. Global quiescent Wave handoff

- [x] 3.1 Implement GSK-004 as one pure direct-file `phase_queue_drained` evaluator over the existing `QueueSchema`, requiring all three live containers to be empty and returning one prerequisite root for missing/JSON/schema failure; do not call auto-create `loadQueue()` or persist defaults.
- [x] 3.2 Implement deterministic residual precedence: bounded in-flight root with `operate-work-unit inspect`; otherwise use active-front direct `targets` to select current-Wave work-unit claim or non-delegated queue claim; return `missing_contract` for refill-only state; include same-Wave checkpoint rerun and no item/id/kind/path phase inference.
- [x] 3.3 Register degradation-ineligible `phase_queue_drained` with `blocking_basis: authority_integrity` in Wave0/Wave1/Wave2 Gate definitions, shared rule dispatcher and active-rule audit inventory; done when inspect/formal Gate consume the same fact finding, fatigue cannot degrade it, and no new CLI/state/manifest is added.
- [x] 3.4 Update Wave guidance only as needed to align the Gate-readable quiescence fact and Agent responsibility; do not auto-terminalize, choose a semantic reason, or assign ordinary queue/work-unit commands to the user.

## 4. Receipt diagnostic tolerance and guidance convergence

- [x] 4.1 Modify DEW-012 runtime receipt schema so optional `detail` accepts a keyed JSON object or human-readable string while JSONL, event, work/queue/kind/nonce, actor version/class and other detail shapes remain fail closed; submit/inspect/timeout-preflight must share this schema result and ignore detail for authority.
- [x] 4.2 Extend DEW-013 dry-submit/formal-submit coverage for string/object parity, true binding conflict rejection, exact receipt-line repair coordinates, prerequisite masking and dry-submit no-side-effects; do not add a normalization event or rewrite detail.
- [x] 4.3 Update DEW-004 generated `task.md`, spawn prompt, shared Sub-agent protocol and every active work-unit role spec so lifecycle JSONL appends to assigned `runtime-receipt.jsonl` and `log-event.mjs` is optional diagnostic mirroring only; remove contradictory log-as-receipt wording without copying or expanding unrelated Python-fallback guidance.
- [x] 4.4 Verify helper responsibility in guidance: Phase Agent reads violations, repairs the same candidate/receipt and reruns dry-submit/formal submit; only semantic/risk/permission/external/missing-contract boundaries may reach the user.

## 5. Focused and framework verification

- [x] 5.1 Run every unit claim in `verification-plan.yaml` plus `tests/engine/helpers/checkpoint-manifest.test.mjs`; done when direct authority, masking, compatibility and no-side-effect cases pass.
- [x] 5.2 Run every integration claim plus all affected Wave0/Wave1/Wave2 Gate/inspect and work-unit CLI suites; done when ordinary reduced coverage, `action:add` exact coverage, queue quiescence and object/string receipt paths match the spec.
- [x] 5.3 Run `tests/integration/cli/check-reentry.test.mjs` and `tests/integration/cli/audit-phase-status.test.mjs`; done when queue Gate hardening does not change reentry/status authority.
- [x] 5.4 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`, `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`, active gate rule audit and relevant static regression tests; done when no unknown rule, role-guidance drift, duplicate validator or retired surface remains.
- [x] 5.5 Run `node openspec/governance/check-verification-routing.mjs --change harden-repairable-checkpoints --mode assets`; done when every proof asset exists at its canonical route.

## 6. Versioning and lifecycle closeout

- [x] 6.1 Update `CHANGELOG.md` with v0.31 summarizing normalized Wave2 pair facts with scoped `action:add` strictness, global queue quiescence and diagnostic receipt tolerance; do not claim universal full-pair policy, new manifest/controller or automatic repair.
- [x] 6.2 Update `DPT_FRAMEWORK/RUN.md` version banner to v0.31 and keep it aligned with the latest changelog entry; run version-management tests.
- [x] 6.3 Run `openspec validate harden-repairable-checkpoints --strict`; done when proposal, design, all four delta specs and tasks validate.
- [x] 6.4 Run `node openspec/governance/check-project-reqs.mjs`; done only with 0 duplicate, orphan, unregistered and reused-retired requirements.
- [x] 6.5 Run `node openspec/governance/check-project-specs.mjs`; done only with 0 deltaHeaderInMain, missingPurpose, missingRequirements and missingReqHeader violations.
