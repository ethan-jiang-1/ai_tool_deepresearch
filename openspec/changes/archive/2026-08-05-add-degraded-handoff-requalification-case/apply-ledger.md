# Apply Ledger

## Static Verification

- `node --test tests/integration/md/case-154-degraded-handoff-requalification-contract.test.mjs`
  passed 5/5. This is deterministic integration-contract proof only.
- `node openspec/governance/check-verification-routing.mjs --change add-degraded-handoff-requalification-case --mode assets`
  reported two valid claims.
- `openspec validate add-degraded-handoff-requalification-case --strict`,
  `node openspec/governance/check-project-reqs.mjs`,
  `node openspec/governance/check-project-specs.mjs`, and `git diff --check`
  passed.

## One Permitted Assurance Invocation

On 2026-08-05, the approved command was invoked exactly once:

```sh
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --run-profile assurance \
  --case case-154-heavy-degraded-handoff-requalification \
  --max-predicted-duration-ms 900000 \
  --max-total-budget-usd 3 \
  --max-case-budget-usd 3 \
  --timeout 720000 \
  --json
```

It exited with code 2 before case launch and emitted:

```text
run profile assurance selected no runnable cases; inspect with --dry-run
```

One read-only `--dry-run` inspection then reported this selected case as
omitted with `reason: duration_prediction_unavailable`, no predicted duration,
and no predicted cost. This is a Supervisor selection boundary, not a native
`PASS`/`FAIL`/`NOT_RUN` completion and not Subject, child, or tool-call
evidence. No retry was performed. It does not admit C3.
