---
title: "Gate - Wave 0 Start"
role: "start-boundary gate specification"
scope: "boundary receipt after setup_ready and before Wave 0 evidence work"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/QUEUE_CONTRACT.md"
  - "specs/gates/setup-ready.md"
writes: []
---

# Gate - Wave 0 Start

`wave0_start` is a start-boundary gate, not a `current_gate` enum value. It is enforced by `hook_setup_to_wave0_start`, a Queue-visible work unit with producer_rule=`boundary_hook`, and the Critical Checkpoint Receipt `setup_ready -> Wave 0 start`.

## Pass Surface

Before Wave 0 source intake, retrieval, fetch, reference promotion, or evidence counting can begin:

- `setup_ready` has passed through `STATUS_PATH -> Setup Ready Transition`.
- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH` exist as root control files.
- run-local `_framework` exists and is version/snapshot aligned.
- `TOPIC_ROOT`, `REFERENCE_DIR`, and `ARTIFACT_DIR` resolve to `RUN_DIR/seed_topics`, `RUN_DIR/seed_topics/_reference`, and `RUN_DIR/seed_topics/_artifacts`.
- `REFERENCE_DIR` and `ARTIFACT_DIR` navigation anchors exist.
- if `derived_topic_count > 0`, every confirmed seed topic has passed the Seed Topic Intake Standard before Wave 0 evidence work begins.
- if any confirmed seed topic still needs setup/intake repair, `seed_topic_intake_ready` remains `gap_queue_backed` and the next executable Queue work is that repair, not source intake or evidence retrieval.
- if `derived_topic_count=0`, the next executable Queue work is decomposition/intake clarification, not source intake or evidence retrieval.

Setup, decomposition, and intake repair work is the valid boundary repair path when zero-topic or intake-gap state remains. `wave0_start` blocks evidence work in that state; it does not block the repair work needed to make Wave 0 evidence work legal.

## Fail Rules

Fail if Wave 0 evidence work starts from an incomplete setup surface, from missing root control files, from a missing/misaligned framework snapshot, from missing directory anchors, or from zero-topic/intake-gap state without concrete repair work. A start-boundary failure keeps the run at setup repair or decomposition/intake repair; it does not authorize Wave 0 evidence work.
