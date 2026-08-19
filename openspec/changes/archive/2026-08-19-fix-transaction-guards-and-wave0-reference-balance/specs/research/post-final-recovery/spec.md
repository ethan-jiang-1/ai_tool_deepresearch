## MODIFIED Requirements

### Requirement: Post-final recovery SHALL expose one direct eligibility and request contract

The framework SHALL expose `operate-post-final-recovery.mjs inspect|apply|recover`
with a closed action vocabulary containing only `post_final_rerun`. This
operation SHALL own only explicit post-Final requests that require new sources,
Topics, evidence collection, research conclusions, research-profile changes, or
another expansion of the verified research boundary. Reader, view, structure,
ordering, length, wording, emphasis, existing-evidence visibility, appendix, or
explanation changes SHALL remain Final presentation refinement. The Final Agent,
not the Engine, SHALL classify that semantic boundary and ask the smallest
clarification when it is material.

`inspect` SHALL remain side-effect-free and derive mechanical eligibility from
the latest legal readiness-to-Final gate/load lineage, terminal status/current
node, current HITL2 profile, normalized bundle identity, canonical primary Final
inventory, current trace, queue/work-unit quiescence, accepted recovery
workspaces, and the active rerun-count rule. Mechanical eligibility SHALL NOT by
itself select rerun or imply that a clean Final has requested mutation. An Agent
MAY run inspect to answer availability, but it SHALL construct and submit an
`apply` request only after classifying an explicit user request as crossing the
verified research boundary. Ambiguous scope SHALL be clarified before
submission; presentation-only scope SHALL remain in Final.

The Engine SHALL validate the closed action, non-empty reason/scope, lineage,
available permission preconditions, and optimistic concurrency. It SHALL not
score or classify free-form reason/scope, infer user intent from chat, or decide
whether a requested report is “technical enough.” A structurally valid request
is Agent-selected semantic input, not proof of caller identity or permission.

The active `rerun_count_limit` rule in `gate-rerun-ready.definition.json` SHALL
be the only max-rerun Source of Record. Fresh eligibility and every pre-event
prepared-operation revalidation SHALL pass the production-parsed definition and
full ProfileSchema-parsed profile to REI-003 with `includeNextIncrement: true`.
A supported unavailable result SHALL block before workspace creation and expose
only the new-bundle decision. Unsupported rule/profile facts SHALL block with
their concrete boundary and SHALL not claim a new bundle repairs them. C5 SHALL
not reset, decrement, or bypass `rerun_count`.

An accepted artifact-persistence/publication workspace SHALL take precedence
with the existing quiescent sweep action. An accepted topic-state workspace
SHALL take precedence with its exact recover action. Invalid or ambiguous
canonical primary Final inventory SHALL block before C5 acceptance. Canonical
topic drift repairable only after sanctioned rerun MAY remain carried context,
but ambiguous control lineage, unstable Final persistence, active work, or
exhausted rerun count SHALL block.

External inspect/apply SHALL always treat an accepted C5 workspace as recovery-
owned. The C5 ownership/stage evaluator MAY receive internal manifest-bound
context only from commit/recover; it SHALL identify exactly the current
operation and prepared-manifest digest, treat only that workspace as the
operation being completed, and still block a second accepted workspace or
unrelated drift. No caller flag or request field SHALL expose this exception.

Three deterministic responsibilities SHALL remain distinct: REI-003 interprets
only rerun availability; RES-001 computes only the full research-style
projection; and the C5 evaluator resolves workspaces, accepted lineage, and
current owner while consuming those pure facts. None SHALL become a generic
recovery controller, presentation-intent classifier, or report-quality judge.

The C5 evaluator SHALL resolve accepted ownership and replay before fresh
eligibility in this order: accepted C5 workspace; accepted artifact/topic-state
owner workspace; newest accepted active C5 lineage and current stage; then a
fresh Agent-selected `post_final_rerun` request against the latest Final lineage.
A clean Final without an accepted C5 workspace or lineage SHALL remain outside
C5 recovery ownership and project the Final delivery/refinement owner through
reentry, even when side-effect-free inspect reports mechanical eligibility.

A committed C5 lineage SHALL remain recognizable after legal rerun entry,
status synchronization, topic preparation, style recomputation, event-bound
count increment, and later normal descendant handoffs. At the event-bound count,
exact event-bound style params keep the existing topic-state/phase owner. When
the complete RES-001 projection from the event-bound research profile and
current registry length differs from event-bound params and current params equal
that projection, it proves the style-before-count crash window and projects the
existing phase-rerun count owner. If projections are equal, equality cannot
prove execution, so the evaluator SHALL retain the idempotent topic-state/phase
owner. After count increment, replay SHALL validate event-recorded count delta
and definition binding rather than test a second future increment. Other profile
fields remain event-bound; unrelated or unsupported drift SHALL block. The
rerun-ready Gate retains the formal current-count check with
`includeNextIncrement: false`.

