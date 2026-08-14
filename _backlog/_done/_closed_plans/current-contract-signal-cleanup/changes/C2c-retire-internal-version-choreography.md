# C2c: Retire Internal Version Choreography

> Candidate change: `retire-internal-version-choreography`
>
> Status: governed-archived as `2026-08-13-retire-internal-version-choreography`; C2b archive precondition was satisfied before target edits
>
> Risk: L3

## One question

Should every Harness behavior change still be forced to choose an internal
`v0.x` number, prepend root `CHANGELOG.md`, and synchronize the `RUN.md`
banner, even though this sequence is neither a package version nor a Git
release line?

## Verified boundary

- Root `CHANGELOG.md` has 89 internal version headings, currently `v0.89`.
- `package.json` is private at `0.0.0`.
- Git tags are only `v0.0.1`, `v0.1.1`, and `v0.11`; they do not track the
  internal heading sequence.
- Accepted `governance/version-management` and `openspec/config.yaml` force
  every Harness behavior change to decide a version during proposal and update
  both root changelog and `RUN.md` during Apply.
- The former runtime use of this choreography was C2b's writer-only stamp; C2b has now retired it through governed archive.
- C2a already removed the duplicate release dump from `RUN.md`; the remaining
  banner is the choreography's reader-facing projection.

## Choices

| Choice | Future rule | Signal / cost | Risk |
|---|---|---|---|
| A. Retain compact changelog only | Keep root human changelog but remove forced version bump and `RUN.md` banner sync | **Selected 2026-08-13.** Preserves a small curated history; ends false release coupling | L3 addressed: C2b archive removed the writer before C2c target edits |
| B. Retire current changelog contract | Stop requiring root changelog updates; use governed OpenSpec archives and Git history for change history | Lowest duplicated narrative surface | L3: readers lose one quick human summary; must not delete historical file or pretend archives are release notes |

The rejected non-choice is continuing the current three-way choreography. It
creates recurring proposal/test/banner churn without a matching distribution or
runtime compatibility contract.

## Recommendation

**Selected A**: retain a concise root `CHANGELOG.md` as optional human-curated
history, but remove the version-number, proposal-time bump, and `RUN.md`
banner synchronization requirements. It reduces false precision while keeping
a quick conventional history surface. C2b had already removed the last runtime
read of this file before C2c target edits.

## Effect and side effects

- Future behavior changes no longer need a manufactured `v0.x` decision or
  banner/test churn.
- `RUN.md` becomes a pure entry document rather than a release projection.
- Existing historical headings remain as history; no rewrite, deletion, or
  Git-tag fabrication occurs.
- The stale-stamp risk was resolved by requiring C2b's governed archive before
  C2c target edits; C2c did not reopen the stamp, writer, schema, or old-bundle
  boundary.

## Protected semantics

- `topic_registry_version`, receipt versions, queue versions, and other schema
  discriminators remain current parser contracts.
- A human changelog may remain useful, but it must not regain runtime or
  compatibility-selection authority.
- Archived OpenSpec changes and Git history are historical records, not target
  code to clean up for appearance.

## Completion evidence

- [x] Version/changelog/banner coercion mapped in accepted spec and config.
- [x] Internal heading/package/tag mismatch verified.
- [x] C2b dependency identified.
- [x] User selected A on 2026-08-13.
- [x] Future source of record and exact C2b ordering are written into the bounded `retire-internal-version-choreography` proposal, design, delta specs, and tasks; strict planning validation passed.
- [x] C2b independently applied, synced, and governed-archived as `2026-08-13-retire-framework-version-stamp`; C2c then completed its own Apply, delta/main sync, closeout review, and governed archive as `2026-08-13-retire-internal-version-choreography`.

## Verification record

The selected unit, integration, and deterministic-E2E suites passed 15 tests
across 4 suites with no fail, cancelled, skipped, or todo verdict. Workflow
package validation, strict OpenSpec validation, capability discovery,
verification routing, semantic closure, archive-mode requirements/spec checks,
and the governed finalizer all passed.
