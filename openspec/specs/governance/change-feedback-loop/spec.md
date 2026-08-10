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
selected change through `openspec instructions apply|archive --change <name> --json` and present the
corresponding feedback-lifecycle action before target implementation or final archive transition. The
project-owned `openspec/config.yaml` operation guidance SHALL name
`openspec/operations/change-feedback-loop.md` as the canonical full rubric. Apply guidance SHALL direct the
Agent to the plan-review obligation and pending feedback tasks. Archive guidance SHALL direct the Agent to the
change-scoped closeout review, Agent-driven delta/main sync and re-comparison when applicable, and the governed
finalizer after those semantic steps are complete.

`openspec/operations/change-feedback-loop.md` is an Agent-facing delivery surface only. It SHALL defer to the
Project Charter, accepted `governance/change-feedback-loop` behavior, and
`openspec/governance/finalize-change-archive.mjs`; it SHALL NOT become a lifecycle state machine, archive
authority, permission grant, or duplicate review authority. The retired pre-migration feedback coordinate SHALL
NOT remain a project-owned current supported fallback or compatibility route.

`SUPPORTED_ENTRY_SURFACES` in `openspec/governance/finalize-change-archive.mjs` SHALL be the one
project-owned inventory of supported entry surfaces. It SHALL list exactly:

- apply: `.agents/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/source-command-opsx-apply/SKILL.md`,
  `.claude/skills/openspec-apply-change/SKILL.md`, and
  `.claude/commands/opsx/apply.md`;
- archive: `.agents/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/source-command-opsx-archive/SKILL.md`,
  `.claude/skills/openspec-archive-change/SKILL.md`, and
  `.claude/commands/opsx/archive.md`.

Deleted `.codex` skill and prompt paths SHALL not be represented as supported entry surfaces. Tests for
lifecycle delivery SHALL consume this inventory rather than maintain a divergent entry list.

The listed `.agents/` and `.claude/` entry source assets are stable consumers, not project-owned guidance
delivery surfaces. A guidance-topology migration SHALL NOT alter them to hardcode a project path. Conformance
SHALL instead verify that they obtain operation guidance and that the selected operation's
`openspec/config.yaml` guidance resolves to the canonical operation coordinate.

After `governance/semantic-fact-closure` is accepted, the current plan and closeout review guidance SHALL also
direct the Agent to inspect the selected change's `semantic-closure.yaml`. For an `affected` record, review
SHALL assess whether its bounded fact, resolver, establishing surfaces, verdict consumers, and overlap relation
are complete against the planned or actual changed surfaces. For `not_applicable`, review SHALL assess whether
the reason remains true for those surfaces.

For an `affected` record, the delivered review guidance SHALL additionally require two honesty checks against
the revision under review:

- a coordinate fragment is used only when it names an actual symbol or document anchor; otherwise the record
  uses the bare file path and explains the surface in existing prose; and
- roles are classified relative to the family conclusion, so `consumers` contains only verdict consumers while
  an Agent-facing projection uses the applicable overlap relation, including `derived` when projected from that
  conclusion.

The configuration-delivered Apply and Archive operation guidance SHALL name those two review checks and direct
the Agent to `openspec/operations/change-feedback-loop.md` for their full plan/closeout rubric. Supported entry
adapters SHALL continue to obtain that current guidance rather than independently copying the full rubric or a
project path into each adapter.

A structural checker result SHALL not be reported as either semantic judgment. If plan or closeout review finds
a guessed or inaccurate fragment, a projection or diagnostic reader misclassified as a verdict consumer, or a
role that cannot yet be established from the relevant surfaces, the Agent SHALL create an ordinary incomplete
task naming the affected family or reader question, authoritative owner, smallest repair, and independently
observable done condition. The corresponding review marker SHALL remain incomplete until the repair and
repeated review are complete.

Before the first target edit, every supported project apply entry surface SHALL run the existing
verification-routing plan check and then
`node openspec/governance/check-semantic-closure.mjs --change <name> --mode plan` for the selected change. For
a feedback-lifecycle change, it SHALL do so after the plan review completes. The absence of an
`openspec-feedback:` marker SHALL not exempt a selected change from either plan check. It SHALL stop before
target edits on either failure and expose the failed check's repair coordinate and rerun command.

Before the final archive transition, every supported project archive entry surface SHALL preserve the governed
finalizer as its one success route. A selected change without exactly one plan-review and one closeout-review
marker SHALL stop before finalization, direct the Agent to add the required marker tasks and resume apply, and
SHALL not treat absent markers as a semantic-closure exemption or invoke a separate native archive path.

