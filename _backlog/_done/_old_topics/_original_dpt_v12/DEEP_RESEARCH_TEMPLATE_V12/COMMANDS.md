# COMMANDS.md - Deep Research Progressive Plan Commands

- role: `human and agent command entry`
- purpose: `route run-bundle instantiation, seed readiness, runtime execution checks, maintenance, and final output`

## What This File Is

This file is the command index for this template package. README explains the package; this file tells a human or agent which command playbook to open for a concrete action.

All new commands belong under `command_playbooks/`. Do not add executable command files back to the package root.

The `cli_tools/check_framework.mjs` helper is read-only. It can report mechanical diagnostics, but it does not write gate evidence, judge research quality by itself, or authorize gate passage.

For canonical run-bundle paths and directory roles, read `specs/WORK_DIRECTORY_LAYOUT.md`. Use `check-instantiation` for a newly created bundle, `check-surfaces` for post-instantiation seed/reference/artifact sync, and `check-runtime` for active-run drift.

## Instantiation Commands

For users and operators, instantiation is one clear action: instantiate a run bundle from this template. The default public command is `instantiate-run-bundle`. When the user points to one Markdown file and says it is the original large topic, use `instantiate-from-original-topic-md` for a guided start that creates the run directory, stores the original topic, derives seed topics, and then finishes structural instantiation. The copy/render playbooks below are internal implementation steps for those public actions, not separate user-facing stages.

| command | file | effect |
| --- | --- | --- |
| `instantiate-from-original-topic-md` | `command_playbooks/instantiate-from-original-topic-md.md` | Guided UX for "this MD is original_topic": derive `deepresearch_<short-slug>`, create the run bundle under the current project root, copy the MD into `original_topic/`, create `seed_topics/`, and stop after instantiation passes. |
| `instantiate-run-bundle` | `command_playbooks/instantiate-run-bundle.md` | Public one-time command that instantiates a run bundle. |
| `check-instantiation` | `command_playbooks/check-instantiation.md` | Structural acceptance verifier for the newly instantiated bundle. |

Internal implementation steps used by instantiation commands:

| step file | role |
| --- | --- |
| `command_playbooks/copy-framework-snapshot.md` | Copy the complete source package into `RUN_DIR/_framework/`. |
| `command_playbooks/render-root-control-files.md` | Render root profile/plan/status/queue/trace plus run-root agent files from local output templates. |

Use instantiation commands only before execution begins. After `check-instantiation` passes, the run is structurally instantiated. Seed readiness and local execution/evidence sync checks may still fail, but those are post-instantiation repairs or execution-readiness issues, not a second kind of instantiation. Do not rerun `instantiate-run-bundle` for routine work.

## Seed Readiness Commands

| command | file | effect |
| --- | --- | --- |
| `decompose-seed-topics` | `command_playbooks/decompose-seed-topics.md` | Iterative large-topic decomposition into formal seed topics. |
| `repair-seed-topic-shape` | `command_playbooks/repair-seed-topic-shape.md` | Write-capable setup repair that normalizes confirmed seed files into the stable refill/backfill shape before Wave 0. |
| `check-seed-intake` | `command_playbooks/check-seed-intake.md` | Verifies confirmed seed topic registry, intake, status, and queue alignment. |

Seed readiness can fail after core instantiation passes. That is a seed/intake problem, not a bundle-instantiation failure.

## Runtime Commands

