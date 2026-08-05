## Context

See [proposal.md](proposal.md) for the motivation. The repository currently
has one physical `DEEP_RESEARCH_HARNESS/` tree plus a root-level symlink that
provides a second successful filesystem coordinate. A small set of current
CLIs, documentation, accepted specs, release history, and deterministic tests
still describes or exercises that second coordinate.

The prior rename deliberately preserved it for old commands and existing
bundle navigation. That is now the compatibility policy being retired. The
current continuation playbook already requires a supplied bundle, resolves its
rendered Harness coordinate, and stops at an unavailable selected-Harness
context before it executes a map-provided command. Retirement changes only
which historical coordinate resolves; it adds no lifecycle state, error
protocol, or migration mechanism.

## Goals / Non-Goals

**Goals:**

- Leave exactly one filesystem source coordinate for reusable Harness assets:
  `DEEP_RESEARCH_HARNESS/`.
- Remove live source-path compatibility behavior and vocabulary without
  changing run-bundle grammar, mutable runtime schemas, Gate behavior, or
  Markdown phase flow.
- Preserve historical runtime data while relying on the existing unavailable
  selected-Harness-context boundary for an unsupported source coordinate rather
  than a hidden fallback.
- Make canonical-only behavior observable through focused deterministic tests
  and an archive-time residual scan of the current live surface.

**Non-Goals:**

- Rewrite Git history, archived OpenSpec records, or unselected production and
  disposable run bundles.
- Rename `dpt_rb_*`, `dpt_disp_*`, `RUN_BUNDLE.md`, or other unrelated legacy
  runtime compatibility forms.
- Add a bundle migrator, source-root registry, redirect command, copied tree,
  global-current state, new Gate, or Agent-flow controller.
- Claim that a real Agent, host, or existing historical bundle continues to
  work after its source coordinate has been retired.

## Decisions

### Remove the compatibility path atomically

The root-level compatibility symlink is deleted in the same apply as every
current consumer that accepts it. Canonical source/import/command paths use
only `DEEP_RESEARCH_HARNESS/`; path-aware code removes fallback branches rather
than translating old input to the canonical root.

This is intentionally different from warning, forwarding, or automatic
redirection. Those alternatives retain two successful coordinates and make the
same terminology ambiguity durable. A missing old path fails at the ordinary
filesystem or current reachability boundary, which is the shortest truthful
outcome.

### Keep test fixtures outside the source-root model

The accepted `test-fixtures` contract owns narrowly scoped dependencies below
`tests/fixtures/`. Those test assets can link to selected Harness files so a
test exercises a fixture, but they are not reusable Harness assets, production
imports, or Agent/operator command entries. They do not provide another answer
to the source-root question and are not a compatibility path for the retired
root-level alias.

### Treat old bundle navigation as historical, not migratable runtime truth

Existing bundles remain untouched. A supplied bundle is eligible for
continuation only when its entry and rendered Harness coordinate are reachable
in the selected source context. If that coordinate is absent after retirement,
the existing continuation procedure reports that selected-Harness-context
boundary and stops before executing a bundle-provided command path.

No code scans for an alternative Harness, infers a replacement from cwd,
rewrites an entry card or map, or creates a symlink inside a bundle. That keeps
the bundle's historical bytes and the current live contract separate.

### Clean current documentation while retainable history stays historical

Current root/Harness guides, `CONTEXT.md`, `CHANGELOG.md`, current ADRs, main
specs, tests, fixtures, and experiment helpers are live surfaces and will no
longer describe a second source coordinate. The changelog's older entries will
be phrased in neutral historical language so readers do not encounter the
retired path in the current file.

The existing naming ADR will be revised to describe the still-valid canonical
terminology without the retired compatibility policy. A new ADR records why a
deliberate breaking retirement was chosen, and `CONTEXT.md` will expose it as
optional architecture rationale beside the existing ADRs. The new record does
not turn prior aliases into current vocabulary. Archived OpenSpec material and
Git commits are not rewritten: they are historical evidence, not an active
source of behavior.

