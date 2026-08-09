# Change Feedback Loop

> req: CHF-001, CHF-002, CHF-003, CHF-004

## Purpose

Define the repository-level feedback lifecycle for an OpenSpec change so that review obligations survive
across Agent sessions and one deterministic finalizer closes only the mechanical archive prerequisites.

## Requirements

### Requirement: Change feedback obligations SHALL be durable and review-scoped

For every change that uses the project feedback lifecycle, the generated task list SHALL contain exactly one
completed-or-pending plan-review marker `openspec-feedback:plan-review` and exactly one
completed-or-pending closeout-review marker `openspec-feedback:closeout-review`. The plan review SHALL be
completed before target implementation begins; the closeout review SHALL be completed only after the
change-scoped actual diff, applicable artifacts, and selected verification evidence have been reviewed.

When an Agent finds a review issue that requires work, it SHALL record an ordinary incomplete task with the
affected requirement or reader question, authoritative owner, smallest repair, and independently observable
done condition. A review marker records that the required review step is open or closed; it SHALL NOT prove
semantic review quality, test success, delta/main equivalence, or archive completion. Resuming apply SHALL
preserve pending feedback tasks rather than treating a prior conversation summary as completion.

#### Scenario: plan review is persisted before implementation

- **WHEN** a project change is created with the feedback lifecycle enabled
- **THEN** its generated tasks SHALL contain one pending plan-review marker
- **AND** target implementation SHALL not be treated as ready until that marker is completed

#### Scenario: closeout finding returns to normal work

- **WHEN** a closeout review finds a change-scoped defect or unresolved behavior boundary
- **THEN** the Agent SHALL add an ordinary incomplete repair task and leave the closeout-review marker incomplete
- **AND** archive finalization SHALL remain unavailable until the repair and a subsequent closeout review complete

#### Scenario: review marker does not manufacture proof

- **WHEN** both review markers are completed but a selected test, governance check, or native archive condition fails
- **THEN** the change SHALL remain unarchived
- **AND** the marker state SHALL not be reported as evidence that the failed condition passed

### Requirement: Change lifecycle operations SHALL deliver current review guidance

Supported project apply and archive entry surfaces SHALL obtain the current OpenSpec operation guidance for the
selected change and present the corresponding feedback-lifecycle action before target implementation or final
archive transition. Apply guidance SHALL direct the Agent to the plan-review obligation and pending feedback
tasks. Archive guidance SHALL direct the Agent to the change-scoped closeout review, Agent-driven delta/main
sync and re-comparison when applicable, and the governed finalizer after those semantic steps are complete.

`SUPPORTED_ENTRY_SURFACES` in
`openspec/governance/finalize-change-archive.mjs` SHALL be the one
project-owned inventory of supported entry surfaces. It SHALL list exactly:

- apply: `.agents/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/source-command-opsx-apply/SKILL.md`,
  `.claude/skills/openspec-apply-change/SKILL.md`, and
  `.claude/commands/opsx/apply.md`;
- archive: `.agents/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/source-command-opsx-archive/SKILL.md`,
  `.claude/skills/openspec-archive-change/SKILL.md`, and
  `.claude/commands/opsx/archive.md`.

Deleted `.codex` skill and prompt paths SHALL not be represented as supported
entry surfaces. Tests for lifecycle delivery SHALL consume this inventory rather
than maintain a divergent entry list.

After `governance/semantic-fact-closure` is accepted, the current plan and
closeout review guidance SHALL also direct the Agent to inspect the selected
change's `semantic-closure.yaml`. For an `affected` record, review SHALL assess
whether its bounded fact, resolver, establishing surfaces, verdict consumers,
and overlap relation are complete against the planned or actual changed
surfaces. For `not_applicable`, review SHALL assess whether the reason remains
true for those surfaces. A structurally valid checker result SHALL not be
reported as this semantic judgment; any finding SHALL use the ordinary pending
task route.

