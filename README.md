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
- Project guidance, philosophy, error tolerance, experiment rules: `guidelines/`
- Project rules and architecture context: `openspec/config.yaml`
- Current active work: `openspec/changes/`
- Accepted requirements/specs: `openspec/specs/`
- Requirement tracking checks: `openspec/governance/`
- Runtime framework and agent playbooks: `DPT_FRAMEWORK/` (`validate-bundle.mjs`, `inspect-bundle.mjs`)
- Frozen prototypes and experiment fixtures: `experiments_env/`

## Directory Map

| Directory | What it is |
|-----------|------------|
| `DPT_FRAMEWORK/` | 可发行框架：engine、schema、CLI、trace writer、command playbook。不放测试 |
| `DPT_FRAMEWORK/engine/` | 生产级确定性 engine（queue-manager, gate-loop, gate-fork, ...） |
| `experiments_playbook/exp_*/` | Agent 驱动的受控端到端 playbook |
| `experiments_env/shared/` | 实验共享工具（如 `new-disposable-bundle.mjs`），不进生产 |
| `experiments_env/prototype-*/` | 已冻结原型：仅 fixture + 笔记，不含 engine/trace/CLI 代码 |
| `tests/` | 回归测试：单元测试 + 集成测试，`node:test` + `node:assert` |
| `openspec/` | Spec-driven development：specs、changes、governance、config |
| `guidelines/` | 项目原则、层级边界、实验规范、机制草案 |

## Test Layering

Use `npm test` for the full regression suite. It is intentionally scoped to `tests/**/*.test.mjs`; bare `node --test` from the repo root may discover archived OpenSpec artifacts outside `tests/`. See `tests/README.md` and the README files in each test layer for focused commands.

| 层 | 位置 | 性质 |
|---|------|------|
| 回归测试 | `tests/` | 单元测试（零 I/O）+ 集成测试（真实文件 I/O），跑在 `node:test` 下 |
| 受控端到端 | `experiments_playbook/exp_*/` | Agent 驱动 playbook，真实 disposable bundle，trace 裁决 |
| 真实环境端到端 | — | 生产 `dpt_rb_*` 上真实 Agent/subagent 执行，暂时搁置 |

## Rules In One Screen

- Node.js >=20, pure JavaScript ESM (`.mjs`).
- Only approved npm deps: `zod`, `yaml`.
- Everything else uses Node built-ins.
- Tests use `node:test` + `node:assert`.
- `_original_*` directories are archives; read them only when explicitly requested.
- `DPT_FRAMEWORK/` is read-only until a change reaches `/opsx:apply`.
