# Deep Research Tool Project Context

This glossary gives Agents and maintainers one shared language for the Deep
Research Tool project. It does not replace project guidance, accepted specs,
executable contracts, or runtime truth.

## System and Runtime

**Deep Research Tool project**:
The repository and engineering effort that develops the Deep Research
Framework.
_Avoid_: Deep Research Framework, `DPT_FRAMEWORK/`

**Deep Research Framework (DPT Framework)**:
A reusable agentic framework that turns a broad research question into an
evidence-backed, gated research report. It is distinct from both the project
that develops it and any particular research run.
_Avoid_: Deep Research Tool project, research run, `DPT_FRAMEWORK/`

**`DPT_FRAMEWORK/`**:
The repository directory containing reusable Deep Research Framework assets.
It is a filesystem location, not the framework concept or a research run.
_Avoid_: Deep Research Framework, active bundle

**Research run**:
One complete instance of research work, from research alignment through final
delivery. It is a lifecycle, not a framework asset or filesystem location.
_Avoid_: active bundle, Deep Research Framework

**Active bundle**:
The currently selected persistent context for one research run. It holds that
run's durable facts and is distinct from both the framework and the run
lifecycle.
_Avoid_: research run, Deep Research Framework, repository root

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
The durable facts of a research run held in its active bundle. It is not chat
memory or reusable framework assets.
_Avoid_: conversation context, framework assets

**Source of Record**:
The one authoritative surface for a particular class of facts.
_Avoid_: projection, chat summary, guidance prose

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
whether it passed against the current run state. It is runtime truth; it does
not load workflow nodes or choose a semantic repair strategy.
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
Phase-to-phase routing. A passed Gate triggers route lookup for the next phase;
Chain does not inspect a Queue or allocate work.
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

## Interaction Model

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
