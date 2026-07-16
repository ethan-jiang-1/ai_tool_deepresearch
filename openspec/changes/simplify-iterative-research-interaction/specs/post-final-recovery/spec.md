> req: POF-001, POF-002, POF-003

## MODIFIED Requirements

### Requirement: Post-final recovery SHALL expose one direct eligibility and request contract

The framework SHALL expose `operate-post-final-recovery.mjs inspect|apply|recover` with a closed action vocabulary containing only `post_final_rerun`. `inspect` SHALL be side-effect-free and SHALL derive eligibility from the latest legal readiness->Final gate/load lineage, terminal status/current node, current HITL2 profile, existing normalized bundle identity facts, final artifact inventory, current trace, queue/work-unit quiescence, accepted recovery workspaces and the active rerun-count gate rule.

The active `rerun_count_limit` rule in `gate-rerun-ready.definition.json` SHALL be the only max-rerun Source of Record. Fresh terminal eligibility and every pre-event prepared-operation revalidation SHALL pass the production-parsed definition and full ProfileSchema-parsed profile to the REI-003 evaluator with `includeNextIncrement: true`. A supported unavailable result SHALL block apply before workspace creation and expose only the new-bundle decision; an unsupported rule/profile result SHALL block with its concrete contract boundary and SHALL NOT claim that a new bundle resolves it. C5 SHALL NOT reset, decrement or bypass `rerun_count`.

An accepted C2 artifact-persistence workspace SHALL take precedence with the existing quiescent sweep action. An accepted C3 topic-state workspace SHALL take precedence with its exact recover action. Canonical topic drift that is repairable only after sanctioned rerun MAY remain carried context, but ambiguous control lineage, unstable final persistence, active work or exhausted rerun count SHALL block C5 acceptance.

External inspect/apply SHALL always treat an accepted C5 workspace as recovery-owned. The C5 ownership/stage evaluator MAY receive an internal, non-CLI, manifest-bound context only from commit/recover; that context SHALL identify exactly the current operation id and prepared-manifest digest, treat only that workspace as the operation being completed, and still block any second accepted workspace or unrelated drift. No caller flag or request field SHALL expose this internal exception.

Three deterministic responsibilities SHALL stay distinct: the REI-003 rerun-availability evaluator interprets only the active limit; the RES-001 research-style computation returns only a complete parameter projection; and the C5 ownership/stage evaluator resolves workspaces, accepted lineage and current owner while consuming those pure facts. None SHALL become a generic recovery controller or duplicate another's comparison.

The C5 ownership/stage evaluator SHALL resolve ownership and replay before testing fresh terminal eligibility. Its order SHALL be: accepted C5 workspace; accepted C2/C3 owner workspace; newest accepted active C5 lineage and its current stage; then fresh latest-Final eligibility. A committed C5 lineage SHALL remain recognizable after legal entry, status synchronization, topic preparation, style recomputation, the event-bound rerun-count increment and later normal descendant handoffs. At the event-bound current count, exact event-bound style params keep the existing topic-state owner; the complete RES-001 projection computed from the event-bound `research_profile` definition and current committed registry length instead proves the style-before-count crash window and projects the existing phase-rerun count-increment owner. After the bound count increment, replay SHALL verify the event-recorded count delta and definition binding rather than call REI-003 with `includeNextIncrement: true` for a second future increment, and SHALL accept either unchanged event-bound style params or that complete exact projection. Current `research_profile` and every other profile field SHALL remain event-bound. A style value that is neither unchanged event-bound params nor the exact current projection SHALL block. This compatibility does not remove the rerun phase's existing obligation to run the style CLI after a registry-length change and SHALL NOT make C5 a general style-freshness Gate. The existing rerun-ready Gate SHALL perform the formal current-count check with `includeNextIncrement: false`.

After rerun-ready passes, the C5 ownership/stage evaluator SHALL use the existing normal Gate/load/transition/status authority to prove one continuous descendant chain and project its nearest existing owner. The exact non-superseded passed attempt plus the unchanged rerun source window MAY project the existing enter-phase action while its route-bound load is not yet present. Once that load exists, it SHALL match the attempt/target and current target node; the unchanged source window MAY then project existing status synchronization while its normal transition is not yet present. Once synchronization exists, the transition, resulting status window and current node SHALL all match before current lifecycle ownership is projected. A passed attempt from the wrong source/target, or any observed conflicting, superseded, malformed or discontinuous load/transition/status evidence, including manual status drift back to Final without a newer legal Final delivery, SHALL block and SHALL NOT fall through to fresh eligibility. A newer legal Final delivery retires the older C5 lineage from current ownership and MAY establish a new fresh candidate.