### Verify topology and canonical behavior, not an invented migration layer

Focused integration and deterministic-E2E tests will remove success cases for
the retired command path and prove that the root exposes no alternate entry
resolving to the canonical Harness. They will continue to exercise production
creation, inspection, bundle-root-only runtime writes, and Autorun identity
through the canonical path.

The apply/closeout verification will also run a bounded residual scan over the
tracked working tree. It excludes this active change, archived OpenSpec
changes, and the unselected/runtime or archive directories that repository
rules prohibit reading, including `_original_*`; it does not assert anything
about their historical contents. The scan succeeds only with no exact
retired-vocabulary matches, and a separate filesystem assertion proves that the
root-level compatibility entry is neither present nor a symlink. The exact
scope, command, and result are recorded in the change-scoped
`reference-inventory.md`. This is a release verification fact, not a new
runtime checker or source of authority. It avoids encoding a hidden
compatibility model merely to test its removal.

### Semantic, control, and responsibility review

This change does not add a new abstraction. It removes the alternate answer to
the maintainer/Agent question "where is the reusable Harness?" The precise
remaining answer is the canonical directory. Historical records and run
bundles remain distinct because neither can become a live source coordinate.

The direct source of record is the tracked repository topology and the
filesystem-resolved canonical Harness root. The control loop is simply
canonical resolution or the existing selected-Harness-context boundary. Net
simplification is the deletion of one symlink, fallback branches, dual-path
tests, and compatibility prose; no new state, validation chain, controller, or
repair mechanism is introduced.

The user has made the breaking compatibility decision. During apply, the Agent
owns the authorized mechanical deletion, reference cleanup, and verification;
the Engine keeps its existing path/bundle checks and does not acquire any
migration, override, or semantic-judgment authority.

## Risks / Trade-offs

- [An external script or old bundle still invokes the retired path] -> This is
  the intentional breaking result. The release entry and ADR make the boundary
  explicit; a caller must switch to the canonical path rather than receive a
  silent redirect.
- [An old bundle has a historical navigation coordinate that is no longer
  reachable] -> Keep its bytes untouched and return the existing
  selected-Harness-context boundary; do not invent a migration or discovery
  route.
- [A current release or ADR entry reintroduces the retired vocabulary] -> Run
  the bounded live-surface residual scan at apply and closeout, and keep the
  canonical-root topology test focused on the only supported source location.
- [Removing the symlink changes path resolution in a path-sensitive tool] ->
  Run creator, inspector, fixture, Autorun, and deterministic-E2E coverage in
  a clean process through the canonical root; retain no success case through a
  second root.
- [Historical record cleanup obscures what happened] -> Preserve Git and
  archived OpenSpec evidence while making current documents describe only the
  supported system.

## Migration Plan

1. Establish the live-reference inventory and verification plan before target
   edits. Define the tracked-worktree residual-scan boundary, excluding this
   active change, archived changes, and unselected runtime data without reading
   those exclusions.
2. Delete the root-level compatibility symlink, remove path fallbacks from
   canonical CLIs, and update canonical source/import/host-tool references.
3. Update root/Harness guidance, glossary, ADRs, changelog, and accepted specs
   so the canonical root is the only current coordinate. Bump the release to
   v0.74 in `CHANGELOG.md` and the `RUN.md` banner.
4. Replace dual-path regression assertions with canonical-root topology,
   creator, inspector, fixture, and Autorun assertions. Add no bundle rewrite,
   alias-resolver, or retired-vocabulary fixture. Retain only the accepted
   test-owned fixture dependencies, never as a supported source coordinate.
5. Run the declared focused tests, strict OpenSpec and governance checks,
   residual scan, and final archive process. Record only deterministic proof
   claims actually exercised.

Rollback before release is a Git revert of this change, which restores the
previous compatibility policy atomically. No runtime-bundle repair is needed
because this change never mutates existing bundle data.
