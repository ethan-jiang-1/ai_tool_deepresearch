---
title: "Work Directory Layout Specification"
role: "canonical run bundle directory layout authority"
scope: "where framework rules, original topic material, seed topics, references, artifacts, cache staging, and final outputs live"
reads:
  - "specs/CHARTER.md"
writes: []
---

# Work Directory Layout Specification

This file is the canonical authority for the V12 Deep Research run-bundle directory layout. Directory summaries in command playbooks, output templates, flows, and CLI diagnostics inherit this contract.

Directory structure is a hard contract for LLM agents. Do not invent alternate roots, flatten canonical artifact paths, create root-level `topics/`, or move mutable run data into `_framework/`.

## Instantiated Run Bundle

Instantiation creates this structural bundle before execution starts:

```text
RUN_DIR/
  _framework/
  <PLAN_BASENAME>.profile.md
  <PLAN_BASENAME>.plan.md
  <PLAN_BASENAME>.status.md
  <PLAN_BASENAME>.queue.md
  <PLAN_BASENAME>.trace.md
  AGENTS.md
  CLAUDE.md
  original_topic/        # optional
  seed_topics/
    _reference/          # empty path anchor at instantiation
    _artifacts/
      README.md          # scaffold contract only; not evidence
      wave1_topics/
      wave2/
      shared/
```

The artifact scaffold is a layout/content-framework contract only. It is not evidence and does not count toward source floors. Instantiation must not create execution topic README files, reference README files, `_INDEX.md`, reference files, per-topic artifact directories, produced artifact files, final outputs, Wave 0 evidence, or execution progress.

## Active Execution Shape

After execution starts, the same run bundle grows into this shape:

```text
RUN_DIR/
  _framework/
  <PLAN_BASENAME>.profile.md
  <PLAN_BASENAME>.plan.md
  <PLAN_BASENAME>.status.md
  <PLAN_BASENAME>.queue.md
  <PLAN_BASENAME>.trace.md
  AGENTS.md
  CLAUDE.md
  _cache/                # optional source intake staging area
  original_topic/        # optional
  seed_topics/
    README.md
    <topic seed files>.md
    _reference/
      README.md
      _INDEX.md
      00-shared-*.md
      <topic-id>-*.md
    _artifacts/
      README.md
      wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md
      wave1_topics/<topic-id>-<topic-slug>/question-list.md
      shared/
      wave2/cross-topic-synthesis.md
      wave2/human-decision-brief.md
  final/                 # profile_default final interpretation directory
  final_executive_brief/  # executive_brief HITL2 view
  final_evidence_map/     # evidence_map HITL2 view
  final_claim_judgment/   # claim_judgment HITL2 view
  final_technical_deep_dive/ # technical_deep_dive HITL2 view
  final_custom_{custom_final_report_view_slug}/ # custom HITL2 view with recorded slug
```

## Source Intake Cache Shape

When source retrieval, web search, local lookup, database/API query, or fetch is used, create `_cache/` on demand:

```text
RUN_DIR/_cache/
  intake/<batch-id>/intake-request.md
  intake/<batch-id>/retrieval-results.md
  intake/<batch-id>/candidate-cards.md
  intake/<batch-id>/capture-manifest.md
  captures/                       # optional concrete captures listed by capture-manifest.md
  excluded/<batch-id>-excluded.md
  promote-log.md                  # main-agent fan-in/promotion only
```

`_cache/` is staging, not evidence. It does not count toward source floors, authorize gates, or replace `seed_topics/_reference`.

## Directory Roles

| path | role | mutable |
| --- | --- | --- |
| `RUN_DIR/_framework/` | read-only rule snapshot for this run, including specs, flows, output_templates, command playbooks, CLI helpers, README, COMMANDS, and VERSION-LOG | no by contract |
| `RUN_DIR/AGENTS.md` and `RUN_DIR/CLAUDE.md` | run-root agent instruction files rendered from framework templates | yes, but only as run-root instructions |
| `RUN_DIR/*.{profile,plan,status,queue,trace}.md` | instantiated run control files | yes |
| `RUN_DIR/_cache/` | source intake staging for retrieval batches, captures, candidate cards, excluded-source notes, and main-agent promotion logs | yes |
| `RUN_DIR/original_topic/` | optional upstream large-topic work area, raw user topic, background material, and decomposition drafts | yes |
| `RUN_DIR/seed_topics/` | only formal topic execution root | yes |
| `RUN_DIR/seed_topics/_reference/` | accepted and excluded local reference files | yes |
| `RUN_DIR/seed_topics/_artifacts/` | derived evidence summaries, question lists, and synthesis artifacts | yes |
| `RUN_DIR/final/` | `profile_default` final interpretation output | yes |
| `RUN_DIR/final_executive_brief/` | `executive_brief` final interpretation output | yes |
| `RUN_DIR/final_evidence_map/` | `evidence_map` final interpretation output | yes |
| `RUN_DIR/final_claim_judgment/` | `claim_judgment` final interpretation output | yes |
| `RUN_DIR/final_technical_deep_dive/` | `technical_deep_dive` final interpretation output | yes |
| `RUN_DIR/final_custom_{custom_final_report_view_slug}/` | `custom` final interpretation output using the recorded HITL2 custom slug | yes |

