# semantic-fact-closure

> req: SEF-001, SEF-002, SEF-003, SEF-004

## Purpose

Define project-level governance that makes a change declare and structurally close
the Deep Research Harness deterministic runtime fact families it affects, without creating a runtime
Gate, a second runtime authority, or a machine claim of semantic completeness.

## Requirements

### Requirement: Semantic fact catalog SHALL provide a bounded shared vocabulary

The project SHALL maintain one machine-readable semantic fact catalog. A family
in that catalog is a bounded category of Engine-owned facts whose conclusion has
one semantic authority and can independently change a legal Submit, Gate,
handoff, or Final-admission outcome. It MAY combine several raw inputs, but it
SHALL not turn each input into a separate authority. It SHALL not be an
individual field, schema file, helper, heading, hash, validator, or reader
projection.

For this capability, an Engine-owned fact family is a Deep Research Harness
runtime conclusion. A project-level OpenSpec governance checker or finalizer
may determine lifecycle eligibility, but its structural governance verdict is
not a cataloged runtime family; its own accepted governance capability remains
the authority. This exclusion only prevents self-recursive cataloging of
governance machinery. A change that also alters a Harness runtime resolver or a
runtime verdict consumer SHALL still declare every affected runtime family.

The catalog SHALL use strict `semantic-fact-families/v1` form: a
`schema_version` and a `families` sequence whose entries contain exactly one
dotted `id` and one non-empty `bounded_question`. It SHALL not carry resolver,
authority-establishing surface, consumer, or verification coordinates; those are change-local facts
declared only by `semantic-closure.yaml`.

The initial catalog SHALL contain exactly these family identifiers and bounded
questions:

| Family identifier | Bounded question |
| --- | --- |
| `research.scope-and-rerun-intent` | What are the current scope, canonical Topic, and rerun intent? |
| `queue.demand-lifecycle` | What is the legal lifecycle of queue demand, terminal history, and replacement? |
| `work-unit.attempt-identity-and-actor` | Are work-unit identity, queue/assignment binding, actor, nonce, and runtime receipt consistent? |
| `work-unit.assignment-output-obligation` | What direct-output declaration and required-output obligations does this work-unit assignment impose? |
| `work-unit.wave0-source-output` | Has Wave0 fulfilled its `source_yaml` direct-output contract? |
| `work-unit.wave1-evidence-summary-output` | Has Wave1 fulfilled its `evidence_summary` direct-output contract? |
| `work-unit.wave1-question-list-output` | Has Wave1 fulfilled its `question_list` direct-output contract? |
| `work-unit.source-claim-provenance` | Does a source claim, accepted URL, cache trail, or degraded capture have legal provenance? |
| `work-unit.submission-ledger-and-supersession` | What is the current-versus-historical conclusion of submit, ledger/hash, and supersession lineage? |
| `wave.submitted-reference-convergence` | Are Wave0/Wave1 submitted backing, reference materialization, and convergence consistent? |
| `wave2.finding-and-target-authority` | What is the authority of Wave2 findings, carried targets, synthesis, and cross-reference? |
| `lifecycle.gate-status-trace-handoff` | Do Gate, status, trace, and handoff receipt constitute legal lifecycle evidence? |
| `final.submitted-backing-admission` | Does each Final Evidence Map link have legal submitted backing? |

The catalog SHALL remain a governed, extensible vocabulary rather than a claim
that all Framework facts have been inventoried. A change that needs a family not
in the catalog SHALL declare that family in its same-change record and write it
to the global catalog before the first target edit that relies on it. `plan`
mode SHALL require the declared addition to be absent from the current catalog;
`assets` mode SHALL require it to be present with the same identifier and
bounded question. It SHALL not use `other`, a free-form substitute, or an
unregistered family identifier.

#### Scenario: Initial catalog distinguishes direct output contracts

