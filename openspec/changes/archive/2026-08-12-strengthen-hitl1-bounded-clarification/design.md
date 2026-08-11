## Context

See [proposal.md](proposal.md) for motivation and the three delta specs for
requirements. HITL1 is already the recommendation-first `stop: yes` decision
boundary. Its existing Phase writes accepted profile/status/topic facts, then
continues through the established style, access-probe, Gate, and handoff path.

`rb_profile.yaml` remains the structured owner for accepted profile,
must-answer, and recorded HITL1 facts. `rb_plan.md` is the durable narrative
anchor that survives a canonical Topic Registry refresh. The existing
`setup-ready` checker already rejects a template-owned required-fill marker,
but it does not parse a named Goal subsection or evaluate research semantics.

## Goals / Non-Goals

**Goals:**

- Give the user one reviewable Chinese research-alignment draft before the
  existing HITL1 canonical writes.
- Keep any proactive clarification small, decision-relevant, and inside the
  existing HITL1 conversation.
- Preserve the accepted or delegated research understanding as a concise Goal
  narrative that survives the existing Topic-state transaction.
- Reuse the current marker scan only as a missing-template-content signal and
  verify the existing setup-ready handoff remains intact.

**Non-Goals:**

- No new lifecycle state, checkpoint, status enum, transition, queue, counter,
  parser, schema field, Gate rule, retry loop, or Engine semantic evaluator.
- No migration or inferred historical intent for existing bundles.
- No change to `User Research Controls`, canonical Topic identity, profile
  ownership, access-probe behavior, or the existing Gate/trace authority.
- No claim that static Markdown or JavaScript fixtures prove the quality of an
  Agent's clarification judgment.

## Decisions

### Keep the clarification inside the existing HITL1 boundary

`brief/hitl1.md` presents a research-alignment draft before canonical writes.
It states the current goal, research object, decision/delivery use, scope, and
the already proposed must-answer set, Topic map, and research profile. It is a
reviewable recommendation, not a new persisted decision object.

The Agent may present a first batch of at most three questions only when each
one is an independent, currently answerable material fork. Every question
names its recommendation/default and the existing structured decision it
would change. Dependent questions wait. A user may answer only part of the
batch, accept the recommendation directly, correct it in natural language, or
delegate the remaining choice to the Agent. Those exits all resolve the same
existing HITL1 decision; the Agent restates the resolved understanding and
continues the existing path.

There is no new state-machine transition. The existing `stop: yes` interaction
and `passed -> setup` transition remain the sole control shape. In particular,
implementation must not introduce a question-count field, `clarification_mode`,
queue, sentinel, or a separate HITL0/HITL3 branch. A one-question-only loop was
rejected because it adds needless turns for independent material forks; an
unbounded interview was rejected because it has no normal stopping point.

### Use one narrative snapshot and preserve the structured owners

New `rb_plan.md` templates add `### HITL1 Alignment Snapshot` immediately after
`### Scope`, with one ordinary required-fill marker. Once the existing HITL1
decision is accepted, corrected, or explicitly delegated, the Phase replaces
that marker with a concise narrative containing:

- the user-confirmed goal or explicit delegation fact;
- the Agent's final object/use/scope understanding;
- resolved material forks and transparent defaults; and
- a short link to the accepted must-answer, Topic, and profile decisions.

The ownership split is deliberately narrow:

| Fact | Source of Record | Boundary |
| --- | --- | --- |
| Accepted profile, must-answer set, HITL marker | `rb_profile.yaml` | Remains structured and Gate-readable. |
| Accepted research understanding and defaults | `rb_plan.md## Goal > ### HITL1 Alignment Snapshot` | Narrative reload context only. |
| Optional focus and source/delivery controls | Existing `### User Research Controls` literal snapshot | Its format and meaning remain unchanged. |
| Gate/status/trace/handoff verdicts | Existing Engine/CLI path | Does not interpret alignment prose. |

The Phase writes the alignment snapshot before accepted profile/status and
canonical Topic-state writes. It then writes the existing controls snapshot,
performs the existing status synchronization and Topic-state apply, and resumes
the current style/probe/Gate sequence. The canonical Topic-state helper already
refreshes only the Topic Registry presentation; verification must prove the new
Goal subsection survives that transaction and its recovery boundary.

