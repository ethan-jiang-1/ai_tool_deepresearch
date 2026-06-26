---
title: "Check Instantiation"
role: "core instantiation verifier"
scope: "verify the earliest valid run-bundle start state before seed intake and evidence execution"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
writes: []
---

# Check Instantiation

This command verifies only the core instantiated run bundle.

It does not judge seed-topic readiness, local execution/evidence files, reference inventories, artifact quality, Wave gate counts, synthesis matrices, runtime drift, or active-run repairs. Use `command_playbooks/check-seed-intake.md` after this passes, and use local-sync/runtime checks only after execution begins or when post-instantiation local files may have drifted.

User-facing terminology: a run is instantiated when this core check passes. Later `check-surfaces` failures mean seed/reference/artifact/control-file readiness or drift problems, not that the template needs to be instantiated again.

## Inputs

- `RUN_DIR`
- `PROFILE_PATH`
- `PLAN_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- `RUN_DIR/_framework`
- `RUN_DIR/seed_topics`
- `RUN_DIR/seed_topics/_reference`
- `RUN_DIR/seed_topics/_artifacts`
- `RUN_DIR/seed_topics/_artifacts/README.md`
- `RUN_DIR/seed_topics/_artifacts/wave1_topics/`
- `RUN_DIR/seed_topics/_artifacts/wave2/`
- `RUN_DIR/seed_topics/_artifacts/shared/`

If any required path is missing or ambiguous, return `FAIL_BLOCKED`.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | the run bundle is structurally instantiated and ready for seed-intake checking | run `check-seed-intake` or continue with the next explicit seed task |
| `FAIL_FIX` | the bundle is structurally wrong but repairable from local context | repair mutable files outside `_framework`, then rerun |
| `FAIL_BLOCKED` | required local paths or instance parameters are missing | record the blocker and ask for missing input |

## Core Checks

### 1. Framework Snapshot

- `RUN_DIR/_framework/` exists.
- `_framework` contains the complete required framework package for its version, including `cli_tools/`.
- `_framework/output_templates/*.md` are skeletons only and may contain placeholders.
- `_framework` does not contain root control files, `seed_topics/`, `original_topic/`, references, artifacts, final output, or Wave evidence.

### 2. Root Control Files

- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH` exist directly under `RUN_DIR`.
- None of the five root control files lives under `_framework` or `_framework/output_templates`.
- The five root control files backlink each other by basename.
- The five root control files contain no unresolved instantiation placeholders, output skeleton headings, output frontmatter, or boundary comments.
- Runtime metavariables such as `<batch-id>`, `<topic-id>`, `<topic-slug>`, `<ref-file>`, and `<NN>` may remain only inside explicit schema/template/pattern guidance. They fail instantiation if they appear in active state values, configured paths, confirmed topic rows, active queue tasks for a concrete batch, gate flags, counts, accepted inventory rows, or trace entries.

### 3. Instance Paths

- `PLAN_PATH.Instance Config.run_dir` resolves to `RUN_DIR`.
- `PLAN_PATH.Instance Config.profile_path` resolves to `PROFILE_PATH`.
- `PROFILE_PATH -> Profile Binding` resolves the same `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH`.
- `framework_dir` resolves to `RUN_DIR/_framework`.
- `topic_root` resolves to `RUN_DIR/seed_topics`.
- `reference_dir` resolves to `RUN_DIR/seed_topics/_reference`.
- `PROFILE Profile Binding.artifact_dir` resolves to the absolute `RUN_DIR/seed_topics/_artifacts`.
- `PROFILE HITL2 Wave 2 Readiness Decision.hitl2_decision_brief_path` resolves to the absolute `ARTIFACT_DIR/wave2/human-decision-brief.md`.
- `original_topic_dir` is `not_applicable` when absent, or resolves to `RUN_DIR/original_topic` when that directory exists.
- Mutable run paths are outside `_framework`.

### 4. Artifact Scaffold

- `ARTIFACT_DIR/README.md` exists from instantiation.
- `ARTIFACT_DIR/wave1_topics/`, `ARTIFACT_DIR/wave2/`, and `ARTIFACT_DIR/shared/` exist from instantiation.
- `ARTIFACT_DIR/README.md` names the canonical layout and states that this scaffold is not evidence, does not count toward source floors, and contains no produced topic or synthesis artifacts yet.
- `ARTIFACT_DIR/README.md` names the production owner for Wave 1 topic artifacts: active `QUEUE_PATH` tasks after `topic_unique_ref_count >= 1`, routed by producer_rule=`topic_ref_count_changed`.
- No per-topic artifact directory such as `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/` is required at instantiation time.
- No concrete artifact file such as `evidence-summary.md`, `question-list.md`, `cross-topic-synthesis.md`, or `human-decision-brief.md` is required or created at instantiation time.

### 5. Minimal Runtime Command Entrypoint

- `PLAN_PATH -> Runtime Command Entrypoint` exists.
- `framework_command_index` resolves to `RUN_DIR/_framework/COMMANDS.md`.
- `framework_cli_check` resolves to `RUN_DIR/_framework/cli_tools/check_framework.mjs`.
- `runtime_profile`, `runtime_plan`, `runtime_status`, `runtime_queue`, and `runtime_trace` resolve to the five instantiated root control files.
- No command binding points to the source template package or to `_framework/output_templates/*.md`.
- The section tells agents entering the run to open local `_framework/COMMANDS.md` first, while operating on root control files.

### 6. Initial State

- `STATUS_PATH` has `state=not_started`.
- `STATUS_PATH` has `current_mode=instantiation_only`.
- `STATUS_PATH` has `current_wave=Instantiation`.
- `STATUS_PATH` has `current_gate=instantiation_complete`.
- `STATUS_PATH` has `next_gate=setup_ready`.
- `QUEUE_PATH` has `execution_mode=sequential`.
- `QUEUE_PATH` has a stable `## Active Queue` anchor and does not activate parallel work by default.
- `TRACE_PATH` starts with `none_recorded_yet: yes`.

## Non-Goals

These failures belong to later checks, not core instantiation:

- missing concrete seed topic intake substance
- artifact local-reference citation quality
- accepted reference inventory enum or column completeness
- webpage material diagnostics
- Wave gate count mismatches
- Wave 1 floor, scarcity, or topic-unique normalization
- Wave 2 conclusion matrix quality
- active-run queue refill or runtime drift
- post-instantiation local sync drift
