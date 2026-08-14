# C5b: Decide Retained Experiment History Policy

> Candidate change: `decide-retained-experiment-history-policy`
>
> Planned execution batch: dashboard item 15 `decide-retained-experiment-history-policy` (standalone; C1f merge gate failed)
>
> Status: standalone OpenSpec proposal complete on 2026-08-14; awaiting user `APPLY`
>
> Risk: L4

## One question

Should v1 retained experiment reports/audit events remain input to the current
Supervisor's prediction and regression-qualification decisions?

## Verified boundary

New writers emit:

- `agent-experiment-batch-report/v2`
- `agent-experiment-audit-event/v2`
- `agent-experiment-selection-observation/v2`

Readers accept v1 and v2. `readRetainedExperimentObservations()` reads reports
and audit history, turns valid v1 records into retained observations without an
execution surface, and turns malformed retained files into diagnostics rather
than launch failure.

Those records are active inputs today:

- Historical duration/cost affect forecasts.
- Source-matching v1 `PASS+CLEAN` may become `needs_qualification`.
- Normal regression refuses that candidate; explicit qualification may select
  and launch it under the fast envelope with prediction basis
  `observed_source_matching_history`.

The accepted experiment strategy spec explicitly describes this v1
qualification behavior. It is not merely a leftover parser.

## Choices

| Choice | Current Supervisor behavior | Effect |
|---|---|---|
| A. Retain as selection input | Current behavior continues | No signal cleanup in this branch, but no selection change |
| B. Diagnostic/prediction only | v1 may inform visibility or conservative forecasts, but never admission/qualification | New intermediate policy must be fully specified; avoids a v1-driven launch |
| C. Human-only / ignored (selected) | v1 reports remain readable but do not affect Supervisor predictions, qualification, or selection | Clean boundary; may reduce available forecasts and qualification candidates |

## Risk and side effects

Removing v1 input can make a previously qualifying historical case appear as
`no_retained_result` or otherwise ineligible. That can change fast regression
coverage and no-launch reasons. A malformed history must stay non-fatal unless
a deliberately new contract says otherwise; old history should not become a
launch blocker simply because it is old.

Actual repository prevalence is unknown because `.exp-bundles/` was not
authorized for inspection. The focused deterministic host-tool test constructs
one v1 report and proves the normal/qualification distinction; a proposal must
not claim that no real v1 records exist or make its policy depend on prevalence.

## Protected current behavior

- Current v2 writer and v2 matching-execution-surface admission.
- Current singleton schemas such as completion v1, health v1, run-context v1,
  and manifest marker v1. Their name alone is not evidence of a compatibility
  reader.
- Malformed-history diagnostics/no-launch safety, unless an approved proposal
  intentionally changes that separate contract.

## Proposal gate

- [x] v1 writer -> reader -> prediction/admission/selection fanout mapped.
- [x] Current v1 qualification behavior confirmed in accepted spec and tests.
- [x] User selected C: retained v1 history is human-readable/diagnostic-only and is not current Supervisor input.
- [x] Concrete retained-history inspection is not required: the policy must not depend on prevalence, and `.exp-bundles/` remains out of scope.
- [x] `decide-retained-experiment-history-policy` specifies exact selection, prediction, diagnostics, current-v2-only qualification, and no-launch behavior; its strict OpenSpec, requirement/project-spec, capability taxonomy/discovery, verification-routing, and semantic-closure plan checks pass.

## Expected verification

```bash
node --test tests/host_tools/experiment-run-strategy.test.mjs \
  tests/integration/host_tools/run-agent-experiment.test.mjs \
  tests/integration/md/agent-experiment-autorun-terminology.test.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-verification-routing.mjs \
  --change decide-retained-experiment-history-policy --mode assets
node openspec/governance/check-semantic-closure.mjs \
  --change decide-retained-experiment-history-policy --mode assets
```