After rerun-ready passes, C5 SHALL use existing normal Gate/load/transition/
status authority to prove one continuous descendant chain and project only the
nearest existing owner. A passed attempt, load, transition, status, or current
node that conflicts with that exact chain SHALL block and SHALL not fall through
to fresh eligibility. A newer legal Readiness-to-Final handoff SHALL retire the
older C5 lineage from current recovery ownership and project the exact normal
Final-entry owner, but the handoff alone SHALL NOT establish Final entry, a new
report delivery, or a fresh C5 candidate. The retired C5 event's prior Final
inventory digest SHALL remain the audit witness for that boundary, evaluated on
the basis the event bound. Before the new route-bound Final load, `enter-phase`
SHALL require the current safe Final inventory to reproduce that digest exactly
on its bound basis; primary-series drift SHALL block the load rather than be
interpreted as delivery, while legal non-primary Final presentation updates
SHALL NOT block a primary-scoped event's load. After the admitted load, the
existing Readiness status synchronization SHALL remain the only next owner.
Only in the synchronized terminal Final window does zero appended canonical
inventory mean Final owns immediate current-lineage publication. Only after one
or more highest canonical versions are proven as immutable appends over that
prior inventory MAY the newest report count as delivery for the newer lineage;
only then MAY another explicit evidence-expanding request become a fresh C5
candidate.

The Final inventory lineage witness SHALL be a deterministic sorted digest over
the canonical primary series entries (the primary base plus its contiguous
revisions), computed from one safe snapshot that still scans every bundle-
relative regular file under `final/`: symlinks, unreadable entries, path
escape, unsupported types, or ambiguous primary classification SHALL block
rather than be skipped. It SHALL not infer identity or recency from directory
mtime, chat delivery text, or caches. A new C5 event SHALL bind that
primary-scoped digest in the existing event field together with an explicit
basis marker; events bound before this basis change carry no marker and remain
legacy whole-tree bindings, where the digest is the deterministic sorted digest
of all safe files under `final/`. Legal non-primary Final presentation updates
committed through the accepted persistence operation SHALL NOT constitute
lineage drift on either basis. For a newer Final handoff after accepted C5, the
exact zero-append digest match on the event's bound basis SHALL first be
consumed by `enter-phase` as the pre-load admission baseline. After the
route-bound Final load and existing Readiness status synchronization, the
evaluator SHALL compare the current inventory against the event-bound prior
digest on the event's bound basis by removing zero or more highest canonical
revision entries and rehashing the retained entries of that basis. Exactly one
zero-append match means delivery pending; exactly one match after removing one
or more highest revisions means those revisions are immutable appends and the
newest is current-lineage delivery. For a legacy whole-tree binding whose proof
is unavailable solely because non-primary entries drifted, the evaluator SHALL
fall back to one structural primary-series proof evaluated over the same
zero-or-more-highest-revision removal prefixes: for each prefix, the retained
primary series SHALL remain structurally valid, and a zero-removal fallback
match means delivery pending while a one-or-more-removal fallback match means
immutable append; the fallback basis SHALL be exposed in the proof result as a
diagnostic. No match on the bound basis, a match that requires removing a
base/supplementary primary entry, primary-series content drift, or ambiguous
canonical history SHALL block. This proof SHALL reuse the existing C5 event
field and SHALL not add timestamp authority, a delivery event, profile
counter, or current-report pointer.

`apply` SHALL accept one retained strict JSON request containing schema version,
closed action, non-empty reason/scope, inspect-derived logical bundle identity,
and expected Final lineage/inventory bindings. The identity tuple SHALL reuse
current status bundle, matching plan/profile basename, and normalized selected-
directory interpretation. C5 SHALL not add UUID identity, caller-selected
node/gate/status/event/file lists, `human-directed`, force, override, or identity
token fields. Request prose supplies semantic/audit input and optimistic
concurrency only; it does not prove identity or expand host permission.

Results SHALL retain Engine-owned, Zod-validated closed verdicts:

- `inspect`: `eligible|unchanged|recover_required|blocked`;
- `apply`: `committed|unchanged|recover_required|blocked`; and
- `recover`: `committed|cleaned|blocked`.

