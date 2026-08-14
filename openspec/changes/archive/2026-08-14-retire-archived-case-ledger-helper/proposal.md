## Why

`agent-experiment-contract.mjs` still exports three helpers that validate or
read `case-compatibility-ledger.yaml` from the archived
`experiment-auto-runner` change. Their only current consumer is one test that
locks the archive's `97 / 502 / 16` migration baseline. The user has confirmed
that baseline is a completed migration record, not a current product
invariant.

Keeping an active archive-path reader/test makes historical apply data appear
to be a current Autorun contract. The active manifest and V2 playbook
frontmatter already own the current runnable corpus and selection behavior.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/experiment-agent-autorun` | Accepted Autorun spec; current manifest reader; Supervisor/test call graph; archived feasibility audit | Verify-only | The accepted capability owns current manifest/V2 selection, lifecycle, health, and completion. It does not require the archived ledger, its cardinality, or archive-path reading. |
| `verification/verification-routing` | Accepted verification-routing catalog entry; current C1f unit test boundary | Verify-only | Removing one obsolete unit test does not change verification classes, proof authority, or any current behavioral claim. |

No accepted requirement changes are needed. This change sets `skip_specs: true`:
it removes unconsumed implementation and test scaffolding without adding,
removing, or modifying observable Autorun behavior.

## What Changes

- Remove `validateCaseCompatibilityLedger()`,
  `readCaseCompatibilityLedger()`, and the validator-only
  `normalizeLedgerBundlePlan()` from
  `DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs`.
- Remove the dedicated archive-ledger baseline test and only its archive-path
  helper/imports from `tests/host_tools/agent-experiment-autorun.test.mjs`.
- Preserve the active `PLAYBOOK_MANIFEST.md` reader, exact current-corpus
  validation, V2 playbook-frontmatter validation, Supervisor selection,
  lifecycle, native completion, health, audit, and cleanup behavior.
- Do not delete, rewrite, move, or read the archived OpenSpec change or its
  ledger during normal current tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- **Affected code:** one archive-only helper cluster and one dedicated unit
  test projection.
- **Current contract:** no supported current caller loses behavior; the active
  manifest remains the direct Source of Record for runnable cases.
- **Compatibility:** the three exported internal helper symbols disappear.
  The exact current-surface scan finds no supported caller, alias, fallback,
  package dependency, or accepted requirement that depends on them.
- **Responsibility:** the user chose the migration-record policy; the Agent
  performs the bounded retirement and checks for missed callers; existing
  deterministic manifest/Supervisor verdicts retain their authority.
