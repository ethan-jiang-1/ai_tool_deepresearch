---
bug_id: BUG-159
title: advance-status must run before gate but phase instructions only document post-enter-phase ordering
severity: P3
phase: setup, seed-topics
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-159: advance-status pre-gate requirement unclear from phase instructions

## What happened

Every phase transition follows this contract:
1. Previous gate passes → `check.next` = next phase
2. `enter-phase --node <check.next>` → loads next phase Markdown
3. `advance-status --to <source_gate>` → syncs gate status window
4. Execute loaded phase → run its gate

However, step 3 (`advance-status`) must ALSO run BEFORE the new phase's gate (since the gate checks `rb_status.json#/current_gate` matches what it expects). The phase instructions document step 3 as happening after `enter-phase`, but the gate fails if step 3 hasn't happened.

## Concrete failures

In this run, the **setup-ready** gate failed on first attempt:
```
[status_current_gate] expected "setup_ready", got "hitl1_recorded"
[status_next_gate] expected "seed_topics_ready", got "setup_ready"
```

This happened because `advance-status --to setup_ready` was run during the HITL1→setup transition, but the setup gate checks for `current_gate: setup_ready`, which requires `advance-status` to have already run.

The hint system correctly identified this as `repair_kind: engine_operation` with the exact command, so repair was mechanical. But the initial phase instructions don't make explicit that advance-status is a **pre-requisite** for the gate, not just a **post-enter-phase** formality.

## Impact

This is a low-severity friction — the hint system catches it reliably and repair is one command. But it happened on 2 of 3 phase transitions (setup, seed-topics), adding 1 extra repair cycle each. For a 10-phase run, that's ~6-7 avoidable repair cycles.

## Expected behavior

Each phase's `§5 Gate Command` section should include a pre-flight checklist:
```markdown
Before running the gate, verify:
- `advance-status --to <expected_current_gate>` has been run
- `rb_status.json#/current_gate` matches the expected value
```

Or: `enter-phase` should automatically run `advance-status` as part of its handoff, since the two are always paired.

**Why:** The current design treats `advance-status` as a separate concern from `enter-phase`, but in practice they form an atomic handoff pair. Separating them creates a state where the Agent has entered a phase but the status window hasn't advanced — a state that the gate correctly rejects but the phase instructions don't warn about.

**How to apply:** Either document the pre-gate status check in each phase's §5, or merge `advance-status` into `enter-phase` as an automatic side effect.

## C3 Disposition (2026-07-30)

C3 keeps the two existing owners separate: `enter-phase` establishes the route-bound entry witness, and `advance-status` alone synchronizes the just-passed source gate. The cue-first entry presentation and each Wave `Execution Brief` now expose the exact source-gate command as a prerequisite before target work or its Gate. C3 intentionally does not merge that status mutation into phase entry.
