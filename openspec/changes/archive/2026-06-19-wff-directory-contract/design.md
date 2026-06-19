## Context

Workflow Foundation 未来需要产出 ~50 个文件分布在 `DPT_FRAMEWORK/`、`tests/`、`experiments_playbook/` 三个根目录下。V12 时代的一个反复出现的失败模式是：需求文档、runtime state、实验结果、production CLI、模板草稿混放。这导致后续每个阶段都重新争夺 authority——什么东西该放哪个目录、什么文件能写不能写、gate result 能不能写回 framework。

当前 `guidelines/framework-runtime-boundary.md` 已经定了最高层边界（`DPT_FRAMEWORK/` = read-only framework assets，`dpt_rb_*/` = mutable runtime truth），但没有细化到 workflow foundation 引入的新 surface：workflow nodes、gate definitions、gate engine、gate CLI、phase manifest。本 design 在最高层边界之上，把 workflow foundation 所有新增 artifact 的落点一次性讲清楚。

约束：v1 只有一套 canonical Deep Research workflow，不需要多 workflow namespace。但同一套 `DPT_FRAMEWORK/` 必须服务多个互相隔离的 `dpt_rb_*` run bundle。

## Goals / Non-Goals

**Goals:**
- 定义 `DPT_FRAMEWORK/workflows/`、`DPT_FRAMEWORK/schema/gate_definitions/`、`DPT_FRAMEWORK/engine/gates/`、`DPT_FRAMEWORK/cli/gates/`、`tests/`、`experiments_playbook/` 和 `dpt_rb_*` 的边界
- 建立 artifact routing rules：每种 artifact 有且只有一个合法目录
- 建立命名约定：phase node、shared node、gate definition JSON、gate CLI、experiment family、runtime bundle 的标准命名
- 建立禁止混放清单（如 gate definition JSON 不进 workflow node 目录、runtime state 不写回 framework）

**Non-Goals:**
- 不定义 OpenSpec change 的目录和任务结构（那是 OpenSpec 的事）
- 不定义 gate definition JSON 的内部 schema（那是 `wff-contract-skeleton` 及后续的事）
- 不定义 node frontmatter 的 executable validator
- 不定义 `dpt_rb_*` 中每种 artifact 的字段 schema
- 不指定文件创建顺序
- 不创建任何实现文件（本 change 是治理层 artifact）

## Decisions

### D1: 两根边界（Framework ↔ Bundle）

**决策**：`DPT_FRAMEWORK/` = read-only framework assets；`dpt_rb_*/` = mutable runtime state/data/evidence/results。运行中发生的用户输入、gate attempt、pass/fail、repair、waiting/block、trace、artifact、final output 只能写入 active run bundle，不能写回 framework。

**理由**：这是 `guidelines/framework-runtime-boundary.md` 已经建立的边界。Workflow Foundation 不重新争议它，而是在此基础上细化子目录归属。

**替代方案**：把 gate result 写回 framework 做 "global cache" → 拒绝，因为多个 `dpt_rb_*` 同时运行时会产生竞态和污染。

### D2: Workflow nodes 归入 `DPT_FRAMEWORK/workflows/nodes/`

**决策**：
```
DPT_FRAMEWORK/workflows/
  manifest.json              ← phase manifest / lifecycle map
  nodes/
    phases/                   ← 9 个 phase node
    shared/                   ← 5 个 shared node
```

Phase node 命名 `phase-<phase>.md`（如 `phase-wave0.md`）。Shared node 命名 `shared-<scope>.md`（如 `shared-profile.md`）。

**理由**：Node 是 Agent-facing runtime workflow surface，属于 framework assets。Phase 和 shared 分目录是因为两类 node 的 metadata contract 不同：shared node 不能声明 `phase`/`gate`/`next`/`stop`。分目录让 loader 和 reviewer 一眼区分 lifecycle step vs context dependency。

**替代方案**：全部摊平在 `workflows/nodes/` 下 → 拒绝，因为无法快速区分 phase vs shared。

### D3: Gate definition JSON 归入 `DPT_FRAMEWORK/schema/gate_definitions/`

**决策**：
```
DPT_FRAMEWORK/schema/gate_definitions/
  gate-instantiation-complete.definition.json
  gate-hitl1-recorded.definition.json
  ...
  gate-readiness-passed.definition.json
```

命名 `gate-<gate-name-kebab>.definition.json`。

**理由**：Gate definition 是 read-only deterministic rule source，属于 framework definition，不从属于任何单个 run。放在 `schema/` 下与现有的 `contracts/` 同级，表示它也是 schema surface 的一部分（只是用 JSON 而非 Zod）。不放进 `workflows/nodes/` 是为了防止 prose summary 和 machine rule source 混放。

**替代方案**：放进 `DPT_FRAMEWORK/workflows/gate_definitions/` → 拒绝，因为 gate definition 是机器读取的 rule data，不是 Agent 读取的 Markdown workflow node。

### D4: Gate engine 与 Gate CLI 分离

**决策**：
- `DPT_FRAMEWORK/engine/gates/` — loader.mjs（读取 gate definition JSON）+ evaluator.mjs（执行 deterministic checks）
- `DPT_FRAMEWORK/engine/helpers/` — shared gate logic（如 gate-helpers.mjs）
- `DPT_FRAMEWORK/cli/gates/` — 8 个 thin CLI wrapper（`check-gate-<name>.mjs`）

