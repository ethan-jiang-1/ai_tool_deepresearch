---
guideline_id: change-feedback-loop
suite: deep-research-guidelines
title: Change Feedback Loop
status: effective
created: 2026-07-31
revised: 2026-08-09
role: advisory review posture for OpenSpec apply and archive operations
scope: OpenSpec change artifacts and project lifecycle entry guidance
authority: guidance
defers_to:
  - openspec/constitution/project-charter.md
  - openspec/specs/governance/change-feedback-loop/spec.md
  - openspec/governance/finalize-change-archive.mjs
---

# Change Feedback Loop

## Purpose

This guideline helps the current Agent turn review findings into durable OpenSpec work before
implementation or archive. It is not a reviewer service, a lifecycle state machine, a source of
archive authority, or evidence that a review was semantically sufficient.

The authoritative lifecycle contract is the accepted `change-feedback-loop` spec. The selected
change's `tasks.md` is the durable work ledger. The governance finalizer owns only the
deterministic mechanical closeout verdict.

## Apply Review

Before the first target edit of a feedback-lifecycle change, read its proposal, delta specs,
design, tasks, and verification plan. Review whole-change coherence first, then focus on the
risks actually introduced by its touched surfaces:

- Does each requirement have an authoritative owner and a reader-visible, bounded outcome?
- Do writer and reader expectations agree, including re-entry and time boundaries where they
  affect the result?
- Does a new deterministic check read direct facts and return one honest next boundary, rather
  than recreate semantic judgment or a recovery controller?
- Does selected verification prove exactly its deterministic claim without converting fixtures,
  configuration, or instruction text into behavioral evidence?
- Read the selected change's `semantic-closure.yaml`. For an `affected` record, do its bounded
  fact, resolver, `established_by` surfaces, verdict consumers, and overlap declaration cover the
  planned changed surfaces? For `not_applicable`, does its reason still hold for those surfaces?
  A structural semantic-closure checker result does not answer either question.
- For an `affected` record, inspect each `#fragment` against the planned revision. It is valid only
  when it identifies an actual symbol or document anchor; otherwise use a bare file coordinate and
  explain the intended surface in existing prose. Classify roles relative to the family conclusion:
  `consumers` contains only verdict consumers, while an Agent-facing task, schema, starter, or prompt
  that only presents the conclusion uses the applicable `overlap: derived` relation.
- When a fragment or role cannot be established, preserve explicit `unknown` rather than guessing a
  more precise coordinate or forcing a surface into the nearest role. Record false precision,
  projection/consumer misclassification, or unknown as an ordinary unchecked task with the affected
  family or reader question, authoritative owner, smallest repair, and independently observable done
  condition. A structural checker result does not validate fragment/role semantics or complete this
  semantic review.

Complete `openspec-feedback:plan-review` only after this scoped review. A completed marker says
the review step occurred; it does not prove the design, implementation, tests, or future archive
will pass.

## Closeout Review

Before final archive, review the selected change's actual diff, applicable artifacts, and the
selected verification evidence. First establish a change-scoped boundary. If unrelated worktree
changes make that boundary unknowable, stop and report the missing boundary rather than treating
the whole worktree as reviewed.

For a change with delta specs, complete the Agent-owned sync and re-comparison before mechanical
finalization. The comparison remains semantic Agent work: the finalizer neither chooses a merge
nor claims delta/main equivalence.

Review the selected `semantic-closure.yaml` against the actual diff. For an `affected` record,
reassess the bounded fact, resolver, `established_by` surfaces, verdict consumers, and overlap
against the implemented surfaces. For `not_applicable`, reassess the reason against the actual
surfaces. A structural checker PASS is not semantic completeness; record any omission as an
ordinary pending task and repair it through Apply.

For an `affected` record, inspect each `#fragment` against the actual revision. It is valid only
when it identifies an actual symbol or document anchor; otherwise use a bare file coordinate and
explain the intended surface in existing prose. Classify roles relative to the family conclusion:
`consumers` contains only verdict consumers, while an Agent-facing task, schema, starter, or prompt
that only presents the conclusion uses the applicable `overlap: derived` relation.

When a fragment or role cannot be established, preserve explicit `unknown` rather than guessing a
more precise coordinate or forcing a surface into the nearest role. Record false precision,
projection/consumer misclassification, or unknown as an ordinary unchecked task with the affected
family or reader question, authoritative owner, smallest repair, and independently observable done
condition. A structural checker result does not validate fragment/role semantics or complete this
semantic review.

Complete `openspec-feedback:closeout-review` only when the current scoped review has no open
finding and all ordinary repair work is complete. After every task is complete, use the governed
finalizer as the sole supported final transition.

## Findings And Boundaries

When a review finds work to do, add an ordinary unchecked task. State:

- the affected requirement or reader question;
- its authoritative owner;
- the smallest repair; and
- an independently observable done condition.

Leave the relevant review marker incomplete until that task is complete and the review has been
performed again. Do not store a finding only in chat, rewrite a marker to imply semantic proof,
or use a user confirmation as permission to bypass a missing capability or failed deterministic
check.

Operation guidance delivers this posture into the current Agent context. It cannot authorize an
archive. The finalizer reports direct artifact/task/checker/native-archive facts; it cannot decide
whether an Agent's review judgment was good enough.