The Final inventory digest SHALL be derived from one deterministic sorted list of bundle-relative regular files under `final/` and each file's SHA256. Symlinks, unreadable entries, path escape and unsupported file types SHALL block rather than be skipped. C5 SHALL reuse an existing safe recursive inventory primitive if available or add one local pure evaluator; the digest SHALL NOT be inferred from directory mtime, chat delivery text or a cache projection.

`apply` SHALL accept one retained strict JSON request containing `schema_version`, action, non-empty reason/scope, inspect-derived expected logical bundle identity and expected Final lineage bindings. The identity tuple SHALL reuse current `rb_status.json#/bundle`, matching plan/profile `plan_basename`, and the accepted normalized bundle-directory basename interpretation; C5 SHALL NOT add a UUID, token or second identity registry. The request SHALL NOT accept caller-selected node/gate/status/event/file lists, `human-directed`, force, override or identity-token fields. Request metadata SHALL carry semantic/audit input and optimistic concurrency only; it SHALL NOT prove caller identity, distinguish a malicious byte-identical clone with copied identity, or expand host permission.

Results SHALL use one Engine-owned Zod-validated envelope and operation-specific closed verdicts:

- `inspect`: `eligible|unchanged|recover_required|blocked`;
- `apply`: `committed|unchanged|recover_required|blocked`; and
- `recover`: `committed|cleaned|blocked`.

Request, result, prepared-manifest and recovery-event shapes SHALL share capability schema version `1.0.0` through one exported constant; this version coordinates the narrow operation family and SHALL NOT become a generic transaction schema. The C5 adapter SHALL map the REI-003 result into existing `current_count|next_count|limit` fields, and this change SHALL NOT alter the external C5 envelope, request, workspace, manifest or event schema.

Every result SHALL carry at most one structured nearest action. `committed` means the exact profile/event operation is durable and its accepted workspace is removed, not that rerun work or a lifecycle gate completed. `cleaned` means the exact event/profile were already committed and recover removed only the remaining accepted workspace. `unchanged` SHALL be used only for an already accepted stage; apply additionally requires an identical request digest. It SHALL NOT silently absorb different semantics against the same Final lineage.

Result cross-fields SHALL remain operation-specific and closed:

- inspect `eligible` SHALL include the inspect-derived request bindings and exactly one request-preparation/apply action;
- any `recover_required` SHALL include exactly one operation-id-bound recover action;
- `committed|cleaned` SHALL include exactly one next legal mechanical stage and SHALL NOT claim rerun completion;
- inspect `unchanged` SHALL mean a side-effect-free projection of an accepted active C5 lineage and its next existing owner action, without implying that inspect received a request;
- apply `unchanged` SHALL additionally require the submitted request digest to equal the accepted event request digest; and
- `blocked` SHALL include at most one exact existing-owner repair or user decision boundary and SHALL NOT include an action that would bypass the blocker.

Exit codes SHALL be closed and consistent with existing Agent-facing CLIs: `0` for `eligible|committed|unchanged|cleaned`, `1` for deterministic `recover_required|blocked`, and `2` only for invalid invocation, unsupported flags, an absent/unreadable bundle root or framework-owned configuration that prevents constructing the validated result envelope, or an internal operation failure that cannot produce that envelope. Once a bundle root is selected, a missing/unparseable runtime profile, malformed HITL2 parent or unsupported active rerun rule SHALL use the validated `blocked` envelope and exit `1`, not invocation/configuration exit `2`.

#### Scenario: Clean terminal Final is eligible

- **WHEN** the latest legal lifecycle lineage is readiness->Final with route-bound Final load, terminal status, at least one legally delivered final artifact, no active owner workspace/work and a supported available next-increment result
- **THEN** inspect SHALL report `eligible`
- **AND** SHALL return the exact request/apply preparation action and expected lineage bindings

#### Scenario: Next rerun would exhaust the existing gate rule

- **WHEN** fresh inspect obtains a supported unavailable result for the required rerun-phase increment
- **THEN** inspect/apply SHALL block before workspace creation
- **AND** inspect SHALL remain a legal side-effect-free eligibility check while apply SHALL NOT create a workspace or persist rerun semantics
- **AND** SHALL NOT reset or bypass the counter
- **AND** the nearest boundary SHALL be a user decision about starting a new bundle rather than an impossible C5 apply command

