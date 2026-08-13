## Context

See [proposal.md](proposal.md) for the motivation and chosen policy. The
current C2c surface duplicates one internal `v0.x` sequence across four roles:

```text
root CHANGELOG.md heading
        |                         \
        v                          v
proposal/apply version rule    RUN.md entry banner
        |
        v
framework_version writer (C2b, separate change)
```

The first three roles are this change's target. The fourth is a real writer but
not a runtime decision reader; it is C2b's distinct artifact contract. Leaving
it in place after C2c would make `bundle/cmd-bundle-instantiation` claim a
source of version authority that C2c has removed, so C2b must complete first.

C2b is now governed-archived, but its completed target edits and C2c's target
edits coexist in the same uncommitted worktree. Therefore a raw `git diff HEAD`
is not by itself a C2c diff. Closeout must classify changed files against the
C2b archive task record and the C2c owner matrix before judging C2c scope.

## Goals / Non-Goals

**Goals:**

- Give the `RUN.md` reader exactly one current question: what is the next legal
  operational route after this Harness has been selected?
- Retain root `CHANGELOG.md` as concise human history without making a heading
  a version, release, compatibility, or execution authority.
- Remove the forced proposal-time internal number and the forced
  changelog/banner synchronization choreography from both governance prose and
  mechanical assertions.
- Preserve historic `v0.x` entries, Git history, and archived OpenSpec changes
  as inspectable records without treating any of them as current runtime truth.

**Non-Goals:**

- Do not reopen C2b's retired `framework_version` writer, former template
  field, old-bundle facts, or old-frontmatter preservation boundary.
- Do not create a package release process, Git tag policy, semver policy,
  generic version registry, version router, migration command, or compatibility
  adapter.
- Do not change selected bundle routing, research shortcuts, phase flow,
  schemas, Gates, receipts, trace, recovery, or `BUNDLE_ENTRY.md` semantics.
- Do not delete historical changelog entries or OpenSpec archives to reduce
  apparent noise.

## Decisions

### 1. Separate current entry from historical navigation

`RUN.md` will start with its title followed directly by existing Section 0.
It will have no internally versioned banner and will not inspect or mirror
`CHANGELOG.md`. This makes the entry reader's normal stop the existing Section
0/Section 2 route instead of an inferred release identity.

`CHANGELOG.md` remains at the repository root and receives a short
non-authority note. Existing numbered headings remain immutable historical
content; any future history entry is optional and must not become an input to
the Engine, bundle creation, entry routing, or compatibility selection.

Alternative considered: retain one compact banner synchronized to the
changelog. Rejected because it still creates two current projections and a
forced synchronization obligation while providing no current runtime decision.

### 2. Remove the choreography at its owners, not through a new version layer

The Apply slice changes these owners together:

| Owner | Remove | Retain |
| --- | --- | --- |
| `governance/version-management` | version authority, required change entry, banner equality, proposal target rule | concise optional human history at root |
| `openspec/config.yaml` | proposal/tasks version-bump and synchronized-entry mandates | ordinary change scope, risk, task, verification, and archive rules |
| `bundle/run-entry` / `RUN.md` | internal version banner | current entry selection and shortcut-prohibition content |
| focused tests | version-heading parser and banner-equality assertions | entry routing and bundle isolation/creation assertions |
| current catalog and static vocabulary projection | current banner/version-choreography wording | catalog navigation and current entry/history ownership boundaries |

No version object, state field, checker, or fallback replaces the removed
choreography. Accepted specs and executable contracts already own current
behavior; OpenSpec archives, Git history, and optional changelog entries each
remain bounded historical context rather than a new combined authority.

Alternative considered: introduce a replacement release metadata file or a
shared version helper. Rejected because it would preserve the same false
compatibility signal under a different name and add a reader/writer surface
with no current decision consumer.

### 3. C2b is a hard precondition for C2c Apply

Before the first C2c target edit, the separately approved C2b change must have
been applied and governed-archived. Its evidence must show that new bundle
creation no longer reads `CHANGELOG.md` or writes `framework_version`, while
existing unknown frontmatter still round-trips under the current plan contract.

This order prevents an intermediate accepted state in which C2c says changelog
headings are non-authoritative while CMI-007 still writes one as a bundle
creation fact. The prerequisite is a coordination boundary, not a request to
merge C2b code, specs, tests, or decisions into this change.

The archive satisfies the behavioral precondition, but not the worktree review
boundary: until C2b's target edits have their own commit boundary, C2c closeout
must compare the archive task record with the current changed-file set and
classify C2b-only, C2c-only, deliberate overlap, and unrelated files. A C2b
deletion must not be credited to C2c merely because both are visible relative
to `HEAD`.

