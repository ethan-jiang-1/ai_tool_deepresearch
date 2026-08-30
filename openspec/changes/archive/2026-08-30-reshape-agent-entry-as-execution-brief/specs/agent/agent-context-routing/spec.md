> req: ACR-002, ACR-004

## MODIFIED Requirements

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
Brief. That block SHALL remain a pointer plus the locked entry-safety phrases;
the complete entry-selection rule SHALL stay in
`command_playbook/continue-run-bundle.md` Entry Selection (canonical). The
Brief SHALL point `openspec/guidance/models/invariants-brief.md` as an
on-demand baseline, not a second first read that competes with the Brief.

Root `README.md` SHALL expose the Execution Brief in `AGENTS.md` as the Agent
process before directory-selection guidance. It SHALL NOT require
Charter-then-context before every repository orientation. It SHALL retain
scoped-reading guidance and SHALL identify `docs/adr/` as an on-demand
architecture-rationale surface.

`DEEP_RESEARCH_HARNESS/AGENTS.md` SHALL open with `## 0. Execution Brief` for
Harness research versus changing Harness behavior. Research SHALL open the
selected `continue-run-bundle.md` or `RUN.md` entry; changing Harness behavior
SHALL follow the root Brief behavior-change branch. `## 共享项目上下文` SHALL
name `../openspec/constitution/project-charter.md` before `../CONTEXT.md`,
state that those coordinates are not a research entry, do not select a run,
and do not authorize request-specific research, and that running research
does not require reading them first. The Harness
`## ⚡ 第一优先` heading SHALL NOT remain. `DEEP_RESEARCH_HARNESS/CLAUDE.md` SHALL
remain a symlink to the co-located `AGENTS.md`. No
`DEEP_RESEARCH_HARNESS/CONTEXT.md` SHALL exist.

`DEEP_RESEARCH_HARNESS/README.md` SHALL remain the canonical Harness runtime
guide. Its parent-project block SHALL keep the non-entry, non-selection, and
non-research-authorization boundary. It SHALL NOT require Charter-then-context
before the existing `> **最快触发**` callout or `## 触发规则（最高优先）`
block. After the Brief, the accepted existing-bundle versus `RUN.md` selection
and pre-entry research restrictions SHALL remain unchanged. Current root and
Harness guidance SHALL expose `DEEP_RESEARCH_HARNESS/` as the only reusable
Harness source coordinate.

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
  new-research selected-entry routes
- **AND** they SHALL NOT treat `CONTEXT.md` as a research entry, run selection,
  or authorization for request-specific research work

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
Routing` remains after the Brief; that `docs/adr/` stays on-demand; that
Harness `## 共享项目上下文` keeps the non-entry boundary and does not require
Charter-then-context before research; that Harness README does not place a
mandatory Charter-then-context route before `> **最快触发**` or `## 触发规则
（最高优先）`; that the glossary retains its three canonical source links,
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
pre-entry-research contract. Apply verification SHALL run the existing
research-entry routing contract, continue-run-bundle pointer contract,
harness entry-route token contract, guidance-terminology pointer contract,
and the GCO-008 topology contract (retargeted to the Execution Brief and
Harness shared-context blocks) alongside the focused regression.

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
