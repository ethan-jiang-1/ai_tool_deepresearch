---
guideline_id: agentic-subagent-mechanism
suite: deep-research-guidelines
title: Agentic Subagent Mechanism
status: effective
created: 2026-06-24
revised: 2026-07-25
role: non-authoritative system-understanding model for work-unit-mediated sub-agent execution
scope: Sub-agent actor behavior through Engine-allocated work units, noise isolation, and submit provenance
authority: guidance
defers_to:
  - openspec/constitution/project-charter.md
---

# Agentic Subagent Mechanism

> 状态: 生效 | 创建: 2026-06-24 | 修订: 2026-07-25 | 适用: 所有涉及 Sub-agent 派发、执行、提交、取证的设计与实现

Sub-agent 仍然存在。它是一个 bounded Agent actor，用来隔离高噪声 I/O 工作。正常生产机制已经统一为 work units:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

The old delegated transport is retired as production guidance. The only terminal completion exception is explicit audited `operate-work-unit late-submit` for an eligible targeted `timed_out` attempt; it uses the same work-unit, validation, queue, and ledger authorities and is not an alternate transport.

---

## Implementation Status

| Surface | Status | Current guidance |
| --- | --- | --- |
| `operate-work-unit claim` | Current | Engine allocates `work_id`, binds `queue_item_id`, writes bundle-root `_work_units/waveN/{work_id}/`, and returns task prompt refs |
| `_work_units/_index.json` | Current | Bundle-root allocation and attempt-state registry, not gate pass coverage |
| Work-unit envelope | Current | `manifest.json`, `task.md`, `result.schema.json`, `_beacon.json`, `runtime-receipt.jsonl`, result/status surfaces, optional runtime refs |
| Native Sub-agent actor | Current | Reads the bounded work-unit task and returns schema-valid result JSON |
| `operate-work-unit submit` | Current | Normal successful delegated completion transaction for eligible claimed attempts |
| `operate-work-unit late-submit` | Current narrow exception | Explicit audited completion only for an eligible targeted `timed_out` attempt when replacement coverage does not already exist |
| `rb_output_declarations.jsonl` | Current | Bundle-root submitted work-unit ledger used by gates |
| Runtime refs | Diagnostic | Platform thread/session/spawn/cancel IDs may help debugging but are never authority |

---

## 1. Purpose

Phase Agent context is scarce. Web search, page fetching, source diagnostics, claim verification, and evidence extraction can flood the main context with low-density information. Sub-agents protect the Phase Agent by doing bounded high-I/O work and returning concise structured results.

The Engine protects provenance by turning delegated work into work units. The Phase Agent may spawn a native sub-agent, but the Engine alone allocates `work_id`, records attempt state, validates submit, completes the bound queue demand, and appends delegated ledger coverage.

All bare runtime paths in this guideline are current run bundle-root relative. `_work_units/...`, `rb_output_declarations.jsonl`, `_cache/...`, and `_logs/...` refer to the selected `dpt_rb_*` or `dpt_disp_*` bundle, not repo root or `DEEP_RESEARCH_HARNESS/`.

---

## 2. File Position

This file can decide:

- When and why work should go to a Sub-agent.
- What a Sub-agent may read, write, and return inside a work-unit task.
- The conceptual boundary between Sub-agent actor behavior and Engine submit/gate authority.
- Context-management principles for high-noise work.

This file cannot decide:

- Concrete schemas, CLI flags, receipt event grammar, gate rule definitions, or ledger row fields.
- Current runtime state, current queue contents, or whether a specific run has passed a gate.
- New production delegated mechanisms without OpenSpec.

---

## Simple Work-Unit Posture

This mechanism follows [`evolution-simple-reliable-control.md`](../../constitution/evolution/simple-reliable-control.md). Delegated reliability comes from one bounded path, not from a tree of retries, fallbacks, watchers, and inferred completion states.

```text
queue demand -> one Engine-allocated attempt -> bounded Sub-agent work -> one submit check -> submitted ledger or explicit terminal closure
```

