# Agent Context Routing

> req: ACR-001, ACR-002, ACR-003, ACR-004, ACR-005, ACR-006

## Purpose

Give every substantive repository task a short vocabulary-alignment entry route
that preserves the Deep Research Tool's agentic architecture without turning a
glossary or ADR into a competing behavior or runtime authority.

## Requirements

### Requirement: Project glossary preserves canonical terminology boundaries

The repository SHALL provide one root `CONTEXT.md` as the shared glossary for substantive project
work. It SHALL distinguish the Deep Research Tool project, the reusable Deep Research Harness, the
canonical `DEEP_RESEARCH_HARNESS/` directory, a run bundle, a research run, a current run bundle,
a current run bundle root, the LLM Agent, Markdown control surface, Engine, runtime truth, and
deterministic/evidence boundaries needed to avoid treating the Harness as a traditional JavaScript
workflow controller.

`CONTEXT.md` SHALL state that it is a vocabulary-alignment surface and SHALL defer behavior,
executable contracts, and current runtime facts to their existing Sources of Record. Its terminology
SHALL remain aligned with the guidance terminology canon rather than establishing independent
definitions, and it SHALL directly identify that canon for its readers.

The glossary SHALL contain direct Markdown links to `openspec/README.md`,
`openspec/guidance/models/agentic-execution-model.md`, and
`openspec/constitution/project-charter.md` as its terminology and authority sources. It SHALL direct
readers to the execution-model canon for the complete Phase Agent, Sub-agent, Queue demand item,
Work unit, and Submit vocabulary rather than copying it in full. Its compressed definitions SHALL
preserve that a research run is a run bundle's lifecycle; a current run bundle is explicitly scoped
to one operation; its root is the resolved runtime coordinate; and a Gate verdict does not itself
select the next Chain phase or grant authority, capability, permission, liveness, or evidence.

`CONTEXT.md` SHALL link
`docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md` and
`docs/adr/0002-name-the-reusable-surface-deep-research-harness.md` as optional architecture
rationale. Those links SHALL not make either ADR a mandatory pre-task read, behavior authority, or
replacement for the Charter.

`CONTEXT.md` SHALL include the current phase feedback vocabulary `hints[]` and `repair_kind` as
named feedback surfaces that carry the bounded next step, SHALL define the three runtime
coordinates `repo_command_root` / `framework_root` / `current_run_bundle_root` with their compact
distinctions, and SHALL point its `Gate` row to the five-surface Gate explanation in
`openspec/guidance/models/framework-runtime-boundary.md` rather than compressing Gate to a single
gloss line. These entries SHALL remain compressed definitions that defer behavior and machine facts
to their Sources of Record; they SHALL NOT copy the complete feedback or Gate contract into the
glossary.

#### Scenario: Agent establishes the correct control model from the glossary

- **WHEN** a Coding Agent reads root `CONTEXT.md` for a substantive task
- **THEN** it can distinguish LLM judgment, Markdown Agent Flow, Engine deterministic checkpoints,
  Harness assets, and current-run-bundle runtime truth
- **AND** it SHALL NOT treat the glossary as a Gate verdict, executable contract, or current run
  state

#### Scenario: Glossary preserves critical similarly named distinctions

- **WHEN** a Coding Agent needs to reason about Harness/runtimes or phase advancement
- **THEN** root `CONTEXT.md` SHALL distinguish Harness from run bundle, research run from current
  run bundle, current run bundle root from repository root, Gate definition from Gate verdict, and
  phase handoff from work completion
- **AND** it SHALL direct the Agent to the existing authority when the glossary alone cannot answer
  the needed behavior or runtime question
- **AND** it SHALL identify the canonical model and Charter rather than presenting its wording as an
  independent definition source

#### Scenario: Glossary preserves authority-sensitive execution distinctions

