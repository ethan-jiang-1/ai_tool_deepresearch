# C6a: Decide the Marked Assignment v1/v2 Reader Policy

> Merged candidate change: `retire-legacy-work-unit-attempt-inputs` (C6a+C6b+C6c)
>
> Planned execution batch: dashboard item 16 `C6a+C6b+C6c`, conditional on C6b/C6c policy alignment
>
> Status: policy A governed-archived as dashboard item 16 (`7a96ca254`)
>
> Risk: L4

## One question

May the current Engine stop accepting an attempt explicitly marked
`work-unit.assignment.v1` or `work-unit.assignment.v2`, while preserving the
current v3 assignment contract for every new claim?

This card owns explicit assignment markers only. A record with no assignment or
submission marker belongs to C6b; absence of actor provenance belongs to C6c;
transaction journals belong to C6d.

## Verified boundary

- The normal current claim path writes `work-unit.assignment.v3` on the index,
  manifest, and beacon. No current writer emits assignment v1 or v2.
- `WorkUnitAssignmentContractVersionSchema` still permits v1, v2, and v3, and
  the manifest/index/beacon validator dispatches from the recorded marker.
- For a marked v1 attempt, the assignment resolver uses the output contract
  bound in the historical manifest so a later current default cannot narrow
  that attempt's immutable obligation. The accepted `subagent-node-contract`
  spec also says marked v1/v2 attempts retain their recorded
  version-selected interpretation rather than acquire v3 supplementary
  behavior.
- Focused tests demonstrate the consequence: a v1 attempt can submit a
  historically valid rich reference output that a current v3 Wave0 attempt
  rejects. Thus deleting this branch changes submitted-attempt validation, not
  only schema vocabulary.

## Possible policies

| Choice | Current Engine treatment | Main benefit | Main consequence |
|---|---|---|---|
| A. Reject explicit v1/v2 | One owned unsupported-current-contract result before assignment/output interpretation | One current assignment reader | A marked historical claimed or submitted attempt cannot continue through current submit, inspection, recovery, or provenance paths that need its manifest |
| B. Opaque historical display | Raw files may be located for people but do not enter assignment validation | Cuts execution compatibility while preserving manual inspection | Every downstream reader must be prevented from treating the artifact as a valid work-unit attempt |
| C. Retain recorded interpretation | Keep the present read-only v1/v2 branch | Preserves historical attempt semantics | Retains multiple assignment interpretations and associated guidance/tests |

**Selected: A. Reject explicit v1/v2.** The Engine will need one owned
unsupported-current-contract result before assignment/output interpretation.
It SHALL NOT migrate, default, or otherwise reinterpret a marked v1/v2 attempt
as v3. Historical bytes may remain human-readable, but the old attempt will no
longer participate in current submit, inspection, recovery, supersession, or
provenance computation.

## Effects and side effects to assess

- A historical v1/v2 attempt must never default to v3; that could accept a
  result under requirements it was never assigned, or reject an immutable
  result under retrofitted requirements.
- A central schema rejection can affect more than submit: manifest/beacon
  inspection, submitted ledger/provenance evaluation, declaration recovery,
  supersession, and Gate diagnostics all consume the same record family.
- This card must preserve current v3 direct-output behavior, including
  Wave1 supplementary semantics. It must not remove the current version
  discriminator merely to make the enum shorter.

## Proposal gate

- [x] Current v3 writer and v1/v2 reader boundary identified.
- [x] Accepted owner and a behavior-distinguishing v1 versus v3 regression
  example identified.
- [x] Map every v1/v2 reader, including submit, inspect, recovery,
  supersession, Gate/provenance, CLI guidance, and accepted specs.
- [x] Characterize current v3 claim/submit and current Wave1 supplementary
  behavior independently of legacy fixtures. Completed 2026-08-14: current
  claim writes v3 across index/manifest/beacon; current submit validates their
  exact bound output contract; only v3 supplementary Wave1 accepts an empty
  `required_outputs` declaration. The focused assignment/submit/lifecycle/CLI
  suite passed 129 tests.
- [x] User selects A, B, or C. Completed 2026-08-14: user selected A; marked
  v1/v2 are to be rejected without v3 inference or a compatibility adapter.
- [x] The unified C6a+C6b+C6c proposal names one rejection owner and proves
  that a marked old attempt cannot be reinterpreted as v3. Completed
  2026-08-14: `retire-legacy-work-unit-attempt-inputs` passed strict and
  planning-governance checks plus risk-led polish; implementation and governed
  archive completed as dashboard item 16.
- [x] Merge gate decided 2026-08-14: C6a/C6b/C6c share a tightly coupled
  work-unit attempt Source of Record, the same reject policy, substantially
  overlapping readers/tests, and one atomic rollback boundary. C6d and
  `legacy_non_work_unit_rows` remain out of scope.

## Expected verification

```bash
node --test tests/engine/work-unit-assignment-contract.test.mjs \
  tests/engine/work-unit-submit.test.mjs \
  tests/engine/work-unit-lifecycle.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
