## REMOVED Requirements

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

- Reason: 粒度拆分(spec-lean mainline C3 megablock-requirement-split):Reentry diagnostics SHALL summarize incident-shaped recovery truth 超粒度,按深挖定稿分界拆为单主题子块。
- Migration: requirement 文本逐字节守恒拆为 2 个子 requirement: Reentry diagnostics SHALL compose incident truth with schema-bound actions and read-only findings / Post-final reentry projections SHALL preserve Final boundary owners and pass lineage。requirement 身份 = 标题稳定锚点;registry 与 spec header 零触碰(无新增/废弃 ID)。

## ADDED Requirements

### Requirement: Reentry diagnostics SHALL compose incident truth with schema-bound actions and read-only findings

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

#### Scenario: Incident-shaped bundle produces one canonical recovery root

- **WHEN** one registry-external durable Topic causes dependent missing surfaces
- **THEN** diagnostics SHALL retain detail but project the unregistered Topic as one blocking root
- **AND** dependent symptoms SHALL not create competing actions

#### Scenario: Missing sanctioned path is explicit

- **WHEN** no accepted path reaches the suggested owner
- **THEN** the root SHALL report `missing_contract` and omit an unreachable command

#### Scenario: Eligible terminal Final exposes one recovery action

> **@deprecated behavior** — The historical scenario title is retained as an
> archive anchor. Before ReopenResearchPass has accepted a request, the one reachable action is
> now the current Final owner rather than ReopenResearchPass preparation.

- **WHEN** the latest lineage is clean terminal Final, inventory is valid, and no publication or accepted ReopenResearchPass workspace exists
- **THEN** recovery summary SHALL expose the current Final owner as reachable
- **AND** it SHALL not emit post-final recovery preparation as the default action

#### Scenario: Invocation error may omit recovery context

- **WHEN** invocation cannot load a bundle or normalize target and exits `2`
- **THEN** it MAY omit recovery while preserving structured invocation feedback


#### Scenario: blocked inspection is not projected as reachable

- **WHEN** a post-final inspection returns `verdict: blocked` for a root
- **THEN** the summary SHALL project that root as blocked
- **AND** it SHALL NOT project a `reachable` current-owner action with `blocker: null`

#### Scenario: Recovery summary is read-only
#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces a summary
- **THEN** recursive before/after inspection SHALL show no mutation to runtime authority or content

### Requirement: Post-final reentry projections SHALL preserve Final boundary owners and pass lineage

Across a Final-boundary handoff and current terminal Final, owner precedence
SHALL be:

1. already accepted, still-active ReopenResearchPass workspace or lineage -> its exact existing
   recovery owner;
2. accepted artifact-publication/persistence workspace -> exact existing
   quiescent `sweep` or blocked-workspace repair;
3. invalid or ambiguous canonical primary inventory -> its direct inventory
   blocker, never post-final rerun;
4. newer legal Final handoff after retired ReopenResearchPass but no route-bound Final load ->
   exact existing `enter-phase` action, whose admission must reproduce the
   event-bound prior inventory before mutation;
5. route-bound Final load before the Readiness source Gate is synchronized ->
   exact existing `advance-status --to readiness_passed` action;
6. admitted and synchronized newer Final load -> current Final owner, using the event-bound prior
   inventory digest to distinguish zero-append immediate delivery from one-or-
   more-append latest refinement; and
7. otherwise -> current Final owner, using admitted empty inventory for the bundle's first
   delivery or the latest committed primary report for refinement.


A post-final inspection whose verdict is `blocked` SHALL project that root as blocked and SHALL NOT fall
through to a `blocker: null` reachable current-owner action; a blocked root is never `reachable`. The
summary SHALL also distinguish delivery-pending from refinement in its projected Final action:
zero-append (admitted empty inventory or a newer lineage with no appended canonical version) SHALL project
as immediate delivery, while a proven-append (latest committed report bound to the current lineage) SHALL
project as latest-report refinement; the two SHALL NOT be byte-identical projections.
This ordering SHALL follow `research/post-final-recovery` (POF-001), which owns
accepted ReopenResearchPass workspace/lineage precedence over artifact-persistence ownership;
this list mirrors that Source of Record and SHALL NOT re-decide the precedence
or add an owner.

Final refinement MAY be projected as the existing `current_owner` action kind
targeted at `phases/phase-final.md`; it SHALL not add a recovery controller,
infer a user request, publish a report, or claim user satisfaction. A clean
Final SHALL not project ReopenResearchPass as the default root, even if side-effect-free ReopenResearchPass
inspect would report that rerun is mechanically available.

