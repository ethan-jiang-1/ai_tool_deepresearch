> req: RRD-007, RRD-008

## MODIFIED Requirements

### Requirement: Reentry diagnostics SHALL use current_node as the current phase coordinate

Runtime reentry and diagnostic tooling SHALL treat
`rb_status.json#/current_node`, when present, as the current loaded lifecycle
phase coordinate. This coordinate explains where an Agent resumes Markdown;
existing Gate/checkpoint validation remains responsible for runtime
consistency.

When `current_node` is `phases/phase-final.md`, that coordinate SHALL represent a
route-bound Final load. For loads created under the current contract, prospective
admission required an empty first primary inventory or the exact retired C5 prior
inventory; an already-entered load predating that admission remains readable
through explicit compatibility. The coordinate SHALL remain current after the
first and every revised report because Final has no outgoing transition. Reentry
SHALL combine this coordinate with the current Gate window, canonical primary Final
inventory and accepted lineage facts: a loaded but unsynchronized Final projects
the exact existing Readiness status-sync owner; a synchronized admitted empty
inventory projects the bundle's first delivery; a newer legally loaded and
synchronized Final handoff whose retired C5 prior-inventory digest matches with
zero appended canonical versions projects immediate current-lineage delivery; a
report proven as an immutable append for that lineage projects latest-report
refinement; an accepted publication
workspace projects exact artifact sweep/recovery; and an already accepted,
still-active C5 workspace or lineage projects its existing recovery owner. A
clean Final SHALL always project the Final owner, but SHALL distinguish delivery
pending from refinement using direct lineage/inventory facts. Reentry SHALL not
read or classify the current user turn or infer satisfaction, pending feedback,
or rerun intent from chat history or file mtime; the Agent owns semantic request
classification outside this deterministic projection.

For a current-pair bundle with absent/null `current_node`, tooling SHALL report
that no current phase coordinate is populated and use existing trace/checkpoint
inference where available. Advice SHALL point to `BUNDLE_MAP.md`, trace, and
reentry diagnostics. A directory missing the current entry pair fails earlier;
reentry SHALL not use `START_FROM_HERE.md` as compatibility fallback.

#### Scenario: Reentry reports current loaded phase

- **WHEN** status contains `current_node: phases/phase-hitl2.md`
- **THEN** diagnostics SHALL report that current phase coordinate and distinguish it from `current_gate` and `next_gate`

#### Scenario: Reentry reports Final as still current

- **WHEN** status contains `current_node: phases/phase-final.md` after one or more committed primary reports
- **THEN** diagnostics SHALL continue to report Final as the current phase
- **AND** it SHALL not require a self-transition, new load event, or satisfaction state

#### Scenario: Legacy or initial bundle without populated current node remains readable

- **WHEN** a current-pair bundle has absent/null `current_node`
- **THEN** reentry SHALL not fail solely for that absence
- **AND** it SHALL advise that the next successful `enter-phase` populates the coordinate and point to current bundle maps/trace

#### Scenario: Legacy START_FROM_HERE fallback is deprecated

> **@deprecated scenario name** — Retained solely as the established anchor.

- **WHEN** tooling finds `START_FROM_HERE.md` but no same-root `BUNDLE_ENTRY.md` plus `BUNDLE_MAP.md`
- **THEN** it SHALL return the unsupported-current-entry-contract blocker
- **AND** it SHALL not preserve or recommend the deprecated fallback

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger,
checkpoint, file-observability, primary Final inventory, and post-final recovery
inspections into an additive structured recovery summary. It SHALL identify
canonical root findings and supporting counts. Each independent root SHALL name
whether its nearest sanctioned path is `reachable`, `missing_contract`, or
`not_applicable` and carry at most one structured action.

The Engine-owned schema SHALL require an action only for `reachable`, forbid one
for `missing_contract`, and include every blocking canonical primary finding.
The Engine SHALL not select one global strategy across independent roots.
Existing output fields, schema version, and exit-code behavior SHALL remain
compatible unless an implementation task explicitly proves a schema-version
bump is necessary; no new action kind SHALL be added merely to represent normal
Final refinement.

Blocking canonical findings SHALL keep `check.passed: false` and exit `1`;
warning/info findings remain non-blocking. The projection SHALL reuse canonical
inventory, backing, lifecycle, or post-final eligibility results rather than
recompute them. It SHALL read current bundle files only and SHALL not mutate
runtime authority or rely on chat memory.

Across a Final-boundary handoff and current terminal Final, owner precedence
SHALL be:

1. accepted artifact-publication/persistence workspace -> exact existing
   quiescent `sweep` or blocked-workspace repair;
2. invalid or ambiguous canonical primary inventory -> its direct inventory
   blocker, never post-final rerun;
3. already accepted, still-active C5 workspace or lineage -> its exact existing
   recovery owner;
4. newer legal Final handoff after retired C5 but no route-bound Final load ->
   exact existing `enter-phase` action, whose admission must reproduce the
   event-bound prior inventory before mutation;
5. route-bound Final load before the Readiness source Gate is synchronized ->
   exact existing `advance-status --to readiness_passed` action;
6. admitted and synchronized newer Final load -> current Final owner, using the event-bound prior
   inventory digest to distinguish zero-append immediate delivery from one-or-
   more-append latest refinement; and
7. otherwise -> current Final owner, using admitted empty inventory for the bundle's first
   delivery or the latest committed primary report for refinement.

Final refinement MAY be projected as the existing `current_owner` action kind
targeted at `phases/phase-final.md`; it SHALL not add a recovery controller,
infer a user request, publish a report, or claim user satisfaction. A clean
Final SHALL not project C5 as the default root, even if side-effect-free C5
inspect would report that rerun is mechanically available.

