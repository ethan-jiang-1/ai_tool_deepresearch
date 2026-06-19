> req: WNC-006

## MODIFIED Requirements

### Requirement: Skeleton completeness criteria

骨架阶段不要求 body 有完整内容。每个 skeleton file SHALL 满足：

- Frontmatter 可被正则提取并解析（YAML 子集或 JSON）
- Agent 能从 frontmatter 确定 `node_type`、`id`、gate/next/stop（phase 适用）或 shared_scope/authority（shared 适用）
- CLI skeleton 可被 `node` 执行且返回合法 JSON
- Gate definition JSON 可被 `JSON.parse` 且包含 `gate`、`description`、`rules` 字段

**新增**：`workflow-chain.mjs` SHALL 能通过 `assessNode()` 加载 `phases/` 和 `shared/` 子目录下的 node 文件，并正确解析其 YAML 子集 frontmatter。

#### Scenario: Workflow-chain loads phase node from subdirectory

- **WHEN** `assessNode('phases/phase-wave0.md', state, runtime)` 被调用
- **THEN** `nodePath()` SHALL 解析到 `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`（当 `NODES_DIR` 指向正确路径时）
- **AND** `parseFrontmatter()` SHALL 正确提取 `node_type: phase`、`gate: wave0_complete` 等字段

#### Scenario: Skeleton is parseable not functional (unchanged)

- **WHEN** `check-gate-wave0-complete.mjs` 被 `node` 执行且 `--bundle` 参数提供
- **THEN** 脚本 MUST 返回合法 JSON，MUST NOT 因 `import` 错误或语法错误而崩溃

#### Scenario: Skeleton phase node is loadable (unchanged)

- **WHEN** loader 打开 `phase-wave0.md`
- **THEN** frontmatter MUST 可解析为合法 key-value pairs，`node_type` MUST 为 `phase`
