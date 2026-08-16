# AGENTS.md

Codex notes for this repo. Keep this file short; detailed rules live in OpenSpec.

> 新 Agent onboarding 基线：`openspec/guidance/models/invariants-brief.md`（不变量简报，非权威、每条可机器验证或指向唯一真相源；其余指引 lazy-load）。

## Project

Deep Research Tool rewrite: an agentic framework for evidence-backed, multi-wave, gated research reports.

Core split: the LLM Agent searches, reads, writes evidence, and synthesizes. The JavaScript Engine enforces schemas, gates, state transitions, receipts, and checks.

## Before Anything Else

**This is not a traditional program.** Read `openspec/constitution/project-charter.md` — it explains the project's nature, principles, and why mock/make-believe testing has no place here.

Use the OpenSpec guidance topology when the right direction, layer boundary, or experiment path is unclear. Start with `openspec/constitution/project-charter.md`.

For every substantive repository task, after the required Project Charter read,
read root `CONTEXT.md` to align terminology and ownership boundaries.
`CONTEXT.md` is a non-authoritative glossary: normal instruction-discovery
behavior and task-specific authoritative sources still decide the relevant work.
Read `docs/adr/` only when a task needs a durable architecture rationale; it is
on-demand, not another mandatory pre-task read.

## Deep Research Routing

For selected Deep Research Harness research, entry selection has exactly one canonical statement: the "Entry Selection (canonical)" section of `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`; this block is a pointer, not a restatement. In brief: an explicitly supplied reachable existing bundle candidate (a directory or a file within it) with continuation or inspection intent first passes the same-root `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` preflight, then follows that playbook. A candidate missing either file is `unsupported_current_entry_contract`: stop without reading it as an operational entry. With no supplied existing candidate, research, deep-research, investigation, or report intent with `DEEP_RESEARCH_HARNESS/` selected uses `DEEP_RESEARCH_HARNESS/RUN.md`. A discovered, bare, or unreachable file does not select a run. Before the selected entry is read, do not invoke `research`, `deep-research`, or an equivalent one-shot shortcut, perform request-specific WebSearch/WebFetch, or collect/synthesize evidence manually. The selected entry and its later phase instructions authorize subsequent legal research work. Direct human reading of historical Markdown remains outside this operational contract.

## Repository Reading Scope

Start from the repository root and choose only the top-level surface relevant to the task. Do not pre-read every root file or recursively scan directories; follow the Coding Agent's normal instruction-discovery behavior and the task context. Once inside a surface, read only what the task needs.

- `openspec/constitution/` — enduring project principles and evolution directions
- `openspec/guidance/models/` — non-authoritative system-understanding models
- `openspec/operations/` — current Agent-facing operating guidance
- `openspec/` — project rules, active changes, accepted specs, and governance
- `docs/adr/` — on-demand durable architecture decisions
- `DEEP_RESEARCH_HARNESS/` — distributable framework and Agent-facing playbooks
- `tests/` — JS-led verification
- `experiments_playbook/` — Coding-Agent/Markdown-led experiments
- `experiments_env/` — frozen prototypes and experiment fixtures

## Do Not Read

Do not list, scan, or read these paths as task context unless the user explicitly identifies a concrete path:

- `node_modules/`
- `.env/`
- `_backlog/`
- `_temp/`
- `.exp-bundles/`, including lowercase `dpt_rb_*/` run-bundle directories

## Hard Rules

- Do not read `_old_topics` archives unless explicitly asked.
- Use Node.js >=20, pure JavaScript ESM (`.mjs`). No TypeScript. **Absolutely no Python.** Not for scripts, not for one-liners, not for prototyping — use Node.js for everything.
- Do not add dependencies. Approved npm deps only: `zod`, `yaml`; otherwise use Node built-ins.
- Use `node:test` + `node:assert` for JS-led tests.
- **Tests always under `tests/` at repo root, never inside `DEEP_RESEARCH_HARNESS/`.** `DEEP_RESEARCH_HARNESS/` is the distributable framework — framework code only, no test files, no experiment fixtures. Test dirs mirror framework dirs: `tests/engine/`, `tests/schema/`, etc.
- Test placement: `unit`, `integration`, and `deterministic_e2e` live under `tests/`; `agent_flow_e2e` lives under `experiments_playbook/`. Use the accepted `verification-routing` spec for classification.
- **OpenSpec phase gate: `DEEP_RESEARCH_HARNESS/` is read-only until `/opsx:apply`.** During propose/explore, work in `openspec/changes/` only. You may read anything for context; you may write only change artifacts (specs, design, tasks). Target code (`DEEP_RESEARCH_HARNESS/`, `tests/`, `experiments_playbook/`) is modified only during apply, per the approved task list. Deliberation fatigue does not grant an exception. 这是**生命周期 scope** 的只读（apply 前代码只读）；另有**运行时 scope** 的只读（run 期间不把 run 内容写回框架，见 `DEEP_RESEARCH_HARNESS/README.md`「目录性质」），两层不同，互相不替代。
- For a change whose `tasks.md` declares an `openspec-feedback:*` marker, supported apply/archive entries MUST obtain the matching current OpenSpec operation guidance before target edits or finalization. Record actionable findings as ordinary pending tasks. After Agent-owned semantic closeout and spec sync, use `node openspec/governance/finalize-change-archive.mjs --change <name>` as the only supported final archive transition.

## OpenSpec Workflow

Sequential phases — never skip ahead. If a phase is taking too long, surface the friction; don't jump to implementation.

| Phase | Command | Working Area |
|-------|---------|-------------|
| Propose | `/opsx:propose` | `openspec/changes/` — specs, design, tasks |
| Explore | `/opsx:explore` | `openspec/changes/` — investigate, clarify, refine |
| Apply | `/opsx:apply` | Target code — implement per approved task list |
| Archive | `/opsx:archive` | Finalize and archive |