Once post-final rerun is accepted, the existing C5 stage/owner mapping SHALL
remain intact: accepted C5 workspace -> exact recover; committed handoff before
entry -> exact `enter-phase`; entered but unsynchronized -> exact
`advance-status`; topic/style/count/rerun-ready descendants -> their existing
owner; proven later normal handoff -> current lifecycle owner; exhausted rerun
-> new-bundle user decision; stale/ambiguous/conflicting state -> one blocker.
Immediately after legal post-final entry/status operations, existing
postconditions SHALL continue to check the actual current source-gate window.

#### Scenario: Incident-shaped bundle produces one canonical recovery root

- **WHEN** one registry-external durable Topic causes dependent missing surfaces
- **THEN** diagnostics SHALL retain detail but project the unregistered Topic as one blocking root
- **AND** dependent symptoms SHALL not create competing actions

#### Scenario: Missing sanctioned path is explicit

- **WHEN** no accepted path reaches the suggested owner
- **THEN** the root SHALL report `missing_contract` and omit an unreachable command

#### Scenario: Eligible terminal Final exposes one recovery action

> **@deprecated behavior** — The historical scenario title is retained as an
> archive anchor. Before C5 has accepted a request, the one reachable action is
> now the current Final owner rather than C5 preparation.

- **WHEN** the latest lineage is clean terminal Final, inventory is valid, and no publication or accepted C5 workspace exists
- **THEN** recovery summary SHALL expose the current Final owner as reachable
- **AND** it SHALL not emit post-final recovery preparation as the default action

#### Scenario: Newer Final lineage with zero append resumes immediate delivery

- **WHEN** accepted C5 descendants reach a newer legal Final handoff, exact prior-inventory admission creates its route-bound Final load, Readiness status synchronization completes, and inventory has no appended canonical version
- **THEN** recovery summary SHALL expose `phases/phase-final.md` as the current owner for immediate delivery
- **AND** it SHALL not present the prior report as current-lineage delivery or expose fresh C5 preparation

#### Scenario: Post-C5 Final entry drift keeps the exact entry owner

- **WHEN** accepted C5 descendants reach a newer legal Final handoff but current safe Final inventory differs from the retired event-bound prior digest before its Final load
- **THEN** recovery SHALL expose the existing Final `enter-phase` boundary or its direct blocker rather than a loaded Final refinement owner
- **AND** it SHALL not treat drifted files as current-lineage delivery or infer a fresh C5 request

#### Scenario: Loaded newer Final keeps status synchronization ahead of delivery

- **WHEN** the newer route-bound Final load exists but the Readiness source Gate has not been synchronized
- **THEN** recovery summary SHALL expose only the existing `advance-status --to readiness_passed` action for that lifecycle root
- **AND** it SHALL not project Final publication, refinement, or fresh C5 eligibility

#### Scenario: Newer Final lineage with proven append resumes refinement

- **WHEN** current valid inventory uniquely preserves the retired event-bound prior inventory and appends one or more highest canonical versions
- **THEN** recovery summary SHALL expose the latest appended report under the current Final refinement owner
- **AND** it SHALL preserve every earlier report and C5 event as historical truth

#### Scenario: Accepted post-final request exposes post-final recovery

- **WHEN** an Agent-classified evidence-expanding request has established an accepted C5 workspace or lineage
- **THEN** summary SHALL expose its exact post-final recovery owner action
- **AND** it SHALL not also expose Final presentation refinement as a competing root

#### Scenario: Prepared post-final operation masks downstream symptoms

- **WHEN** an accepted C5 workspace exists before full event commit or after event commit with cleanup incomplete
- **THEN** that workspace SHALL be the primary lifecycle root with exact recover action
- **AND** downstream profile/topic symptoms SHALL not compete

#### Scenario: Pending artifact persistence precedes C5

- **WHEN** terminal Final contains an accepted artifact-persistence workspace
- **THEN** summary SHALL expose only the existing quiescent sweep/recovery action for that root
- **AND** it SHALL not publish, refine, or offer C5 while inventory is unstable

#### Scenario: Ambiguous primary inventory blocks before rerun

- **WHEN** terminal Final primary inventory cannot classify a unique modern or legacy base
- **THEN** summary SHALL expose that direct blocker
- **AND** it SHALL not choose a report, version, Final rewrite, or C5 action

#### Scenario: Style-before-count summary uses the shared current owner

- **WHEN** the shared C5 evaluator proves the existing style-before-count crash window
- **THEN** summary SHALL retain the existing phase-rerun count-increment owner
- **AND** it SHALL not return to Final refinement

#### Scenario: Equal projection keeps the idempotent phase owner

- **WHEN** C5 style values cannot prove style execution because current and event-bound projections are equal
- **THEN** summary SHALL preserve the shared topic-state/phase owner
- **AND** it SHALL not infer another owner

#### Scenario: Exhausted rerun limit does not expose an impossible path

- **WHEN** the active rule makes the requested rerun unavailable
- **THEN** summary SHALL omit C5 apply and expose only the existing new-bundle decision boundary

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean non-Final reentry case runs
- **THEN** existing output fields, schema version, and exit codes SHALL preserve accepted semantics

#### Scenario: Invocation error may omit recovery context

- **WHEN** invocation cannot load a bundle or normalize target and exits `2`
- **THEN** it MAY omit recovery while preserving structured invocation feedback

#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces a summary
- **THEN** recursive before/after inspection SHALL show no mutation to runtime authority or content
