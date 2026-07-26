# Apply Implementation Evidence

## Baseline

- `node openspec/governance/check-verification-routing.mjs --change converge-queue-demand-admission --mode plan` passed.
- `node --test tests/integration/cli/operate-queue.test.mjs tests/engine/work-unit-claim.test.mjs` passed: 13 tests, 0 failures.

## Existing Boundary Inventory

- Enqueue used `validateTopicSlug()` for Topic/finding and committed Topic-state checks, then the Wave1-only `validateCurrentAssignmentCard()` helper.
- Claim used the separate `topicBindingForClaim()` and `preflightClaimAssignments()` path, including canonical plan and assignment-contract resolution.
- `repairRemoveStale()` only recognized stale Topic/finding facts; its in-flight branch remains outside current admission because terminal work-unit handling owns claimed attempts.

The shared evaluator replaces the delegated portions of the enqueue and claim paths. Non-delegated queue cards retain their existing validation and completion ownership.