Before the first target edit, every supported project apply entry surface SHALL
run the existing verification-routing plan check and then
`node openspec/governance/check-semantic-closure.mjs --change <name> --mode plan` for the selected change.
For a feedback-lifecycle change, it SHALL do so after the plan review completes.
The absence of an `openspec-feedback:` marker SHALL not exempt a selected change
from either plan check. It SHALL stop before target edits on either failure and
expose the failed check's repair coordinate and rerun command.

Before the final archive transition, every supported project archive entry
surface SHALL preserve the governed finalizer as its one success route. A
selected change without exactly one plan-review and one closeout-review marker
SHALL stop before finalization, direct the Agent to add the required marker
tasks and resume apply, and SHALL not treat absent markers as a
semantic-closure exemption or invoke a separate native archive path.

Guidance is an Agent-facing delivery channel only. It SHALL not replace artifact instructions, create a
deterministic verdict, select semantic repairs, override a missing capability, or permit archive when the
finalizer's direct prerequisites fail. A supported entry surface that cannot obtain its required guidance SHALL
stop before the relevant transition and expose the observed instruction boundary and the same entry retry
coordinate.

#### Scenario: apply entry delivers the current plan-review action

- **WHEN** an Agent starts or resumes apply for a feedback-lifecycle change
- **THEN** the supported entry surface SHALL present the current plan-review and pending-task context
- **AND** it SHALL not claim that guidance itself completes the review

#### Scenario: Current entry inventory excludes retired paths

- **WHEN** a project lifecycle entry is selected after the `.codex` to
  `.agents` / `.claude` migration
- **THEN** `SUPPORTED_ENTRY_SURFACES` SHALL identify the current apply or
  archive path from its declared list
- **AND** a deleted `.codex` path SHALL not be treated as a supported entry or
  a route that may bypass lifecycle delivery

#### Scenario: Semantic closure review remains Agent-owned

- **WHEN** a selected change has a structurally valid semantic-closure record
- **THEN** current plan and closeout guidance SHALL direct the Agent to review
  its status branch and, when affected, its resolver/`established_by`/consumer/overlap
  inventory against the relevant surfaces
- **AND** a checker PASS SHALL NOT be reported as semantic completeness

#### Scenario: semantic closure plan failure blocks target edits

- **WHEN** the selected change has no valid semantic-closure record or the
  closure plan check finds a direct structural root
- **THEN** the supported apply entry SHALL stop before target edits
- **AND** it SHALL preserve the selected change identity and direct repair to
  the checker's reported coordinate and plan-mode rerun command

#### Scenario: An unmarked change cannot bypass semantic closure

- **WHEN** a supported apply entry selects a change whose task list has no
  `openspec-feedback:` marker
- **THEN** it SHALL still run verification-routing plan mode followed by
  semantic-closure plan mode before target edits
- **AND** it SHALL not treat the absent marker as a semantic-closure opt-out

#### Scenario: An unmarked change cannot bypass semantic closure at archive

- **WHEN** a supported archive entry selects a change without the required
  feedback marker pair
- **THEN** it SHALL stop before finalization and direct repair to the task list
  followed by the normal apply route
- **AND** it SHALL not invoke native archive or present marker absence as a
  semantic-closure opt-out

#### Scenario: archive entry delivers closeout before finalization

- **WHEN** an Agent requests archive for a feedback-lifecycle change
- **THEN** the supported entry surface SHALL present the closeout-review and semantic sync/re-comparison route
- **AND** it SHALL not direct a raw move or bypass the governed finalizer

#### Scenario: missing operation guidance remains an honest boundary

- **WHEN** a supported lifecycle entry cannot obtain valid current operation guidance
- **THEN** it SHALL stop before target edit or archive transition
- **AND** it SHALL report the instruction lookup boundary without fabricating review completion or a fallback archive path

### Requirement: Governed archive finalization SHALL establish one mechanical closeout verdict

The repository SHALL provide one deterministic finalization interface for a
selected active feedback-lifecycle change. It SHALL resolve authoritative
change and planning paths from OpenSpec, verify required artifacts, verify
exactly one completed plan-review marker and one completed closeout-review
marker with no other incomplete task, run strict OpenSpec validation, and then
run requirement-traceability, main-spec, capability-taxonomy,
capability-discovery, verification-routing asset, and semantic-closure asset
checks in that order.

