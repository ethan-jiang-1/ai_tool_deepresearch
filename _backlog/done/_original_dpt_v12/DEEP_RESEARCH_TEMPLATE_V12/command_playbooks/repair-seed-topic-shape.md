---
title: "Repair Seed Topic Shape"
role: "write-capable pre-Wave0 seed topic shape normalizer"
scope: "normalize confirmed seed topic files so refill/backfill can use stable anchors before Wave 0 evidence work"
reads:
  - "specs/METHODOLOGY.md"
  - "command_playbooks/check-seed-intake.md"
  - "command_playbooks/check-surfaces.md"
writes:
  - "<RUN_DIR>/seed_topics/*.md"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
---

# Repair Seed Topic Shape

Use this write-capable repair command when user-authored seed topics, migrated seed topics, `check-seed-topic-shape`, `check-seed-intake`, `check-surfaces`, or `check-gate-setup-ready` report that confirmed seed topic files are not in the stable refill/backfill shape.

This command runs after core instantiation and before Wave 0 evidence work. It is setup repair, not research evidence work, and it must not write references, artifacts, `_cache`, final outputs, or `_framework`.

## Goal

Normalize every confirmed seed topic file so later source intake, reference backfill, artifact production, and refill tasks can find stable anchors without relying on chat memory.

## Required Seed File Shape

Each confirmed seed file must expose these upper intake fields as concrete bullets or equivalent headings:

```markdown
- slug: `<topic-slug>`
- must_answer: `<seed must-answer>`
- why_now: `<trigger, time window, or why this topic matters now>`
- boundary: `<in-scope / out-of-scope boundary>`
- evidence_anchors: `<likely source families, evidence route, or source anchors>`
- why_it_matters: `<connection to final deliverable or audience>`
```

Each confirmed seed file must preserve these exact refill/growth headings:

```markdown
## 历史摘要（保留，不修改）

## 本轮新增证据

## 本轮新增机制理解

## 本轮新增趋势与难点

## 当前判断（本轮综合后）

## 待验证问题
```

For topics derived from `original_topic/`, preserve a compact original-context block that cites the single `original_topic/*.normalized.md` file and exposes meaningful `source_anchor`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route` values. Bare field names, `TBD`, `todo`, `pending clarification`, `placeholder`, `{...}`, or generic prose that does not identify the selected object, excluded objects, search guardrails, and evidence route is not repaired context.

## Repair Rules

- Copy or normalize only information that is already present in the seed file, `PLAN_PATH -> Topic Registry`, `PLAN_PATH -> Seed Topic Intake Matrix`, `STATUS_PATH`, or the single normalized original-topic file.
- Do not invent research intent, evidence routes, entity identity, excluded objects, or why-now rationale.
- Preserve existing user-authored prose. Move it under the closest stable section when needed; do not delete it merely because it was informal.
- If a missing upper intake field cannot be recovered, do not invent a value and do not write `TBD`, `pending clarification`, `{...}`, or `gap_queue_backed` into the seed bullet as if it were valid content. Instead, leave the topic unable to pass `check-seed-topic-shape` and mark the intake repair visibly:
  - set the PLAN intake row to `intake_status=gap` or `gap_queue_backed`
  - write a concrete `intake_gap`
  - write a concrete `queue_consequence`
  - sync `STATUS_PATH -> Setup Ready Transition.seed_topic_intake_ready=gap_queue_backed`
  - add or promote QUEUE repair work that names the affected topic and missing field
- `check-seed-topic-shape` passes only after every upper intake field has concrete recovered content. Queue-backed repair is a safe blocked/setup state, not a substitute value inside seed files.
- Missing lower refill/growth headings are mechanical setup repair. Add them with `None yet.` or the existing matching content; do not mark the topic as research-ready merely because the headings now exist.
- Remove unresolved angle placeholders from seed files. If a placeholder cannot be resolved from local context, convert it into an explicit intake gap and queue repair.
- Queue-backed semantic gaps are setup repair state only. If `STATUS_PATH.current_gate` has already advanced past `setup_ready`, do not treat lingering `seed_topic_intake_ready=gap_queue_backed` as a local-sync pass; stop source intake/deepening and repair the seed topic, PLAN intake matrix, STATUS, and QUEUE first.

## Procedure

1. Run the read-only CLI shape check:

   ```bash
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-seed-topic-shape "<RUN_DIR>"
   ```

2. For each failing confirmed topic, open the seed file and the matching PLAN registry/intake row.
3. Add missing canonical upper intake bullets from existing local context.
4. Add missing refill/growth headings in the required order.
5. For original-topic topics, add or repair the `原始语境约束（Original Context Constraints）` block only from normalized original-topic context and existing seed/PLAN text. Mirror the same meaningful context into `PLAN_PATH -> Seed Topic Intake Matrix`; seed-only context and PLAN-only context are both insufficient.
6. Sync PLAN/STATUS/QUEUE when any field remains a gap.
7. Rerun checks in this order:

   ```bash
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-seed-topic-shape "<RUN_DIR>"
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-seed-intake "<RUN_DIR>"
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-gate-setup-ready "<RUN_DIR>"
   ```

Return `PASS` only when shape repair is complete, and only during `setup_ready` may a remaining semantic intake gap be carried as explicit queue-backed repair. Return `FAIL_BLOCKED` if the missing topic intent cannot be recovered without user input.
