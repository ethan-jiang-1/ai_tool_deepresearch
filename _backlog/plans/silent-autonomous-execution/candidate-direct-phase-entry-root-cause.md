---
title: Candidate root-cause design - direct phase entry
status: historical_candidate_superseded_by_guidance_change
parent_plan: ../silent-autonomous-execution.md
candidate_change_name: make-phase-handoff-entry-direct
bugs: BUG-099, BUG-103, BUG-104, BUG-106
revised: 2026-07-28
---

# Candidate: Direct Phase Entry Root-Cause Design

## Superseded Scope (2026-07-28)

The specific BUG-103 guidance omission is closed by archived
`align-phase-handoff-status-sync-guidance`: the generic entry playbook now
requires `enter-phase -> advance-status --to <source gate> -> execute loaded
phase`. The proposed `consume-phase-handoff` command, bounded entry-core
projection, and lifecycle-writer consolidation in this document were not
adopted. They remain historical alternatives, not a pending implementation
direction. BUG-104 and the real-Agent observations in BUG-099/106 retain their
separate evidence boundaries.

## 1. Decision

BUG-103 and BUG-104 are one chronic DPT handoff-interface defect, not two independent prompt problems. BUG-099 and BUG-106 are observed Agent outcomes at that same boundary. They make the repair high-value, but their causality is not yet proven and they must not be relabeled as deterministic Engine defects.

The root cure is to replace the normal Agent-facing sequence:

```text
read gate check.next
  -> enter-phase --node <next>
  -> remember source gate
  -> advance-status --to <source gate>
  -> infer that target phase work can now begin
```

with one normal public interface:

```text
consume-phase-handoff --bundle <bundle>
  -> validate latest legal handoff
  -> durably load its only authorized target
  -> durably synchronize its source-gate window
  -> render the target phase's bounded entry core
  -> tell the Agent to execute that core now
```

The command name is a design target, not a requirement to preserve an exact spelling. Its interface is the decision: normal callers provide only `--bundle`; they do not re-supply `check.next`, target node or source-gate enum.

This change does **not** make the Engine execute a phase, search, claim work, run a Gate, classify chat, or force an LLM to take another tool call. It hides only the existing, deterministic handoff bookkeeping behind a smaller caller interface. Markdown remains the Phase Agent's controller after the target entry core is delivered.

The current platform analysis is [Coding-Agent Loop Analysis](analysis-coding-agent-loop-platform.md). Its two source references establish that a visible to-do is not a post-turn scheduler in either Codex or Claude Code. Consequently, this is the root cure for DPT handoff correctness and action readiness, not a claim that DPT can force any host or model to keep a turn alive.

## 2. What Is Actually Broken

### 2.1 Proven interface contradiction

The accepted lifecycle order is:

```text
passed source gate
  -> route-bound target load
  -> source-gate status synchronization
  -> target phase work
```

`enter-phase` intentionally writes `load_complete` and `rb_status.json#/current_node` without changing gate windows. `advance-status` then validates that exact witness, writes `current_gate`/`next_gate`, and appends `phase_transition` with rollback if trace append fails. This lower-level split is sound: each operation has a narrow durable responsibility.

The public caller interface is not sound. A Phase Agent must retain or rediscover the source-gate enum after a large `enter-phase` render. Worse, the current final continuation block says `next_action: execute_loaded_node`, although the accepted route still requires `advance-status` first. That is a direct, deterministic contradiction at the last decision point.

BUG-103 is therefore not "status drift after entry." The old gate window is the accepted intermediate state. The bug is that normal caller guidance exposes that intermediate state as if target execution were already authorized.

### 2.2 Proven control-surface overload

`enter-phase` creates a fresh runtime, resolves the complete `requires` closure with `assessNode()`, then prints every loaded Markdown file in that closure. The same shared files are printed on every transition because the cache is process-local, not session-aware.

Current direct mandatory content before any injected header or wrapper is already approximately:

| Phase | Direct rendered Markdown bytes |
|---|---:|
| Wave0 | 95,139 |
| Wave1 | 110,556 |
| Wave2 | 94,429 |

Those figures come from the current phase files plus their direct `requires` closures. They are not a model-token estimate and do not prove why an Agent stopped. They prove that normal transition output is an oversized, repeated control surface.

### 2.3 What remains unproven

- The production Agent did pause, ask, or summarize at `stop: no` handoffs.
- Repeated full closure output plausibly increases friction.
- There is no evidence that a particular context threshold, model-internal state, or one sentence is the cause.
- A framework cannot deterministically prove that a general-purpose Agent issued a subsequent tool call without becoming a chat/tool-call observer, which this project forbids.

