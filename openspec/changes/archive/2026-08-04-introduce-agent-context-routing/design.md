## Context

See [proposal.md](proposal.md) for the motivation and
[agent-context-routing spec](specs/agent-context-routing/spec.md) for the
behavioral contract. The repository already has an effective terminology canon
in `guidelines/` and committed root `CONTEXT.md` and ADR 0001 documents. This
change adopts those documents as the shared, non-authoritative vocabulary and
decision surfaces, then makes their source links, entry routing, and regression
contract explicit. Root `AGENTS.md`, `CLAUDE.md`, and `README.md` name the
Charter as the first read, while `DPT_FRAMEWORK/AGENTS.md`,
`DPT_FRAMEWORK/CLAUDE.md`, and `DPT_FRAMEWORK/README.md` currently route to
framework operations without the same ordered return to the shared project
vocabulary.

The design changes reader-facing documentation and its deterministic regression
only. `DPT_FRAMEWORK/` remains read-only during this proposal phase, and no
runtime state, Engine contract, existing framework command or selected-entry
behavior, or framework version is changed.

## Goals / Non-Goals

**Goals:**

- Give a Coding Agent a concise, stable vocabulary before it interprets any
  substantive project task.
- Preserve the existing authority hierarchy while making its most error-prone
  distinctions easy to scan.
- Make the route visible from both repository and framework entry points.
- Prevent simple documentation drift with a focused deterministic test.

**Non-Goals:**

- Do not make `CONTEXT.md` a behavior spec, runtime projection, task planner,
  or second Charter.
- Do not add a framework-local glossary, context map, persistent state,
  Engine/CLI command, controller, or runtime validation path.
- Do not change `RUN.md`, `COMMANDS.md`, the existing selected-entry directive,
  or existing framework command/research/runtime semantics.
- Do not claim a static documentation test proves that a real Agent read,
  understood, or followed the route.
- Do not change DPT framework versioning, bundle layout, research lifecycle,
  or human/Agent authority.

## Decisions

### One root glossary is the semantic alignment stop point

`CONTEXT.md` remains at the repository root and is organized by the bounded
questions a reader needs to answer: system/runtime identity, actors,
authority/control, deterministic checkpoints, evidence, feedback, phase
lifecycle, execution model, delegated completion, and interaction model.

For its stated question, the glossary preserves distinctions that change an
Agent's legal interpretation: framework versus active bundle, LLM judgment
versus Engine judgment, Gate definition versus Gate verdict, and handoff versus
completion. It explicitly defers behavior to accepted specs/executable
contracts and current facts to the active bundle, so a reader can stop after
terminology alignment or honestly follow the linked authority for a deeper
question.

The source of each definition remains the existing guidance terminology canon,
particularly `guidelines/README.md`, `guidelines/agentic-execution-model.md`,
and `guidelines/project-charter.md`. `CONTEXT.md` is a hand-maintained
non-authoritative projection, not a generated or derived state.

The glossary will make this source route visible in one short terminology
sources/authority-boundary block with direct Markdown links to all three canon
sources. It will direct readers to the execution model for the full Phase Agent,
Sub-agent, Queue demand item, Work unit, and Submit canon, and to the Charter
for Source-of-Record implications. Its compressed definitions must preserve
three high-risk distinctions from those sources:

- an active bundle is the selected runtime context for a production run or a
  disposable experiment, not the reusable framework;
- a Gate verdict is deterministic checkpoint feedback, while Chain plus the
  accepted transition authority selects a next phase; and
- a Source of Record decides one class of facts but does not by itself confer
  authority, capability, permission, liveness, or evidence.

This is a bounded vocabulary alignment layer, not an attempt to reproduce the
execution model's complete delegated-work vocabulary or a runtime command
index.

Alternatives rejected:

- A `DPT_FRAMEWORK/CONTEXT.md` would duplicate the same domain vocabulary and
  make divergence likely without creating a separate bounded context.
- Embedding the glossary in the Charter would make the mandatory first read
  longer and mix constitutional guidance with an Agent-facing vocabulary index.
- Letting each skill maintain its own vocabulary would recreate the current
  prompt-by-prompt drift.

### Capability boundary is separate from Agent Command Surface

The accepted `agent-command-surface` capability owns framework command
audience, pre-pipeline trigger versus Agent command execution, command-document
drift, and phase-boundary terminology. This change leaves those runtime and
command-entry semantics untouched. `agent-context-routing` has the independent
constraint that every substantive repository or framework task receives one
shared vocabulary-alignment route and one root architectural decision record
before task-specific authority is interpreted. Its focused document-byte
regression protects that route without expanding the existing command-surface
scan or claiming command execution behavior.

