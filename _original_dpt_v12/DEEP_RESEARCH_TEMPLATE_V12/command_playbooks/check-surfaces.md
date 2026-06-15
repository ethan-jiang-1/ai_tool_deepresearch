---
title: "Check Local Sync"
role: "post-instantiation local sync verifier"
scope: "state-aware audit of seed_topics, _reference, _artifacts, and generated control-file sync after run-bundle instantiation"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
  - "flows/reference-artifact-backfill.md"
writes: []
---

# Check Local Sync

Use this verifier whenever local execution/evidence files may have drifted after run-bundle instantiation: after user-provided seed topics are accepted, after decomposition, during setup, after reference backfill, after artifact production or refresh, after topology formalization, and before `command_playbooks/check-runtime.md`.

This command is not part of instantiation. It checks files used by an already-instantiated run: seed topics, references, artifacts, and their control-file sync. A failure here means local execution/evidence state is incomplete or out of sync; it does not mean the run bundle should be instantiated again.

This command is read-only. It may inspect files and run the read-only CLI helper, but it must not repair seed topics, references, artifacts, status, queue, or trace. If a mismatch is found, return `FAIL_FIX` and require the execution agent to repair the relevant file set, then rerun this check.

When invoked from the `setup_ready` gate, this verifier is part of the composite setup preflight. Inspect the full target run directory shape and the local content surfaces listed below before allowing setup to pass; setup is the last cheap correction point before source intake or evidence execution begins.

## Inputs

Local sync checking requires concrete paths for:

- `PLAN_PATH`
- `PROFILE_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- `RUN_DIR`
- `TOPIC_ROOT`
- `REFERENCE_DIR`
- `ARTIFACT_DIR`

If a required path is missing or ambiguous, return `FAIL_BLOCKED`.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | seed, reference, artifact, and control files are mutually consistent for the run's current state | continue execution or proceed to runtime qualification |
| `FAIL_FIX` | a local file set is missing, stale, malformed, or out of sync | repair the named file set and rerun |
| `FAIL_BLOCKED` | required files or user decisions are unavailable | record blocker and ask only for the missing input |

## State-Aware Rule

This command can run after structural instantiation has passed, including setup, Wave 0, Wave 1, Wave 2, and Readiness. Do not apply completion-state requirements to an earlier state.

However, a topic that has entered `PLAN_PATH -> Topic Registry` is a confirmed seed topic. Confirmed seed topics are strict about visibility from the moment they enter the registry:

- the seed file must resolve under `TOPIC_ROOT`
- the seed file must expose concrete upper-section intake substance, or during `current_gate=setup_ready` the missing upper-section field must be recorded as `intake_status=assumption/gap` with visible queue-backed repair
- the seed file must preserve stable growth headings
- `PLAN_PATH -> Seed Topic Intake Matrix`, `STATUS_PATH` topic blocks, and `QUEUE_PATH` repair work must agree with any intake gaps; `seed_topic_intake_ready=gap_queue_backed` may pass setup only and must remain a Wave 0 topic-start / Wave 1 blocker until repaired

Pending broad topics, undecomposed material, and weak candidates are allowed only when they remain visible as concrete decomposition work, concrete intake gaps, concrete pending topology candidates, or queue-backed clarification work. Do not treat them as confirmed seed topics. Boilerplate field names, generic refill candidates, and `status_sync` token lists such as `pending_topic_candidates` or `topic_intake_gap` do not count as visible pending work by themselves.

## Local Sync Checklist

Return a structured checklist:

| local sync check | result | local evidence inspected | repair if failing |
| --- | --- | --- | --- |
| topic root layout | `<pass/fail/blocked>` | `<TOPIC_ROOT / REFERENCE_DIR / ARTIFACT_DIR>` | `<repair or none>` |
| seed topic files | `<pass/fail/blocked>` | `<Topic Registry / seed files>` | `<repair or none>` |
| intake and status sync | `<pass/fail/blocked>` | `<Seed Topic Intake Matrix / STATUS topic blocks / QUEUE>` | `<repair or none>` |
| reference file set | `<pass/fail/blocked>` | `<_reference / accepted inventories / _INDEX>` | `<repair or none>` |
| artifact file set | `<pass/fail/blocked>` | `<_artifacts / STATUS artifact paths / artifact citations>` | `<repair or none>` |
| profile/control-file repair work | `<pass/fail/blocked>` | `<PROFILE / QUEUE / TRACE when applicable>` | `<repair or none>` |

### 1. Topic Root Layout

- `TOPIC_ROOT = RUN_DIR/seed_topics`
- `REFERENCE_DIR = RUN_DIR/seed_topics/_reference`
- `ARTIFACT_DIR = RUN_DIR/seed_topics/_artifacts`
- `_framework/` remains read-only and contains no seed topics, references, artifacts, final outputs, or run control files
- root-level `topics/`, `_reference/`, or `_artifacts/` directories are non-canonical and are not active V12 file sets
- from instantiation, `ARTIFACT_DIR/README.md`, `ARTIFACT_DIR/wave1_topics/`, `ARTIFACT_DIR/wave2/`, and `ARTIFACT_DIR/shared/` exist as non-evidence scaffold
- after setup/execution starts, `TOPIC_ROOT/README.md`, `REFERENCE_DIR/README.md`, and `REFERENCE_DIR/_INDEX.md` exist

### 2. Seed Topic Files

For every confirmed row in `PLAN_PATH -> Topic Registry`:

- `id`, `slug`, `title`, `seed_files`, and `must_answer` are concrete
- every `seed_files` entry resolves to a real file under `TOPIC_ROOT`
- a seed file is not assigned to multiple registry rows
- the seed file exposes its slug and `must_answer`
- the seed file has concrete upper-section intake substance: why-now trigger or time window, boundary or out-of-scope notes, evidence anchors or source families, original context constraints when derived from `original_topic/`, and why-it-matters; if a field is missing, the corresponding intake matrix/status/queue surfaces record the gap and repair work
- when a seed file is derived from `original_topic/`, the seed file and the matching intake matrix row both expose CLI-checkable meaningful `source_anchor`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route` values; field labels alone, `TBD`, `todo`, `pending clarification`, `placeholder`, `{...}`, raw-only source anchors, or generic boundary/evidence-anchor prose are not enough unless the topic is explicitly queue-backed for context repair during setup
- the seed file has no unresolved `<placeholder>` residue
- the seed file preserves stable growth headings:
  - `历史摘要（保留，不修改）`
  - `本轮新增证据`
  - `本轮新增机制理解`
  - `本轮新增趋势与难点`
  - `当前判断（本轮综合后）`
  - `待验证问题`