The existing shared capability schema version and external request/result/
workspace/event envelope SHALL remain compatible. Each result SHALL carry at
most one nearest action. `committed` means the profile/event operation is
durable, not that rerun or a Gate completed; `cleaned` means committed state was
already present and only accepted workspace cleanup finished. `unchanged`
SHALL apply only to an already accepted stage, and apply additionally requires
an identical request digest.

Cross-field behavior SHALL remain closed: inspect `eligible` carries exact
request preparation; recover-required carries exact recover; committed/cleaned
carries the next legal mechanical stage; inspect unchanged projects accepted
lineage without implying a caller request; apply unchanged requires matching
request digest; blocked carries at most one existing-owner or user-decision
boundary. Exit codes remain `0` for successful/eligible/unchanged/cleaned, `1`
for deterministic blocked/recover-required, and `2` only for invalid invocation
or inability to construct the validated envelope. Selected-bundle runtime
contract failures SHALL use blocked exit `1`.

#### Scenario: Clean terminal Final is eligible

> **@deprecated behavior** — The historical title is retained as an archive
> anchor. Clean terminal mechanics are necessary but no longer sufficient;
> current explicit evidence-expanding intent is also required for C5 ownership.

- **WHEN** the latest lineage is legal terminal Final with a valid primary report bound to that lineage, no active owner workspace/work, a supported available next increment, and a retained request for new evidence or research scope
- **THEN** inspect SHALL report `eligible` and return exact request/apply preparation bindings

#### Scenario: Presentation-only feedback remains in Final

- **WHEN** current feedback asks only to change reader, view, structure, length, wording, emphasis, appendix, or explanation of existing verified evidence
- **THEN** the Final Agent SHALL not construct or submit a C5 apply request
- **AND** the nearest owner SHALL be `phases/phase-final.md`

#### Scenario: Mechanical eligibility does not invent rerun intent

- **WHEN** a clean terminal Final mechanically could rerun but no current retained evidence-expanding request exists
- **THEN** inspect MAY report availability facts without making C5 the reentry owner
- **AND** the Engine SHALL not infer a request from Final inventory or chat history

#### Scenario: Next rerun would exhaust the existing gate rule

- **WHEN** fresh inspect obtains a supported unavailable next-increment result
- **THEN** inspect/apply SHALL block before workspace creation without resetting the counter
- **AND** the nearest boundary SHALL be a user decision about a new bundle

#### Scenario: Unsupported rerun facts do not guess a remedy

- **WHEN** active rule, parsed profile, or HITL2 parent is unsupported or unreadable
- **THEN** inspect/apply SHALL block with that exact contract boundary and exit `1`
- **AND** it SHALL not claim a new bundle repairs it

#### Scenario: Pending artifact persistence keeps its owner

- **WHEN** an accepted artifact-persistence/publication workspace exists
- **THEN** C5 SHALL report only the existing quiescent sweep action
- **AND** it SHALL not hash unstable inventory or create a C5 workspace

#### Scenario: Accepted topic-state recovery keeps its owner

- **WHEN** an accepted topic-state workspace exists after lifecycle drift into Final
- **THEN** C5 SHALL report only its exact recover action and create no competing workspace

#### Scenario: Multiple accepted C5 workspaces are ambiguous

- **WHEN** more than one valid-looking C5 prepared workspace exists
- **THEN** inspect/apply SHALL block without selecting or creating an operation

#### Scenario: Request fields do not create permission

- **WHEN** retained reason/scope exists but permission or deterministic eligibility is absent
- **THEN** apply SHALL reject without mutation and SHALL not treat prose as identity, override, or permission

#### Scenario: Logical bundle identity mismatch blocks replay

- **WHEN** request identity differs from current status, plan/profile basename, or normalized bundle facts
- **THEN** apply SHALL reject before workspace creation without inventing another identity registry

#### Scenario: Identical accepted request is idempotent

- **WHEN** apply repeats an identical accepted request against the same Final lineage and event already exists
- **THEN** it SHALL return unchanged without duplicate workspace, profile rewrite, or event
- **AND** its next action SHALL match the current accepted stage owner

#### Scenario: Inspect recognizes an accepted nonterminal recovery lineage

- **WHEN** committed C5 has legally entered rerun or later accepted descendant stages
- **THEN** inspect SHALL return unchanged with the one current owner without requiring terminal Final or testing another future increment

#### Scenario: Exact style recomputation remains accepted lineage

- **WHEN** sanctioned topic-state change plus exact RES-001 style projection and bound count increment are present
- **THEN** inspect SHALL recognize the count-incremented stage and return rerun-ready Gate

