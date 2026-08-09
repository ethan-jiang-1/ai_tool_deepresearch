> req: CHF-002

## MODIFIED Requirements

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
true for those surfaces.

For an `affected` record, the delivered review guidance SHALL additionally
require two honesty checks against the revision under review:

- a coordinate fragment is used only when it names an actual symbol or document
  anchor; otherwise the record uses the bare file path and explains the surface
  in existing prose; and
- roles are classified relative to the family conclusion, so `consumers`
  contains only verdict consumers while an Agent-facing projection uses the
  applicable overlap relation, including `derived` when projected from that
  conclusion.

The current Apply and Archive operation guidance SHALL name those two review
checks and direct the Agent to the central feedback guideline for their full
plan/closeout rubric. Supported entry adapters SHALL continue to deliver that
current guidance rather than independently copying the full rubric into each
adapter.

A structural checker result SHALL not be reported as either semantic judgment.
If plan or closeout review finds a guessed or inaccurate fragment, a projection
or diagnostic reader misclassified as a verdict consumer, or a role that cannot
yet be established from the relevant surfaces, the Agent SHALL create an
ordinary incomplete task naming the affected family or reader question,
authoritative owner, smallest repair, and independently observable done
condition. The corresponding review marker SHALL remain incomplete until the
repair and repeated review are complete.

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
  inventory plus coordinate-fragment honesty against the relevant surfaces
- **AND** a checker PASS SHALL NOT be reported as semantic completeness

#### Scenario: Operation guidance names closure-honesty review

- **WHEN** an Agent obtains current Apply or Archive operation guidance for a
  feedback-lifecycle change
- **THEN** the guidance SHALL name coordinate-fragment honesty and
  verdict-consumer versus derived-projection review and direct the Agent to the
  central feedback guideline
- **AND** a supported entry adapter SHALL not need a duplicated full rubric to
  deliver that current guidance

#### Scenario: Projection misclassification becomes ordinary work

- **WHEN** plan or closeout review finds an Agent-facing projection listed as a
  verdict consumer even though it only presents a resolved conclusion
- **THEN** the Agent SHALL add an ordinary incomplete repair task and keep the
  corresponding review marker incomplete
- **AND** the task SHALL name the affected family, authoritative owner, smallest
  classification repair, and independently observable done condition

#### Scenario: Unknown fragment remains honest

- **WHEN** review cannot identify a declared fragment as an actual symbol or
  document anchor in the revision under review
- **THEN** the Agent SHALL replace it with the bare file coordinate or record an
  ordinary incomplete task that owns the repair
- **AND** checker validity or plausible naming SHALL NOT complete that review

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