Guidance is an Agent-facing delivery channel only. It SHALL not replace artifact instructions, create a
deterministic verdict, select semantic repairs, override a missing capability, or permit archive when the
finalizer's direct prerequisites fail. A supported entry surface that cannot obtain its required guidance SHALL
stop before the relevant transition and expose the observed instruction boundary and the same entry retry
coordinate.

#### Scenario: Apply entry delivers the canonical plan-review action

- **WHEN** an Agent starts or resumes apply for a feedback-lifecycle change
- **THEN** its `openspec instructions apply` response SHALL present current plan-review and pending-task context
  from configuration-delivered guidance that names `openspec/operations/change-feedback-loop.md`
- **AND** it SHALL not claim that guidance itself completes the review

#### Scenario: Existing entry sources remain configuration-neutral

- **WHEN** the project relocates an operation guidance document
- **THEN** the stable listed skill and command source assets SHALL continue to obtain guidance through
  `openspec instructions` without a migration-specific source edit
- **AND** the selected operation's `openspec/config.yaml` guidance SHALL be the asserted canonical-path delivery
  surface

#### Scenario: Current entry inventory excludes retired paths

- **WHEN** a project lifecycle entry is selected after the `.codex` to `.agents` / `.claude` migration
- **THEN** `SUPPORTED_ENTRY_SURFACES` SHALL identify the current apply or archive path from its declared list
- **AND** a deleted `.codex` path SHALL not be treated as a supported entry or a route that may bypass lifecycle
  delivery

#### Scenario: Semantic closure review remains Agent-owned

- **WHEN** a selected change has a structurally valid semantic-closure record
- **THEN** current plan and closeout guidance SHALL direct the Agent to review its status branch and, when
  affected, its resolver/`established_by`/consumer/overlap inventory plus coordinate-fragment honesty against
  the relevant surfaces
- **AND** a checker PASS SHALL NOT be reported as semantic completeness

#### Scenario: Operation guidance names closure-honesty review

- **WHEN** an Agent obtains current Apply or Archive operation guidance for a feedback-lifecycle change
- **THEN** the guidance SHALL name coordinate-fragment honesty and verdict-consumer versus derived-projection
  review and direct the Agent to the canonical feedback operation guidance
- **AND** a supported entry adapter SHALL not need a duplicated full rubric to deliver that current guidance

#### Scenario: Projection misclassification becomes ordinary work

- **WHEN** plan or closeout review finds an Agent-facing projection listed as a verdict consumer even though it
  only presents a resolved conclusion
- **THEN** the Agent SHALL add an ordinary incomplete repair task and keep the corresponding review marker
  incomplete
- **AND** the task SHALL name the affected family, authoritative owner, smallest classification repair, and
  independently observable done condition

#### Scenario: Unknown fragment remains honest

- **WHEN** review cannot identify a declared fragment as an actual symbol or document anchor in the revision
  under review
- **THEN** the Agent SHALL replace it with the bare file coordinate or record an ordinary incomplete task that
  owns the repair
- **AND** checker validity or plausible naming SHALL NOT complete that review

#### Scenario: Semantic closure plan failure blocks target edits

- **WHEN** the selected change has no valid semantic-closure record or the closure plan check finds a direct
  structural root
- **THEN** the supported apply entry SHALL stop before target edits
- **AND** it SHALL preserve the selected change identity and direct repair to the checker's reported coordinate
  and plan-mode rerun command

#### Scenario: An unmarked change cannot bypass semantic closure

- **WHEN** a supported apply entry selects a change whose task list has no `openspec-feedback:` marker
- **THEN** it SHALL still run verification-routing plan mode followed by semantic-closure plan mode before
  target edits
- **AND** it SHALL not treat the absent marker as a semantic-closure opt-out

#### Scenario: An unmarked change cannot bypass semantic closure at archive

- **WHEN** a supported archive entry selects a change without the required feedback marker pair
- **THEN** it SHALL stop before finalization and direct repair to the task list followed by the normal apply
  route
- **AND** it SHALL not invoke native archive or present marker absence as a semantic-closure opt-out

#### Scenario: Archive entry delivers closeout before finalization

- **WHEN** an Agent requests archive for a feedback-lifecycle change
- **THEN** the supported entry surface SHALL present the closeout-review and semantic sync/re-comparison route
- **AND** it SHALL not direct a raw move or bypass the governed finalizer

#### Scenario: Missing operation guidance remains an honest boundary

- **WHEN** a supported lifecycle entry cannot obtain valid current operation guidance
- **THEN** it SHALL stop before target edit or archive transition
- **AND** it SHALL report the instruction lookup boundary without fabricating review completion or a fallback
  archive path
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
