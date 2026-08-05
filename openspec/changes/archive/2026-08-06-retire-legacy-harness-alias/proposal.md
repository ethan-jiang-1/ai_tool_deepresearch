## Why

The prior rename made `DEEP_RESEARCH_HARNESS/` canonical, but a root-level
compatibility alias still leaves two successful source coordinates and keeps
the retired vocabulary in current Agent, Engine, test, and documentation
surfaces. That weakens the intended single-answer model for people and Agents:
"where is the reusable Harness?"

This change makes the terminology decision complete. It is intentionally a
breaking retirement, not another compatibility migration.

## What Changes

- **BREAKING**: Remove the root-level legacy Harness filesystem alias and all
  live resolver, import, command, diagnostic, fixture, test, and Autorun
  behavior that treats it as a successful source coordinate. The only reusable
  Harness root will be `DEEP_RESEARCH_HARNESS/`.
- **BREAKING**: Retire support for commands and existing run-bundle navigation
  coordinates that depend on the removed source path. Do not add a resolver,
  redirect, copied tree, automatic bundle rewrite, or fallback. A supplied
  bundle whose rendered Harness coordinate is no longer reachable reaches the
  existing reachability boundary and stops without executing a bundle-provided
  command path.
- Remove the retired vocabulary from the current tracked operational surface:
  source, current guidance, glossary, ADRs, changelog, accepted main specs,
  tests, fixtures, and experiment helpers. Historical Git commits and archived
  OpenSpec records remain historical evidence rather than live compatibility
  documentation or runtime support.
- Add focused deterministic coverage that proves one physical canonical
  Harness root, absence of a live compatibility path, canonical creator and
  inspector behavior, and source-root identity for affected host tooling. The
  coverage will not claim real-Agent research behavior.
- Keep accepted `tests/fixtures/` dependencies as test-only assets. They are
  not reusable Harness roots or supported Agent/operator command coordinates.
- Update the durable architecture rationale to record the explicit retirement
  decision without preserving the retired path as a current vocabulary item.
- A version bump is required: target **v0.74** in the root `CHANGELOG.md` and
  the `DEEP_RESEARCH_HARNESS/RUN.md` banner.

Semantic-precision review: a maintainer or Agent needs one bounded answer to
"which directory is the reusable Harness source root?" The answer becomes
only `DEEP_RESEARCH_HARNESS/`. It preserves the distinctions between live
Harness assets, immutable historical records, and mutable run-bundle state;
none of those records becomes another source-root coordinate. A reader can
stop at the canonical root and use the existing reachability boundary when a
supplied historical coordinate no longer resolves.

Control and responsibility review: the direct source of truth is the tracked
repository root and the filesystem-resolved canonical Harness directory. The
shortest legal loop is canonical path resolution or an ordinary unavailable
path result, with no alias resolver, migration controller, or hidden repair
path. The user has made the breaking compatibility decision; during apply the
Agent performs the mechanical retirement and validation, while the Engine
retains its existing deterministic path and bundle checks without gaining a
new migration authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-context-routing`: make the glossary and current architecture/routing
  surfaces expose one canonical Harness coordinate and no live legacy alias.
- `cmd-bundle-instantiation`: create and inspect bundles only through the
  canonical Harness root; remove the formerly successful source-path entry.
- `experiment-agent-autorun`: make source-root containment and execution
  identity canonical-only for Autorun and its deterministic tests.
- `framework-engine`: make the canonical Engine and CLI location exclusive,
  with no legacy source-path compatibility contract.
- `workflow-directory-contract`: define exactly one reusable Harness asset
  root and make historical bundle coordinates unsupported rather than
  resolvable compatibility paths.

## Impact

The change removes one repository symlink and updates path-sensitive Harness
CLIs, root/Harness documentation, current ADR and release records, accepted
specifications, tests, fixtures, and experiment/Autorun helpers. It adds no
dependency, runtime state schema, Gate, receipt, trace event, lifecycle phase,
or Agent-flow controller.

Existing runtime bundles are not rewritten or discovered. A bundle explicitly
provided later may be inspected only through its reachable current context;
this retirement does not promise that a bundle carrying the retired source
coordinate remains continuable. Historical Git and archived OpenSpec material
are intentionally not rewritten, because they record what previously existed
and are not part of the live supported system.
