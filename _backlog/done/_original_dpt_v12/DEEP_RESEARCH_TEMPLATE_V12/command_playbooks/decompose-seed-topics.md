---
title: "Decompose Seed Topics"
role: "large-topic to seed-topic decomposition command"
scope: "iterative decomposition of an original large topic into formal seed topics"
reads:
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
  - "specs/WORK_DIRECTORY_LAYOUT.md"
writes:
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<TOPIC_ROOT>/*"
  - "<ORIGINAL_TOPIC_DIR>/*"
---

# Decompose Seed Topics

This command turns a large original topic into formal seed topics. It is allowed to be iterative: the user and agent may split, merge, rename, reorder, and sharpen boundaries until the seed topics are useful research handles.

Use it before execution when the run starts from a broad topic.

After execution has begun, `command_playbooks/formalize-topology-delta.md` is the writeback authority for new topics, merges, redirects, and corrected topic shape. This playbook may inform the decomposition method inside that queued topology work, but it must not independently mutate the runtime Topic Registry, status, queue, trace, or topic seed files.

## Input Surfaces

Use either input source:

- `RUN_DIR/original_topic/` when the run keeps local large-topic material and decomposition drafts
- direct user-provided large-topic material when no `original_topic/` directory is needed

`original_topic/` is optional. If upstream has already produced ready seed topics, skip this command and start from `RUN_DIR/seed_topics/`.

## Output Surfaces

Confirmed seed topics are written only to:

```text
RUN_DIR/seed_topics/
```

For confirmed seed topics, the command must also synchronize:

- `PLAN_PATH -> Topic Registry`
- `PLAN_PATH -> Seed Topic Intake Matrix`
- `PLAN_PATH -> Topic Goals`
- `STATUS_PATH -> Directory / Integration State` or topic intake fields
- `QUEUE_PATH` clarification/refill work when a seed topic still has an intake gap
- `TRACE_PATH` only when the decomposition changes direction, corrects a prior topology assumption, or records a reusable diagnostic decision

Pending candidates must not be written to `PLAN_PATH -> Topic Registry`, `Seed Topic Intake Matrix`, or `Topic Goals`. Keep them visible in `Topology Baseline.pending_topic_candidates`, `STATUS_PATH -> Topology Delta`, `QUEUE_PATH` clarification/refill work, or `original_topic/` drafts until they are confirmed.

## Decomposition Standard

Each confirmed seed topic must have:

- stable id and slug
- title
- seed `must_answer`
- initial hypothesis, gap, or tension
- why-now trigger or time window
- boundary and out-of-scope notes
- evidence anchors or likely source families
- original context constraints when derived from a large topic: source anchor, in-scope limits, out-of-scope limits, search guardrails, and evidence route
- why it matters to the final deliverable or audience
- downstream placement when relevant
- explicit intake gaps when any field is still assumed or weak

A seed topic is not a chapter label. It must isolate a decision-relevant angle that can drive evidence search and later Wave 2 synthesis. Its seed `must_answer` entries initialize topic-local investigation targets in `question-list.md`, with coverage recorded in `evidence-summary.md`; target entries may later be split, added, downgraded, or marked `answer_phase=wave1_topic / wave2_synthesis`. Multi-topic runs compare topics; single-topic runs still produce locally backed synthesis rows.

## Original Context Constraint Rule

When decomposing from `original_topic/`, use the single `original_topic/*.normalized.md` file as the canonical upstream topic surface. The raw user Markdown remains provenance, but confirmed seed topics must be derived from the normalized topic so hand-written ambiguity does not leak into source intake.

If the normalized topic file is missing, duplicated, empty, non-English named, or has placeholder residue, stop decomposition and queue original-topic clarity repair instead of generating ready seed topics.

Preserve enough context that later source-intake can search without broadening the topic into a generic web query. Every confirmed topic should carry a compact `原始语境约束（Original Context Constraints）` block in its seed file:

- `source_anchor`: the single `original_topic/*.normalized.md` plus raw original file heading, snippet, or local note when useful.
- `in_scope`: concrete object, claim, comparison set, time window, geography, audience, or system boundary inherited from the original topic.
- `out_of_scope`: nearby but wrong expansions that must not drive search.
- `search_guardrails`: required query terms/entities, allowed synonyms, and forbidden broadening.
- `evidence_route`: preferred source families, likely evidence types, and known noise sources to avoid.

Project the same constraints into `PLAN_PATH -> Seed Topic Intake Matrix.boundary` and `evidence_anchors`; do not add new matrix columns. The projected `source_anchor` must cite the normalized topic file. If the normalized topic does not provide enough constraints to prevent generic search, keep the candidate outside Topic Registry or mark the confirmed topic `intake_status=gap` with concrete clarification/decomposition repair.

## Iteration Rules

- Keep broad, unsettled, or user-original material in `original_topic/` when that directory is used.
- Use `seed_topics/` only for confirmed seed topic files.
- It is valid to revise decomposition drafts repeatedly before confirmation.
- Do not count draft topics in Wave 1.
- Do not hide weak decomposition behind placeholder growth-tail headings.
- If the user wants to keep thinking, leave the topic outside Topic Registry as a pending candidate with concrete next clarification work rather than forcing a premature seed topic.

## Stop Condition

Stop when every confirmed topic has a concrete seed file under `RUN_DIR/seed_topics/`, the plan registry and intake matrix match only those confirmed files, and any remaining uncertain candidates are explicitly marked outside Topic Registry as pending, suspended, archived, redirected, or queue-backed clarification work.
