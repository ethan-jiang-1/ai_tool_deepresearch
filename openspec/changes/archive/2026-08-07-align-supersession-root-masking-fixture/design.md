## Context

See `proposal.md` for the motivation. The failing E2E scenario creates a
normal Wave0 claimed attempt, submits it, creates a valid supersession
relation, then removes that relation's required `tx_id`. The scenario's output
coverage rule still uses the historical `reference/*.md` shape. On the current
Wave0 assignment, that glob is intentionally inapplicable, so it returns PASS
before the malformed relation can be observed.

The claimed manifest is the direct source of record for this fixture:
`manifest.output_contract.required_outputs`. For the current fixture it holds
one `source_yaml` entry at `artifacts/wave0/topic-a/source.yaml`.

## Goals / Non-Goals

**Goals:**

- Make the malformed-relation test select all required paths and roles from the
  claimed manifest before injecting corruption.
- Preserve the independent assertions that output coverage, submission
  presence, and inspect fail closed on one relation-integrity root.
- Keep the test's orphan-count assertion proportional to the same assignment
  tuple so a future legal output-shape change remains visible rather than
  silently bypassing coverage.

**Non-Goals:**

- Do not change the output contract, submission ledger, supersession relation,
  root selection, repair advice, or any production evaluator.
- Do not add an output-role registry, fallback selector, second validator, or
  Agent-flow experiment.

## Decisions

### 1. Derive the selector from the pre-corruption claimed manifest

The test will read `record.paths.manifest_ref`, parse the existing manifest,
and take `output_contract.required_outputs` as `{ glob, roles }` inputs to
`checkWorkUnitOutputCoverage`. It will assert that the fixture has at least one
required output before corrupting the supersession relation.

The manifest is chosen over the submitted ledger because the test deliberately
checks what happens when provenance/index integrity is broken. The expected
output scope must remain independently derived from the immutable claimed
assignment, not from a consumer whose integrity is under test.

**Alternative considered:** hard-code the current `source.yaml` / `source_yaml`
tuple. Rejected because it recreates the same drift class when assignments
change.

**Alternative considered:** derive the selector from `rb_output_declarations.jsonl`.
Rejected because it couples expected scope to the submitted-ledger reader being
validated and weakens the independence of the regression.

### 2. Keep the production evaluator unchanged

`checkWorkUnitOutputCoverage()` is correct to pass an inapplicable rule with no
matching expected files. The defect is that this test supplies a retired,
inapplicable rule while claiming to cover malformed-relation masking. Changing
the helper would turn a fixture-alignment repair into an unrelated behavior
change.

This retains the shortest loop:

```text
claimed manifest required_outputs
  -> applicable test selector
  -> existing output-coverage evaluator
  -> existing ledger_invalid root
  -> same E2E rerun
```

No new semantic level, state, projection, command, or responsibility boundary
is introduced. The semantic-precision, simple-control, and helper-oriented
reviews are therefore not applicable beyond preserving the existing direct
source and one-check loop.

## Risks / Trade-offs

- [A legacy fixture lacks `required_outputs`] -> fail the fixture explicitly;
  do not infer a legacy role or add a fallback. The current scenario claims a
  v2 assignment and must remain a v2 assertion.
- [Multiple legal required outputs are added later] -> pass all path and role
  entries to the existing selector and assert orphan count against that same
  tuple, making coverage expansion explicit in the regression result.
- [The manifest and other assignment surfaces drift] -> this test will expose
  the manifest-owned tuple it actually consumed; assignment-contract drift
  remains the responsibility of its existing production validation.

## Migration Plan

1. Change only the E2E fixture selector and its tuple-derived expectation.
2. Run the isolated malformed-relation test, then the complete E2E test file.
3. Run the change-scoped verification-route checks and strict OpenSpec
   validation before review/archival.

No runtime data or framework migration is needed. Reverting this change only
restores a stale test selector; it does not affect bundles, ledgers, receipts,
or production behavior.
