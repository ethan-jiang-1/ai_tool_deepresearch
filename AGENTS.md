# AGENTS.md

Codex notes for this repo. Keep this file short; detailed rules live in OpenSpec.

## Project

Deep Research Tool rewrite: an agentic framework for evidence-backed, multi-wave, gated research reports.

Core split: the LLM Agent searches, reads, writes evidence, and synthesizes. The JavaScript Engine enforces schemas, gates, state transitions, receipts, and checks.

## Before Anything Else

**This is not a traditional program.** Read `guidelines/project-charter.md` — it explains the project's nature, principles, and why mock/make-believe testing has no place here.

Use `guidelines/` when the right direction, layer boundary, or experiment path is unclear. Start with `guidelines/project-charter.md`.

## Deep Research Routing

For selected DPT research, choose and read exactly one entry before request-specific research work: an explicitly supplied reachable existing bundle (or its `RUN_BUNDLE.md` / `BUNDLE_MAP.md`) with continuation or inspection intent uses `DPT_FRAMEWORK/command_playbook/continue-run-bundle.md`; otherwise research, deep-research, investigation, or report intent with `DPT_FRAMEWORK/` selected uses `DPT_FRAMEWORK/RUN.md`. A discovered, bare, or unreachable map does not select a run. Before the selected entry is read, do not invoke `research`, `deep-research`, or an equivalent one-shot shortcut, perform request-specific WebSearch/WebFetch, or collect/synthesize evidence manually. The selected entry and its later phase instructions authorize subsequent legal research work.

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
- For a change whose `tasks.md` declares an `openspec-feedback:*` marker, supported apply/archive entries MUST obtain the matching current OpenSpec operation guidance before target edits or finalization. Record actionable findings as ordinary pending tasks. After Agent-owned semantic closeout and spec sync, use `node openspec/governance/finalize-change-archive.mjs --change <name>` as the only supported final archive transition.

## OpenSpec Workflow

Sequential phases — never skip ahead. If a phase is taking too long, surface the friction; don't jump to implementation.

| Phase | Command | Working Area |
|-------|---------|-------------|
| Propose | `/opsx:propose` | `openspec/changes/` — specs, design, tasks |
| Explore | `/opsx:explore` | `openspec/changes/` — investigate, clarify, refine |
| Apply | `/opsx:apply` | Target code — implement per approved task list |
| Archive | `/opsx:archive` | Finalize and archive |
