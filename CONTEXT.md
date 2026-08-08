# Deep Research Tool Project Context

This glossary gives Agents and maintainers one shared language for the Deep
Research Tool project. It does not replace project guidance, accepted specs,
executable contracts, or runtime truth.

## Terminology Sources and Authority Boundary

`CONTEXT.md` is a vocabulary-alignment surface: it gives a short shared
language, not a behavior specification, executable contract, Gate verdict, or
runtime projection. Read the [Project Charter](guidelines/project-charter.md)
for project authority boundaries, the [Guidelines Index](guidelines/README.md)
for the guidance suite, and the [Agentic Execution Model](guidelines/agentic-execution-model.md)
for the execution terminology canon. The complete Phase Agent, Sub-agent, Queue
demand item, Work unit, and Submit vocabulary stays in that execution-model
canon; the entries here are compressed orientation only.

Current behavior, executable contracts, and current runtime facts remain with
their applicable Sources of Record. For durable architecture rationale, see
[ADR 0001](docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md)
[ADR 0002](docs/adr/0002-name-the-reusable-surface-deep-research-harness.md),
and [ADR 0003](docs/adr/0003-retire-legacy-harness-source-alias.md).
They are optional rationale, not mandatory pre-task reads, behavior authority,
or replacements for the Charter.

## Capability Discovery

**OpenSpec capability**:
A named behavior contract managed through the OpenSpec lifecycle. Its main spec
is the behavior authority; it is not an execution surface, operation skill, or
command.
_Avoid_: execution surface, skill, command

**Execution surface**:
A concrete Markdown control surface, Engine/CLI surface, or reusable Harness
surface through which an OpenSpec capability is carried out or enforced. It
does not itself define the behavior contract.
_Avoid_: OpenSpec capability, operation skill, behavior authority

**Operation skill**:
A reusable Agent procedure or technique, including a GRILLME skill, used to
perform work. It does not establish product behavior or identify an OpenSpec
capability.
_Avoid_: OpenSpec capability, execution surface, behavior contract

**Workflow entry**:
A named lifecycle entry, such as an OpenSpec phase command or Harness playbook,
that selects an operating procedure. It is not the behavior contract being
changed or reused.
_Avoid_: OpenSpec capability, operation skill, execution surface

**Capability Catalog**:
An Agent-facing navigation projection that makes existing OpenSpec capabilities
and their related execution surfaces, operation skills, and workflow entries
quickly discoverable. It proposes candidates and next sources to inspect; main
specs remain behavior authority.
_Avoid_: behavior authority, automatic decision-maker, implementation index

**Catalog relation**:
A typed navigation pointer from a capability to a related execution surface,
operation skill, or workflow entry. Project-local targets can be checked for
existence; an environment-provided operation skill is optional guidance, not a
project dependency or behavior authority.
_Avoid_: required external dependency, behavior contract, duplicate spec

**Capability control boundary**:
The Catalog's concise statement of the Agent/Markdown work and Engine/Node
work associated with one capability. It guides discovery and placement; it is
not a behavior authority, permission grant, or substitute for the main spec.
_Avoid_: mixed, implementation ownership alone, behavior authority

**Capability Discovery record**:
The required `proposal.md` evidence that shows which existing capability paths
were considered, what was read, and why each was reused, excluded, or extended
before a new capability is declared. A `skip_specs` governance change states
why the record is not applicable.
_Avoid_: chat-only search claim, unreviewed new capability, behavior authority

**Capability reuse**:
Routing requested work to an existing OpenSpec capability and its relevant
execution surfaces before creating a new capability. It is not implementation
reuse alone or a decision made without inspecting the main spec.
_Avoid_: code reuse, automatic selection, new capability by default

**Capability path**:
The complete `domain/capability` identifier of an OpenSpec capability. It is
the canonical identity across main specs, active deltas, registry mappings, and
catalog entries; a leaf name alone is not unique.
_Avoid_: leaf name, code path, execution path

