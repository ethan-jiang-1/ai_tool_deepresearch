---
guideline_id: agentic-dispatch-scheduler-mechanism
suite: deep-research-guidelines
title: Engine-Side Dispatch Scheduler Mechanism
status: draft
created: 2026-06-17
role: design draft for a future Engine-side dispatch scheduler
scope: future Engine-side ds capability only
authority: guidance-draft
runtime_truth: false
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - openspec/specs/
  - DPT_FRAMEWORK/schema/
siblings:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
---

# Engine-Side Dispatch Scheduler (ds) Mechanism

> 状态: 设计草案 | 创建: 2026-06-17 | 运行时状态: 未实现，不是当前系统事实

`ds` means Dispatch Scheduler. It is an Engine-side checkpoint CLI for task dispatch decisions, deterministic receipt checks, gate-boundary checks, queue/status updates, and task projection rendering. It is not an Agent, subagent, daemon, workflow controller, content evaluator, research worker, or synthesis owner.

---

## How To Read This Draft

This document is a mechanism proposal. It captures the intended direction for a future Engine-side dispatch scheduler, but it does not define current runtime behavior until an OpenSpec change accepts it and implementation lands in `DPT_FRAMEWORK/`.

This draft must respect OpenSpec discipline. Any ds scope, schema, CLI command, receipt grammar, trace event, gate rule, or queue behavior must go through proposal/spec/tasks before implementation; this file can only guide that proposal.

All sections marked Proposed, Target, or Non-normative sketch are design aids only. They are not accepted schemas, enums, CLI contracts, state machines, or runtime surfaces.

## File Position

This file can decide:

- Design direction and vocabulary for a future Engine-side Dispatch Scheduler proposal.
- Problems to preserve from earlier prototypes and failure modes to avoid.
- Open questions and promotion criteria that a future OpenSpec change should settle.

This file cannot decide:

- Current runtime behavior, queue schema, receipt grammar, CLI commands, trace event contracts, or accepted ds requirements.
- That `ds.mjs`, `rb_ledger.jsonl`, queue Markdown projection, or structured task-card fields exist today.
- Implementation permission. A future ds implementation still needs OpenSpec proposal/spec/tasks, executable schema/contracts, tests or command experiments, and `guidelines/README.md` status updates.

---

Current inputs this draft assumes, using the project surfaces described in `project-charter.md`:

