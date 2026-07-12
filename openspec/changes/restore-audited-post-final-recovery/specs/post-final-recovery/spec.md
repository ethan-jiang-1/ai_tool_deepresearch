> req: POF-001, POF-002, POF-003

## ADDED Requirements

### Requirement: Post-final recovery SHALL expose one direct eligibility and request contract

The framework SHALL expose `operate-post-final-recovery.mjs inspect|apply|recover` with a closed action vocabulary containing only `post_final_rerun`. `inspect` SHALL be side-effect-free and SHALL derive eligibility from the latest legal readiness→Final gate/load lineage, terminal status/current node, current HITL2 profile, final artifact inventory, current trace, queue/work-unit quiescence, accepted recovery workspaces and the active rerun-count gate rule.

The active `rerun_count_limit` rule in `gate-rerun-ready.definition.json` SHALL be the only max-rerun Source of Record. Eligibility SHALL account for the existing rerun phase increment before the rerun-ready gate. It SHALL reject before workspace creation when the next increment would fail that rule; it SHALL NOT reset, decrement or bypass `rerun_count`.

An accepted C2 artifact-persistence workspace SHALL take precedence with the existing quiescent sweep action. An accepted C3 topic-state workspace SHALL take precedence with its exact recover action. Canonical topic drift that is repairable only after sanctioned rerun MAY remain carried context, but ambiguous control lineage, unstable final persistence, active work or exhausted rerun count SHALL block C5 acceptance.

`apply` SHALL accept one retained strict JSON request containing `schema_version`, action, non-empty reason/scope, and inspect-derived expected Final lineage bindings. The request SHALL NOT accept caller-selected node/gate/status/event/file lists, `human-directed`, force, override or identity-token fields. Request metadata SHALL carry semantic/audit input and optimistic concurrency only; it SHALL NOT prove caller identity or expand host permission.

Results SHALL use one Engine-owned Zod-validated envelope and operation-specific closed verdicts:

- `inspect`: `eligible|unchanged|recover_required|blocked`;
- `apply`: `committed|unchanged|recover_required|blocked`; and
- `recover`: `committed|cleaned|blocked`.

Every result SHALL carry at most one structured nearest action. `committed` means the exact profile/event operation is durable, not that rerun work or a lifecycle gate completed. `cleaned` means the exact event/profile were already committed and only accepted workspace cleanup remained. `unchanged` SHALL be used only for an already accepted identical request/stage; it SHALL NOT silently absorb different semantics against the same Final lineage.

#### Scenario: Clean terminal Final is eligible

- **WHEN** the latest legal lifecycle lineage is readiness→Final with route-bound Final load, terminal status, at least one legally delivered final artifact, no active owner workspace/work and sufficient remaining rerun count
- **THEN** inspect SHALL report `eligible`
- **AND** SHALL return the exact request/apply preparation action and expected lineage bindings

#### Scenario: Next rerun would exhaust the existing gate rule

- **WHEN** current `rerun_count` plus the required rerun-phase increment would fail the active `rerun_count_limit` rule
- **THEN** inspect/apply SHALL block before workspace creation
- **AND** SHALL NOT reset or bypass the counter
- **AND** the nearest boundary SHALL be a user decision about starting a new bundle rather than an impossible C5 command

#### Scenario: Pending artifact persistence keeps its owner

- **WHEN** an accepted artifact-persistence workspace exists for `final/` or another supported content target
- **THEN** C5 SHALL report only the existing quiescent artifact-persistence sweep action
- **AND** SHALL NOT hash an unstable final inventory or create a post-final workspace

#### Scenario: Accepted topic-state recovery keeps its owner

- **WHEN** an accepted topic-state workspace exists after lifecycle drift into Final
- **THEN** C5 SHALL report only its exact topic-state recover action
- **AND** SHALL NOT create a competing workspace or new semantic request

#### Scenario: Request fields do not create permission

- **WHEN** a retained request contains reason, scope or decision-source prose but current host permission or deterministic eligibility is absent
- **THEN** apply SHALL reject without mutation
- **AND** SHALL NOT treat those fields as verified identity, override or permission

#### Scenario: Identical accepted request is idempotent

- **WHEN** apply repeats the same request digest against the same Final lineage and an identical valid recovery event already exists
- **THEN** apply SHALL return `unchanged` without a duplicate workspace, profile rewrite or event
- **AND** its only next action SHALL match the current accepted stage: `enter-phase`, `advance-status`, or the existing reentry/topic-state checkpoint

#### Scenario: Different request cannot stack on one Final lineage

- **WHEN** a valid recovery event already owns the latest Final lineage and a caller submits different reason/scope semantics before a newer legal Final delivery
- **THEN** apply SHALL block without a second event or profile rewrite
- **AND** SHALL identify the existing accepted rerun lineage as the direct boundary

### Requirement: Post-final recovery SHALL commit profile and one event through explicit exact recovery

An accepted operation SHALL use `_diagnostics/post-final-recovery/<operation-id>/` and a Zod-validated `prepared` manifest. The workspace SHALL own only the retained request copy, before/after `rb_profile.yaml`, one exact staged `post_final_reentry` trace entry and their hashes/lineage metadata. It SHALL record but SHALL NOT mutate the expected terminal `rb_status.json` bytes. It SHALL NOT own topic, queue, work-unit, ledger, receipt, artifact, reference, final or cache bytes.