- Submit validation should inspect direct envelope/result/receipt/output/cache facts and return the smallest actionable root cause.
- If a prerequisite such as identity or receipt binding fails, dependent provenance checks should not flood the Phase Agent with cascading symptoms.
- Retry remains an explicit new attempt or a narrowly accepted audited exception; it should not become a hidden lineage-recovery controller.
- Normal completion remains `submit`; `late-submit` is one command-targeted audited exception, not a second general success path.
- Prefer repairing the same visible attempt or closing it explicitly over adding background state that guesses whether work is done.
- A new delegated mechanism should remove an existing branch or duplicated contract; adding another completion path by itself is a reliability regression.

---

## 3. Core Principle: Noise Isolation

Use a Sub-agent when the work has high I/O density and bounded judgment scope:

| Work | Why delegate | Typical role |
| --- | --- | --- |
| Foundation source intake | Search/fetch produces many noisy candidates | `dpt-source-intake` |
| Topic-specific deepening | Evidence extraction needs page reading and filtering | `dpt-evidence-extractor` |
| Source diagnostics | Source trust/materiality assessment benefits from isolated reading | `dpt-source-diagnostic` |
| Claim verification | Claim-level checking may require bounded fresh search | `dpt-claim-verifier` |
| Targeted Wave2 evidence | Gap/finding search should not pollute synthesis context | `dpt-topic-scout` |

Do not delegate pure cross-topic synthesis, phase routing, gate interpretation, final report judgment, or HITL decisions. Those require Phase Agent context and judgment.

---

## 4. Work-Unit Contract

A Sub-agent receives a bounded work-unit task, not the whole workflow.

Minimum assigned surfaces:

| Surface | Purpose |
| --- | --- |
| `task.md` | Human-readable task, constraints, output/cache contract, and deadline |
| `_beacon.json` | Bundle path, `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, logging refs |
| `result.schema.json` | Result JSON shape |
| `runtime-receipt.jsonl` | Lifecycle evidence path |
| Declared output/cache paths | Only places the Sub-agent may write durable evidence/cache |

The Sub-agent result must preserve:

- `work_id`
- `queue_item_id`
- `kind`
- `receipt_nonce`
- `output_files[]`
- `cache_trails[]`

The Phase Agent submits the result by `work_id`. The Sub-agent does not append the ledger, complete queue demand, or pass the gate.

---

## 5. Runtime Receipt

Lifecycle receipt events bind runtime behavior to the work-unit identity. Each meaningful event should carry:

```json
{
  "schema_version": "work-unit.receipt-event.v1",
  "event": "work_done",
  "work_id": "wu-w1-b000-deep-i0001",
  "queue_item_id": "topic-a",
  "kind": "wave1_topic_deepening",
  "receipt_nonce": "<nonce>",
  "ts": "2026-07-06T00:00:00.000Z"
}
```

Receipt and log evidence are corroboration. They are not delegated pass authority by themselves. Submit and gate checks decide authority.

---

## 6. Output And Cache Rules

Sub-agent output should be compact and structured. It should not dump raw search trails, full page bodies, or private reasoning into result JSON.

When the task writes evidence/reference artifacts:

- `output_files[]` must declare every durable output path and role.
- `cache_trails[]` must declare leaf cache directories.
- Each cache leaf should contain `websearch.json`, `page.md`, and `meta.json` when page content was fetched.
- Output/cache paths must be bundle-relative and within the task contract.

`operate-work-unit submit` validates declared outputs and cache trails before ledger append. Gates read submitted work-unit declarations and cross-check surfaces; they do not award coverage for undeclared files.

---

## 7. Failure, Timeout, And Retry

Invalid submit is non-terminal. It leaves the attempt claimed, records rejection diagnostics, and allows corrected submit when the attempt is still valid.

Terminal attempt closure is explicit:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason "<reason>"
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason "<reason>"
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason "<reason>"
```

Retry normally allocates a new `work_id`. Normal `submit` against any terminal attempt fails closed.