- **WHEN** a Coding Agent uses root `CONTEXT.md` to orient before task-specific execution work
- **THEN** it SHALL distinguish a current run bundle from reusable Harness assets for both
  production runs and disposable experiments
- **AND** it SHALL identify the current run bundle root as an explicit operation coordinate rather
  than the newest bundle, a global session value, or a lifecycle-status claim
- **AND** it SHALL distinguish a Gate verdict from Chain/transition selection
- **AND** it SHALL not infer authority, capability, permission, liveness, or evidence merely from a
  named Source of Record
- **AND** it SHALL route complete execution-model terminology to its canonical model rather than
  reproducing a competing full glossary

#### Scenario: Glossary exposes the current feedback vocabulary

- **WHEN** a Coding Agent reads root `CONTEXT.md` after receiving phase feedback
- **THEN** the glossary SHALL name `hints[]` and `repair_kind` as the feedback surfaces that carry
  the bounded next step
- **AND** it SHALL defer the complete feedback contract to its owning accepted spec or model rather
  than restating the field shapes

#### Scenario: Glossary routes Gate to the five-surface explanation

- **WHEN** a Coding Agent needs the exact meaning of Gate beyond a one-line gloss
- **THEN** the `Gate` row in `CONTEXT.md` SHALL point to the five-surface Gate table in
  `openspec/guidance/models/framework-runtime-boundary.md`
- **AND** the glossary SHALL NOT present a competing single-surface Gate definition

### Requirement: Agent-facing entry routes require the project glossary

Root `AGENTS.md` SHALL open with `## 0. Execution Brief` that answers, for the
current user turn, which single file to open next and what completes that step.
The Brief SHALL name three branches and SHALL NOT use a fuzzy completion such
as vocabulary alignment or understanding reached:

- research, continuation, or report intent: open
  `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` Entry
  Selection (canonical) when the user supplied a reachable existing bundle
  candidate; otherwise open `DEEP_RESEARCH_HARNESS/RUN.md`. The step is
  complete when that file is in context. The Agent SHALL NOT search, invoke a
  built-in `research` / `deep-research` shortcut, WebFetch, or collect evidence
  before that selected entry is read.
- change of accepted behavior, a new contract, or an edit to reusable Harness
  assets: read `openspec/constitution/project-charter.md` and then the owner
  spec for that capability. The step is complete when an OpenSpec change exists
  or that owner spec is open. The Agent SHALL NOT edit `DEEP_RESEARCH_HARNESS/`
  before `/opsx:apply`.
- an already named phase node, `tasks.md` item, or CLI `next`: open that page
  and execute that one next step. The step is complete when that next step has
  been executed.

Root `CLAUDE.md` SHALL remain a symlink resolving to the co-located
`AGENTS.md`. `AGENTS.md` SHALL be the sole regular behavior file. A
deterministic check SHALL enforce the symlink shape.

The Project Charter then root `CONTEXT.md` route SHALL be required when the
next action depends on ownership or architecture vocabulary (the behavior-change
branch, or a term collision that needs the glossary row). It SHALL NOT be
required before opening a selected research entry or before executing an
already-named phase, task, or CLI next. `CONTEXT.md` SHALL remain the sole
project glossary and SHALL NOT become a cover-to-cover pre-read, a replacement
for instruction discovery, or a research entry. The retired
`## Before Anything Else` heading SHALL NOT appear on root `AGENTS.md`.

Root `AGENTS.md` SHALL keep `## Deep Research Routing` after the Execution
Brief. That block SHALL be a pointer only: it SHALL name
`command_playbook/continue-run-bundle.md`, the heading
`Entry Selection (canonical)`, and `unsupported_current_entry_contract`. It
SHALL NOT reproduce the selection procedure or carry locked entry-safety
procedure phrases. The complete entry-selection rule SHALL stay in that
canonical section. The Brief SHALL point
`openspec/guidance/models/invariants-brief.md` as an on-demand baseline, not
a second first read that competes with the Brief.