### Agent entry is explicit and ordered

Root `AGENTS.md` and `CLAUDE.md` will retain the Charter as the first mandatory
project read and immediately require `CONTEXT.md` for every substantive task.
They will carry equivalent routing obligations, not a byte-for-byte identity:
each preserves its tool-specific identity and existing instructions. The
wording will state that normal instruction discovery and task-specific
authoritative sources still apply after that route. The new pre-read will sit
within their existing `## Before Anything Else` blocks and before their
existing `## Deep Research Routing` blocks, leaving the already-synchronized
selected-entry language inside those blocks unchanged. The relevant shared
pre-read subsection will remain textually synchronized between the two behavior
files.

Root `README.md` will expose the same Charter-then-context pointer in `Start
Here`, before it delegates directory selection to its existing scoped-reading
guidance. It remains a repository orientation surface, not an authority source
or an instruction to recursively pre-read the repository. Root `AGENTS.md`,
`CLAUDE.md`, and `README.md` will make `docs/adr/` discoverable as the
on-demand durable architecture-decision surface while retaining the rule that
only task-relevant top-level surfaces are read.

`DPT_FRAMEWORK/AGENTS.md` and `DPT_FRAMEWORK/CLAUDE.md` will independently
require the same shared-project pre-read for framework work:
`../guidelines/project-charter.md`, then `../CONTEXT.md`. Their equivalent
routing obligations preserve their tool-specific identities. Only after that
route do their existing README, COMMANDS, and selected-playbook requirements
provide the framework's Agent-facing operating surfaces. Applicable accepted
and executable contracts retain their existing behavior authority. The route
will point back rather than copy definitions. It is documentation discovery
only: it neither selects a research run nor creates a new framework lifecycle
operation. The new pre-read will sit before their existing first-priority
framework routing block, leaving the already-synchronized selected-entry
directive itself unchanged. It will occupy one identically worded named
`## 共享项目上下文` pre-read block in both files, as required by their existing
local synchronization note.

`DPT_FRAMEWORK/README.md` will expose the corresponding parent-project pointer
before any framework trigger guidance, including the existing
`> **最快触发**` callout and `## 触发规则（最高优先）` block. It remains the
canonical framework runtime guide; the pointer is orientation only and neither
becomes a DPT research entry nor changes the existing `RUN.md` / continuation
selection.

All three framework entry surfaces (`AGENTS.md`, `CLAUDE.md`, and `README.md`)
will say that this project-context read is not a DPT research entry, run
selection, or authorization for request-specific research. That lets it
precede the framework's existing “single entry first” rule without claiming to
alter that rule's entry alternatives.

For selected DPT research, this pre-read precedes interpretation of the
framework instructions but does not replace the existing single selected-entry
rule. After it, the existing explicit-bundle route still selects
`continue-run-bundle.md`; otherwise the existing new-research route still
selects `RUN.md`, before request-specific research work. The change therefore
adds no alternate research entry and does not alter the no-shortcut boundary.
The established `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`
remains the compatibility proof for those pre-existing selection and
no-shortcut semantics.

The direct loop is intentionally short:

```text
Project Charter -> root CONTEXT.md -> task-specific authority
```

It removes repeated prompt explanations and avoids a second glossary, a
context-state tracker, a documentation interpreter, or Engine involvement.

### ADR records the architectural choice, not current behavior

`docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md` records
why the project does not use a JavaScript workflow controller. It is root-only
because the decision spans the repository rather than a framework-local bounded
context. It will have a concise Status, Context, Decision, and Consequences
shape, with a `## Status` section whose value is `Accepted`, plus an explicit
authority boundary that points readers back to accepted OpenSpec contracts for
current behavior. This keeps a durable rationale separate from a runtime or
behavioral source of truth and does not introduce a new authority or routing
mechanism. `CONTEXT.md` will link the record as an optional architecture
rationale, so an Agent can discover the decision after vocabulary alignment
without making ADR reading a mandatory pre-task hop.

### Regression checks only the document contract it can observe

Add `tests/integration/md/agent-context-routing-contract.test.mjs` as an
`integration` test. It will read actual root `AGENTS.md`, root `CLAUDE.md`,
root `README.md`, root `CONTEXT.md`, `DPT_FRAMEWORK/AGENTS.md`,
`DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/README.md`, and ADR 0001, then
assert:

- all four Agent behavior entries name the Charter before root `CONTEXT.md`;
- both root entries place `CONTEXT.md` within their existing `Before Anything
  Else` block and before their existing `Deep Research Routing` block, while
  both framework entries place `../CONTEXT.md` before their existing
  first-priority framework routing block;
