# Keep Agent Flow Markdown-Driven and Engine-Gated

## Status

Accepted

## Context

Deep Research needs LLM judgment for search, evidence selection, writing, and
multi-stage synthesis. A conventional JavaScript workflow controller can make
the flow look deterministic, but it would turn semantic work into scripted
control and hide the Agent-facing process from the LLM.

## Decision

Keep semantic research and multi-stage Agent Flow with the LLM Agent and
Markdown control surfaces. Keep the Engine as the deterministic trust root for
schemas, state transitions, receipts, trace, and checkpoint feedback; it
returns feedback instead of orchestrating research or making semantic
judgments. Current behavior remains governed by accepted OpenSpec contracts and
applicable executable contracts; this ADR records rationale, not runtime truth.

## Consequences

- Agent-facing work remains visible in Markdown, where the LLM can read tasks,
  constraints, and Engine feedback.
- JavaScript/CLI remains small and inspectable at deterministic boundaries
  rather than becoming a research workflow controller.
- Future changes to this split require the normal OpenSpec lifecycle instead of
  treating this record as an executable behavior specification.
