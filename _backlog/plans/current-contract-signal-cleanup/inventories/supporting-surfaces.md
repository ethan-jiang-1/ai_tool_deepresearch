# Supporting-Surface Inventory

> Scope: current routing/governance documents plus focused tests and playbooks
> directly coupled to a cleanup family. This is deliberately not an inventory
> of every test file; core Harness and all accepted specs are inventoried
> separately. Audited 2026-08-13.

## Routing and Governance

| Surface | Classification | Owner / action |
| --- | --- | --- |
| root `AGENTS.md` | P + C3/C8 | Current Charter-first/phase-gate routing; it still names old bundle forms only because C3 behavior remains live. |
| root `CONTEXT.md` | P + C8 | Bounded non-authoritative vocabulary alignment; no compatibility success path. |
| `openspec/README.md` | P + C8 | Current owner router; C8 may simplify only after owner links settle. |
| `openspec/config.yaml` | P + C2c | Current OpenSpec governance; version-bump/changelog tasks are C2c's exact policy surface. |
| root `CHANGELOG.md` | H + C2c | Historical release record currently made authoritative by C2c policy; never delete history to improve appearances. |
| `docs/adr/0001-*`, `0002-*`, `0003-*` | P | Durable rationale, consulted only on demand; not duplicate routing/current behavior. |
| Harness `AGENTS.md`, `CLAUDE.md`, `README.md` | P + C3/C8 | Current framework routing, with C3-bound old-entry wording and later C8 compression only. |
| Harness `RUN.md` | P + C2c/C3 | Current new-run entry; version banner and reentry wording follow behavior decisions. |
| Harness `COMMANDS.md`, `cli/README.md` | P + C3/C6d | Current command/recovery instructions; old entry and transaction diagnostics have direct bounded owners. |
| `command_playbook/continue-run-bundle.md` | C3 | Current positive continuation route still recognizes old entry forms. |
| `command_playbook/provenance-forensics-guide.md` | P + C6b/C6d | Current forensic reader guidance, not stale documentation. |
| `command_playbook/setup-real-subagents.md` | P + C6c/C6d | Current actor/transaction setup/recovery guidance. |

## Focused Tests and Playbooks

| Family | Direct verification surfaces | Classification / action |
| --- | --- | --- |
| C1b/C1c/C1d | `tests/schema/contracts/gate.test.mjs`, `tests/schema/gate.test.mjs`, `tests/integration/cli/validate-workflow-package.test.mjs`, six `exp_gate-loop` / `exp_gate-fork` playbooks | C1b/C1c have isolated candidate tests; gate loop/fork playbooks are protected current experiment consumers; C1d has no implementation consumer and is a policy/spec decision. |
| C1e | `tests/engine/workflow-chain.test.mjs`, `exp_workflow-chain/case-31..33` | C1e only removes a private helper while retaining the current parser behavior. |
| C1f | `tests/host_tools/agent-experiment-autorun.test.mjs`, `tests/integration/host_tools/agent-experiment-targeting.test.mjs`, `tests/integration/host_tools/run-agent-experiment.test.mjs` | The first has the archived-ledger baseline assertion; others protect current Autorun behavior. |
| C2b/C2c | `tests/engine/framework-version.test.mjs`, `tests/engine/version-management.test.mjs`, `tests/integration/cli/instantiate-run-bundle.test.mjs`, `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs` | Current creation stamp and governance choreography characterization. |
| C3 | `tests/integration/deep-research-harness-entry-contract.test.mjs`, `tests/integration/cli/inspect-bundle.test.mjs`, `tests/integration/cli/check-reentry.test.mjs`, `tests/integration/md/continue-run-bundle-contract.test.mjs`, `tests/integration/md/dpt-research-entry-routing-contract.test.mjs` | Old-only forms are positive/non-blocking today; future C3 must turn them into one explicit current boundary. |
| C4a | `tests/schema/contracts/profile.test.mjs`, `tests/schema/profile.test.mjs`, HITL1 access CLI/e2e tests, `exp_wff_pre-research-repair/case-115-*` | Current direct-sample profiles and old-envelope reader/rejection behavior are distinct. |
| C4b | plan/canonical-topic tests, topic-state CLI tests, rerun continuity e2e tests, `exp_reentry-debuggability/case-315-*` | Current UID/layout lineage must remain while legacy mutable-plan policy is separately chosen. |
| C5a | reference schema/index/convergence tests, Wave Gate tests, Wave1/2 reference materialization Markdown tests | Current one/all/subset binding is not yet fully canonicalized; tests are behavior evidence, not old-format fixtures to delete. |
| C5b | `tests/host_tools/agent-experiment-autorun.test.mjs`, targeting/run tests, Autorun terminology test | Retained report/audit observations affect strategy selection and must be decided separately. |
| C6a-C6d | detailed file/test mapping in `c6-work-unit-reader-fanout.md`; work-unit engine/schema/integration/e2e and guidance tests | L4 reader fanout is closed for audit; individual behavior decisions remain pending. |
| C8 wording/routing | `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs`, `dpt-research-entry-routing-contract.test.mjs`, `continue-run-bundle-contract.test.mjs` | These assertions are current routing safeguards today; C8 must classify each future edit as authority/routing behavior versus literal wording. |
| C9a/C9b | `tests/integration/cli/operate-queue-validation.test.mjs`, `operate-queue-seed-authoring.test.mjs`, `operate-queue-demand-admission.test.mjs`, queue schema tests | Protected current initialization/identity validation, not compatibility-removal tests. |

## Result

The direct routing/governance and candidate-coupled verification surfaces all
have an owner. A later proposal must update only the rows belonging to its own
card and must not sweep unrelated fixture/history material into the change.