If a later existing canonical write blocks, the earlier snapshot remains readable
narrative context, not proof that a profile/status/Topic fact exists and not
permission to advance. The Agent follows the same existing repair/recovery owner;
there is no snapshot-specific recovery state. It updates the narrative only when a
new resolved user decision changes it.

No new host-file parser or renderer is introduced. The controls renderer stays
the sole owner for its literal controls form; it must not be reused to encode
alignment prose. A general Markdown semantic-section parser was rejected
because the snapshot needs no deterministic structural interpretation beyond
the established marker scan.

### Reuse the existing marker check without promoting it to a semantic Gate

The new template marker is covered by the current `setup-ready` required-fill
scan. That scan observes only the residual marker pattern in the host-file body
after a valid controls literal is excluded; it does not identify template ownership.
The checker, Gate definition, rule count, and route remain unchanged. An unfilled
marker blocks the existing rule; replacing or deleting the marker does not prove
that the named heading remains or that the prose is complete or faithful. This gives
a useful normal-template omission signal without asking the Engine to decide user
intent.

Existing/non-template bundles remain compatible: an absent alignment subsection
does not create a new Gate failure or migration task. The new marker applies to
newly instantiated bundles only.

### Preserve the existing legal handoff and declare its affected fact family

Adding a required-fill marker changes one input to the existing `setup-ready`
admission result. The change-local `semantic-closure.yaml` therefore declares
`lifecycle.gate-status-trace-handoff` as affected. Its resolver is the existing
`check-gate-setup-ready.mjs`; its relevant consumer is existing phase-entry
handoff validation. The static template and HITL1 writer establish the input;
they are not verdict consumers.

The shortest legal loop is unchanged:

```text
alignment draft -> existing HITL1 decision -> alignment + controls snapshots
  -> existing profile/status/topic-state/style/probe writes
  -> existing HITL1 Gate -> existing setup-ready Gate -> existing handoff
```

This is a net simplification relative to a new clarification state or a prose
parser: it adds one durable reader-facing paragraph while reusing every
deterministic controller and retry boundary already present.

### Apply the constitutional responsibility split

The semantic question for the snapshot is bounded: “What confirmed or delegated
research understanding explains the current structured research decisions?” A
reader can stop after the snapshot and the existing structured owners; missing
new semantics still return to the user.

The user decides material research meaning or delegates it. The Agent evaluates
materiality, presents the recommendation, records the resolved narrative, and
executes the already-authorized writes and reruns. The Engine continues to
decide only deterministic structure, marker presence, Gate results, status,
trace, and handoff. User wording does not create a permission, transition, or
Gate override.

## Risks / Trade-offs

- [An Agent writes vague or inaccurate narrative prose] -> The snapshot remains
  explicitly human/Agent-readable context, not a semantic Gate claim; the
  user-facing draft and direct correction/delegation exits are the review
  boundary.
- [The first presentation becomes a questionnaire] -> HIU-002 limits it to at
  most three independent material forks, defers dependent questions, and keeps
  direct accept/delegation available without a round counter.
- [Topic-state apply loses the snapshot] -> Extend the existing host-file
  preservation/recovery contract test before relying on the Phase ordering.
- [A later canonical write fails after the snapshot] -> Treat the snapshot as
  readable narrative only, use the existing profile/status/topic-state repair
  owner, and assert the Phase does not turn it into advancement authority.
- [A marker is mistaken for semantic validation] -> Specs, Markdown tests, and
  the focused Gate test state that the existing scan detects only residual
  required-fill markers.
- [A legacy bundle appears incomplete under the new template] -> Do not add a
  named-heading rule or migration; old bodies retain their current behavior.

## Migration Plan

1. Update the HITL1 brief, shared UX guidance, Phase instructions, and new
   bundle template together.
2. Extend the selected deterministic tests for prompt shape, template-marker
   behavior, snapshot preservation, and setup-ready handoff.
3. Publish the Agent-facing behavior as `v0.87` in `CHANGELOG.md` and the
   `DEEP_RESEARCH_HARNESS/RUN.md` banner.

No runtime data migration is required. Rollback restores the prior framework
Markdown/template; bundles that already contain an alignment snapshot remain
ordinary readable Markdown to the prior framework and retain their existing
structured facts.