The only terminal completion exception is explicit audited:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason "<reason>"
```

`late-submit` targets one eligible `timed_out` attempt, reuses normal submit validation, rejects `failed`/`abandoned` attempts and submitted replacement coverage, and cleans up only the conflicting non-submitted retry state required by the accepted contract. It must not grow into automatic late acceptance, lineage guessing, or a general terminal recovery controller.

---

## 8. Terminology Discipline (Reading Conventions)

> Terminology discipline only: the accepted specs (e.g. `agent/delegated-work-units`, `engine/check-inspect-feedback`) own the normative effect of these reading conventions; this model document does not.

### Phase Agent

- Convention: claim delegated queue demand through `operate-work-unit claim`.
- Convention: spawn Sub-agents only with bounded work-unit task prompts.
- Convention: submit returned result JSON through `operate-work-unit submit`.
- Convention: repair submit rejection or explicitly close terminal attempts.
- May invoke explicit audited `late-submit` only for a command-targeted eligible `timed_out` attempt under the accepted contract; it is not the default retry path.
- Convention: run wave gates after phase drain.
- Anti-convention: hand-write submitted ledger rows.
- Anti-convention: use filesystem presence as delegated coverage.
- Anti-convention: use queue completion as delegated success.

### Sub-agent

- Convention: read `task.md`, `_beacon.json`, and `result.schema.json`.
- Convention: preserve `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Convention: write only assigned receipt, output, and cache paths.
- Convention: return schema-valid result JSON.
- Anti-convention: mutate queue, status, plan, gates, chain, or ledger authority.
- Anti-convention: decide phase completion or final answer readiness.
- Anti-convention: fabricate sources, cache trails, receipt events, or output declarations.

### Engine/Gate Interpretation

- Convention: treat `rb_output_declarations.jsonl` submitted work-unit rows as delegated coverage authority.
- Convention: treat `_work_units/` and receipts as cross-check/diagnostic surfaces unless tied to submitted coverage.
- Convention: reject or diagnose direct/orphan delegated artifacts that lack submitted coverage.
- Convention: prefer direct submit facts, prerequisite short-circuiting, and one actionable repair target over cascading validation output.
- Convention: keep normal submit and audited late-submit on the same validation/ledger authority path; never create another delegated completion authority.

---

## 9. Relationship To Other Guidance

- `agentic-execution-model.md` defines the global Chain/Queue/Work Unit model and terminology.
- `agentic-queue-mechanism.md` defines queue demand identity and phase drain.
- `agentic-workflow-mechanism.md` defines phase handoff and gate routing.
- `framework-runtime-boundary.md` defines framework assets versus mutable run bundle state.
- `command-experiments.md` defines how experiments prove the same production boundaries.
- `evolution-simple-reliable-control.md` defines the complexity brake for submit checks, retry paths, and Agent-facing diagnostics.

General rule: accepted specs and executable contracts win over this guideline. If they conflict, fix the guideline through an OpenSpec-aligned change.

---

## Related Guidance

- [OpenSpec Control Map](../../README.md) - guidance roles and reading routes.
- [Project Charter](../../constitution/project-charter.md) - repo-wide charter and authority map.
- [Abstraction as Semantic Precision](../../constitution/evolution/abstraction-semantic-precision.md) - establish a precise bounded work-unit question before introducing a new delegated distinction.
- [Agentic Execution Model](agentic-execution-model.md) - global execution model and terminology canon.
- [Simple Reliable Control](../../constitution/evolution/simple-reliable-control.md) - short delegated paths, direct checks, and smallest actionable root-cause feedback.
- [Helper-Oriented Agent](../../constitution/evolution/helper-oriented-agent.md) - action responsibility and minimal escalation for delegated work.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) - queue demand and phase-local drain.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) - gate, chain, and phase handoff.
- [Framework Runtime Boundary](framework-runtime-boundary.md) - framework assets versus runtime bundles.
- [Command Experiments](../../operations/command-experiments.md) - experiment convergence and verdict boundaries.
