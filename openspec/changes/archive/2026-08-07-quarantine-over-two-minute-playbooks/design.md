## Context

See `proposal.md` for the immediate Case 224/225 motivation. `collectRunnablePlaybooks()` currently walks every top-level `exp_*` directory, so placing unregistered `case-*.md` files in the requested `exp_extrem_slow/` directory would otherwise make every active manifest fail corpus-drift validation.

## Goals / Non-Goals

**Goals:**

- Make the requested directory an explicit, hard non-runnable quarantine boundary.
- Preserve the active manifest as the only normal selection authority while retaining the slow playbooks for later refactoring.
- Make the quarantine visible in filenames, the manifest note, both Agent instructions, and the experiment README.

**Non-Goals:**

- Do not scan historical reports, build a duration classifier, add a fourth active cost tier, or automatically move cases.
- Do not alter Agent Flow, native completion, timeout, budget, health, run-profile, or case content semantics.
- Do not run Case 224, Case 225, or any other native Agent experiment.

## Decisions

### One fixed excluded directory, not a selector-level denylist

Add a single named quarantine root to the shared manifest-contract reader. Corpus discovery skips that root, and manifest parsing rejects rows under it. This gives Headless, Interactive, exact selectors, `--all`, and profiles the same answer without separate filter logic.

Alternative considered: leave the files under `exp_extrem_slow/` but only remove table rows. Rejected because existing drift validation would then block all unrelated Autorun work. Keeping rows and relying on prose was also rejected because selectors could still launch them.

### Rename quarantined assets to `extreme-slow`

Move Case 224 and Case 225 to `exp_extrem_slow/` and replace the filename cost label with `extreme-slow`. The original runner identifiers inside their historical Markdown stay untouched; the quarantine filename and frontmatter identity make the current status visible. Any future activation must be a deliberate refactor/reclassification back to a supported runnable filename.

### Preserve open Case 225 lifecycle work without falsifying it

The three active Case 225 changes retain their existing historical evidence and pending native tasks. Their old asset references are not reinterpreted as a successful quarantine verification or as permission to run a quarantined asset. Reactivation/refactor is a separate future lifecycle decision.

## Risks / Trade-offs

- [A maintainer later adds an excluded path to the manifest] -> deterministic manifest validation rejects it before launch.
- [Quarantined artifacts appear like runnable tests] -> filename, in-file banner, manifest note, both injected instructions, and README state the hard boundary.
- [Old Case 225 planning artifacts retain the prior path] -> preserve them as historical/pending evidence; do not rewrite their incomplete native claims as passed.

## Migration Plan

1. Add the exclusion/rejection contract and static regression coverage.
2. Move and rename Case 224/225, add their quarantine banners, and remove their active manifest rows.
3. Add the manifest, Headless, Interactive, and README notices.
4. Run only static manifest/playbook/test validation. Rollback is a normal source revert restoring the original paths and active rows; it never requires an Agent run.
