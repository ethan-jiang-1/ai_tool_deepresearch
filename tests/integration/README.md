# Integration Tests

`integration` tests exercise production CLI/subprocess, filesystem, runtime-bundle, and separately owned Markdown/JS boundaries from the outside. Workflow-scale deterministic chains belong in `tests/e2e/`.

Run the whole integration layer with:

```bash
node --test tests/integration
```

Use `cli/` for executable CLI behavior, `md/` for Markdown workflow/content contracts, `governance/` for project governance processes, and `experiments_env/` for experiment-helper processes. See the accepted `verification-routing` spec for classification.
