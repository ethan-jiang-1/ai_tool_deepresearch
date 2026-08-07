## 1. Review And Baseline

- [x] 1.1 @impl AGQ-019, VER-001 openspec-feedback:plan-review: Re-read the proposal, design, current Queue-failure playbook, AGQ-019, and verification plan before target edits. Record any actionable finding as an ordinary unchecked task with its reader question, authoritative owner, smallest repair, and observable done condition.
- [x] 1.2 @impl AGQ-019, VER-001: Run `node openspec/governance/check-verification-routing.mjs --change align-queue-failure-experiment-fixture --mode plan` and `openspec validate align-queue-failure-experiment-fixture --strict`. Capture the pre-edit contradiction between `failure_creates_repair` and the current generic Queue failure result without treating that static fact as real Agent behavior.
- [x] 1.3 @impl VER-001: Complete the selected `agent_flow_e2e` claim's execution profile with its deterministic verdict judge. Done when `check-verification-routing --mode plan` accepts the plan without inferring a judge from prose or asset path.

## 2. Align The Current Playbook

- [x] 2.1 @impl AGQ-019, VER-001: In `experiments_playbook/exp_agentic-queue/case-43-standard-failure-repair.md`, replace the stale generic-repair wording and required check identifier with the current terminal/no-successor outcome. Done when the registered V2 frontmatter and Step 2.5 describe one compatible fact.
- [x] 2.2 @impl AGQ-019: Make Step 2.5 consume the Queue returned by the existing `fail()` API and assert the original failed row's `terminal_no_successor` disposition, absence of `repair-*` / `repair-repair-*` demand in every live Queue location, and promotion of the pre-existing next demand. Done when it adds no test-only Queue evaluator, manual Queue mutation, or Agent-behavior claim.
- [x] 2.3 @impl AGQ-019: Cover every actual live Queue location by scanning `active_window`, `refill_pool`, and `Object.values(delegated_in_flight)`. Done when a `repair-*` descendant cannot be missed because delegated in-flight state is object-keyed rather than array-shaped.

## 3. Verify And Record The Proof Boundary

- [x] 3.1 @impl AGQ-019, VER-001: Run the exact-case Autorun dry-run and the change-scoped verification route asset check after the target edit. Done when the case remains a valid registered `agent_flow_e2e` Markdown asset and dry-run is recorded only as selection/preflight evidence.
- [x] 3.2 @impl AGQ-019, VER-001: After the user supplies an explicit `--max-total-budget-usd` decision, run exactly `case-43-standard-failure-repair` through the normal Autorun Supervisor and retain its native PASS, FAIL, or NOT_RUN result. Done when no fixture, dry-run, console summary, or Agent narrative substitutes for the trace-bound native completion.
- [x] 3.3 @impl AGQ-019: Update the Gate Schema Phase 3 tracker with the fixture alignment and separate static delivery, deterministic Queue behavior, and real Playbook-Agent proof status. Done when it makes no real-Agent adherence claim without the retained run evidence from 3.2.

## 4. Closeout And Governance

- [x] 4.1 @impl VER-001: Run `openspec validate align-queue-failure-experiment-fixture --strict` and `node openspec/governance/check-verification-routing.mjs --change align-queue-failure-experiment-fixture --mode assets`. Done when the no-delta planning artifacts and selected asset are valid.
- [x] 4.2 @impl VER-001: Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirements.
- [x] 4.3 @impl VER-001: Run `node openspec/governance/check-project-specs.mjs`. Done when it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [x] 4.4 @impl AGQ-019, VER-001 openspec-feedback:closeout-review: Review the change-scoped target diff, actual native completion evidence, tracker update, and no-spec-delta boundary before archive. Leave any actionable finding as an ordinary unchecked task; otherwise record the review evidence and proceed only through the governed archive finalizer.
