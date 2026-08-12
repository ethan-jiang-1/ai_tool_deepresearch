## Why

[`DEEP_RESEARCH_HARNESS/RUN.md`](../../../DEEP_RESEARCH_HARNESS/RUN.md) is
299 lines long, but its first execution instruction, `## 0. 禁用内置捷径（最高优先）`,
does not appear until line 256. The preceding repeated `Current Release` heading
and accumulated release bullets duplicate history already retained by the
repo-root [`CHANGELOG.md`](../../../CHANGELOG.md). They make an Agent consume
internal history before it can learn the selected entry route.

This is the user-approved C2a slice from
[`_backlog/plans/current-contract-signal-cleanup/changes/C2-remove-internal-versioning-and-slim-entry.md`](../../../_backlog/plans/current-contract-signal-cleanup/changes/C2-remove-internal-versioning-and-slim-entry.md).
It intentionally does not decide the separate `framework_version` artifact or
release-governance questions.

## What Changes

- Keep the `RUN.md` title and its one current Harness version banner, but place
  Section 0 immediately after that banner and before the existing trigger-context
  blockquote, as the accepted entry contract already requires.
- Remove the duplicate `## Current Release: ...` heading and its accumulated
  release-history bullet dump from `RUN.md`. Preserve historical change records
  in the root `CHANGELOG.md`.
- Update only the static tests that currently make the duplicate heading or old
  release prose a positive `RUN.md` contract. Keep banner-to-changelog alignment,
  entry-routing ordering, and the existing bundle instantiation/inspection
  regression coverage.
- Do not change `CHANGELOG.md`, `framework_version`, bundle templates, schema
  version discriminators, bundle readers, runtime behavior, or legacy-bundle
  policy.

This is not a version bump. It restores the existing `bundle/run-entry`
ordering contract and removes an unrequired duplicate projection; it does not
change accepted Harness behavior. If plan review finds that a removed sentence
is the only current behavioral instruction for a supported path, Apply stops and
the change must be replanned with the appropriate behavior and version decision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `skip_specs: true` is set because no accepted requirement changes. The
existing `bundle/run-entry` requirement already requires the banner before
Section 0 and the trigger-context blockquote; the removed release dump is not
an accepted behavioral contract.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`, `DEEP_RESEARCH_HARNESS/RUN.md`, and `tests/integration/md/dpt-research-entry-routing-contract.test.mjs` | Verify-only | RUE-001/RUE-002 already require the banner, then Section 0, before trigger context. This change aligns the entry implementation and its static guard; it does not alter the instruction's meaning. |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md`, `CHANGELOG.md`, and `tests/engine/version-management.test.mjs` | Verify-only | VEM-003 owns the single banner-to-root-changelog relationship. The duplicate heading and release dump are not required; root history and the banner remain unchanged. |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md` and `tests/integration/md/artifact-persistence-contract.test.mjs` | Verify-only | ARP behavior is unchanged. Its static test currently reaches into unrelated release-history prose and will be narrowed back to persistence-owned assertions. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and existing focused test assets | Verify-only | The change needs a closed verification plan using existing unit, integration, and deterministic-E2E assets; it introduces no routing taxonomy. |
| `bundle/cmd-bundle-instantiation` | `openspec/specs/bundle/cmd-bundle-instantiation/spec.md`, `rb_plan.md.tmpl`, and `instantiate-run-bundle.mjs` | Excluded | The `framework_version` writer and old-artifact policy are the later C2b decision and are not touched. |
| `agent/agent-context-routing` | `CONTEXT.md`, root routing files, and the run-entry main spec | Excluded | Root/Harness routing wording is not changed; only the selected `RUN.md` ordering and stale local release projection are repaired. |

## Impact

Apply will touch the reusable entry document and four focused test assets:
`DEEP_RESEARCH_HARNESS/RUN.md`,
`tests/integration/md/dpt-research-entry-routing-contract.test.mjs`,
`tests/engine/version-management.test.mjs`,
`tests/e2e/deep-research-harness-migration.test.mjs`, and
`tests/integration/md/artifact-persistence-contract.test.mjs`.

The direct history Source of Record remains root `CHANGELOG.md`; the direct
current-entry Source of Record remains `RUN.md`. The shortest legal loop is to
present the existing selected-entry prohibition first, then retain the current
trigger and execution guidance. This removes a duplicate reader-facing
projection and unrelated static-test coupling without adding a state, command,
fallback, migration, parser, Gate, or user decision. The Agent performs the
bounded text/test maintenance; the Engine has no new verdict and all runtime
truth remains in the selected bundle.
