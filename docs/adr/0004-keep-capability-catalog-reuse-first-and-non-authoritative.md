# Keep the Capability Catalog Reuse-First and Non-Authoritative

## Status

Accepted

## Context

Coding Agents need a fast way to discover whether a requested change belongs to
an existing OpenSpec capability and to find the relevant execution surfaces,
operation skills, and workflow entries. Main specs already own behavior. Making
a catalog another behavior source would create drift and let navigation metadata
silently override accepted contracts.

## Decision

Maintain a Capability Catalog as an Agent-facing, reuse-first discovery
projection. It routes a task to candidate OpenSpec capabilities and their
related sources, but it does not decide semantic fit, define behavior,
authorize implementation, or replace reading the main spec. A proposal that
creates a capability must record the candidates it considered and why neither
reuse nor extension of an existing capability fits. The detailed catalog shape
and enforcement belong to a focused OpenSpec change.

## Consequences

- Main specs remain the single behavior authority.
- Catalog maintenance is judged by discovery usefulness and referential
  accuracy, not by duplicating complete specifications.
- A Coding Agent must search for reusable capability before treating requested
  work as a new capability.
