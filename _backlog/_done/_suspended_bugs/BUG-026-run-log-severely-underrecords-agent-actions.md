# BUG-026: run.log severely under-records Agent actions — only gate attempts and manual log-event calls appear

**Date:** 2026-07-05
**Severity:** P0 — the audit trail is the framework's memory; without it, resuming a bundle from state is impossible
**Discovered during:** kol-sdlc-deep-mining — hours of research, 139 sources, 8+ sub-agents, 4 phases executed → run.log has 11 lines

## Symptom

After a full session executing instantiation → HITL1 → setup → seed-topics → wave0 (partial), the `_logs/run.log` contains only 11 lines:

```
1. run_start (auto: instantiate-run-bundle)
2. gate_attempt fail (seed-topics-ready — handoff missing)
3. gate_attempt fail (setup-ready — schema validation)
4. gate_attempt pass (setup-ready)
5. gate_attempt pass (seed-topics-ready)
6. phase:wave0 START (manual: log-event)
7. phase:wave0 START (manual: log-event — duplicate)
8. relay_bypass_suspected (auto: gate detection)
9. gate_attempt fail (wave0-complete)
10. silent_degradation (manual: log-event)
11. (empty line)
```

**What's recorded**: Gate attempts (auto-written by gate CLIs) + 3 manual `log-event` calls.

**What's NOT recorded — the entire research arc**:

| Missing Event Type | Count in Session | Lines in run.log |
|-------------------|-----------------|------------------|
| Phase entry (`enter-phase`) | 3 (setup, seed-topics, wave0) | 0 |
| Phase start (`phase:X START`) | 4 phases | 2 (wave0 only, duplicate) |
| Phase end (`phase:X END`) | 0 of 4 completed | 0 |
| State transitions (`advance-status`) | 2 (seed_topics_ready, attempted wave0) | 0 |
| Sub-agent spawn | 8+ dpt-source-intake agents | 0 |
| Evidence collected | 139 sources across 14 topics | 0 |
| File writes | 14 source.yaml + 14 seed topic backfills | 0 |
| HITL1 decisions | profile choice, must_answer, search_preference | 0 |
| Bug discoveries | 6 bugs filed | 0 |
| Deep analysis (pre-framework) | 14 KOL files read and cross-analyzed | 0 |
| `seed_topics_completion` | CLI was run | went to rb_trace.jsonl, not run.log |

**A future Agent resuming this bundle would see**: 2 gate passes and a wave0 gate fail. It would have **zero visibility** into what evidence was collected, which sub-agents ran, what HITL1 decided, or what bugs were found. The bundle's `START_FROM_HERE.md` + `rb_status.json` + `rb_trace.jsonl` provide partial state, but the run.log — which should be the authoritative chronological audit trail — is nearly empty.

## Root Cause

`log-event.mjs` exists and works. Gate CLIs call it automatically. But everything else relies on the **Agent remembering to call it manually**. The Agent doesn't — it's focused on research execution.

The asymmetry is identical to the other bugs:

| Action | Logged automatically? | By what? |
|--------|----------------------|----------|
| Gate attempt | ✅ | Gate CLI internals |
| `instantiate-run-bundle` | ✅ | Bundle creation CLI |
| Phase start/end | ❌ | Agent must call `log-event` |
| `enter-phase` | ❌ | Agent must call `log-event` |
| `advance-status` | ❌ | Agent must call `log-event` |
| Sub-agent spawn | ❌ | Agent must call `log-event` |
| Evidence collection | ❌ | Agent must call `log-event` |
| File writes | ❌ | No mechanism |
| HITL decisions | ❌ | Agent must call `log-event` |

**Everything that matters for audit and resume relies on Agent memory and compliance.** The CLIs that the Agent MUST run (gates) log automatically. The CLIs the Agent SHOULD run (log-event) are optional and get skipped.

## Why This Is P0

`run.log` is described in the project's memory as: "one log per bundle, append-only timestamp-ordered, concurrent-write safety is critical." If it's nearly empty after a full research session, the framework cannot:

1. **Resume from state**: A future Agent has no visibility into what happened
2. **Debug failures**: No record of what was tried before a gate fail
3. **Audit provenance**: No chain linking sub-agent work to evidence files
4. **Measure progress**: No timeline of phase execution

The `rb_trace.jsonl` provides some trace events but not the full chronological narrative that `run.log` is supposed to provide.

## Prevention

### Short-term (make Phase Agent logging non-optional)

1. **`phase-*.md` §Log sections should be mandatory, not reference**: Current format: "记录命令: node ... log-event ..." — this is a reference, not an instruction. Change to: "Agent MUST run the following log commands at phase start and phase end. The phase is not complete until both are written."

2. **Add `enter-phase` auto-logging**: `enter-phase.mjs` should automatically write a `phase_entered` event to `run.log`. It already writes route-bound handoff witnesses to `rb_trace.jsonl` — the same pattern should apply to `run.log`.

3. **Add `advance-status` auto-logging**: `advance-status.mjs` should automatically write a `state_transition` event to `run.log`.

### Medium-term (structural — make key events automatic)

4. **Auto-log from CLI side effects**: Every CLI that writes to the bundle should also write to `run.log`. The list:
   - `enter-phase.mjs` → log `phase_entered`
   - `advance-status.mjs` → log `state_transition`
   - `operate-queue.mjs` → log `queue_operation`
   - `apply-research-style.mjs` → log `style_applied`
   - `log-event.mjs` → already works, just needs to be called

5. **Phase lifecycle hooks**: Add to the phase execution contract: when a phase node is loaded (via `enter-phase`), a `phase_lifecycle` event is auto-written. When the next phase is entered, the previous phase is auto-closed.

### Long-term (architectural — Agent-independent logging)

6. **Harness-level Agent action logging**: The agent runtime (Claude Code harness) could log tool calls (Agent spawn, Write, WebSearch, WebFetch) to the bundle's `run.log` automatically. This is the only way to capture events that the Agent doesn't explicitly log — because the Agent is the one doing them, and if it forgets, nothing else knows.

7. **Sub-agent lifecycle events**: When `Agent` tool spawns a sub-agent, the harness should write a `subagent_spawned` event to `run.log` with the sub-agent type, topic, and prompt summary. When the sub-agent completes, a `subagent_completed` event with result summary.

## Relationship to Other Bugs

Same root pattern as BUG-021 through BUG-025:

```
BUG-024: RUN.md entry — advisory → bypassed
BUG-023: HITL1 stop:yes — advisory → bypassed
BUG-022: progress/anti-cheating — advisory → bypassed
BUG-021: research_style_params — schema allows null → bypassed
BUG-025: relay pipeline — too heavyweight → bypassed
BUG-026: run.log logging — advisory → not done   ← THIS BUG
```

**The fix is the same across all 6 bugs**: Convert advisory Agent responsibilities into mechanical side effects of the CLIs the Agent MUST run. Gate CLIs auto-log. `enter-phase` should auto-log. `advance-status` should auto-log. The pattern is proven — just not applied consistently.