**Capability taxonomy**:
The controlled two-level classification of OpenSpec capabilities by the Coding
Agent's primary task question and discovery entry. It does not determine
behavior ownership, code placement, or team ownership.
_Avoid_: execution architecture, implementation tree, topic tag

**Approved domain**:
One of `agent`, `engine`, `bundle`, `research`, `workflow`, `verification`, or
`governance`, used as the first segment of a live capability path. Adding a
domain is a governance decision, not an ad hoc directory creation.
_Avoid_: source directory, implementation layer, unapproved bucket

**Cross-domain capability**:
An OpenSpec capability with relevant concerns in more than one discovery
domain. It has one canonical path selected first by the primary task question
and semantic subject; only a remaining tie uses the direct contract or
authority boundary. A deterministic enforcement surface alone does not make it
an `engine` capability; the catalog links secondary relationships rather than
creating duplicate capabilities.
_Avoid_: duplicate capability, implementation-layer classification, multiple canonical paths

## System and Runtime

**Deep Research Tool project**:
The repository and engineering effort that develops the Deep Research
Harness.
_Avoid_: Deep Research Harness, `DEEP_RESEARCH_HARNESS/`

**Deep Research Harness**:
A reusable agentic harness that turns a broad research question into an
evidence-backed, gated research report. It is distinct from both the project
that develops it and any particular run bundle.
_Avoid_: Deep Research Tool project, Deep Research Framework, run bundle,
repository source coordinates

**`DEEP_RESEARCH_HARNESS/`**:
The repository directory containing reusable Deep Research Harness assets.
It is a filesystem location, not the framework concept or a research run.
_Avoid_: Deep Research Harness, run bundle, active bundle

**Run bundle**:
A durable package for one bounded Deep Research engagement. It contains the
material needed to resume, inspect, and deliver that engagement; a research
run is its lifecycle, while a current run bundle is its explicit runtime
selection.
_Avoid_: topic, Deep Research Harness, research run, current run bundle

**Research run**:
The lifecycle of work performed through one run bundle, from research
alignment through final delivery. It is not a harness asset or filesystem location.
_Avoid_: run bundle, current run bundle, Deep Research Harness

**Current run bundle**:
The run bundle explicitly loaded for the present production research run or
disposable experiment, CLI invocation, or task card. "Current" describes
operation scope, not recency or lifecycle status; its directory is the current
run bundle root.
_Avoid_: active bundle, latest bundle, Deep Research Harness, repository root

**Current run bundle root**:
The explicit filesystem directory that identifies a current run bundle and
roots its runtime-relative paths. Once resolved, its canonical absolute form
is the handoff coordinate for Agent/CLI work; it comes from new-bundle creation
or an existing-bundle entry, never from chat memory, repository root, working
directory, or chronology.
_Avoid_: active bundle root, latest bundle path, repository root

## Actors

**LLM Agent**:
An LLM-based actor that supplies research, semantic judgment, writing, and
feedback-driven repair. It does not own deterministic runtime authority.
_Avoid_: Agent when the role matters, Engine

**Phase Agent**:
The runtime role held by the LLM Agent responsible for phase-level work. It is
a role, not a permanent identity.
_Avoid_: main agent, parent agent, orchestrator

**Sub-agent**:
A bounded LLM Agent assigned to one work unit. It is a runtime role without
workflow authority.
_Avoid_: worker, child agent

**Agent actor**:
A generic LLM or human actor that performs work from project control surfaces.
Use this term only when the distinction between LLM and human is irrelevant.
_Avoid_: Agent when the exact role matters

## Authority and Control

**Markdown control surface**:
An Agent-readable surface that presents work, constraints, and deterministic
feedback. It guides Agent flow but does not decide machine truth.
_Avoid_: machine authority, runtime truth

**Engine**:
The deterministic authority that evaluates schemas, checkpoints, receipts, and
trace facts. It does not conduct research or make semantic judgments.
_Avoid_: workflow orchestrator, LLM Agent

