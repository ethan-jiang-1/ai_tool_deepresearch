## REMOVED Requirements

### Requirement: Each governed change SHALL declare semantic closure applicability

- Reason: 粒度拆分(spec-lean mainline C3 megablock-requirement-split):Each governed change SHALL declare semantic closure applicability 超粒度,按深挖定稿分界拆为单主题子块。
- Migration: requirement 文本逐字节守恒拆为 3 个子 requirement: Governed changes SHALL declare closure with coordinates and affected facts / Affected closure entries SHALL classify roles, approvals, and overlaps / The closure checker SHALL validate structure only and keep branches closed。requirement 身份 = 标题稳定锚点;registry 与 spec header 零触碰(无新增/废弃 ID)。

## ADDED Requirements

### Requirement: Governed changes SHALL declare closure with coordinates and affected facts

Each project change selected through a supported project apply or archive entry
after this capability is accepted SHALL contain a strict, change-local
`semantic-closure.yaml`. It SHALL name its change and choose
exactly one of two states:

- `not_applicable`, with a non-empty reason explaining why the change neither
  changes nor creates a verdict consumer for a cataloged deterministic fact
  family, and no affected-branch field; or
- `affected`, with one separate, unique entry for every affected family and an
  explicit `catalog_additions` sequence, which MAY be empty only when the
  record introduces no new family.

Project proposal instructions SHALL direct the author to read the current
semantic fact catalog and create this record before treating planning artifacts
as complete. They SHALL name the catalog as the only allowed family vocabulary
and present the two strict branch starters. That Agent-facing instruction SHALL
not choose a branch or claim that the declaration is semantically complete; the
supported apply entry's plan check remains the deterministic stop for a missing
or structurally invalid record.

Project proposal instructions SHALL also make the record's coordinate and role
boundaries explicit. A repository-relative base file is the machine-checked
coordinate identity. An optional `#fragment` is only a human-facing navigation
hint: when present, the author SHALL be able to identify it as an actual symbol
or document anchor in the revision being described. When no stable anchor can
be named, or its identity is unknown, the author SHALL use the bare file
coordinate and explain the intended surface in existing prose such as `fact`,
`overlap[].detail`, design, or review evidence. The author SHALL NOT invent a
plausible fragment to make a file coordinate appear more precise.

An affected entry SHALL state the bounded fact, its one semantic resolver
coordinate, the surfaces that legally establish or change the authority, every
verdict consumer whose conclusion can be affected by the change, the relation to any overlapping
projection or legacy field, and one focused truth-table coordinate plus one
cross-surface verification coordinate. Both verification coordinates SHALL be
selected assets of the change's verification plan. An entry that adds a family
SHALL carry the matching catalog addition in the same record. Each catalog
addition SHALL match exactly one affected family entry in that record. In plan
mode, the addition SHALL be absent from the current catalog; in assets mode, it
SHALL be present in the catalog with the same identifier and bounded question.
A change SHALL reference an already cataloged family directly rather than
re-add it.
#### Scenario: Proposal guidance starts from the catalog

- **WHEN** an Agent obtains project proposal instructions for a future change
- **THEN** the instructions SHALL identify
  `openspec/governance/semantic-fact-families.yaml` as the family vocabulary
  and require a change-root `semantic-closure.yaml`
- **AND** they SHALL distinguish the `not_applicable` and `affected` starter
  forms without deciding which one the change requires
- **AND** they SHALL explain the actual-fragment-or-bare-path boundary and the
  verdict-consumer versus derived-projection classification
- **AND** they SHALL direct a missing or malformed record to the plan-mode
  checker before target edits rather than presenting guidance as a verdict

#### Scenario: Actual symbol or honest bare path

- **WHEN** an affected surface has no stable symbol or document anchor that the
  author can identify in the revision being described
- **THEN** its coordinate SHALL use the bare repository-relative file path and
  the existing prose surfaces SHALL explain the intended role
- **AND** the author SHALL NOT add a guessed `#fragment` merely to imply symbol
  precision

### Requirement: Affected closure entries SHALL classify roles, approvals, and overlaps

The affected entry's roles SHALL be classified relative to the family's bounded
conclusion. `consumers` SHALL contain only surfaces that use that conclusion to
authorize, reject, pass, fail, block, or otherwise establish a verdict. An
Agent-facing task, schema, starter, prompt, or other projection that only
presents the resolved contract SHALL be represented through an applicable
`overlap` relation, using `derived` when it is projected from the conclusion;
it SHALL NOT be listed as a verdict consumer merely because it reads or displays
the fact. Likewise, a raw or diagnostic reader SHALL NOT become a verdict
consumer merely because it exposes an input or historical row. The existing
semantic resolver and `established_by` roles remain distinct from both
projection and verdict consumption.

An affected record with a catalog addition SHALL have an approved task that
writes that addition to the global catalog before the first target edit relying
on its family. A structurally valid plan-mode declaration is not a substitute
for that ordered global-catalog write.