Durable prepared publication SHALL be the acceptance boundary. Before it, failure SHALL leave authority bytes unchanged and SHALL not advertise recoverability. After it, `recover` SHALL use only manifest-bound expected-old/staged-new bytes and exact event identity; it SHALL not accept new semantics or widen the file set.

Commit SHALL roll forward in this order:

1. replace the HITL2 profile projection with `status: recorded`, `user_decision: rerun`, `recorded_at` equal to the operation timestamp, and `rationale` equal to one deterministic serialization of the accepted reason plus requested scope, while preserving all other profile fields and existing `rerun_count`;
2. revalidate that status remains the exact terminal Final bytes accepted by the manifest;
3. validate the prepared pre-entry profile/terminal-state facts from the same shared evaluator;
4. append the exact event last through one durable idempotent primitive in the existing trace writer owner;
5. fsync and clean the workspace.

The manifest SHALL bind the expected trace prefix/index before event append. A changed prefix SHALL block rather than interleave an uncertain authority event. Exact event append SHALL be idempotent by event/operation identity: identical existing event means committed; conflicting identity/digest means blocked.

Recovery SHALL be roll-forward only. It MAY complete expected-old profile bytes to staged-new, append the missing exact event, or clean an already committed workspace. Profile or terminal-status drift SHALL block without restoring old state, deleting history or guessing rollback. Status synchronization after the event SHALL remain owned by existing `enter-phase` plus `advance-status`, not recover.

Reason and requested scope SHALL remain separate normalized fields in the append-only recovery event, but SHALL NOT add new `rb_profile.yaml` schema fields. The deterministic rationale serialization SHALL be specified and shared by apply/recover tests so exact recovery never reconstructs it from free-form prose.

#### Scenario: Crash before prepared publication is unaccepted

- **WHEN** apply stops before durable `prepared` publication
- **THEN** profile, status and trace SHALL remain unchanged
- **AND** the retained caller request MAY be used for a fresh apply

#### Scenario: Partial profile commit has no early handoff authority

- **WHEN** apply crashes after profile replacement but before exact event append
- **THEN** no post-final handoff SHALL be legal
- **AND** inspect SHALL return only the exact recover operation

#### Scenario: Trace prefix drift blocks event append

- **WHEN** trace bytes/index change after prepared publication but before the exact event is appended
- **THEN** apply/recover SHALL block without appending the event
- **AND** SHALL identify trace ownership/drift as the one direct blocker

#### Scenario: Event append is durable and idempotent

- **WHEN** profile matches staged bytes, status remains the expected terminal bytes and the exact event is absent
- **THEN** recover SHALL append and fsync that exact event through the existing trace owner
- **AND** a repeat recover SHALL recognize identical operation/event identity and clean or report committed without a duplicate event

#### Scenario: Late profile or terminal-status drift is not overwritten

- **WHEN** profile matches neither expected-old nor staged-new bytes, or status no longer matches the accepted terminal bytes before event append
- **THEN** recover SHALL block on the direct path
- **AND** SHALL NOT overwrite status, restore old profile bytes or delete the recovery audit

### Requirement: Post-final recovery SHALL create one lineage-bound rerun authority without widening lifecycle authority

The Engine-written `post_final_reentry` event SHALL bind operation/request digests, previous readiness→Final gate/load indexes, previous and committed-after profile semantic fields/hashes, previous status hash, final inventory digest, decision checkpoint `hitl2`, decision outcome `rerun`, transition-table digest/resolution, derived source status window, active rerun-limit rule id/definition digest and inspected `current_count|next_count|limit`, execution actor surface and timestamp. The target SHALL be resolved by the existing `transitions.chain.json` HITL2 `rerun` branch and manifest/status-window helpers; C5 SHALL NOT hardcode a second action→node/window table or add a Final outgoing edge. It SHALL not claim a verified personal identity or a gate attempt that did not occur.

Before route-bound phase entry, event validation SHALL require the exact committed profile, unchanged terminal Final gate window/current node and current Final lineage. After `enter-phase` writes a load witness bound to that event, `advance-status --to hitl2_recorded` SHALL consume the event+load through the existing status owner and derive `next_gate: rerun_ready`. Immediate reentry and initial topic-state authorization, before rerun phase-owned profile mutation begins, SHALL require the immutable event, the event-bound exact after-profile semantics/hash, that load witness, the resulting `phase_transition`, `current_node: phases/phase-rerun.md`, and the current `hitl2_recorded → rerun_ready` window. After that initial authorization, existing rerun ownership MAY change only `rerun_count` from the event-bound `current_count` to `next_count`; the event remains historical entry lineage rather than freezing the profile forever, and any other profile delta remains unexplained drift.

The event SHALL authorize only the existing rerun phase and existing C3 mutation/gate pipeline. It SHALL NOT authorize arbitrary repair, state-seed, status/file patch, Final history rewrite, topic adoption by itself, or a second post-final success path. A second post-final rerun SHALL require a newer legal Final delivery lineage and a new operation.

#### Scenario: Event authorizes only the existing rerun target

- **WHEN** a committed event is valid and unsuperseded before phase entry
- **THEN** its legal target SHALL be the current transition-table resolution for `phases/phase-hitl2.md` outcome `rerun`, currently `phases/phase-rerun.md`
- **AND** caller-supplied alternative target/gate/status values SHALL be rejected

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
