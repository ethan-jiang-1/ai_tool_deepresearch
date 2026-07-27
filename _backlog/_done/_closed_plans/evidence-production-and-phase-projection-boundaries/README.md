# Review Packet Index

This directory holds detailed context for the
`evidence-production-and-phase-projection-boundaries` planning packet. It does
not contain an approved OpenSpec change or implementation tasks.

Read [the parent plan](../evidence-production-and-phase-projection-boundaries.md)
first. It contains the scope, bug-to-system mapping, a code-fact list with
`file:line` anchors, a falsification step that must run before two of the
changes are designed, three proposed change boundaries, the one unowned policy
decision, residual risk, and questions for independent review.

Then read [architecture-review.md](architecture-review.md). It explains why the
plan splits by source of record, the existing helpers to expose rather than
rebuild, the proposed queue and ownership interfaces, degradation ordering,
rejected designs — including two that an earlier draft dismissed by assertion —
and the required negative proofs mapped to bugs.

**Both files were revised on 2026-07-26 after their premises were checked
against current code.** Two premises were falsified: the canonical seed merge
already exists, and the engine already appears to permit a legal shared-reference
producer. Where the prose and the parent plan's code-fact list disagree, the
code-fact list wins, and accepted OpenSpec specifications and executable code
remain the authority over both.

The linked BUG-124--131 records in the parent plan are the original runtime
observations. This packet is deliberately a reviewable plan for the next
proposal phase, not an approved OpenSpec change.
