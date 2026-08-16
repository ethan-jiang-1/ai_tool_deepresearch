---
guideline_id: agentic-execution-model
suite: deep-research-guidelines
title: Agentic Execution Model
status: effective
created: 2026-06-24
revised: 2026-07-25
role: non-authoritative system-understanding terminology model for the agentic execution system
scope: the complete agentic execution loop, including Chain, Queue, and Work Unit execution
authority: guidance
defers_to:
  - openspec/constitution/project-charter.md
---

# Agentic Execution Model

> 状态: 生效 | 创建: 2026-06-24 | 修订: 2026-07-25 | 适用: 所有涉及 agentic execution 的设计、实现与阅读

本文档是执行模型的术语正典。当前生产 delegated work 的正常路径只有一条:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

The surviving actor is the **Sub-agent**. The retired delegated transport is no longer production guidance. Future guidance must teach one delegated transport and authority path only. Explicit audited `late-submit` for one eligible timed-out attempt is a narrow transaction on that same path, not a second transport.

---

## 1. Purpose

系统有三类执行粒度:

1. **Chain**: phase 间路由。Gate pass 后从 `transitions.chain.json` 得到 next phase。
2. **Queue**: phase 内 demand 编排。Queue records say what work is needed and where each demand lives.
3. **Work Unit**: delegated attempt execution。The Engine claims a queue demand into bundle-root `_work_units/waveN/{work_id}/`, a bounded Sub-agent performs the task, and `operate-work-unit submit` is the normal successful completion boundary. Explicit audited `late-submit` is the only terminal exception accepted by current specs.

All bare runtime paths in this execution model are current run bundle-root relative. `_work_units/...`, `rb_queue.json`, `rb_output_declarations.jsonl`, `_cache/...`, and `_logs/...` refer to the selected `dpt_rb_*` or `dpt_disp_*` bundle, not repo root or `DEEP_RESEARCH_HARNESS/`.

This document answers the cross-layer questions:

- Which layer owns a transition, queue demand, work-unit attempt, gate verdict, or runtime receipt?
- What terms should future Agents use when reading phase docs, queue state, work-unit tasks, and gate results?
- How does the execution model fit the project charter split: Agent judgment, Markdown flow, Engine checkpoints, JSON/JSONL state?

---

## 2. File Position

This file can decide:

- Canonical terminology for Chain, Queue, Work Unit, Phase Agent, Sub-agent, and Markdown control surfaces.
- The nested execution model for phase routing, phase-local queue demand, and delegated work-unit execution.
- How workflow, queue, and sub-agent guidelines relate to each other.

This file cannot decide:

- Concrete schema fields, CLI flags, state transitions, receipt grammar, trace event names, or gate rule definitions.
- Current run state, queue contents, gate outcomes, or evidence counts.
- Implementation permission for new behavior without an OpenSpec change.

---

## Reliability Posture Across Tiers

The three-tier model follows [`evolution-simple-reliable-control.md`](../../constitution/evolution/simple-reliable-control.md). Each tier should expose one direct authority and each boundary crossing should be one explicit operation.

```text
Chain: gate verdict -> route lookup
Queue: demand state -> claim/complete decision
Work Unit: attempt facts -> submit or explicit terminal closure
```

- Do not make one tier infer another tier's truth through a long derived chain.
- Do not add a cross-tier controller merely to hide simple failures from the Phase Agent.
- Quality checks should stop at the earliest actionable root cause and let the Agent repair/retry the same visible checkpoint.
- When a design needs several new statuses, recovery branches, or projections to cross one boundary, first ask whether the boundary can instead read a direct existing Source of Record.

This posture does not weaken deterministic authority. It keeps authority explicit enough that the MD controller can understand and act on it without reconstructing Engine internals.

---

## 3. Execution Model

The execution model is nested by granularity. The Phase Agent bridges the layers by reading Markdown, running Engine/CLI checkpoints, and using structured feedback.

```text
Tier 1: Chain
  phase gate passes -> transition lookup -> next phase Markdown

Tier 2: Queue
  phase-local demand -> claim/complete non-delegated work
  phase-local delegated demand -> claim work units

Delegated attempt layer: Work Unit
  Engine allocates work_id -> Sub-agent executes bounded task
  -> submit validates result/receipt/output/cache
  -> Engine appends submitted ledger row
```

### 3.1 Layer Boundaries

