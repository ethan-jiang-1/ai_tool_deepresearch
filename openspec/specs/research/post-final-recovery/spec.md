# Post-Final Recovery

> req: POF-001, POF-002, POF-003, POF-004

> delta-synced: strengthen-user-intent-carry-through (POF-004)

## Purpose

Define the post-final recovery capability: a narrow operation that records HITL2 `rerun` semantics after legal Final delivery, creates one lineage-bound `post_final_reentry` event through explicit exact recovery, and establishes a legal handoff to the existing rerun phase without widening lifecycle authority.
## Requirements
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
of all safe files under `final/`. The canonical entry order used to compute the
digest on a basis SHALL be one single deterministic order shared by the binding
and by every later rehash of retained entries on that basis: the primary-series
basis SHALL order retained primary entries by their full `final/...` path using
`localeCompare` collation, and the whole-tree basis SHALL use the same
deterministic byte-order scan the binding consumed. A rehash SHALL NOT use a
different order than the binding it compares against, and a byte-identical
retained set SHALL always reproduce the bound digest regardless of the primary
base's file name or the presence of canonical revisions whose names collate
oppositely to the byte scan (for example a modern base `final.md` with
`final_vN.md` revisions). Legal non-primary Final presentation updates
committed through the accepted persistence operation SHALL NOT constitute
lineage drift on either basis. For a newer Final handoff after accepted C5, the
exact zero-append digest match on the event's bound basis SHALL first be
consumed by `enter-phase` as the pre-load admission baseline. After the
route-bound Final load and existing Readiness status synchronization, the
evaluator SHALL compare the current inventory against the event-bound prior
digest on the event's bound basis by removing zero or more highest canonical
revision entries and rehashing the retained entries of that basis in the
identical canonical order described above. Exactly one zero-append match means
delivery pending; exactly one match after removing one or more highest
revisions means those revisions are immutable appends and the newest is
current-lineage delivery. For a legacy whole-tree binding whose proof is
unavailable solely because non-primary entries drifted, the evaluator SHALL
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

#### Scenario: Modern primary series append proof reproduces the bound digest

- **WHEN** a primary-scoped C5 event bound a modern primary series (`final.md` base plus contiguous `final_vN.md` revisions) and the current inventory's retained set is byte-identical to the bound inventory with one or more higher contiguous revisions appended
- **THEN** the append proof SHALL rehash the retained entries in the identical canonical order used by the binding digest (the primary-series basis order described above) and report a match on the event's bound basis
- **AND** the proof SHALL NOT report `newer_final_inventory_drift` solely because byte-order and collation order place `final.md` and `final_vN.md` differently

#### Scenario: Non-primary updates during a rerun do not block the next rerun

- **WHEN** a rerun's Final stage legally updates non-primary Final presentation files and publishes a newer primary revision, and a later explicit evidence-expanding request arrives
- **THEN** the append proof SHALL succeed on the event's bound basis (using the structural primary-series fallback for a legacy whole-tree binding when only non-primary entries drifted, with the fallback exposed as a diagnostic)
- **AND** inspect SHALL expose fresh C5 eligibility for that request instead of returning `accepted_lineage_drift`
- **AND** the newer C5 event SHALL bind the current primary-scoped digest with its basis marker

#### Scenario: Primary-series tampering remains drift on both bases

- **WHEN** the content of a retained primary-series entry (base or historical revision) differs from the event-bound witness on its bound basis, or removing a base/supplementary primary entry would be required to match
- **THEN** the append proof SHALL block as inventory drift on both the primary-scoped and the legacy whole-tree basis
- **AND** the structural fallback SHALL NOT accept a primary series whose retained entries no longer form a valid contiguous series

### Requirement: Post-final recovery SHALL commit profile and one event through explicit exact recovery

