# Name the Reusable Surface Deep Research Harness

## Status

Accepted

## Context

The reusable system, its filesystem path, and each research instance had
overlapping terminology. That made the boundary harder for people and Agents
to reconstruct, especially beside the per-engagement run bundle that holds
mutable runtime truth.

## Decision

The reusable system's canonical semantic name is **Deep Research Harness**.
Its target filesystem name is `DEEP_RESEARCH_HARNESS/`. A **run bundle** remains
the durable package for one bounded research engagement and must not name the
reusable harness. The approved `rename-framework-to-deep-research-harness`
OpenSpec change establishes `DEEP_RESEARCH_HARNESS/` as the physical source
root.

## Considered Options

- Opaque abbreviated names retain an extra conceptual label that readers must
  translate before locating the reusable system.
- `DR_HARNESS` is shorter but requires readers to infer a new abbreviation.
- `RUN_BUNDLE` would conflate the reusable harness with a mutable research
  instance.

## Consequences

This ADR records the terminology decision. The later
[ADR 0003](0003-retire-legacy-harness-source-alias.md) records the breaking
source-coordinate retirement. The existing `dpt_rb_*` and `dpt_disp_*`
run-bundle path grammar remains compatible: those are bundle-name tokens, not
canonical domain vocabulary, and the decision does not introduce a second
accepted grammar.