Only after those direct facts pass, and only after the Agent has completed any required semantic delta/main sync
and re-comparison, the finalizer SHALL invoke the native OpenSpec archive transition in its no-spec-write mode.
It SHALL verify the native result against the resolved active/archive locations before reporting success. On the
first unmet direct prerequisite it SHALL return a structured root with the observed fact, owning surface, one
legal repair coordinate when an accepted operation exists, and the same finalizer rerun coordinate. It SHALL
not implement its own spec merge, archive naming, directory move, rollback, test runner, semantic review
verdict, or persistent lifecycle state.

The finalizer SHALL pass the exact selected active change to the
requirement-traceability archive check. It SHALL not use a no-scope invocation,
infer that another active change is ready, or turn another change's valid
plan-stage reservation into a selected-change archive failure.

#### Scenario: incomplete feedback task blocks before native archive

- **WHEN** a selected change has an incomplete task or an incomplete/missing required review marker
- **THEN** finalization SHALL fail before invoking native archive
- **AND** it SHALL identify the direct task fact and the finalizer rerun coordinate

#### Scenario: ordered governance failure short-circuits finalization

- **WHEN** strict validation, requirement traceability, main-spec structure,
  taxonomy, discovery record, verification-routing assets, or semantic-closure
  assets fail
- **THEN** finalization SHALL report the earliest failing direct check before native archive
- **AND** it SHALL not perform a directory move, write main specs, or infer test success

#### Scenario: Pending reservation blocks selected finalization

- **WHEN** the selected change's reservation has not yet become a live prefix,
  live requirement-ID entries, and canonical main-spec declarations
- **THEN** finalization SHALL return its requirement-traceability root before
  main-spec, taxonomy, discovery, verification-routing, semantic-closure, or
  native archive
- **AND** it SHALL preserve the selected change in the requirement-check rerun
  coordinate

#### Scenario: semantic closure assets fail after verification routing

- **WHEN** verification-routing asset validation passes but the selected
  semantic-closure asset check finds a missing resolver, consumer, catalog, or
  verification coordinate
- **THEN** finalization SHALL report the semantic-closure root before native
  archive
- **AND** it SHALL not re-run or reinterpret verification-routing as a semantic
  verdict

#### Scenario: successful finalization delegates the canonical move

- **WHEN** all mechanical prerequisites pass after required semantic sync and re-comparison
- **THEN** finalization SHALL invoke native OpenSpec archive in no-spec-write mode
- **AND** it SHALL report success only when the native result and resolved archive location agree

### Requirement: Supported archive entry surfaces SHALL converge on governed finalization

Every project-supported Agent-facing archive entry surface for a feedback-lifecycle change SHALL route its final
mechanical transition through the governed finalization interface. It SHALL preserve the Agent-owned semantic
review and spec-sync steps before that interface, and it SHALL not reproduce checker ordering, perform a raw
directory move, or invoke an alternative native archive path as a normal success route. The supported surface
set SHALL be documented and covered by deterministic conformance checks so a newly added supported entry
cannot silently bypass finalization.

This requirement does not constrain an external OpenSpec installation, alter archived historical changes, or
make an unsupported tool a project lifecycle authority. It also does not turn user approval, task prose, or a
successful provider/configuration check into archive permission.

#### Scenario: supported archive route uses one finalizer

- **WHEN** an Agent invokes a documented project archive entry for a feedback-lifecycle change
- **THEN** that entry SHALL direct the final mechanical transition to the governed finalizer
- **AND** it SHALL preserve the same selected change identity through finalization

#### Scenario: adapter conformance rejects a bypass

- **WHEN** a supported archive entry contains a raw move or a direct alternate archive success route
- **THEN** its conformance check SHALL fail
- **AND** the entry SHALL not be presented as a supported feedback-lifecycle archive path

#### Scenario: semantic sync remains outside the finalizer

- **WHEN** an archive requires delta spec synchronization or a semantic delta/main comparison
- **THEN** the supported entry SHALL keep that work in the Agent-owned archive flow before finalization
- **AND** finalization SHALL not select, write, or claim semantic equivalence for a main-spec merge