An accepted operation SHALL use `_diagnostics/post-final-recovery/<operation-id>/` and a Zod-validated `prepared` manifest. The workspace SHALL own only the retained request copy, before/after `rb_profile.yaml`, one exact staged `post_final_reentry` trace entry and their hashes/lineage metadata. It SHALL record but SHALL NOT mutate the expected terminal `rb_status.json` bytes. It SHALL NOT own topic, queue, work-unit, ledger, receipt, artifact, reference, final or cache bytes.

`operation_id` SHALL use the existing UUID shape used by narrow recovery workspaces. `event_id` SHALL be derived exactly as `post_final_reentry:<operation_id>` rather than generated from a second random identity.

Durable prepared publication SHALL be the acceptance boundary. Before it, failure SHALL leave authority bytes unchanged and SHALL not advertise recoverability. After it, `recover` SHALL use only manifest-bound expected-old/staged-new bytes and exact event identity; it SHALL not accept new semantics or widen the file set.

A real non-symlink operation directory without a valid durably published `prepared` manifest SHALL be unaccepted diagnostic residue, not a recoverable operation and not a second workspace owner. Inspect MAY warn about it, but a fresh apply SHALL use a new operation id without reading, promoting or deleting that residue. A symlink, non-directory entry or path-unsafe residue under the C5 root SHALL block root integrity. Optional residue cleanup remains explicit diagnostic maintenance and SHALL NOT be folded into `recover` for an unaccepted operation.

Commit SHALL roll forward in this order:

1. replace the HITL2 profile projection with `status: recorded`, `user_decision: rerun`, and `rationale` equal to one deterministic serialization of the accepted reason plus requested scope, while preserving all other profile fields and existing `rerun_count`; the operation timestamp remains in the recovery event because the current HITL2 profile schema has no `recorded_at` field;
2. revalidate that status remains the exact terminal Final bytes accepted by the manifest;
3. validate the prepared pre-entry profile/terminal-state facts from the C5 ownership/stage evaluator;
4. append the exact event last through one durable idempotent primitive in the existing trace writer owner;
5. fsync and clean the workspace.

The manifest SHALL bind original trace prefix byte length, SHA256 and parsed line count before event append, but SHALL NOT copy the whole trace or predeclare a fixed final event index. Append/recover SHALL require the first recorded byte length to hash identically. If only well-formed lines were appended after that prefix, the C5 ownership/stage evaluator SHALL recheck that Final lineage, profile/status/final inventory, bundle identity and accepted handoff authority remain the originally proven facts; an authority-neutral suffix SHALL not strand recovery, and the event may append at the current tail with its actual parsed index. Prefix mutation/truncation, malformed suffix, a later accepted handoff/recovery authority or any relevant fact drift SHALL block. Exact event append SHALL be idempotent by event/operation identity and exact line SHA: identical existing event means committed; conflicting identity/hash means blocked.

Recovery SHALL be roll-forward only. It MAY complete expected-old profile bytes to staged-new, append the missing exact event, or clean an already committed workspace. Profile or terminal-status drift SHALL block without restoring old state, deleting history or guessing rollback. Status synchronization after the event SHALL remain owned by existing `enter-phase` plus `advance-status`, not recover.

Reason and requested scope SHALL remain separate normalized fields in the append-only recovery event, but SHALL NOT add new `rb_profile.yaml` schema fields. Both strings SHALL normalize CRLF to LF, trim outer whitespace and reject NUL. The profile rationale SHALL be exactly `Post-final rerun reason:\n<reason>\n\nRequested scope:\n<requested_scope>`. Apply/recover SHALL share this serializer so exact recovery never reconstructs it from free-form prose.

Any accepted C5 workspace SHALL remain the sole nearest recovery owner until exact cleanup succeeds, including when the event was appended before a cleanup crash. `enter-phase`, `advance-status` and fresh apply SHALL reject while that workspace exists and point only to exact `recover`; the durable event becomes consumable handoff authority after workspace cleanup.

#### Scenario: Crash before prepared publication is unaccepted

- **WHEN** apply stops before durable `prepared` publication
- **THEN** profile, status and trace SHALL remain unchanged
- **AND** the retained caller request MAY be used for a fresh apply
- **AND** any safe incomplete operation directory SHALL remain non-authoritative diagnostic residue rather than being promoted by recover

