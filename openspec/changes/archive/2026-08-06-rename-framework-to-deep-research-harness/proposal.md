## Why

`DPT_FRAMEWORK` simultaneously appears as an opaque directory name, the name
of the reusable system, and the root used in Agent-facing instructions. That
forces people and Agents to reconstruct distinctions that should be visible:
the reusable **Deep Research Harness**, one durable **run bundle**, and the
explicit root of the current run bundle. The user-directed terminology session
is recorded in [ADR 0002](../../../docs/adr/0002-name-the-reusable-surface-deep-research-harness.md),
and its change-level coordination record is
[the active rename plan](../../../_backlog/plans/rename-framework-to-deep-research-harness.md).

## What Changes

- **BREAKING**: Make `DEEP_RESEARCH_HARNESS/` the canonical reusable Harness
  directory and all current source, command, import, and Agent-facing
  documentation coordinates. Retain `DPT_FRAMEWORK/` only as one explicit
  compatibility path for legacy commands and existing bundles; it is no
  longer a canonical domain term or new-work authoring path.
- **BREAKING**: Replace new-bundle `RUN_BUNDLE.md` with `BUNDLE_ENTRY.md` as
  the minimal, static entry file. Preserve `BUNDLE_MAP.md` as the passive map;
  existing bundles using `RUN_BUNDLE.md` or an older map-only entry remain
  reloadable through explicit legacy fallback.
- Establish the canonical vocabulary: Deep Research Harness, run bundle,
  research run, current run bundle, and current run bundle root. A current
  root is explicitly selected for one operation and passed across Agent/CLI
  handoffs in canonical absolute form; it is never inferred from chat memory,
  cwd, repository root, chronology, or filesystem scanning. An explicitly
  supplied relative bundle path is permitted only at a command boundary.
  The command resolves it immediately; creators emit, and all later Agent/CLI
  handoffs use, the resulting canonical absolute current run bundle root.
- Keep `dpt_rb_*` and `dpt_disp_*` as legacy runtime path grammar. This change
  does not rename existing bundle roots, alter runtime state schemas, or
  create a second accepted bundle-name grammar.
- Migrate deterministic tests, fixtures, OpenSpec/current documentation,
  command examples, and path-sensitive diagnostics to the new canonical root
  while preserving a focused compatibility proof for legacy root and entry
  coordinates.
- Bump the Harness release from `v0.72` to `v0.73`.

## Capabilities

### New Capabilities

None. The change sharpens existing ownership boundaries rather than adding a
second terminology or runtime-control capability.

### Modified Capabilities

- `agent-context-routing`: Align the canonical glossary, ADR discovery, and
  framework-local routing language with Harness and current-run-bundle terms.
- `workflow-directory-contract`: Make the Harness root canonical, define the
  explicit current run bundle root, and bound the legacy root alias without
  changing `dpt_rb_*` / `dpt_disp_*` identity.
- `bundle-map`: Rename the minimal bundle entry artifact to `BUNDLE_ENTRY.md`
  while preserving its passive-map separation and legacy reload behavior.
- `run-entry`: Route an explicitly supplied existing bundle through its new
  entry file, with bounded compatibility for older entry files.
- `cmd-bundle-instantiation`: Create new bundles with canonical Harness
  coordinates and `BUNDLE_ENTRY.md`, while retaining existing no-overwrite and
  bundle-root behavior.
- `framework-engine`: Move the canonical Engine source/import location under
  `DEEP_RESEARCH_HARNESS/` and preserve only the bounded legacy root alias.
- `agent-command-surface`: Update Harness command surfaces and continuation
  guidance to use canonical roots and explicit current-root handoff.
- `version-management`: Bind release documentation and its `RUN.md` banner to
  the canonical Harness location.
- `test-fixtures`: Relocate fixture source coordinates to the canonical
  Harness path without weakening fixture isolation.
- `experiment-agent-autorun`: Preserve source-tree containment and framework
  identity checks across the canonical root and legacy compatibility path.
- `experiment-shared-infra`: Render the canonical bundle entry card from the
  disposable-bundle creator with the same bounded legacy-entry policy.

## Impact

This affects the reusable framework directory tree, ESM imports, CLI examples,
templates, bundle-entry routing, tests/fixtures, root and framework guidance,
OpenSpec path references, and version-release surfaces. It adds no dependency,
Gate, lifecycle state, queue behavior, evidence rule, or user interaction
checkpoint.

Semantic-precision review: a maintainer or Agent can answer "what reusable
system am I entering?", "which research instance am I working on?", and
"where may this operation resolve runtime paths?" from Harness, run bundle,
and current run bundle root without reconstructing directory conventions. The
distinction between reusable assets, mutable run state, a lifecycle, and a
legacy path alias remains explicit.

Control and responsibility review: the direct source of runtime truth remains
the explicitly selected current run bundle root; the Engine still validates
paths and checkpoints, while the Agent loads the supplied entry and performs
ordinary legal work. The migration removes competing canonical names and
avoids a new controller, global-current state, bundle scanner, or dual runtime
grammar. Human input fixed the terminology and compatibility scope; it grants
neither runtime authority nor permission to fabricate state.