Therefore the root cure must remove the deterministic interface defect and the repeated oversized normal entry surface. It must not claim it has made arbitrary Agents impossible to stop.

### 2.4 Platform liveness changes the claim, not the DPT repair

Both supported coding-agent platforms distinguish a normal tool loop from a host-owned continuation feature. Their normal loop ends when the model emits an assistant-only response. Codex update_plan and Claude Code task lists are tracking surfaces, not schedulers (both source-confirmed). Codex has a separate, surface-bound active-goal runtime (app-server only — CLI/TUI do not link it); Claude Code documents `/goal`, Stop hooks, and `/loop` as separate host mechanisms (loop termination and task-list-as-tracking are source-corroborated; `/goal` and the Stop-hook cap remain doc-authoritative).

This evidence is useful because it rules out the false cure: adding a more visible task, a larger plan, or stronger silent wording cannot mechanically make a host begin another turn. It does not invalidate the DPT repair. A direct legal handoff and a bounded first action are still necessary before the model makes its next decision, whether that decision occurs in the current turn or a host-resumed one.

## 3. The Deep Module

### 3.1 External interface

The new handoff module's normal interface is one command with one fact supplied by the caller:

```text
consume-phase-handoff --bundle <bundle>
```

It derives all of the following from existing authorities:

| Needed fact | Existing Source of Record |
|---|---|
| legal source and target | latest passed/degraded `gate_attempt` or accepted post-final event, resolved through current topology |
| target load witness | route-bound `load_complete` in `rb_trace.jsonl` |
| source status window | manifest + transition chain + `rb_status.json` |
| phase execution contract | target phase frontmatter and canonical Markdown entry core |

The caller must not know target node, source Gate enum, prior command ordering, or a recovery stage. This is the leverage gain: the module hides mechanics that currently reappear in every phase body and in every Agent decision.

### 3.2 Internal implementation stages

The module has one normal success path but retains internal seams for deterministic tests:

```text
1. resolve latest legal handoff
2. ensure exact target load_complete/current_node exists
3. ensure exact source status sync/phase_transition exists
4. render target entry core
5. emit truthful execute-now continuation
```

It must reuse the existing trace/status contracts rather than invent a handoff ledger, a session registry, or a parallel transition table.

The normal path is atomic **to the caller**, not an unsafe all-or-nothing filesystem claim. Existing append-only trace facts cannot be rolled back. If a process stops after target load but before status sync, the same public command resumes from those existing facts and performs only the missing status operation. If trace/status evidence is contradictory, it fails closed with the existing nearest repair owner. A completed exact handoff is idempotent and must not append duplicate `load_complete` or `phase_transition` evidence.

`enter-phase` and `advance-status` remain lower-level implementation/recovery seams until their callers are migrated. They cease to be the normal Agent-facing handoff protocol. The public module replaces the two-command recipe; it does not layer a third mandatory recipe on top.

### 3.3 Why this is not a workflow controller

The module consumes one already-authorized edge only. It cannot:

- select an alternate route;
- run the target phase body or any Markdown command block;
- mutate queue, topic state, work-unit, receipt, ledger or Gate facts;
- retry a failed Gate or choose a repair strategy;
- observe a conversation, tool-call absence, context size or Agent intent.

Deleting it would make target/source/status reconstruction reappear in every phase caller. That passes the deletion test: it is a deep module, not a shallow command wrapper.

## 4. Entry-Core Architecture

The handoff module alone removes the ordering bug, but not the repeated 95--111 KB normal entry surface. The same change must change the Markdown authoring interface, not cache prior reads.

### 4.1 Canonical split

Each lifecycle phase root becomes a bounded **entry core**. It contains only what an Agent needs before its first legal action:

- phase objective and current authority facts to read;
- one first action or a small closed first-action choice derived from runtime truth;
- the Phase's completion/Gate owner;
- explicit references for later branches and recovery paths.

Only Markdown required to carry out that first action remains in `requires`. Detailed repair protocols, role-specific guidance, rare branches and later-loop instructions move to named canonical Markdown files that the entry core explicitly directs the Agent to read before that branch is taken.

The entry core is not a generated summary and not a second authority. It is the canonical phase Markdown itself after content is decomposed. The detailed files remain canonical too; no semantic fact is discarded.

### 4.2 Fresh-session invariant

The rendered entry core must be sufficient for a brand-new Agent to make the first legal action without relying on any previous transition or cached conversation. It must not contain an "already read" flag, content hash, bundle-local read registry, or implicit inherited context.

Repeated entry therefore remains safe: it repeats a small current control surface rather than pretending the Agent has a memory the Engine cannot prove.

### 4.3 Contract checks