#### Scenario: Partial profile commit has no early handoff authority

- **WHEN** apply crashes after profile replacement but before exact event append
- **THEN** no post-final handoff SHALL be legal
- **AND** inspect SHALL return only the exact recover operation

#### Scenario: Authority-neutral trace suffix does not strand recovery

- **WHEN** the accepted original trace prefix remains byte-identical and later well-formed appended events do not change the proven Final/control/handoff facts
- **THEN** recover MAY append the exact staged event at the current tail and bind its actual trace index
- **AND** it SHALL NOT rewrite the prepared event or treat append-only diagnostic cursor advance as conflict

#### Scenario: Relevant trace drift blocks event append

- **WHEN** the original prefix is modified/truncated, the appended suffix is malformed, or later trace facts change accepted Final/handoff/recovery authority
- **THEN** apply/recover SHALL block without appending the event
- **AND** SHALL identify the earliest trace/authority drift as the one direct blocker

#### Scenario: Event append is durable and idempotent

- **WHEN** profile matches staged bytes, status remains the expected terminal bytes and the exact event is absent
- **THEN** recover SHALL append and fsync that exact event through the existing trace owner
- **AND** a repeat recover SHALL recognize identical operation/event identity and clean or report committed without a duplicate event

#### Scenario: Event committed with cleanup pending remains recover-required

- **WHEN** the exact event and profile are committed but the accepted workspace still exists
- **THEN** inspect/apply SHALL return `recover_required` and recover SHALL perform only exact cleanup
- **AND** no entry/status/topic action SHALL be exposed before cleanup succeeds

#### Scenario: Late profile or terminal-status drift is not overwritten

- **WHEN** profile matches neither expected-old nor staged-new bytes, or status no longer matches the accepted terminal bytes before event append
- **THEN** recover SHALL block on the direct path
- **AND** SHALL NOT overwrite status, restore old profile bytes or delete the recovery audit

### Requirement: Post-final recovery SHALL create one lineage-bound rerun authority without widening lifecycle authority

The Engine-written `post_final_reentry` event SHALL include top-level `bundle` equal to the accepted status bundle and bind a stable event id, logical bundle identity tuple, operation/request digests, previous readiness->Final gate/load indexes, previous and committed-after profile semantic fields/hashes, previous status hash, final inventory digest, decision checkpoint `hitl2`, decision outcome `rerun`, transition-table digest/resolution, derived source status window, active rerun-limit rule id/definition digest and inspected `current_count|next_count|limit`, execution actor surface and timestamp. The C5 adapter SHALL derive those three count facts from the supported REI-003 fresh-eligibility result while preserving their existing field names and schema. The prepared manifest SHALL separately bind SHA256 of the exact staged UTF-8 JSON object-line bytes excluding the terminal LF; the event SHALL NOT contain a self-referential digest field. Downstream load/transition bindings SHALL carry event id plus that exact event-line SHA256. The target SHALL be resolved by the existing `transitions.chain.json` HITL2 `rerun` branch and manifest/status-window helpers; C5 SHALL NOT hardcode a second action->node/window table or add a Final outgoing edge. It SHALL not claim a verified personal identity, globally unique bundle identity or a gate attempt that did not occur.

The recorded transition-table digest SHALL remain acceptance-time audit context rather than a perpetual whole-file lock. Before event append and while consuming the exceptional handoff, the C5 ownership/stage evaluator SHALL re-resolve the relevant HITL2 `rerun` target and target status-window tuple and require them to equal the recorded resolution. An unrelated transition/manifest edit that preserves that semantic tuple MAY remain valid; changed or unresolvable target/window semantics SHALL block. The active rerun-limit rule SHALL remain bound by exact rule id/digest/current/next/limit until the sanctioned count increment because that rule directly determines whether this accepted rerun can pass.

