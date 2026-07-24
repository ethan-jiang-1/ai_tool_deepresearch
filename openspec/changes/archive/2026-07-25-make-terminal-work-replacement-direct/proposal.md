## Why

`BUG-118` recorded a real operating failure mode but proposed the wrong repairs: rewriting `abandoned` as `timed_out`, discovering work units from the filesystem, or clearing a derived queue block.  The accepted contracts already correctly preserve terminal history, require a fresh identity for a retry, and keep normal claim dependent on a current role-specific actor observation.

What remains unnecessarily indirect is the construction of the successor demand.  After `dry-submit` returns `fail_and_replace`, the Engine already owns the terminal record and its immutable queue snapshot, yet the Phase Agent must manually re-author an equivalent task card, invent a fresh queue ID, and prove it did not silently alter topic, assignment, receipt, or delegated-role facts.  That repeats deterministic work at the wrong boundary and makes a legal successor harder to distinguish from an arbitrary new task.

This change introduces one narrow, audited transition from an eligible terminal attempt to one replacement queue demand.  It does not revive an attempt, change its terminal meaning, or assume that a replacement should be claimed or will complete.

## What Changes

- Add an Engine-owned `operate-work-unit replace` operation for a failed or abandoned, unsubmitted delegated attempt with matching terminal snapshot authority. It derives exactly one fresh replacement queue demand and reports the generated queue identity plus the correct existing Phase re-entry checkpoint.
- Preserve the semantic distinctions that matter: `timed_out` and `failed` attempts already retried for `actor_spawn_unavailable:*` retain their existing retry-demand paths; ordinary `failed` and `abandoned` attempts remain terminal historical facts; submitted attempts, existing terminal successors, invalid snapshots, and unclear lineage fail closed without mutation.
- Bind the replacement demand to its terminal parent through five required queue-item lineage fields, retain the original kind/topic/assignment/output obligation/delegated-role facts, and allocate a new work ID only through the existing role-bound `claim` operation.
- Make the existing Wave0/Wave1 candidate and phase guidance use this one replacement operation after eligible terminalization. A new or still-queued successor returns to the normal probe/claim checkpoint; an already in-flight successor returns to reconstruction and polling of its disclosed existing work ID. It does not claim by returned `queue_item_id`, alter queue order, or discover a successor from the filesystem.
- Standardize known logical results with existing CLI conventions: one parseable stdout JSON result, exit `0` for a new or idempotent legal successor, exit non-zero for a structured no-path result, diagnostic stderr only for invocation/runtime faults, and one actionable next checkpoint appropriate to the successor's actual location.
- Record one durable work-unit replacement trace event when a new successor demand is created. Idempotent and no-path results create neither a sibling demand nor a duplicate replacement event.
- Add focused deterministic regression coverage for terminal-to-replacement transitions and their rejection/no-mutation boundaries.  No real actor output, receipt, cache, or ledger artifact will be fabricated for that proof.
- Update framework release metadata to `v0.49`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegated-work-units`: terminal delegated attempts gain one explicit, fail-closed replacement-demand transition while preserving terminal and fresh-work-ID semantics.
- `agentic-queue`: a derived replacement demand gains authoritative parent-attempt lineage and is admitted atomically only when no conflicting live or submitted successor exists.
- `research-wave-phase-content`: Wave0 and Wave1 recovery guidance uses the Engine transition rather than manually reconstructing an equivalent task card after eligible terminal failure.

## Impact

- Expected implementation surfaces: `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, the work-unit lifecycle/index/envelope helpers, queue admission/schema helpers, the relevant Phase Markdown, and `DPT_FRAMEWORK/COMMANDS.md`.
- Expected tests live under `tests/engine/`, `tests/integration/cli/`, and `tests/integration/md/`; no test assets belong under `DPT_FRAMEWORK/`.
- Existing `timeout` retry, actor-spawn retry, audited `late-submit`, and framework CLI exit-code conventions remain intact. This change adds no dependencies, no user checkpoint, no watcher/retry daemon, no raw `unblock`, no ledger amendment, and no Gate/provenance degradation or bypass.
