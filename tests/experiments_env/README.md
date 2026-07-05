# Experiments Environment Tests

This directory tests reusable helpers under `experiments_env/` without running real-environment E2E.

Run with:

```bash
node --test tests/experiments_env
```

Controlled E2E playbooks remain under `experiments_playbook/`; this tree is only regression coverage for reusable utilities.