One pure structural parser SHALL validate the event's immutable schema, deterministic event/operation/request identity, Final lineage references and current transition/manifest resolution, and compute the exact event-line SHA256 fact without requiring one mutable lifecycle stage. Existing handoff, phase-status, reentry and topic-state owners SHALL consume that same parsed fact object through closed stage predicates: `pre_entry`, `loaded_pending_status`, `synchronized_initial_profile`, or `synchronized_count_incremented`. Later load/transition predicates SHALL compare their recorded hash to that computed fact. A later-stage consumer SHALL NOT rerun a pre-entry terminal-status predicate or maintain a second event interpretation.

The stage predicates SHALL be mutually exclusive and deterministic. `pre_entry` requires the exact event-bound profile plus terminal Final node/window; an event-bound load left by a failed current-node write still maps to the same enter-phase retry. `loaded_pending_status` requires a route-bound load plus rerun current node and covers either the still-terminal gate window or the exact derived rerun window with the bound transition still missing; a conflicting transition blocks. `synchronized_initial_profile` requires load, bound transition, rerun current node, derived rerun window, the event-bound current count and either the exact event-bound style params or the complete exact RES-001 projection from unchanged event-bound `research_profile` plus current canonical registry. For the event-bound current count, a current profile whose `human_decision_checkpoints.hitl2.rerun_count` key is absent SHALL be interpreted as the event-recorded `rerun_guard.current_count` (the REI-003 inspected current count), matching how fresh eligibility and the rerun-limit rule read an absent field, and SHALL NOT be treated as an undefined value that fails the count window. When the event's committed-after profile semantics do not carry `rerun_count` (a legacy profile shape preserved by an exact C5 commit), the stage comparison SHALL NOT require that key in the current profile beyond the event-bound count interpretation, and SHALL NOT fabricate the key in the immutable event semantics; the profile comparison SHALL verify only the fields the event semantics actually carry plus the sanctioned count and style projections. Its nearest owner SHALL be existing topic-state/phase inspection for exact event-bound params, including when the computed projection is equal and therefore provides no progress witness, and the existing phase-rerun count increment only when the exact projected params differ from event-bound params. `synchronized_count_incremented` permits the event-bound count delta from recorded `current_count` to recorded `next_count` under the same active rule digest, with either unchanged event-bound style parameters or that complete exact projection. Neither stage SHALL permit a style value matching neither allowed shape or any other profile delta, and the incremented stage SHALL NOT call next-increment availability again. After a valid rerun-ready gate consumes that synchronized lineage with its current-count evaluation, existing `descendant_pipeline` SHALL carry the nearest owner derived from each valid normal handoff stage: enter-phase before load, status synchronization after load, then current lifecycle owner after matching transition/status; later normal handoffs repeat this interpretation. It SHALL reuse normal authority rather than inventing a sixth C5 stage or falling back to fresh Final eligibility.

Before route-bound phase entry, event validation SHALL require the exact committed profile, unchanged terminal Final gate window/current node and current Final lineage. After `enter-phase` writes a load witness bound to that event, `advance-status --to hitl2_recorded` SHALL consume the event+load through the existing status owner and derive `next_gate: rerun_ready`. Immediate reentry and initial topic-state authorization, before rerun phase-owned profile mutation begins, SHALL require the immutable event, the event-bound exact after-profile semantics/hash, that load witness, the resulting `phase_transition`, `current_node: phases/phase-rerun.md`, and the current `hitl2_recorded -> rerun_ready` window. After that initial authorization, existing rerun ownership MAY, in its existing order, commit canonical topic changes, run the existing style CLI to replace `research_style_params` with the exact RES-001 projection while preserving event-bound `research_profile`, and change `rerun_count` from the event-bound `current_count` to `next_count`. A crash after the style write but before the count write SHALL resume at that existing count owner rather than repeat topic mutation or become drift. The event remains historical entry lineage rather than freezing those sanctioned mechanical projections forever; any style value matching neither allowed shape or any other profile delta remains unexplained drift.

