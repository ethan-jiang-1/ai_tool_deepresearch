## Context

See `proposal.md` for the problem statement and selected capabilities. The
current Harness already has the required interaction and persistence carriers:

- `phase-hitl1.md` currently asks the Agent to produce a `3-5` Topic preview,
  but no Engine schema, Gate, or canonical Topic contract imposes that upper
  bound. The existing HITL1/Seed Topics path still requires at least one
  approved canonical Topic before research begins.
- HITL1 already persists optional narrative controls in the one literal
  `rb_plan.md## Constraints > ### User Research Controls` snapshot. Its pure
  renderer preserves literal content and does not parse it into profile, Gate,
  or queue state.
- HITL2 already records the user's free-text rerun rationale in
  `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`; the existing
  `phase-rerun.md` turns that recorded rationale into a legal topic-state
  candidate and existing per-Topic `## 本轮重跑方向` guidance.

The change must keep Markdown as the Agent-facing flow surface and retain the
Engine as the owner of canonical Topic identity, approved mutation, Gate,
receipt, trace, and transition truth. It therefore modifies guidance and the
existing narrative carriers only. There is no current deterministic focus
coverage verdict; that is deliberately deferred to P2.

## Goals / Non-Goals

### Goals

- Replace the HITL1 cardinality anchor with a minimum independent Topic map:
  at least one proposed Topic in the preview, no preset upper cap, and
  reviewable grouping when the map is large. The existing one-approved-Topic
  lower bound remains applicable after user acceptance.
- Let a novice state optional Topic research emphasis in ordinary language and
  see a concise Agent interpretation that they can correct inside the current
  HITL1 or HITL2 loop.
- Preserve the original wording and current interpretation through the
  existing HITL1 controls snapshot or HITL2 rationale, and turn an accepted
  rerun focus only into the current rerun's existing per-Topic guidance.
- Preserve the no-focus path and historical evidence boundary without a new
  interaction point or deterministic control layer.

### Non-Goals

- No canonical Topic field, profile enum, focus settings object, numeric
  weight, source-count quota, or parser for free text.
- No focus Gate, coverage state, Wave route, trace event, receipt, or third
  HITL. P2 alone may propose traceable focus coverage.
- No reader-facing evidence projection, historical evidence relabeling, or
  reference/index redesign. P3 owns that work.
- No migration or reinterpretation of existing run bundles, prior rationale,
  or prior evidence.

## Decisions

### 1. Reuse labelled narrative layers instead of creating a focus data model

At HITL1, the recommendation-first prompt will invite an optional `research
focus brief` after the Topic map and baseline recommendation. The user may
omit it, accept the Agent's proposed interpretation, or correct it in the
existing loop. For an accepted focus, the existing literal controls snapshot
will visibly retain two labelled narrative parts:

1. the user's focus wording verbatim; and
2. the Agent's concise current interpretation, explicitly marked as
   user-correctable before the decision is accepted.

These are ordinary literal snapshot content, not fields that the renderer,
Engine, Gate, or downstream consumer parses as authority. Existing non-focus
controls remain compatible: an absent focus leaves the existing no-controls or
ordinary-controls form in place, and a focus may coexist with other literal
research controls in the same snapshot.

At HITL2, a user who chooses the existing legal `rerun` decision may state a
new or revised focus in the existing natural-language exchange. The Agent
reflects the interpretation and, when accepted, records the same two labelled
narrative layers inside the existing `rationale` string. No new HITL2 enum,
profile field, or route is introduced.

**Alternative rejected:** a per-Topic `focus` field, parallel settings file,
or structured focus parser would make free-text semantics look Engine-owned,
would need migrations and deterministic contracts, and would duplicate the
carriers that already preserve the needed human-readable context.

### 2. Define Topic count as semantic decomposition, not an effort budget