The proposal must define and test the following authoring contract:

1. Every entry core names its exact first action and the direct facts it needs.
2. Every later required branch has an explicit canonical reference and a triggering condition in the entry core or prior branch.
3. No removed `requires` file contains information necessary before the declared first action.
4. Consistency validation still verifies all canonical references and lifecycle `stop`/Gate contracts.
5. Rendered-byte measurements are recorded as a regression signal, but no arbitrary token/byte threshold becomes runtime authority.

## 5. Rejected Alternatives

| Alternative | Why it does not cure the root |
|---|---|
| Add `do_not_summarize`, stronger `stop: no`, or another cue | The silent contract and continuation cues already exist. More synonymous prose creates a second competing control surface. |
| Let Gate repair status drift | The intermediate state is legal only as a handoff stage; Gate mutation would erase a missing witness/Agent action and cross authority. |
| Make `enter-phase` mutate status directly without a recovery design | It hides a two-fact durable chain behind unsafe partial writes and loses the existing rollback locality. |
| Session-aware de-duplication of shared Markdown | It treats prior Agent reads as a durable fact even though session identity and context retention are not framework authority. |
| Render only file pointers and require a fresh Agent to infer what to read | It removes the current overload by creating an under-specified control surface. |
| Generic JS phase runner/controller | It would execute Markdown workflow decisions that belong to the Agent and create a second workflow authority. |
| Observe chat/tool calls and mark `silent_contract_violation` | The Engine has no legitimate conversation authority; detection cannot repair the already-ended turn. |
| Treat a visible task list or update_plan as a continuation mechanism | Both platform references distinguish task tracking from host authority to start another turn. |
| Copy Codex active goals, Claude Code /goal, Stop hooks, or /loop into DPT | A copy would introduce durable goal state, completion evaluation, idle observation and turn injection: a prohibited host controller and second state machine. |
| Assume a host-native goal is a portable DPT contract | Codex availability can be feature-gated and Claude Code mechanisms have different semantics and limits. Host configuration remains outside the bundle and cannot repair a malformed handoff. |

## 6. Verification Plan

### Deterministic module proof

- A clean and a degraded source Gate each produce one legal completed handoff through the public command.
- Caller supplies no target node or source gate; attempted caller overrides are unavailable or rejected.
- Success contains route-bound `load_complete`, synchronized status window and matching `phase_transition` before it emits `execute_loaded_node`.
- Crash/retry after load, status write and trace append reuses existing trace/status facts, avoids duplicates and returns one nearest recovery action.
- Wrong target, superseded gate, missing witness, status drift and trace failure fail closed.
- Entry-core renderer includes first-action authority and excludes later branch bodies; every explicit branch reference resolves.

### Real Agent proof

Use new disposable `agent_flow_e2e` bundles only after Change 1 enters `/opsx:apply`:

1. Fresh-session legal handoff to Wave0 or Wave1.
2. Same-session Wave0 -> Wave1 handoff after substantial prior work.
3. At least one repeated independent observation, not merely one successful run.

For each, preserve the Subject prompt/transcript/result, `rb_trace.jsonl`, completed status transition, emitted entry core and first target action. The assertion is narrow: after the completed public handoff, the Agent executes the first target action rather than initiating a framework status/question/continuation request.

Each observation must also name the coding-agent host and version, its execution mode, and whether a host-native continuation feature was enabled. A host opening another turn is recorded as host evidence; it is not a DPT trace fact and does not by itself close BUG-099 or BUG-106. The real-Agent assertion remains the same in both Codex and Claude Code: after the completed legal handoff, did the Agent take the target entry core's first action?

### Bug closure boundary

| Bug | Closure evidence |
|---|---|
| BUG-103 | deterministic proof that normal public handoff cannot expose target execution before status sync |
| BUG-104 | deterministic entry-core contract plus measured removal of repeated full normal closure |
| BUG-099, BUG-106 | repeated real Agent-flow continuation evidence; otherwise retain as active actor-compliance residuals |

## 7. Proposal Scope

This document fixes the Change 1 design direction. Its future OpenSpec proposal must modify only the contracts and tasks necessary to:

1. introduce the one normal handoff interface and migrate normal lifecycle phase guidance to it;
2. reuse existing trace/status evidence for idempotent recovery;
3. decompose the mandatory phase entry control surface into canonical entry core plus explicit later branches;
4. prove deterministic and real-Agent claims at their proper verification layers.

It must not absorb a host scheduler, native-goal adapter, chat observer, session registry, pre-Wave producer bugs, Wave submit/closeout bugs, or Gate degradation policy into Change 1. Those remain outside Change 1 or in Changes 2--4 in the parent plan.
