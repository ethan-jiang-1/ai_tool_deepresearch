## 1. Plan Review And Preconditions

- [x] 1.1 `openspec-feedback:plan-review` (CHF-001, CHF-002) Review the
  proposal, both delta specs, design, tasks, and verification plan before the
  first target edit. Reconfirm the user question, exact-text owner, fixed-query
  boundary, `research_access`/Gate authority, no-new-decision rule, selected-host
  rendering residual, release target, and deterministic-only proof class. Record
  every actionable finding as an ordinary unchecked task with its affected
  requirement or reader question, authoritative owner, smallest repair, and
  independently observable done condition.
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change
  legible-hitl1-capability-probe --mode plan` (VER-002, VER-003). Done only when
  the one integration claim and all four test-class declarations pass route
  validation before target surfaces are edited.
- [x] 1.3 Recheck the current `phase-hitl1.md`, `brief/hitl1.md`,
  `research-access-adapter.md`, and HITL1 Gate contract for PRP-002/HIU-002.
  Confirm that the brief remains the exact-text user-facing owner, the Phase
  remains the probe executor, profile/Gate remain the observation/verdict
  owners, and the selected host remains the native-rendering owner. Done when
  no task duplicates an owner or needs an added state/controller; amend this
  change if an authoritative boundary has drifted.

## 2. HITL1 Markdown Communication

- [x] 2.1 Implement HIU-002 in `DPT_FRAMEWORK/workflows/nodes/brief/hitl1.md`.
  Add one exact-text capability-check communication section with the approved
  Chinese pre-probe, available, and unavailable messages. The Phase renders
  the corresponding result immediately after its `research_access` observation;
  the normal silent-flow exit remains HITL1-Gate-pass-only. Preserve HITL2 as
  the next decision point, and state no host-output suppression promise. Done
  when the brief has one canonical user-facing copy source and unavailable
  preserves recorded choices without reopening HITL1.
- [x] 2.2 Implement PRP-002 in
  `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`. Require the Phase Agent
  to render the brief's notice before exactly one search with
  `site:wikipedia.org "Internet protocol suite"`, render the corresponding
  direct result after the final profile observation and before the same Gate,
  then preserve every existing returned-candidate, native-first/same-URL
  fallback, profile observation, and same-Gate rule. Done when no query history,
  new status/Gate/retry, provider selection, permission bypass, duration claim,
  early silent exit, or host renderer ownership is introduced.
- [x] 2.3 Update `CONTEXT.md` under Interaction Model for PRP-002/HIU-002. Add
  concise glossary entries for `HITL1 decision`, `research-access observation`,
  and `selected-host-native rendering`; distinguish their existing profile/Gate/
  host owners without adding an implementation detail, state, command, or new
  authority. Done when a maintainer can tell that a probe observation is neither
  a user decision, evidence, nor a permission grant, and host rendering is not
  a framework verdict.

## 3. Deterministic Verification And Release

- [x] 3.1 Extend `tests/integration/md/phase-hitl1-research-access.test.mjs`
  for PRP-002 and HIU-002. Read both Phase and exact-text brief surfaces; assert
  the fixed query, notice-before-search ordering, result-after-observation and
  before-Gate ordering, Gate-pass-only silent exit, unavailable
  no-new-decision/same-Gate boundary, and honest selected-host residual. Done
  when the test proves only the Markdown contract, does not perform network
  calls, and does not claim real-Agent or host-rendering behavior.
- [x] 3.2 Run `node --test tests/integration/md/phase-hitl1-research-access.test.mjs`
  and `node openspec/governance/check-verification-routing.mjs --change
  legible-hitl1-capability-probe --mode assets` (PRP-002, HIU-002, VER-001,
  VER-003). Record exact results. Done when the selected integration claim and
  its asset route pass without turning static text into a real host/Actor proof.
- [x] 3.3 Release the implemented framework as v0.72 by updating
  `CHANGELOG.md` and the banner/current-release summary in
  `DPT_FRAMEWORK/RUN.md` (VEM-002, VEM-003, VEM-004). Describe the bounded
  explanatory contract and its no-new-state/no-host-rendering-proof boundary.
  Done when both release surfaces use v0.72 and make the same bounded claim.

## 4. Spec Sync, Tracking, And Governance

- [x] 4.1 After focused verification passes, update BUG-187 and the C4 rows in
  `_backlog/plans/bug-187-199-systemic-remediation-plan.md` (PRP-002, HIU-002).
  Record the actual change name, static proof boundary, remaining selected-host
  observation requirement, and honest residual classification. Done when neither
  backlog surface claims that C4 suppressed host output or proved current
  real-Agent behavior.
- [x] 4.2 Use the supported OpenSpec spec-sync operation to merge the approved
  PRP-002 and HIU-002 modifications into their accepted main specs, then
  recompare the active deltas against the synced requirements. Done when each
  modified requirement occurs exactly once in its capability and the delta/main
  behavior remains coherent.
- [x] 4.3 Run `openspec validate legible-hitl1-capability-probe --strict` and
  `node openspec/governance/check-project-reqs.mjs` (PRP-002, HIU-002). Done
  only when strict validation passes and requirement governance reports 0
  duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired IDs.
- [x] 4.4 Run `node openspec/governance/check-project-specs.mjs` and
  `git diff --check` (PRP-002, HIU-002). Done only when main-spec governance
  reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0
  missingReqHeader, and the scoped diff has no whitespace error.
- [x] 4.5 `openspec-feedback:closeout-repair` (PRP-002, HIU-002) Repair C4
  lifecycle tracking after completed spec sync and governance. The authoritative
  owner is this task ledger and its passing OpenSpec/governance results; update
  only BUG-187 and the C4 status/row/checklist in the systemic plan so they say
  spec sync and governance are complete while closeout/archive and the separate
  selected-host observation remain pending. Done when neither tracking surface
  retains a pending-sync/governance claim or claims archive, host rendering, or
  real-Agent proof.

## 5. Closeout And Archive Preparation

- [x] 5.1 `openspec-feedback:closeout-review` (CHF-001, CHF-002) Review the
  change-scoped implemented diff, synced specs, release/backlog updates,
  verification evidence, and every ordinary task. Complete only with no open
  C4 finding; turn each actionable finding into an ordinary unchecked repair
  task and rerun this review after its observable done condition passes.

### 5.2 Governed archive transition

After every checkbox above is complete, invoke only
`node openspec/governance/finalize-change-archive.mjs --change
legible-hitl1-capability-probe` and use its structured result as archive
evidence. This is an operation instruction rather than a checkbox because the
governed finalizer requires every ordinary task to be complete before it can
perform the archive transition.
