---
title: OpenSpec v1.7.0 Capability-Path Organization - Primary-Source Research
status: research-note
created: 2026-08-06
scope: upstream OpenSpec behavior and Coding-Agent discovery implications
---

# OpenSpec v1.7.0 Capability-Path Organization

## Bottom Line

Use a shallow, two-segment capability path as a project convention:

```text
openspec/specs/<domain>/<existing-capability-leaf>/spec.md
openspec/changes/<change>/specs/<domain>/<existing-capability-leaf>/spec.md
```

This is supported end to end by OpenSpec v1.7.0. The full relative path, for
example `agent/agent-command-surface`, is the capability identity consumed by
discovery, list/show/validate, delta parsing, and archive. It is not a parent
`agent` spec containing a child capability.

For the stated goal, folder layout is necessary but insufficient. Nested paths
make the namespace scanable; they do not make an agent semantically retrieve
the right existing spec. The effective design is four separate layers:

```text
full path identity  -> OpenSpec runtime address and archive target
main spec           -> behavior source of truth
thin catalog        -> navigation and candidate selection
config rules        -> make the Coding Agent run the discovery protocol
```

The strongest practical recommendation is therefore:

1. Preserve each current leaf name during this migration, yielding paths such
   as `agent/agent-command-surface`, rather than also shortening or renaming
   leaves.
2. Add a small catalog at `openspec/specs/README.md` and point to it from
   `openspec/config.yaml`.
3. Add explicit `proposal` and `specs` rules that require candidate search and
   reuse before a new capability is declared.
4. Treat the directory move as a controlled rebaseline, not a normal delta
   rename or an archive side effect.

## Evidence Baseline

- The installed CLI reported `openspec --version` as `1.7.0` on 2026-08-06.
- The local upstream-source checkout is ahead of the `v1.7.0` tag, so relevant
  files were compared directly with the release tag before drawing conclusions.
  `git diff --quiet v1.7.0 --` over discovery, archive/apply, list/show,
  validation, config, schema, and references code returned clean. The tag is
  commit `4e16790d90d8f54d4773ad9a5e71a57cd9f1e86b`.
- Focused upstream regression tests passed: 7 nested-layout tests across
  discovery, change parsing, validation, and archive. The test includes an
  archive from `changes/.../specs/platform/example-capability/spec.md` to the
  same relative main-spec location.

All source links below point to the official `v1.7.0` tag. The equivalent local
files are under `/Users/bowhead/OpenSpec/`.

## What OpenSpec Actually Treats As a Capability

### Identity is the complete path, not the leaf name

`discoverSpecFiles()` recursively walks non-hidden directories below the specs
root. For every `spec.md`, it builds the ID with `segments.join('/')`; it does
not truncate to the last directory. Thus these are distinct IDs:

```text
openspec/specs/agent/agent-command-surface/spec.md  -> agent/agent-command-surface
openspec/specs/workflow/agent-command-surface/spec.md -> workflow/agent-command-surface
```

