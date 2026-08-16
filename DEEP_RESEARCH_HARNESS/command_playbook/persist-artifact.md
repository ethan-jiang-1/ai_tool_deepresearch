# Persist Artifact Safely

Use this playbook when an Agent has finished a content-bearing staging file for `reference/`, `artifacts/`, producer-owned `_cache/`, or a Final report and needs a crash-safe commit into the selected bundle.

This is an Agent-run ordinary command path. Persistence verdicts assign the next mechanical owner but do not create interaction authority. Under a loaded `stop: no` phase, do not initiate a question, acknowledgement, approval, status, or wait; continue Agent-owned inspect/retry/sweep work, and preserve a genuinely non-delegable host boundary for the current lifecycle owner.

## Persist

Keep the completed staging source until the command returns `verdict: committed`.

For a new non-Final-Markdown target:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist \
  --bundle <bundle> \
  --source <completed-staging-file> \
  --target <reference|artifacts|_cache/path> \
  --expect-absent
```

For replacement, calculate the current target SHA-256 and use compare-and-swap:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist \
  --bundle <bundle> \
  --source <completed-staging-file> \
  --target <reference|artifacts|_cache/path> \
  --expect-sha256 <current-target-sha256>
```

There is no force overwrite. A blocked compare-and-swap means the Agent must inspect the current target and decide whether to prepare a new staging file or retry with the newly observed digest.

## Final Markdown Reports

For a primary Final Markdown report, first confirm that Final entry was admitted
and the exact Readiness status synchronization completed. Write the complete
report to retained staging with exactly one bounded Evidence Map declaration
table:

```md
## Evidence Map

| Finding ID | Declared Key Finding | Submitted Backing |
| --- | --- | --- |
| F-001 | Concise declared conclusion | [Submitted evidence](../artifacts/wave1/topic/evidence-summary.md) |
```

Every map row needs non-empty values in all three columns. `Submitted Backing` may link only to an exact submitted `source_yaml` or `evidence_summary` output, or to an existing `reference/` projection whose current authority classification has submitted backing. The map is a reader declaration, not a second ledger or a semantic claim-quality check.

Use the one admitted primary Final publisher. It owns primary target and global
version allocation; callers must not supply a target, version, CAS, overwrite,
or force selector:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs publish-final-report \
  --bundle <bundle> \
  --source <completed-final-markdown-staging-file> \
  [--feature <safe_snake_case>]
```

An empty admitted primary inventory commits `final/final.md`; every later
publication uses the next immutable global version, with an optional descriptive
feature. Read its top-level `check`, `inspect`, and `advice`. On a backing
rejection, retain staging, repair the named map row or legal backing surface,
and rerun `publish-final-report`. A committed result establishes mechanical
declaration/path/backing/durability facts only; it does not decide legal Final
entry, report quality, feedback type, or user satisfaction. Generic `persist`
intentionally rejects reserved `final/final*.md` targets.

For a safe **non-primary** Markdown target under `final/` (not the canonical
primary series), use `persist-final-report`, which admits the Evidence Map
backing before the durability commit and uses the same compare-and-swap
discipline:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist-final-report \
  --bundle <bundle> \
  --source <completed-final-markdown-staging-file> \
  --target <final/non-primary-report.md> \
  (--expect-absent | --expect-sha256 <current-target-sha256>)
```

`blocked` (exit `1`) means backing admission or CAS failed: keep the retained
staging, repair the named map row/backing surface or re-observe the target
digest, then rerun the same `persist-final-report`; never retry generic
`persist` for a `final/` Markdown target.

## Recover After A Crash

First stop concurrent persist activity for the selected bundle. Then run the single quiescent sweep:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs sweep --bundle <bundle>
```

- `finalized`: a valid prepared payload was committed and its workspace removed.
- `cleaned`: the target already contained the prepared bytes and the stale workspace was removed.
- `blocked`: inspect the one reported root fact and follow its `recommended_action`.

For a blocked prepared primary workspace, `sweep` preserves the exact
publication binding without reallocating. Repair the named retained
staging/backing boundary, remove only the reported workspace without following
symlinks when the Engine identifies that repair, then rerun
`publish-final-report`; do not retry generic `persist` for that primary report.

For an incomplete or invalid workspace, the nearest legal repair is Agent-owned: inspect the reported `_diagnostics/artifact-persistence/<operation-id>/`, remove only that diagnostic workspace without following symlinks, retry persist from the retained staging source, then rerun sweep. For a target conflict, resolve which content should win before removing/retrying the workspace. There is no automatic discard, quarantine, repair-all, or unknown-temp promotion.

Never rename an arbitrary `.tmp` file into a canonical target. Only `operation.json` plus its bound payload under the Engine-owned workspace is recovery authority.

## Authority Boundary

Persistence proves exact file bytes were committed durably. It does not create evidence provenance, a submitted work-unit row, queue completion, gate pass, phase handoff, lifecycle progress, topic identity, or Final delivery authority. Delegated outputs and cache trails still pass through `operate-work-unit submit`; Phase-owned projections still require submitted backing; Final still requires legal Final entry.

The persistence command and playbook return to the calling Phase Agent. They do not message the user, wait for acknowledgement, or create a checkpoint, permission, route, mutation/reentry authority, or lifecycle placement.
