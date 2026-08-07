## Why

Phase 3 current-head observation found a deterministic E2E regression in
`tests/e2e/work-unit-attempt-recovery.test.mjs`: the malformed supersession
relation scenario queries the retired Wave0 `reference/*.md` output shape.
The current claimed Wave0 source-intake assignment instead owns
`artifacts/wave0/<topic>/source.yaml` with role `source_yaml`. Because the
stale glob matches nothing, `checkWorkUnitOutputCoverage()` correctly treats
that particular rule as inapplicable and returns PASS before the test can
observe the intended root-masking boundary.

The direct current-head probe proves that the same malformed relation produces
one `ledger_invalid` root when the coverage selector is derived from the actual
assigned `source_yaml` output. This is a missed regression-fixture alignment
from the archived `align-gate-contract-descriptors-and-terminal-recovery-tests`
change, not evidence for a new schema, Gate, Queue, or recovery capability.

## What Changes

- Make the malformed-supersession-relation E2E scenario obtain its applicable
  Wave0 output selector from the claimed assignment/manifest tuple rather than
  the retired `reference/*.md` convention.
- Keep the existing assertion boundary: output coverage, submission presence,
  and inspect must each fail closed on the same malformed relation; downstream
  output symptoms must not replace that primary integrity root.
- Add focused verification that the current assignment-derived selector reaches
  the real coverage evaluator and that the complete E2E file is green.
- Do not change `DEEP_RESEARCH_HARNESS/` behavior, schemas, Gate definitions,
  Queue semantics, submitted-ledger authority, or release version.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | Current claimed-assignment contract; archived Change B task 4.1 and design decision 4 | Verify-only | The existing assignment tuple is correct and remains the source of record; this change only makes a regression consume it. |
| `agent/work-unit-provenance-gate` | Main spec malformed-supersession root-masking scenarios; current E2E reproduction | Verify-only | The accepted root-first behavior is unchanged; the test currently fails to exercise its applicable output scope. |
| `verification/verification-routing` | Main spec routing contract and existing E2E asset | Verify-only | The selected asset remains a `deterministic_e2e` Node test with no Agent-behavior claim. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `skip_specs: true` is intentional: this is a regression-fixture
alignment that changes no accepted behavior requirement.

## Impact

- Affected target surface: `tests/e2e/work-unit-attempt-recovery.test.mjs`.
- Verification evidence: the isolated malformed-relation test, the complete
  `work-unit-attempt-recovery` E2E file, and the change-scoped route checks.
- Direct source of record: the claimed attempt assignment/manifest and the
  existing submitted provenance contract; neither chat history nor a copied
  output-role list is authoritative.
- Short legal loop: claimed assignment -> applicable coverage selector ->
  provenance evaluator -> one malformed-relation root -> same test rerun.
- No new named state, projection, command, or reader-facing concept is
  introduced. The semantic-precision, control-shape, and responsibility
  boundaries therefore remain unchanged: Engine owns the deterministic verdict;
  this fixture only observes it.
