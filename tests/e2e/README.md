# Deterministic E2E Tests

`tests/e2e/` owns the JS-led `deterministic_e2e` class. These `node:test` suites exercise workflow-scale state chains through production schemas, CLIs, gates, transitions, work-unit acceptance, status synchronization, and trace paths. Full routing semantics live in the accepted `verification-routing` spec.

The JS driver may simulate explicitly fixture-labeled Agent/human-owned Markdown, YAML, and artifact inputs plus actor candidate result, receipt, and output files. Candidate files remain non-authoritative until accepted by the real submit path. Accepted/submitted state, declaration-ledger rows, gate attempts, transitions, status, trace, and verdicts must come from production paths.

These tests prove deterministic chain behavior and failure/recovery contracts. They do not prove real human participation or Agent/sub-agent search, judgment, writing quality, repair reasoning, or synthesis.

Run all deterministic E2E tests with:

```bash
node --test tests/e2e
```

They are also discovered by canonical `npm test`.
