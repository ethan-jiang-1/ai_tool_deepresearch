## Context

`fail`, `timeout`, and `abandon` already preserve different audit meanings. `timeout` and the narrowly defined actor-spawn failure route create their existing retry demand; `failed` and `abandoned` instead append a terminal-history row containing the original queue item. The current Phase guidance tells the Agent to fail an irreparable completed candidate and explicitly enqueue a fresh equivalent task. That is legal, but it makes the Agent reconstruct data that the Engine already owns: original target, kind, delegated role, Topic binding, assignment mode, output obligation, priority, and terminal lineage.

The investigation behind BUG-118 did not reproduce the reported queue dead-end. This design therefore does not repair queue health, reopen a phase, or reinterpret historic terminal status. Its concern is narrower: make one existing legal successor shape constructible from the direct authoritative facts rather than from a hand-authored approximation.

### Semantic precision

`replacement demand` is a reader-facing, non-success semantic level for the Phase Agent. It answers one bounded question: **given this terminal work ID, is there exactly one legally derivable successor demand, and what must be claimed next?** It preserves distinctions that change that answer: failed/abandoned versus timed_out/submitted, matching versus drifting terminal snapshot, absent versus already-live versus already-terminal successor, and a demand identity versus a work-unit identity. The Agent can stop at this output: it either has one concrete queue-item ID and the existing probe/claim action, or an honest no-path reason. It does not need to rebuild a task card, inspect directories, infer a work ID, or treat the view as completion authority.

## Goals / Non-Goals

**Goals:**

- Add one deterministic `operate-work-unit replace` transition from an eligible failed or abandoned attempt to one auditable queue demand.
- Derive the successor from the terminal attempt's matching immutable manifest/terminal-history queue snapshot, preserving every assignment fact except queue identity, timestamps/status, and additive replacement lineage.
- Make repeated invocation idempotently report the same still-live derived demand, while refusing an invalid, conflicting, or already-terminal successor before authority mutation.
- Keep ordinary role observation and `claim` as the only route that allocates a fresh work ID.
- Replace Phase guidance that manually recreates an equivalent task card after `fail_and_replace`.

**Non-Goals:**

- No generic recovery controller, queue-health override, `unblock`, watcher, retry daemon, direct JSON edit, or filesystem discovery protocol.
- No `abandoned -> timed_out` conversion, no expansion of audited `late-submit`, and no change to timed-out automatic retry demand.
- No new completion path, ledger mutation, cache/result/receipt creation, Gate routing/degradation change, or semantic assessment of whether work merits replacement.
- No Actor availability registry, automatic actor selection, or automatic claim.

## Decisions

### D1. One explicit `replace` operation, not a queue command or controller

`operate-work-unit replace <bundle> --work-id <terminal_id>` owns the transition because the source authority is a work-unit record plus its immutable envelope, not a mutable Phase-authored task card. It will run inside the existing work-unit transaction boundary, read the index, manifest, and queue terminal history, then call the existing queue admission helper. The result is a normal queue demand, not a work-unit, so the existing `claim` remains the only allocator of work IDs, envelopes, leases, and role-bound actor observations.

Putting this in `operate-queue` would require callers to provide or reconstruct the source snapshot. A generic `recover` controller would merge terminalization, replacement, claim, retry and Gate concerns into one stateful control plane. Both alternatives obscure the actual authority boundary.

### D2. Eligibility follows terminal meaning exactly

The operation accepts only index records whose current status is `failed` or `abandoned`, whose matching terminal-history row names the same `work_id`, and whose stored queue item hashes identically to the attempt's manifest and index snapshot binding. `timed_out` is rejected with its existing retry path as the only next action; `submitted` and `claimed` are rejected with their own current owner boundaries.

This preserves rather than launders history. `replace` creates a new demand after a terminal fact; it never mutates that fact or lets a failed/abandoned attempt enter late-submit.

### D3. The successor is deterministic, queue-native, and lineage-bound

