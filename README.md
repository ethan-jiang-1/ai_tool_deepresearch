# ai_tool_deepresearch

Spec-driven rewrite of a Deep Research Tool: broad question in, evidence-backed gated research report out.

## Start Here

- Project rules and architecture context: `openspec/config.yaml`
- Current active work: `openspec/changes/`
- Accepted requirements/specs: `openspec/specs/`
- Requirement tracking checks: `openspec/governance/`
- Runtime framework and agent playbooks: `DPT_FRAMEWORK/`
- Frozen prototypes: `experiments/`
- Regression tests: `tests/`

## Rules In One Screen

- Node.js >=20, pure JavaScript ESM (`.mjs`).
- Only approved npm deps: `zod`, `yaml`.
- Everything else uses Node built-ins.
- Tests use `node:test` + `node:assert`.
- `_original_*` directories are archives; read them only when explicitly requested.