Root `README.md` SHALL expose the Execution Brief in `AGENTS.md` as the Agent
process before directory-selection guidance. It SHALL NOT require
Charter-then-context before every repository orientation. It SHALL retain
scoped-reading guidance and SHALL identify `docs/adr/` as an on-demand
architecture-rationale surface.

`DEEP_RESEARCH_HARNESS/AGENTS.md` SHALL open with `## 0. Execution Brief` for
Harness research versus changing Harness behavior. Research SHALL open the
selected `continue-run-bundle.md` Entry Selection (canonical) or `RUN.md`
entry without restating the selection procedure in the Brief cell; changing
Harness behavior SHALL follow the root Brief behavior-change branch.
`## 共享项目上下文` SHALL name `../openspec/constitution/project-charter.md`
before `../CONTEXT.md`, state that those coordinates are not a research entry,
do not select a run, and do not authorize request-specific research, and that
running research does not require reading them first. The Harness
`## ⚡ 第一优先` heading SHALL NOT remain. `DEEP_RESEARCH_HARNESS/CLAUDE.md` SHALL
remain a symlink to the co-located `AGENTS.md`. No
`DEEP_RESEARCH_HARNESS/CONTEXT.md` SHALL exist.

`DEEP_RESEARCH_HARNESS/README.md` SHALL remain the canonical Harness runtime
guide. Its parent-project block SHALL keep the non-entry, non-selection, and
non-research-authorization boundary. It SHALL NOT require Charter-then-context
before the existing `> **最快触发**` callout or `## 触发规则（最高优先）`
block. After the Brief, those surfaces SHALL point to the canonical
entry-selection section instead of restating the complete rule. Current root
and Harness guidance SHALL expose `DEEP_RESEARCH_HARNESS/` as the only
reusable Harness source coordinate.

#### Scenario: Root Execution Brief names the next file

- **WHEN** a Coding Agent begins work from the repository root
- **THEN** root `AGENTS.md` and `CLAUDE.md` SHALL each open with
  `## 0. Execution Brief`
- **AND** that Brief SHALL name the research, behavior-change, and already-named
  next branches with a checkable completion for each
- **AND** it SHALL NOT require Charter-then-context before opening a selected
  research entry or executing an already-named next

#### Scenario: Root task receives the vocabulary route

- **WHEN** a Coding Agent's next action depends on ownership or architecture
  vocabulary
- **THEN** root `AGENTS.md`, `CLAUDE.md`, and `README.md` SHALL each direct it
  to read `openspec/constitution/project-charter.md` before root `CONTEXT.md`
- **AND** `CONTEXT.md` SHALL remain applicable as the sole glossary without
  becoming a cover-to-cover pre-read

#### Scenario: Harness task does not fork the glossary

- **WHEN** a Coding Agent enters `DEEP_RESEARCH_HARNESS/` for Harness work or a
  reader opens its Harness runtime guide
- **THEN** its local `AGENTS.md`, `CLAUDE.md`, and `README.md` SHALL NOT
  introduce a Harness-local context glossary or old guidance-path compatibility
  route
- **AND** running research SHALL open the selected playbook or `RUN.md` without
  a mandatory Charter-then-context pre-read
- **AND** `## 共享项目上下文` SHALL still name the Charter path before the
  `CONTEXT.md` path
- **AND** changing Harness behavior SHALL follow the root Execution Brief
  behavior-change branch
- **AND** the local routes SHALL preserve the Harness README, COMMANDS, and
  applicable playbooks as the Harness operating surfaces

#### Scenario: Current routing exposes one Harness root

- **WHEN** a reader follows a current root or Harness routing document to the
  reusable source tree
- **THEN** the document SHALL identify `DEEP_RESEARCH_HARNESS/` as that root
- **AND** it SHALL not present another filesystem coordinate as a supported
  Harness source, command entry, or terminology alternative