The Engine derives a unique successor `queue_item_id` from the terminal parent work ID. Its copied queue item retains source kind, target/delegated role, priority, producer rule, payload, receipts, writes, done condition and verification. It receives only the permitted changes: `queue_item_id`, ordinary queue timestamps/status, and a lineage extension containing the parent work ID, parent queue ID, parent terminal reason/status, and the source snapshot hash.

The deterministic ID makes retrying `replace` safe. If the exact derived item is still queued or delegated in flight, the operation returns it idempotently and names the normal claim action. If it has completed or terminalized, callers must operate on that successor's terminal work ID; they cannot create a second child of the earlier parent. Any same-ID item with mismatched lineage or snapshot is a fail-closed conflict.

The queue's existing global uniqueness rule continues to prohibit an ID from appearing in multiple locations. The replacement demand is admitted through the normal enqueue path, which recomputes derived queue health instead of overriding it.

### D4. Feedback and responsibility remain narrow

The successful result contains the terminal parent ID/status, replacement queue-item ID, queue location, parent lineage facts, and one next action: perform the normal role-specific native probe and invoke existing `claim` for the recorded wave. It deliberately contains no work ID.

The Agent decides, from the existing dry-submit disposition, whether semantic content has reached the already-authorized terminal/replacement boundary and runs ordinary mechanical commands. The Engine validates eligibility, creates the queue demand, and reports its deterministic result. No user decision, HITL status, or external permission is created by the operation.

### D5. Net control-surface simplification

| Surface | Added or changed | Complexity removed or avoided |
| --- | --- | --- |
| `replace` CLI/Engine transition | One source-bound demand derivation | Manual equivalent-card authoring, invented successor identity, and filesystem work-ID discovery |
| Queue-item lineage | One parent link on the ordinary queue demand | A separate recovery registry, replacement state, or mutable terminal record |
| Phase guidance | One direct operation before existing claim | A prose-only multi-step reconstruction path and misleading `abandoned -> timed_out` suggestions |
| Claim/Gate/ledger | Unchanged | Duplicate allocation, success, or bypass paths |

The operation reads direct authority, performs one legal mutation, and returns to the existing checkpoint. It adds no validator stack or hidden recovery tree.

## Risks / Trade-offs

- [A stale or tampered terminal snapshot could clone the wrong task] -> Require exact record/manifest/terminal-history hash agreement before queue mutation; return the matching authority fact on refusal.
- [Repeated replace creates duplicate work] -> Use a parent-work-ID-derived queue ID, queue-wide uniqueness, and idempotent live-successor reporting; terminal children require their own parent work ID.
- [A replacement bypasses actor availability] -> Create demand only. The next work ID still requires the current role-specific observation and normal `claim`.
- [Replacement is mistaken for late-submit or completion] -> Keep status eligibility disjoint, emit no receipt/result/ledger changes, and preserve late-submit's timed-out-only contract.
- [Guidance overstates autonomous repair] -> State the exact candidate disposition boundary and leave semantic content judgment with the Agent; unknown/conflicting authority returns an explicit no-path result.

## Migration Plan

1. Record fresh disposable-bundle baseline facts and validate the change verification plan before target edits.
2. Add red tests for successful failed/abandoned replacement, timed-out rejection, snapshot/lineage conflicts, successor idempotence, no work-ID allocation, and Phase guidance prohibition on manual reconstruction.
3. Implement the lifecycle operation, queue-lineage validation, CLI rendering, and Phase guidance; reuse existing transaction, enqueue, claim, trace and CLI output conventions.
4. Run the selected unit/integration suites and governance/OpenSpec checks, then update `CHANGELOG.md` and `RUN.md` to v0.49.

Rollback removes the `replace` command and Phase cue. Existing replacement queue demands remain ordinary valid queue items because their lineage is additive and their work-unit snapshots are self-contained; rollback must continue to read them and must not delete history, queue demand, envelopes, or ledger rows.

## Open Questions

None that block proposal. The implementation must choose the exact stable textual queue-ID encoding from the parent `work_id`, but its uniqueness and parent-derived nature are contractual; the encoding itself is an implementation detail.
