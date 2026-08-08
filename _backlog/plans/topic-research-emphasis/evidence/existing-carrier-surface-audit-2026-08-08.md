# Existing Carrier-Surface Audit for Topic Research Emphasis

> Observed: 2026-08-08
> Scope: read-only inspection of the current Harness source. This records
> existing carriers and their boundaries; it does not approve a behavior
> change, mutate a run bundle, or introduce a new contract.

## Question

Can a natural-language research focus brief be retained and used across an
initial run and a later rerun without first adding a canonical Topic field,
parallel settings object, Gate, or another HITL checkpoint?

## Finding

The current structure already has two complementary, durable surfaces:

| Moment | Existing carrier | What it preserves | Boundary |
| --- | --- | --- | --- |
| HITL1 initial focus | `rb_plan.md## Constraints > ### User Research Controls` | A literal user-controls snapshot | Research guidance only; not a profile, Gate, source-floor, receipt, lifecycle, or schema override. |
| HITL2 rerun request | `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` | The user's free-text rerun reason | The HITL2 decision record; it does not itself alter a Topic. |
| Rerun application per affected Topic | Existing `set_rerun_direction` / sanctioned `add_topic` or `update_intent` direction | Agent-authored `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and an excerpt grounded in the HITL2 rationale | It is a current-rerun direction, written only through the existing topic-state operation. |

### Exact-Literal HITL1 Carrier

The existing `render-supplied-controls` operation takes an input snapshot and
renders it verbatim inside the one allowed `User Research Controls` fenced
region. It also selects a fence long enough to preserve backticks in the
input. This is a good fit for the user's original words: they can remain
visible and recoverable without being reduced to a score or parsed into a new
machine-owned shape.

The current Wave0, Wave1, and Final phase instructions already read this
coordinate as guidance. They explicitly forbid it from weakening evidence,
provenance, receipt, source-floor, Gate, queue, or lifecycle obligations.

### Existing Rerun Carrier

For a direction-only adjustment, the existing rerun transaction accepts
`set_rerun_direction`. Its writer atomically renders a `## 本轮重跑方向`
section in the affected current seed Topic. The retained direction has these
required fields:

- `new_search_dimensions`
- `adjusted_depth`
- `search_guardrails`
- `rationale_excerpt`

The last field must be grounded in recorded HITL2 rationale. The other three
are the existing home for the Agent's executable interpretation of how the
next increment of research should differ. The mechanism preserves historical
artifacts and does not rewrite them as if they were new work.

## Resolved HITL1 Authoring Convention

HITL1 has one literal controls snapshot, not separate durable fields for
"the user's exact words" and "the Agent's interpretation." A no-new-structure
design can preserve both by placing two clearly labelled text parts in that
single literal snapshot. The user confirmed this convention on 2026-08-08:
the original wording remains verbatim and the concise Agent interpretation is
visible and user-correctable. It remains an authoring convention rather than
an existing runtime distinction, so any behavior change still needs its normal
OpenSpec path.

## Design Consequence

The smallest compatible design is likely:

1. At HITL1, retain the user's original focus wording verbatim in the existing
   controls snapshot, followed by a clearly labelled, concise Agent
   interpretation that the user can correct before approval.
2. At HITL2, retain the user's rerun rationale verbatim in its existing field.
3. During the sanctioned rerun, translate only the affected Topics into their
   existing direction fields. Do not add a Topic field just to duplicate the
   user-facing brief.

This is now the confirmed UX direction. The remaining question is how a future
Gate should distinguish a real, traceable incremental response from a merely
well-written explanation; see the separate Gate-coverage audit.
