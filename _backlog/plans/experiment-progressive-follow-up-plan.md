# Experiment Progressive Follow-up Intake Plan

> Status: dormant intake; no active run, budget, or retry authorization.
> Created: 2026-08-03.
>
> Predecessor: [Experiment Progressive Run Plan](../_done/_closed_plans/experiment-progressive-run-plan.md).
>
> This is planning/routing only. Current selection, runtime truth, and budget remain
> owned by a fresh profile dry-run, retained runtime evidence, and an explicit future
> authorization.

## Purpose

Keep future experiment work separate from the completed progressive-run round. This
plan records only boundaries that cannot honestly become `PASS/CLEAN` today; it does
not create a standing queue, a background scheduler, a retry policy, or permission to
consume budget.

## Deferred Boundaries

| Boundary | Current fact | Re-entry trigger | One bounded action | Terminal rule |
| --- | --- | --- | --- | --- |
| Selected-host research access | The archived launcher change requests `ENABLE_TOOL_SEARCH=true`, but the one case-115 assurance run ended `NOT_RUN`: the real host exposed `Bash`, `Edit`, and `Read`, not public `WebSearch`. | A real selected-host tool/policy change is available to inspect, and a new explicit evidence objective and envelope are approved. | Run one fresh assurance preflight and at most one selected/scoped search-required slice. Inspect native completion, health, and Subject evidence. | `PASS`, `FAIL`, `NOT_RUN`, a selection omission, or a budget boundary ends that activation. Do not retry, add a fallback provider, or treat configuration as availability proof. |
| Fresh real-actor requalification | case-211 and case-406 fixture repairs have focused static proof, but neither repair has a fresh profile-selected real-actor `PASS/CLEAN` observation. | A fresh discovery profile selects one under a newly approved duration/budget envelope. | Run only the first selected case inside that envelope, then inspect retained Subject/native/health facts. | A terminal result closes the attempt. Static proof or a manually forced historical case never substitutes for fresh evidence. |
| Profile-led diagnostic or calibration refresh | case-52 remains `PASS+ISSUES`, case-123 retains a terminal budget boundary, and case-181 has static repair without selector-authorized requalification. These are observations, not an active queue. | A new coverage or diagnostic objective has a separately approved budget. | Start with a fresh bounded profile dry-run; let it select the first legal case rather than using this historical list. | Stop after one selected slice and its review. A new root may open one focused OpenSpec change; otherwise retain the result and end the activation. |

## Activation Protocol

1. State one evidence objective and one explicit total/per-case duration and budget envelope.
2. Run the applicable profile with `--dry-run --json` and use its current selection and omission reasons as the only admission fact.
3. Launch at most one case from that selection. Do not carry forward unused budget, widen the envelope after a result, or advance to another case in the same activation.
4. Review the retained native outcome, health, audit, trace, and Subject evidence before deciding whether a concrete root exists.
5. When the root requires behavior or contract changes, create a focused OpenSpec proposal. When it does not, record the terminal result and close the activation.

## Non-Goals

- No automatic retry, provider fallback, queue rotation, or broad inventory run.
- No manual `--case` override used to bypass a current profile selection.
- No profile/SLO/timeout/budget semantic change based on one unavailable host, one budget breach, or one case-local fixture result.
- No conversion of deterministic fixture proof, configured tool names, or partial native completion into real Agent-behavior availability evidence.

## Dormant State

This plan is intentionally dormant until a trigger above is met. Each authorized
activation is self-contained and ends at its first terminal result; it does not leave
this plan running or make the completed progressive-run round active again.
