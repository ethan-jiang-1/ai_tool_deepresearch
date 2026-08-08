---
bug_id: BUG-209
title: `operate-queue check` returns `passed:false` when the queue is fully drained
severity: P3
phase: wave0
status: fixed
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-209: drained queue is reported as failed by the queue CLI

## Observation

At Wave0 closeout, after all delegated work units were submitted and the queue
had no active window, no refill pool, and no delegated in-flight work:

```
$ node .../operate-queue.mjs check <bundle>
{ "passed": false, "check": false,
  "inspect": ["active_window is empty and no delegated work units are in flight"],
  "advice": "Refill queue, add missing receipts, or record a blocker." }
```

The same state is exactly what the Wave0 gate's `phase_queue_drained` rule
requires and it **passed** the gate on the next invocation. So the CLI's
`check` semantics ("the queue must have work") contradict the gate's drain
semantics ("the queue must be empty"), and the CLI output reads as a blocker
when it is actually the required precondition.

## Why it matters

- The phase prose (`phase-wave0.md` §5) says to verify `active_window`,
  `refill_pool`, `delegated_in_flight` are all empty before the gate, but
  running the documented `operate-queue check` on that exact state returns a
  failure-shaped object.
- An Agent reading the CLI alone could conclude the phase is not ready when it
  is.

## Suggested direction

- Give `operate-queue check` a distinct `drained` verdict (or a
  `drained: true` field) when active window, refill pool, and in-flight are all
  empty, instead of `passed: false`.

## Verification

Drain a queue (submit all claimed work units), run `operate-queue check` →
`passed:false` on an empty, healthy-drain state.