**Runtime truth**:
The durable facts of a research run held under its current run bundle root. It
is not chat memory or reusable framework assets.
_Avoid_: conversation context, framework assets

**Source of Record**:
The one authoritative surface for a particular class of facts. It identifies
only who decides that class of facts; it does not by itself grant authority,
capability, permission, liveness, or evidence.
_Avoid_: projection, chat summary, guidance prose

**Deterministic fact family**:
A bounded category of Engine-owned facts with one semantic authority, whose
truth can independently change a legal Submit, Gate, handoff, or Final-admission
outcome. It is not an individual field, schema file, helper, or reader projection.
_Avoid_: schema contract, individual field, validator, module

**Semantic fact catalog**:
A project-governed, machine-readable directory of deterministic fact families
used to classify a change's semantic impact. It is not a runtime schema, a
change-local record, or a Gate.
_Avoid_: schema registry, change checklist, runtime contract

**Semantic resolver**:
The Engine-owned interface that turns raw records into the deterministic
conclusion for one fact family. A raw reader may supply data to it but does not
itself establish that conclusion.
_Avoid_: raw reader, Gate, schema validator

## Research Design

**Topic research emphasis**:
An optional, user-readable planning decision that asks for additional research
on one Topic after every Topic has met the common delivery baseline. It guides
incremental research selection, including a later rerun; it is not currently a
profile field, Gate rule, runtime authority, quality score, or permission to
reduce another Topic below its baseline.
It may be captured optionally during the existing HITL1 decision and revised
when HITL2 records a legal rerun rationale; the later silent rerun phase only
consumes that decision. It does not create another interactive checkpoint.
_Avoid_: topic weight, per-Topic quality score, scope role, source-count floor

**Minimal independent topic map**:
A user-approved set of canonical Topics that preserves the independent research
questions needed for a run, without splitting a single answer merely to reach a
target count. A runnable map has at least one Topic, while its upper size is
not preset; the Agent recommends grouping or consolidation when that makes the
map easier to review. It is a semantic decomposition, not a workload queue,
source-count calculation, or research-emphasis score.
_Avoid_: fixed 3-5 topic target, work-unit count, topic weight, scope-role count

**Research focus brief**:
An optional natural-language explanation of what additional understanding a
user wants from one Topic, with any relevant source, scope, comparison, or
delivery constraints. It is the user-facing expression of Topic research
emphasis; the Agent may turn it into a readable research direction, but it is
not a numeric formula, a profile override, a Gate verdict, or Engine-owned
research judgment.
_Avoid_: weight form, source-floor override, Wave command, queue instruction

**Traceable focus coverage**:
A future deterministic planning/checkpoint boundary for an emphasized Topic:
every approved focus commitment must have submitted evidence backing or an
explicit, visible limitation. Its compact outcome may be `covered`, `partial`,
or `blocked`; it proves traceability of incremental work, not that arbitrary
natural-language intent was semantically answered correctly. Semantic
usefulness remains a User/Agent review question at HITL2. This is a confirmed
design direction, not a current Gate, schema field, Engine verdict, or routing
rule for `partial`/`blocked`.
_Avoid_: semantic-quality score, LLM self-rating, source-count quota, HITL2 replacement

## Deterministic Checkpoints

**Gate**:
A deterministic lifecycle boundary executed by the Engine. It permits a
transition only when accepted checks pass; it is not a research phase, LLM
judgment, or workflow controller.
_Avoid_: phase, content judge, workflow controller

**Schema**:
An executable contract that constrains the structure and allowed values of
data crossing the LLM Agent and Engine boundary. It validates data shape; it
does not itself decide research quality, lifecycle progression, or Gate pass.
_Avoid_: Gate verdict, research-quality judgment, workflow contract

**Gate definition**:
A read-only framework-side rule definition that says what a Gate checks. It is
not run data or a Gate verdict.
_Avoid_: Gate verdict, runtime state

