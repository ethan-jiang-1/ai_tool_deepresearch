## 1. Apply Preconditions

- [x] 1.1 `openspec-feedback:plan-review` Review PRP-002/PRP-005, REA-002/REA-003, HIU-002, this design, `semantic-closure.yaml`, and `verification-plan.yaml` before the first target edit. Confirm the sole profile writer, unchanged Gate, no-work-unit boundary, proof split, v0.84 release target, and exact UX timing. Record every actionable finding as an ordinary unchecked task naming its requirement/reader question, authoritative owner, smallest repair, and observable done condition.
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change isolate-hitl1-capability-probe --mode plan` and `node openspec/governance/check-semantic-closure.mjs --change isolate-hitl1-capability-probe --mode plan`. Done when both pass and their only selected proof classes match the plan.

## 2. HITL1 Probe Contract

- [x] 2.1 Implement PRP-002 and REA-002 in `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md`. Define the fixed query, existing bounded candidate/native-first/same-URL sequence, final `available` / `unavailable` observation branches, no bundle/filesystem/evidence authority, and no Gate or work-unit path. Done when the guide cannot instruct a probe agent to retain bytes, write profile state, fabricate access, or expand host permission.
- [x] 2.2 Implement PRP-002 and PRP-005 in `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md`. Replace direct Phase search/fetch with notice -> one probe-agent spawn -> valid return relay -> existing profile write/result/Gate; map spawn/missing/malformed return to honest unavailable. Done when `rb_profile.yaml` remains the only writer target, all current observation fields and same-Gate recovery remain intact, and no work-unit/ledger/receipt/retry state appears.
- [x] 2.3 Implement HIU-002 in `DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md`. Use the three approved Chinese messages with notice-before-spawn, result-after-observation/before-Gate, and Gate-pass-only silent exit. Done when unavailable preserves choices and each message makes no host-output, permission, duration, or Gate-success promise.
- [x] 2.4 Implement REA-002 in `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md`. Reader question: does the adapter assign the bounded probe to the isolated agent while preserving Phase ownership of spawn, profile write, and same-Gate rerun? Authoritative owner: the research-access adapter contract. Smallest repair: replace the direct-Phase executor wording with the isolated-probe boundary and retain the selected-adapter, permission, non-bypass, and host-bridge limits. Done when the adapter cannot direct Phase to search/fetch or give the probe bundle authority.

## 3. Deterministic Verification

- [x] 3.1 Add PRP-002, PRP-005, REA-002, and HIU-002 integration assertions in `tests/integration/md/phase-hitl1-research-access.test.mjs`. Check guide loading, single spawn, no Phase direct search/fetch, fixed prompt/return boundary, sole profile writer, exact copy/order, honest unavailable mapping, and unchanged Gate path. Done when the test reads only framework artifacts and makes no network or Agent-runtime claim.
- [x] 3.2 Update REA-002/REA-003 focused runner and observer tests under `tests/experiments_env/` and `tests/integration/experiments_env/`. Assert case-115 receives an isolated prompt without bundle mutation instructions and that public event/return mismatches cannot pass. Done when fixtures prove only deterministic invocation/observation mechanics.
- [x] 3.3 Update REA-002/REA-003 in `experiments_env/shared/run-iterative-interaction-subject.mjs`, `iterative-interaction-subject-launch.mjs`, and `observe-iterative-interaction-case.mjs`. Make case-115 launch/observe only the probe agent and its compact return; remove any false attribution of profile writes or Gate execution. Done when unavailable remains a valid broad canary outcome and missing/contradictory public evidence becomes NOT_RUN.
- [x] 3.4 REA-002/REA-003 closeout finding. Reader question: does the case-115 observer accept the existing legal same-URL `curl` fallback when native fetch is absent before invocation? Authoritative owner: the isolated probe's selected adapter boundary. Smallest repair: permit one exact same-URL public `curl` event after search when no native surface event exists, while retaining candidate order, public-result, and compact-return validation. Done when focused deterministic coverage accepts that branch and still rejects unbound/wrong-URL curl.

## 4. Real Probe Canary

- [x] 4.1 Update REA-003 in `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md`. Narrow the claim to a real isolated probe-agent search/fetch/return-map observation, retain non-bypass adapter setup and native completion, and remove Subject-owned bundle write/Gate assertions. Done when the playbook makes the actor, retained evidence, and NOT_RUN boundary explicit.
- [x] 4.2 With an explicitly available authenticated Subject runtime and required native tools, execute case-115 through the authorized experiment path for REA-002/REA-003. Record native PASS/FAIL/NOT_RUN truth and retain the declared evidence; do not substitute fixtures or a manually written observation. Done when `apply-evidence.md` states the exact available-path status, or honestly records NOT_RUN for unavailable/permission-denied execution.
- [x] 4.3 Recover REA-003's missing native canary evidence. Reader question: did the supervised case-115 invocation retain one matching prompt, public transcript, and final result with a reportable PASS/FAIL/NOT_RUN outcome? Authoritative owner: the Agent Experiment Autorun Supervisor's retained case report. Smallest repair: obtain the concrete retained run/report coordinate through the authorized supervisor path, then classify only its declared native evidence without scanning or fixture substitution. Done when `apply-evidence.md` names the exact native outcome and retained evidence coordinate, or the supervisor itself reports an honest NOT_RUN boundary.

## 5. Release And Specification Sync

- [x] 5.1 Release v0.84 for PRP-002, PRP-005, REA-002, REA-003, and HIU-002. Update `CHANGELOG.md` with the isolated-probe boundary and `DEEP_RESEARCH_HARNESS/RUN.md` banner/current-release summary with the same bounded claim. Done when both surfaces name v0.84 and do not claim provider availability or Engine verification of external calls.
- [x] 5.2 Sync the three approved delta specs into their accepted main specs and recompare PRP-002/PRP-005, REA-002/REA-003, and HIU-002. Done when each modified requirement remains once in its owning capability and no new requirement identity or main-spec delta header is introduced.

## 6. Verification And Governance

- [x] 6.1 Run the selected unit and integration commands from `verification-plan.yaml`, `openspec validate isolate-hitl1-capability-probe --strict`, `node openspec/governance/check-verification-routing.mjs --change isolate-hitl1-capability-probe --mode assets`, `node openspec/governance/check-semantic-closure.mjs --change isolate-hitl1-capability-probe --mode assets`, and `git diff --check`. Done when every deterministic claim passes and the report distinguishes it from the real canary result.
- [x] 6.2 Run `node openspec/governance/check-project-reqs.mjs --mode archive --change isolate-hitl1-capability-probe`. Done when it passes with 0 duplicate, orphan, unregistered, and reusedRetired IDs.
- [x] 6.3 Run `node openspec/governance/check-project-specs.mjs`. Done when it passes with 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader findings.

## 7. Closeout

- [x] 7.1 `openspec-feedback:closeout-review` Review the change-scoped implementation diff, synced main specs, v0.84 release text, semantic closure, verification plan, deterministic evidence, and real canary status. Complete only with no open finding; add each finding as an ordinary task with its owner, smallest repair, and observable done condition.
### 7.2 Governed Archive Transition

After every checkbox above is complete, invoke only
`node openspec/governance/finalize-change-archive.mjs --change
isolate-hitl1-capability-probe` and use its structured result as archive
evidence. This is an operation instruction rather than a checkbox because the
governed finalizer requires every ordinary task to be complete before it can
perform the archive transition.

## 8. Archive Repair

- [x] 8.1 Capability-discovery archive finding. Reader question: does the proposal's Capability Discovery table use the governed four-column header for this change? Authoritative owner: `openspec/governance/check-capability-discovery.mjs`. Smallest repair: align the existing table header with the checker without changing its capability decisions. Done when the finalizer's capability-discovery check passes and its rerun coordinate can proceed.
