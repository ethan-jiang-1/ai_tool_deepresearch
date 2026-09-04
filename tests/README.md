# Tests

This directory owns all JS-led project tests: `unit`, `integration`, and `deterministic_e2e`.

## How to Run

- Use `npm test` for the full project regression suite. The entry is
  `scripts/run-tests.mjs`, which discovers the same `tests/**/*.test.mjs` set
  (excluding disposable `.test-*` output directories and symlinked dirs, via
  the shared `scripts/test-shard.mjs` discovery), runs `node --test` at
  `os.availableParallelism()` concurrency, and sets `NODE_COMPILE_CACHE` under
  the gitignored `/.cache/` for a cross-process V8 compile cache. The wrapper
  adds no verdict logic: stdio and the exit code are passed through verbatim.
  Other flags are forwarded to `node --test` (a trailing
  `--test-concurrency` overrides the wrapper's), so the serial measurement
  mode below still works.
- Serial mode (`npm test -- --test-concurrency=1 --test-reporter=tap`) is a
  **measurement mode only** for per-file timing baselines, not the canonical
  entry (~489s).
- `scripts/test-weights.json` is a performance projection (per-file wall
  seconds, contention-inflated 8-way methodology — relative order only). It
  is consumed by heavy-file triage for the spawn-cost reduction change; the
  CLI-arg LPT scheduling it was originally generated for is **not applied**
  (`node --test` sorts file args lexicographically — R1 probe, 2026-09-04).
  Regenerate with `node scripts/regen-test-weights.mjs` (~4-8 min) when a new
  file heavier than ~5s lands or the heavy-file ranking drifts; a missing or
  stale table never affects correctness, only triage data quality.
- `npm run test:shard <n> <m>` runs the m-th (1-based) deterministic shard of
  the discovered suites for parallel execution across n workers/CI shards
  (wall ~= full parallel / n). See `scripts/test-shard.mjs`.
- `npm run test:quick` runs a triage lane (schema + md text-lock suites, ~6s).
  It is a convenience, **not** a verification substitute for `npm test`.
- `npm run test:clean` 删除 `tests/` 下 `.test*` 前缀的一次性产物目录（口径以 `.gitignore` 的 `tests/**/.test*` 段为唯一参照；不触碰 `tests/fixtures/` 与任何版本库文件）。
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

## Full-Suite Failure Triage

- 现象：subprocess 密集的套件（如 `tests/integration/governance/check-all.test.mjs` 的 check-all 聚合——单次聚合要启动全部 governance checker）在满载并行下可能超过其内部 spawn timeout 而级联报红。2026-08-31 实测：受压环境一次全量运行 16 fail / 4 cancelled，干净复跑 1 fail，失败文件孤立复跑全绿。
- 操作：对每个失败文件孤立复跑定性：`node --test tests/path/to/file.test.mjs`。
- 定性：孤立通过 = 资源竞争伪影，不是回归——不要据此修改被锁定的行为或"修"不坏的代码；孤立仍红 = 真回归信号，按正常修复路径处理。

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