#### Scenario: Context routing does not replace selected Harness entry routing

- **WHEN** the Harness behavior routes apply their shared-project context block
- **THEN** they SHALL retain the accepted explicit existing-bundle and
  new-research selected-entry routes as pointers to the canonical section
- **AND** they SHALL NOT treat `CONTEXT.md` as a research entry, run selection,
  or authorization for request-specific research work

#### Scenario: Root Deep Research Routing is a pointer only

- **WHEN** a Coding Agent reads root `## Deep Research Routing`
- **THEN** the block SHALL name `continue-run-bundle.md`,
  `Entry Selection (canonical)`, and `unsupported_current_entry_contract`
- **AND** it SHALL NOT reproduce the selection procedure or locked
  entry-safety procedure phrases

#### Scenario: Root behavior-file pair stays byte-synchronized

- **WHEN** root `CLAUDE.md` is edited or replaced such that it is no longer a
  symlink resolving to the co-located `AGENTS.md`
- **THEN** the deterministic shape check SHALL fail
- **AND** the repair SHALL restore the symlink to the owning `AGENTS.md`

#### Scenario: Harness behavior-file pair stays byte-synchronized

- **WHEN** `DEEP_RESEARCH_HARNESS/CLAUDE.md` is edited or replaced such that it
  is no longer a symlink resolving to the co-located `AGENTS.md`
- **THEN** the deterministic shape check SHALL fail
- **AND** the repair SHALL restore the symlink to the owning `AGENTS.md`

### Requirement: Root architecture decision record explains the control split

The repository SHALL maintain a root `docs/adr/` decision record. Its first
record SHALL explain the durable decision that semantic research and
multi-stage Agent Flow remain LLM/Markdown-driven while the Engine owns
deterministic checkpoints and feedback.

The ADR SHALL record this as an architectural trade-off against a JavaScript
workflow-controller design. It SHALL contain a concise `## Status` section
whose value is `Accepted`, plus concise `## Context`, `## Decision`, and
`## Consequences` sections, and explicitly defer current behavior to accepted
OpenSpec contracts. It SHALL not redefine current runtime behavior, override
accepted OpenSpec contracts, or become an instruction source that replaces the
Charter or entry routes. Root `CONTEXT.md` SHALL make the record discoverable
as an optional architecture rationale.

#### Scenario: Maintainer can recover the reason for the split

- **WHEN** a maintainer considers moving research orchestration or semantic
  judgment into JavaScript
- **THEN** the root ADR SHALL explain why that is outside the selected
  architecture
- **AND** it SHALL identify the Engine as the deterministic trust root rather
  than the Agent Flow controller

### Requirement: Context routing remains regression-protected

The project SHALL have a focused deterministic JS-led `integration` regression
that reads the actual root and canonical Harness `AGENTS.md` / `CLAUDE.md`
behavior files and `README.md` entry documents. It SHALL verify that root `AGENTS.md` opens with `## 0. Execution Brief`
naming the three branches and a checkable completion; that Harness
`AGENTS.md` opens with `## 0. Execution Brief` naming research versus
changing Harness behavior and a checkable completion; that root `AGENTS.md`
has no `## Before Anything Else`;
that Charter-then-context appears on the ownership / behavior-change branch and
is not the first mandatory step of every task; that root `## Deep Research
Routing` remains after the Brief as a pointer only; that `docs/adr/` stays
on-demand; that Harness `## 共享项目上下文` keeps the non-entry boundary and
does not require Charter-then-context before research; that Harness README
does not place a mandatory Charter-then-context route before `> **最快触发**`
or `## 触发规则（最高优先）`; that the glossary retains its three canonical source links,
non-authority and current-run-bundle distinction markers, and discoverable
links to ADRs 0001, 0002, and 0003; that those three ADRs retain their
`Accepted` status and respective decision boundaries; that
`DEEP_RESEARCH_HARNESS/CONTEXT.md` is absent; and that the repository root has
no alternate filesystem entry resolving to the canonical Harness assets.

