## 1. Admission Evaluator

- [ ] 1.1 Before target edits, run `node openspec/governance/check-verification-routing.mjs --change converge-queue-demand-admission --mode plan` and record the existing enqueue/claim/repair behavior as implementation evidence; identify the removed Wave1-only enqueue helper and claim-local canonical binding path.
- [ ] 1.2 Add focused `tests/engine/helpers/queue-demand-admission.test.mjs` cases for the pure admission contract: registered-kind coverage, current UID/slug resolution, closed assignment-contract inputs, one direct rejection, and no mutation (`@impl QIV-001, DEW-004`).
- [ ] 1.3 Implement one side-effect-free queue-demand admission evaluator in the owning Engine helper seam. It SHALL return the current canonical binding and resolved assignment facts for success, use no stored enqueue verdict, and replace duplicated enqueue/claim validation (`@impl QIV-001, DEW-004`).

## 2. Existing Command Boundaries

- [ ] 2.1 Route delegated claim's planned-prefix preflight through the evaluator before any work-id, batch, queue/index, envelope or claim-success mutation; preserve all-or-nothing batch rejection and current actor-preflight ownership (`@impl DEW-003, DEW-004`).
- [ ] 2.2 Route `operate-queue enqueue` and `check` through the evaluator: enqueue returns existing structured rejection without queue writes, while check reports rejected unclaimed demand without derived health persistence or repair (`@impl QIV-001`).
- [ ] 2.3 Extend only `operate-queue repair --remove-stale` to remove evaluator-rejected `active_window`/`refill_pool` cards, report direct reasons, and fail closed when the same rejection belongs to `delegated_in_flight` (`@impl QIV-004`).
- [ ] 2.4 Add `tests/integration/cli/operate-queue-demand-admission.test.mjs` against production CLIs and temporary bundles: invalid enqueue, check no-mutation diagnosis, claim batch atomicity, unclaimed legacy repair, and in-flight fail-closed (`@impl QIV-001, QIV-004, DEW-003, DEW-004`).

## 3. Contract And Release

- [ ] 3.1 Add/update `@impl` annotations and only the affected command guidance so the legal loop remains enqueue/check/claim/repair with no queue-file edit, broad drop or new terminal operation (`@impl QIV-001, QIV-004, DEW-003, DEW-004`).
- [ ] 3.2 Update root `CHANGELOG.md` for `v0.51` and synchronize the `DPT_FRAMEWORK/RUN.md` version banner/current release metadata.
- [ ] 3.3 Run the two selected focused test assets and `node openspec/governance/check-verification-routing.mjs --change converge-queue-demand-admission --mode assets`; do not add deterministic E2E or Agent-flow automation for this pure contract.

## 4. Final Validation

- [ ] 4.1 Run `node openspec/governance/check-project-reqs.mjs` and confirm zero duplicate, orphan, unregistered and reused-retired IDs.
- [ ] 4.2 Run `node openspec/governance/check-project-specs.mjs` and confirm zero main-spec structure violations.
- [ ] 4.3 Run `openspec validate converge-queue-demand-admission --strict`, the affected main-spec validation, and `git diff --check`; sync the accepted QIV/DEW deltas only after all checks pass.