**理由**：Engine 和 CLI 必须分开。Engine 是内部实现（loader + evaluator），CLI 是 Agent-facing 外部入口。内部 helpers 可以共享（避免 8 个 CLI 各自复制同一段逻辑），但外部入口保持 one gate per CLI——Agent 不需要知道内部共享了什么。

**替代方案**：统合为一个 "gate runner" 入口 + subcommand → 拒绝，因为 Agent 需要明确区分 "跑哪个 gate"；one tool per gate 在 Agent 视角更清晰。

### D5: 测试和实验分层

**决策**：
- `tests/` — regression tests（unit + integration），测 deterministic code behavior
- `experiments_playbook/exp_workflow-foundation/` — Agent-driven controlled E2E，测 Agent Flow + real bundle + trace-backed verdict

**理由**：`DPT_FRAMEWORK/` 内部不放测试文件。`tests/` 映射框架目录（`tests/engine/` ↔ `DPT_FRAMEWORK/engine/`）。Agent-driven E2E 不走 `tests/` 因为它依赖 Agent 执行，不是纯 deterministic 测试。

### D6: v1 单 workflow package

**决策**：v1 只有一个 canonical Deep Research workflow package，使用 `DPT_FRAMEWORK/workflows/manifest.json`，不引入 `workflows/<workflow-name>/` namespace。

**理由**：当前只有一个 workflow（Deep Research）。多 workflow namespace 是过度设计。但这个决策不限制 run bundle 数量——同一套 framework 仍要服务多个互相隔离的 `dpt_rb_*`。

### D7: 所有 gate CLI 显式接收 bundle path

**决策**：所有 gate CLI 必须显式接收 active bundle path（`--bundle <path>` 或等价 flag），不能假设当前工作目录就是一个 bundle 或只有一个 bundle。

**理由**：如果不要求显式传 bundle path，Agent 在有多个 `dpt_rb_*` 目录时容易跑错 bundle。这是 V12 "看起来在操作当前 bundle、实际工作目录不在那个 bundle" 问题的直接教训。

### D8: Bundle canonical structure 的命名和分组

**决策**：Active `dpt_rb_*` run bundle 的 control files 统一使用 `rb_` 前缀（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`）。Cache directory 使用下划线前缀 `_cache/` 表示非权威、可重建。`START_FROM_HERE.md` 用全大写命名作为醒目的启动入口。

Control files 按格式分组——人类可读的用 Markdown/YAML（plan、profile），机器读取的用 JSON/JSONL（status、queue、trace）。Data directories 按语义分组——输入数据（`seed_topics/`、`reference/`）、阶段产物（`artifacts/`）、最终交付（`final/`）。

**理由**：统一前缀让 reviewer 一眼区分 "这是 bundle control file" vs "这是任意 Markdown"。`_cache/` 下划线是文件系统惯例表示 "internal/temporary"——防止被当成 authoritative state。V12 时代文件名不统一（`PLAN.md`、`STATUS.md`、`PROFILE`）导致歧义。

**替代方案**：用 `plan.md` 而非 `rb_plan.md` → 拒绝，因为在 bundle 根目录 `plan.md` 容易和 node Markdown 或其他 prose 混。

### D9: 命名前缀策略

**决策**：六种 artifact 采用一致的语义前缀策略：
- `phase-<phase>.md` — Agent 执行的 lifecycle stage
- `shared-<scope>.md` — 跨 phase 复用的 context dependency
- `gate-<gate-name>.definition.json` — 机器读取的 gate rule data
- `check-gate-<gate-name>.mjs` — Agent 调用的 gate CLI 入口
- `dpt_rb_<slug>` — runtime bundle 目录
- `exp_<component>/` — experiment family

前缀选择原则：`phase-` 和 `shared-` 直接对应 `node_type` frontmatter 字段，消除文件名和 metadata 的不一致风险。`check-gate-` 用动词前缀暗示这是 Agent 主动调用的命令，区别于被动的 `gate-` definition data。`dpt_rb_` 前缀继承项目命名约定（`dpt_` = Deep Research Tool）。

**理由**：V12 的命名零散——有的用全大写、有的用下划线、有的没前缀。统一前缀让 filesystem listing 就能区分 artifact 类型，不依赖打开文件看 frontmatter。

## Risks / Trade-offs

- **[Risk] 目录 contract 没有被下游 wff change 遵守** → 本 change 的 tasks 中包含更新 `guidelines/framework-runtime-boundary.md`（或新建补充 guidance），并在后续 change review 时逐条对照 artifact routing rules。
- **[Risk] `DPT_FRAMEWORK/engine/gates/` vs `DPT_FRAMEWORK/cli/gates/` 边界在实践中模糊** → 如果内部 helper 变得足够复杂，它可以留在 `engine/helpers/`；CLI wrapper 必须是 thin wrapper（parse args → call engine → format output）。
- **[Risk] `shared-gate-rules.md` 被当成第二套 gate authority** → 在 node body 和 `shared-gate-rules.md` 中反复声明其 `authority: generated-summary`，从属于 Gate definition JSON 和 CLI output。
- **[Trade-off] v1 单 workflow package 以后如果扩展多 workflow 需要重构 `manifest.json`** → 接受。当前没有多 workflow 需求，提前引入 namespace 只会增加无谓复杂度。如果以后需要，manifest 加一个 `workflows` key 即可向后兼容。
