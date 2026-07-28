## 1. Contract Preparation

- [x] 1.1 Validate the existing `verification-plan.yaml` with `node openspec/governance/check-verification-routing.mjs --change make-wave1-reference-closeout-feedback-direct --mode plan` before target edits. (`RWG-017`, `RWG-021`, `RWP-015`)
- [x] 1.2 Map the current Wave1 convergence finding, inspect projector, formal Gate projector, and Phase guidance consumers; preserve their direct Sources of Record and existing candidate coordinates. (`RWG-017`, `RWG-021`, `RWP-015`)

## 2. Direct Closeout Feedback

- [x] 2.1 Make a `materialize_projection` Wave1 convergence result project one candidate-exact primary closeout finding whose existing hint coordinate identifies the canonical target and submitted backing, plus the same-check rerun. (`RWG-017`)
- [x] 2.2 Preserve `materialize_projection -> sync_reference_index -> reference_floor_deficit` as the convergence evaluator's only dependency ordering; do not add a cross-rule masking pass or assign `masked_by_rule_id` to separately evaluated legacy/index/ledger/floor findings. (`RWG-017`, `RWG-021`)
- [x] 2.3 Reuse the shared inspect and formal Gate hint projectors so both outputs expose the same candidate-exact primary materialization action and preserve separately evaluated primary hints without adding a response field, writer, or controller. (`RWG-017`, `RWG-021`)

## 3. Phase Guidance

- [x] 3.1 Tighten Wave1 post-submit guidance to consume the direct materialization hint through the existing persist -> index sync -> topic-state packet -> same inspect loop; forbid ledger/output/receipt edits and premature supplementary work. (`RWP-015`)

## 4. Focused Evidence

- [x] 4.1 Create focused `tests/engine/helpers/wave-contract-evaluators.test.mjs` coverage proving candidate-exact direct materialization feedback includes a canonical target plus submitted backing coordinates, preserves stable primary ordering, and defers only the evaluator's own index/floor outcomes. (`RWG-017`, `RWG-021`)
- [x] 4.2 Add negative coverage in `tests/engine/helpers/wave-contract-evaluators.test.mjs` proving legacy/index/ledger, invalid/missing backing, and independent queue/receipt/provenance roots remain primary, while a true post-closeout floor deficit still selects the existing supplementary route. (`RWG-017`, `RWG-021`)
- [x] 4.3 Extend temporary-bundle CLI coverage in `tests/integration/cli/check-gate-wave1-complete.test.mjs` and `tests/integration/cli/wave1-reference-convergence.test.mjs` for inspect/formal-Gate hint agreement, existing canonical materialization/index sync, same-inspect convergence, and unchanged ledger authority. (`RWG-017`, `RWG-021`)
- [x] 4.4 Add/extend Wave1 guidance contract coverage for the direct closeout loop and absence of raw authority edits or a second controller. (`RWP-015`)

## 5. Release And Verification

- [x] 5.1 Update `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` version banner for `v0.60`. (`RWG-017`, `RWG-021`, `RWP-015`)
- [x] 5.2 Run the verification-routing asset check and every selected unit/integration claim from `verification-plan.yaml`.
- [x] 5.3 Run `openspec validate make-wave1-reference-closeout-feedback-direct --strict` with zero violations.
- [x] 5.4 Run `node openspec/governance/check-project-reqs.mjs` with 0 duplicate, orphan, unregistered, or reused-retired requirement IDs.
- [x] 5.5 Run `node openspec/governance/check-project-specs.mjs` with 0 delta-header, purpose, requirement, or requirement-header violations.