**Gate verdict**:
Engine-produced deterministic checkpoint feedback for a Gate, including
whether it passed against the current run state. It is runtime truth, but it
does not itself select the next Chain phase, load workflow nodes, or choose a
semantic repair strategy.
_Avoid_: Gate definition, workflow decision, phase completion

## Evidence

**Receipt**:
Durable local evidence that a task or boundary really happened. It is scoped to
the object and proof boundary it records; it does not establish unrelated
completion or authority.
_Avoid_: progress summary, console output, generic proof

**Trace**:
Append-only diagnostic memory from real execution. It records events and
context but is not by itself a Gate verdict or a broader completion claim.
_Avoid_: Gate verdict, progress summary, chat memory

## Feedback

**Check**:
Deterministic pass/fail feedback from the Engine about one specific condition.
It does not make a content judgment or repair the condition.
_Avoid_: semantic verdict, generic status

**Inspect**:
Engine diagnosis of missing, malformed, or inconsistent state. It identifies a
problem but does not repair it.
_Avoid_: repair, content judgment

**Advice**:
Engine-provided direction from deterministic state for the next repair or
continuation step. It does not grant permission, choose semantic work, or
advance state.
_Avoid_: permission, final judgment, state transition

## Phase Lifecycle

**Phase transition**:
Runtime status synchronization for a passed source Gate. It is not the same as
loading or completing the target phase.
_Avoid_: phase handoff, work completion

**Phase handoff**:
The Phase Agent consumes a Gate's `check.next` through the accepted
loader/check and receives the next Markdown control surface. It proves
entry/loading, not target-phase work completion.
_Avoid_: phase transition, work completion

**Work completion**:
Target-phase artifacts and accepted Gate or content rules prove that target
phase's work is done. It is not established by a phase transition or handoff
alone.
_Avoid_: phase transition, phase handoff, load complete

## Execution Model

**Chain**:
Phase-to-phase routing. A passed Gate yields a verdict, then Chain uses accepted
transition authority to select the next phase; Chain does not inspect a Queue
or allocate work.
_Avoid_: workflow controller, Queue, Work unit

**Queue**:
Phase-local demand orchestration. It tracks what work is needed and where each
demand stands; it does not make research judgments or accept delegated results
as Gate coverage.
_Avoid_: Chain, Work unit, research planner

**Work unit**:
One Engine-allocated delegated execution attempt, identified by `work_id`. It
is not a Queue demand, phase, topic, or ordinary task card.
_Avoid_: Queue demand item, phase, topic, task card

## Delegated Completion

**Queue demand item**:
A phase-local demand record identified by `queue_item_id`. It is not a
delegated attempt and does not use a `work_id` as its identity.
_Avoid_: Work unit, `work_id`

**Submit**:
The Engine's normal successful completion transaction for a claimed Work unit.
It accepts a validated result and creates a submitted ledger row; it is not
merely writing output files or completing a Queue item.
_Avoid_: output write, Queue complete

**Submitted ledger row**:
An Engine-written record created by successful Work unit Submit. It is the
Gate coverage authority for delegated work; filesystem output alone is not.
_Avoid_: filesystem-only output, hand-written declaration

## Submitted Evidence and Projections

**Submitted Wave0 contribution**:
One accepted Wave0 ledger/result binding and its declared source/cache facts for
one Work unit. It owns an interval of source identities in the current valid
direct source array; a retained prefix remains owned by its original accepted
contribution across a later rerun append. It is not selected solely by the
latest `rerun_count`, a bare `work_id`, a filesystem artifact, or aggregate
source coverage.
_Avoid_: `submitted_work`, submitted source file, work-unit acknowledgement

**Current-round eligible work-unit projection**:
A reader for Queue demand coverage from submitted work bound to the current
rerun. It does not decide ownership of retained Wave0 source identities.
_Avoid_: Wave0 contribution lineage, source catalog, historical coverage

