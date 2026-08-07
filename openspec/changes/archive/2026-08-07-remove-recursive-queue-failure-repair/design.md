## Context

`QueueFailureSchema` currently permits a caller-supplied `repair` item, and
`fail()` otherwise constructs a generic `repair-*` item. The generated item is
itself an ordinary Queue demand, so a second `fail()` constructs
`repair-repair-*`. This is a queue mutation, not an Agent presentation issue.

Existing delegated terminal/replacement behavior already has separate direct
authority: work-unit index, immutable manifest snapshot, terminal history, and
the `replace` transition. The shared Wave queue-drain reader currently treats
only active/refill/in-flight containers as quiescence facts; it needs one
direct way to expose an unresolved generic Queue terminal failure instead of
letting an empty active window appear sufficient.

## Goals / Non-Goals

**Goals:**

- Make generic Queue failure finite, schema-valid, and auditable.
- Keep the failed item as durable history while exposing a truthful no-successor
  result to Queue inspect, projection, and Wave Gate consumers.
- Preserve existing delegated work-unit terminal/replacement and late-submit
  paths without a Queue-side duplicate.

**Non-Goals:**

- No generic retry/recovery controller, successor planner, watcher, direct
  queue edit, background sweep, or synthetic repair task.
- No change to semantic work selection, work-unit replacement eligibility,
  timeout retry, ledger coverage, or phase routing.
- No new Queue lifecycle status, completion authority, or user checkpoint.

## Decisions

### 1. A typed terminal disposition replaces arbitrary repair input

The Queue failure input becomes a strict object with only `queue_item_id` and
`reason`. The Queue terminal-history schema gains an optional closed
`failure_disposition` whose only new value is `terminal_no_successor`.
`QueueTerminalHistoryRecordSchema` SHALL use Zod `.superRefine()` to accept it
only for a `failed`, non-delegated Queue terminal row; old rows without the
field remain readable.

The semantic layer is intentionally narrow. Its reader is the Phase Agent or
Gate evaluator asking: “does this *generic Queue* failure have a Queue-owned
successor now?” The answer preserves the distinction between a Queue
non-delegated terminal failure and a delegated work-unit replacement. The
normal reasoning stop is a durable `terminal_no_successor` row: no caller has
to infer a repair item from a reason string, but the row does not claim that
the research is complete.

| Input / current fact | Admission | Queue mutation | Legal result |
| --- | --- | --- | --- |
| Current non-delegated front, `{ queue_item_id, reason }` | valid | append failed terminal row with `terminal_no_successor`; promote/refill only existing demands | durable no-successor root |
| Failure object with `repair` or another successor payload | reject | none | schema/invocation failure |
| Current delegated front | reject | none | existing work-unit terminal/replacement owner |
| Repeat against an item no longer at front | reject | none | current-front mismatch |
| Work-unit `failed` / `abandoned` record | outside generic Queue fail | existing work-unit transaction only | existing replacement/no-path result |

**Alternative considered:** retain `repair` but restrict its prefix or depth.
Rejected: a prefix/depth rule still treats a caller-authored task as legal
authority and leaves an arbitrary repair contract in the wrong layer.

### 2. One pure terminal-failure reader supplies every consumer

After Queue schema validation, one side-effect-free reader will select the
relevant `terminal_no_successor` terminal-history record and form the direct
root data: `queue_item_id`, terminal reason, failure disposition, and no-path
boundary. Queue inspect, projection rendering, and `phase_queue_drained` will
consume that result rather than separately scan strings or reproduce the
condition.

The queue JSON terminal row remains the Source of Record. The Markdown
projection is read-only. Formal Gate and side-effect-free inspect may attach
their own `rerun` coordinate but must retain the same root identity,
`repair_kind`, `missing_fact`, and `write_to` facts.

**Alternative considered:** add `queue_health: failed` or a persisted
`blocked_reason`. Rejected: both are derived from terminal history and would
create another authority to keep synchronized.

### 3. Queue failure never preempts unrelated work

`fail()` removes the existing generic repair factory and performs no successor
insertion. It may still run the existing promotion/refill mechanics for already
legal demands, but it cannot alter their priority, invent a replacement, or
preempt the active work. If another Queue operation needs a future successor,
it must be proposed as a separate explicit contract with its own finite
eligibility and admission proof.

This is the shortest control loop: direct terminal fact -> shared root reader
-> one legal repair or honest no-path -> rerun the same check. It deletes the
repair factory, optional arbitrary payload, and recursive successor path rather
than placing a cap on them.

### 4. Delegated replacement remains a separate authority boundary

Generic Queue fail will reject delegated demand. The current work-unit
terminal/replacement command retains its own immutable snapshots, fresh queue
identity, actor observation and new-work-ID rules. The Queue failure
disposition neither tries to construct its replacement nor interprets its
lineage.

Agent responsibility is correspondingly small: use existing legal Engine
operations when the Engine exposes them, otherwise stop at the no-path. The
Engine validates/records deterministic state and returns the root. The user
decides only new task semantics or permission questions; no human instruction
creates a hidden Queue successor.

## Risks / Trade-offs

- [Existing callers send `repair`] -> strict input rejection makes the breaking
  boundary observable before queue mutation; update supported callers and CLI
  guidance in the same apply.
- [A failed generic item becomes invisible after containers drain] -> shared
  terminal reader is consumed by queue inspect, render and phase queue drain,
  with integration coverage for both inspect and formal Gate.
- [A delegated caller uses the wrong terminal path] -> reject Queue failure
  before mutation and return the existing work-unit owner, with no fallback
  card.
- [Legacy queue JSON lacks the new field] -> optional field preserves read
  compatibility; only new generic failures write the disposition.

## Migration Plan

1. Add focused red tests for recursive repair, arbitrary repair payload,
   delegated rejection, and unchanged Queue bytes on rejected input.
2. Implement the Zod contract, generic failure transition, shared root reader,
   Queue inspect/render consumer and shared Gate consumer in one change.
3. Add CLI/integration coverage proving Queue terminal history remains durable,
   active unrelated work is not preempted, and Gate cannot pass the no-path.
4. Run the selected verification plan, release `v0.75`, then sync accepted
   specs only after the normal review/apply/archive lifecycle.

Rollback removes the new write path while retaining read compatibility for
existing `terminal_no_successor` rows; it must never delete terminal history or
recreate repair descendants.

## Open Questions

None. A future finite Queue-owned successor would be a separate change and is
not an implementation detail of this no-successor contract.
