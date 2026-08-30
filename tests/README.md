# Tests

This directory owns all JS-led project tests: `unit`, `integration`, and `deterministic_e2e`.

## How to Run

- Use `npm test` for the full project regression suite. Node's test runner
  executes files **in parallel** by default; this parallel run is the
  canonical full-suite mode (measured ~139s on the 8-core dev machine) and is
  flake-free since the shared-snapshot/bundle-name races were removed
  (2026-08-22: `parallelize-regression-suite` + `de-spawn-bundle-instantiation`
  changes).
- Serial mode (`npm test -- --test-concurrency=1 --test-reporter=tap`) is a
  **measurement mode only** for per-file timing baselines, not the canonical
  entry (~489s).
- `npm run test:shard <n> <m>` runs the m-th (1-based) deterministic shard of
  the discovered suites for parallel execution across n workers/CI shards
  (wall ~= full parallel / n). See `scripts/test-shard.mjs`.
- `npm run test:quick` runs a triage lane (schema + md text-lock suites, ~6s).
  It is a convenience, **not** a verification substitute for `npm test`.
- Use `node --test tests/path/to/file.test.mjs` or
  `node --test tests/path/to/dir` for focused checks (pass file paths, not
  bare directory arguments — `node --test <dir>` is not supported on all
  node versions).
- Do not use bare `node --test` from the repo root as the normal regression command. Node can discover test-looking files outside `tests/`, including archived OpenSpec change artifacts with retired fixtures.
- Before rewording a governed document (entry docs, `COMMANDS.md`, specs), run
  `node scripts/list-doc-locks.mjs <repo-relative-doc-path>` to see which tests
  reference it; update those locks in the same change instead of discovering
  them as red at the archive gate.

The `package.json` `test` script is the canonical full-suite entry because it
passes only `tests/**/*.test.mjs` files (excluding disposable `.test-*`
output directories: `.test-tmp/`, `.test-bundles/`, `.test-chain-tmp/`) to
Node's test runner.

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
- Do not put tests, fixtures, or experiment playbooks under `DEEP_RESEARCH_HARNESS/`; it is the distributable framework surface.
