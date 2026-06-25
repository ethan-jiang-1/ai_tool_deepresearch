# CLAUDE.md

Claude Code notes for this repo. Keep this file short; detailed rules live in OpenSpec.

## Project

Deep Research Tool rewrite: an agentic framework for evidence-backed, multi-wave, gated research reports.

Core split: the LLM Agent searches, reads, writes evidence, and synthesizes. The JavaScript Engine enforces schemas, gates, state transitions, receipts, and checks. Do not return to agent-self-policed V12 behavior.

## Before Anything Else

**This is not a traditional program.** Read `guidelines/project-charter.md` — it explains the project's nature, principles, and why mock/make-believe testing has no place here.

Use `guidelines/` when the right direction, layer boundary, or experiment path is unclear. Start with `guidelines/project-charter.md`.

## Where To Look

- Project philosophy, error tolerance, rules: `guidelines/`
- Project rules/context: `openspec/config.yaml`
- Active changes: `openspec/changes/`
- Accepted specs: `openspec/specs/`
- Requirement registry and checks: `openspec/governance/`
- Framework code/playbooks: `DPT_FRAMEWORK/` (`validate-bundle.mjs`, `inspect-bundle.mjs`)
- Prototypes: `experiments_env/`
- Regression tests (unit + integration): `tests/`
- Controlled E2E tests: `experiments_playbook/exp_*/` (Agent-driven playbooks on real disposable bundles)
- Real-environment E2E: deferred

## Hard Rules

- Do not read `_original_*` archives unless explicitly asked.
- Use Node.js >=20, pure JavaScript ESM (`.mjs`). No TypeScript.
- Do not add dependencies. Approved npm deps only: `zod`, `yaml`; otherwise use Node built-ins.
- Use `node:test` + `node:assert` for regression tests.
- **Tests always under `tests/` at repo root, never inside `DPT_FRAMEWORK/`.** `DPT_FRAMEWORK/` is the distributable framework — framework code only, no test files, no experiment fixtures. Test dirs mirror framework dirs: `tests/engine/`, `tests/engine/`, `tests/schema/`, etc.
- Test layering: `tests/` = regression (unit + integration). `experiments_playbook/exp_*/` = controlled E2E (Agent-driven playbooks). Real-environment E2E is deferred.

## OpenSpec Commands

- `/opsx:propose "idea"`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`