The event SHALL authorize only the existing rerun phase and existing C3 mutation/gate pipeline. It SHALL NOT authorize arbitrary repair, state-seed, status/file patch, Final history rewrite, topic adoption by itself, or a second post-final success path. A second post-final rerun SHALL require a newer legal Final delivery lineage and a new operation.

#### Scenario: Legacy profile without rerun_count forms the synchronized initial stage

- **WHEN** a committed `post_final_reentry` event has route-bound rerun load/transition and `hitl2_recorded -> rerun_ready` window, and both the current profile and the event's committed-after semantics lack `human_decision_checkpoints.hitl2.rerun_count` (a legacy profile shape), while research_profile and style parameters match the event-bound values or the exact current projection
- **THEN** the stage evaluator SHALL interpret the absent count as the event-recorded `rerun_guard.current_count` and SHALL accept `synchronized_initial_profile` with the existing topic-state owner
- **AND** the profile comparison SHALL NOT require the absent key in either the current profile or the immutable event semantics

#### Scenario: Legacy absent count still binds the increment owner

- **WHEN** the accepted `synchronized_initial_profile` lineage comes from a legacy profile whose `rerun_count` key is absent
- **THEN** the existing phase-rerun count increment SHALL remain the owner for writing `rerun_count` (current `0` -> next `1`) exactly as for a keyed profile
- **AND** the event SHALL remain unchanged as historical entry lineage

#### Scenario: Legacy profile after the sanctioned increment still forms a stage

- **WHEN** a legacy profile whose event semantics lack `rerun_count` has been incremented by the sanctioned phase-rerun count owner to `rerun_count: 1`, with load/transition/window still bound
- **THEN** the stage evaluator SHALL accept `synchronized_count_incremented` (count `next`) without requiring the immutable event to carry the key
- **AND** the profile comparison SHALL strip the count key from the comparable so only the fields the event actually carried are compared

#### Scenario: Event authorizes only the existing rerun target

- **WHEN** a committed event is valid and unsuperseded before phase entry
- **THEN** its legal target SHALL be the current transition-table resolution for `phases/phase-hitl2.md` outcome `rerun`, currently `phases/phase-rerun.md`
- **AND** caller-supplied alternative target/gate/status values SHALL be rejected

#### Scenario: Unrelated routing file edit does not strand accepted semantics

- **WHEN** transition or manifest bytes change after acceptance but the current HITL2 `rerun` target and derived status-window tuple re-resolve exactly to the event-bound semantics
- **THEN** the accepted operation MAY continue without treating whole-file digest inequality alone as a blocker
- **AND** the recorded digest SHALL remain acceptance-time audit context

#### Scenario: Relevant routing or rerun-rule drift blocks

- **WHEN** the HITL2 `rerun` target/window no longer re-resolves to the event-bound tuple, or the active rerun-limit rule id/digest/facts change before the bound count increment
- **THEN** the current exceptional handoff stage SHALL block without selecting another route or rewriting the request/event
- **AND** diagnostics SHALL identify the changed routing or rule authority as the one direct boundary

#### Scenario: Bound increment and exact style projection defer to the formal Gate

- **WHEN** accepted lineage reaches `synchronized_count_incremented` with exactly the event-recorded count delta, optional exact RES-001 projection for current canonical registry length, and unchanged definition binding
- **THEN** C5 SHALL return the existing rerun-ready Gate as the one next action
- **AND** SHALL NOT evaluate another future increment or block a count that the formal current-count Gate still accepts

#### Scenario: Exact projection before bound increment resumes the count step

- **WHEN** accepted lineage has the event-recorded current count and the complete exact RES-001 projection after sanctioned topic preparation, and that projection differs from event-bound params
- **THEN** C5 SHALL retain `synchronized_initial_profile` and project only the existing phase-rerun count increment
- **AND** SHALL NOT create a new stage, repeat topic mutation or run the count write itself

#### Scenario: Descendant stage advances with the normal consumed handoff

