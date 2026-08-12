# C4b: Retire Legacy Plan Migration

> Candidate change: `retire-legacy-plan-migration`
>
> Status: decision ready; no proposal created
>
> Risk: L4

## One question

May the current Engine stop inspecting and migrating a legacy mutable
`rb_plan.md`, so old bundles are human-readable only rather than re-enterable
by the current rerun system?

## Verified boundary

`PlanSchema` accepts both a canonical `topic_registry_version: "2"` plan and
`LegacyPlanSchema`. `canonical-topic-state` detects the latter during inspect
and, inside a sanctioned rerun, accepts an explicit `migrate_legacy` input.
`check-reentry` then supplies migration guidance for the old plan.

This is the actual historical compatibility branch. It is separate from
`previous_layouts[]`:

```text
LegacyPlanSchema -> inspect legacy -> sanctioned rerun migrate_legacy

canonical plan -> current mutate_layout -> previous_layouts[]
```

The lower path is current behavior. Rename/reorder/renumber/safe-remove write
the prior layouts; UID-bound references, provenance, receipt checks, and safe
rerun operations use that lineage. Removing it would damage the current
contract, not retire history.

## Proposed current-only result

- Remove the legacy plan union and `migrate_legacy` operation.
- A legacy mutable plan receives one explicit unsupported-current-contract
  result from inspect/reentry/apply; it is not upgraded or repaired by current
  Engine code.
- Preserve canonical plan schema, `topic_uid`, and `previous_layouts[]` with
  all current rerun/provenance semantics.
- Keep historic files manually readable; do not mass-rewrite immutable
  evidence, ledgers, receipts, or references.

## Effect and side effects

The significant effect is intentional: an old bundle that previously could be
migrated during a rerun can no longer re-enter the current Engine. This reduces
the active contract from two plan families to one, but can end a recovery path
for an in-progress historical run.

That is why this is L4. It is not safe to infer permission merely from the
project's general current-only principle; the user must decide whether this
loss of re-entry is acceptable.

## Policy decision needed

| Choice | Result |
|---|---|
| A. Retire current Engine migration (recommended under the stated current-only policy) | Legacy plans are manual-history only; current Engine rejects them consistently |
| B. Retain migration | Old plans remain a live re-entry contract; this cleanup does not remove the branch |

## Protected current behavior

- `previous_layouts[]` and all UID/current-layout resolution.
- Canonical rerun, added-topic, safe-remove, provenance, receipt, and recovery
  semantics.
- C5a's separate reference metadata policy.

## Proposal gate

- [x] Legacy migration path mapped.
- [x] Current layout lineage separated from legacy plan compatibility.
- [ ] User chooses A or B.
- [ ] If A, characterization covers canonical rerun, added-topic, existing evidence, and explicit legacy rejection.
- [ ] Historic artifact policy is written without widening scope into C5a/C6.

## Expected verification

```bash
node --test tests/schema/contracts/plan.test.mjs \
  tests/engine/helpers/canonical-topic-state.test.mjs \
  tests/integration/cli/operate-topic-state-projection.test.mjs \
  tests/integration/cli/rerun-added-topic-wave0.test.mjs \
  tests/e2e/rerun-round-continuity.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
