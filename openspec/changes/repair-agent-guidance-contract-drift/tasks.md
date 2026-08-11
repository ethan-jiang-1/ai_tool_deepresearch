> Apply discipline: after each completed target-edit or verification task,
> update its checkbox and append concise, directly observed command evidence to
> that task line. A planned command is not completion evidence.

## 1. Pre-Edit Governance

- [ ] 1.1 @impl VER-002, VER-003, SEF-002, SEF-004: Before the first target edit, run `node openspec/governance/check-verification-routing.mjs --change repair-agent-guidance-contract-drift --mode plan` and `node openspec/governance/check-semantic-closure.mjs --change repair-agent-guidance-contract-drift --mode plan`. Done when both checks pass against the change-local records and no target file has been edited before that evidence.

## 2. Final-Boundary Test Ownership

- [ ] 2.1 @impl FDB-001, FDB-002: In `tests/integration/md/artifact-persistence-contract.test.mjs`, remove the `CONTEXT.md` read and only the three Final-glossary assertions, then rename the remaining release-scope subtest accurately. Done when the file no longer treats Context as a Final-backing owner, retains its Final command/terminal-boundary and release/RUN assertions, and its focused `node --test` command passes.

## 3. Bounded-Batch Guidance

- [ ] 3.1 @impl AGQ-022, RWP-015: In `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md`, add one normal-top-up mapping that names bounded top-up batch claiming, conceptual `--count <claim-count>`, accepted/default cap, and remaining free delegated in-flight capacity as the current `claim_count`, effective profile cap, and `remaining_free_capacity` facts. Done when the current formula, concrete `--count <claim_count>` command, fallback=1, reconstruction, and drain order are unchanged.
- [ ] 3.2 @impl AGQ-022, RWP-015: Apply the same local conceptual-to-concrete mapping in `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md`. Done when its Wave0 role/probe behavior, current formula/command, fallback, and gate-after-drain instruction remain unchanged and the accepted batch/cap/capacity distinctions are explicit.
- [ ] 3.3 @impl AGQ-022, RWP-015: Apply the same local conceptual-to-concrete mapping in `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md`. Done when its Wave1 role/probe, depth-review, supplementary demand, current formula/command, fallback, and gate-after-drain behavior remain unchanged and the accepted batch/cap/capacity distinctions are explicit.

## 4. Verification

- [ ] 4.1 @impl FDB-001, FDB-002, VER-001: Run `node --test tests/integration/md/artifact-persistence-contract.test.mjs`. Done when all subtests pass and the result is recorded on this task without claiming a runtime Final-delivery verdict.
- [ ] 4.2 @impl AGQ-022, RWP-015, VER-001: Run `node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs` without weakening its assertions. Done when all subtests pass, including existing timeout/progress/reference coverage, and the result is recorded on this task.
- [ ] 4.3 @impl VER-001, VER-002, VER-003: Run `npm test`, `git diff --check`, `git status --short`, `openspec validate repair-agent-guidance-contract-drift --strict`, `node openspec/governance/check-verification-routing.mjs --change repair-agent-guidance-contract-drift --mode assets`, and `node openspec/governance/check-semantic-closure.mjs --change repair-agent-guidance-contract-drift --mode assets`. Done when every command passes, the selected assets keep their valid integration route, and `git status --short` shows no generated runtime artifact.

## 5. Archive Preconditions

- [ ] 5.1 @impl RET-006: Before archive, run `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-agent-guidance-contract-drift`. Done when it exits 0 with 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirement IDs for the selected change.
- [ ] 5.2 @impl RET-006: Before archive, run `node openspec/governance/check-project-specs.mjs`. Done when it exits 0 with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
