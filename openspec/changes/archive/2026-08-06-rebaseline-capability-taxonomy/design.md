## Context

See [proposal.md](proposal.md) for the motivation. The current main-spec tree
has 84 flat capability IDs. OpenSpec v1.7.0 already recursively discovers,
validates, syncs, and archives nested spec paths, where the complete relative
path is identity. It does not perform semantic capability retrieval, and the
default `spec-driven` instructions still use flat examples.

The repository already has recursive main-spec and requirement-ID checks, an
archive finalizer, and a change-owned verification-plan convention. The
requirement registry also has a `prefixes:` map, but its values are leaf names
and the existing requirement checker does not resolve them to main specs.

The direct audit rules out `skip_specs`: RET-001/RET-002 define the registry
path/group contract, RET-006 defines required governance checks, and CHF-003
defines the finalizer check set. This change modifies those existing governance
behaviors, so it uses two nested delta specs rather than treating the work as a
tool-only refactor.

## Goals / Non-Goals

**Goals:**

- Establish one stable, two-segment capability identity for every live main
  spec and any active delta.
- Give Coding Agents a compact, reuse-first navigation path that distinguishes
  behavior contracts from execution surfaces, operation skills, and workflow
  entries.
- Make durable path, catalog inventory, local-link, registry-prefix, and
  proposal-record facts mechanically checkable at the existing governance
  boundaries.
- Preserve requirement IDs, requirement bodies, and the current recursive
  OpenSpec behavior while making the structural migration reviewable.
- Extend existing governance capabilities instead of creating a duplicate
  taxonomy capability: RET-003 owns catalog-led reuse-first discovery, while
  CHF-003 owns the finalizer's additional direct prerequisites.

**Non-Goals:**

- Do not change any accepted Harness behavior, runtime schema, Gate, receipt,
  trace, public CLI, dependency, or framework version.
- Do not make the catalog a behavior authority, semantic classifier, task
  scheduler, or implementation index.
- Do not make Node judge whether a candidate is semantically ideal, whether an
  Agent's discovery reasoning is complete, or whether an optional GRILLME skill
  is installed.
- Do not retain flat compatibility specs, aliases, symlinks, or rewrite
  archived changes that truthfully use historical paths.

## Decisions

### 1. Canonical identity is exactly `domain/capability`

The approved domain allowlist is `agent`, `engine`, `bundle`, `research`,
`workflow`, `verification`, and `governance`. Each segment is kebab-case and a
live main spec therefore has exactly this location:

```text
openspec/specs/<domain>/<capability>/spec.md
```

An active delta uses the identical full path below its change root. The leaf
name and requirement prefix remain stable in this rebaseline; a leaf alone is
not an identity. Domain selection follows the primary task question and
semantic subject. A deterministic implementation surface does not itself make
a capability `engine`; cross-domain concerns are represented by catalog links,
not duplicate specs.

`taxonomy-map.yaml` is the reviewed, change-owned source for the 84 moves. It
records the legacy path, canonical path, requirement prefix, domains, and
expected count. Apply must validate it as one-to-one before using it to issue
explicit `git mv` operations. It is not a runtime data model and it must not be
copied into `config.yaml`.

Alternative considered: preserve flat specs and add only tags. Rejected because
OpenSpec's full path is the identity, so tags would leave the exact-address
surface ambiguous and would not prevent a future flat delta from recreating an
old capability.

### 2. The Capability Catalog is a thin Markdown projection

`openspec/specs/README.md` will have an introductory authority statement,
domain headings, and exactly one pipe-table row per live main spec. The table
uses this fixed column contract:

| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |
| --- | --- | --- | --- | --- | --- | --- |

`Purpose` is a concise navigation summary grounded in the corresponding main
spec's `## Purpose`; placeholder purposes must be repaired from the existing
requirement body before a row is published. `Keywords` and `Boundaries /
neighbors` support retrieval only and must not restate requirements.

