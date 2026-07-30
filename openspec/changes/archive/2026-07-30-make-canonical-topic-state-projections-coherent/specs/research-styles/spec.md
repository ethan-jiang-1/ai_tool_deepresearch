> req: RES-002, RES-007, RES-008

## MODIFIED Requirements

### Requirement: Profile stores research style parameters after HITL1

The system SHALL store research style parameters in `rb_profile.yaml` under
`research_style_params`. `apply-research-style.mjs` SHALL remain the sole
Agent-facing profile writer: it reads the selected style definition and the
committed canonical `rb_plan.md#/topic_registry.length`, computes the complete
object through the existing pure computation, and replaces only
`research_profile` and `research_style_params`. All other profile sections,
including `root_must_answer_set`, human decision checkpoints, rerun fields, and
`research_access`, SHALL retain their semantic values.

HITL1 SHALL record the user-selected `research_profile`, commit canonical topic
state, then invoke the existing style writer using that selected profile before
the HITL1 readiness checkpoint. A topic-state result whose committed registry
length invalidates the existing params SHALL return the structured style handoff
owned by this CLI; it SHALL not mutate the profile itself. The relevant HITL1 or
rerun readiness checkpoint SHALL call one side-effect-free style-projection
freshness evaluator that compares current params to the shared computation for
the current committed registry and selected profile. The evaluator SHALL not
read/write a bundle, select a style, or create a lifecycle result; both Gates
SHALL reuse its classification. Absent,
partial, wrong-profile, or stale params SHALL produce one direct
style-projection root with the exact existing CLI command and same-check rerun.
This validates freshness; it does not create a second style writer, a generic
style controller, or a new user decision.

When C5 lineage validation explains rerun-time style recomputation, current
`research_profile` SHALL equal the event-bound value and all fields outside
`research_style_params` plus the separately sanctioned event-bound
`rerun_count` delta SHALL remain semantically equal to the event-bound
after-profile. At either the event-bound current count or recorded next count,
unchanged event-bound style parameters remain compatible; if a style delta
exists, its only explainable shape is the complete exact object returned from
the event-bound style definition and current committed canonical topic count.
At current count, an exact projection differing from event-bound params SHALL
project the existing phase-rerun count owner. This explanation SHALL not modify
the C5 event, prepared manifest, profile schema, stage/action vocabulary, or
downstream rule authority, and SHALL not turn C5 into a general style writer.

#### Scenario: HITL1 applies parameters via CLI

- **WHEN** a user selects `claim_verification` during HITL1 and canonical
  topic-state applies five topics
- **THEN** the Agent SHALL run
  `apply-research-style.mjs --bundle <path> --style claim_verification` after
  the committed five-topic registry exists
- **AND** stdout SHALL report `topic_count: 5` and the corresponding complete
  parameter object
- **AND** the Agent SHALL verify the JSON result and successful exit before the
  HITL1 readiness checkpoint
#### Scenario: Gate CLI reads dynamic threshold from profile
- **WHEN** gate CLI evaluates a `count_floor` rule with `threshold_source` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`
- **THEN** it SHALL resolve the threshold by reading the value at that path in `rb_profile.yaml`

#### Scenario: Rerun recomputes parameters when topic_registry changes
- **WHEN** phase-rerun adds or removes topics and updates `topic_registry` in `rb_plan.md`
- **THEN** it SHALL re-run `apply-research-style.mjs --bundle <path> --style <research_profile>` to recompute `wave0_shared_ref_total` with the updated topic count
- **AND** the recomputed `research_style_params` SHALL replace the previous values in `rb_profile.yaml`
- **AND** all unrelated profile sections, including `research_access`, SHALL retain their semantic values
- **AND** phase-seed-topics (rerun-aware mode) SHALL synchronize `action: add` and `action: remove` results with `topic_registry` before passing control to wave0

#### Scenario: Stale HITL1 projection returns one existing-owner action

- **WHEN** `research_style_params` were computed for zero topics but the
  committed canonical registry contains five topics
- **THEN** the HITL1 readiness checkpoint SHALL fail with one
  style-projection freshness root
- **AND** feedback SHALL name `apply-research-style.mjs`, the selected profile,
  committed count, and rerun of that same checkpoint

#### Scenario: Style apply preserves research access observation
- **WHEN** `rb_profile.yaml` contains a valid available or unavailable `research_access` observation before `apply-research-style.mjs` runs
- **THEN** the same observation SHALL remain present and semantically unchanged after style parameters are written

#### Scenario: Old bundle without research_style_params
- **WHEN** gate CLI evaluates a `count_floor` rule and `rb_profile.yaml` has no `research_style_params` section
- **THEN** it SHALL fall back to the hardcoded `threshold` value in the gate definition JSON

#### Scenario: Legacy profile fallback remains bounded

- **WHEN** a pre-C2 bundle lacks `research_style_params` outside a
  C2-authorized HITL1/rerun freshness checkpoint
- **THEN** existing `count_floor` fallback behavior SHALL remain
  readable-compatible
- **AND** this compatibility SHALL not make a current HITL1/rerun readiness
  checkpoint accept an absent required style projection

#### Scenario: Unrelated profile drift remains blocked
- **WHEN** a post-final rerun profile changes `research_profile`, any unrelated profile field, or has style params equal to neither the unchanged event-bound object nor the exact current shared computation
- **THEN** C5 and reentry lineage validation SHALL reject the profile as unexplained drift
- **AND** a correct value in some other style field SHALL NOT mask that drift

#### Scenario: Exact style projection before count increment is resumable
- **WHEN** the existing style CLI has written an exact current projection that differs from event-bound params but `rerun_count` still equals the event-bound current count
- **THEN** C5 and reentry SHALL retain the accepted lineage and expose the existing phase-rerun count increment owner
- **AND** they SHALL NOT add a stage, write the count or require topic mutation again



### Requirement: Topic-state add SHALL reuse the existing research-style owner

When topic-state add commits and changes registry length, its structured result
SHALL expose one `style_projection` handoff with status, committed topic count,
selected profile, exact `apply-research-style.mjs` command, and the current
readiness checkpoint. The style CLI remains the only writer and reads only the
committed registry length. Prepared or blocked topic-state workspaces SHALL not
affect profile calculation, and topic-state code SHALL not directly mutate
profile fields.

#### Scenario: Add recomputes style after commit

- **WHEN** add-topic commits and changes the registry length
- **THEN** the topic-state result SHALL expose the existing style CLI as the
  refresh owner before the active HITL1 or rerun readiness gate
- **AND** the Agent SHALL run that CLI against the committed registry before
  the active HITL1 or rerun readiness gate
- **AND** only that CLI can write the updated params

### Requirement: Safe topic removal SHALL reuse the existing research-style owner

When a committed layout operation safely removes an unstarted topic and changes
registry length, its structured result SHALL expose the same style-projection
handoff. Topic-state code SHALL not write profile fields, and rename/reorder
without count change SHALL not trigger style recomputation.

#### Scenario: Safe remove recomputes style once

- **WHEN** layout commit reduces canonical registry length
- **THEN** the result SHALL expose one style refresh through the existing CLI
  before the rerun-ready gate
- **AND** the Agent SHALL run that CLI before the rerun-ready gate
- **AND** topic-state SHALL leave unrelated profile sections untouched