The focused regression SHALL additionally verify that in each entry directory
(root and `DEEP_RESEARCH_HARNESS/`) `CLAUDE.md` is a symlink resolving to the
co-located `AGENTS.md`, with `AGENTS.md` the sole regular behavior file; and
that guidance path references in repository skill files under
`.agents/skills/` and `.claude/skills/` resolve to existing files — a
reference to a retired `guidelines/` prefix or any other missing path SHALL
fail the regression and name the offending file and reference.

This focused regression SHALL additionally fail when one of its inspected
current entry documents preserves a retired project-guidance path as a current
Charter/model source, or the repository root exposes an alternate filesystem
entry resolving to the canonical Harness assets. It SHALL not encode the
retired source-root vocabulary as a live test fixture. Historical Git records
and archived OpenSpec artifacts are outside this topology assertion.

This focused regression SHALL not duplicate the accepted selected-entry and
pre-entry-research contract. Apply verification SHALL run the
research-entry routing contract, continue-run-bundle pointer contract, and
harness entry-route contract retargeted to canonical-section completeness plus
pointer non-restatement, together with the guidance-terminology pointer
contract and the GCO-008 topology contract (Execution Brief and Harness
shared-context blocks), alongside the focused regression. Those companion
contracts SHALL NOT treat procedure-token presence on every pointer surface as
the pass condition, and SHALL NOT keep the retired identity phrase
`本框架就是项目的 Deep Research 引擎` as a live lock.

The regression SHALL detect removal of the Execution Brief, restoration of
universal mandatory Charter-then-context, or a second Harness source root. It
SHALL not infer whether an Agent actually read the documents, judge prose
quality, or claim real Agent behavior.

#### Scenario: Required entry route is removed, reversed, or gains a second root

- **WHEN** any root or canonical Harness Agent behavior file omits
  `## 0. Execution Brief`, restores `## Before Anything Else` as the mandatory
  first heading, requires Charter-then-context before every task including
  research or an already-named next, places `CONTEXT.md` before the Charter on
  the ownership branch, retains a current retired project-guidance
  Charter/model source, the root drops its scoped-reading boundary, a Harness
  context block loses its non-entry/non-selection/non-research-authorization
  boundary, `DEEP_RESEARCH_HARNESS/CONTEXT.md` is introduced, the glossary
  loses a canonical-source link, non-authority or current-run-bundle
  distinction marker, required ADR link, or required `Accepted` ADR boundary,
  or an alternate filesystem entry resolves to the canonical Harness assets
- **THEN** the deterministic documentation regression SHALL fail
- **AND** it SHALL identify the violated routing or source-root boundary

#### Scenario: Behavior-file pair drifts beyond the title lines

- **WHEN** root or Harness `CLAUDE.md` is a regular-file copy of `AGENTS.md`,
  or is otherwise not a symlink resolving to the co-located `AGENTS.md`
- **THEN** the focused regression SHALL fail
- **AND** it SHALL identify the directory and the violated symlink shape

#### Scenario: Skill file references a dead guidance path

- **WHEN** a repository skill file under `.agents/skills/` or
  `.claude/skills/` references a retired `guidelines/` path or any path that
  does not exist
- **THEN** the focused regression SHALL fail
- **AND** it SHALL name the offending file and reference

#### Scenario: Companion entry-selection regressions reject pointer restatement

- **WHEN** apply verification runs the research-entry routing,
  continue-run-bundle pointer, or harness entry-route contract
- **THEN** those contracts SHALL lock the complete rule on
  `Entry Selection (canonical)`
- **AND** they SHALL fail when a named pointer or routing block reproduces the
  selection procedure
- **AND** they SHALL NOT treat a later operational pair-verification sentence
  on the same file as restatement
- **AND** they SHALL NOT pass solely because procedure tokens appear on every
  pointer surface

