## 1. Apply Readiness

- [x] 1.0 openspec-feedback:plan-review — reviewed the retained case-406 report/bundle, EXR-006, EXO-002, proposal, design, and verification plan before the first target edit; the existing 1.1 test-scope finding remains pending as ordinary work.
- [x] 1.1 EXR-006, EXO-002 plan-review finding — the case contract test now proves the case-specific synthetic-trace absence and Light health scope at the case-406 runner/playbook seam; it failed before the repair on the Heavy policy and synthetic trace, then passed after the local runner scaffold implemented the option.
- [x] 1.2 VER-006: created and validated `verification-plan.yaml` with separate integration and `agent_flow_e2e` claims before target edits (`Verification routing plan valid`).

## 2. Case-406 Fixture Repair

- [x] 2.1 EXR-006, EXO-002: extended the case-406 integration test with red-capable assertions for `health_profile: light`, no fixture-authored Wave0 handoff/completion trace, no monitor artifact, and clean Light health on a test-owned submitted envelope; observed the pre-fix failure on the Heavy policy and synthetic trace.
- [x] 2.2 EXR-006: passed the existing `syntheticWave0Trace` option from real-subagent case metadata and set it to `false` only for case-406, preserving the default for other real-subagent fixtures.
- [x] 2.2a EXR-006 apply finding — extended the local Wave0 scaffold with the existing default-on opt-out; the case-406 integration test proves no synthetic Wave0 trace while case-604 retains the default trace.
- [x] 2.3 EXO-002, PLR-003: set case-406's frontmatter health policy to `light` and stated the early-boundary health rationale without changing its native required checks or Wave0 non-goal.

## 3. Verification And Requalification

- [x] 3.1 EXR-006, EXO-002: ran the focused integration regression plus shared helper coverage (`7/7` pass) and canonical `validate-playbook` for case-406 (`1 passed, 0 failed`).
- [x] 3.2 VER-006: ran verification-routing asset validation after the target files existed (`2 claims` valid).
- [x] 3.3 EXR-006, EXO-002: ran the fresh profile-driven `300000` ms / `$1.35` discovery preflight; it selected case-41, case-106, case-74, and case-301, while retained case-406 (`424247` ms / `$1.246793`) was omitted as `predicted_duration_exceeds_bound`, so no forced or unrelated Headless run occurred.
- [x] 3.4 EXR-006, EXO-002: recorded the retained `PASS + ISSUES` diagnosis, static evidence, and the profile-selected requalification boundary in the progressive-run plan without claiming fixture proof as Subject-Agent behavior.

## 4. Closeout

- [x] 4.1 VER-006: ran `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-agent-behavior-case-406-fixture --mode assets`; both claims are valid.
- [x] 4.2 EXR-006: ran `node openspec/governance/check-project-reqs.mjs`; 616 registered IDs, 53 retired, and zero duplicate, orphan, unregistered, or reused-retired findings.
- [x] 4.3 EXR-006: ran `node openspec/governance/check-project-specs.mjs`; 82 main spec files and zero delta-header, purpose, requirement, or req-header findings.
- [x] 4.4 openspec-feedback:closeout-review — reviewed the change-scoped source diff, retained report `642f2e58-60be-40b7-b4ef-377d585284d2`, static regression/validation/governance evidence, and archive wording; no open finding remains. The residual boundary is explicit: the repaired case has not received a fresh profile-selected real-Sub-agent requalification.
