> req: ACR-001, ACR-002, ACR-004

## MODIFIED Requirements

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

Root `AGENTS.md` and `CLAUDE.md` SHALL each require every substantive repository task to read
`openspec/constitution/project-charter.md` and then root `CONTEXT.md` before task work. The two
files SHALL provide equivalent Charter-then-context routing obligations while retaining their
tool-specific identity and existing instructions. The requirement SHALL preserve the Charter as the
first guidance read and shall not turn `CONTEXT.md` into a replacement for instruction discovery or
task-specific authoritative sources. The Context route SHALL stay within the existing `## Before
Anything Else` block and before the existing `## Deep Research Routing` block. Their shared
pre-read subsections SHALL remain textually synchronized, and the two files SHALL remain
byte-identical modulo their tool-specific title lines (the first three lines): any content edit to
one file SHALL be applied to the other, and a deterministic guard test SHALL enforce the pair.

Root `README.md` SHALL expose the same Charter-then-context route in its repository orientation
before its existing directory-selection guidance. It SHALL retain that scoped-reading guidance and
SHALL not turn the route into a requirement to pre-read every root document or recursively scan the
repository.

Root `AGENTS.md`, `CLAUDE.md`, and `README.md` SHALL identify `docs/adr/` as the durable
architecture-decision surface for a task that needs an architecture rationale. It SHALL remain an
on-demand task-relevant surface, not another mandatory pre-task read.

`DEEP_RESEARCH_HARNESS/AGENTS.md` and `DEEP_RESEARCH_HARNESS/CLAUDE.md` SHALL each independently
require Harness work to read `../openspec/constitution/project-charter.md` and then `../CONTEXT.md`
before their Harness-local operating documents. The two files SHALL provide equivalent
Charter-then-context routing obligations while retaining their tool-specific identity and existing
instructions. They SHALL not create or require a separate `DEEP_RESEARCH_HARNESS/CONTEXT.md`; after
the shared-project pre-read, Harness README, COMMANDS, and applicable playbooks remain the
Agent-facing operating surfaces for Harness entry and command execution. Applicable accepted and
executable contracts retain their existing behavior authority. Their shared-project pre-read blocks
SHALL be identically worded under a `## 共享项目上下文` heading, and the Harness pair SHALL remain
byte-identical modulo its tool-specific title lines (the first three lines), enforced by the same
deterministic guard test.

`DEEP_RESEARCH_HARNESS/README.md` SHALL expose the same parent-project Charter-then-context route
before any Harness trigger guidance, including the existing `> **最快触发**` callout and
`## 触发规则（最高优先）` block. It SHALL remain the canonical Harness runtime guide; the route SHALL
not become a research entry, run selection, or authorization for request-specific research work,
and it SHALL not change the existing Harness entry selection. Current root and Harness guidance
SHALL expose `DEEP_RESEARCH_HARNESS/` as the only reusable Harness source coordinate. They SHALL
not preserve a secondary filesystem alias, source-root compatibility route, local glossary, or
retired project-guidance compatibility route.

The pre-read SHALL not select, replace, or change the precedence between the existing Harness
research entry alternatives. After it, the accepted explicit existing-bundle route and new-research
route SHALL retain their existing `continue-run-bundle.md` versus `RUN.md` selection and pre-entry
research restrictions. The Harness behavior-file pre-read blocks SHALL state this non-entry,
non-selection, and non-research-authorization boundary explicitly; the Harness README SHALL state
the same boundary in its parent-project route.

#### Scenario: Root task receives the vocabulary route

- **WHEN** a Coding Agent begins a substantive task from the repository root or a reader opens its
  repository orientation
- **THEN** root `AGENTS.md`, `CLAUDE.md`, and `README.md` SHALL each direct it to read
  `openspec/constitution/project-charter.md` before root `CONTEXT.md`
- **AND** the route SHALL make the glossary applicable before the Agent interprets architecture,
  terminology, or ownership boundaries

#### Scenario: Harness task does not fork the glossary

- **WHEN** a Coding Agent enters `DEEP_RESEARCH_HARNESS/` for Harness work or a reader opens its
  Harness runtime guide
- **THEN** its local `AGENTS.md`, `CLAUDE.md`, and `README.md` SHALL each direct it to the root
  Project Charter before the root glossary
- **AND** the local routes SHALL preserve the Harness README, COMMANDS, and applicable playbooks as
  the Harness operating surfaces
- **AND** no Harness-local context glossary or old guidance-path compatibility route SHALL be
  introduced

#### Scenario: Current routing exposes one Harness root

- **WHEN** a reader follows a current root or Harness routing document to the reusable source tree
- **THEN** the document SHALL identify `DEEP_RESEARCH_HARNESS/` as that root
- **AND** it SHALL not present another filesystem coordinate as a supported Harness source, command
  entry, or terminology alternative

#### Scenario: Context routing does not replace selected Harness entry routing

