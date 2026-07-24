## Why

`BUG-109` shows that one Wave1 prerequisite failure can expand into a large primary repair wall through masked dependent rules. `BUG-110` was a false relaxation diagnosis: its observed queue, provenance, structure, reference/backing, and depth roots are correctly fail-closed. `BUG-113` is the remaining consistency defect: Wave2 does not consume the same eligible-degradation projection, even though its current production rules and observed failures remain ineligible.

Change 2 has now made producer and submitted-backing facts direct. This change makes their Gate consumption shorter and consistent without weakening the Gate's deterministic authority.

## What Changes

- Project one existing structured Wave evaluator result into a minimal independent primary repair set. A prerequisite root masks only its downstream symptoms; independent roots remain separately visible, and full dependent detail remains durable diagnostic context.
- Move Wave0/Wave1/Wave2 degradation eligibility to one schema-parsed, metadata-backed evaluator path. Eligibility is `false` by default; queue, receipt, provenance, binding, required structure, trace, lifecycle, and other authority roots remain fail-closed.
- Preserve the current accepted Wave0/Wave1 eligible quality rules and add no active Wave2 eligible rule. One inactive, schema-valid Wave2 test fixture may exercise the positive metadata path without becoming production policy.
- Keep formal Gate and side-effect-free inspect as projections of the same evaluator facts. Neither receives a second grouping algorithm, a new verdict, automatic downgrade, partial advance, or recovery controller.
- Update framework release projection from `v0.46` to `v0.47` after implementation verification. The release describes feedback/policy projection only and does not claim a production Wave2 degradation outcome.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `gate-skeleton`: add `GSK-013` beside the existing result/finding and fatigue contracts, defining metadata-backed default-false eligibility without making hints or attempt count verdict authority.
- `research-wave-gate-implementation`: add `RWG-021` beside the existing Wave evaluator contract, defining common root-first projection and the shared fail-closed eligibility consumption path while preserving stable rule identity and submitted-backing requirements.

## Impact

- Expected implementation surfaces are the shared Wave finding/evaluator and Gate result projection, Wave0/Wave1/Wave2 adapters and definition metadata, focused root `tests/` coverage, a deterministic disposable-bundle regression, one inactive Wave2 definition fixture, and the `v0.47` release projection. No dependency is added.
- Direct Source of Record remains the schema-parsed active Gate definition plus the existing checker/evaluator findings. Formal Gate owns the durable attempt, lifecycle preflight, routing, and verdict; inspect remains side-effect-free; Markdown consumes their feedback but cannot change eligibility or hand off a phase.
- The shortest legal loop is `direct evaluator finding -> local prerequisite masking and stable root projection -> one exact legal repair coordinate -> same inspect/Gate rerun`. A repeated eligible quality-only failure may follow the existing degraded-handoff path only when every non-degradable authority fact passes. Otherwise the result is an explicit failed owner/no-path boundary.
- Net simplification replaces per-Wave eligibility sets and broad primary-hint expansion with one evaluator metadata path and local parent guards. It explicitly avoids a dependency-graph engine, a generic Gate runner, a second validator/verdict, automatic mutation/retry, durable grouping state, a controller, or a human confirmation route.
- The user decides only new semantics, risk, permission, or genuinely non-delegable external actions. The Agent executes an existing authorized repair and same-check rerun when the structured root provides one; the Engine determines findings, masking, eligibility, handoff preconditions, and verdict. `user_decision`, `external_action`, and `missing_contract` remain the smallest honest boundary and do not become a manual override path.
- Proof boundary: focused unit/integration/deterministic E2E tests prove evaluator and CLI/bundle behavior. The inactive fixture proves only the production adapter's metadata capability, not an active Wave2 rule or research quality. A real Agent Flow may observe a live Wave behavior only with native disposable-bundle evidence; static fixtures and console output cannot establish that claim.
