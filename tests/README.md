# Tests

This directory owns all JS-led project tests: `unit`, `integration`, and `deterministic_e2e`.

## How to Run

- Use `npm test` for the full project regression suite.
- Use `node --test tests/path/to/file.test.mjs` or `node --test tests/dir` for focused checks.
- Do not use bare `node --test` from the repo root as the normal regression command. Node can discover test-looking files outside `tests/`, including archived OpenSpec change artifacts with retired fixtures.

The `package.json` `test` script is the canonical full-suite entry because it passes only `tests/**/*.test.mjs` files to Node's test runner.

For this command-surface hardening work, `tests/engine/command-contract-docs.test.mjs` covers ACS-003/ACS-004/CLE-004, `tests/integration/cli/actual-gate-cli-exit-code-contract.test.mjs` proves actual gate CLI `0/1/2` behavior, and `tests/integration/cli/exit-code-convention.test.mjs` maintains the CLE-004 shipped-CLI exit-code inventory plus safe runtime samples.

## Directory Map

- `engine/`: engine helpers, queue/work-unit flow, trace/logging, and static framework-doc contract checks.
- `integration/`: executable CLI and Markdown workflow checks against framework surfaces.
- `e2e/`: workflow-scale deterministic state chains driven by JS through production checkpoints.
- `schema/`: schema and contract validation for project data shapes.
- `governance/`: project requirement/spec governance checks.
- `experiments_env/`: regression coverage for reusable experiment-environment utilities.
- `helpers/`: shared test-only helpers used by suites under `tests/`.
- `fixtures/`: static fixture copies for tests.
- `.test-bundles/` and `.test-tmp/`: disposable local test output; do not treat as fixtures.

## Placement

- JS-led tests live under `tests/` and use `node:test` plus `node:assert`; routing semantics are defined by the accepted `verification-routing` spec.
- Do not put tests, fixtures, or experiment playbooks under `DPT_FRAMEWORK/`; it is the distributable framework surface.
