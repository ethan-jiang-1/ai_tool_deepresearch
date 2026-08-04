# BUG-196: work_done receipt event does not transition work unit status from "claimed"

**Status**: closed — current-head no-reproduction; reopen only with a retained current `return_to_actor` after `work_done`
**Severity**: P1 — causes dry-submit to return return_to_actor even after sub-agent completion
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave1 execution

## Symptom

After a dpt-evidence-extractor sub-agent completes all work (writes output files, cache trails, result.json, and emits `work_done` to runtime-receipt.jsonl), the work unit status remains `claimed`. Subsequent `dry-submit` returns `recommended_action: return_to_actor` because the Engine sees the status as still in-progress.

Only after the sub-agent process fully terminates (background task notification arrives) does the status become eligible for dry-submit — but even then, it transitions to `fail_and_replace` rather than accepting the result.

## Root cause

The Engine does not treat `work_done` receipt events as status transitions. The work unit _status.json stays at `claimed` until a successful formal submit. The `return_to_actor` recommendation in dry-submit checks status and receipt independently — if status is `claimed`, it assumes the actor is still working, even when `work_done` is present in the receipt.

## Impact

- Phase Agent cannot distinguish "sub-agent still working" from "sub-agent finished but Engine hasn't noticed"
- Wastes polling cycles waiting for a status transition that never comes
- Forces Phase Agent to repeatedly retry dry-submit until background task notification arrives
- After notification, the failure mode changes from `return_to_actor` to `fail_and_replace` (different root cause), creating confusion about what actually failed

## Expected behavior

- `work_done` receipt event should transition status to `work_done` or at least make dry-submit treat the attempt as ready-for-review
- `return_to_actor` should only appear when `work_done` is absent from the receipt AND status is `claimed`
- If `work_done` IS present, dry-submit should proceed to content validation rather than telling Phase Agent to wait for the actor

## Current-head requalification (2026-08-05)

In the bounded real `case-164-heavy-direct-output-candidate-contract` replay,
the first distinct child emitted a real `work_done` event. The subsequent
native dry-submit did not return `return_to_actor`; it reached semantic content
validation and returned `key_findings_missing_or_empty` with
`recommended_action: fail_and_replace`. The Subject then used the legal fail
operation and a fresh primary replacement, which submitted successfully.

The reported claimed-versus-working ambiguity was therefore not reproduced on
the current head. The case also confirms that an Actor receipt and Engine
acceptance remain separate facts; no new `work_done` lifecycle status or
transition is admitted.

## Closure (2026-08-05)

The retained native `PASS` is now locatable at
`.exp-bundles/_reports/d2e8115d-8b97-4ccd-8cdb-3dc2ea101236.json`
(`sha256: fe6f9f62a709e872759d4d94a762856c0f31c504df9a5189041b11d48d9f2390`)
with completion
`.exp-bundles/runs/d2e8115d-8b97-4ccd-8cdb-3dc2ea101236/001-case-164-heavy-direct-output-candidate-contract-84c19212-e049-4fb3-8644-87b7a4a3cdda/agent-experiment-completion.json`
(`sha256: 9dfd25089683cab80524fb39e26c4551d2874bff5c84ef0f326c358603ee22dc`).
The completion's source-playbook hash equals the current playbook hash
`6f0b840aa31241f84e83bd19fa2c02e2a9bd4c925ccb40f2152d99fcf73df3c7`.
The clean bundle records a semantic-contract failure for the first work unit
and a submitted replacement rather than a terminal post-`work_done`
`return_to_actor` outcome. Focused current regressions passed 76/76. Reopen
only when retained current evidence shows the stated receipt/status boundary.
