# Name the Reusable Surface Deep Research Harness

## Status

Accepted

## Context

The reusable system, its filesystem path, and each research instance have
historically shared the `DPT_FRAMEWORK` / "framework" vocabulary. That makes
the boundary harder for people and Agents to reconstruct, especially beside
the per-engagement run bundle that holds mutable runtime truth. The current
`DPT_FRAMEWORK/` path is also an executable surface used by imports, commands,
contracts, and tests.

## Decision

The reusable system's canonical semantic name is **Deep Research Harness**.
Its target filesystem name is `DEEP_RESEARCH_HARNESS/`. A **run bundle** remains
the durable package for one bounded research engagement and must not name the
reusable harness. The approved `rename-framework-to-deep-research-harness`
OpenSpec change establishes `DEEP_RESEARCH_HARNESS/` as the physical source
root. `DPT_FRAMEWORK/` is a relative compatibility symlink to that same source
tree, not an alternative canonical concept.

## Considered Options

- `DPT_FRAMEWORK` and `DPT_HARNESS` retain an opaque legacy abbreviation or
  the old conceptual label.
- `DR_HARNESS` is shorter but requires readers to infer a new abbreviation.
- `RUN_BUNDLE` would conflate the reusable harness with a mutable research
  instance.

## Consequences

This ADR records the terminology decision; the focused
`rename-framework-to-deep-research-harness` OpenSpec change defines and
implements the executable migration and compatibility policy. That migration
excludes the existing `dpt_rb_*` and `dpt_disp_*` run-bundle path grammar:
those are compatibility tokens, not canonical domain vocabulary, and the
decision does not introduce a second accepted grammar.
