# CLI Integration Tests

This directory tests shipped CLI entry points under `DPT_FRAMEWORK/cli/`.

Run the whole CLI integration layer with:

```bash
node --test tests/integration/cli
```

Command-contract hardening coverage is split deliberately:

- `actual-gate-cli-exit-code-contract.test.mjs` proves an actual gate CLI wrapper returns `0` for pass, `1` for repairable gate failure, and `2` for invalid input.
- `exit-code-convention.test.mjs` keeps the shipped CLI inventory honest and samples safe invocations for every current top-level CLI.
- Individual `check-gate-*.test.mjs` files continue to cover each gate's domain behavior.

Do not put CLI fixtures or tests under `DPT_FRAMEWORK/`; use disposable paths under `tests/` instead.