- Production bundles are `dpt_rb_<name>/`.
- Disposable experiment bundles are `dpt_disp_<name>/`.
- Current root control files are `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`.
- Current data dirs are root-level `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, and `final/`.
- Current `rb_queue.json` schema still has nullable slot fields and no full task-card schema.
- `ds.mjs`, `rb_ledger.jsonl`, and rendered queue Markdown are proposed future surfaces.

Do not treat this draft as permission to hand-edit runtime queues, bypass existing CLIs, or introduce Markdown/Agent self-governance where prose becomes the authority for queue, gate, receipt, hook, or trace state.

Promotion rule: when any ds surface becomes accepted, move the normative requirement into `openspec/specs/`, implement or update the executable contract under `DPT_FRAMEWORK/`, and update `guidelines/README.md` Current / Target / Proposed. This draft should then retain only rationale and non-normative design notes for that accepted surface.

---

## Draft Design Constraints

These constraints guide future ds proposals. They do not become runtime requirements until accepted in OpenSpec and implemented in `DPT_FRAMEWORK/`.

### MUST

- MUST treat this file as design input until OpenSpec accepts a ds capability.
- MUST route ds behavior changes through OpenSpec proposal/spec/tasks before implementation.
- MUST keep machine queue authority in structured state, not in hand-edited Markdown.
- MUST keep ds as a CLI-style checkpoint between Agent turns, not as an imagined daemon controlling the Agent loop.
- MUST keep Agent Flow controlled by Markdown task cards; ds only checks, updates state, and renders the next card.
- MUST limit ds to Engine-side dispatch checkpoints: next-task selection, deterministic receipt checks, gate-boundary checks, structured state updates, and task projection rendering.
- MUST separate deterministic checks (`ds`) from judgment work (`main-agent`).
- MUST protect main-Agent context by routing noisy search/fetch work to bounded subagent tasks.
- MUST write gate transitions and receipt outcomes as real trace events.

### MUST NOT

- MUST NOT treat `ds.mjs`, `rb_ledger.jsonl`, or queue Markdown projection as implemented runtime surfaces today.
- MUST NOT use this draft to bypass current `rb_queue.json` schema limits.
- MUST NOT implement ds behavior directly from this draft without an accepted OpenSpec change.
- MUST NOT turn ds into a workflow controller that runs the LLM-facing multi-stage process.
- MUST NOT give ds content-judgment authority, research execution responsibility, or synthesis ownership.
- MUST NOT let subagents pass gates, mutate queues, count evidence, or authorize final output.
- MUST NOT spread hook, gate, or preemption rules across multiple Markdown authorities again.
- MUST NOT allow pending slots or refill candidates to execute hidden background work.
- MUST NOT revive a large hand-maintained Markdown queue as the Source of Record.

---

## Problem

Coding agents run as a dialogue loop: read one instruction, act, answer, wait for the next instruction. We cannot put the agent inside a JS daemon. We can only decide what instruction the agent receives next.

An earlier agentic prototype built without enough SDD/OpenSpec discipline encoded queue management, receipts, hooks, gate transitions, refill, preemption, and stop authorization inside large Markdown files. Its high-level structure was directionally useful, but it became hard to reason about, test, and maintain because:

- Queue state had no single manager.
- Hook rules were repeated across multiple Markdown authorities.
- Gate transitions depended on Agent self-discipline.
- Runtime data, mechanism rules, and user-facing instructions blurred together.

The rewrite direction is to keep Markdown as the LLM-facing Agent Flow controller, while moving deterministic queue and gate checkpoints into JS. Markdown still drives the LLM's staged work; it just must not be the machine authority for queue, gate, receipt, or trace state.

---

## Design Goal

`ds` should become a small Engine-side checkpoint that the Agent calls between Markdown task cards.

The LLM-facing Agent Flow controller remains Markdown. `ds` should validate the previous step, update structured state, and render the next task card/window as Markdown because that is the format the Agent loop can reliably read and follow. That Markdown is an interface projection from structured state, not the queue authority itself.

This draft inherits the project charter split: LLM owns judgment, Markdown controls Agent Flow, and ds owns deterministic scheduling checkpoints between Markdown-controlled turns.

```
Agent reads current Markdown task card
-> Agent executes and writes declared outputs
-> Agent calls ds CLI
-> ds reloads bundle state from disk
-> ds checks receipts and gate boundaries
-> ds updates queue/status/trace
-> ds performs check / inspect / advice feedback actions and returns output to conversation context
-> Agent reads the next Markdown task card
```

The important constraint: **ds is not a daemon**. It does not watch the Agent. Each invocation is stateless except for files in the run bundle.

---

## Non-Goals

`ds` is not intended to:

- replace the Agent as the content judge;
- search the web, read pages, or synthesize evidence;
- make marketing-risk, source-quality, or answerability judgments by itself;
- let subagents mutate queue, gate, status, or evidence counts;
- make Markdown the machine Source of Record;
- create a hidden background runner outside the Agent turn loop;
- bypass OpenSpec, Zod schemas, or existing validate/inspect discipline;
- make current `rb_queue.json` structured-task behavior exist before implementation.

These non-goals are as important as the positive design. They keep ds from becoming either Markdown queue self-governance or a JS workflow controller in a new shape.

---

## Proposed Runtime Surfaces

Non-normative sketch.

| Surface | Status | Purpose |
|---------|--------|---------|
| `rb_queue.json` | existing, schema incomplete for ds | Machine queue state, future task cards and refill pool |
| `rb_status.json` | existing | Gate, counters, gaps, blocker state |
| `rb_profile.yaml` | existing | User intent, configured profile, HITL decisions |
| `rb_plan.md` | existing | Topic registry and plan projection |
| `rb_trace.jsonl` | existing | Append-only diagnostic events |
| `rb_ledger.jsonl` | proposed | Claim provenance ledger |
| queue Markdown projection | proposed | Agent-readable rendering of current task card/window |
| `DPT_FRAMEWORK/cli/ds.mjs` | proposed | CLI scheduler implementation |

The machine Source of Record should be JSON/YAML/JSONL. Markdown projection should be regenerated from machine state, not edited as the scheduler authority.

---

## Proposed CLI Shape

Non-normative sketch.

Future commands:

| Command | Mutates state | Purpose |
|---------|---------------|---------|
| `node DPT_FRAMEWORK/cli/ds.mjs next <bundle>` | yes | Check completed task, gate boundary, repair/refill, render next task |
| `node DPT_FRAMEWORK/cli/ds.mjs check <bundle>` | no | Diagnose current queue/status/receipt consistency |
| `node DPT_FRAMEWORK/cli/ds.mjs repair <bundle> --gap <id>` | yes | Generate a standard repair task for a known gap |

The exact path may become bundle-local if framework snapshotting is reintroduced. Until specified, use `DPT_FRAMEWORK/cli/...` as the rewrite convention.

The final command names are not accepted yet. Whatever CLI shape OpenSpec chooses, ds should still be able to perform three feedback actions: Check for pass/fail facts, Inspect for diagnosis, and Advice for the next recommended action.

---

## Task Card Contract

Non-normative sketch.

A task card is one agent-turn worth of work. It must be self-contained enough that an Agent can execute it without relying on chat memory.

The field names and values below are a proposal sketch, not an accepted schema, enum set, or receipt grammar. OpenSpec and `DPT_FRAMEWORK/schema/` must define the final machine contract before implementation.

Minimum proposed fields:

```yaml
work_id: "wave0-source-intake-b001"
target: "sub-agent" # main-agent | sub-agent
action: "Search for official Apple on-device ML sources"
producer_rule: "failed_gate_audit"
lineage:
  gap: "wave0_shared_floor_open"
  triggered_by: "gate_audit_wave0"