- **WHEN** rerun-ready passes for the accepted C5 lineage and the existing normal handoff is progressively consumed
- **THEN** C5 SHALL return `descendant_pipeline` with enter-phase, then status synchronization, then current lifecycle owner according to the exact facts already present
- **AND** a conflicting bound load/transition or drift of current status SHALL make that projection block rather than remain unchanged

#### Scenario: Final remains absent from normal transition sources

- **WHEN** C5 resolves a post-final rerun target
- **THEN** it SHALL query the existing HITL2 rerun branch rather than adding `phases/phase-final.md` to `transitions.chain.json`
- **AND** Final SHALL remain terminal with no normal outgoing route

#### Scenario: Entry changes current node without invalidating lineage

- **WHEN** `enter-phase` consumes the event and updates `current_node` from Final to rerun
- **THEN** the next action SHALL be existing `advance-status --to hitl2_recorded`
- **AND** topic-state/reentry SHALL remain blocked until that command writes the derived rerun window

#### Scenario: Existing status owner completes the exceptional handoff

- **WHEN** a valid recovery event has a route-bound rerun load and `advance-status --to hitl2_recorded` is invoked
- **THEN** existing status tooling SHALL derive `current_gate: hitl2_recorded` and `next_gate: rerun_ready` from the recorded transition resolution
- **AND** SHALL append the normal `phase_transition` with exceptional handoff context

#### Scenario: Recovery event does not impersonate a gate pass

- **WHEN** C5 publishes the new handoff authority
- **THEN** trace SHALL contain `post_final_reentry`, not a synthetic `gate_attempt`
- **AND** existing gate history SHALL remain unchanged

#### Scenario: Reentry alone does not adopt historical addendum topics

- **WHEN** the historical bundle contains registry-external addendum content
- **THEN** C5 SHALL only establish the rerun window
- **AND** that content SHALL not gain canonical identity through migration, adoption, upgrade, or another current Engine action

#### Scenario: Unsupported maintenance remains unavailable

- **WHEN** the request asks for repair-in-place, generic state movement, developer state-seed or history rewrite
- **THEN** C5 SHALL reject the action as unsupported
- **AND** `human-directed` prose SHALL NOT widen the closed action authority

### Requirement: Focus-bearing post-Final requests SHALL retain wording and interpretation in the existing reason

After the Final Agent classifies explicit feedback as an evidence-expanding
post-Final rerun and resolves any material ambiguity, a request that contains a
new or revised research focus SHALL place two visibly labelled parts in the
existing `reason` string:

`用户的重点原话（逐字保留）：`

and

`Agent 对本轮额外研究方向的理解（可由用户修正）：`.

The first part SHALL faithfully retain the user's accepted focus wording; the
second SHALL contain the concise interpretation the user was allowed to
correct before apply. `requested_scope` SHALL remain a separate bounded field.
The existing LF normalization, outer trim, NUL rejection, profile-rationale
serializer, request digest, event, workspace, and lineage contracts SHALL
remain unchanged. Therefore “verbatim” refers to the accepted normalized
request text and does not promise preservation of CRLF or outer whitespace.

The Engine SHALL continue to validate only the existing request structure and
lineage. It SHALL NOT parse the labels, classify focus semantics, compare the
two parts, or infer permission. A post-Final rerun without a new or revised
focus SHALL retain the existing ordinary non-empty reason contract.

#### Scenario: Focus-bearing request survives current serialization

- **WHEN** the Agent submits an accepted focus-bearing reason with both labelled multiline parts and a separate requested scope
- **THEN** existing apply/recover SHALL preserve the normalized reason in the request, profile rationale, and append-only event
- **AND** requested scope SHALL remain separately recoverable without a new profile field

#### Scenario: Interpretation is corrected before acceptance

- **WHEN** the user corrects the Agent's proposed interpretation in the current Final conversation
- **THEN** the retained reason SHALL contain the accepted corrected interpretation
- **AND** an earlier unaccepted draft SHALL NOT become a Decisions revision or C5 event

#### Scenario: Ordinary rerun reason remains compatible