**Wave0 submitted-contribution lineage**:
The retained, ledger-ordered Wave0 contributions that own the current direct
source-array identities. It preserves an original prefix owner and assigns a
later contribution only its appended suffix; it is distinct from current-round
Queue demand coverage.
_Avoid_: current-round eligible projection, aggregate `submitted_work`, source catalog

**Source identity**:
One exact submitted Wave0 source coordinate, `<work_id>/<ordinal>`. It is not a
bare work ID, URL, title, or path.
_Avoid_: work ID, source URL, source record

**`submitted_work` wire discriminator**:
The serialized `source_identity.kind` value that says an entry originated from
a Work unit. It is not a submitted contribution, aggregate coverage, or a
runtime alias.
_Avoid_: submitted contribution, source identity, aggregate acknowledgement

**Reference**:
A reader-facing evidence presentation. It may be a legacy delegated output or
a backed Phase-owned consumer projection; disk or index presence alone is not
authority.
_Avoid_: evidence authority, submitted ledger row, source identity

**Consumer projection**:
Derived reader or navigation output from submitted backing. It does not replace
ledger, source, cache, or provenance authority.
_Avoid_: submitted contribution, source catalog, evidence authority

**Final key-finding declaration**:
A reader-facing selected conclusion named in a Final Evidence Map. It is not a
submitted ledger row, a provenance authority, or a semantic verdict.
_Avoid_: submitted work, citation ledger, claim-quality check

**Final Evidence Map**:
The bounded Final Markdown table that associates each declared key finding with
one or more reader-openable backing links. It is not a Gate, a new ledger, or a
report-wide citation requirement.
_Avoid_: submitted ledger, Final Gate, prose scanner

**Final backing**:
An existing submitted direct evidence output or submitted-backed Reference
resolved for one Final Evidence Map link. Filesystem presence alone does not
make a path Final backing.
_Avoid_: disk artifact, cache file, semantic support verdict

**Seed projection**:
The topic-state rendering that records one source identity's evidence navigation
or deferred handling in a Seed Topic. It is distinct from a consumer projection.
_Avoid_: consumer projection, aggregate work-unit coverage, runtime state

**Deferred disposition**:
A persisted explanation and next hop bound to one source identity. It is not an
aggregate acknowledgement, missing coverage, or a Gate status.
_Avoid_: work-unit deferral, source absence, Gate verdict

## Interaction Model

**HITL1 decision**:
The recorded research semantic choice made from the user's clear HITL1
acceptance or correction. It is not a research-access observation, Gate verdict,
or host permission grant.
_Avoid_: capability result, ordinary later chat, runtime access fact

**Research-access observation**:
The direct result of HITL1's bounded search/fetch capability probe, recorded in
the accepted profile owner and consumed by the existing Gate. It is not a user
decision, research evidence, host permission grant, or Gate verdict.
_Avoid_: HITL1 decision, evidence, silent-execution completion

**Selected-host-native rendering**:
The selected host's presentation of native tool calls, policy/transport errors,
or permitted shell output. It is a host display fact, not a framework message,
research-access observation, or framework verdict.
_Avoid_: framework-controlled UI, probe result, Gate verdict

**HITL1**:
The first in-run interactive checkpoint, where the user aligns the research
direction, profile, or topics before autonomous research proceeds.
_Avoid_: ordinary progress confirmation, autonomous phase

**HITL2**:
The second and final in-run interactive checkpoint, where the user reviews the
synthesis and makes the required review decision.
_Avoid_: progress report, third checkpoint

**Autonomous continuation**:
Non-terminal `stop: no` behavior in which the Phase Agent continues silently
through Gate-driven work and handoff rather than surfacing, waiting, or
delivering early chat output.
_Avoid_: progress check-in, user confirmation loop

**Final**:
The terminal delivery of a research run after final artifacts exist. It is not
a third HITL checkpoint, progress report, confirmation loop, or repair loop.
_Avoid_: HITL3, autonomous repair loop