- **WHEN** the Harness behavior routes apply their shared-project pre-read
- **THEN** they SHALL retain the accepted explicit existing-bundle and new-research selected-entry
  routes after the pre-read
- **AND** they SHALL NOT treat `CONTEXT.md` as a research entry, run selection, or authorization
  for request-specific research work

#### Scenario: Root behavior-file pair stays byte-synchronized

- **WHEN** root `AGENTS.md` or `CLAUDE.md` is edited
- **THEN** the pair SHALL remain byte-identical modulo the tool-specific title lines
- **AND** the deterministic guard test SHALL fail when one file drifts from the other

#### Scenario: Harness behavior-file pair stays byte-synchronized

- **WHEN** `DEEP_RESEARCH_HARNESS/AGENTS.md` or `DEEP_RESEARCH_HARNESS/CLAUDE.md` is edited
- **THEN** the pair SHALL remain byte-identical modulo the tool-specific title lines
- **AND** the deterministic guard test SHALL fail when one file drifts from the other

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

The project SHALL have a focused deterministic JS-led `integration` regression that reads the
actual root and canonical Harness `AGENTS.md` / `CLAUDE.md` behavior files and `README.md` entry
documents. It SHALL verify the required Charter-then-context route at all six entries, the
root-only glossary route, and the root Context route's position within the existing `## Before
Anything Else` blocks and before the existing root Deep-Research-Routing, root directory-routing,
Harness first-priority routing, `> **最快触发**` callout, and Harness trigger block. It SHALL also
verify the paired behavior-file pre-read blocks stay synchronized; that root/Harness operating
routes and `docs/adr/` discovery remain after the pre-read; that all three Harness entry surfaces
retain the explicit non-entry boundary; that the glossary retains its three canonical source links,
non-authority and current-run-bundle distinction markers, and discoverable links to ADRs 0001, 0002,
and 0003; that those three ADRs retain their `Accepted` status and respective decision boundaries;
that `DEEP_RESEARCH_HARNESS/CONTEXT.md` is absent; and that the repository root has no alternate
filesystem entry resolving to the canonical Harness assets.

The focused regression SHALL additionally verify that the root behavior-file pair and the Harness
behavior-file pair are each byte-identical modulo their tool-specific title lines (the first three
lines); and that guidance path references in repository skill files under `.agents/skills/` and
`.claude/skills/` resolve to existing files — a reference to a retired `guidelines/` prefix or any
other missing path SHALL fail the regression and name the offending file and reference.

This focused regression SHALL additionally fail when one of its inspected current entry documents
preserves a retired project-guidance path as a current Charter/model source, or the repository root
exposes an alternate filesystem entry resolving to the canonical Harness assets. It SHALL not encode
the retired source-root vocabulary as a live test
fixture. Historical Git records and archived OpenSpec artifacts are outside this topology assertion.

This focused regression SHALL not duplicate the accepted selected-entry and pre-entry-research
contract. Apply verification SHALL run the existing research-entry routing contract alongside the
focused regression to establish that the context pre-read preserved that contract.

The regression SHALL detect removal, reversal, or replacement of the required Charter-then-context
route. It SHALL not infer whether an Agent actually read the documents, judge prose quality, or
claim real Agent behavior.

#### Scenario: Required entry route is removed, reversed, or gains a second root

- **WHEN** any root or canonical Harness Agent behavior file or README entry document omits the
required glossary route, places `CONTEXT.md` before the Charter, retains a current retired
project-guidance Charter/model source, the root drops its normal instruction-discovery/task-specific-authority or
  scoped-reading boundary, moves its Context route outside `## Before Anything Else`, or lets the
  pre-read fall after an existing root routing block, Harness first-priority routing, `最快触发`
  callout, or Harness trigger block, either behavior-file pair drifts in its required synchronized
  pre-read block, the Harness drops its README, COMMANDS, or selected-playbook route after the
  pre-read, root entry documents drop the on-demand `docs/adr/` surface, a Harness pre-read loses
  its non-entry/non-selection/non-research-authorization boundary,
  `DEEP_RESEARCH_HARNESS/CONTEXT.md` is introduced, the glossary loses a canonical-source link,
  non-authority or current-run-bundle distinction marker, required ADR link, or required `Accepted`
  ADR boundary, or an alternate filesystem entry resolves to the canonical Harness assets
- **THEN** the deterministic documentation regression SHALL fail
- **AND** it SHALL identify the violated routing or source-root boundary

#### Scenario: Behavior-file pair drifts beyond the title lines

- **WHEN** root or Harness `AGENTS.md` and `CLAUDE.md` differ anywhere outside their tool-specific
  title lines
- **THEN** the focused regression SHALL fail
- **AND** it SHALL identify the pair and the drift

#### Scenario: Skill file references a dead guidance path

- **WHEN** a repository skill file under `.agents/skills/` or `.claude/skills/` references a
  retired `guidelines/` path or any path that does not exist
- **THEN** the focused regression SHALL fail
- **AND** it SHALL name the offending file and reference
