## Context

Breakpoint recovery P1 records a concrete failure: a complete evidence card remained as `addendum-molex-itbrief.md.tmp...` because the process died between content write and rename. Current framework paths have no shared prepared-write contract, so a later process cannot distinguish a complete commit candidate from partial or unrelated debris.

The first draft used same-directory pending siblings, file-observability adaptation, automatic discard/quarantine variants, and diagnostic trace projection. Paired review against `guidelines/evolution-simple-reliable-control.md` and `guidelines/evolution-helper-oriented-agent.md` showed that shape was applyable but unnecessarily wide. This design removes those layers. Pending state lives only in an existing non-authoritative diagnostic area; Engine recovery performs only finalize/clean, and ordinary invalid-workspace cleanup remains an Agent mechanical action.

## Goals / Non-Goals

**Goals:**

- One two-state operation workspace contract with direct staging/target/hash/CAS facts.
- One helper and one CLI with `persist`/`sweep` operations.
- Atomic content commit and deterministic recovery after persist invocation.
- One blocker and one nearest Agent action for incomplete/conflicting workspaces.
- No change to artifact business authority or existing control transactions.

**Non-Goals:**

- No topic progress, intent materialization, post-final reentry, override, rename, actor fallback, or lifecycle mode.
- No arbitrary host-write interception or recovery before a completed staging file reaches persist.
- No automatic deletion/quarantine of invalid workspaces.
- No content-root pending files, file-observability change, trace event family, global index/journal, watcher, daemon, lease, PID inference, or lock service.
- No migration of status/queue/trace/ledger/checkpoint/profile/plan/receipt/work-unit submit writers.
- No hostile privileged-process filesystem sandbox; path checks protect selected-bundle containment and ordinary symlink/traversal mistakes.

## Decisions

### 1. Capability and ownership

Create `artifact-persistence-recovery` with prefix `ARP` and requirements `ARP-001`, `ARP-002`, `ARP-003`. Apply registers the IDs before implementation. The capability owns only content durability mechanics. Existing reference/cache/artifact/final specs continue to decide business meaning; existing control writers keep transaction ownership.

### 2. One helper and one fixed CLI

Add `DPT_FRAMEWORK/engine/helpers/artifact-persistence.mjs` and `DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs`:

```text
persist --bundle <path> --source <regular-file> --target <bundle-relative-path>
        (--expect-absent | --expect-sha256 <digest>)
sweep   --bundle <path>
```

Normal tri-state exit applies: `0` clean completion, `1` blocked/action-required, `2` invalid invocation/configuration. No `force`, `discard`, `repair-all`, or additional recovery modes.

### 3. Per-operation diagnostic workspace

Each operation uses:

```text
_diagnostics/artifact-persistence/<operation-id>/payload
_diagnostics/artifact-persistence/<operation-id>/operation.json.next
_diagnostics/artifact-persistence/<operation-id>/operation.json
```

There is no aggregate index. Directory enumeration plus canonical `operation.json` is the direct Source of Record. The sidecar is one Zod discriminated union:

- `state: preparing` records operation id, staging source, target, expected target and created time before payload copy;
- `state: prepared` preserves those fields and adds payload size/hash after payload fsync.

`operation.json.next` is only an atomic publication fragment and never grants state. Only canonical `operation.json`, validated with `.refine()` against the operation directory and payload, authorizes evaluation; only `prepared` may finalize or clean.

The recorded staging path is diagnostic retry context, not a read authority for sweep: sweep never recopies staging automatically. The sidecar contains no lifecycle, provenance, progress, or business-completion authority.

### 4. Same-device atomicity and path safety

Before preparation, the helper requires an existing real target parent and checks that the persistence workspace root and target parent have the same filesystem device. It rejects symlinks, traversal, unsafe roots, aliases, and excluded control paths. It rechecks `lstat`, containment, device, and expected target facts before sidecar publication, rename, and cleanup.

Cross-device targets block before preparation; the design does not add copy-and-swap fallback because that would weaken atomicity and add another recovery branch.

### 5. Persist sequence

1. Validate selected bundle, staging source, target parent/root, same-device condition, and initial expected target.
2. Create an exclusive operation directory and durably publish `operation.json` with `state: preparing`.
3. Copy staging bytes to `payload`, fsync, and hash the actual payload.
4. Write/fsync `operation.json.next` with `state: prepared`, rename it over `operation.json`, and fsync the operation directory.
5. Recheck path/device/CAS facts.
6. Rename `payload` to target atomically and fsync the target parent.
7. Remove the operation directory.
8. Best-effort append the structured outcome to `_logs/run.log`.