Alternative considered: apply C2c first and tolerate a stale stamp until C2b.
Rejected because it would leave two accepted specifications contradictory and
would continue producing a new misleading artifact in the interval.

### 4. Reclassify tests by the fact they actually verify

- The version-management unit test changes from parsing a required `v0.x`
  heading to checking the non-authority notice, absence of forced config rules,
  and absence of an entry banner.
- The entry-routing integration test asserts title -> Section 0 -> trigger
  context by directly comparing those document coordinates, and asserts the
  absence of an internal version banner; it retains its current
  shortcut-prohibition and downstream-routing checks.
- The catalog/static-vocabulary integration test reads the current catalog row
  and accepted entry vocabulary, so both projections stop presenting the
  retired banner as a current contract.
- The migration deterministic E2E removes release-identity helpers and keeps
  temporary bundle creation, inspection, trace placement, and source-tree
  isolation assertions. It does not become evidence that optional human history
  is a runtime authority.

## Constitutional Review

### Semantic Precision

The relevant reader-facing projection changes from “one document that both
names a current release and tells me what to do” to two precise, bounded views:

| Reader | Bounded question | Required distinction | Normal stop |
| --- | --- | --- | --- |
| Agent entering a selected Harness | What is my next legal route? | current operational instruction versus historical commentary | `RUN.md` Section 0 and the existing downstream route |
| Maintainer reviewing history | What concise past context is available? | history versus release/runtime/compatibility authority | optional root changelog, Git, or governed archive |

No new state, status, command, runtime view, or semantic fact family is
introduced. The removed banner was a duplicate projection rather than a useful
new semantic level.

### Simple Reliable Control

The shortest legal loop is:

```text
selected RUN.md -> Section 0 -> existing Section 2 route
```

Historical context is available only when a reader deliberately opens its
historical owner. Removing the changelog -> proposal -> banner synchronization
removes control branches and tests; it does not replace them with a check,
state, retry, fallback, or recovery path.

### Helper-Oriented Responsibility

The user already made the only new semantic decision: retain optional human
history but retire the internal release choreography. The Agent performs the
authorized mechanical documentation/spec/test edits after C2b satisfies the
precondition. The Engine gets no new version verdict, execution permission, or
history interpretation responsibility. Existing Engine authority over selected
bundle facts remains unchanged.

## Risks / Trade-offs

- [Risk] A test or document outside the initial list parses `v0.x` as a current
  contract. -> Before target edits, run a focused active-source scan; add each
  current-positive consumer as an ordinary task or stop and revise scope rather
  than leaving it stale.
- [Risk] C2c starts before C2b and creates contradictory accepted contracts. ->
  Make C2b governed archive a checked pre-edit task; do not edit target code or
  specs while that task is open.
- [Risk] Removing the banner inadvertently changes shortcut-routing prose. ->
  Move no existing Section 0/1/2 text; assert title -> Section 0 -> trigger
  order and retain all current routing assertions.
- [Risk] Optional history becomes an unstructured dumping ground. -> Retain the
  concise-history requirement but make updates optional and non-authoritative;
  detailed design, requirement, and verification history remains in governed
  change artifacts.
- [Risk] Existing historical `v0.x` headings look like live releases. -> Add a
  concise root note that scopes them as retained internal history; do not rewrite
  individual historical entries or fabricate tags.
- [Risk] C2b and C2c edits are both visible relative to `HEAD`, so a closeout
  reviewer could attribute C2b deletions to C2c or overlook an unrelated file.
  -> Before closeout, classify the changed-file set against the C2b archive task
  record and C2c task owner matrix; stop on any unclassified file.

## Migration Plan

1. Keep this proposal ready, but do not enter C2c Apply until C2b has separately
   been approved, applied, and governed-archived with its old-frontmatter
   preservation evidence.
2. Run C2c's feedback review and pre-edit governance checks, then confirm no
   current-positive reader outside the recorded owner matrix remains.
3. Atomically update the root history note, OpenSpec configuration, `RUN.md`,
   the two accepted capabilities, requirement registry descriptions, and their
   focused tests.
4. Verify the current entry route, catalog/static-vocabulary projection, and
   canonical temporary bundle behavior. Before closeout, classify the shared
   worktree diff so C2b-only deletions, deliberate C2b/C2c overlaps, C2c files,
   and unrelated work are distinct; then ensure C2c did not reopen
   `framework_version`, template, schema, or historic-entry ownership.
5. Sync the delta specs, archive through the governed finalizer, and update the
   progressive plan/card with the actual evidence.

Rollback restores the prior governance/entry projection atomically. It needs no
bundle migration because C2c creates and mutates no selected-run-bundle state.
