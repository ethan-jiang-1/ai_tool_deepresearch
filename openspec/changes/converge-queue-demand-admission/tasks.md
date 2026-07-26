## 1. Admission Evaluator

- [ ] 1.1 Before target edits, run `node openspec/governance/check-verification-routing.mjs --change converge-queue-demand-admission --mode plan` and record the existing enqueue/claim/repair behavior as implementation evidence; identify the removed Wave1-only enqueue helper and claim-local canonical binding path.
- [ ] 1.2 Add focused `tests/engine/helpers/queue-demand-admission.test.mjs` cases for the pure delegated admission evaluator: all three explicit work-unit kinds, absent/unsupported-kind rejection, supplied current Topic/finding facts, closed assignment-contract inputs, one direct rejection, non-delegated exclusion, and no mutation (`@impl QIV-001, DEW-003`).
- [ ] 1.3 Implement one side-effect-free delegated admission evaluator plus its thin current-facts adapter in one owning Engine helper module. The path SHALL return current canonical binding and resolved assignment facts for success, require an explicit supported work-unit kind, use no stored enqueue verdict, reject only delegated work-unit demand, and replace duplicated delegated enqueue/claim validation (`@impl QIV-001, DEW-003`).

## 2. Existing Command Boundaries

- [ ] 2.1 Route delegated claim's planned-prefix preflight through the evaluator before any work-id, batch, queue/index, envelope or claim-success mutation; remove its requested-phase kind fallback, preserve all-or-nothing batch rejection and current actor-preflight ownership (`@impl DEW-003`).
- [ ] 2.2 Route delegated `operate-queue enqueue` and check candidates through the evaluator: enqueue rejects before queue writes, while check reports rejected unclaimed delegated demand without admission-derived health persistence or repair; preserve non-delegated validation/completion and existing bundle-name behavior (`@impl QIV-001`).
- [ ] 2.3 Extend only `operate-queue repair --remove-stale` to remove evaluator-rejected delegated cards in `active_window`/`refill_pool`, report direct reasons, preserve non-delegated stale checks, and leave `delegated_in_flight` to its existing terminal owner (`@impl QIV-004`).
- [ ] 2.4 Add `tests/integration/cli/operate-queue-demand-admission.test.mjs` against production CLIs and temporary bundles: invalid delegated enqueue, check no-admission-mutation diagnosis, claim batch atomicity, unclaimed legacy delegated repair, and non-delegated/in-flight preservation (`@impl QIV-001, QIV-004, DEW-003`).

## 3. Contract And Release

- [ ] 3.1 Add/update `@impl` annotations on the shared evaluator and command boundaries; preserve the existing legal enqueue/check/claim/repair loop with no queue-file edit, broad drop or new terminal operation (`@impl QIV-001, QIV-004, DEW-003`).
- [ ] 3.2 Update root `CHANGELOG.md` for `v0.51` and synchronize the `DPT_FRAMEWORK/RUN.md` version banner/current release metadata.
- [ ] 3.3 Run the two selected focused test assets and `node openspec/governance/check-verification-routing.mjs --change converge-queue-demand-admission --mode assets`; do not add deterministic E2E or Agent-flow automation for this pure contract.

## 4. Final Validation

- [ ] 4.1 Run `node openspec/governance/check-project-reqs.mjs` and confirm zero duplicate, orphan, unregistered and reused-retired IDs.
- [ ] 4.2 Run `node openspec/governance/check-project-specs.mjs` and confirm zero main-spec structure violations.
- [ ] 4.3 Run `openspec validate converge-queue-demand-admission --strict`, the affected main-spec validation, and `git diff --check`; sync the accepted QIV/DEW deltas only after all checks pass.
