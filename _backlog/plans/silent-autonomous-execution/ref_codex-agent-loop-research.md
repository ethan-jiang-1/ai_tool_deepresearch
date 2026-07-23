---
title: Codex 2026+ first-party evidence reference
status: source_reference_only
scope: Codex agent loop, update_plan, active goals, idle continuation, compaction, and turn boundaries
retrieved: 2026-07-23
official_release_snapshot: 0.145.0
official_release_published: 2026-07-21T18:21:04Z
official_public_repo_main: 39a2438d16514d0d6f88105d17b0f747994af487
parent_context:
  - ../silent-autonomous-execution.md
  - candidate-direct-phase-entry-root-cause.md
---

# Codex 2026+ First-Party Evidence

This is a factual source reference, not a DPT design decision, causal diagnosis, or implementation proposal. It separates the normal model/tool turn, the visible plan checklist, and the separate host-owned goal continuation mechanism.

## Snapshot And Source Quality

- **Official release:** the latest public [OpenAI Codex GitHub release](https://github.com/openai/codex/releases/tag/rust-v0.145.0) was `0.145.0`, published on **2026-07-21T18:21:04Z** when retrieved.
- **Current official source snapshot:** OpenAI's public [`openai/codex`](https://github.com/openai/codex) `main` resolved to [`39a2438d16514d0d6f88105d17b0f747994af487`](https://github.com/openai/codex/commit/39a2438d16514d0d6f88105d17b0f747994af487) on **2026-07-23**. This is newer than the release and may include unreleased or feature-gated behavior.
- **Local installed CLI observation:** this machine reported `codex-cli 0.145.0` on 2026-07-23. That establishes the installed release version, not that every source-tree feature is enabled in this session.
- **Current manual limitation:** the prescribed official-manual fetch received HTTP 403 for its `HEAD` request in this environment. The behavior facts below therefore cite the current official OpenAI source tree rather than an inaccessible documentation rendering.

## Official Source Evidence

| Area | Observed current source fact | Source |
| --- | --- | --- |
| Normal agent-loop termination | The `run_turn` source documents two normal model outcomes: function calls, or an assistant message. A requested function call is executed and its result becomes the next sampling request; an assistant-only response is recorded and the turn is considered complete. | [`session/turn.rs` lines 136-148](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/session/turn.rs#L136-L148) |
| Tool-loop continuation | The turn loop continues when the sampling result says a follow-up is needed, including after tool work; otherwise it invokes stop hooks and breaks out of the turn. | [`session/turn.rs` lines 251-475](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/session/turn.rs#L251-L475) |
| Pending user input is distinct | `RegularTask` reruns `run_turn` only while the host input queue has pending input. This is host steering/input delivery, not a check of a visible plan item. | [`tasks/regular.rs` lines 75-92](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/tasks/regular.rs#L75-L92) |
| `update_plan` is a checklist/UI tool | `update_plan` parses plan items, emits a `PlanUpdate` event, and returns the fixed tool result `Plan updated`. Its handler neither evaluates unfinished plan items nor starts another turn. It is also explicitly rejected in Codex Plan mode. | [`tools/handlers/plan.rs` lines 18-105](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/tools/handlers/plan.rs#L18-L105) and [`plan_spec.rs` lines 7-57](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/tools/handlers/plan_spec.rs#L7-L57) |
| Host goal state exists separately | The public source contains a `GoalExtension` with persisted thread-goal statuses including `active`, `paused`, `blocked`, `usageLimited`, `budgetLimited`, and `complete`. This proves a separate goal mechanism exists in the current source; its enablement is checked at runtime. | [`ThreadGoalSetParams.json`](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/app-server-protocol/schema/json/v2/ThreadGoalSetParams.json) and [`ext/goal/src/runtime.rs`](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/src/runtime.rs) |
| Host idle continuation | On `on_thread_idle`, the goal extension invokes `continue_if_idle`. That routine verifies that the goal feature/tools are available, verifies a persisted `active` goal and no continuation deferral, then calls `try_start_turn_if_idle` with an injected continuation item. | [`ext/goal/src/extension.rs` lines 154-167](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/src/extension.rs#L154-L167) and [`runtime.rs` lines 359-425](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/src/runtime.rs#L359-L425) |
| Goal is not merely a todo | The injected continuation template says the goal persists across turns and explicitly says a plan update is not a substitute for doing the work. That template is paired with host idle scheduling and durable goal status, unlike `update_plan`. | [`goals/continuation.md` lines 1-51](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/templates/goals/continuation.md#L1-L51) and [`steering.rs` lines 45-77](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/src/steering.rs#L45-L77) |
| Failure prevents unbounded autonomous retries | The goal extension changes an active goal to blocked on non-retryable/exhausted turn errors and to usage-limited on usage failure, specifically to prevent automatic continuation loops. | [`ext/goal/src/extension.rs` lines 308-330](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/ext/goal/src/extension.rs#L308-L330) |
| Compaction is context management, not a scheduler | Mid-turn compaction replaces history with a summary and re-injects current initial context around the retained last user message. The source warns that long threads and multiple compactions can reduce accuracy. It does not say that compaction turns an assistant-only terminal response into continued work. | [`compact.rs` lines 57-65](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/compact.rs#L57-L65) and [lines 342-387](https://github.com/openai/codex/blob/39a2438d16514d0d6f88105d17b0f747994af487/codex-rs/core/src/compact.rs#L342-L387) |

## Local Source Verification (2026-07-23)

The local clone `/Users/bowhead/codex` (HEAD `1c928001`, 2026-07-21; `upstream` `openai/codex`) was used to verify each claim above at source level. All confirmed; official `openai/codex` links remain the citation authority.

| Claim | Local source (file:line) | Verdict |
| --- | --- | --- |
| Normal turn ends on an assistant-only message; tool calls continue the loop | `codex-rs/core/src/session/turn.rs` (doc L130-143; branch on `needs_follow_up`, break L430 / continue L432) | CONFIRM |
| `update_plan` returns fixed `"Plan updated"`, emits only a UI event, never schedules; rejected in Plan mode | `codex-rs/core/src/tools/handlers/plan.rs` (L22, L84-88, L91-95) | CONFIRM |
| Goal status enum persisted in a separate state DB | `app-server-protocol/schema/json/v2/ThreadGoalSetParams.json` (L4-13); `ext/goal/src/runtime.rs` | CONFIRM |
| Idle hook → `continue_if_idle` → availability + active-goal + no-deferral checks → `try_start_turn_if_idle` | `ext/goal/src/extension.rs` (L154-167, L308-332); `ext/goal/src/runtime.rs` (L359-426) | CONFIRM |
| Continuation template: goal persists across turns; a plan update is not the work | `ext/goal/templates/goals/continuation.md`; `ext/goal/src/steering.rs` (L45-54) | CONFIRM |
| Failure flips an active goal to `blocked`/`usageLimited` (anti-loop guard) | `ext/goal/src/extension.rs` (L314-320); `ext/goal/src/runtime.rs` (L264-271) | CONFIRM |
| Compaction manages context; does not turn a terminal response into a new turn | `codex-rs/core/src/compact.rs` (L56-86) | CONFIRM |

### Goal availability is surface-bound, not merely feature-flagged

The earlier "its enablement is checked at runtime" wording is correct but understates the boundary. Local source establishes the decisive gates:

- `codex-rs/ext/goal` has **no Cargo feature flag**; `Feature::Goals` is `default_enabled: true`, `Stage::Stable` (`codex-rs/features/src/lib.rs` L1258-1263).
- Only **`codex-app-server`** links `codex-goal-extension` (`codex-rs/app-server/Cargo.toml`); **`core`, `cli`, and `tui` do not**. The extension is installed only in `app-server/src/extensions.rs`, and only when a state DB is present.
- At thread start, continuation additionally requires `persistent_thread_state_available` (`ext/goal/src/extension.rs`).

Consequence: a bare CLI/TUI Codex operator has **no** goal continuation mechanism. "Not exposed by every surface" is therefore precise and stronger than "feature-gated": the plain CLI/TUI never link the crate.

### Completeness

The only production idle-hook turn-starter is the goal extension's `on_thread_idle`. No scheduler, cron, watcher, or background turn-starter exists in `core`, `cli`, or `tui`. The single host entry point for idle continuation is `CodexThread::try_start_turn_if_idle` (`core/src/codex_thread.rs`), which rejects when a user/client turn is queued, a task is active, the thread is in Plan mode, or a Review task is running.

## Local-Material Provenance Audit

The user pointed to a local Codex source tree. It was inspected as corroborating local evidence, not used in place of OpenAI's source URL above.

| Local material | Provenance/date found | Decision for this reference |
| --- | --- | --- |
| [`/Users/bowhead/codex`](/Users/bowhead/codex) | Local `HEAD` `1c928001e296582ac0ad21a3ae4adec539c30271`, dated 2026-07-21. Its `origin` is a user fork, while `upstream` is `github.com:openai/codex.git`. It contains the same normal-turn, `update_plan`, and `ext/goal` structures examined above. | Verified claim-by-claim at source level on 2026-07-23, including the surface-bound goal-gating refinement (see *Local Source Verification* above). Official `openai/codex` links remain the citation authority. |
| Installed `codex` binary | `/Users/bowhead/.nvm/versions/node/v20.19.6/bin/codex`, version `0.145.0` on 2026-07-23. | Establishes the local installation version only. It does not prove feature flags, active goals, or a specific app surface are enabled. |

## Source Boundaries

- `update_plan` and an active thread goal are different mechanisms. The source only establishes the behavior of the current Codex implementation; it does not establish that every Codex product surface exposes goals.
- A host-owned goal continuation mechanism includes durable goal state, a terminal/blocked policy, an idle lifecycle hook, and authority to start a new turn. A visible checklist alone does not supply those capabilities.
- This file does not assert that DPT should imitate the goal extension, inspect Codex conversations, or become tied to a Codex-only runtime.
- These source records do not substitute for a real Agent-flow observation in the DPT framework.

## Source Index

1. [Official OpenAI Codex release `0.145.0`](https://github.com/openai/codex/releases/tag/rust-v0.145.0), published 2026-07-21.
2. [Official OpenAI Codex `main` commit `39a2438`](https://github.com/openai/codex/commit/39a2438d16514d0d6f88105d17b0f747994af487), resolved 2026-07-23.
3. Current local `codex --version` observation, recorded 2026-07-23.
