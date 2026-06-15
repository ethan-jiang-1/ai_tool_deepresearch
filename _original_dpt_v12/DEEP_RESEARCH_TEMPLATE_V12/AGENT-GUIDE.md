---
title: "Agent Guide"
role: "agent operating guide and maintainer reference"
scope: "how agents should navigate, instantiate, execute, and maintain this template package"
reads:
  - "COMMANDS.md"
  - "specs/CHARTER.md"
  - "specs/WORK_DIRECTORY_LAYOUT.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Agent Guide

This guide is for Codex, Claude, and other agents working inside `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12/`. README is the short human entrypoint; this file carries reusable agent operating rules.

## First Move

Start from `COMMANDS.md`, then open the command playbook that matches the task. Do not invent a workflow from memory.

After a run passes instantiation, operate from the five generated root control files in `RUN_DIR`:

```text
<PLAN_BASENAME>.profile.md
<PLAN_BASENAME>.plan.md
<PLAN_BASENAME>.status.md
<PLAN_BASENAME>.queue.md
<PLAN_BASENAME>.trace.md
```

Do not run an active research workflow from `_framework/output_templates/*.md`; those files are skeletons only.

For long-running work, assume chat context may be stale. Before any gate audit, Wave transition, HITL2 decision, Readiness preflight, or final output, reopen the five root control files from disk. Do not rely on a prior PLAN excerpt in chat history.

## File Responsibilities

- `PROFILE_PATH`: selected profile, root must-answer set, configured profile parameters, overrides, and HITL1/HITL2 human decisions.
- `PLAN_PATH`: topic design, gate targets, local authority pointers, and execution blueprint.
- `STATUS_PATH`: current run state, gate audits, counters, gaps, blockers, and retrieval checks.
- `QUEUE_PATH`: executable work and promotion rules.
- `TRACE_PATH`: append-only diagnostic checkpoints.

Shared rules live under `specs/`. The canonical directory structure lives in `specs/WORK_DIRECTORY_LAYOUT.md`; command playbooks and output templates only project it where needed. A generated run may point to its local `_framework/specs/*`, but run-specific data that can change must remain outside `_framework/`.

`TRACE_PATH` is not a substitute for live status, but it is the recovery surface for why the run moved, blocked, repaired, or changed gates. If STATUS and QUEUE say what is true and next, TRACE explains the diagnostic path that made that state defensible.

## User-Facing Language

User-visible interaction must be Chinese-first: startup guidance, HITL prompts, decision blockers, parameter-change confirmations, completion notes, and final delivery should use plain Chinese. Keep internal enum values, file paths, field names, command names, and provider ids in their canonical English form. When an English term is useful for the user, write it in bilingual form such as `人工确认（human-in-the-loop / HITL）` or `说法验证（claim verification）`; do not expose raw enum values as the user's primary choices.

## Profile And Human Checkpoints

The public startup profile is mandatory and mutually exclusive. Ask for it with Chinese-first user-facing labels, then write the canonical enum internally:

- 快速事实答案（quick factual） -> `quick_factual`
- 探索地图（exploratory map） -> `exploratory_map`
- 说法验证（claim verification） -> `claim_verification`

HITL1 happens before execution: choose the profile and capture what the final Deep Research result must answer. Tell unsure users they may write "我不确定，先帮我拆问题"; record that as a visible clarification gap instead of guessing.

HITL2 happens after Wave 2 synthesis assessment and before Readiness. It is not a Wave 2 recap. First prepare `ARTIFACT_DIR/wave2/human-decision-brief.md`, classify answerability, and sync PROFILE/STATUS/QUEUE into the HITL2 `pending_user` state with `stop_authorization_state=decision_blocker`, `unauthorized_stop_next_action=not_applicable`, and `safe_to_interrupt=yes`; only then explain, in plain Chinese, what can be answered, what cannot yet be answered or needs caution, and what repair would add. Then ask for final report view（final report view）, repair and rerun（repair and rerun）, or stop blocked（stop blocked）. Record `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`, and user-decision enums only in internal fields. `request_view_revision` is only an intermediate blocked state: queue concrete view clarification, then record the revised `final_report_view`, mapped `final_output_dir`, and `user_decision=proceed_to_readiness` before Readiness.

`PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` is the HITL2 Source of Record. `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` must match it before Readiness, with `PROFILE hitl2_checkpoint_status=recorded`, `STATUS hitl2_wave2_readiness_decision_status=recorded`, and the PROFILE Human Decision Checkpoints `HITL2_wave2_readiness_decision` row `status=recorded`. Final output directories are deterministic: `profile_default -> final/`, `executive_brief -> final_executive_brief/`, `evidence_map -> final_evidence_map/`, `claim_judgment -> final_claim_judgment/`, `technical_deep_dive -> final_technical_deep_dive/`, and `custom -> final_custom_{custom_final_report_view_slug}/`.

Human approval cannot override failed evidence gates, missing local references, uncovered synthesis-phase must-answer entries, missing topics, or `answerability_class=blocked_repair_required`.

HITL does not include middle-wave progress reporting. Wave 0 completion, Wave 1 completion, ordinary Wave 2 completion, source-intake batch completion, artifact refresh, status sync, and "the next task is known" are not reasons to stop. Keep `stop_authorization_state=unauthorized_continue_required`, keep `safe_to_interrupt=no`, and execute `unauthorized_stop_next_action` until the HITL2 pending-user decision state is fully written, final delivery is ready, a concrete non-HITL2 decision blocker is recorded, or documented empty queue after refill attempts is recorded.

## Execution Spine

Execution follows:

```text
PROFILE intent and root must-answer
-> PLAN targets and configured gates
-> STATUS gaps and audit rows
-> QUEUE executable work
-> local file writes plus STATUS/QUEUE sync
-> TRACE checkpoint for diagnostic turns or gate transitions
```

If the next executable queue task is known, do it. Routine progress, passed gates, synced status, refreshed artifacts, and known next tasks are not final user-visible output. After Wave 0, Wave 1, or Wave 2 gate passage, start the next non-chat continuation action before any recap; "continue?", "continue or adjust direction?", and "await user review" are invalid while queue work exists.

## Evidence Rules

Accepted evidence must become local reference files under `seed_topics/_reference/`. Counted references need auditable fields, local paths, source family, trust/tier, source date scope, supported claims, webpage diagnostic fields when applicable, and seed-backfill status.

Topic artifacts live under:

```text
seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md
seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/question-list.md
seed_topics/_artifacts/wave2/cross-topic-synthesis.md
seed_topics/_artifacts/wave2/human-decision-brief.md
```

`question-list.md` carries the four-section Wave 1 exploration ledger: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision. `evidence-summary.md` carries Topic Target Coverage and synthesis judgment. They are not interchangeable.

## Cost Control

Reduce friction before weakening evidence quality:

- keep seed topics bounded and decision-relevant
- choose the profile honestly
- use scarcity exceptions only with visible confidence consequences
- produce topic artifacts progressively at trigger points
- use source-intake cache/delegation for noisy retrieval, but keep main-agent fan-in ownership

Even `quick_factual` is still an anti-shallow-research profile. It does not skip Wave 0, Wave 1, Wave 2, artifacts, HITL2, trace, or Readiness.

## Maintainer Checklist

When changing framework rules:

1. Update the canonical authority first, usually `specs/CHARTER.md`, `specs/GATES.md`, `specs/METHODOLOGY.md`, or `specs/RESEARCH_PROFILES.md`.
2. Update only the projections needed for a generated run to execute without rereading the source template package.
3. Keep README short; put reusable agent guidance here.
4. Search for non-current enum names, field names, and invariant phrases with `rg`.
5. Run `git diff --check`, `check-template`, and regression tests when MJS checker alignment is involved.