| Layer | Authority | Does | Does not do |
| --- | --- | --- | --- |
| Chain | Gate verdict + transition table | Selects the next phase after a pass | Does not inspect queue or allocate work |
| Queue | bundle-root `rb_queue.json` through queue Engine/CLI | Tracks phase-local demand, locations, non-delegated completion, and delegated in-flight bindings | Does not accept delegated results as coverage |
| Work Unit | bundle-root `_work_units/_index.json` plus `operate-work-unit` transactions | Allocates delegated attempts, validates submit, writes result/status, appends submitted ledger row | Does not choose phase transitions or replace gate judgment |
| Gate | Gate definition JSON + gate CLI output | Aggregates structural and provenance checks for phase completion | Does not infer delegated coverage from filesystem presence alone |

### 3.2 Delegated Flow

```text
Phase Agent reads phase Markdown
  -> queue demand is eligible for delegation
  -> operate-work-unit claim <bundle> --phase waveN [--count N]
  -> Engine creates bundle-root _work_units/waveN/{work_id}/
  -> Phase Agent spawns native Sub-agent with task.md prompt
  -> Sub-agent writes declared outputs/cache and lifecycle receipt
  -> operate-work-unit submit <bundle> --work-id <id> --result <result.json>
  -> Engine validates and appends rb_output_declarations.jsonl
  -> gate reads submitted ledger coverage plus cross-checks
```

Do not route delegated success through queue completion. `operate-queue` remains for queue maintenance and non-delegated completion. Delegated success normally uses `operate-work-unit submit`; the only terminal exception is explicit audited `operate-work-unit late-submit`, which still completes through work-unit validation and submitted ledger authority.

### 3.3 Concurrency

| Layer | Concurrency model |
| --- | --- |
| Chain | Single step: one phase transition at a time |
| Queue | Ordered demand window plus in-flight delegated bindings |
| Work Unit | Batched delegated fan-out through `claim --count N`; each attempt has a distinct `work_id` |

Sub-agents do not allocate IDs, mutate queue state, append ledgers, or pass gates. The Engine allocates work-unit IDs and validates submit.

---

## 4. Terminology Canon

| Term | Definition | Use instead of |
| --- | --- | --- |
| **Phase Agent** | The Agent actor currently executing phase-level Markdown, running Engine/CLI checkpoints, and repairing from feedback | main agent, parent agent, orchestrator in conceptual prose |
| **Sub-agent** | A bounded Agent actor executing a work-unit `task.md` and returning schema-valid result JSON | worker, child agent |
| **Queue demand item** | A phase-local demand record identified by `queue_item_id` | using `work_id` for demand identity |
| **Work unit** | One Engine-allocated delegated execution attempt identified by `work_id` | wave, topic, task card, runtime thread |
| **Work-unit envelope** | bundle-root `_work_units/waveN/{work_id}/` directory with manifest, task, schema, beacon, receipt, result/status surfaces | non-work-unit delegated directories |
| **Submit** | `operate-work-unit submit`; the normal successful delegated completion transaction for claimed attempts | delegated queue complete |
| **Late-submit** | Explicit audited completion for one eligible targeted `timed_out` attempt through the same validation/ledger authority | generic terminal recovery, automatic late acceptance |
| **Submitted ledger row** | Engine-written row in bundle-root `rb_output_declarations.jsonl` created by successful work-unit submit | filesystem-only output, hand-written declaration |
| **Markdown control surface** | Agent-readable phase node, task, playbook, projection, or work-unit task | machine authority |
| **MD controller mode** | Phase-level Markdown execution mode used by the Phase Agent | Agent identity |

`"main-agent"` and `"sub-agent"` may still appear as wire/schema values where executable contracts require them. In durable conceptual prose, prefer **Phase Agent** and **Sub-agent**.

---

## 5. Complete Execution Flow

For a Wave1 topic-deepening queue demand:

1. Phase Agent reads `phase-wave1.md`.
2. Queue state contains a `wave1_topic_deepening` demand with `queue_item_id`.
3. Phase Agent runs `operate-work-unit claim <bundle> --phase wave1`.
4. Engine allocates `work_id`, moves the demand into `delegated_in_flight`, writes bundle-root `_work_units/wave1/{work_id}/`, and returns prompt refs.
5. Phase Agent spawns `dpt-evidence-extractor` with the work-unit task.
6. Sub-agent reads `task.md`, `_beacon.json`, and `result.schema.json`, then writes declared outputs/cache and lifecycle receipt events carrying `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
7. Phase Agent runs `operate-work-unit submit <bundle> --work-id <work_id> --result <result.json>`.
8. Engine validates the result, receipt, output files, cache trails, queue binding, hashes, and idempotency fingerprint.
9. Engine completes the bound queue demand, updates work-unit state, and appends the submitted ledger row.
10. Phase Agent continues claiming until phase drain, then runs the wave gate.
11. Gate checks submitted work-unit ledger coverage and cross-checks, then Chain selects the next phase only after gate pass.

---

## 6. Relationship To Project Charter

Project Charter defines authority type:

| Authority type | Owner |
| --- | --- |
| Research judgment, search choices, synthesis, repair reasoning | Agent |
| Agent Flow and operating instructions | Markdown |
| Deterministic schemas, transitions, receipts, ledgers, gates | JS Engine/CLI |
| Durable runtime truth | JSON/JSONL/files in the current run bundle |

This execution model defines granularity:

| Granularity | Mechanism |
| --- | --- |
| Phase-to-phase | Chain and gates |
| Phase-local demand | Queue |
| Delegated attempt | Work unit and Sub-agent actor |

Both axes must agree. A Markdown instruction can tell the Phase Agent to claim work units, but only the Engine can allocate `work_id`, accept submit, append the ledger, and make gate-readable provenance.

---

## 7. How To Read Mechanism Files

| Order | File | Covers |
| --- | --- | --- |
| 1 | `agentic-execution-model.md` | Global terms and nested execution model |
| 2 | `agentic-workflow-mechanism.md` | Chain, gate, and phase handoff |
| 3 | `agentic-queue-mechanism.md` | Queue demand, queue v2, and phase drain |
| 4 | `agentic-subagent-mechanism.md` | Work-unit-mediated Sub-agent execution and noise isolation |

---

## 8. Terminology Discipline (Reading Conventions)

> Terminology discipline only: the accepted specs (e.g. `agent/delegated-work-units`, `engine/check-inspect-feedback`) own the normative effect of these reading conventions; this model document does not.

- Convention: describe production delegated work as `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate`.
- Convention: reserve `queue_item_id` for demand identity and `work_id` for delegated attempt identity.
- Convention: treat `operate-work-unit submit` as the normal delegated success boundary and explicit audited `operate-work-unit late-submit` as the only terminal completion exception.
- Convention: treat submitted ledger rows as delegated gate coverage authority.
- Convention: treat `_work_units/`, receipts, output files, cache trails, and runtime refs as cross-check or diagnostic surfaces unless tied to submitted ledger coverage.
- Convention: use "Sub-agent" for the surviving bounded actor.
- Convention: keep every cross-tier handoff explicit and short, with one direct authority and one actionable checkpoint result.
- Anti-convention: describe the retired delegated transport as a production path.
- Anti-convention: teach delegated queue completion, filesystem presence, or hand-written ledger rows as production coverage.
- Anti-convention: describe audited late-submit as a second delegated transport, default retry route, or generalized terminal recovery controller.
- Anti-convention: let a sub-agent mutate queue state, append ledgers, run gates, or authorize phase completion.
- Anti-convention: add hidden cross-tier inference, duplicate completion paths, or cascading diagnostics when the direct tier authority can answer the checkpoint.

---

## Related Guidance

- [OpenSpec Control Map](../../README.md) - guidance roles and reading routes.
- [Project Charter](../../constitution/project-charter.md) - repo-wide charter and authority map.
- [Abstraction as Semantic Precision](../../constitution/evolution/abstraction-semantic-precision.md) - establish the semantic level before assigning a tier or a term.
- [Simple Reliable Control](../../constitution/evolution/simple-reliable-control.md) - complexity posture for short tier boundaries and reliable quality-control feedback.
- [Helper-Oriented Agent](../../constitution/evolution/helper-oriented-agent.md) - action responsibility after the model and control shape are clear.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) - Chain and phase handoff.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) - queue demand and phase-local drain.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) - work-unit-mediated Sub-agent execution.
- [Framework Runtime Boundary](framework-runtime-boundary.md) - directory and authority boundary for framework assets versus runtime bundles.
- [Command Experiments](../../operations/command-experiments.md) - how to prove mechanisms with real runtime contexts.
