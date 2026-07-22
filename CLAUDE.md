# CLAUDE.md

Claude Code notes for this repo. Keep this file short; detailed rules live in OpenSpec.

## Project

Deep Research Tool rewrite: an agentic framework for evidence-backed, multi-wave, gated research reports.

Core split: the LLM Agent searches, reads, writes evidence, and synthesizes. The JavaScript Engine enforces schemas, gates, state transitions, receipts, and checks.

## Before Anything Else

**This is not a traditional program.** Read `guidelines/project-charter.md` — it explains the project's nature, principles, and why mock/make-believe testing has no place here.

Use `guidelines/` when the right direction, layer boundary, or experiment path is unclear. Start with `guidelines/project-charter.md`.

## Deep Research Routing

If the user explicitly supplies a reachable existing bundle's `BUNDLE_MAP.md` in this selected DPT workspace and asks to continue or inspect it, use `DPT_FRAMEWORK/command_playbook/continue-run-bundle.md` before `RUN.md`. A discovered/bare/unreachable map does not select a run. Otherwise, research, deep-research, investigation, or report intent with `DPT_FRAMEWORK/` selected uses `DPT_FRAMEWORK/RUN.md` and the framework workflow; do not invoke a built-in `deep-research` or equivalent one-shot shortcut.

## Where To Look

- Project philosophy, error tolerance, rules: `guidelines/`
- Project rules/context: `openspec/config.yaml`
- Active changes: `openspec/changes/`
- Accepted specs: `openspec/specs/`
- Requirement registry and checks: `openspec/governance/`
- Framework code/playbooks: `DPT_FRAMEWORK/` (`validate-bundle.mjs`, `inspect-bundle.mjs`)
- Prototypes: `experiments_env/`
- JS-led tests: `unit` under focused `tests/` paths, `integration` under `tests/integration/`, and `deterministic_e2e` under `tests/e2e/`
- Coding-Agent/Markdown-led `agent_flow_e2e`: `experiments_playbook/exp_*/` over real disposable bundles
- Routing semantics: accepted `verification-routing` spec

## Hard Rules

- Do not read `_old_topics` archives unless explicitly asked.
- Use Node.js >=20, pure JavaScript ESM (`.mjs`). No TypeScript. **Absolutely no Python.** Not for scripts, not for one-liners, not for prototyping — use Node.js for everything.
- Do not add dependencies. Approved npm deps only: `zod`, `yaml`; otherwise use Node built-ins.
- Use `node:test` + `node:assert` for JS-led tests.
- **Tests always under `tests/` at repo root, never inside `DPT_FRAMEWORK/`.** `DPT_FRAMEWORK/` is the distributable framework — framework code only, no test files, no experiment fixtures. Test dirs mirror framework dirs: `tests/engine/`, `tests/engine/`, `tests/schema/`, etc.
- Test placement: `unit`, `integration`, and `deterministic_e2e` live under `tests/`; `agent_flow_e2e` lives under `experiments_playbook/`. Use the accepted `verification-routing` spec for classification.
- **OpenSpec phase gate: `DPT_FRAMEWORK/` is read-only until `/opsx:apply`.** During propose/explore, work in `openspec/changes/` only. You may read anything for context; you may write only change artifacts (specs, design, tasks). Target code (`DPT_FRAMEWORK/`, `tests/`, `experiments_playbook/`) is modified only during apply, per the approved task list. Deliberation fatigue does not grant an exception.

## OpenSpec Workflow

Sequential phases — never skip ahead. If a phase is taking too long, surface the friction; don't jump to implementation.

| Phase | Command | Working Area |
|-------|---------|-------------|
| Propose | `/opsx:propose` | `openspec/changes/` — specs, design, tasks |
| Explore | `/opsx:explore` | `openspec/changes/` — investigate, clarify, refine |
| Apply | `/opsx:apply` | Target code — implement per approved task list |
| Archive | `/opsx:archive` | Finalize and archive |
