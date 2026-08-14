# Current-Contract Cleanup Policy And Protocol

> Role: durable program policy and execution rules.  
> Daily progress belongs in [`../current-contract-signal-cleanup.md`](../current-contract-signal-cleanup.md).

## Goal

Harness, accepted main specs, and root context should describe one current executable system.
Old formats, entries, schemas, aliases, migrations, and fallback readers are not retained merely
for unknown consumers. Historical artifacts may remain inspectable by people without remaining
valid Engine input.

## Authority Boundary

This backlog plan does not authorize target edits and is not a behavior Source of Record.
Project Charter, accepted OpenSpec specs, executable contracts, and the selected current run bundle
retain their normal authority.

Every execution batch follows:

`propose -> explore/refine -> apply -> sync -> archive -> commit -> dashboard update`

Before explicit Apply authorization, `DEEP_RESEARCH_HARNESS/`, `tests/`, accepted main specs, and
other target code remain read-only.

## Decision Cards Versus Changes

Decision cards are intentionally fine-grained so each compatibility consequence is visible.
They are not required to become one OpenSpec change each.

Merge cards only when all four conditions hold:

1. They resolve through the same or tightly coupled Source of Record.
2. They select the same compatibility policy.
3. Their consumers and verification assets substantially overlap.
4. They share a rollback boundary and do not create a dangerous intermediate state.

Split cards when mutation safety, external behavior, recovery consequences, or rollback boundaries
differ. File location, capability path, or the presence of `legacy`/`v1` in a name is not enough to
force either merging or splitting.

## Current-Only Decision Test

For every candidate reader or writer, establish:

- whether a current writer still emits the shape;
- whether current Agent guidance promises it;
- whether a current production call graph consumes it;
- whether evidence exists beyond legacy fixtures and compatibility tests;
- whether the current format completes the same user goal; and
- whether the branch is compatibility or required current recovery/provenance/supersession logic.

Default disposition: when current writer, guidance, and production need are absent and only legacy
tests keep the branch alive, retire it. A request to retain compatibility must name a reproducible
current consumer and contract owner.

## Prohibited Shortcuts

- Do not keep a `deprecated but accepted` positive path.
- Do not add migration, auto-upgrade, version routers, or compatibility adapters to prolong old input.
- Do not rename legacy fixtures and keep them as positive current behavior tests.
- Do not delete current schema discriminators merely because their names contain `v1` or `version`.
- Do not remove current recovery, rerun, late-submit, supersession, or fail-closed safety behavior.
- Do not edit archived OpenSpec history to make current-surface scans look cleaner.
- Do not silently rewrite immutable historical evidence into the current shape.

## Per-Change Checklist

### Propose

- [ ] Confirm no conflicting active OpenSpec change will enter target edits.
- [ ] Read Project Charter, root `CONTEXT.md`, and directly affected accepted specs.
- [ ] Record the one current contract, retired success behavior, protected behavior, and exclusions.
- [ ] Close producer/reader/caller/guidance/spec/test inventory for every included decision card.
- [ ] Create proposal, complete delta specs, design, tasks, semantic closure, and verification plan.
- [ ] Run strict OpenSpec and planning-governance validation.
- [ ] Obtain user review and explicit Apply authorization.

### Apply

- [ ] Read required current operation guidance and complete plan review before first target edit.
- [ ] Remove the old implementation branch, positive legacy tests/fixtures, guidance, and accepted contract in one slice.
- [ ] Preserve or add current-path and stable rejection-boundary tests.
- [ ] Run selected verification, workflow-package validation, and governance checks.
- [ ] Scan current surfaces for remaining positive legacy guidance.
- [ ] Sync delta requirements into accepted main specs.

### Archive

- [ ] Review the actual scoped diff and close every ordinary feedback task.
- [ ] Recompare delta requirements with accepted main specs.
- [ ] Pass archive-mode requirement and project-spec checks.
- [ ] Use the governed finalizer as the only archive transition.
- [ ] Commit implementation/archive artifacts.
- [ ] Update the dashboard, execution ledger, affected decision cards, and residual-risk note.

## Baseline Verification

Every applicable change includes these checks plus its selected behavior tests:

```bash
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
```

Archive uses the selected change name for archive-mode requirement governance and the governed
finalizer required by current operation guidance.

## Program Close Conditions

Close evidence: all 19 dashboard items are governed-archived; the execution ledger records their scoped verification and the C8 finalizer completed on 2026-08-15.

- [x] Dashboard items 01-19 are archived or explicitly closed as unnecessary with evidence.
- [x] Coverage ledger remains complete with zero unclassified candidates.
- [x] Each audited artifact family exposes one current positive contract.
- [x] Current docs/specs/tests do not teach old input as a success path.
- [x] Historical artifacts remain manually readable but are not silently executed or migrated.
- [x] Current recovery, rerun, provenance, supersession, and transaction safety remain verified.
- [x] Main specs and capability catalog describe current observable behavior rather than change history.
- [x] `CONTEXT.md` and routing instructions pass their final signal review.
- [x] Final package, spec, requirement, and selected behavioral checks pass.