- both READMEs place their Charter-then-context pointer before their existing
  root directory-routing or the framework's `最快触发` callout and trigger
  block, while root README retains its scoped-reading boundary;
- root behavior files and README identify `docs/adr/` as the task-relevant
  durable architecture-decision surface;
- both framework entries point to the root glossary and do not define a local
  glossary route;
- both framework behavior blocks and framework README state their non-entry,
  non-selection, and non-research-authorization boundary;
- the paired root behavior-file pre-read subsections and paired framework
  shared-project pre-read blocks stay textually synchronized;
- both root entries retain normal instruction discovery and task-specific
  authority, while both framework entries retain their README, COMMANDS, and
  selected-playbook operating routes after the shared pre-read;
- `DPT_FRAMEWORK/CONTEXT.md` does not exist;
- the glossary states its non-authority boundary, links its three guidance
  canon sources, and contains the active-bundle, Gate-versus-Chain, and
  Source-of-Record distinction markers plus a discoverable ADR 0001 link; and
- ADR 0001 has its stable decision-record headings, states the LLM/Markdown
  versus Engine split, has `Status: Accepted`, and defers current behavior to
  accepted OpenSpec contracts.

The test will carry the `ACR` implementation markers, resolve the repository
from its own `import.meta.url`, and use one ordered-marker helper per document.
That helper checks the new pre-read boundary against the existing section
markers, extracts the existing root `Before Anything Else` subsection and the
framework `共享项目上下文` block for pair comparison, and does not inspect the
internal selected-entry semantics. It is a focused in-process document-byte
integration contract: it will not parse prose semantics beyond explicit stable
markers, inspect runtime bundles, invoke a framework CLI, duplicate the
established selected-entry regression, or make a claim about actual Agent
cognition.

### Apply sequencing preserves governance and ownership

`ACR` and its requirement IDs are proposal-stage registry metadata, not an
apply target edit. The apply task list first validates the change-local
verification plan and confirms global requirement consistency before the scoped
documentation and test edits. It aligns the existing root docs and both root
Agent behavior files before both local framework behavior files and their
respective READMEs, then adds the static regression. The local framework edits
occur only in `/opsx:apply`, honoring the framework read-only boundary.

The user has already made the vocabulary and routing decisions. After entry
guidance directs a live Agent to the glossary, ordinary task execution remains
with that Agent under existing permissions and contracts; the Engine's verdict
authority is unchanged.

## Risks / Trade-offs

- [Glossary drifts from guidelines] -> Keep the glossary explicitly
  non-authoritative, cite its canon sources, and use the static regression for
  its critical boundary markers.
- [Mandatory read adds context cost to small tasks] -> Keep entries short,
  grouped, and limited to terms whose confusion changes authority or workflow
  interpretation; do not turn it into an architecture manual.
- [Framework-local route is mistaken for a second context or skips the Charter]
  -> State that the root file is the sole glossary, require the shared ordered
  route in the framework entry, and add regression assertions for both facts.
- [One Coding Agent surface drifts from its peer] -> Treat `AGENTS.md` and
  `CLAUDE.md` as equivalent routing surfaces and assert the critical route in
  all four root/framework files without requiring unrelated byte identity.
- [A direct README reader misses vocabulary alignment] -> Put the same short
  pointer in the root and framework README entry surfaces, and keep the root
  scope and framework trigger contracts protected by focused compatibility
  checks.
- [Architecture decisions are durable but undiscoverable] -> Put `docs/adr/`
  in the existing root task-surface and directory maps as an on-demand surface,
  then route the current ADR through Context without making either mandatory
  reading for unrelated tasks.
- [Context pre-read accidentally changes selected DPT entry behavior] -> State
  its no-selection boundary, leave the established entry directives untouched,
  and run the existing selected-entry regression during apply.
- [Static test overclaims behavior] -> Scope its claim to text/order/presence
  only and classify it as a JS-led integration contract.

## Migration Plan

1. `ACR-001` through `ACR-004` are registered during proposal preparation.
   During apply, validate `verification-plan.yaml` in plan mode and confirm
   global requirement consistency before target edits.
2. Align and source-link the existing root `CONTEXT.md`; retain ADR 0001 and
   amend it only if it lacks the required non-authoritative trade-off record.
3. Update root `AGENTS.md` / `CLAUDE.md` / `README.md` and framework
   `AGENTS.md` / `CLAUDE.md` / `README.md` with the same ordered route while
   preserving their existing scope and selected-entry instructions.
4. Add the focused governance test, validate assets, and run that test plus the
   relevant governance checks.
5. Rollback consists of reverting these documentation and test files only; no
   runtime bundle or Engine state migration is required.