#### Scenario: Style-before-count crash returns to the existing count owner

- **WHEN** exact distinct style projection committed but event-bound count has not incremented
- **THEN** inspect SHALL return the phase-rerun count owner without another C5 stage or user decision

#### Scenario: Wrong style or unrelated profile change blocks

- **WHEN** research profile or style/current profile facts differ outside accepted event-bound or exact projection forms
- **THEN** C5 SHALL block without rewriting profile, selecting style, or continuing

#### Scenario: Rerun-ready pass projects only its next proven normal owner

- **WHEN** exact accepted rerun-ready attempt passes but its normal handoff is only partly consumed
- **THEN** C5 SHALL project only the next proven enter/status/current owner stage
- **AND** it SHALL not jump ahead

#### Scenario: Conflicting descendant evidence blocks

- **WHEN** a later attempt/load/transition/status/current-node fact conflicts with the accepted chain
- **THEN** C5 SHALL block on the earliest continuity failure and not fall through to Final or fresh eligibility

#### Scenario: Different request cannot stack on one Final lineage

- **WHEN** an accepted C5 event owns the latest Final lineage and a different request arrives before a newer legal Final handoff retires that owner
- **THEN** apply SHALL block without a second event or profile rewrite

#### Scenario: Newer Final handoff with unchanged inventory returns to delivery

- **WHEN** accepted C5 descendants reach a newer legal Final handoff, `enter-phase` admits the exact event-bound prior inventory on its bound basis, Readiness status synchronization completes, and inventory still has zero appended canonical revisions
- **THEN** C5 SHALL remain retired as current owner and Final SHALL own immediate publication of global `latest + 1`
- **AND** inspect/apply SHALL not expose a fresh C5 request against the undelivered newer lineage

#### Scenario: Loaded newer Final preserves the existing status-sync owner

- **WHEN** exact prior-inventory admission has written the newer route-bound Final load but the Readiness source Gate is not yet synchronized
- **THEN** the nearest owner SHALL remain the existing `advance-status --to readiness_passed` action
- **AND** Final publication, refinement, and fresh C5 eligibility SHALL remain unavailable

#### Scenario: Pre-load inventory drift blocks the post-C5 Final return

- **WHEN** accepted C5 descendants reach a newer legal Final handoff but the current safe Final inventory no longer reproduces the retired event-bound prior digest on its bound basis before the new Final load
- **THEN** `enter-phase` SHALL reject without `load_complete` or `current_node` mutation
- **AND** C5/reentry SHALL not reinterpret the drift as a delivered report or expose a fresh C5 request

#### Scenario: Non-primary presentation drift does not block a primary-scoped load

- **WHEN** a primary-scoped C5 event's rerun has legally updated non-primary Final presentation files (for example `final/topics/*.md` through the accepted persistence operation) before the newer Final load
- **THEN** `enter-phase` admission SHALL still reproduce the event-bound primary-series digest
- **AND** those non-primary updates SHALL NOT be reported as Final inventory drift

#### Scenario: Immutable append establishes the newer delivery lineage

- **WHEN** current valid inventory uniquely preserves the retired C5 event-bound inventory on its bound basis and adds one or more highest contiguous canonical revisions
- **THEN** the newest appended report MAY bind the newer legal Final lineage and clean reentry SHALL own ordinary Final refinement
- **AND** a later explicit evidence-expanding request MAY become a fresh C5 candidate without rewriting the older event or reports

#### Scenario: Non-primary updates during a rerun do not block the next rerun

- **WHEN** a rerun's Final stage legally updates non-primary Final presentation files and publishes a newer primary revision, and a later explicit evidence-expanding request arrives
- **THEN** the append proof SHALL succeed on the event's bound basis (using the structural primary-series fallback for a legacy whole-tree binding when only non-primary entries drifted, with the fallback exposed as a diagnostic)
- **AND** inspect SHALL expose fresh C5 eligibility for that request instead of returning `accepted_lineage_drift`
- **AND** the newer C5 event SHALL bind the current primary-scoped digest with its basis marker

#### Scenario: Primary-series tampering remains drift on both bases

- **WHEN** the content of a retained primary-series entry (base or historical revision) differs from the event-bound witness on its bound basis, or removing a base/supplementary primary entry would be required to match
- **THEN** the append proof SHALL block as inventory drift on both the primary-scoped and the legacy whole-tree basis
- **AND** the structural fallback SHALL NOT accept a primary series whose retained entries no longer form a valid contiguous series