Once post-final rerun is accepted, the existing ReopenResearchPass stage/owner mapping SHALL
remain intact: accepted ReopenResearchPass workspace -> exact recover; committed handoff before
entry -> exact `enter-phase`; entered but unsynchronized -> exact
`advance-status`; topic/style/count/rerun-ready descendants -> their existing
owner; proven later normal handoff -> current lifecycle owner; exhausted rerun
-> new-bundle user decision; stale/ambiguous/conflicting state -> one blocker.
Immediately after legal post-final entry/status operations, existing
postconditions SHALL continue to check the actual current source-gate window.
#### Scenario: Newer Final lineage with zero append resumes immediate delivery

- **WHEN** accepted ReopenResearchPass descendants reach a newer legal Final handoff, exact prior-inventory admission creates its route-bound Final load, Readiness status synchronization completes, and inventory has no appended canonical version
- **THEN** recovery summary SHALL expose `phases/phase-final.md` as the current owner for immediate delivery
- **AND** it SHALL not present the prior report as current-lineage delivery or expose fresh ReopenResearchPass preparation

#### Scenario: Post-ReopenResearchPass Final entry drift keeps the exact entry owner

- **WHEN** accepted ReopenResearchPass descendants reach a newer legal Final handoff but current safe Final inventory differs from the retired event-bound prior digest before its Final load
- **THEN** recovery SHALL expose the existing Final `enter-phase` boundary or its direct blocker rather than a loaded Final refinement owner
- **AND** it SHALL not treat drifted files as current-lineage delivery or infer a fresh ReopenResearchPass request

#### Scenario: Loaded newer Final keeps status synchronization ahead of delivery

- **WHEN** the newer route-bound Final load exists but the Readiness source Gate has not been synchronized
- **THEN** recovery summary SHALL expose only the existing `advance-status --to readiness_passed` action for that lifecycle root
- **AND** it SHALL not project Final publication, refinement, or fresh ReopenResearchPass eligibility

#### Scenario: Newer Final lineage with proven append resumes refinement

- **WHEN** current valid inventory uniquely preserves the retired event-bound prior inventory and appends one or more highest canonical versions
- **THEN** recovery summary SHALL expose the latest appended report under the current Final refinement owner
- **AND** it SHALL preserve every earlier report and ReopenResearchPass event as historical truth

#### Scenario: Accepted post-final request exposes post-final recovery

- **WHEN** an Agent-classified evidence-expanding request has established an accepted ReopenResearchPass workspace or lineage
- **THEN** summary SHALL expose its exact post-final recovery owner action
- **AND** it SHALL not also expose Final presentation refinement as a competing root

#### Scenario: Prepared post-final operation masks downstream symptoms

- **WHEN** an accepted ReopenResearchPass workspace exists before full event commit or after event commit with cleanup incomplete
- **THEN** that workspace SHALL be the primary lifecycle root with exact recover action
- **AND** downstream profile/topic symptoms SHALL not compete

#### Scenario: Pending artifact persistence precedes ReopenResearchPass

> **@deprecated scenario name** — The title is retained as the historical
> anchor. With no accepted ReopenResearchPass workspace, an accepted artifact-persistence
> workspace takes precedence; an accepted ReopenResearchPass owner takes precedence over it
> per POF-001.

- **WHEN** terminal Final contains an accepted artifact-persistence workspace and no accepted ReopenResearchPass workspace or lineage exists
- **THEN** summary SHALL expose only the existing quiescent sweep/recovery action for that root
- **AND** it SHALL not publish, refine, or offer ReopenResearchPass while inventory is unstable

#### Scenario: Ambiguous primary inventory blocks before rerun

- **WHEN** terminal Final primary inventory cannot classify a unique modern or legacy base
- **THEN** summary SHALL expose that direct blocker
- **AND** it SHALL not choose a report, version, Final rewrite, or ReopenResearchPass action

#### Scenario: Style-before-count summary uses the shared current owner

- **WHEN** the shared ReopenResearchPass evaluator proves the existing style-before-count crash window
- **THEN** summary SHALL retain the existing phase-rerun count-increment owner
- **AND** it SHALL not return to Final refinement

#### Scenario: Equal projection keeps the idempotent phase owner

- **WHEN** ReopenResearchPass style values cannot prove style execution because current and event-bound projections are equal
- **THEN** summary SHALL preserve the shared topic-state/phase owner
- **AND** it SHALL not infer another owner

#### Scenario: Exhausted rerun limit does not expose an impossible path

- **WHEN** the active rule makes the requested rerun unavailable
- **THEN** summary SHALL omit ReopenResearchPass apply and expose only the existing new-bundle decision boundary

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean non-Final reentry case runs
- **THEN** existing output fields, schema version, and exit codes SHALL preserve accepted semantics

#### Scenario: zero-append and proven-append projections are distinguishable

- **WHEN** a newer Final lineage has no appended canonical version (delivery-pending)
- **THEN** the summary SHALL project immediate delivery as the Final action
- **AND** when the current lineage has a latest committed report bound by a proven append, the summary SHALL
  project latest-report refinement instead
- **AND** the two projections SHALL NOT be byte-identical
