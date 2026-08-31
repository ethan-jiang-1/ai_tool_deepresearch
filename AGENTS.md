# AGENTS.md

Coding-agent notes for this repo. Keep this file short; detailed rules live in OpenSpec.

## 0. Execution Brief

拿到用户这一轮话，只走一行。打开写出的那个文件；打开了，这步就完成。

| 这一轮是 | 打开 | 完成 | 此刻不要 |
|---|---|---|---|
| 研究 / 续跑 / 报告 | 用户给了可达 bundle（目录或其中的文件）→ `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` 的 **Entry Selection (canonical)**。没给 → `DEEP_RESEARCH_HARNESS/RUN.md` | 该文件已在上下文 | 搜、`research` / `deep-research`、WebFetch、手工综合 evidence |
| 改行为 / 新契约 / 动框架 | `openspec/constitution/project-charter.md`，再打开该能力的 owner spec | change 已在，或 spec 已打开 | apply 前改 `DEEP_RESEARCH_HARNESS/` |
| 已有 phase / `tasks.md` / CLI `next` | 反馈指名的那一页 | 执行了那一个下一步 | 回头重读章程 |

术语打架：打开根 `CONTEXT.md` 对应行，不要通读。下一步取决于所有权 / 架构词汇时，先 Charter 再 `CONTEXT.md`。
不变量按需：`openspec/guidance/models/invariants-brief.md`（非权威、每条可机器验证或指向唯一真相源；其余指引 lazy-load）。

## Deep Research Routing

For selected Deep Research Harness research, entry selection has exactly one canonical statement: the "Entry Selection (canonical)" section of `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`. This block is a pointer, not a restatement. The stop named `unsupported_current_entry_contract` is defined only in that section.

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
- `.exp-bundles/`, and any lowercase `dpt_rb_*/` or `dpt_disp_*/` run-bundle directory anywhere in the repository (run bundles are runtime state, not task context)

## Hard Rules

- Do not read `_old_topics` archives (under `_backlog/_done/`, including `_original_*` subdirectories) unless explicitly asked.
- **Run-scoped helper scripts（work-unit executor / 生成器 / 恢复脚本）必须写入 current run bundle root 的 `_scripts/`**，禁止写入 repo 根（如 `.wu*-*.mjs`、`.gen-*.mjs`）或 `DEEP_RESEARCH_HARNESS/`。`_scripts/` 是 non-authority 运行时区域，随 bundle 归档。
- A verified selected bundle directory is the current run bundle root; bare runtime paths always resolve under that root.
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
