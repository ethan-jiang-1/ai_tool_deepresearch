## MODIFIED Requirements

### Requirement: Reentry SHALL consume canonical topic-state inspection without mutation

Reentry diagnostics SHALL consume the side-effect-free topic-state read model
and group registry, seed, queue/work-unit and artifact symptoms for one
canonical UID into one root finding with at most one reachable nearest action.
An accepted topic-state workspace SHALL be a direct blocker whose reachable
action is the exact topic-state recover command. Reentry SHALL NOT execute
apply/recover, persist progress or create identity.

A plan that fails the current canonical plan contract SHALL produce the shared
canonical-topic-state blocker without reentry mutation, migration, adoption,
upgrade, conversion, or a C5 route for making the historical plan current. Its
historical bytes remain human-readable outside the current Engine. C5 continues
to govern canonical post-final topic repair only: before its valid complete
handoff, reentry SHALL not present fresh canonical topic-state apply; after its
route-bound rerun witness, it MAY expose only the existing canonical
add/update/direction/layout operations subject to their normal checks. An
accepted prepared topic-state workspace remains recoverable after lifecycle
drift because recovery finishes previously authorized bytes; this SHALL NOT
make fresh apply reachable outside an accepted rerun witness.

#### Scenario: One UID drift becomes one root
- **WHEN** a topic has registry/seed binding failure plus derivative queue/artifact symptoms
- **THEN** reentry SHALL emit one topic-state root and mask derivative symptoms

#### Scenario: Clean topic state remains read-only
- **WHEN** identity/materialization/direct facts are consistent and no accepted workspace remains
- **THEN** integration SHALL add no blocker and mutate no bundle file

#### Scenario: Post-final legacy incident points to C5 first
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state that needs post-final repair and no accepted post-final or topic-state workspace
- **THEN** it SHALL expose the exact C5 eligibility/apply action or direct C5 blocker
- **AND** it SHALL not use that C5 action to make a historical mutable plan current

#### Scenario: Post-final legacy incident points to missing C5
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state but the post-final recovery evaluator cannot establish an eligible or accepted C5 path
- **THEN** it SHALL report the direct missing/blocked C5 boundary
- **AND** it SHALL not recommend historical-plan migration, adoption, upgrade, or conversion

#### Scenario: Historical mutable plan stops at the current topic-state boundary
- **WHEN** reentry reads an `rb_plan.md` that fails the current canonical plan contract
- **THEN** it SHALL return the shared canonical-topic-state blocker without changing bundle bytes
- **AND** it SHALL not advertise migration, adoption, upgrade, conversion, or C5 as a route to make that plan current

#### Scenario: Post-final accepted workspace exposes exact recovery only
- **WHEN** terminal lifecycle state contains an accepted prepared post-final recovery or topic-state workspace, including a C5 workspace whose event is committed but cleanup is incomplete
- **THEN** reentry SHALL expose the exact owning recover operation id
- **AND** SHALL NOT expose fresh apply or new semantic input

#### Scenario: Route-bound post-final rerun exposes existing topic repair
- **WHEN** a valid post-final recovery event and exact after-profile have been consumed by completed route-bound `enter-phase`, the exact bound exceptional `phase_transition` exists, and current node/status are the existing rerun window
- **THEN** reentry MAY expose existing canonical `operate-topic-state` add/update/direction/layout actions subject to C3 checks
- **AND** SHALL NOT create a C5-specific topic mutation action or a historical-plan migration route

#### Scenario: Legal current-node update preserves recovery lineage

- **WHEN** the recovery event has a completed route-bound rerun load/current-node update but existing status sync has not completed
- **THEN** reentry SHALL expose only `advance-status --to hitl2_recorded`
- **AND** SHALL NOT report the legal current-node update as manual drift or expose topic mutation early

#### Scenario: Post-entry check uses the incoming source checkpoint

- **WHEN** current node is rerun and current gate remains `hitl2_recorded`
- **THEN** guidance SHALL use `check-reentry --at hitl2_recorded`
- **AND** SHALL NOT claim `phase-rerun` / `rerun_ready` has already passed
