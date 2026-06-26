# prototype-system-logging

## Mechanism

Unified logging envelope (`[ISO8601] LEVEL msg bundle=<name> {detail}`), `bundle` propagation across all 4 sinks, and `inspect-bundle --timeline` cross-sink stitching.

## Hypothesis

After system-logging implementation:
1. All log lines from `writeGateAttempt`, `log-event.mjs`, `logToRun`, `createRunLogger` conform to the unified envelope.
2. All trace JSONL entries carry a `bundle` field matching `rb_status.json`.
3. `inspect-bundle --timeline` stitches all 4 sinks with a single regex.
4. Engine closed-set events (queue-manager + subagent-relay) produce both log and trace.

## Case Groups

- **Group 7**: system-logging experiments
  - case-71: main agent + gate path (light, no subagent)
  - case-72: engine + subagent path (heavy, real subagent)

## Result

Pending execution.
