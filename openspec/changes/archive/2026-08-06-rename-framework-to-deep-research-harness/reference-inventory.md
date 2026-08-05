# Rename Reference Inventory

Date: 2026-08-05

## Scan Boundary

This inventory covers current source, documentation, accepted/current OpenSpec
specifications, tests, and experiment surfaces. It was produced before the
first target edit with:

```text
rg -l --hidden \
  -g '!node_modules/**' -g '!.git/**' -g '!_backlog/**' -g '!_temp/**' \
  -g '!.exp-bundles/**' -g '!dpt_rb_*/**' -g '!dpt_disp_*/**' \
  -g '!openspec/changes/archive/**' \
  'DPT_FRAMEWORK|RUN_BUNDLE\\.md' .
```

The scan found 523 current files with one or both legacy strings: 106 under
the current source tree and 417 outside it. `git ls-files` also identified
five fixture files below `tests/fixtures/DPT_FRAMEWORK/` whose coordinates
must move even though their contents do not necessarily contain either string.

## Canonical References To Migrate

The following classes are canonical authoring references and will become
`DEEP_RESEARCH_HARNESS/` references during this change:

- The physical `DPT_FRAMEWORK/` source tree (229 tracked files) and its
  in-tree imports, executable diagnostics, templates, local docs, playbooks,
  workflow nodes, schema references, and release banner.
- Root operating and release surfaces: `AGENTS.md`, `CLAUDE.md`, `README.md`,
  `CONTEXT.md`, `SETUP.md`, `CHANGELOG.md`, and `.env.example` where matched.
- Current guidance, accepted specs, OpenSpec configuration/governance, and
  non-archive active change artifacts whose wording does not explicitly
  describe legacy compatibility.
- `experiments_env/`, `experiments_playbook/`, and their runner-facing
  documentation and helpers.
- `tests/` imports, fixture generation, deterministic contract assertions, and
  fixture coordinates. The fixture source moves to
  `tests/fixtures/DEEP_RESEARCH_HARNESS/`.

## Explicit Compatibility References To Retain

Only these forms may retain the old spelling after migration:

- The one relative Git symlink: `DPT_FRAMEWORK/ -> DEEP_RESEARCH_HARNESS/`.
- Documentation and diagnostics that explicitly identify `DPT_FRAMEWORK/` as
  that legacy alias, never as a canonical authoring coordinate.
- Tests that exercise the legacy command path or assert the single-alias
  invariant.
- `RUN_BUNDLE.md` only when it is explicitly described or tested as a legacy
  entry card in the ordered fallback `BUNDLE_ENTRY.md` -> `RUN_BUNDLE.md` ->
  `BUNDLE_MAP.md`.
- The active rename change's proposal, design, delta specs, tasks, verification
  plan, and ADR 0002 where the historical name is necessary to define the
  migration or compatibility boundary.

## Historical And Runtime Content To Leave Untouched

The scan intentionally excludes `openspec/changes/archive/**`, `_backlog/**`,
`_temp/**`, `.exp-bundles/**`, existing `dpt_rb_*/` and `dpt_disp_*/` roots,
`_old_topics/**`, `node_modules/**`, and `.git/**`. Those locations are
historical, disposable, dependency, or runtime content; this change neither
rewrites bundle entry files nor migrates their creation-time coordinates.

## Completion Check

After migration, a repeat scan over the same current-surface boundary must
leave legacy matches only in the compatibility classes above. Any other match
is a canonical-reference migration defect under WDC-001, WDC-004, or BUM-005.