required_receipts:
  - "file:reference/_INDEX.md"
  - "status:derived_topic_count>0"
brief: |
  Wave 0 shared evidence floor is open. Search official Apple sources first.
done_condition: |
  Candidate cards for the batch exist under _cache/intake/wave0-b001/.
verification:
  ds:
    - "file:_cache/intake/wave0-b001/candidate-cards.md"
  agent:
    - "candidate cards contain decision-relevant hard content"
writes_to:
  - "_cache/intake/wave0-b001/intake-request.md"
  - "_cache/intake/wave0-b001/retrieval-results.md"
  - "_cache/intake/wave0-b001/candidate-cards.md"
  - "_cache/intake/wave0-b001/capture-manifest.md"
completion_receipt: "file:_cache/intake/wave0-b001/candidate-cards.md"
failure_route: "record_failure_in_cache; queue_source_intake_fan_in_closeout"
```

Key distinction:

- `ds` verifies deterministic facts: file exists, schema parses, count meets floor, status value matches.
- Agent verifies judgment facts: source relevance, evidence quality, marketing risk, synthesis usefulness.

When ds returns feedback, use the same action split as the project charter:

- Check: pass/fail for a concrete deterministic condition.
- Inspect: diagnosis of the current bundle state.
- Advice: next-step guidance generated from deterministic state, such as repair, continue, block, or ask for human input.

All three are LLM-facing context. They help the next Markdown turn be more precise, but they do not turn ds into a content judge.

---

## Target Separation

Non-normative sketch.

| Target | Owns | Context posture |
|--------|------|-----------------|
| `main-agent` | Fan-in review, evidence judgment, seed/topic updates, synthesis, gate reasoning | High signal, protected context |
| `sub-agent` | Search, fetch, page triage, candidate extraction into `_cache` | Low signal, disposable context |

No subagent owns gate passage, queue mutation, evidence counting, or final synthesis. Subagents write bounded outputs; main Agent reviews; ds checks deterministic receipts.

---

## Queue Model

Non-normative sketch.

The proposed queue has two layers:

```
machine state:
  rb_queue.json
    active_window: slot_1_current ... slot_5_tail
    refill_pool: priority-ordered candidates

agent projection:
  rendered Markdown task card/window
