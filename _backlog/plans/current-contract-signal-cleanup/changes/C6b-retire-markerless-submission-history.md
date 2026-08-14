# C6b: Decide the Markerless Submitted-Attempt Policy

> Candidate change: `retire-markerless-submission-history`
>
> Planned execution batch: dashboard item 16 `C6a+C6b+C6c`, conditional on C6a/C6c policy alignment
>
> Status: decision card; reader fanout complete and user policy pending
>
> Risk: L4

## One question

May the current Engine stop computing submission, recovery, and supersession
facts from a historical attempt that lacks the current submission marker and
uses the older hash-mirror representation?

This card is about absent submission facts, usually a record without
`submission_contract_version: work-unit.submission.v1` and often without an
assignment marker. It does **not** remove the current
`work-unit.submission.v1` discriminator. Explicit assignment v1/v2 semantics
remain C6a; absent actor provenance remains C6c.

## Verified boundary

- New claims write `submission_contract_version: work-unit.submission.v1`.
  On successful submission they retain one immutable
  `accepted_ledger_record_hash`; they do not use the old index/status hash
  mirrors as the current representation.
- `isMarkedWorkUnitSubmission()` selects the current representation. Its
  markerless branch requires mutually matching `result_hash` and
  `ledger_record_hash` values on index, status, and ledger row.
- Markerless submit/recovery behavior is broader than a parser union:
  Wave1 role normalization applies only when the assignment marker is absent;
  receipt/result validation can preserve older incomplete bindings; declaration
  recovery contains no-contribution, timestamp/context, and late-submit
  evidence branches; and supersession validates a full legacy acceptance tuple
  before treating an old predecessor as historical.
- The accepted `work-unit-provenance-gate` contract explicitly distinguishes
  the markerless mirror-compatibility branch from the current immutable
  fingerprint. It lets a verified historical predecessor remain historical,
  never current coverage.
- The submitted-ledger reader also reports non-work-unit JSONL lines as
  `legacy_non_work_unit_rows`. Their diagnostic versus behavioral reader map is
  still open; this card records that gap rather than treating those rows as
  safe to delete or safe to ignore.

## Possible policies

| Choice | Current Engine treatment | Main benefit | Main consequence |
|---|---|---|---|
| A. Reject markerless attempts | One stable unsupported-current-contract result before submission/provenance computation | Removes hash-mirror, normalization, and historical recovery branches | Old submitted attempts can no longer recover a declaration, participate in supersession, or supply current Engine provenance facts |
| B. Opaque historical display | May expose raw coordinates only; does not validate, count, recover, or supersede from the bytes | Keeps manual inspection while ending computational compatibility | Requires one exact no-count/no-recovery boundary across every current reader |
| C. Retain full read-only compatibility | Preserve the present version-applicable mirror/recovery reader | Least disruptive to existing historical reruns | Keeps the most complex legacy fanout |

No choice is selected. A or B may fit current-only policy, but neither may
silently discard a legacy record during a current safety or provenance scan.

## Effects and side effects to assess

- Removing only the positive submit path is insufficient: recovery and
  supersession can reconstruct or verify a prior acceptance from independent
  stored facts. Those readers need their own deliberate disposition.
- A markerless attempt must not be treated as current merely because its
  fields happen to resemble a v3 result. The replacement behavior has to be an
  explicit failure or opaque result.
- Current marked claim/submit, timeout recovery, eligible late-submit, and
  supersession must continue to work. `work-unit.submission.v1` itself is a
  protected current contract, despite the `v1` suffix.
- Existing work-unit content and cache evidence may be immutable historical
  facts. A cleanup must not mass-rewrite result, receipt, ledger, or trace
  bytes to create a current-shaped record.

## Proposal gate

- [x] Current marked representation and older hash-mirror representation
  distinguished.
- [x] Markerless normalization, declaration recovery, late-submit, and
  supersession readers identified at first pass.
- [x] Map every reader of a markerless index/status/ledger/result/receipt
  combination and classify active execution versus historical interpretation.
- [x] Classify the exact role of `legacy_non_work_unit_rows` without widening
  this card into generic JSONL cleanup.
- [ ] Characterize all current marked recovery and supersession paths before a
  branch is removed.
- [ ] User selects A, B, or C.
- [ ] A proposal provides a single explicit old-input boundary and proves no
  markerless input is upgraded, inferred, or silently dropped.

## Expected verification

```bash
node --test tests/engine/work-unit-submit.test.mjs \
  tests/engine/work-unit-attempt-recovery.test.mjs \
  tests/engine/work-unit-actor-submit.test.mjs
node --test tests/integration/cli/work-unit-declaration-recovery.test.mjs \
  tests/e2e/work-unit-attempt-recovery.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