HITL1 will ask the Agent to propose the smallest independent Topic map that
preserves distinct must-answer questions, evidence routes, or delivery value.
The preview must contain at least one proposed Topic and has no preset maximum.
After the user accepts it, the existing approved-Topic lower bound remains the
only runnable-map cardinality contract.
When it is large, the Agent groups related Topics into reviewable research
threads and explains why the split exists. It does not offer a count target,
numeric budget, weight form, or source quota.

The existing Topic-state and Gate lower-bound behavior remains unchanged. The
Agent proposes semantics; the user approves or corrects them at HITL1; the
existing legal topic-state operation still establishes canonical identity.

**Alternative rejected:** retaining `3-5` as a soft default or replacing it
with a new maximum would continue to anchor an arbitrary number and blur the
difference between Topic independence and research effort.

### 3. Rerun direction applies only to the new increment

`phase-rerun.md` will read the accepted labelled HITL2 rationale as the source
for the current rerun's semantic direction. It will use the existing
topic-state candidate and `## 本轮重跑方向` fields to express new search
dimensions, depth, guardrails, and a rationale excerpt for affected Topics.
Old direction sections and all prior evidence remain historical context. They
cannot satisfy, or be represented as newly produced work for, a new or revised
focus.

The phase keeps its current `stop: no` posture. It does not ask another
question, rewrite historical artifacts, or bypass the accepted topic-state,
rerun-ready Gate, or route-bound handoff.

**Alternative rejected:** a separate rerun-focus confirmation or a new
historical-coverage interpretation would create a third checkpoint or a
second evidence authority. The existing HITL2 decision and rerun direction
already provide the shortest legal path.

### 4. Keep deterministic and semantic claims separate in verification

Static and deterministic tests will prove the literal carrier, prompt,
ordering, no-cap guidance, and no-leak boundaries. They do not prove that an
LLM understood a focus. Existing and new real Subject-Agent playbooks will
observe the HITL1 no-focus path, a broad-map/focus correction, and the HITL2
rerun handoff. Such runs retain their actual transcript and trace verdict, and
report `NOT_RUN` when the independent Agent or required tools are unavailable;
they never substitute a fixture PASS.

An observed Agent-flow asset whose native runtime is unacceptable is not a
fourth execution tier. Its retained native report remains diagnostic evidence,
but the playbook moves to the existing `exp_extrem_slow/` quarantine and is
removed from the active manifest and verification-routing claims. The static
rerun carrier contract remains the P1 proof for current-direction and
history-boundary behavior; quarantining a failed or slow native canary cannot
convert its fixture or prose into Agent-behavior evidence.

## Risks / Trade-offs

- **A focus is mistaken for Engine authority** -> Keep it inside existing
  literal narrative carriers; state in prompt, phase, and tests that it cannot
  override schema, Gate, profile, or lifecycle contracts.
- **A novice sees too many choices** -> Make focus optional and
  recommendation-first; expose no weights, source floors, Waves, or queues.
- **A broad question still yields five Topics by habit** -> Remove the only
  `3-5` anchor, state the no-cap rule explicitly, and make semantic grouping
  the large-map presentation rule.
- **A rerun makes history look current** -> Require current guidance to derive
  from the accepted current rationale and retain prior directions/evidence as
  history only.
- **Static Markdown tests overclaim Agent behavior** -> Keep their claims to
  text/order/carrier facts and use the routed real-Agent playbooks for observed
  natural-language behavior.

## Migration Plan

1. Update the selected HITL1/HITL2/rerun Markdown control surfaces and their
   focused verification assets. Do not modify Engine schemas, gates, or
   current run bundles.
2. Existing bundles with no controls subsection, no focus wording, or older
   free-form rationale continue on their current no-focus/legacy paths. Do not
   backfill labels or reinterpret their evidence.
3. If the new guidance must be rolled back before P2, revert the Markdown and
   verification changes. No persistent migration, compatibility adapter, or
   state rollback is required because this change creates no new structured
   authority.

## Open Questions

None. The user has confirmed the common baseline, natural-language focus,
existing-carrier, no-upper-cap, rerun-history, and deferred-Gate boundaries.
