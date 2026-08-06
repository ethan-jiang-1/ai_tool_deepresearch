---
guideline_id: change-feedback-loop
suite: deep-research-guidelines
title: Change Feedback Loop
status: effective
created: 2026-07-31
role: advisory review posture for OpenSpec apply and archive operations
scope: OpenSpec change artifacts and project lifecycle entry guidance
authority: guidance
defers_to:
  - guidelines/project-charter.md
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
