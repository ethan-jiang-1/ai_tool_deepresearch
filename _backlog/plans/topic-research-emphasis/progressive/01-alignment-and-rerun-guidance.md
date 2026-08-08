# P1: Natural-Language Alignment and Rerun Guidance

> OpenSpec change: `align-topic-focus-and-rerun-guidance`
> Status: archived as `2026-08-08-align-topic-focus-and-rerun-guidance`
> Dependency: P0 complete

> Archive outcome: completed in commit `504a3d8cb`. Deterministic carrier and
> workflow contracts passed; retained real Agent-flow attempts remain
> `NOT_RUN` or quarantined diagnostic failure, never semantic-success proof.

## Goal

Make the confirmed user experience durable using existing carriers: a minimal
independent Topic map, a natural-language focus brief with a visible Agent
interpretation, and rerun guidance that applies only to new incremental work.
This slice establishes the behavioral input needed by later assurance work.

## Scope Lock

In scope:

- Replace the inherited `3-5` Topic-generation anchor with the approved
  minimum-independent-map rule while preserving the existing lower bound of
  one approved Topic and no artificial upper cap.
- Extend HITL1 authoring guidance so the existing User Research Controls
  snapshot keeps the user's wording verbatim and a clearly labelled,
  user-correctable Agent interpretation.
- Align HITL2/rerun guidance so a new or revised focus is translated through
  existing rationale and per-Topic rerun direction, while old work stays
  historical context rather than current incremental coverage.
- Add the smallest routed verification proving natural-language acceptance,
  no new checkpoint, a narrow one-Topic map, a broad map beyond five when
  semantically warranted, and a focus-aware legal rerun.

Out of scope:

- new canonical Topic fields, Topic weights, source-count quota controls, or
  a separate configuration surface;
- focus-specific Gate fields, Gate routing, or coverage verdicts (P2);
- reader-facing reference/projection redesign (P3);
- any requirement that a user learn Wave names, queues, formulas, or internal
  enums.

## Candidate Capability Discovery

The formal proposal must repeat this discovery with current evidence. Current
planning candidates are:

| Capability | Initial disposition | Reason |
| --- | --- | --- |
| `agent/hitl-ux` | Modify | Owns recommendation-first natural-language HITL1/HITL2 interaction. |
| `research/user-research-controls` | Modify | Owns the one durable controls snapshot and its guidance-only boundary. |
| `research/pre-research-phase-content` | Modify | Owns HITL1 capture ordering and Agent-readable phase content. |
| `workflow/rerun-incremental-node` | Modify | Owns rationale-to-rerun preparation, not downstream research semantics. |
| `workflow/rerun-topic-integration` | Verify-only | Must preserve incremental traceability and existing direction behavior. |
| `research/canonical-topic-state` | Verify-only | Stable identity and sanctioned mutation must not be widened. |
| `research/research-styles` | Verify-only | Common baseline parameters must not become per-Topic weights. |

## Definition of Ready

- [x] P0 exit review is complete.
- [x] `openspec list --json` shows no overlapping active change, or the overlap
  is explicitly resolved before proposal creation.
- [x] The proposal has re-read the current candidate main specs and records a
  complete capability-discovery table.
- [x] The user-facing examples specify what the Agent will echo, what the user
  may correct, and what remains unchanged when no focus is supplied.
- [x] The proposal identifies direct source records for raw user wording,
  Agent interpretation, rerun rationale, and existing topic direction.

## Progressive Checklist

### Proposal and design

- [x] Create proposal with Chinese scope, non-goals, version-bump assessment,
  capability discovery, and the original plan/evidence coordinates.
- [x] Write delta specs only for behavior actually changing; keep
  canonical-topic identity and style floor behavior verify-only if unchanged.
- [x] Write design explaining why the two labelled text layers are Agent
  guidance rather than Engine authority, and why the minimum-independent map
  preserves a reader's semantic Topic question.
- [x] Add a closed `verification-plan.yaml` using canonical test classes.
- [x] Generate `tasks.md` with one plan-review marker, one closeout-review
  marker, requirement IDs, owners, and independently observable done
  conditions.

### Apply and evidence

- [x] Complete plan review before any target edit.
- [x] Update the selected HITL/controls/rerun Agent-facing owners only; do not
  hand-edit runtime state or invent an alternate snapshot writer.
- [x] Add focused deterministic tests for literal controls retention and the
  generated minimum-independent map contract where an Engine-owned behavior
  exists.
- [x] Add/update an `agent_flow_e2e` playbook case for a user who accepts or
  corrects a natural-language focus at HITL1, plus a legal HITL2 rerun case.
- [x] Prove deterministically that a rerun does not represent prior evidence
  as newly produced; retained Agent-flow evidence is recorded separately.
- [x] Record actual commands, trace evidence, and residual risk in the change.

### Closeout

- [x] Run the selected tests plus workflow/package validation required by the
  actual changed surfaces.
- [x] Run `check-verification-routing.mjs` in plan and assets modes, strict
  OpenSpec validation, requirement traceability, and main-spec checks.
- [x] Conduct closeout review, sync accepted delta behavior to main specs when
  applicable, re-compare, then archive through the governed finalizer.

## Exit Check and Handoff

P1's deterministic contracts establish that focus can be carried without a new
interaction point and that a legal rerun preserves historical provenance. The
handoff to P2 is this verified carrier/direct-coordinate model, not an
Agent-semantic success claim or a claim that focus coverage has passed a new
Gate.