Missing lower growth headings are setup-repairable, but a confirmed topic fails this check until they are present. Missing upper-section substance or missing original context constraints pass this local-sync check only when explicit, queue-backed, and the run is still at `current_gate=setup_ready`; they still prevent Wave 0 topic-start passage and non-generic Wave 1 evidence work until repaired.

### 3. Intake And Status Sync

- every Topic Registry row has one matching `PLAN_PATH -> Seed Topic Intake Matrix` row
- every intake row names the same `id/slug` as a Topic Registry row
- every confirmed topic has a matching `STATUS_PATH` topic block with the same `topic_id` and `topic_slug`
- status must not carry extra active topic blocks absent from Topic Registry
- intake fields `must_answer`, `why_now`, `boundary`, `evidence_anchors`, `why_it_matters`, and `intake_status` are concrete; for topics derived from `original_topic/`, `boundary` and `evidence_anchors` preserve CLI-checkable meaningful `source_anchor`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route` values specific enough to prevent generic external search
- when per-topic `intake_status=gap / assumption`, or when `intake_gap` / `queue_consequence` is not `none`, both `intake_gap` and `queue_consequence` are concrete and `QUEUE_PATH` contains visible clarification, decomposition, intake, seed, or repair work for that topic; status uses run-level `seed_topic_intake_ready=gap_queue_backed` rather than `yes` until the gap is resolved
- if `STATUS_PATH.current_gate` has advanced beyond `setup_ready`, lingering `seed_topic_intake_ready=gap_queue_backed` or per-topic semantic intake gaps are local-sync failures, not passable assessed setup state

### 4. Reference File Set

- after setup/execution starts, `REFERENCE_DIR/README.md` and `REFERENCE_DIR/_INDEX.md` exist
- every row counted in Wave 0 or Wave 1 accepted inventories has a concrete `local_ref_path`
- every counted `local_ref_path` resolves under `REFERENCE_DIR`
- counted references are local evidence files, not URLs, artifacts, final outputs, or files under `_framework`
- counted reference filenames preserve provenance: Wave 0 shared references use `00-shared-*.md`, Wave 1 topic evidence uses `<topic-id>-*.md`, and shared foundation reused by a topic remains explicitly recorded as `00-shared-*`
- opaque global filenames such as `ref-001-*` are migration residue; they fail this check when they are counted, cited as backing refs, or proposed as newly promoted V12 evidence
- `_INDEX.md`, accepted inventories, topic seed citations, artifacts, and synthesis backing refs name the same local reference paths
- reference files remain evidence Source of Record; `_INDEX.md` is navigation only

### 5. Artifact File Set

- `ARTIFACT_DIR/README.md` exists and states that scaffold structure is not evidence, does not count toward source floors, and that Wave 1 topic artifacts are produced later by active `QUEUE_PATH` tasks after `topic_unique_ref_count >= 1` through producer_rule=`topic_ref_count_changed`
- every topic status block has canonical topic artifact paths:
  - `seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`
  - `seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/question-list.md`
- when status claims an artifact is produced (`done` or `produced_at_ref_count > 0`), the file exists
- when `topic_unique_ref_count >= 1` and either artifact has `produced_at_ref_count=0`, `QUEUE_PATH` has the initial two-artifact production work in `slot_1_current` or `slot_2_next`, or the current task explicitly produces both files; a Refill Pool-only candidate is a fail before any further Wave 1 source-intake, cross-topic handoff, or topic deepening
- produced artifacts cite local reference paths, not URL-only evidence
- artifact citations resolve to files under `REFERENCE_DIR`
- produced `evidence-summary.md` contains substantive synthesis and Topic Target Coverage, not a placeholder: it names key evidence, mechanism/current judgment, limits or open issues, `target_ids`, `coverage_status`, backing refs or queue consequence, last updated reference count, and local reference paths
- produced `question-list.md` is the topic exploration ledger, not an empty shell, copied seed-question list, or generic brainstorm; it records the four-section ledger in order: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision, with trigger evidence and queue consequence
- when a topic has new accepted evidence, `question-list.md` and the seed topic `待验证问题` section agree on resolved, partial, open, internal-data, and `[涌现]` question states
- when an artifact is stale by two or more accepted references, `QUEUE_PATH` contains visible artifact refresh work for the topic before another same-topic search/deepening task runs

### 6. Control-File Repair Work

- repair tasks in `QUEUE_PATH` name the concrete source of the gap: `PLAN_PATH` target, `STATUS_PATH` field, gate audit failure, source-intake trigger, topology trigger, or artifact/reference freshness trigger
- repair tasks include the local files they will write and the status fields they will sync; generic tasks such as `continue research`, `advance wave`, `update status`, or `summarize findings` do not count as visible repair work
- when trace lag, artifact staleness, reference rename, or question-list drift is discovered, the queue contains same-wave repair work rather than advancing the gate

### 7. Runtime Relationship

`check-surfaces` is narrower than `check-runtime`. It does not authorize gate passage, judge source quality in full, or perform Readiness closeout. It verifies that post-instantiation local execution/evidence files are structurally usable and mutually synchronized.

Before `command_playbooks/check-runtime.md` returns `PASS`, the runtime verifier must either run this command or complete this checklist as the `local sync integrity` subcheck.

## CLI Support

When available, the read-only CLI helper may be used:

```text
node <FRAMEWORK_DIR>/cli_tools/check_framework.mjs --gate check-surfaces <RUN_DIR>
```

CLI output is supporting evidence for the checklist. It is not a gate authorization and must not be written as evidence by the helper itself.

## Outcome Rule

Return `PASS` only when every applicable local sync check passes for the run's current state. Return `FAIL_FIX` when local repairs can restore consistency. Return `FAIL_BLOCKED` only when a missing file, path, or user decision cannot be inferred or repaired locally.
