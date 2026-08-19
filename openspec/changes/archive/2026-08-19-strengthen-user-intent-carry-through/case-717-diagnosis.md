# Case 717 Autorun Diagnosis

## Authority and preserved outcome

The retained native Autorun result is authoritative. Its outcome remains
`native_outcome: null`, `lifecycle_outcome: ERROR`, and `effective_outcome: ERROR`.
This document does not create completion, verdict, observer, or Subject
evidence that the run did not produce. No replacement execution was performed.

## Exact coordinates

- Batch report: `.exp-bundles/_reports/924de54f-23e8-4618-bb97-419c1bce47cc.json`
- Run root: `.exp-bundles/runs/924de54f-23e8-4618-bb97-419c1bce47cc/001-case-717-heavy-multi-rerun-intent-carry-through-c99e1497-086f-46dd-af69-f64348b4e98a/`
- Prompt: `.exp-bundles/_logs/924de54f-23e8-4618-bb97-419c1bce47cc/001-case-717-heavy-multi-rerun-intent-carry-through.prompt.md`
- Supervisor Agent log: `.exp-bundles/_logs/924de54f-23e8-4618-bb97-419c1bce47cc/001-case-717-heavy-multi-rerun-intent-carry-through.agent.jsonl`
- Supervisor stderr: `.exp-bundles/_logs/924de54f-23e8-4618-bb97-419c1bce47cc/001-case-717-heavy-multi-rerun-intent-carry-through.stderr.log`
- Bundle trace: `dpt_disp_case-717_iterative-interaction-717-4aef4db3_6e9831/rb_trace.jsonl`
- Subject prompt/result/transcript: `dpt_disp_case-717_iterative-interaction-717-4aef4db3_6e9831/case-717-round1-subject-{prompt,result,transcript}.json{,l}`

## Findings

1. Setup and deterministic bundle creation completed. The trace records the
   legal HITL2 boundary and normal gate/queue/work-unit activity before the
   Subject launch.
2. The authenticated `717-round1` Subject launched once and produced a
   retained result. The result records `status: failed`, `timed_out: true`,
   `signal: SIGTERM`, `completed_turns: 1`, `loaded_node:
   phases/phase-hitl2.md`, and an `error_during_execution` result event with
   `stop_reason: tool_use` and `terminal_reason: aborted_streaming`.
3. The Supervisor report records duration `874816 ms`, cost `$1.199277`, and
   the first missing completion artifact as `agent-experiment-completion.json`.
   Round 2, the unavailable marker, the observer verdict, and finalizer output
   are all absent.
4. Therefore the first defect is not a playbook/helper semantic defect. It is
   the declared Subject wall-clock timeout being reached before this unusually
   deep first rerun completed. Because a Subject result exists, converting the
   run to `NOT_RUN` or increasing the timeout retroactively would destroy the
   native proof boundary.

## Smallest proof-preserving repair

For the retained run, the only correct repair is preservation and explicit
diagnosis: keep the ERROR immutable, do not write synthetic completion or
unavailability files, do not run round 2, and do not retry automatically. A
future separately authorized execution may revise the case's declared budget
or scope, but that is a new execution decision, not a repair to this run.

## Focused observable check

The diagnosis is reproducible from the retained files: the report's
`native_completion_invalid` reason points to the missing completion file; the
Subject result exists and has `timed_out: true`/`SIGTERM`; and the run contains
no round-2 result or unavailability marker. These facts jointly force the
ERROR branch under the playbook Execution Contract.

## Proof boundary

Deterministic checks and the Supervisor report prove lifecycle mechanics only.
This run provides no real-Agent semantic carry-through proof, so task 4.3
remains open and no PASS or NOT_RUN claim is made.

## Second authorized attempt

The separately authorized follow-up used the same registered playbook once,
with a 30-minute Supervisor timeout and no retry:

- Batch report: `.exp-bundles/_reports/a169d8bf-581e-40b6-a2c8-99dad8255657.json`
- Run root: `.exp-bundles/runs/a169d8bf-581e-40b6-a2c8-99dad8255657/001-case-717-heavy-multi-rerun-intent-carry-through-92f54ef8-60a4-4a76-b337-6c6536427be4/`
- Prompt/logs: `.exp-bundles/_logs/a169d8bf-581e-40b6-a2c8-99dad8255657/`

It again ended with `native_outcome: null`, lifecycle/effective `ERROR`,
`native_completion_invalid` for the missing completion artifact, and no
round-2 or observer/finalizer output. The longer Supervisor timeout did not
change the Subject adapter's own declared 12-minute bounded launch. This is a
second immutable ERROR record, not a replacement PASS and not `NOT_RUN`.
