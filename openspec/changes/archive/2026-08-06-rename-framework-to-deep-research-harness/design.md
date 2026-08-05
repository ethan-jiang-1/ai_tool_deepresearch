## Context

See [proposal.md](proposal.md) for the motivation. The current source tree is
physically `DPT_FRAMEWORK/`; it is also embedded in ESM imports, CLI examples,
templates, test fixtures, accepted specs, and bundle-entry navigation text.
Existing production and disposable run bundles are mutable runtime truth and
some carry creation-time relative coordinates to that root. `RUN_BUNDLE.md`
currently acts as a minimal entry card, while `BUNDLE_MAP.md` is a deliberately
passive map.

The migration must make the source-root name intelligible without changing the
meaning or identity of `dpt_rb_*` / `dpt_disp_*` runtime roots, inventing a
global current-run state, or rewriting historical runtime truth.

## Goals / Non-Goals

**Goals:**

- Give new source, commands, templates, and Agent-facing documentation one
  canonical Harness path: `DEEP_RESEARCH_HARNESS/`.
- Keep legacy commands and existing bundles resolvable through exactly one
  compatibility path.
- Make `BUNDLE_ENTRY.md` the minimal entry for newly created run bundles, with
  an explicit and bounded legacy-entry precedence.
- Ensure each operation has one explicit current run bundle root coordinate
  suitable for Agent/CLI handoff.

**Non-Goals:**

- Rename `dpt_rb_*`, `dpt_disp_*`, `rb_*` control files, schemas, lifecycle
  states, Gate rules, receipts, or trace grammar.
- Edit, relocate, or manufacture historical production/disposable bundle data.
- Add a global session selector, bundle discovery scan, Engine workflow
  controller, path registry, or new user checkpoint.
- Retire the compatibility path in this change.

## Decisions

### Canonical source tree with one compatibility alias

`DEEP_RESEARCH_HARNESS/` becomes the physical, versioned source tree. The
repository retains a relative Git symlink `DPT_FRAMEWORK/ ->
DEEP_RESEARCH_HARNESS/` as the sole legacy compatibility path. All newly
authored source imports, command examples, templates, generated entry cards,
current specs, and non-historical documentation use the canonical path.

The alias is intentionally a filesystem address, not a second framework
concept. It keeps existing `node DPT_FRAMEWORK/...` invocations and older
bundle-relative framework links workable without copying source files or
maintaining two mutable trees.

Whenever a creator renders a Harness coordinate, it SHALL first resolve the
physical `DEEP_RESEARCH_HARNESS/` source root. Invoking that creator through
the legacy symlink must not cause a newly authored entry card or map to point
at `DPT_FRAMEWORK/` as though it were canonical.

Alternatives considered:

- Keep `DPT_FRAMEWORK/` as the physical root and add a canonical symlink: this
  makes the legacy name remain the actual source identity.
- Maintain two directories or a forwarding implementation tree: this creates
  duplicate import and version surfaces that can drift.
- Break old paths immediately: this invalidates existing bundle entry
  coordinates and external command references without a corresponding runtime
  benefit.

### Precise runtime coordinate vocabulary

The terminology has four distinct operational answers:

| Term | Question it answers | Direct fact |
| --- | --- | --- |
| Deep Research Harness | What reusable system supplies commands and contracts? | canonical source root |
| Run bundle | Which durable package belongs to one bounded research engagement? | its bundle directory and contents |
| Research run | What lifecycle is occurring or has occurred? | lifecycle facts inside the bundle |
| Current run bundle root | Where may this operation resolve mutable runtime paths? | the explicitly supplied/resolved bundle directory |

"Current" is scoped to a research entry, CLI invocation, task card, or
controlled experiment. It is not a session-global pointer, newest-bundle
heuristic, liveness claim, or permission grant. A CLI may accept an
explicitly supplied relative bundle path as boundary input, but it resolves
that path immediately after its normal reachability validation. Once the
directory exists, the handoff coordinate is its filesystem-resolved
canonical absolute path, not a cwd-relative spelling. Creators resolve the
created bundle root before writing their stdout handoff; later Agent/CLI
handoffs use that exact coordinate. This does not add a persistent global
field or a new root-resolution authority.

This supplies a normal reasoning stop point: an Agent can use the root to
resolve runtime-relative paths without reconstructing cwd or chat history;
the Engine remains responsible for validating a path at an existing command
boundary.

### Entry-card succession without changing map authority

New creators render `BUNDLE_ENTRY.md` plus `BUNDLE_MAP.md`.