- **WHEN** a change affects the Wave1 evidence-summary direct-output obligation
- **THEN** it SHALL use `work-unit.wave1-evidence-summary-output`
- **AND** it SHALL not classify the obligation as an individual `output_files`
  field or as the broader submission-ledger family merely because both are read

#### Scenario: Assignment output obligation is distinct from output content

- **WHEN** a change affects whether a supplementary Wave1 assignment may submit
  an empty `output_files[]` declaration
- **THEN** it SHALL use `work-unit.assignment-output-obligation`
- **AND** it SHALL not classify that assignment-derived obligation as the
  attempt-identity binding or `evidence_summary`/`question_list`
  content-fulfillment family

#### Scenario: Governance-only bootstrap is not a runtime family

- **WHEN** a change creates or changes only OpenSpec governance checker,
  lifecycle-entry, or finalizer structure and does not alter a Deep Research
  Harness runtime resolver or verdict consumer
- **THEN** its closure record MAY truthfully use `not_applicable`
- **AND** it SHALL not invent a governance-checker family merely to make the
  runtime catalog self-recursive

#### Scenario: A new family is introduced honestly

- **WHEN** a future change discovers a deterministic outcome-changing fact that
  is not covered by an existing catalog family
- **THEN** that change SHALL add one bounded family definition to the catalog
- **AND** its closure record SHALL name that registered family rather than
  `other` or a change-local alias

### Requirement: Each governed change SHALL declare semantic closure applicability

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

The semantic-closure checker SHALL obtain selected verification assets through
the canonical `verification-routing-contract.mjs` parser. It SHALL not define a
second `verification-plan.yaml` schema, route taxonomy, or asset-boundary
interpretation.

The checker SHALL validate only the existing structural and referential
coordinate boundary. It SHALL NOT treat a `#fragment` as machine proof of a
symbol declaration or semantic role, scan arbitrary source tokens or callsites
to infer that proof, or report an affected entry's role inventory as
semantically complete. Fragment truth and role classification remain explicit
plan and closeout review obligations.

The affected entry's `overlap` list SHALL be non-empty. Each real overlap SHALL
provide a safe projection/legacy-field coordinate, one relation of
`authoritative`, `derived`, or `retired`, and a non-empty detail. A no-overlap
declaration SHALL instead be one `relation: none` entry with a non-empty detail
and no coordinate; it SHALL not coexist with a real overlap. The assets check
SHALL require each real-overlap coordinate to exist, without claiming that its
declared relation is semantically correct.

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

#### Scenario: Fragment existence is not checker proof

- **WHEN** plan or assets mode accepts an affected coordinate whose base file is
  safe and otherwise satisfies the structural contract
- **THEN** the checker SHALL report only structural and referential validity
- **AND** it SHALL NOT claim that an optional fragment names an actual symbol or
  that the declared surface performs its stated semantic role

### Requirement: A fact family SHALL converge on one semantic resolver

For an affected family, the change SHALL identify one Engine-owned semantic
resolver that turns the relevant raw records, history, lineage, authorization,
or multi-record state into that family's deterministic conclusion. Every
relevant consumer that authorizes, rejects, passes, fails, blocks, or otherwise
establishes a verdict for that family SHALL consume that resolver's conclusion.
It SHALL not independently recreate a verdict from a raw reader.

A raw reader MAY expose history, candidate records, or diagnostics. It SHALL
not become a second semantic authority merely because a Gate, inspect command,
or diagnostic surface reads it. Structural schemas remain responsible for shape
and local mutual exclusions; they do not by themselves replace a resolver where
the conclusion depends on history, lineage, authorization, or multiple records.

The change-scoped plan and closeout reviews SHALL assess whether the declared
consumer inventory is semantically complete. A structural checker SHALL not
claim it can infer that completeness by scanning arbitrary source code.

#### Scenario: Superseded history remains displayable without becoming a verdict

- **WHEN** a raw declaration reader exposes a submitted predecessor with an
  immutable supersession relation
