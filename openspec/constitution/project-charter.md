---
guideline_id: project-charter
suite: deep-research-guidelines
title: Project Charter
status: effective
created: 2026-06-17
revised: 2026-08-10
role: repo-wide charter and entrypoint
scope: all work in this repository
authority: guidance
siblings:
  - openspec/constitution/evolution/abstraction-semantic-precision.md
  - openspec/constitution/evolution/simple-reliable-control.md
  - openspec/constitution/evolution/helper-oriented-agent.md
---

# Project Charter

> Status: effective | Purpose: the mandatory project-boundary read

Deep Research Tool is an agentic framework for evidence-backed, multi-wave,
gated research reports. It is not a conventional deterministic program with an
LLM attached: the Agent supplies understanding and judgment, while deterministic
contracts make durable facts inspectable and enforceable.

## Constitutional Core

- **Agent judgment:** the LLM Agent searches, reads, writes, synthesizes, and
  chooses semantic repair. It does not own deterministic runtime truth.
- **Markdown flow:** Markdown/playbooks/task cards present multi-stage Agent
  work, constraints, and feedback. They do not decide machine state.
- **Engine authority:** JavaScript/CLI validates schemas, evaluates deterministic
  checkpoints, checks receipts, writes trace, and returns check/inspect/advice
  feedback. It does not replace Agent reasoning or orchestrate semantic work.
- **Durable state:** structured runtime facts belong to the explicitly selected
  current run bundle, never chat memory or reusable framework assets.
- **Evidence honesty:** do not fabricate trace, results, receipts, sub-agent
  output, runtime validation, tests, or completion claims. Every claim is bound
  to its object, provenance, actor, and proof boundary.
- **Spec-driven evolution:** behavior changes use the approved OpenSpec change
  lifecycle. Guidance explains boundaries and routes readers; it does not grant
  implementation permission or override accepted/executable contracts.

## Authority And Conflict

Choose the owner by the fact being decided:

| Fact | Source of Record | Guidance boundary |
|---|---|---|
| Universal project boundaries | this Charter | not capability behavior |
| Accepted capability behavior | accepted OpenSpec specification | not runtime truth |
| Deterministic structure and verdicts | applicable executable contract and regression evidence | not semantic judgment |
| Current run facts | selected current run bundle | not chat memory |
| Procedure or terminology | selected operation or model document | not behavior authority |

When sources disagree, prefer the owner for that fact. A Source of Record
identifies who decides a fact; it does not itself grant authority, capability,
permission, liveness, or evidence. Test classes and proof permissions remain
defined by the accepted `verification-routing` specification.

## Change Lifecycle

For a new or changed behavior: propose the bounded change, establish its
specification and tasks, implement and verify the approved work, synchronize
accepted behavior when required, then archive through the governed route.
Implementation findings return to the active change instead of becoming chat-only
rules. A passing checker is evidence for its stated deterministic condition, not
permission to skip the remaining lifecycle or invent a semantic conclusion.

## Design Review Route

Before a new or materially changed state, projection, status, concept, module,
command, reader-facing view, architecture, recovery shape, or Agent-facing
boundary is chosen, apply the constitutional review in this order:

1. [Abstraction as Semantic Precision](evolution/abstraction-semantic-precision.md)
   asks whether the reader receives a precise bounded question and a normal
   reasoning stop.
2. [Simple Reliable Control](evolution/simple-reliable-control.md) limits the
   control shape to direct facts and the shortest legal feedback loop.
3. [Helper-Oriented Agent](evolution/helper-oriented-agent.md) keeps new
   semantic/risk/permission decisions with the user, ordinary authorized work
   with the Agent, and deterministic verdicts with the Engine.

The triad guides future design; it neither changes accepted behavior nor creates
runtime authority, permission, or a new lifecycle state.

## Reading Order

1. Read this Charter for the project boundary.
2. Read the first applicable constitutional companion in the ordered route
   above, then the next companion only when its question applies.
3. Leave the constitutional route once the next fact needs a model, operation,
   accepted specification, executable contract, or selected run bundle.

## Related Guidance

- [Evolution Direction: Abstraction as Semantic Precision](evolution/abstraction-semantic-precision.md)
- [Evolution Direction: Simple Reliable Control](evolution/simple-reliable-control.md)
- [Evolution Direction: Helper-Oriented Agent](evolution/helper-oriented-agent.md)