- `BUNDLE_ENTRY.md` is a static, minimal entry card. It names the bundle,
  gives the creator-rendered path to the canonical Harness root, and delegates
  to the map and Harness command surface. It carries no runtime state, route,
  command, permission, or Gate authority.
- `BUNDLE_MAP.md` remains the full passive map and does not acquire a
  continuation protocol.
- An explicitly supplied existing bundle resolves entries in this order:
  `BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, then legacy map-only
  `BUNDLE_MAP.md`. Absence of all three is an honest entry failure, not a
  reason to scan or infer a bundle.

Existing bundles are read through this fallback; the migration does not add or
rename files inside them. New bundles do not emit `RUN_BUNDLE.md`.

Deterministic bundle readers that expose or audit root files must recognize
the same succession: a new `BUNDLE_ENTRY.md` is an expected static entry,
and legacy `RUN_BUNDLE.md` remains a known non-authoritative compatibility
entry. A fresh bundle must not receive a stale missing-`RUN_BUNDLE.md`
warning or an unexpected-file diagnostic merely because it uses the new card.

Alternatives considered:

- Keep `RUN_BUNDLE.md`: its imperative grammar conflates entering a bundle
  with running a workflow.
- Reuse `RUN.md`: it collides with the Harness new-research entry.
- Use `README.md` or extend `BUNDLE_MAP.md`: the former is too generic across
  nested roots, while the latter would conflate a passive map with an entry
  protocol.

### Compatibility scope is intentionally narrow

`dpt_rb_*` and `dpt_disp_*` remain accepted bundle-root grammar. The source
root alias and entry fallback are the only compatibility mechanisms introduced
here. The implementation must not accept an additional new bundle-root
prefix, rewrite absolute bundle bindings, or allow a legacy name to become a
second canonical authoring path.

This is the shortest correct control shape: one canonical source path, one
legacy address, and one ordered entry fallback. It replaces scattered
terminology and implicit path reconstruction without adding a migration
controller or multi-stage repair flow.

### Responsibility boundaries

The user has selected terminology and migration scope. The Agent performs
ordinary, authorized source relocation, document updates, and compatibility
verification once apply begins. The Engine retains all existing deterministic
validation of bundle arguments, paths, schemas, Gate state, receipts, and
trace. Neither a `BUNDLE_ENTRY.md` file nor a human continuation request
creates runtime authority, permission, or a phase transition.

## Risks / Trade-offs

- [A repository symlink may behave differently from a copied directory in
  launchers or test tooling] -> Test both canonical and legacy command paths,
  verify realpath/containment behavior, and keep one relative alias rather
  than a wrapper tree.
- [A current reference may retain `DPT_FRAMEWORK` as though it were canonical]
  -> Inventory non-archive source/spec/test references, migrate current
  authoring surfaces, and allow the old spelling only in explicit compatibility
  tests, alias documentation, and historical artifacts.
- [New entry-card semantics may strand older bundles] -> Exercise all three
  precedence positions against fresh representative fixtures without mutating
  a live bundle.
- ["Current" could be confused with latest or active lifecycle state] -> Keep
  the explicit-root definition in glossary, directory contract, playbooks,
  and diagnostics; add negative coverage for cwd/chat/history inference.
- [A relative creator target can leak a cwd-relative handoff or a legacy
  source coordinate] -> Resolve the created bundle and physical Harness roots
  before rendering/output, then exercise canonical and legacy command paths
  with relative target input.
- [Renaming bundle prefixes expands scope and breaks durable bindings] -> Make
  their exclusion an invariant in specs, tasks, and verification scans.

## Migration Plan

1. Validate this change's verification plan before target edits and establish
   the non-archive reference inventory.
2. Move the physical source tree to `DEEP_RESEARCH_HARNESS/` and add the
   relative `DPT_FRAMEWORK/` compatibility symlink. Convert all canonical
   imports, commands, root/framework guidance, templates, and current specs to
   the new path.
3. Replace the new-bundle entry template and creator output with
   `BUNDLE_ENTRY.md`; resolve the physical Harness and created-bundle
   coordinates before rendering/output; update deterministic entry readers for
   the ordered fallback without changing existing bundle contents.
4. Update root/bundle terminology and current-root handoff text, then migrate
   fixtures, path-sensitive tests, experiment surfaces, and release docs.
5. Verify canonical and legacy source paths, new and old entry files,
   unchanged bundle-root grammar, explicit-root negative cases, and ordinary
   full validation. Sync accepted specs and archive only after the governed
   checks pass.

Rollback before release is a Git revert of the source relocation and its
documentation/test changes. Existing run bundles remain untouched throughout,
so rollback does not require state repair. The legacy alias stays in the
released change; its eventual retirement requires a separately approved
compatibility-removal change.
