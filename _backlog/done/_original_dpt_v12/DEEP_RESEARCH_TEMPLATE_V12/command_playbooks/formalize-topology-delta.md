---
title: "Formalize Topology Delta"
role: "runtime topology delta command"
scope: "formalize, merge, suspend, archive, or redirect topic changes discovered after execution begins"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<TOPIC_ROOT>/<new-topic-seed-file>"
---

# Formalize Topology Delta

Use this command playbook only after a run already has generated `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH`.

This is a runtime controlled mutation. Do not rerun `command_playbooks/instantiate-run-bundle.md`, do not re-instantiate the run bundle, do not overwrite active run files from skeletons, and do not renumber existing topics.

## Inputs

Required:

- `PLAN_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- triggering evidence or local reference paths
- candidate description and affected existing topic(s)

If any generated control file is missing, stop and recover the active run files rather than using the template creator again.

## Trigger Conditions

Record a topology candidate before changing the topic count when evidence shows one of these conditions:

- the same unclassified concept, object, actor, mechanism, or risk appears in at least two independent accepted references
- a topic boundary is repeatedly breached by evidence needed to answer the final deliverable
- a contradiction exposes an independent problem cluster rather than a normal open question
- a source route reveals an object list, comparison set, or artifact need that current topics cannot own cleanly
- a redirect decision would move work to a topic that does not yet exist

Weak or single-source signals remain `[涌现]` questions in the affected topic seed. They do not enter `PLAN_PATH -> Topic Registry`.

## Discovery Record

Before triage, update only runtime status and queue files:

- `STATUS_PATH -> Topology Delta.pending_topic_candidates`
- `STATUS_PATH -> Topology Drift Review.unresolved_new_topic_candidates`
- `QUEUE_PATH` with a candidate to triage the topology delta

Do not change `PLAN_PATH -> Topic Registry` during discovery.

## Triage Decisions

Choose exactly one decision for each candidate. When multiple candidates are present, record one semicolon-separated candidate entry and one semicolon-separated disposition entry in the same order; do not put multiple final decisions in one disposition entry.

| decision | meaning | required writeback |
| --- | --- | --- |
| `merge_existing` | current topic registry can own the candidate | update affected topic seed, queue, and status delta; no new topic id |
| `formalize_new_topic` | candidate is an independent problem cluster | append a new topic id and complete the formalization steps below |
| `suspend` | important but blocked or not currently researchable | write branch disposition with reopen trigger |
| `archive` | unlikely to change the current deliverable | write branch disposition with why and reopen trigger |
| `redirect` | current work should move to another existing or newly formalized topic | update queue and branch disposition; formalize first if the redirect target does not exist |

## Formalize New Topic

When decision is `formalize_new_topic`, perform these writes in order:

1. Append the next stable topic id at the end of `PLAN_PATH -> Topic Registry`; never insert before existing rows, reorder rows, or renumber existing topics.
2. Add the matching row in `PLAN_PATH -> Seed Topic Intake Matrix`.
3. Add the matching `PLAN_PATH -> Topic Goals` block.
4. Create the new topic seed file physically under `TOPIC_ROOT` with upper-section intake fields and the stable growth-tail sections; a file that resolves only beside the run control files is not valid.
5. Update `STATUS_PATH -> Topology Delta` with candidate, decision, trigger refs, new topic id, affected gates, sync state, and reopen consequence.
6. Set `STATUS_PATH -> Plan / Status Sync.topology_sync_state = synced` only after plan, status, queue, trace, and seed file are consistent. Runtime qualification cannot pass a formalized topic while this field remains `status_pending` or `plan_pending`.
7. Add or promote `QUEUE_PATH` work for intake clarification, Wave 1 evidence, seed backfill, and artifact production as needed.
8. Append a `TRACE_PATH` diagnostic entry with `tags: topology_formalization`.

## Gate Consequence

Formalization can invalidate a previously passed gate. Apply this default:

- if the affected gate has not passed, keep the current wave open and refill current-wave work
- if Wave 1 already passed and the new topic needs Wave 1 evidence, restore `current_gate=wave0_complete`, set `current_wave=Wave 1`, and refill Wave 1 work
- if Wave 2 already passed and the new topic changes synthesis coverage, restore `current_gate=wave1_complete` or the last still-valid prior gate, then refill Wave 1 and Wave 2 work as needed
- if `readiness_passed` is already set, a substantive new topic is not post-readiness maintenance; reopen the affected earlier wave

Record `gate_reopen_state`, `reopened_from_gate`, `reopen_reason`, and `invalidated_claims` in `STATUS_PATH`, then add matching repair work in `QUEUE_PATH`. The queued work must name the affected concrete gate or wave and the repair target, such as Wave 1 evidence inventory, seed backfill, artifact refresh, Wave 2 synthesis, or retrieval audit; generic "refill affected gate" wording is not sufficient.

## Completion Checklist

Return `PASS` only when all applicable items are true:

| check | requirement |
| --- | --- |
| no re-instantiation | no instruction or action reran `instantiate-run-bundle.md` |
| candidate disposition | every pending candidate has `merge_existing / formalize_new_topic / suspend / archive / redirect` |
| append-only topic id | new topic id is appended at the end of Topic Registry and existing ids are unchanged |
| plan sync | Topic Registry, Seed Topic Intake Matrix, and Topic Goals agree |
| status sync | Topology Delta records decision, trigger refs, affected gates, sync state, and reopen consequence |
| queue sync | queue contains next work for the merged or formalized topology |
| seed file | formalized topic has a concrete topic seed file physically under `TOPIC_ROOT` |
| trace | structural decision is appended in `TRACE_PATH` |
| gate consequence | affected passed gates are reopened and concrete same-wave repair work is queued |

If a candidate lacks enough evidence to decide, return `FAIL_BLOCKED` only when no safe queue-backed next action can clarify it. Otherwise return `FAIL_FIX`, keep the candidate pending, and queue the concrete clarification work; do not return `PASS` until the candidate has a disposition.
