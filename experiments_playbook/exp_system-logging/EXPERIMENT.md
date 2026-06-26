# exp_system-logging

## Mechanism

Unified logging envelope, `bundle` propagation, `inspect-bundle --timeline` cross-sink stitching, engine logger activation (LOC-006 closed set).

## Hypothesis

After system-logging implementation:
1. All log lines conform to `[ISO8601] LEVEL msg bundle=<name> {detail}`.
2. All trace entries carry a `bundle` field matching `rb_status.json`.
3. `inspect-bundle --timeline` stitches all sinks with a single regex.
4. Engine closed-set events produce both log and trace.

## Case Groups

Group 7 — system-logging:

| Case | Cost | Goal |
|------|------|------|
| case-71 | light | writeGateAttempt + log-event.mjs + logToRun → unified envelope, bundle consistent, timeline clean |
| case-72 | heavy | queue-manager + subagent-relay closed-set log, engine+gate+agent interleave, repair trace |

## Result

- case-71: **PASS** (2026-06-26) — 10/10 checks (9 normal + 1 boundary gate). Unified envelope, bundle propagation, timeline stitching across writeGateAttempt + log-event.mjs + logToRun.
- case-72: **PASS** (2026-06-26) — 6/6 checks. Engine closed-set events in log, QM + SR + gate + Agent interleave, timeline stitches [queue]/[log]/[trace], no unparsed entries.
