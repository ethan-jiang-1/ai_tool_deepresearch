## Context

See [proposal.md](proposal.md) for the motivation and
[agent-context-routing spec](specs/agent-context-routing/spec.md) for the
behavioral contract. The repository already has an effective terminology canon
in `guidelines/`, but no short root glossary is required by the normal Agent
entry route. Root `AGENTS.md` names the Charter as the first read, while
`DPT_FRAMEWORK/AGENTS.md` routes to framework operations without a direct link
back to the project-wide vocabulary.

The design changes reader-facing documentation and its deterministic regression
only. `DPT_FRAMEWORK/` remains read-only during this proposal phase, and no
runtime state, Engine contract, or framework version is changed.

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

Alternatives rejected:

- A `DPT_FRAMEWORK/CONTEXT.md` would duplicate the same domain vocabulary and
  make divergence likely without creating a separate bounded context.
- Embedding the glossary in the Charter would make the mandatory first read
  longer and mix constitutional guidance with an Agent-facing vocabulary index.
- Letting each skill maintain its own vocabulary would recreate the current
  prompt-by-prompt drift.

### Agent entry is explicit and ordered

Root `AGENTS.md` will retain the Charter as the first mandatory project read
and immediately require `CONTEXT.md` for every substantive task. The wording
will state that normal instruction discovery and task-specific authoritative
sources still apply after that route.

`DPT_FRAMEWORK/AGENTS.md` will name `../CONTEXT.md` as the shared project
glossary, preserving its existing README, COMMANDS, and selected-playbook
requirements. It will point back rather than copy definitions. This route is
documentation discovery only: it neither selects a research run nor creates a
new framework lifecycle operation.

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
context. The ADR points readers back to accepted OpenSpec contracts for current
behavior and does not introduce a new authority or routing mechanism.

### Regression checks only the document contract it can observe

Add `tests/governance/agent-context-routing.test.mjs` as a `unit` test. It will
read actual root `AGENTS.md`, root `CONTEXT.md`, `DPT_FRAMEWORK/AGENTS.md`, and
ADR 0001, then assert:

- the root entry names Charter before `CONTEXT.md`;
- the framework entry points to the root glossary and does not define a local
  glossary route;
- the glossary states its non-authority boundary and contains key distinction
  markers; and
- ADR 0001 states the LLM/Markdown versus Engine split.

The test will carry the `ACR` implementation markers. It will not parse prose
semantics beyond explicit stable markers, inspect runtime bundles, invoke a
framework CLI, or make a claim about actual Agent cognition.

### Apply sequencing preserves governance and ownership

The apply task list first adds `ACR` and its requirement IDs to the global
registry, then validates the change-local verification plan before target
edits. It updates root docs and root Agent instructions before the local
framework Agent instruction, then adds the static regression. The local
framework edit occurs only in `/opsx:apply`, honoring the framework read-only
boundary.

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
- [Framework-local route is mistaken for a second context] -> State that the
  root file is the sole glossary and add a regression assertion that no local
  context route is introduced.
- [Static test overclaims behavior] -> Scope its claim to text/order/presence
  only and classify it as a JS-led unit contract.

## Migration Plan

1. During apply, register `ACR-001` through `ACR-004` and validate
   `verification-plan.yaml` in plan mode.
2. Complete and source-link root `CONTEXT.md`; create ADR 0001 if it is absent.
3. Update root and framework Agent entry guidance with the ordered route.
4. Add the focused governance test, validate assets, and run that test plus the
   relevant governance checks.
5. Rollback consists of reverting these documentation and test files only; no
   runtime bundle or Engine state migration is required.