| command | file | effect |
| --- | --- | --- |
| `check-surfaces` | `command_playbooks/check-surfaces.md` | Focused post-instantiation verifier for seed topics, references, artifacts, and control-file sync. |
| `check-runtime` | `command_playbooks/check-runtime.md` | Execution-phase drift verifier for active runs. |
| `check-queue-receipts` | `command_playbooks/check-queue-receipts.md` | Focused Queue Work Unit Contract and receipt verifier for active runs. |
| `repair-wave1-artifact-steering` | `command_playbooks/repair-wave1-artifact-steering.md` | Foreground Wave 1 repair for missing/stale topic artifacts, question ledgers, and artifact steering receipts. |
| `adjust-profile-parameters` | `command_playbooks/adjust-profile-parameters.md` | Controlled runtime change to research profile, configured floors, must-answer policy, or filters. |
| `formalize-topology-delta` | `command_playbooks/formalize-topology-delta.md` | Controlled runtime topic additions, merges, redirects, and gate consequences. |
| `create-final` | `command_playbooks/create-final.md` | Creates final interpretation output under the deterministic HITL2 `final_output_dir` mapping. |

Runtime commands operate on the instantiated root control files and mutable run directories, not on `_framework/output_templates/*.md`.

Silent autonomous execution is not a separate user command. The Queue object contract lives in `specs/QUEUE_CONTRACT.md`; the execution loop lives in `flows/queue-agentic-flow.md`; `check-queue-receipts` is only a read-only verifier for work-unit fields, preflight `required_receipts`, closeout `completion_receipt`, and named branch receipts. `QUEUE_PATH -> Active Queue` owns User-Visible Stop Authorization, Pre-Response Gate, and Rolling Task Projection state: if the next task is known, execute it instead of reporting it; if a native todo/task/plan surface is available, mirror the rolling execution window there; only final delivery, a concrete decision blocker, or documented empty queue after refill attempts authorizes user-visible output. During ordinary Wave 0/1/2 execution, `stop_authorization_state=unauthorized_continue_required`, `safe_to_interrupt=no`, and `unauthorized_stop_next_action` must point at the next concrete action. HITL2 is a valid decision blocker only after the Wave 2 human-decision brief exists and PROFILE/STATUS/QUEUE are synced to `pending_user`; a Wave 2 recap is not enough. Wave passage, batch completion, artifact refresh, status sync, and "continue or adjust direction?" are not commands and not valid stop states.

Slash commands such as `/goal` are optional user-side enhancements, not framework-controlled queue actions. Do not add `/goal` as a runtime task or command playbook step.

## Maintenance Commands

| command | file | effect |
| --- | --- | --- |
| `repair-framework-snapshot` | `command_playbooks/repair-framework-snapshot.md` | Same-version missing-file repair for an incomplete run-local `_framework/`. |
| `check` | `command_playbooks/check.md` | Lightweight router for check commands and CLI gates. |
| `help` | `command_playbooks/help.md` | First-use guide for command selection. |

`repair-framework-snapshot` is not part of normal initialization. It is maintenance for an already-created run-local `_framework` and must not overwrite root control files.

## CLI Gate Names

Read-only CLI checks use these gate names:

| CLI gate | maps to |
| --- | --- |
| `check-template` | template package structure and projection sanity |
| `check-instantiation` | core instantiation mechanical checks |
| `check-seed-topic-shape` | confirmed seed topic file shape and refill-anchor checks |
| `check-seed-intake` | seed topic registry/intake/status/queue readiness checks |
| `check-surfaces` | post-instantiation local seed/reference/artifact/control-file sync checks |
| `check-runtime` | active-run drift checks |
| `check-queue-receipts` | focused Queue work-unit contract plus preflight/closeout receipt checks |
| `check-gate-instantiation-complete` | focused `instantiation_complete` gate check |
| `check-gate-setup-ready` | composite `setup_ready` preflight over setup status, queue, seed intake, and local surfaces |
| `check-gate-wave0-complete` | focused `wave0_complete` gate check |
| `check-gate-wave1-complete` | focused `wave1_complete` gate check |
| `check-gate-wave2-complete` | focused `wave2_complete` gate check |
| `check-gate-readiness-passed` | focused `readiness_passed` gate check |

CLI output should use `PASS/FAIL E###` style. A CLI `PASS` is supporting evidence for the command playbook checklist, not an independent gate authorization.
