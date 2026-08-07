# Apply Evidence: Assignment-Derived Supersession Root-Masking Fixture

## Plan Review (2026-08-07)

The reviewed scope is limited to the malformed supersession-relation scenario
in `tests/e2e/work-unit-attempt-recovery.test.mjs`. The relevant accepted
owners are the claimed manifest's `output_contract.required_outputs` tuple
(`agent/delegated-work-units`) and the existing malformed-relation root-masking
contract (`agent/work-unit-provenance-gate`). No new capability, schema, Engine
behavior, queue behavior, or Agent-flow claim is needed.

The review found one fixture requirement, already represented by tasks 2.1 and
2.2: the test must assert a current v2, non-empty claimed required-output tuple
before corruption and must derive its coverage scope from that tuple. It must
not substitute a hard-coded `source_yaml` path or read expected scope from the
submitted ledger under test.

## Baseline Reproduction

The isolated feedback loop was run twice:

```sh
node --test \
  --test-name-pattern='masks dependent output and presence symptoms under one malformed-relation root' \
  tests/e2e/work-unit-attempt-recovery.test.mjs
```

Both runs failed in approximately 0.3 seconds at the output-coverage branch.
After deleting `supersession_relation.tx_id`, the test's retired
`reference/*.md` selector matched zero files, so `checkWorkUnitOutputCoverage`
returned `passed: true` with `No delegated output files matched this
work-unit coverage rule.` The independent submission-presence and work-unit
inspect paths returned one `ledger_invalid` root, proving the malformed
relation itself is detected.

A temporary-bundle probe read the claimed manifest before corruption. Its
current tuple was:

```json
[
  {
    "path": "artifacts/wave0/topic-a/source.yaml",
    "role": "source_yaml"
  }
]
```

Using that tuple as the output-coverage selector made the same malformed
relation return `passed: false` with exactly
`assignment-derived-output-coverage:ledger_invalid`. This is deterministic
fixture drift, not an unobserved Agent-flow result.

## Planning Checks

- `node openspec/governance/check-verification-routing.mjs --change align-supersession-root-masking-fixture --mode plan`: PASS (1 deterministic E2E claim).
- `openspec validate align-supersession-root-masking-fixture --strict`: PASS.

## Implementation And Verification (2026-08-07)

The malformed-relation scenario now reads the claimed manifest before corruption,
requires `assignment_contract_version: "work-unit.assignment.v2"` and a
non-empty path/role tuple, and derives both `output_selectors` arrays plus the
expected orphan scope from that tuple. It contains no retired Wave0
`reference/*.md` selector or hard-coded replacement role.

- `node --test --test-name-pattern='masks dependent output and presence symptoms under one malformed-relation root' tests/e2e/work-unit-attempt-recovery.test.mjs`: PASS (1 matching test; the assignment-derived selector returned the existing `ledger_invalid` root).
- `node --test tests/e2e/work-unit-attempt-recovery.test.mjs`: PASS (19/19).
- `node openspec/governance/check-verification-routing.mjs --change align-supersession-root-masking-fixture --mode assets`: PASS (1 deterministic E2E claim).
- `openspec validate align-supersession-root-masking-fixture --strict`: PASS.
- `node openspec/governance/check-project-reqs.mjs`: PASS (630 registered; 53 retired; 0 orphan; no duplicate, unregistered, or reused-retired finding).
- `node openspec/governance/check-project-specs.mjs`: PASS (84 main spec files; 0 violations).

These are deterministic fixture and governance results only. They neither run
nor establish a real `agent_flow_e2e` result.

## Closeout Review (2026-08-07)

The scoped review covered the active change artifacts, the only target-code
diff in `tests/e2e/work-unit-attempt-recovery.test.mjs`, and the explicitly
owned Gate Schema Phase 3 tracker update. `git diff --check`, strict OpenSpec
validation, verification-route asset validation, project requirement checks,
and project spec checks passed. The target diff derives every selector and
orphan expectation from the pre-corruption claimed manifest; it makes no
production, schema, Gate, Queue, or Agent-flow behavior change.

There is intentionally no delta spec (`skip_specs: true`), so no semantic
delta/main sync is applicable. No actionable closeout finding remains; the
tracker correctly retains real Agent-flow evidence as `NOT_RUN` / `UNOBSERVED`.