## Hard Boundaries

- `_framework/` is read-only by contract. Do not write gate state, topic registry state, references, artifacts, original topic drafts, seed topics, cache, or final outputs into it.
- `_framework/cli_tools` may run. CLI helpers are read-only diagnostics and must not write evidence, gate state, or run files.
- `_framework/output_templates/*.md` are skeletons only. Do not execute active runs from them and do not copy them over instantiated root control files.
- `seed_topics/` is mandatory for a runnable bundle and is the only active topic root.
- `topics/` is not a V12 active topic root. Migrate to `seed_topics/`; do not run with both.
- `original_topic/` is optional. It exists only when the large topic needs local decomposition work in this run.
- `original_topic/` is not a seed topic root, is not counted in Wave 1, and is not a substitute for Topic Registry.
- `seed_topics/_artifacts/README.md` and empty scaffold directories are structure only. They do not count as produced artifacts, do not satisfy source floors, and do not authorize any Wave gate.
- Wave 1 topic `evidence-summary.md` and `question-list.md` are execution products. Active `QUEUE_PATH` tasks produce them after `topic_unique_ref_count >= 1`; producer_rule=`topic_ref_count_changed` owns initial production and refresh routing.
- Promote useful cache material into `seed_topics/_reference/*.md` only after main-agent fan-in reviews topic alignment, trust/tier, webpage diagnostic, noise risk, and `supports_claims`; source-intake runners must not write `promote-log.md`, references, indexes, topic seeds, artifacts, status, queue, or trace.
- Direct `seed_topics/_reference/*.md` creation is allowed only for already-known local/user-provided sources where the task explicitly says all three negatives: `no retrieval`, `no search`, and `no fetch`.
- Counted reference filenames must preserve provenance: Wave 0 shared foundation uses `00-shared-*`; Wave 1 topic evidence uses `<topic-id>-*`. Opaque global `ref-NNN-*` names are migration residue and must be renamed or replaced before they count in a new V12 run.
- Final output directories from the HITL2 mapping are final interpretation outputs. They are not process artifacts and do not authorize gate passage.

## Canonical Instance Paths

`PLAN_PATH -> Instance Config` must resolve to:

```text
run_dir       = RUN_DIR
framework_dir = RUN_DIR/_framework
profile_path  = RUN_DIR/<PLAN_BASENAME>.profile.md
plan_path     = RUN_DIR/<PLAN_BASENAME>.plan.md
status_path   = RUN_DIR/<PLAN_BASENAME>.status.md
queue_path    = RUN_DIR/<PLAN_BASENAME>.queue.md
trace_path    = RUN_DIR/<PLAN_BASENAME>.trace.md
topic_root    = RUN_DIR/seed_topics
reference_dir = RUN_DIR/seed_topics/_reference
artifact_dir  = RUN_DIR/seed_topics/_artifacts
```

The optional original topic directory is:

```text
original_topic_dir = not_applicable when RUN_DIR/original_topic is absent
original_topic_dir = RUN_DIR/original_topic when the directory exists
```

The final output rule is deterministic and comes from HITL2:

```text
profile_default       -> RUN_DIR/final
executive_brief       -> RUN_DIR/final_executive_brief
evidence_map          -> RUN_DIR/final_evidence_map
claim_judgment        -> RUN_DIR/final_claim_judgment
technical_deep_dive   -> RUN_DIR/final_technical_deep_dive
custom                -> RUN_DIR/final_custom_{custom_final_report_view_slug}
```

## Projection Rule

This file is the directory-layout Source of Record. Update this spec before updating directory summaries in `README.md`, `COMMANDS.md`, command playbooks, output templates, flows, or CLI diagnostics.
