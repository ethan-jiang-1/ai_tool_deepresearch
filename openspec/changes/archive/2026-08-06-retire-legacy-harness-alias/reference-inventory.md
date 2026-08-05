# Legacy Harness Alias Reference Inventory

## Purpose

This inventory records the live tracked-worktree references that must be
removed for the breaking retirement. It is change-scoped planning and
closeout evidence, not runtime authority. It deliberately excludes the active
change itself so this record can name the retired coordinate without becoming a
live compatibility surface.

## Scan Boundary

The inventory and closeout scan cover the tracked working tree, excluding:

- this active change: `openspec/changes/retire-legacy-harness-alias/`;
- archived OpenSpec records: `openspec/changes/archive/`;
- `_backlog/`, `_temp/`, `_old_topics/`, and `_original_*/` historical or
  restricted material;
- `.exp-bundles/`, unselected `dpt_rb_*` / `dpt_disp_*` runtime data,
  `node_modules/`, and `.env/`.

Those exclusions are neither read nor claimed clean by this change. Git
history is also outside the scan.

## Baseline Matches

Baseline command, run before target edits on 2026-08-06, returned the matches
below:

```bash
git grep -n -F 'DPT_FRAMEWORK' -- . ':(exclude)openspec/changes/retire-legacy-harness-alias/**' ':(exclude)openspec/changes/archive/**' ':(exclude)_backlog/**' ':(exclude)_temp/**' ':(exclude)_old_topics/**' ':(exclude)_original_*/**' ':(exclude).exp-bundles/**' ':(exclude)node_modules/**' ':(exclude).env/**' ':(exclude)dpt_rb_*/**' ':(exclude)dpt_disp_*/**' ':(exclude)**/dpt_rb_*/**' ':(exclude)**/dpt_disp_*/**'
```

| Path and baseline lines | Consumer | Apply action |
| --- | --- | --- |
| `CHANGELOG.md:6,255,332,388,417,439` | Current human release history | Rewrite the affected historical descriptions in neutral canonical language; add concise `v0.74` retirement entry. |
| `CONTEXT.md:37,44` | Project glossary | Remove the retired coordinate from Avoid guidance and delete its glossary entry. |
| `docs/adr/0002-name-the-reusable-surface-deep-research-harness.md:10,13,23,28` | Current durable naming rationale | Revise to state only canonical terminology; add ADR 0003 for the breaking decision without the retired token. |
| `openspec/specs/agent-context-routing/spec.md:126` | Accepted routing contract | Sync the ACR delta so current guidance names only the canonical root. |
| `openspec/specs/cmd-bundle-instantiation/spec.md:215` | Accepted creator contract | Sync the CMI delta so creator output has no alternate source coordinate. |
| `openspec/specs/experiment-agent-autorun/spec.md:33` | Accepted Autorun contract | Sync the EXA delta so normal Autorun has one source coordinate. |
| `openspec/specs/framework-engine/spec.md:18` | Accepted Engine location contract | Sync the FRE delta for canonical production Engine/CLI location. |
| `openspec/specs/workflow-directory-contract/spec.md:19,36,365` | Accepted directory contract | Sync the WDC delta for one production/reusable Harness root and historical-coordinate stop boundary. |
| `DEEP_RESEARCH_HARNESS/RUN.md:13` | Current Harness entry/release guide | Remove the alias language while updating the release banner to `v0.74`. |
| `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs:91` | Inspector repo-root diagnostic fallback | Remove the alternate root probe. |
| `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs:129` | Creator comment | Remove the legacy-invocation explanation; preserve physical canonical resolution. |
| `tests/integration/deep-research-harness-entry-contract.test.mjs:28,63` | Canonical-root/entry integration regression | Replace alias success assertions with root topology and continuation-stop assertions. |
| `tests/integration/cli/instantiate-run-bundle.test.mjs:12,231` | Creator integration regression | Remove the legacy command success case and retired-token assertion. |
| `tests/integration/md/agent-context-routing-contract.test.mjs:142` | Glossary/routing integration regression | Remove the legacy glossary assertion; assert all three current ADR links and records. |
| `tests/e2e/deep-research-harness-migration.test.mjs:20,111` | Deterministic migration chain | Remove dual-path execution and retired-token assertion; exercise canonical path and release alignment only. |

The root-level `DPT_FRAMEWORK` symlink is a separate topology finding. It is a
tracked symlink to `DEEP_RESEARCH_HARNESS` and must be deleted in the same
apply as its consumers.

## Test Fixture Boundary

`tests/fixtures/DEEP_RESEARCH_HARNESS/` is a real fixture directory owned by
the accepted `test-fixtures` contract. Its selected child dependencies are
test plumbing, not reusable Harness assets, production imports, or supported
Agent/operator command entries. It is therefore retained, while the WDC/FRE
deltas and regression coverage make that distinction explicit.

## Post-Apply Done Condition

The baseline command above must return exit 1 with no matches after target
edits. The filesystem topology must separately satisfy both commands:

```bash
test ! -e DPT_FRAMEWORK
test ! -L DPT_FRAMEWORK
```

At closeout, append the exact command exits and no-match result to this file.

## Post-Apply Residual Result

Completed 2026-08-06 against the tracked-worktree scope and exclusions stated
above. Excluded historical records and unselected runtime data were not read
or claimed clean.

```bash
git grep -n -F 'DPT_FRAMEWORK' -- . ':(exclude)openspec/changes/retire-legacy-harness-alias/**' ':(exclude)openspec/changes/archive/**' ':(exclude)_backlog/**' ':(exclude)_temp/**' ':(exclude)_old_topics/**' ':(exclude)_original_*/**' ':(exclude).exp-bundles/**' ':(exclude)node_modules/**' ':(exclude).env/**' ':(exclude)dpt_rb_*/**' ':(exclude)dpt_disp_*/**' ':(exclude)**/dpt_rb_*/**' ':(exclude)**/dpt_disp_*/**'
# exit 1; no matches

test ! -e DPT_FRAMEWORK
# exit 0

test ! -L DPT_FRAMEWORK
# exit 0
```

The newly added untracked ADR was also checked directly with
`rg -n -F 'DPT_FRAMEWORK' docs/adr/0003-retire-legacy-harness-source-alias.md`:
exit 1 with no matches.
