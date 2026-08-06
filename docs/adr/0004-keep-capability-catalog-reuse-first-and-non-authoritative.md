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

The catalog header and project configuration name the generic OpenSpec
lifecycle once. An individual row carries only capability-specific related
entries. Project-local Harness, workflow, and OpenSpec coordinates may be
checked for existence; environment-provided operation skills such as GRILLME
skills are optional Agent guidance rather than project dependencies.

Every row also carries a concise capability control boundary: what the
Agent/Markdown side owns and what the Engine/Node side owns. A row may have
only one side, but it must state that explicitly rather than using a vague
`mixed` label. This is discovery metadata; its semantic correctness remains a
human/Agent review judgment.

Every proposal that introduces or materially changes a capability contains a
`## Capability Discovery` table with candidate path, evidence read,
disposition, and reason. A `skip_specs` governance change states why this is
not applicable. A thin checker validates the record's structure, not the
semantic quality of its conclusions.

## Consequences

- Main specs remain the single behavior authority.
- Catalog maintenance is judged by discovery usefulness and referential
  accuracy, not by duplicating complete specifications.
- A Coding Agent must search for reusable capability before treating requested
  work as a new capability.
- The catalog does not repeat generic lifecycle instructions or claim that an
  external skill is installed in every Agent environment.
- Catalog rows make the Markdown/Agent versus Engine/Node placement visible
  before an Agent begins implementation.