### Requirement: Glossary triages the three repair vocabularies by field name

Root `CONTEXT.md` SHALL present the three intentionally distinct repair-vocabulary surfaces as a field-name triage so a reader classifies any `repair*` field by its field name before reasoning about semantics. The triage SHALL distinguish:

- `repair_kind` carried in gate/phase `hints[]` / finding `repair.kind` — the gate/phase checkpoint surface that answers who is responsible for handling a failed checkpoint, with `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS` as the executable enum source;
- `next.recovery_action` carried in work-unit feedback surfaces — the work-unit recovery surface that answers which concrete recovery verb to run, with `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` as the executable enum source;
- `repair_directive` carried in file-observability findings — the file-observability surface that answers how a file observation heals, with `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` as its owner.

The triage SHALL state that the field names differ by design (physical isolation of the three surfaces) and that mixing one surface's field or value set into another is a defect. The triage SHALL remain a compressed alignment row set that defers the complete contracts to their owning specs and executable enums; it SHALL NOT copy the full value sets as a competing authority, and it SHALL stay machine-aligned with the code-derived enum sets so silent drift fails governance.

#### Scenario: Agent classifies a repair field before acting

- **WHEN** a Coding Agent encounters a `repair*` field in framework feedback and reads root `CONTEXT.md`
- **THEN** the glossary SHALL let it classify the surface by field name alone (`repair_kind` vs `next.recovery_action` vs `repair_directive`) without guessing from prose semantics
- **AND** the triage row SHALL name each surface's owner or executable enum source rather than restating the complete contract

#### Scenario: Mixing surfaces is declared a defect

- **WHEN** the glossary triage is read alongside the three feedback surfaces
- **THEN** it SHALL state that the three field names are intentionally distinct and that emitting or interpreting one surface's field/value set as another is a defect
- **AND** it SHALL NOT collapse the three surfaces into one unified vocabulary

#### Scenario: Triage rows cannot silently drift from executable enums

- **WHEN** a code-derived repair-vocabulary enum set changes while glossary or spec prose still restates the old set
- **THEN** the deterministic enum-restatement governance check SHALL fail naming the drifted restatement
- **AND** the repair SHALL update the restating prose in the same change as the enum change

### Requirement: Archived change artifacts stay outside default task context

Root `AGENTS.md` and root `README.md` SHALL name `openspec/changes/archive/` in their Do-Not-Read scope as historical record: archived OpenSpec change artifacts are not current behavior, not task context, and not authority. The Agent SHALL open an archived artifact only when the user explicitly asks for archive or history lookup, or when a governed procedure names a concrete archived path. Search hits under `openspec/changes/archive/` SHALL NOT be treated as task context solely because they matched a query.

The archive boundary SHALL NOT restrict the OpenSpec lifecycle itself: a change's own apply/archive steps and the governed finalizer retain their existing access to archived material. The focused deterministic routing regression SHALL fail when either root entry document drops the archived-artifact boundary.

#### Scenario: Agent ignores archive hits during ordinary search

- **WHEN** a repository-wide text search returns matches under `openspec/changes/archive/` during a task that did not explicitly request archive or history lookup
- **THEN** the Agent SHALL treat those matches as historical record outside default task context
- **AND** it SHALL select current authority from main specs, executable contracts, or the selected run bundle instead

#### Scenario: Explicit archive request unlocks reading

- **WHEN** the user explicitly asks to inspect archive or change history
- **THEN** the Agent MAY open the named archived artifact
- **AND** it SHALL still treat archived content as historical rather than as current accepted behavior

#### Scenario: Dropping the archive boundary fails the routing regression

- **WHEN** root `AGENTS.md` or root `README.md` no longer names `openspec/changes/archive/` in its Do-Not-Read scope
- **THEN** the focused deterministic routing regression SHALL fail and identify the missing archived-artifact boundary
