## Why

`tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs` fails before it reaches its intended contract: it still looks for `--setting-sources ''` in `run-iterative-interaction-subject.mjs`, even though commit `44bf1fe58` moved argv construction into the pure `iterative-interaction-subject-launch.mjs` owner. The dedicated launcher test passes, so the failure is a stale test ownership assertion rather than a runtime or research-access defect.

The direct sources of record are the current launcher module, its focused `case-115-subject-runner` test, and the failing integration assertion. The runner remains the source of lifecycle orchestration; the launcher remains the source of Subject CLI argv construction.

## What Changes

- Update the existing integration contract to read the pure launcher module for the `--setting-sources ''` assertion.
- Retain runner-level assertions only for runner-owned lifecycle, prompt, transcript, and process-boundary behavior.
- Add a focused assertion that prevents the launcher-argv ownership check from drifting back to the runner file.
- Do not change Subject runtime behavior, provider routing, permissions, timeouts, playbooks, framework assets, or accepted requirements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-only ownership correction with no spec-level behavior change, so `.openspec.yaml` declares `skip_specs: true`.

## Decision Boundary

The bounded reader question is: which module owns the selected Subject launcher argv? The answer stops at the pure launcher builder for argv facts and at the runner for process/lifecycle facts; it does not infer a Subject execution result, external-search capability, or new framework behavior. Moving one assertion to the owning module removes a stale duplicate ownership assumption rather than adding a controller, state, retry, or validator.

The Agent performs the mechanical test repair; `node:test` remains the deterministic verdict authority. No user decision or external capability is required, and no `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs`
- `openspec/changes/repair-iterative-subject-launcher-contract-test/verification-plan.yaml`
