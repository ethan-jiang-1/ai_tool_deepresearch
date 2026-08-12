## Context

See [proposal.md](proposal.md) for motivation. `RUN.md` currently combines two
different reader questions in its first 255 lines:

1. What must the Agent do now after this entry path is selected?
2. What changed across the Harness's internal `v0.x` history?

The accepted `bundle/run-entry` contract answers the first question with a
single current version banner followed by Section 0, then the trigger-context
block. The root `CHANGELOG.md` is the direct Source of Record for the second
question under `governance/version-management`. The current duplicate `Current
Release` section collapses those roles and delays the route that is actually
needed at entry.

No runtime fact family is affected: `RUN.md` is an Agent-facing projection, not
a schema, bundle-state reader, resolver, or Engine verdict surface. The
change-local `semantic-closure.yaml` therefore records `not_applicable`.

## Goals / Non-Goals

**Goals:**

- Make the first executable entry instruction visible immediately after the
  required current version banner.
- Preserve all current instruction text from Section 0 onward and retain the
  root changelog as release history.
- Make each static test assert only its owning contract: entry order,
  banner/changelog agreement, or artifact persistence.

**Non-Goals:**

- Do not decide whether to remove `framework_version`, alter bundle
  frontmatter preservation, or handle old bundle stamps.
- Do not change `CHANGELOG.md`, bump `v0.89`, alter schema discriminators, or
  weaken version-banner/changelog alignment.
- Do not alter root or Harness routing surfaces, the shortcut prohibition's
  wording/meaning, commands, Gate behavior, test-class taxonomy, or real-Agent
  execution claims.

## Decisions

1. **Keep exactly one version indicator in the entry document.**

   Retain the accepted banner `> **DEEP_RESEARCH_HARNESS v<major>.<minor>**`
   directly under the title. Delete the `## Current Release` heading and all
   release bullets that follow it. The alternative of retaining a short
   duplicate heading still leaves two current-version assertions that must be
   synchronized and does not solve the projection duplication.

2. **Restore the accepted order without rewriting entry semantics.**

   Put the existing Section 0 text directly after the banner, then preserve the
   trigger-context blockquote and Sections 1 through 3 in their existing order.
   This follows RUE-001/RUE-002's existing ordering rule. Rewriting or
   shortening Section 0 is excluded because it would alter the actual Agent
   instruction rather than only remove history.

3. **Constrain static tests to the contract they own.**

   - The run-entry integration test gains the direct ordering/absence check:
     banner -> Section 0 -> trigger context, with no `Current Release` heading.
   - The version-management unit test and migration E2E derive the current
     version from the one banner and root changelog; neither requires a second
     heading or a release-detail section.
   - The artifact-persistence integration test stops asserting specific old
     `RUN.md` release prose. It continues asserting its own Final/persistence
     facts and, if it needs the version relationship at all, uses the one banner
     only.

   Keeping the old selectors would make unrelated tests guard stale text. A new
   test file is unnecessary: the affected ownership boundaries already have
   focused test assets.

4. **Treat the change as a no-version-bump alignment repair.**

   The existing accepted contract already states the desired order and requires
   only the single banner-to-changelog relation. Therefore no new changelog
   entry or banner value is created. This decision does not relax VEM-002's
   rule for a future behavior change: a later behavior-changing C2b/C2c change
   must make its own version decision.

### Constitutional Review

- **Semantic precision:** the entry reader has one bounded question, “what is
  my next legal action after this route is selected?” The normal stop is the
  existing Section 0/Section 2 route; release archaeology moves to the root
  changelog.
- **Simple reliable control:** `RUN.md` has one current banner and one current
  route, while `CHANGELOG.md` retains the historical record. Removing the
  duplicate release projection eliminates synchronization burden without adding
  a check, state, retry, fallback, or migration.
- **Helper-oriented responsibility:** the user made the scope decision; the
  Agent performs the bounded document and static-test edits. No Engine verdict
  is added, and the Engine continues to own all runtime checks unchanged.

## Risks / Trade-offs

- [Risk] A removed bullet may be the only current instruction for a supported
  path. -> Before target edits, compare each retained Section 0-3 instruction
  and all static references. If such an instruction is found only in the dump,
  record it as an ordinary feedback task, stop this narrow Apply, and replan.
- [Risk] Moving Section 0 can accidentally change its relationship to the
  trigger-context explanation. -> Assert the exact ordering in the run-entry
  integration test and preserve both blocks verbatim.
- [Risk] Tests could lose real banner/changelog coverage while removing duplicate
  heading selectors. -> Keep one explicit banner-to-root-changelog assertion in
  version-management and the migration E2E.
- [Risk] The release dump contains useful historical discoverability. -> Leave
  `CHANGELOG.md` unchanged; this change only removes its duplicated entry copy.

## Migration Plan

1. Run the change-local plan checks and complete the durable plan review before
   any target edit.
2. Move the existing Section 0 block to directly follow the banner and remove
   only the duplicate release heading/dump; do not edit the retained block's
   wording.
3. Update the five focused static/E2E assertions to reflect one banner and the
   restored order.
4. Run focused tests, workflow-package validation, and governed checks. Review
   the diff for any unintended changes to `CHANGELOG.md`, bundle templates, or
   runtime code.
5. Rollback is a clean reversion of the target-document/test edits. There is no
   bundle migration, persisted state change, or compatibility conversion.
