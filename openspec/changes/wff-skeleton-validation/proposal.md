## Why

`wff-contract-skeleton` 创建了 31 个骨架文件——14 node MD、manifest、8 gate JSON、8 CLI stub。但没有任何东西证明这些骨架可以真正串联成 lifecycle loop。如果等到 `wff_content-*` 填真实逻辑后再验证，gate evaluation、node loading、retry/escalation 三层逻辑交织在一起，排错极困难。

这个 change 在真实逻辑上之前做三件事：建 logger（让所有 engine 代码有诊断能力）、修 workflow-chain（让 engine 能加载我们的 skeleton node）、写 lifecycle walker（端到端跑通 instantiation → final，demonstrate fail → repair → pass）。跑完后每个 phase/gate/trace 链条都被验证过，`wff_content-*` 只需要往已验证的壳里填内容。

## What Changes

**Layer 1 — Logger 基础设施：**
- 新增 `DPT_FRAMEWORK/engine/logger.mjs` — 极简结构化 logger
  - 默认 `createLogger()` → console only，零配置
  - 高级 `createLogger({ file: '...' })` → console + 文件双写
  - 四个 level：`debug`/`info`/`warn`/`error`，默认 `info`
  - 零依赖，API 与 `trace.mjs` 对称

**Layer 2 — Engine 兼容：**
- 修复 `DPT_FRAMEWORK/engine/workflow-chain.mjs`：
  - `nodePath()` 允许 `phases/`、`shared/` 子目录
  - `parseFrontmatter()` 兼容 YAML 子集
  - 所有公共函数注入 `logger` optional parameter（silent no-op 当 `null`）

**Layer 3 — Lifecycle 通路示范：**
- 新增 `DPT_FRAMEWORK/cli/walk-lifecycle.mjs` — lifecycle walker
  - `--bundle <path>` 必选，`--manifest <path>` 可选（默认 `DPT_FRAMEWORK/workflows/manifest.json`）
  - 读 manifest → 逐 phase 加载 node → spawn gate CLI → 解析 JSON → trace + log → advance
- 实现一个真实 gate：`instantiation_complete`
  - 修改 `check-gate-instantiation-complete.mjs`，增加最小 rule（检查 control files 存在）
  - 更新 `gate-instantiation-complete.definition.json`，替换 placeholder rule
  - Walker 故意缺文件 → gate fail → repair 补文件 → rerun → pass（证明 bounded repair loop）

## Capabilities

### New Capabilities

- `logger`: 极简结构化 logging 基础设施。默认零配置（`createLogger()` → console only），高级按需开文件（`createLogger({ file: '...' })`）。四个 level（debug/info/warn/error），零依赖，API 与 `trace.mjs` 对称。注入 pattern：`logger = null` silent no-op。
- `lifecycle-walker`: Lifecycle 通路示范工具。读 `manifest.json`，逐 phase 加载 node frontmatter，spawn gate CLI，记录 trace + log，advance 到下一 phase。包含至少一个 gate 的真实 fail → repair → pass 闭环。

### Modified Capabilities

- `gate-skeleton`: `instantiation_complete` gate 从 placeholder 升级为最小真实 rule（检查 control files 存在性）。其余 7 个 gate 保持 placeholder。
- `workflow-node-contract`: `workflow-chain.mjs` 获得子目录支持、YAML frontmatter 兼容、logger 注入——不改变 node metadata contract，只改变 engine 的加载能力。

## Impact

- **新文件（framework）**：`DPT_FRAMEWORK/engine/logger.mjs`、`DPT_FRAMEWORK/cli/walk-lifecycle.mjs`
- **新文件（experiment）**：`experiments/prototype-wff-validation/EXPERIMENT.md`、`experiments_playbook/exp_wff_validation/test-simple-happy-path.md`、`experiments_playbook/exp_wff_validation/test-medium-fail-repair.md`
- **修改文件（framework）**：`DPT_FRAMEWORK/engine/workflow-chain.mjs`（nodePath + parseFrontmatter + logger 注入）、`DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs`（真实 logic）、`DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json`（真实 rule）
- **修改文件（experiment）**：`experiments_playbook/RUN.md`（Light 表格追加两条 wff-validation entry）
- **依赖**：`wff-directory-contract` + `wff-contract-skeleton`（目录和骨架已就位）
- **约束后续 change**：`wff_content-*` 遵循已验证的 gate CLI shape 和 workflow-chain 加载模式，沿用 `prototype-wff-*` ↔ `exp_wff_*` 配对 convention
- **不负责**：其余 7 个 gate 的完整 logic、node body 完整内容、完整 research quality