`Related entries` is a semicolon-separated typed list using only:

```text
capability:<domain/capability>
execution-surface:<repository-relative path>
workflow-entry:<repository-relative path>
operation-skill:<environment-provided identifier>
none
```

The checker resolves `capability`, `execution-surface`, and `workflow-entry`
targets within the repository. It does not resolve `operation-skill` targets:
GRILLME and other environment-provided skills are optional guidance, not a
project dependency. Both ownership columns must be nonempty and explicitly
state the relevant responsibility or its absence; `mixed` is not valid
shorthand.

The main spec remains the direct Source of Record. The catalog's normal
reasoning stop is an identified candidate set or an explicit unknown, followed
by reading the linked main spec; it cannot decide semantic fit or authorize a
change.

Alternative considered: put summaries and all 84 paths into `config.yaml`.
Rejected because configuration is recurring instruction context, not a scalable
catalog or behavior authority. A dedicated static projection keeps the prompt
small and the discovery task on demand.

### 3. Reuse-first discovery extends `governance/requirement-traceability`

The change creates a nested delta for
`governance/requirement-traceability`. It modifies RET-001 and RET-002 so
live registry prefix owners and group headings use complete capability paths,
modifies RET-003 to add the catalog-led discovery contract to its existing
capability-boundary test, and modifies RET-006 to include the two new
governance checks. No new requirement ID is allocated. The direct owner is the
existing capability: its purpose and RET-003 already concern
self-documenting registry navigation and preventing incorrect
new-capability scope.

This is a deliberate reuse decision. A new `capability-taxonomy` spec would
split one bounded question -- how a change finds and traces an existing
capability -- across two overlapping governance contracts.

### 4. Reuse-first discovery is a prompt protocol plus a review record

`openspec/config.yaml` will add a compact context rule and proposal/spec rules:

1. Before declaring a New or Modified capability, read the catalog (or obtain
   the current spec list), then inspect relevant candidate main specs.
2. Record every considered full path in `proposal.md` under `## Capability
   Discovery` as `candidate path | evidence read | decision | reason`.
3. Use only `Modify`, `Verify-only`, `Excluded`, or `New` as dispositions.
   `New` must explain why no inspected existing contract owns the observable
   behavior.
4. A `skip_specs: true` change still has the heading and states explicitly why
   discovery yields no delta-spec applicability; it may retain candidate rows
   as evidence, as this change does.

This is Markdown/Agent flow: the Agent searches candidates, reads behavior
authority, makes the semantic comparison, and writes the reviewable rationale.
The user decides new semantics or risk; the Agent performs authorized
mechanical work. Node only returns structural verdicts, and no new controller,
state, retry tree, or human override is introduced.

Alternative considered: fork the built-in OpenSpec schema to force a custom
artifact. Rejected for now because project rules plus a small parser/checker
create the shortest direct feedback loop; a schema fork would add a second
lifecycle surface before there is evidence that the supported instruction path
is insufficient.

### 5. Governance checks validate facts, not semantic judgment

`check-project-reqs.mjs` remains the requirement-ID owner. It will parse the
registry's `prefixes:` map and, for each live prefix owner, require a complete
canonical path and an existing corresponding main spec. Retired and explicit
sub-prefix aliases remain historical registry entries and must not be invented
as live capability owners.

Add `check-capability-taxonomy.mjs` with a small CLI that checks:

- every main and non-archived delta spec has exactly two path segments, a
  permitted domain, kebab-case segments, and a `spec.md` leaf;
- no flat, over-deep, duplicate, or unapproved-domain live ID remains;
- every main spec has exactly one catalog row and every row resolves to exactly
  one main spec;
- all declared project-local related entries resolve; and
- each row has both explicit ownership fields.

Add `check-capability-discovery.mjs --change <change>` that checks only the
proposal heading, table shape, full-path syntax, allowed disposition, and
nonempty reason. For `skip_specs`, it also requires an explicit
non-applicability reason. It does not assess evidence quality or semantic
correctness.

