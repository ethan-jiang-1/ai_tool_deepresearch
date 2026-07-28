---
title: Silent autonomy DPT-means boundary - what is and is not a DPT capability
status: historical_boundary_partially_superseded
parent_plan: ../silent-autonomous-execution.md
related:
  - candidate-direct-phase-entry-root-cause.md
  - analysis-coding-agent-loop-platform.md
  - ref_claude-code-agent-loop-research.md
  - ref_codex-agent-loop-research.md
created: 2026-07-23
---

# Silent Autonomy: DPT-Means Boundary

## Superseded DPT Handoff Scope (2026-07-28)

The deterministic BUG-103 part of the former proposed Change 1 is closed by
archived `align-phase-handoff-status-sync-guidance`, which corrects the generic
handoff order without a new command, writer, bounded entry core, or lifecycle
controller. The host/Agent liveness boundary and BUG-099/104/106 observations
remain research material; references below to `consume-phase-handoff` are
historical alternatives and not current scope.

## 1. Conclusion (the part to pick up later)

The silent-phase-entry cluster splits into two problems with different owners. The split is the load-bearing decision for Change 1 and for the whole host-continuation question:

| Problem | Owner | DPT-means solution | Status |
|---|---|---|---|
| BUG-103/104: deterministic handoff-interface defect. The normal cue says `execute_loaded_node` before the mandatory `advance-status`; the caller must retain the source-gate enum across a large `enter-phase` render; the same 95--111 KB dependency closure is reprinted on every transition. | DPT | Change 1: one `consume-phase-handoff --bundle` interface derives target/source facts, completes the route-bound load plus source-gate status sync, then renders a bounded entry core with one truthful first action. | Solvable in DPT. This is the **only DPT lever** for the whole cluster. |
| BUG-099/106: the observed Agent stops, asks, or summarizes at `stop: no` handoffs instead of taking the next action. | Operator + host, **not DPT**. | None in DPT. The host-native continuation mechanism exists (Claude Code `/goal`, Codex `active-goal`) but is operator means. | Residual. Closes only on repeated real-Agent-**acted** evidence; never on host-restarted-turn evidence alone. |

The one-sentence verdict: **there is a path for the operator to make a Coding Agent continue, but that path is in the operator's hands, not in DPT's. Calling it "DPT has a way" crosses the line this project draws.**

## 2. The trap this conclusion exists to prevent

The recurring slip is: design a DPT read-only predicate (e.g. `isHandoffConsumed(bundle)` / `isFirstActionTaken(bundle)`) whose **purpose** is to be consumed by a host `/goal` completion check or a Stop-hook restart loop. Each piece looks innocent -- the predicate only reads bundle facts, which is a JS Engine authority. But the composite (DPT signal feeding a host turn-restart) is a **cross-tier controller**: it makes DPT influence host continuation, which is exactly what both boundary documents forbid.

- `guidelines/agentic-execution-model.md` ("Reliability Posture"): *Do not add a cross-tier controller merely to hide simple failures from the Phase Agent. Quality checks should stop at the earliest actionable root cause and let the Agent repair/retry the same visible checkpoint.* Its MUST NOT list forbids hidden cross-tier inference and duplicate completion paths.
- `analysis-coding-agent-loop-platform.md` section 5: *No DPT code, bundle state, Gate, trace event, or Markdown file may infer that a host goal is enabled, inspect whether a turn ended, retry after a silent assistant response, or turn host-only task state into DPT routing authority.*

A "continuation runbook" as a DPT-produced artifact falls under the same line: DPT must not produce Markdown that infers a host goal is enabled or instructs host configuration as if it were a DPT capability.

## 3. What DPT means actually are

Authority map from `agentic-execution-model.md` section 6 / project charter:

| Authority type | Owner |
|---|---|
| Research judgment, search choices, synthesis, **repair reasoning (including whether to continue)** | Agent |
| Agent Flow and operating instructions | Markdown |
| Deterministic schemas, transitions, receipts, ledgers, gates | JS Engine/CLI |
| Durable runtime truth | JSON/JSONL/files in the active bundle |

"Whether the Agent continues a turn" is Agent research-judgment authority. It is not a type DPT can control. DPT's lever for the behavioral problem therefore ends at: **a correct checkpoint plus a direct, unambiguous first-action instruction.** That is exactly Change 1. There is no fifth authority type for "make the host start another turn."

## 4. What the host can do, and why it is still not a DPT capability

The two reference files establish that a purpose-built continuation mechanism exists on each supported host:

- Claude Code `/goal`: a fast model evaluates a completion condition after every turn; `no` starts another turn with a reason. Requires v2.1.139+ (doc-authoritative — the local source mirror is a pre-current snapshot and does not contain `/goal`). Stop hooks keep a turn going; the eight-consecutive cap is doc-authoritative (the mirror shows block-only continuation with no counter). `/loop` is timer-scheduled, not completion-driven (source-corroborated). A feature-gated **token-budget continuation** is an additional bounded host lever (source-observed). All four are feature/version-gated and bounded — none is supplied by the task list.
- Codex `active-goal` (`GoalExtension`): on thread idle it verifies the goal feature is available and an `active` goal exists, then injects a continuation item and starts another turn. It flips to `blocked`/`usageLimited` to prevent unbounded loops. Local source verification establishes the decisive gate is **surface-bound**: only `codex-app-server` links `codex-goal-extension`; `core`/`cli`/`tui` do not, so a bare CLI/TUI operator has no goal mechanism (`Feature::Goals` is default-on/Stable, so "feature-gated" understates the boundary).

These are real and were built for exactly this use. But four facts keep them out of DPT scope:

1. **They are operator means, not framework means.** Configuring `/goal` or enabling an active goal is a host run-owner action outside the bundle. DPT cannot rely on it; a fresh operator on a bare host has none of it.
2. **They are feature/version/mode gated and therefore non-portable.** They cannot become a DPT contract or guarantee.
3. **They are probabilistic and bounded.** `/goal` is a model verdict; goals go `blocked`/`usageLimited`; Stop hooks cap at eight. They raise the probability of continuation and fail safe; they do not guarantee it.
4. **They do not close BUG-099/106 by themselves.** A host opening another turn is host evidence. Closure still requires repeated proof that the Agent executed the correct first target action. A restarted turn with no action is not closure.

## 5. How to pick this up later

When Change 1 enters `/opsx:propose`:

- Keep Change 1 strictly the deterministic fix: the one `consume-phase-handoff` interface plus the entry-core decomposition. It must stand alone -- a fresh Agent on a bare host with no goal configured must be able to continue from the clean handoff.
- Do **not** add to Change 1 (or to any DPT artifact) a host-continuation deliverable, a predicate-for-host, or an operator runbook.
- BUG-099 and BUG-106 remain active residual observations pending repeated real-Agent-acted evidence recorded in disposable `agent_flow_e2e` runs, with host/version/mode and continuation state recorded separately from DPT trace facts.

If a future proposal is tempted to fold host continuation into DPT (a goal adapter, a session registry, an idle watcher, a chat/tool-call observer, a predicate wired to a host loop, a "make the Agent continue" Markdown), this note is the prior decision against it. The platform analysis already rejected each of these; this note records *why* the rejection is a means limit, not a missing idea: the lever is the operator's, and DPT's only lever is Change 1.
