# Use Two-Level Capability Paths as Canonical Identity

## Status

Accepted

## Context

Flat capability leaf names make it difficult for a Coding Agent to distinguish
related behavior, find neighbors, and reuse the right existing contract. An
unbounded hierarchy would introduce equally ambiguous placement and navigation.
The project needs one stable identity that main specs, active deltas, the
requirement registry, and the Capability Catalog can share.

## Decision

Each live OpenSpec capability uses exactly one two-segment identity:
`domain/capability`. The complete path, not its leaf name, is the canonical
identity. Main specs and active change deltas use the same complete path; deeper
nesting is not part of the taxonomy. Approved domains are enforced through
project governance. A domain classifies the Coding Agent's primary task
question and discovery entry, not the source directory, execution layer, or
team that owns implementation.

The approved domains are `agent`, `engine`, `bundle`, `research`, `workflow`,
`verification`, and `governance`. Adding another domain requires a deliberate
governance decision rather than an ad hoc directory.

For a cross-domain capability, its primary task question and semantic subject
choose the path; the direct contract or authority boundary breaks only a
remaining tie. A deterministic enforcement surface alone does not make a
capability `engine`; that domain is for capabilities whose primary contract is
general Engine machinery. The Capability Catalog records secondary
relationships; a capability does not receive multiple canonical paths.

Until the focused OpenSpec migration is applied, the current flat directories
remain the repository's current state.

## Consequences

- Registry prefix targets and catalog entries use full capability paths.
- A capability move is an identity migration that requires synchronized main
  spec, active delta, registry, and catalog updates.
- The taxonomy stays a discovery structure rather than an execution or code
  ownership hierarchy.