- **THEN** a diagnostic MAY display that historical row
- **AND** any current-versus-historical verdict consumer SHALL use the declared
  submission-ledger-and-supersession resolver rather than infer bypass from the
  raw row alone

#### Scenario: Review finds a consumer omitted from the record

- **WHEN** plan or closeout review identifies a changed verdict consumer that is
  absent from an affected family's record
- **THEN** the Agent SHALL add an ordinary incomplete repair task naming the
  affected family, authoritative owner, smallest repair, and observable done
  condition
- **AND** checker structural validity SHALL not be reported as semantic closure

### Requirement: Semantic closure checking SHALL remain structural and root-first

The project SHALL provide the read-only command
`node openspec/governance/check-semantic-closure.mjs --change <name> --mode plan|assets`.
`plan` mode SHALL validate safe change identity, strict record branching,
the strict current catalog in either status branch, catalog identifiers and
same-change additions absent from that catalog, unique affected-family entries,
safe repository-relative coordinates, and their selected verification-plan
assets without requiring planned target assets to exist. It SHALL parse the
verification plan through the canonical contract and require its change identity
to equal the selected change. `assets` mode SHALL repeat the common
identity/branch/coordinate/verification-plan checks, require every affected
family and declared addition to resolve in the catalog, and require each
declared addition's bounded question to match its catalog entry. It SHALL not
repeat plan mode's absence test for a declared addition. It SHALL also require
the catalog, declared authority/`established_by`/consumer/overlap coordinates,
and declared verification assets to exist within the repository root as regular
files whose realpaths do not escape that root. The selected verification asset's
route boundary remains owned by `verification-routing`.

On the nearest unmet direct fact, either mode SHALL exit non-zero and report the
family when known, missing fact, owning surface, repair coordinate, and the same
mode's rerun command. The command SHALL not execute tests or playbooks, invoke
an Agent, write a change or runtime artifact, infer semantic correctness from
arbitrary JavaScript, or report a runtime/Gate/Agent PASS.

The bootstrap change that introduces this command MAY first create only the
catalog, strict parser/checker, and their focused proof assets. Once the command
is runnable, it SHALL pass `plan` mode for that change before registry,
configuration, lifecycle-entry, finalizer, or other target surfaces are edited.
This one-time task order SHALL NOT create a missing-command exception in
supported apply entries after the capability is accepted.

#### Scenario: Plan mode blocks an unregistered family before target edits

- **WHEN** an affected record names a family absent from both the current catalog
  and its same-change catalog additions
- **THEN** plan mode SHALL fail before target implementation proceeds
- **AND** its feedback SHALL direct the Agent to the closure record or catalog
  addition and the same plan-mode command

#### Scenario: Plan mode requires the global vocabulary for a not-applicable change

- **WHEN** a selected `not_applicable` record is structurally valid but the
  global semantic fact catalog is missing or malformed
- **THEN** semantic-closure plan mode SHALL fail before target edits
- **AND** it SHALL not treat the absence of affected-family references as a
  catalog exemption

#### Scenario: Assets mode cannot manufacture semantic proof

- **WHEN** every declared coordinate and verification asset exists
- **THEN** assets mode SHALL report only structural and referential validity
- **AND** it SHALL not claim that every runtime consumer actually uses the
  resolver or that the selected tests passed

#### Scenario: A selected verification plan belongs to the selected change

- **WHEN** a syntactically valid `verification-plan.yaml` names a different
  change from the semantic-closure check's `--change` argument
- **THEN** semantic-closure plan mode SHALL fail on that identity mismatch
- **AND** it SHALL not treat the other change's selected assets as this change's
  verification coordinates

#### Scenario: Assets mode rejects a symlink escape

- **WHEN** a declared repository-relative coordinate resolves through a symlink
  outside the repository root
- **THEN** assets mode SHALL fail on that coordinate before reporting structural
  validity
- **AND** it SHALL not treat lexical path safety as proof of ownership