The affected entry's `overlap` list SHALL be non-empty. Each real overlap SHALL
provide a safe projection/legacy-field coordinate, one relation of
`authoritative`, `derived`, or `retired`, and a non-empty detail. A no-overlap
declaration SHALL instead be one `relation: none` entry with a non-empty detail
and no coordinate; it SHALL not coexist with a real overlap. The assets check
SHALL require each real-overlap coordinate to exist, without claiming that its
declared relation is semantically correct.
#### Scenario: Agent-facing projection is not a verdict consumer

- **WHEN** a generated task, schema, starter, or prompt only projects a family
  conclusion for an Agent and does not authorize, reject, pass, fail, or block
- **THEN** the affected entry SHALL classify it as an applicable overlap,
  including `derived` when it is projected from that conclusion
- **AND** it SHALL NOT list that projection in `consumers`

#### Scenario: Prior-output authorization is affected once per family

- **WHEN** a change changes whether a submitted prior output may legally back a
  current `source_ref`
- **THEN** its record SHALL contain one `affected` entry for
  `work-unit.source-claim-provenance`
- **AND** that entry SHALL name the authorization resolver, formal submit and
  depth-review consumers, and focused plus cross-surface verification
  coordinates

#### Scenario: Catalog growth cannot be speculative

- **WHEN** plan mode evaluates an affected record containing a catalog addition
- **THEN** that family SHALL be absent from the current catalog and appear in
  exactly one affected entry of the same record
- **AND** plan mode SHALL reject an unused addition or an attempt to re-add an
  existing catalog family

#### Scenario: Assets mode verifies that an approved addition was written

- **WHEN** an affected record passed plan mode with one same-change catalog
  addition and Apply has written that family to the global catalog
- **THEN** assets mode SHALL require the catalog entry to have the same family
  identifier and bounded question as the record's addition
- **AND** it SHALL not repeat the plan-only test that the post-Apply catalog
  lacks that family

#### Scenario: A catalog addition is written before a dependent target edit

- **WHEN** an affected record introduces a family absent from the global catalog
- **THEN** its approved task order SHALL write that family to the global catalog
  before the first target edit that relies on the family
- **AND** plan-mode validity alone SHALL NOT be presented as permission to defer
  that catalog write until archive

#### Scenario: An overlap has one structural meaning

- **WHEN** an affected record declares a legacy projection or field overlap
- **THEN** it SHALL name that coordinate and classify it as `authoritative`,
  `derived`, or `retired`
- **AND** assets mode SHALL require the coordinate to exist without inferring
  the code-level truth of the classification

#### Scenario: No overlap is explicit

- **WHEN** an affected family has no relevant projection or legacy field
- **THEN** its record SHALL contain one explanatory `relation: none` overlap
  entry and no real-overlap coordinate
- **AND** plan mode SHALL reject mixing `none` with a real overlap

### Requirement: The closure checker SHALL validate structure only and keep branches closed

The semantic-closure checker SHALL obtain selected verification assets through
the canonical `the verification-routing contract` parser. It SHALL not define a
second `verification-plan.yaml` schema, route taxonomy, or asset-boundary
interpretation.

The checker SHALL validate only the existing structural and referential
coordinate boundary. It SHALL NOT treat a `#fragment` as machine proof of a
symbol declaration or semantic role, scan arbitrary source tokens or callsites
to infer that proof, or report an affected entry's role inventory as
semantically complete. Fragment truth and role classification remain explicit
plan and closeout review obligations.

The record is a change-governance declaration. It SHALL not be a runtime schema,
Gate verdict, receipt, or persistent runtime state.

The two status branches SHALL be closed beyond their common `schema_version`,
`change`, and `status` fields: `not_applicable` contains only `reason`, while
`affected` contains only `catalog_additions` and a non-empty `affected`
sequence. It SHALL reject an omitted `catalog_additions` field, an empty
affected sequence, or a field from the other branch.

#### Scenario: A documentation-only change is explicitly not applicable

- **WHEN** a change modifies only explanatory prose and does not alter an
  outcome-changing deterministic fact or its verdict consumer
- **THEN** its record SHALL use `not_applicable` with a non-empty reason
- **AND** it SHALL not invent an affected family merely to satisfy the checker

#### Scenario: Affected branch makes no catalog additions explicit

- **WHEN** a change affects only already cataloged families
- **THEN** its `affected` record SHALL include `catalog_additions: []` and a
  non-empty `affected` sequence
- **AND** it SHALL not omit the additions field or carry a `reason`

#### Scenario: Fragment existence is not checker proof

- **WHEN** plan or assets mode accepts an affected coordinate whose base file is
  safe and otherwise satisfies the structural contract
- **THEN** the checker SHALL report only structural and referential validity
- **AND** it SHALL NOT claim that an optional fragment names an actual symbol or
  that the declared surface performs its stated semantic role
