# Apply Ledger: fast-regression-run-profile

## Scope

Implemented ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004 as a bounded, virtual fast-regression profile. It does not move cases, maintain a persistent suite, or alter native completion authority.

## Feedback Repairs

- The execution-surface inventory now includes the Supervisor/runtime dependency closure and helpers named by the injected instruction or selected playbook. Documentation-only framework files are excluded.
- A source-matching fast deterministic result whose v2 execution surface is stale is `needs_qualification`, not normal-regression eligible. Explicit qualification may establish a fresh v2 result; source drift remains ineligible.

Focused proof:

```bash
node --test tests/host_tools/experiment-run-strategy.test.mjs
```

Result: 12/12 passing, including a release-banner-only fingerprint stability check, relevant-helper drift detection, and stale-v2 explicit qualification without source-drift admission.

## Focused Verification

```bash
node --test tests/schema/contracts/playbook.test.mjs tests/host_tools/experiment-run-strategy.test.mjs tests/integration/host_tools/run-agent-experiment.test.mjs tests/integration/md/agent-experiment-autorun-terminology.test.mjs
```

Result: 59/59 passing. This covers strict V2 frontmatter, selection/admission behavior, Supervisor launch caps and side-effect rejection, report/audit versioning, and operator terminology.

## Native Qualification

Command:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --run-profile regression --regression-qualification --max-predicted-duration-ms 480000 --max-total-budget-usd 3 --timeout 120000 --health-timeout 60000 --json
```

Native report: `.exp-bundles/_reports/3b2a14c7-ee67-475a-801d-e112667358bd.json`

| Case | Native outcome | Health | Duration | Cost |
| --- | --- | --- | ---: | ---: |
| `case-606-light-continuation-cues` | PASS | CLEAN | 39005 ms | $0.252697 |
| `case-315-light-canonical-topic-state-recovery` | PASS | CLEAN | 63037 ms | $0.339595 |
| `case-33-standard-error-paths` | PASS | CLEAN | 67956 ms | $0.454079 |

Batch result: 3/3 PASS, no lifecycle errors, total cost `$1.046371`, within the `$3.00` batch and `$0.60` case caps. Every retained selection observation records `regression_intent: qualification` and a current v2 execution-surface fingerprint.

Follow-up normal inspection used the same `--run-profile regression --max-predicted-duration-ms 480000 --dry-run --json` invocation. It selected only these three cases, each with `source_relation: matching`, `execution_surface_relation: matching`, `regression_intent: normal`, and `prediction_basis: observed_matching`.

## Release Surface

- `CHANGELOG.md` records v0.67.
- `DPT_FRAMEWORK/RUN.md` carries the v0.67 banner and fast-regression entry.
- Operator documentation describes normal versus explicit qualification and treats absent or stale v2 identity as qualification-only.

## Governance

```bash
node openspec/governance/check-verification-routing.mjs --change fast-regression-run-profile --mode assets
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
```

Results: verification routing assets valid for 4 claims; 616 registered requirement IDs with 0 orphan occurrences; 82 main spec files with 0 violations.

## Closeout Review

Scope: the 14 tracked implementation/documentation/test files listed by `git diff --name-only`, this apply ledger, and the active change artifacts. `git diff --check` reported no whitespace errors and `openspec validate fast-regression-run-profile --strict` passed.

The review compared the actual implementation against ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004: normal versus qualification intent stays explicit; selection remains virtual and bounded; V2 identity tracks runtime inputs without treating release documentation as code; the Supervisor preserves native outcome/health authority; and operator documentation matches the enforced limits. The selected unit, integration, and native evidence cover the declared verification-plan claims. No actionable closeout finding remains.

Archive and commit are intentionally not performed by this apply operation.
