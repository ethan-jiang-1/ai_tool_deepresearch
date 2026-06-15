---
title: "Deep Research Progressive Plan Template V12"
role: "package entrypoint"
scope: "what this package is, how to start, and where humans/agents should look next"
reads: []
writes: []
---

# Deep Research Progressive Plan Template V12

> version_source: `specs/CONSTANTS.md -> Template Package Identity.current_version`
> status: directory-package template

V12 creates a Markdown-governed Deep Research run bundle. It turns a broad research need into confirmed seed topics, local evidence, topic-level artifacts, Wave 2 synthesis, a human final-decision checkpoint, and Readiness.

Start from `COMMANDS.md` when choosing what to do. Use `AGENT-GUIDE.md` for agent operating rules and maintainer notes. README is only the short entrypoint.

## Runtime Shape

Instantiation creates one run bundle under `RUN_DIR`:

```text
RUN_DIR/
  _framework/                    # read-only local framework snapshot
  <PLAN_BASENAME>.profile.md     # run-specific user intent and profile decisions
  <PLAN_BASENAME>.plan.md        # topic design and gate targets
  <PLAN_BASENAME>.status.md      # current state, audits, gaps, counters
  <PLAN_BASENAME>.queue.md       # executable work queue
  <PLAN_BASENAME>.trace.md       # diagnostic checkpoints
  original_topic/                # optional upstream decomposition material
  seed_topics/
    _reference/
    _artifacts/
  final/ or one deterministic HITL2 final_* directory such as final_executive_brief/ or final_custom_{custom_final_report_view_slug}/
```

`_framework/` is read-only by contract. Mutable run-specific data belongs in the run root files, `seed_topics/`, `seed_topics/_reference/`, `seed_topics/_artifacts/`, `_cache/`, or final output directories.

## Research Profiles

Before execution, the user must choose exactly one public research mode:

- 快速事实答案（quick factual）: low-risk, narrow factual answer.
- 探索地图（exploratory map）: coverage map with unknown zones and priorities.
- 说法验证（claim verification）: support/weaken/confidence judgment for claims.

The concrete run choice, root must-answer list, configured floors, overrides, and HITL1/HITL2 human decisions live in `<PLAN_BASENAME>.profile.md`. The shared preset rules live in `specs/RESEARCH_PROFILES.md`.

There are two 人工确认（human-in-the-loop / HITL）checkpoints:

- HITL1: choose a 研究模式（research profile）and write 最终报告必须回答的问题（final must-answer）. If the user is unsure, the run records a visible clarification gap instead of guessing.
- HITL2: after Wave 2 synthesis assessment, prepare the human-decision brief and sync PROFILE/STATUS/QUEUE to the HITL2 `pending_user` state before asking the user. Only that explicit state may stop for final report view（final report view）, repair and rerun（repair and rerun）, or stop blocked（stop blocked）; a plain Wave 2 recap is not HITL2. A view revision request queues clarification and cannot enter Readiness until the revised view is recorded with `PROFILE.hitl2_checkpoint_status=recorded`, `STATUS.hitl2_wave2_readiness_decision_status=recorded`, the PROFILE checkpoint row `status=recorded`, and `user_decision=proceed_to_readiness`.

Wave 0, Wave 1, and ordinary Wave 2 progress are not HITL checkpoints. During middle-run execution, `QUEUE_PATH -> Active Queue.stop_authorization_state` normally stays `unauthorized_continue_required`, `STATUS.Resume Checkpoint.safe_to_interrupt` stays `no`, and `unauthorized_stop_next_action` names the next concrete tool/file/search/check/refill/promotion action. Do not ask "continue?", "continue or adjust direction?", or "await user review" while executable queue work exists.

## Main Commands

| need | command |
| --- | --- |
| See all commands | `COMMANDS.md` |
| Start from one original-topic Markdown file | `command_playbooks/instantiate-from-original-topic-md.md` |
| Instantiate a run bundle | `command_playbooks/instantiate-run-bundle.md` |
| Check core instantiation | `command_playbooks/check-instantiation.md` |
| Check seed-topic readiness | `command_playbooks/check-seed-intake.md` |
| Audit active runtime drift | `command_playbooks/check-runtime.md` |
| Check local seed/reference/artifact sync | `command_playbooks/check-surfaces.md` |
| Repair missing/stale Wave 1 artifact steering | `command_playbooks/repair-wave1-artifact-steering.md` |
| Adjust profile parameters after instantiation | `command_playbooks/adjust-profile-parameters.md` |
| Formalize a new/split/redirected topic | `command_playbooks/formalize-topology-delta.md` |
| Create final output after Readiness | `command_playbooks/create-final.md` |
| Get help finding the right command | `command_playbooks/help.md` |

## Agent Entry

For Codex, Claude, or another coding/research agent working in this directory:

1. Read `AGENT-GUIDE.md`.
2. Use `COMMANDS.md` to choose the command playbook.
3. Never execute an active run from `_framework/output_templates/*.md`; those are skeletons only.
4. After instantiation, operate on the five root control files in the run directory.
5. Before gates, HITL2, Readiness, or final output, reload all five root control files from disk; chat context is not state.
6. Before any user-visible output during execution, check `stop_authorization_state`; if it is `unauthorized_continue_required`, continue the named `unauthorized_stop_next_action` instead of reporting progress.

## Spec Authority Map

| path | role |
| --- | --- |
| `specs/CONSTANTS.md` | package version, enums, placeholders, reusable field names |
| `specs/CHARTER.md` | Source-of-Record rules and projection map |
| `specs/WORK_DIRECTORY_LAYOUT.md` | canonical run-bundle directory layout and path boundaries |
| `specs/GATES.md` and `specs/gates/*.md` | gate index and pass/fail specifications |
| `specs/RESEARCH_PROFILES.md` | shared profile preset authority |
| `specs/METHODOLOGY.md` | evidence, backfill, artifact, trace, and source-intake method |

## Render Skeleton Map

These files are rendering inputs for instantiated runs. They turn the spec set into generated root files and run-root agent instructions.

| path | renders |
| --- | --- |
| `output_templates/PROFILE.md` | skeleton for `<PROFILE_PATH>` |
| `output_templates/PLAN.md` | skeleton for `<PLAN_PATH>` |
| `output_templates/STATUS.md` | skeleton for `<STATUS_PATH>` |
| `output_templates/QUEUE.md` | skeleton for `<QUEUE_PATH>` |
| `output_templates/TRACE.md` | skeleton for `<TRACE_PATH>` |
| `output_templates/RUN_ROOT_AGENTS.md` | template for generated `RUN_DIR/AGENTS.md` |
| `output_templates/RUN_ROOT_CLAUDE.md` | template for generated `RUN_DIR/CLAUDE.md` |

For detailed file roles, cost-control guidance, seed-topic intake rules, and maintainer drift checks, use `AGENT-GUIDE.md`.
