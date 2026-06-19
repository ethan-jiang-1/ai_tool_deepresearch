## Why

`experiments_playbook/` 是目前项目三层测试中最接近生产的中层——受控环境里用真实 bundle + 真实 engine code + trace 裁决做端到端验证。但现状有两个缺陷：coding agent 不知道自己就是 runner（playbook 不被当作"需要逐行执行的测试"，而只是"可以看看的文档"）；而且所有 playbook 没有成本标识——纯 JS E2E（分钟级）和 subagent spawn（十几分钟级）混在一起，无法按频次选择性跑。

## What Changes

- 每个 playbook 的 YAML frontmatter 新增 `weight: light | heavy` 字段，标识执行成本
- 新建 `experiments_playbook/RUN.md`，作为 coding-agent runner 入口——含 playbook 清单（按 weight 分组）、执行指令、failure 处理、和 report 格式。AI 打开这一个文件就全有，不需要再翻 INDEX
- `experiments/shared/new-disposable-bundle.mjs` 在 bundle 名后追加一位随机 hex 后缀（如 `dpt_disp_agq_simple_a`），防止同 case 重复跑时目录冲突
- 所有现有 playbook 的 cleanup step 改用 `$B` 变量或 glob 清除，不再重新调用 `new-disposable-bundle.mjs`
- 所有 playbook 的 trace 文件统一命名为 `_trace.jsonl`（原为各实验族不同命名：`_trace_agq_cli.jsonl`、`_trace_subagent.jsonl`、`_trace_gf_simple.jsonl` 等）——bundle 目录已物理隔离，不再需要差异化 trace 名
- 所有 playbook 的 verdict 输出统一使用 ANSI 颜色：绿色 `\x1b[32m` PASS、红色 `\x1b[31m` FAIL（gate-fork/gate-loop 已有此实践；agentic-queue/subagent/workflow-next 缺失；workflow-fsm escape 写法错误需修复）
- 实验族命名不减损现有 `exp_{name}/` 结构；只新增入口文件
- **BREAKING**: 无。bundle 名变化不影响任何现有 contract（`$B` 变量贯穿执行，frontmatter `bundle` 字段从精确路径变为前缀模式，仅作路由信息）

## Capabilities

### New Capabilities

- `playbook-runner`: coding agent 作为 playbook 的 runner——RUN.md 作为统一入口（含清单+指令+report），AI 打开即知跑哪些、怎么跑

### Modified Capabilities

- `agent-testing`: 所有现有 playbook frontmatter 新增 `weight` 字段；trace 文件统一命名为 `_trace.jsonl`；verdict 输出统一 ANSI 颜色；RUN.md 替代隐式的"Agent 自己遍历目录"模式（均为 ADDED——现有 AGT-001/002/003 的行为不变）

## Impact

- `experiments_playbook/RUN.md`（新增，含 playbook 清单 + runner 指令）
- `experiments/shared/new-disposable-bundle.mjs`（修改，加随机后缀）
- `experiments_playbook/exp_*/test-*.md`（修改 frontmatter 加 `weight` + trace 统一为 `_trace.jsonl` + verdict 统一 ANSI 颜色 + cleanup 改用 `$B`/glob）
- `openspec/specs/agent-testing/spec.md`（修改，新增 weight、bundle 唯一性、trace 统一、ANSI 颜色 scenario）
- `openspec/specs/playbook-runner/spec.md`（新增 main spec）
- `guidelines/command-experiments.md`（修改，新增 weight 字段、runner 基础设施、trace 统一命名、ANSI 颜色约定）
- `openspec/governance/req-registry.yaml`（新增 PLR-001, PLR-003, AGT-005/006/007/008）
- 现有 playbook 结构和执行方式不变——新字段纯增量
