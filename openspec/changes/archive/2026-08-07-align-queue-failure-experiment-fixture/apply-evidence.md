# Apply Evidence: Queue Failure Experiment Fixture Alignment

## Plan Review (2026-08-07)

The review covered the active proposal, design, task ledger, verification plan,
current `case-43-standard-failure-repair` playbook, accepted AGQ-019, the
current Queue `fail()` lifecycle, and its focused deterministic regression.

The authoritative source is the current Queue lifecycle and accepted
`agent/agentic-queue` contract. The playbook's obsolete
`failure_creates_repair` required check conflicts with both: a non-delegated
generic failure appends one `terminal_no_successor` terminal row and promotes
only pre-existing lawful demand.

One actionable fixture finding was added as task 2.3: `delegated_in_flight`
is an object keyed by `queue_item_id`, not an array. The replacement check must
scan `Object.values(delegated_in_flight)` alongside the two array locations so
it cannot miss a repair-named live item. No new Queue state, evaluator,
recovery path, or Agent behavior claim is required.

The real-Agent budget boundary remains open. Static code reading and focused
Node regression are deterministic evidence only and do not complete the
selected `agent_flow_e2e` claim.

## Plan Validation Finding (2026-08-07)

The first verification-route plan check rejected the selected claim because
`execution_profile.verdict_judge` was absent. Task 1.3 owns the smallest
repair: declare the existing deterministic native-check judge explicitly.
The field is an execution-profile fact, not a new authority or test class.

After that correction, the plan review was repeated. No further actionable
finding remains before target edits. The same rerun passed:

- `node openspec/governance/check-verification-routing.mjs --change align-queue-failure-experiment-fixture --mode plan`
- `openspec validate align-queue-failure-experiment-fixture --strict`

## Fixture Alignment And Verification (2026-08-07)

The registered V2 frontmatter and Step 2.5 in
`case-43-standard-failure-repair` now use the single current check identifier
`failure_terminal_no_successor`. The case constructs a disposable Queue, calls
the existing `fail()` API, and inspects that returned Queue directly. Its check
requires the original terminal row's `failure_disposition` to be
`terminal_no_successor`, the pre-existing next demand to become the active
front, and no repair-named descendant in `active_window`, `refill_pool`, or
the object-keyed `delegated_in_flight` values.

The following static and deterministic evidence passed after the target edit:

- `node --test --test-name-pattern='terminalizes generic failure without a repair successor or preemption' tests/engine/queue-manager-window-lifecycle.test.mjs`
- `node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --case case-43-standard-failure-repair --dry-run --json`
- `node openspec/governance/check-verification-routing.mjs --change align-queue-failure-experiment-fixture --mode assets`
- `openspec validate align-queue-failure-experiment-fixture --strict`
- `node openspec/governance/check-project-reqs.mjs`
- `node openspec/governance/check-project-specs.mjs`

The focused Queue test passed. The dry-run selected exactly the registered case
and is retained only as Autorun selection/preflight evidence. It did not create
a disposable runtime bundle, execute the Markdown playbook, or produce a
trace-bound native case result.

The Phase 3 tracker now records these proof boundaries separately. Task 3.2
remains deliberately open and the real Playbook-Agent result is `NOT_RUN`:
the normal Supervisor invocation requires a user-supplied positive
`--max-total-budget-usd` decision. No static check, dry-run, console output,
or Agent narrative has been substituted for that native completion evidence.

## Native Agent-Flow Execution (2026-08-07)

After the user authorized a `$15` total cap, the normal Supervisor ran exactly:

```sh
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --case case-43-standard-failure-repair \
  --max-total-budget-usd 15
```

Batch `fd230ca9-f5aa-4300-b0f3-096b93c84e13` produced one retained Headless
case result. Its durable V2 report was parsed with
`AgentExperimentBatchReportV2Schema`, yielding `native_outcome: PASS`,
`effective_outcome: PASS`, `agent_process: completed`, `health: CLEAN`, and
`accumulated_cost_usd: 0.39890899999999996`. The report records exactly one
case and a preserved run root; no cleanup was requested.

The existing `validateNativeCompletion` operation was then invoked directly
against that exact run root. It revalidated the run context, source and
rendered playbook digests, bundle registry, and the retained trace prefix. The
completion is `PASS` with all six expected checks passing, including
`failure_terminal_no_successor`; its verdict trace is parse-valid with 21
events and a retained 3234-byte prefix. This is trace-bound native evidence,
not a console summary.

The proof profile remains `deterministic_contract` / `fixture_backed` with
`subject_execution: none`. The result therefore closes task 3.2 for the
playbook's deterministic Queue claim only. It does not establish Subject Agent
adherence or classify the broader Phase 3 H1--H4 program.

## Closeout Review (2026-08-07)

The review boundary was the active change root, the one target playbook, and
the Phase 3 tracker update. Existing worktree changes to
`tests/e2e/work-unit-attempt-recovery.test.mjs` and the separately archived
supersession fixture change were explicitly excluded from this review.

The scoped diff replaces one contradictory generic-repair assertion with the
accepted AGQ-019 terminal/no-successor outcome. The playbook, V2 required
check identifier, verification plan, focused Queue regression, and native
completion all agree on that one deterministic fact. The retained native
completion was revalidated against its context, source/rendered-playbook,
registry, and trace-prefix bindings; the tracker records its fixture-backed
proof profile without claiming Subject Agent adherence or H1--H4 resolution.

The change root declares `skip_specs: true`, contains no delta spec, and adds
no product behavior, Queue evaluator, runtime state, or second verdict path.
Final `openspec validate`, verification-routing asset validation, project
requirement/spec governance, and whitespace checks all passed. No actionable
finding remains; the next operation is the governed archive finalizer.
