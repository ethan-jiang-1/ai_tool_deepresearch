# ai_tool_deepresearch

Spec-driven rewrite of a Deep Research Tool: broad question in, evidence-backed gated research report out.

## Setup

```bash
git clone <repo-url>
cd ai_tool_deepresearch
npm install
```

Before triggering `DEEP_RESEARCH_HARNESS/RUN.md`, complete the human preflight in [`SETUP.md`](SETUP.md) so Node dependencies and Coding Agent permissions are chosen deliberately.

## Start Here

- Agent 过程：打开 [`AGENTS.md`](AGENTS.md) 的 `## 0. Execution Brief`，按本轮用户话只走一行。
- 下一步取决于所有权 / 架构词汇时（改行为 / 新契约 / 动框架，或术语打架）：先读 `openspec/constitution/project-charter.md`，再读 [`CONTEXT.md`](CONTEXT.md)。`CONTEXT.md` 是 non-authoritative glossary；normal instruction-discovery behavior 与 task-specific authoritative sources 仍决定工作。跑研究或执行已有 phase / `tasks.md` / CLI `next` 时，不要先 Charter-then-context。
- For a durable architecture rationale, consult [`docs/adr/`](docs/adr/) on demand. It is not another mandatory pre-task read.
- Start from the repository root and choose the top-level surface relevant to the task. Do not pre-read every root document or recursively scan directories; use the Coding Agent's normal instruction-discovery behavior and the task context.
- 语言约定（全仓库控制面）：精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文，同一控制面内不混用两套主语言。新写的推理正文用中文；已有英文控制面逐步归一，不强行一次全改。

## Directory Map

| Directory | What it is |
|-----------|------------|
| `openspec/constitution/` | 持久项目原则与 Evolution Directions |
| `openspec/guidance/models/` | 非权威的系统理解模型 |
| `openspec/operations/` | 当前 Agent-facing 操作指引 |
| `openspec/` | Spec-driven development：规则、changes、specs 与 governance |
| `docs/adr/` | 按需查阅的持久架构决策 |
| `DEEP_RESEARCH_HARNESS/` | 可发行框架与 Agent-facing playbooks |
| `tests/` | JS-led verification |
| `experiments_playbook/` | Coding-Agent/Markdown-led experiments |
| `experiments_env/` | 已冻结原型与实验 fixture |

## Do Not Read

Do not list, scan, or read these paths as task context unless the user explicitly identifies a concrete path:

- `node_modules/`
- `.env/`
- `_backlog/`
- `_temp/`
- `.exp-bundles/`, and any lowercase `dpt_rb_*/` or `dpt_disp_*/` run-bundle directory anywhere in the repository (run bundles are runtime state, not task context)
- `openspec/changes/archive/` (archived change artifacts are historical record, not current behavior, task context, or authority; open one only when the user explicitly asks for archive or history lookup, and treat its search hits as historical rather than current accepted behavior)

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
- No TypeScript. Absolutely no Python.
- Only approved npm deps: `zod`, `yaml`.
- Everything else uses Node built-ins.
- Tests use `node:test` + `node:assert`.
- `_old_topics` 归档（位于 `_backlog/_done/`，含 `_original_*` 子目录）除非显式要求否则不读。
- `DEEP_RESEARCH_HARNESS/` is read-only until a change reaches `/opsx:apply`.