```

Only `slot_1_current` executes. Pending slots and refill candidates are visible previews, not background work.

Proposed operations:

| Operation | Meaning |
|-----------|---------|
| `enqueue(task, priority)` | Add task to refill pool or active window according to priority |
| `promote()` | Move slot 2 to slot 1 and refill tail after slot 1 completes |
| `preempt(task, position)` | Insert urgent repair before lower-priority pending work |
| `spawn_repair(task, reason)` | Generate a repair task from a failed receipt or gate gap |
| `render_window()` | Regenerate Agent-readable Markdown from machine state |

Preemption should not interrupt `slot_1_current` unless continuing it would write known-bad state, cross a gate illegally, or waste work against a known blocker.

---

## Producer Rules

Non-normative sketch.

The earlier prototype's producer-rule idea is worth preserving because it makes task lineage auditable. Proposed legal values:

- `initial_window_render`
- `setup_repair`
- `slot_completion_refill`
- `queue_thin_refill`
- `urgent_preemption`
- `failed_gate_audit`
- `gate_reopen`
- `topology_delta`
- `reference_landed`
- `topic_ref_count_changed`
- `source_intake_fan_in`
- `hitl2_readiness_path`
- `blocker_path`
- `boundary_hook`

OpenSpec should decide the final enum before implementation.

---

## Gate Hooks

Non-normative sketch.

Future ds proposals should centralize gate hooks in ds, not spread them across Markdown files.

Proposed behavior:

1. `ds next` reloads `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`.
2. It verifies the completed task receipt.
3. It evaluates the current gate boundary using explicit transition tables and receipt checks.
4. If the boundary passes, it writes a trace event and advances status.
5. If the boundary fails, it creates concrete repair work and keeps the gate closed.

Trace event requirements for gate transitions should stay strict:

- exact `gate_transition` value
- timestamp
- evidence bundle / receipt list
- queue consequence
- status pointer sync
- continuation action or blocker

---

## Stop Authorization

Non-normative sketch.

A future ds capability should preserve the current project rule: middle-run progress is not a valid stop.

Allowed stop states:

| State | Meaning |
|-------|---------|
| `final_delivery` | Readiness passed, queue closed, final output authorized |
| `decision_blocker` | Human decision, credential, access, or high-risk action blocks progress |
| `empty_queue_after_refill` | No executable work remains after documented refill/repair attempts |

Default state is `unauthorized_continue_required`: Agent must continue to the next concrete task.

---

## Claim Ledger

Non-normative sketch.

`rb_ledger.jsonl` is a proposed future surface for claim provenance. It is not implemented today.

Potential source tags:

- `[PRODUCED]`: Agent produced claim or artifact.
- `[VERIFIED]`: deterministic verifier accepted it.
- `[REJECTED]`: verifier rejected it.
- `[REPAIRED]`: claim was repaired after rejection.
- `[INFERRED]`: Agent inference, not externally verified.

Purpose: make “loop completed” separate from “claim is trustworthy.”

---

## What To Preserve From Earlier Prototypes

Earlier prototypes were not worthless; they exposed useful workflow patterns. The failure mode was letting those patterns live as Agent-policed Markdown authority instead of moving deterministic contracts into OpenSpec, schema, CLI, and trace.

| Preserve | Move / discard |
|----------|----------------|
| Self-contained task cards | Do not make giant Markdown queue files the authority |
| Receipt vocabulary | Do not let Agent self-certify receipts |
| Producer-rule lineage | Do not scatter hook logic across Markdown |
| 5-slot window as projection | Do not let pending slots execute hidden work |
| Trace as diagnostic memory | Do not have Agent hand-write gate trace |
| Maker != Checker | Do not let producer be sole verifier |

The lesson is not “write less Markdown.” The lesson is “Markdown should control Agent Flow; JS should own deterministic checkpoints.”

---

## Open Design Questions

Before implementation, OpenSpec should settle:

- Exact `rb_queue.json` task-card schema.
- Whether queue Markdown projection is a root file, generated view, or embedded in `START_FROM_HERE.md`.
- Whether `rb_ledger.jsonl` belongs in v1 ds or a later claim-verification capability.
- Exact receipt grammar and which checks are deterministic vs Agent-judgment.
- Migration path from current nullable queue slots to structured task cards.
- Whether ds lives only in `DPT_FRAMEWORK/cli/` or is copied/snapshotted into bundles.

---

## Draft Promotion Checklist

Before any ds surface can be treated as current guidance, all of these must be true:

- [ ] An accepted OpenSpec capability defines ds scope, CLI commands, queue/task schema, receipt grammar, and trace events.
- [ ] `DPT_FRAMEWORK/schema/` contains the executable schema contracts.
- [ ] `DPT_FRAMEWORK/cli/` contains the implemented CLI/checkpoint behavior.
- [ ] Tests or command experiments prove the behavior against a real `dpt_disp_*` or `dpt_rb_*` bundle.
- [ ] `guidelines/README.md` marks implemented ds surfaces as Current.
- [ ] This draft removes or downgrades any proposal text that now conflicts with accepted specs or executable schema.

---

## Next Experiment

Proposed prototype: `experiments/prototype-agentic-dispatch-scheduler/`.

Minimum proof:

1. Create a `dpt_disp_*` bundle with a structured queue state.
2. Render one task card projection.
3. Simulate Agent completion through real file writes, not fake trace.
4. Run `ds next` to verify receipt, promote queue, and write trace.
5. Add one gate-boundary check that passes or produces repair work.

The prototype must follow `guidelines/command-experiments.md`.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Command Experiments](command-experiments.md) — target guidance for durable command experiment shape and boundaries.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements; ds must be proposed here before implementation.