- **WHEN** an evidence-expanding post-Final request contains no new or revised focus
- **THEN** the existing non-empty reason and requested-scope contract SHALL remain valid
- **AND** no empty focus labels or new schema field SHALL be required

### Requirement: Post-final descendant supersession SHALL be a same-point same-decision re-run only

To prove the one continuous descendant chain required for an accepted post-final lineage, a later `gate_attempt` SHALL supersede an earlier passed pass at the same `gate` + `currentNodeRef` **only** when it is itself a passed pass (`passed: true`), carries the **same** `next`, and no different-gate `gate_attempt` occurs between the candidate and it (i.e. a literal re-run of the same decision at the same point). A failed attempt (`passed: false`) SHALL never supersede a prior passed pass. A passed pass with a **different** `next` at the same `gate` + `currentNodeRef` SHALL be a separate lifecycle event belonging to a different rerun round, not a supersession, and SHALL remain a link in the descendant chain. Consequently the `hitl2` gate legitimately fires once per rerun round — `hitl2 -> phase-rerun` ending each intermediate round and `hitl2 -> phase-readiness` ending the final round — and all such round passes SHALL participate in one linear descendant chain that remains continuous across consecutive multi-round post-final reruns rather than being judged discontinuous at a (wrongly) superseded round pass.

#### Scenario: A later failed attempt does not supersede a prior passed pass

- **WHEN** a `gate` at a `currentNodeRef` records a passed pass (`passed: true`, `next: T`) and a later `gate_attempt` at the same `gate` + `currentNodeRef` records `passed: false`
- **THEN** the later failed attempt SHALL NOT supersede the earlier passed pass
- **AND** the earlier passed pass SHALL remain a legal link in the deterministic handoff chain

#### Scenario: Cross-round rerun passes at the same gate with different next remain distinct

- **WHEN** an accepted post-final lineage records a `hitl2` pass (`next: phases/phase-rerun.md`) ending an intermediate rerun round, then a full rerun sub-chain, then a later `hitl2` pass (`next: phases/phase-readiness.md`) ending the final round
- **THEN** both `hitl2` passes SHALL remain separate links in the continuous descendant chain
- **AND** the chain SHALL remain continuous across the round boundary and reach the readiness-to-Final handoff without a discontinuity verdict

#### Scenario: Only a same-point re-run of the same decision supersedes

- **WHEN** a `gate` at a `currentNodeRef` records a passed pass with `next: T`, and a later passed pass at the same `gate` + `currentNodeRef` again records `next: T` with no different-gate attempt in between
- **THEN** the later passed pass SHALL supersede the earlier one, and only the latest SHALL be projected as the current handoff link

### Requirement: Final entry authorization SHALL be a single non-contradictory verdict

The `enter-phase phase-final` flow SHALL present exactly one authorization verdict. If the requested target is `phases/phase-final.md`, the Final inventory/lineage admission gate SHALL be folded into the same authorization decision that selects the handoff; an admission failure SHALL be reported as the single reason (naming the lineage/primary-inventory boundary) rather than first reporting the target as authorized and then failing a separate admission step. This SHALL NOT change the deterministic admission facts — only their single-point, non-contradictory presentation.

#### Scenario: Final entry reports one reason when the lineage gate fails

- **WHEN** a Phase Agent runs `enter-phase --node phases/phase-final.md` on a bundle whose latest legal readiness-to-Final handoff is present but whose Final inventory/lineage admission gate fails
- **THEN** the command SHALL fail once with the admission reason (lineage/inventory boundary) as the sole verdict
- **AND** it SHALL NOT first report the target as authorized and then contradict that with a separate admission failure

#### Scenario: Final entry with passing admission reports the normal pin

- **WHEN** a Phase Agent runs `enter-phase --node phases/phase-final.md` on a bundle whose latest legal readiness-to-Final handoff and Final inventory/lineage admission both pass
- **THEN** the command SHALL proceed with the single authorized handoff and SHALL NOT emit a contradictory second verdict
