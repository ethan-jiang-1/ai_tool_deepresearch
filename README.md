# ai_tool_deepresearch

Spec-driven rewrite of a Deep Research Tool: broad question in, evidence-backed gated research report out.

## Setup

```bash
git clone <repo-url>
cd ai_tool_deepresearch
npm install
```

Before triggering `DPT_FRAMEWORK/RUN.md`, complete the human preflight in [`SETUP.md`](SETUP.md) so Node dependencies and Coding Agent permissions are chosen deliberately.

## Start Here

- **⚠️ This is an agent engineering project, not a traditional program.** Read `guidelines/project-charter.md` first, especially when direction or layer ownership is unclear.
- Start from the repository root and choose the top-level surface relevant to the task. Do not pre-read every root document or recursively scan directories; use the Coding Agent's normal instruction-discovery behavior and the task context.

## Directory Map

| Directory | What it is |
|-----------|------------|
| `guidelines/` | 项目原则、层级边界与操作指引 |
| `openspec/` | Spec-driven development：规则、changes、specs 与 governance |
| `DPT_FRAMEWORK/` | 可发行框架与 Agent-facing playbooks |
| `tests/` | JS-led verification |
| `experiments_playbook/` | Coding-Agent/Markdown-led experiments |
| `experiments_env/` | 已冻结原型与实验 fixture |

## Do Not Read

Do not list, scan, or read these paths as task context unless the user explicitly identifies a concrete path:

- `node_modules/`
- `.env/`
- `_backlog/`
- `_temp/`
- `.exp-bundles/`, including lowercase `dpt_rb_*/` run-bundle directories

## Test Layering

Use `npm test` for the full regression suite. It is intentionally scoped to `tests/**/*.test.mjs`; bare `node --test` from the repo root may discover archived OpenSpec artifacts outside `tests/`. See `tests/README.md` and the README files in each test layer for focused commands.

| 层 | 位置 | 性质 |
|---|------|------|
| `unit` | focused `tests/` paths | focused in-process contract |
| `integration` | `tests/integration/` | production CLI/subprocess or owned-surface boundary |
| `deterministic_e2e` | `tests/e2e/` | JS-led workflow-scale deterministic chain |
| `agent_flow_e2e` | `experiments_playbook/exp_*/` | coding-Agent/Markdown-led playbook over a real disposable bundle |

Classification and proof permissions are defined by the accepted `verification-routing` spec.

## Rules In One Screen

- Node.js >=20, pure JavaScript ESM (`.mjs`).
- Only approved npm deps: `zod`, `yaml`.
- Everything else uses Node built-ins.
- Tests use `node:test` + `node:assert`.
- `_original_*` directories are archives; read them only when explicitly requested.
- `DPT_FRAMEWORK/` is read-only until a change reaches `/opsx:apply`.