Canonical `preparing` publication is the acceptance boundary. Before it, no recoverable operation is claimed and staging remains untouched; any partial publication debris is merely a blocked diagnostic workspace. After it, sweep has durable staging/target/CAS context. The caller staging source is never deleted automatically. Initial CAS mismatch creates no workspace. Late mismatch removes only the current operation directory when safe; cleanup failure leaves it blocked for sweep.

### 6. Sweep is finalize-or-block, not a recovery controller

Sweep is invoked only when the Agent has stopped concurrent persist work for the selected bundle. It enumerates operation directories and applies this precedence:

| Order | Direct facts | Verdict |
|---|---|---|
| 1 | invalid/unsafe sidecar or valid `preparing` state | `blocked` — leave untouched |
| 2 | valid `prepared` sidecar and target already equals payload digest | `cleaned` — remove stale workspace |
| 3 | target violates expected prior condition | `blocked` — preserve both versions |
| 4 | valid `prepared` payload/hash and expected target condition satisfied | `finalized` — atomic rename and cleanup |

No automatic discard is encoded. A valid `preparing` sidecar gives the Agent direct staging/target context; invalid workspace still gives one exact directory. Agent inspects/removes that non-authoritative diagnostic directory, retries persist from retained staging, then reruns sweep. Target conflict remains a semantic decision boundary only when choosing which content should win; after that decision, mechanical cleanup/retry returns to Agent.

### 7. Structured output and logging stay projections

Define Zod schemas for persist result, sweep entry, and sweep summary. Results use `committed|finalized|cleaned|blocked`, direct reason codes, and workspace/target paths. The filesystem facts determine the verdict. The CLI calls existing `logToRun()` after evaluation; `_logs/run.log` remains best-effort post-mortem detail and no logger return contract or trace event is added.

### 8. Existing transaction owners are explicit exclusions

`canonicalizeCacheLeafPage()` participates in work-unit submit snapshot rollback. `work-unit-submit.mjs`, work-unit status/receipt/index, queue, status, ledger, trace, checkpoints, profile, and plan remain excluded. Producer guidance may use persist for completed reference/artifact/final/cache content before formal submit, but submit/gate/provenance contracts remain unchanged.

### 9. Testing without mock verdicts

Unit tests use real temp directories and injectable crash-boundary hooks in the helper. Hooks stop after payload fsync, prepared sidecar publication, target rename, or before workspace cleanup, leaving real filesystem shapes. CLI integration invokes production JSON output. Controlled E2E extends the existing reentry-debuggability family and derives PASS from real bundle bytes and trace check events; the persistence command itself does not create trace authority.

### 10. Evolution direction review

Simple Reliable Control: one direct workspace, one sidecar, one helper, one CLI, three recovery verdicts. The second pass deletes a modified capability, content-root projection, discard/quarantine branch, trace event, and writer-migration ambiguity. Quality control is now smaller than the content-writing work it protects.

Helper-Oriented Agent: Engine only validates and finalizes direct facts. Agent performs staging, ordinary diagnostic cleanup, retry, and reruns the same sweep. User involvement is limited to genuinely new content choice, irreversible overwrite preference, or permission; no ordinary command is pushed to the user.

## Risks / Trade-offs

- [Crash before persist invocation] → Staging remains outside the accepted operation contract; guidance requires prompt persist and does not overclaim interception.
- [Incomplete workspace cannot be auto-cleaned] → Block with one exact workspace path; Agent performs ordinary cleanup and retry, avoiding unsafe deletion logic.
- [Concurrent sweep sees active work] → Quiescent precondition; do not add lock/lease/PID machinery.
- [Cross-device target] → Block before preparation; do not weaken atomicity with copy fallback.
- [Directory fsync unsupported] → Return configuration error; do not silently downgrade durability.
- [Large file incurs one copy] → Accept for correctness; streaming optimization is deferred until measured.
- [Path changes between checks] → Recheck containment/device/CAS at mutation boundaries and state the non-adversarial host model.

## Migration Plan

1. Register ARP IDs and lock writer exclusions with characterization tests.
2. Implement workspace schemas/helper and focused crash/CAS tests.
3. Implement the two-operation CLI and run-log projection.
4. Update Agent-facing producer/command guidance and static contract tests.
5. Add the existing-family controlled crash case.
6. Update version/backlog and run focused/full/strict/governance validation.

Rollback removes the command/guidance. Before rollback, run sweep; any blocked workspace remains under `_diagnostics/artifact-persistence/` for Agent inspection and ordinary cleanup. Rollback never bulk-promotes it.

## Open Questions

None. The workspace location, helper/CLI names, verdict set, transaction exclusions, concurrency boundary, logging surface, and failure behavior are fixed for apply.