Evidence: [discovery implementation, lines 11-62](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/utils/spec-discovery.ts#L11-L62) and its [nested-ID regression test, lines 34-50](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/test/utils/spec-discovery.test.ts#L34-L50).

The walker has no parent-capability operation or domain metadata. A directory
can contain both `agent/spec.md` and `agent/agent-command-surface/spec.md`; the
runtime sees two separate IDs, `agent` and `agent/agent-command-surface`.
Therefore a category directory must not contain its own `spec.md` unless it is
intentionally a separate behavior contract. The parent directory has navigation
meaning only.

There is no native two-level maximum. The walker accepts arbitrary nesting, and
the default schema declares change-spec outputs as `specs/**/*.md`.
Evidence: [recursive discovery](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/utils/spec-discovery.ts#L27-L62) and [default schema output glob, line 39](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/schemas/spec-driven/schema.yaml#L38-L40). If exactly one domain plus one leaf is a hard project rule, it needs a project checker; `config.yaml` wording cannot enforce it.

### The full path survives every normal lifecycle operation

| Operation | v1.7.0 behavior | Consequence |
|---|---|---|
| `list --specs` | Recursively discovers IDs and emits only `id` plus `requirementCount`. | It can enumerate `agent/...`, but is not a semantic catalog. |
| `show <id> --type spec` | Finds the known full ID, then reads `openspec/specs/<id>/spec.md`. | Use the complete path, not a leaf alias. |
| `validate --specs` | Gets the recursive ID set and validates each `specs/<id>/spec.md`. | Nested leaves are fully covered. |
| change parser / delta validation | Recursively discovers `changes/<change>/specs/**/spec.md`. | A nested delta is a first-class input. |
| archive / programmatic spec application | Rebuilds target `mainSpecsDir/<id>/spec.md` from the delta ID. | The change delta and main spec must use the exact same full path. |

Sources: [list, lines 167-218](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/list.ts#L167-L218), [show dispatch, lines 93-188](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/commands/show.ts#L93-L188), [show file resolution, lines 81-123](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/commands/spec.ts#L81-L123), [bulk validation, lines 265-294](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/commands/validate.ts#L265-L294), [delta parser, lines 57-75](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/parsers/change-parser.ts#L57-L75), and [target mapping, lines 48-77](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/specs-apply.ts#L48-L77).

The upstream archive regression test explicitly proves the last row: a nested
delta is archived into the same nested main path and remains nested in the
archive. See [test lines 618-664](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/test/core/archive.test.ts#L618-L664).

## The Discovery Gap That Matters for Coding Agents

### Native commands are exact-address tools, not semantic retrieval

`openspec list --specs --json` provides a low-cost inventory, but its local
JSON object contains only IDs and requirement counts. `show` first checks
whether the supplied string exactly appears in the discovered IDs, then opens
that path. Its typo suggestion is name similarity, not a search over Purpose,
requirements, keywords, or adjacent capabilities.

Sources: [list payload](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/list.ts#L190-L208) and [show lookup behavior](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/commands/show.ts#L104-L145).

That gives a clear answer to the primary objective: a two-level directory
improves human and agent scanning, but it cannot by itself make an agent choose
the correct existing capability. A Coding Agent still needs a small, explicit
candidate-selection protocol.

### Recommended local catalog

Maintain `openspec/specs/README.md` as a thin, manually reviewable index. It
is a safe location for a *main-spec navigation file*: discovery recognizes only
files named `spec.md`, so a root README is not a capability and is not listed or
validated as one. Do **not** place a catalog inside an active change's
`specs/` directory; `skip_specs` checks treat any non-hidden file there as
content that conflicts with the marker.

Sources: [what discovery accepts](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/utils/spec-discovery.ts#L37-L55), [root/non-spec exclusion test](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/test/utils/spec-discovery.test.ts#L52-L62), and [any-file check for `skip_specs`](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/utils/spec-discovery.ts#L65-L101).

Suggested one-row shape:

| path | Purpose | search keywords | boundary / neighboring capabilities |
|---|---|---|---|
| `agent/agent-command-surface` | One-sentence contract purpose | command, audience, invocation | adjacent to `agent/agent-context-routing`; does not own runtime-state semantics |

The catalog should only help an agent find the authoritative main spec. It
should not repeat requirements, scenarios, delta history, or full designs.
Use category headings for browsing, preserve complete paths in every row, and
make a conflict rule explicit: main `spec.md` wins over the catalog.

This is a project-level overlay, not an unimplemented OpenSpec feature. A
simple governance check can keep it honest: every catalog path exists, every
main spec has one catalog row, and no row retains a pre-migration path.

### Existing upstream reference behavior is useful but does not replace it

OpenSpec has an index-then-fetch mechanism for **declared external stores**.
It collects each referenced store's full spec IDs, first Purpose line, and a
precise `openspec show <spec-id> --type spec --store <store>` recipe; it does
not inline full content. It goes only one reference level deep and truncates at
50 KB.

Sources: [index collection and fetch recipe](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/references.ts#L170-L192), [one-hop rule](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/references.ts#L300-L304), and [50 KB truncation](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/references.ts#L416-L448).

It is a good model for the local catalog, but it does not index the current
repository's own main specs. Therefore `references:` should not be treated as
the solution to local capability discovery.

## `config.yaml`: What It Can and Cannot Do

The default v1.7.0 `spec-driven` schema still teaches the flat form:
`specs/<capability>/spec.md`, and tells the agent to use a kebab-case capability
name. It also tells the agent to inspect existing specs, but it does not supply
a nested-path convention or a catalog protocol.

Source: [default proposal instructions, lines 15-22](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/schemas/spec-driven/schema.yaml#L15-L22) and [default specs instructions, lines 62-65](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/schemas/spec-driven/schema.yaml#L62-L65).

This makes project configuration important even though the runtime supports
nested paths. The relevant v1.7.0 behavior is:

- `context` is injected into every artifact instruction and has a 50 KB limit.
- `rules` are lists keyed by **artifact ID** such as `proposal` and `specs`, not
  by capability path.
- `operations` applies only advisory guidance for `apply` and `archive`; it is
  not where proposal discovery belongs.
- These are prompt-level agent contracts, not deterministic CLI checks.

Sources: [config schema, lines 32-76](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/project-config.ts#L32-L76), [50 KB read limit, lines 236-301](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/project-config.ts#L236-L301), [instruction assembly, lines 368-393](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/artifact-graph/instruction-loader.ts#L368-L393), and [official CLI boundary statement, lines 808-825](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/docs/cli.md#L808-L825).

### Recommended configuration content

Do not inject the full 84-row catalog or full main-spec text into `context`.
It would be repeated for every artifact, consumes the bounded prompt budget,
and has no native synchronization mechanism. Put only the stable convention
and protocol in `context`, then add focused rules to the default artifacts.

The plan should merge equivalent wording into the project's existing config,
not blindly replace its YAML. The essential content is:

```yaml
context: |
  Capability IDs use <domain>/<capability>; the full path is the stable ID.
  Main specs and change deltas use the same full path.
  Main specs are behavior truth; openspec/specs/README.md is navigation only.

rules:
  proposal:
    - Before declaring a new or modified capability, read the catalog or run
      openspec list --specs --json; search relevant existing main specs first.
    - Record the selected existing capability paths and why they fit, or why a
      new path is necessary. Prefer modifying an existing behavior contract.
  specs:
    - Write each delta at specs/<domain>/<capability>/spec.md using the exact
      full capability ID declared in the proposal.
    - Do not create a near-duplicate capability without checking the catalog
      and candidate main specs.
```

Use the following progressive-read protocol in the plan and catalog header:

```text
1. Read short project context and the catalog.
2. Run: openspec list --specs --json
3. Select a small set of full-path candidates using task terms and code facts.
4. Run: openspec show <full-path> --type spec --json --requirements
5. Read the complete requirement/scenario block only for candidates being changed.
6. In the proposal, record reuse/new decision and the rejected near matches.
```

If the project wants a different default artifact template, a project-local
schema can replace the flat examples. Official customization documentation
supports forking `spec-driven` and changing its artifacts/templates. That only
changes workflow guidance; it still does not make path-depth, catalog freshness,
or proposal-to-delta correspondence an automatic validator.
Source: [custom schema guidance](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/docs/customization.md#L157-L195).

## Migration Is an Identity Rebaseline

### Why a directory move is not a normal rename

`findSpecUpdates()` maps each delta to a target solely by its discovered full
ID. It neither recognizes old locations nor deletes a former target. `archive`
then writes that target, creating directories as necessary. Therefore moving
`agent-command-surface` to `agent/agent-command-surface` changes the identity;
an old active delta would still target the old flat path and can recreate or
update it.

Sources: [same-path target calculation](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/specs-apply.ts#L48-L77), [archive invokes it](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/archive.ts#L428-L446), and [write creates only the target directory](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/specs-apply.ts#L453-L475).

`RENAMED Requirements` is not a capability rename. Its parser accepts only
`FROM: ### Requirement: ...` and `TO: ### Requirement: ...`, and the merger
renames blocks within the one current spec ID.
Sources: [parser](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/parsers/change-parser.ts#L151-L193) and [merge operation](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/specs-apply.ts#L286-L327).

### Required migration discipline

1. Freeze or complete active changes that touch any old flat capability. If a
   change must remain active, move/rebase its delta to the matching new full
   path in the same migration review.
2. Review a complete `old-path -> new-path` mapping before moving files. Keep
   the current leaf segment unchanged in this migration unless there is a
   compelling semantic error; changing leaf and prefix together adds needless
   mapping ambiguity.
3. `git mv` all main spec directories, then update active deltas, catalog,
   project-specific registry entries, documentation, and any literal references.
   A registry may be an important local governance source, but it is not an
   upstream OpenSpec runtime input; inspect its path-related fields separately.
4. Run `openspec list --specs --json`, `openspec validate --specs --strict`,
   each active change's strict validation, and the project governance checks.
   Verify that no old flat ID remains in main specs, active deltas, catalog, or
   registry mapping.

If this is represented by an OpenSpec governance change and it changes no
behavioral contract, `skip_specs: true` is appropriate for that change's own
delta artifact. It does **not** authorize archive to move main specs: a
`skip_specs` change must not contain any files below its own `specs/` directory,
and the move remains an explicit reviewed task. Source: [default schema's
`skip_specs` boundary](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/schemas/spec-driven/schema.yaml#L24-L30) and [archive's conflict check](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/src/core/archive.ts#L291-L338).

## Organizational Guidance for This Repository

The official recommendation for a large codebase is domain grouping that
matches how the team thinks about the system; feature area, component, and
bounded context are all valid slices. It deliberately does not prescribe a
single taxonomy. Source: [official organizing guidance, lines 103-119](https://github.com/Fission-AI/OpenSpec/blob/v1.7.0/docs/existing-projects.md#L103-L119).

For a Coding-Agent-first taxonomy, apply that advice with a stricter question:

> When a future task arrives, which prefix will maximize the chance that the
> agent narrows to the correct existing behavior contract before it creates a
> new one?

This favors domains that correspond to durable problem spaces in this project,
not a mechanical reflection of source folders. It also means the numeric target
of 5-20 leaves per domain is a soft review heuristic, not an OpenSpec rule. Do
not split a coherent behavior merely to satisfy a count, and do not let a very
large domain remain a single first-pass search space if it routinely makes
agents read unrelated specs.

Important tradeoff for the proposed mapping:

| Choice | Effect on agent discovery | Recommendation for this migration |
|---|---|---|
| `agent/agent-command-surface` | Slightly redundant visual name, but direct old-to-new mapping and preserved familiar leaf. | Prefer now. |
| `agent/command-surface` | Shorter display, but both the prefix and leaf change; old references and agent memory become harder to map. | Defer unless semantic correctness demands it. |
| A category `spec.md` | Looks like a domain overview but becomes its own independent capability. | Do not use for catalog/overview. |
| Category `README.md` plus root catalog headings | Explicit navigation with no runtime identity side effect. | Use. |

The category should never be described as a “parent spec” or as providing
inheritance. State it as a namespace/domain whose only operational value is
the full path string and whose human value is faster candidate selection.

## Facts the Final Plan Should State Precisely

- Nested paths are fully supported in v1.7.0 normal lifecycle commands.
- The full relative path is the capability identity; a leaf name is not an
  alias.
- Active delta paths must change together with main-spec paths. Leaving a delta
  flat is unsafe.
- `RENAMED` applies to requirement headers only, never capability paths.
- Native `list` is an inventory, not a semantic catalog; native `show` requires
  a known exact ID.
- Default agent instructions still show flat paths, so project config rules or
  a local schema must correct the authoring guidance.
- `config.context` is valuable for a short convention and protocol but is
  bounded prompt context, not a taxonomy validator.
- A local thin catalog and a discovery-evidence rule are the direct mechanisms
  that serve the goal of reusing the right existing capability.
- A structural migration is a controlled rebaseline with an explicit mapping,
  active-change handling, `git mv`, and verification; do not expect ordinary
  archive to rename or retire the old path.
