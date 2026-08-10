## 1. Apply Entry Review

- [x] 1.1 AGQ-022, SUD-003: `openspec-feedback:plan-review` — review the proposal, delta specs, design, semantic closure, and verification plan before the first target edit; confirm the one-profile-field boundary, no-scheduler scope, and the honest real-actor proof boundary. Done when no review finding remains, or every finding is recorded as an ordinary unchecked task with owner, smallest repair, and observable completion condition.
- [x] 1.2 AGQ-022, SUD-003: run `node openspec/governance/check-project-reqs.mjs --mode plan`, `node openspec/governance/check-verification-routing.mjs --change add-structured-delegated-concurrency-cap --mode plan`, and `node openspec/governance/check-semantic-closure.mjs --change add-structured-delegated-concurrency-cap --mode plan` before the first target edit. Done when all three commands pass and their checked artifacts still match this change.

## 2. Profile And Guidance

- [x] 2.1 AGQ-022, SUD-003: add `delegated_concurrency_cap` to `ProfileSchema` and `rb_profile.yaml.tmpl` as the only run-level control, defaulting an omitted value to `12` and rejecting non-integer or out-of-range (`1..20`) values. Done when template and legacy parsed profile expose the same effective value, with no CLI/env cap input added.
- [x] 2.2 AGQ-022: update Wave0, Wave1, Wave2, and `shared-subagent-protocol.md` to read the profile cap and use `min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)`. Done when all four surfaces retain existing queue/admission/actor/transaction authority, say fallback remains one claim, and contain no fixed default `<= 5` rule.

## 3. Deterministic Coverage

- [x] 3.1 AGQ-022, SUD-003: extend `tests/schema/contracts/profile.test.mjs` for default `12`, accepted explicit limits, and rejected decimal/zero/negative/greater-than-20 values. Done when it proves schema behavior without using a host-capacity claim.
- [x] 3.2 AGQ-022, SUD-003: extend `tests/engine/work-unit-claim.test.mjs` and `tests/engine/work-unit-actor.test.mjs` for seven eligible normal claims and unchanged `phase_agent_fallback = 1`. Done when the tests exercise production claim/actor paths and do not create an Engine cap scheduler.
- [x] 3.3 AGQ-022: update Wave0/Wave2 Markdown integration tests, add `tests/integration/md/phase-wave1-queue-loop.test.mjs`, and update shared actor guidance coverage. Done when the profile field, common formula, top-up case, fixed fallback, and no-host-proof wording are checked across all Wave/shared surfaces.

## 4. Quarantine Superseded Seven-Actor Evidence

- [x] 4.1 AGQ-022, SUD-003: move `experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md` to `experiments_playbook/exp_extrem_slow/case-221-extreme-slow-batch-subagent.md`. Done when its frontmatter case id, filename cost, and quarantine warning agree with the extreme-slow convention and no active runnable path remains.
- [x] 4.2 AGQ-022, SUD-003: remove `tests/integration/md/case-221-first-return-contract.test.mjs` and revise `verification-plan.yaml` so it removes the case-221 static claim and marks `agent_flow_e2e` `not_applicable`. Done when the plan says the remaining evidence is deterministic only and does not claim host capacity, physical concurrency, or an unavailable substitute.
- [x] 4.3 AGQ-022, SUD-003: remove case-221 from the active manifest table and add its new path to the manifest and README extreme-slow inventories. Done when Autorun and Interactive selectors cannot discover the case and the documentation gives the normal explicit-refactor-and-reregister reactivation route.

## 5. Release Surfaces

- [x] 5.1 AGQ-022, SUD-003: add a concise `v0.83` entry to `CHANGELOG.md` describing the profile-owned cap and retained Engine authority. Done when it names the structured cap and does not claim host capacity or physical concurrency.
- [x] 5.2 AGQ-022, SUD-003: update the `DEEP_RESEARCH_HARNESS/RUN.md` banner and current-release summary to `v0.83`. Done when it matches the newest CHANGELOG version and describes the same policy boundary.

## 6. Closeout

- [x] 6.1 AGQ-022, SUD-003: run every revised selected unit and integration asset from `verification-plan.yaml`, then run `node openspec/governance/check-verification-routing.mjs --change add-structured-delegated-concurrency-cap --mode assets`. Done when all selected deterministic assets pass and the asset check passes; this task does not substitute for proof of host capacity or physical concurrency.
- [x] 6.2 AGQ-022, SUD-003: synchronize the two accepted main specs from their deltas after implementation and re-read the resulting contracts against the actual diff. Done when `agent/agentic-queue` and `agent/subagent-dispatch` retain one profile Source of Record, the same formula, and unchanged Engine authority.
- [x] 6.3 AGQ-022, SUD-003: `openspec-feedback:closeout-review` — review the change-scoped actual diff, semantic closure, synced specs, and selected evidence. Done only when no finding remains and all ordinary repair tasks are complete.
- [x] 6.4 AGQ-022, SUD-003: run `node openspec/governance/check-project-reqs.mjs --mode archive --change add-structured-delegated-concurrency-cap`. Done when it passes with zero duplicate, orphan, unregistered, or reused-retired requirements.
- [x] 6.5 AGQ-022, SUD-003: run `node openspec/governance/check-project-specs.mjs`. Done when it passes with no delta header in main specs and no missing purpose, requirements, or requirement headers.
