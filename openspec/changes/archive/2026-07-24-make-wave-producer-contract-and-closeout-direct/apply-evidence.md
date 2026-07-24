# Apply Evidence

## Baseline

- `2026-07-24`: `node openspec/governance/check-verification-routing.mjs --change make-wave-producer-contract-and-closeout-direct --mode plan` passed with two selected claims.
- `2026-07-24`: `openspec validate make-wave-producer-contract-and-closeout-direct --strict` passed.

## Claim Boundaries

- `integration`: selected. Its Node test will prove only actual guidance delivery, ownership wording, and command/checklist order.
- `agent_flow_e2e`: selected. Only the new case's retained native Subject and deterministic bundle evidence may prove real Phase-Agent behavior; unavailable capability is `NOT_RUN`.
- `unit`: not applicable because this change does not change a pure JavaScript or schema contract.
- `deterministic_e2e`: not applicable because no deterministic workflow contract changes; a simulated chain cannot prove the guidance-following behavior at issue.

## Case 225 Evidence Boundary

- `2026-07-24`: `node --test tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` passed (4 tests). It proves only the case's declared boundary: setup stops before claim, the independent Subject owns the returned-work loop, the Playbook observer reads native evidence before appending case checks, and unavailable capability becomes `NOT_RUN` rather than fixture-backed behavior.
- `2026-07-24`: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md` passed.
- `2026-07-24`: `node openspec/governance/check-verification-routing.mjs --change make-wave-producer-contract-and-closeout-direct --mode assets` passed. This validates declared proof-asset routing; it is not live Agent execution evidence.

## Deterministic Regression Evidence

- `2026-07-24`: selected deterministic tests passed: `wave-producer-contract-guidance`, `case-225-returned-work-closeout-contract`, `parser-aligned-guidance`, `phase-wave0-queue-loop`, `work-unit-actor-guidance`, `work-unit-receipt-guidance`, `reference` schema, `work-unit` schema, `work-unit-projection`, `work-unit-submit`, and `operate-work-unit` CLI (`141` tests, `0` failures). This establishes deterministic contract/regression behavior only; it does not claim that Case 225 has run under a real Subject Agent.

## Case 225 Runtime Status

- `2026-07-24`: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-225-heavy-returned-work-closeout --dry-run --json` selected exactly one heavy real-Agent case and reported its required proof inputs. No explicit Headless execution budget was authorized, so no Agent, child, search/fetch, disposable run root, or native completion was started. Runtime claim status is `NOT_RUN`; this is not a native PASS/FAIL/NOT_RUN completion and does not prove Agent behavior.

## Release Projection

- `2026-07-24`: `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` were advanced from `v0.45` to `v0.46`. Their release wording is limited to actual Wave0 template delivery and visible Wave1 dry-submit/closeout flow; it makes no claim about a live Case 225 result.

## Non-Goal Review

- `2026-07-24`: reviewed the implementation diff, including the new static tests and Case 225 assets. It changes only Agent-facing Wave guidance, one experimental Subject-adapter case entry, playbook registration, tests, and release documentation. No parser/evaluator, work-unit command, Gate, lifecycle state, controller, retry tree, generic linter, filesystem scan, manual-authority route, or Wave0 Phase-owned reference producer was introduced.

## Accepted Spec Synchronization

- `2026-07-24`: synchronized only the selected delta requirements: `REF-007` in `reference-flat-format`, and `RWP-001`/`RWP-002` in `research-wave-phase-content`. Existing unrelated scenarios and requirements were retained.
- `2026-07-24`: `node openspec/governance/check-project-reqs.mjs` passed (`590` registered IDs, `0` orphan) and `node openspec/governance/check-project-specs.mjs` passed (`79` main specs, `0` violations).

## Final Deterministic Checks

- `2026-07-24`: `openspec validate make-wave-producer-contract-and-closeout-direct --strict` passed.
- `2026-07-24`: `git diff --check` passed with no whitespace errors.
