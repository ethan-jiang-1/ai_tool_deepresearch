## MODIFIED Requirements

### Requirement: Post-final recovery SHALL create one lineage-bound rerun authority without widening lifecycle authority

The Engine-written `post_final_reentry` event SHALL include top-level `bundle` equal to the accepted status bundle and bind a stable event id, logical bundle identity tuple, operation/request digests, previous readiness->Final gate/load indexes, previous and committed-after profile semantic fields/hashes, previous status hash, final inventory digest, decision checkpoint `hitl2`, decision outcome `rerun`, transition-table digest/resolution, derived source status window, active rerun-limit rule id/definition digest and inspected `current_count|next_count|limit`, execution actor surface and timestamp. The C5 adapter SHALL derive those three count facts from the supported REI-003 fresh-eligibility result while preserving their existing field names and schema. The prepared manifest SHALL separately bind SHA256 of the exact staged UTF-8 JSON object-line bytes excluding the terminal LF; the event SHALL NOT contain a self-referential digest field. Downstream load/transition bindings SHALL carry event id plus that exact event-line SHA256. The target SHALL be resolved by the existing `transitions.chain.json` HITL2 `rerun` branch and manifest/status-window helpers; C5 SHALL NOT hardcode a second action->node/window table or add a Final outgoing edge. It SHALL not claim a verified personal identity, globally unique bundle identity or a gate attempt that did not occur.

The recorded transition-table digest SHALL remain acceptance-time audit context rather than a perpetual whole-file lock. Before event append and while consuming the exceptional handoff, the C5 ownership/stage evaluator SHALL re-resolve the relevant HITL2 `rerun` target and target status-window tuple and require them to equal the recorded resolution. An unrelated transition/manifest edit that preserves that semantic tuple MAY remain valid; changed or unresolvable target/window semantics SHALL block. The active rerun-limit rule SHALL remain bound by exact rule id/digest/current/next/limit until the sanctioned count increment because that rule directly determines whether this accepted rerun can pass.

One pure structural parser SHALL validate the event's immutable schema, deterministic event/operation/request identity, Final lineage references and current transition/manifest resolution, and compute the exact event-line SHA256 fact without requiring one mutable lifecycle stage. Existing handoff, phase-status, reentry and topic-state owners SHALL consume that same parsed fact object through closed stage predicates: `pre_entry`, `loaded_pending_status`, `synchronized_initial_profile`, or `synchronized_count_incremented`. Later load/transition predicates SHALL compare their recorded hash to that computed fact. A later-stage consumer SHALL NOT rerun a pre-entry terminal-status predicate or maintain a second event interpretation.

The stage predicates SHALL be mutually exclusive and deterministic. `pre_entry` requires the exact event-bound profile plus terminal Final node/window; an event-bound load left by a failed current-node write still maps to the same enter-phase retry. `loaded_pending_status` requires a route-bound load plus rerun current node and covers either the still-terminal gate window or the exact derived rerun window with the bound transition still missing; a conflicting transition blocks. `synchronized_initial_profile` requires load, bound transition, rerun current node, derived rerun window, the event-bound current count and either the exact event-bound style params or the complete exact RES-001 projection from unchanged event-bound `research_profile` plus current canonical registry. Its nearest owner SHALL be existing topic-state/phase inspection for exact event-bound params, including when the computed projection is equal and therefore provides no progress witness, and the existing phase-rerun count increment only when the exact projected params differ from event-bound params. `synchronized_count_incremented` permits the event-bound count delta from recorded `current_count` to recorded `next_count` under the same active rule digest, with either unchanged event-bound style parameters or that complete exact projection. Neither stage SHALL permit a style value matching neither allowed shape or any other profile delta, and the incremented stage SHALL NOT call next-increment availability again. After a valid rerun-ready gate consumes that synchronized lineage with its current-count evaluation, existing `descendant_pipeline` SHALL carry the nearest owner derived from each valid normal handoff stage: enter-phase before load, status synchronization after load, then current lifecycle owner after matching transition/status; later normal handoffs repeat this interpretation. It SHALL reuse normal authority rather than inventing a sixth C5 stage or falling back to fresh Final eligibility.

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