#### Scenario: Unsupported rerun facts do not guess a remedy

- **WHEN** the active rule, parsed profile or HITL2 parent is unsupported or unreadable
- **THEN** inspect/apply SHALL block with that concrete contract boundary
- **AND** SHALL NOT present new-bundle creation as though it repaired the unreadable contract
- **AND** a selected bundle with those runtime-authority failures SHALL return the validated `blocked` envelope with exit code `1`

#### Scenario: Pending artifact persistence keeps its owner

- **WHEN** an accepted artifact-persistence workspace exists for `final/` or another supported content target
- **THEN** C5 SHALL report only the existing quiescent artifact-persistence sweep action
- **AND** SHALL NOT hash an unstable final inventory or create a post-final workspace

#### Scenario: Accepted topic-state recovery keeps its owner

- **WHEN** an accepted topic-state workspace exists after lifecycle drift into Final
- **THEN** C5 SHALL report only its exact topic-state recover action
- **AND** SHALL NOT create a competing workspace or new semantic request

#### Scenario: Multiple accepted C5 workspaces are ambiguous

- **WHEN** more than one valid-looking prepared post-final recovery workspace exists
- **THEN** inspect/apply SHALL return `blocked` without selecting one operation or creating another workspace
- **AND** SHALL identify ambiguous recovery ownership as the direct integrity boundary

#### Scenario: Request fields do not create permission

- **WHEN** a retained request contains reason, scope or decision-source prose but current host permission or deterministic eligibility is absent
- **THEN** apply SHALL reject without mutation
- **AND** SHALL NOT treat those fields as verified identity, override or permission

#### Scenario: Logical bundle identity mismatch blocks replay

- **WHEN** request identity differs from current status bundle, plan/profile basename or accepted normalized bundle basename facts
- **THEN** apply SHALL reject before workspace creation as stale/wrong-bundle input
- **AND** SHALL NOT invent a new persistent bundle id or claim cryptographic clone detection

#### Scenario: Identical accepted request is idempotent

- **WHEN** apply repeats the same request digest against the same Final lineage, an identical valid recovery event already exists, and no accepted workspace remains
- **THEN** apply SHALL return `unchanged` without a duplicate workspace, profile rewrite or event
- **AND** its only next action SHALL match the current accepted stage: `enter-phase`, `advance-status`, the existing reentry/topic-state checkpoint, the existing rerun-ready gate after the exact count increment, or the current lifecycle owner after a proven descendant handoff has consumed the recovery lineage

#### Scenario: Inspect recognizes an accepted nonterminal recovery lineage

- **WHEN** a committed C5 lineage has legally entered rerun, synchronized status, incremented the bound rerun count or advanced through later normal descendant handoffs
- **THEN** inspect SHALL return `unchanged` with the one current existing-owner action without requiring terminal Final status or testing a second future increment
- **AND** SHALL NOT claim that inspect authenticated or compared a caller request

#### Scenario: Exact style recomputation remains accepted lineage

- **WHEN** sanctioned topic-state changes canonical registry length, the existing style CLI writes the complete RES-001 projection for the event-bound style, and rerun count advances to the recorded next count
- **THEN** inspect SHALL recognize `synchronized_count_incremented` and return the formal rerun-ready Gate as the one next action
- **AND** SHALL NOT treat the deterministic style projection as unrelated profile drift or ask for a user decision

#### Scenario: Style-before-count crash returns to the existing count owner

- **WHEN** sanctioned topic-state and the existing style CLI have committed the complete RES-001 projection but rerun count still equals the event-bound current count
- **THEN** inspect SHALL retain the existing `synchronized_initial_profile` stage and return the phase-rerun count increment as the one current-owner action
- **AND** SHALL NOT return to topic mutation, require a user decision, create another C5 stage or write the count itself

#### Scenario: Wrong style or unrelated profile change blocks

- **WHEN** current `research_profile` differs from the event-bound value, `research_style_params` equal neither the unchanged event-bound params nor the exact current shared projection, or any other profile field differs
- **THEN** C5 SHALL block as accepted-lineage drift
- **AND** SHALL NOT rewrite profile, choose another style or continue to the Gate

#### Scenario: Rerun-ready pass projects only its next proven normal owner

