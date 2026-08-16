# BUG-030: No sub-agent timeout — Phase Agent blocks indefinitely waiting for background sub-agents

**Date:** 2026-07-06
**Severity:** P0 — a single hung sub-agent halts the entire research pipeline with no recovery mechanism
**Discovered during:** kol-sdlc-deep-mining wave1 — 4 dpt-evidence-extractor sub-agents spawned in parallel; Phase Agent cannot proceed until all complete

## Symptom

Wave1 requires per-topic deepening via dpt-evidence-extractor sub-agents. With 14 topics, the Phase Agent spawns sub-agents as background tasks. The sub-agents do WebSearch + WebFetch + file writes — operations that can hang for many reasons:

- WebFetch target site is slow/unresponsive
- Model API rate limiting causes retry loops
- Sub-agent gets stuck in an infinite tool-call loop
- Sub-agent context window overflows on a large page fetch
- Network partition between agent runtime and tool servers

When any of these happens, the sub-agent never returns. The Phase Agent is blocked — it can't claim the next queue task, can't advance the phase, can't report status. The entire pipeline is dead with no visibility into why.

**This is happening right now in kol-sdlc-deep-mining wave1.** Four sub-agents were spawned. The Phase Agent is waiting. There is no timeout. There is no fallback.

## Root Cause

Three missing mechanisms:

### 1. No per-sub-agent timeout

The Agent tool accepts `timeout_ms` but this is passed through to the relay slot task card — it's not enforced by the agent runtime. A sub-agent that hangs in a tool call (e.g., `WebFetch` to a slow server) never hits any timeout.

The queue task card has `timeout_ms: 600000` (10 minutes) declared, but:
- It's in the task card JSON, not enforced by `operate-queue`
- The sub-agent runtime doesn't read it
- There's no watchdog that kills the sub-agent after the timeout

### 2. No queue-level stall detection

`operate-queue check` reports `queue_health` but doesn't detect that the current task has been `running` for longer than its declared timeout. A task stuck in `status: running` for 30 minutes looks the same as one running for 2 minutes.

### 3. No Phase Agent fallback

The Phase Agent has no instruction for "what to do when a sub-agent doesn't return." The phase instructions assume sub-agents always complete. There's no:
- Timeout detection
- Escalation path (fail the task, spawn a replacement, skip the topic)
- Visibility (the Phase Agent can't even tell if the sub-agent is making progress or dead)

## Prevention

### Short-term (instructions — give Phase Agent a timeout contract)

1. **Add to `shared-subagent-protocol.md`**: "Phase Agent SHALL set a maximum wait time of 10 minutes per sub-agent. If the sub-agent has not returned after 10 minutes, the Phase Agent SHALL: (a) log `subagent_timeout` to run.log, (b) fail the queue task, (c) spawn a replacement sub-agent with different search parameters, (d) if replacement also times out, record `silent_gap` and move to the next topic."

2. **Add to `shared-silent-execution.md`**: Timeout handling guidance — "A sub-agent timeout is a recoverable error. Do not escalate to user. Retry once with different parameters, then skip."

### Medium-term (structural — add timeout enforcement)

3. **`operate-queue` timeout detection**: `operate-queue check` should detect tasks that have been in `status: running` longer than their `timeout_ms` and flag them as `stale_running`. `operate-queue repair --timeout-stale` should fail them and generate replacement tasks.

4. **Sub-agent watchdog**: The agent runtime should enforce the `timeout_ms` from the task card. When the timeout is reached, the runtime sends an interrupt signal to the sub-agent, collects partial output, and marks the task as `timed_out`.

5. **Queue health should reflect stall**: `queue_health` should have a new value: `stalled` — distinct from `thin` or `blocked`. A queue is `stalled` when the current task has been running longer than its timeout with no progress.

### Long-term (architectural — sub-agent lifecycle management)

6. **Sub-agent heartbeat**: Sub-agents should emit periodic heartbeat events (every 30 seconds) to `_subagents/wave_NN/slot_NN/heartbeat.jsonl`. The Phase Agent or queue CLI can check heartbeats to distinguish "working slowly" from "dead."

7. **Partial result recovery**: If a sub-agent times out, any files it has already written should be preserved. The replacement sub-agent should receive the partial output and be instructed to fill gaps rather than start from scratch.

8. **Parallel-with-timeout pattern**: The Phase Agent should be able to spawn N sub-agents with a collective timeout. When the timeout fires, collect all completed results, fail the incomplete ones, and continue.

## Relationship to Other Bugs

- **BUG-025** (relay too heavyweight): The relay pipeline, if it worked, would provide slot lifecycle management including timeout detection. The relay bypass means we lost both provenance AND lifecycle management.
- **BUG-029** (no phase isolation): The Phase Agent blocks because it has no instruction for "sub-agent didn't return" — it's stuck in the assumed happy path.
- **BUG-026** (run.log empty): Sub-agent timeouts are not logged, so there's no audit trail of how many agents timed out vs succeeded.