Both checks return a direct `check`/`inspect` style failure with the broken
path, row, or proposal field and one repair coordinate. Tests belong in
`tests/integration/governance/`, including nested-valid, flat-invalid,
over-depth-invalid, missing-catalog, bad-local-relation, missing-control-field,
normal-discovery, and `skip_specs` discovery fixtures. Existing flat fixtures
remain only where they intentionally test generic recursive behavior; the
finalizer integration fixture is updated to be a valid nested taxonomy fixture
before it tests later gates.

The change creates a nested delta for `governance/change-feedback-loop` that
modifies CHF-003. `finalize-change-archive.mjs` will run the checks after
requirement and main-spec governance and before verification routing. Its
result schema, ordered check IDs, failure codes, and tests gain
`capability_taxonomy_failed` / `capability_discovery_failed` so a failed
structural check never reaches native archive.

Alternative considered: a generic linter over all Markdown. Rejected because
the two purpose-built checks answer bounded questions using direct sources and
avoid a new broad prose authority.

### 6. Migration is a controlled rebaseline, not a compatibility layer

Before moving files, apply captures the live main-spec paths, requirement
counts, and `> req:` headers, then reruns the active-change scan. Any active
old-path delta must be archived/cancelled or move with the matching main spec
in the same review; no active delta may recreate a flat ID.

Apply updates only current contract coordinates: the main-spec directories,
active deltas, registry prefix values and headings, catalog, config wording,
literal current-path references, focused tests, and governance scripts. It
does not rewrite `openspec/changes/archive/`. It uses `git mv` for all 84
directories, then validates one-to-one before/after facts rather than claiming
that the complete diff is rename-only.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| A catalog becomes stale or is treated as a second specification. | Keep it concise, state authority at the top, and check one-to-one path coverage and local links only. |
| A migration misses a literal reference or active delta recreates a flat path. | Re-run active-change discovery immediately before moves; use the reviewed map, repository-wide focused path search, and strict final checks. |
| Too much catalog context dilutes Agent attention. | Keep catalog out of recurring config context; configuration points to it on demand. |
| A checker turns subjective taxonomy judgment into a false deterministic verdict. | Limit validation to path grammar, inventory, declared local targets, and field presence. |
| Registry special cases are mistaken for live capabilities. | Resolve live prefix owners separately from explicitly retired or sub-prefix entries; test both cases. |
| Four placeholder purposes make catalog summaries unreliable. | Repair only those Purpose sentences from existing requirement content and review them as no-semantic-change hygiene. |

## Migration Plan

1. Validate this change's `verification-plan.yaml`, snapshot the 84 current
   main-spec IDs/requirement headers, validate `taxonomy-map.yaml`, and rerun
   active-change/path-reference discovery.
2. Add the two checker modules and their focused integration coverage; extend
   requirement prefix resolution and finalizer ordered gating, including its
   nested-taxonomy fixture.
3. Update configuration and all current-path knowledge surfaces; construct the
   catalog from reviewed Purpose summaries and the map.
4. Move each main spec and any active delta with explicit `git mv`, update live
   registry path coordinates, and update the narrow literal-reference tests.
5. Run strict OpenSpec, taxonomy, discovery, registry, main-spec, finalizer
   unit/integration, and focused Markdown-path validation. Agent-sync the two
   governance deltas into their moved main specs before the governed finalizer.
   Compare the before/after inventories: 84 mapped successors, unchanged
   existing requirement IDs, no flat live IDs, and one catalog/registry owner
   per spec.

Rollback before archive is a reverse move using the same reviewed map, paired
with reversal of registry/config/catalog references. Do not publish a partial
flat/nested hybrid. Once archived, the historical change record remains the
audit evidence; a later semantic reorganization requires its own OpenSpec
change.

## Open Questions

None. The domain allowlist, mapping, catalog boundary, discovery record,
governance ownership, and migration discipline have been explicitly aligned.
