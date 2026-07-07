# TODO: phase-recover

> 状态: 待设计 | 优先级: 低 | 更新: 2026-07-07

## Why

Long runs can lose phase identity: the Agent forgets which phase it is in, writes inconsistent `current_gate` / `next_gate`, or keeps acting from stale chat context. The recovery path should reload runtime truth from the active bundle root and help the Agent re-enter the correct phase.

## Current Direction

Recovery should be Agent-invoked and trace-informed:

- read `START_FROM_HERE.md`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, and relevant artifacts from the active bundle root
- infer the last trustworthy gate or phase checkpoint from trace
- compare that with status fields and current task card
- produce a repair instruction or ask for human help when the bundle is inconsistent

Engine may provide a deterministic helper to summarize the trace/status mismatch, but it must not become a hidden phase router.

## Design Questions

- Is recovery a prose procedure, a dedicated phase node, or a gate-like CLI?
- Should Engine persist a `last_completed_gate` cursor as audit state?
- What hard cap prevents repeated recovery loops?
- Which bundle inconsistencies require user intervention?

## Non-Goals

- Do not replace HITL decisions.
- Do not perform cross-process crash recovery here.
- Do not route phases automatically from Engine.
- Do not trust chat memory as runtime state.

## Next Step

Explore phase-recover after current work-unit, rerun, and reentry surfaces settle.