- **WHEN** the exact accepted-lineage rerun-ready attempt passes while status remains in its source window and no route-bound load exists yet
- **THEN** C5 MAY project only the existing enter-phase action
- **AND** after its matching load it MAY project only existing status synchronization until the matching transition/status exists
- **AND** it SHALL NOT project a later generic current owner before the corresponding normal facts exist

#### Scenario: Conflicting descendant evidence blocks

- **WHEN** a later passed attempt has the wrong source/target, or an observed load, transition, status window or current node conflicts with the exact normal handoff
- **THEN** C5 SHALL block on the earliest continuity failure
- **AND** SHALL NOT return generic current-owner success or fresh Final eligibility

#### Scenario: Different request cannot stack on one Final lineage

- **WHEN** a valid recovery event already owns the latest Final lineage and a caller submits different reason/scope semantics before a newer legal Final delivery
- **THEN** apply SHALL block without a second event or profile rewrite
- **AND** SHALL identify the existing accepted rerun lineage as the direct boundary

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

The stage predicates SHALL be mutually exclusive and deterministic. `pre_entry` requires the exact event-bound profile plus terminal Final node/window; an event-bound load left by a failed current-node write still maps to the same enter-phase retry. `loaded_pending_status` requires a route-bound load plus rerun current node and covers either the still-terminal gate window or the exact derived rerun window with the bound transition still missing; a conflicting transition blocks. `synchronized_initial_profile` requires load, bound transition, rerun current node, derived rerun window, the event-bound current count and either the exact event-bound style params or the complete exact RES-001 projection from unchanged event-bound `research_profile` plus current canonical registry. Its nearest owner SHALL be existing topic-state inspection for the exact event-bound profile and the existing phase-rerun count increment for the exact projected profile. `synchronized_count_incremented` permits the event-bound count delta from recorded `current_count` to recorded `next_count` under the same active rule digest, with either unchanged event-bound style parameters or that complete exact projection. Neither stage SHALL permit a style value matching neither allowed shape or any other profile delta, and the incremented stage SHALL NOT call next-increment availability again. After a valid rerun-ready gate consumes that synchronized lineage with its current-count evaluation, existing `descendant_pipeline` SHALL carry the nearest owner derived from each valid normal handoff stage: enter-phase before load, status synchronization after load, then current lifecycle owner after matching transition/status; later normal handoffs repeat this interpretation. It SHALL reuse normal authority rather than inventing a sixth C5 stage or falling back to fresh Final eligibility.

Before route-bound phase entry, event validation SHALL require the exact committed profile, unchanged terminal Final gate window/current node and current Final lineage. After `enter-phase` writes a load witness bound to that event, `advance-status --to hitl2_recorded` SHALL consume the event+load through the existing status owner and derive `next_gate: rerun_ready`. Immediate reentry and initial topic-state authorization, before rerun phase-owned profile mutation begins, SHALL require the immutable event, the event-bound exact after-profile semantics/hash, that load witness, the resulting `phase_transition`, `current_node: phases/phase-rerun.md`, and the current `hitl2_recorded -> rerun_ready` window. After that initial authorization, existing rerun ownership MAY, in its existing order, commit canonical topic changes, run the existing style CLI to replace `research_style_params` with the exact RES-001 projection while preserving event-bound `research_profile`, and change `rerun_count` from the event-bound `current_count` to `next_count`. A crash after the style write but before the count write SHALL resume at that existing count owner rather than repeat topic mutation or become drift. The event remains historical entry lineage rather than freezing those sanctioned mechanical projections forever; any style value matching neither allowed shape or any other profile delta remains unexplained drift.

The event SHALL authorize only the existing rerun phase and existing C3 mutation/gate pipeline. It SHALL NOT authorize arbitrary repair, state-seed, status/file patch, Final history rewrite, topic adoption by itself, or a second post-final success path. A second post-final rerun SHALL require a newer legal Final delivery lineage and a new operation.

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

- **WHEN** accepted lineage has the event-recorded current count and the complete exact RES-001 projection after sanctioned topic preparation
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
- **AND** explicit existing C3 `migrate_legacy` SHALL remain required before those topics gain canonical identity

#### Scenario: Unsupported maintenance remains unavailable

- **WHEN** the request asks for repair-in-place, generic state movement, developer state-seed or history rewrite
- **THEN** C5 SHALL reject the action as unsupported
- **AND** `human-directed` prose SHALL NOT widen the closed action authority
