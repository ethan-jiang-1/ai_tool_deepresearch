# BUG-196: work_done receipt event does not transition work unit status from "claimed"

**Status**: open
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
