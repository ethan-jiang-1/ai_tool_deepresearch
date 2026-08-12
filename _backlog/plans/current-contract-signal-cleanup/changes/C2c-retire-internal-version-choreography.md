# C2c: Retire Internal Version Choreography

> Candidate change: `retire-internal-version-choreography`
>
> Status: decision ready; no proposal created
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
- The only runtime use of this choreography is C2b's writer-only stamp.
- C2a already removed the duplicate release dump from `RUN.md`; the remaining
  banner is the choreography's reader-facing projection.

## Choices

| Choice | Future rule | Signal / cost | Risk |
|---|---|---|---|
| A. Retain compact changelog only | Keep root human changelog but remove forced version bump and `RUN.md` banner sync | Preserves a small curated history; ends false release coupling | L3: define update ownership and remove stale banner contract coherently |
| B. Retire current changelog contract | Stop requiring root changelog updates; use governed OpenSpec archives and Git history for change history | Lowest duplicated narrative surface | L3: readers lose one quick human summary; must not delete historical file or pretend archives are release notes |

The rejected non-choice is continuing the current three-way choreography. It
creates recurring proposal/test/banner churn without a matching distribution or
runtime compatibility contract.

## Recommendation

Choose **A**: retain a concise root `CHANGELOG.md` as optional human-curated
history, but remove the version-number, proposal-time bump, and `RUN.md`
banner synchronization requirements. It reduces false precision while keeping
a quick conventional history surface. C2b then removes the last runtime read of
this file.

## Effect and side effects

- Future behavior changes no longer need a manufactured `v0.x` decision or
  banner/test churn.
- `RUN.md` becomes a pure entry document rather than a release projection.
- Existing historical headings remain as history; no rewrite, deletion, or
  Git-tag fabrication occurs.
- Without C2b, an instantiator could still derive a stale stamp from the last
  historical heading. The proposal must either include the ordering boundary
  or ensure C2b is applied first; it must not leave that path ambiguous.

## Protected semantics

- `topic_registry_version`, receipt versions, queue versions, and other schema
  discriminators remain current parser contracts.
- A human changelog may remain useful, but it must not regain runtime or
  compatibility-selection authority.
- Archived OpenSpec changes and Git history are historical records, not target
  code to clean up for appearance.

## Proposal gate

- [x] Version/changelog/banner coercion mapped in accepted spec and config.
- [x] Internal heading/package/tag mismatch verified.
- [x] C2b dependency identified.
- [ ] User selects A or B.
- [ ] Future source of record and exact C2b ordering are written into a bounded proposal before target edits.

## Expected verification

```bash
node --test tests/engine/version-management.test.mjs \
  tests/e2e/deep-research-harness-migration.test.mjs \
  tests/integration/md/dpt-research-entry-routing-contract.test.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
```
