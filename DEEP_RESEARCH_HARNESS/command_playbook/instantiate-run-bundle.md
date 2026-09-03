# instantiate-run-bundle

Agent 命令：从 Deep Research Harness 生产一个新的 run bundle。

## 前置条件
- `DEEP_RESEARCH_HARNESS/schema/` 存在
- `DEEP_RESEARCH_HARNESS/rb_templates/` 存在
- `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs` 存在
- 已运行 `npm install`（依赖 zod, yaml）

## 步骤

### 1. 定名
Agent 从 research request 派生稳定的 kebab-case bundle 名称，或使用 Harness execution 开始前已提供的名称（如 `ai-safety`）。不要在 autonomous execution 中要求用户提供名称。目标目录: `dpt_rb_<name>/`。

### 2. 创建 Bundle
```bash
B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>)
```
若目录已存在，报错退出。Production run bundle 不允许覆盖。

**创建前 sibling 预检**：CLI 会扫描目标目录下已存在的 `dpt_rb_*` bundle。当有一个名字前缀相关的（如 `x` vs `x-v2`）或处于非 Final 状态的 sibling 时，CLI 会拒绝创建并要求用户同意。Agent 须在此处停止，向用户呈现 sibling 局面与三个合法去向：

1. 继续使用现有 bundle（如果研究意图一致）。
2. 通过 accepted recovery 路径（ReopenResearchPass）重新进入现有 bundle。
3. 用户同意后创建新 bundle：Agent 带上 `--acknowledge-existing-bundle <sibling-name>` 参数重跑创建命令。

新 bundle 会包含 `BUNDLE_ENTRY.md`、`BUNDLE_MAP.md` passive bundle map、5 个 `rb_*` control files、canonical scaffold directories、reference/cache/log/scripts scaffolds（含 `_scripts/`——run-scoped 辅助脚本的规范落点：本 run 自产的 executor/生成器/恢复脚本必须写入 bundle `_scripts/`，不得写入 repo 根或 `DEEP_RESEARCH_HARNESS/`；它是 non-authority 运行时区域，与 `_logs/`/`_cache/` 同类，不进入 gate 判定）。第 6 个 ledger 文件 `rb_output_declarations.jsonl` 由 Engine 在首次成功 `submit` 时惰性创建，不属于实例化时点内容；新 bundle 尚无此文件不构成漂移。`BUNDLE_ENTRY.md` 只提供 creation-time Harness navigation；`BUNDLE_MAP.md` 只用于 reload/navigation；两者都不是 lifecycle phase node、`RUN.md` 替代品、command playbook 或 Gate authority。stdout 给出本次操作的 canonical absolute current run bundle root。

### 3. 报告
```bash
echo "Bundle created: $B"
```

JS 脚本内部已完成：目录创建、模板替换（`{{name}}` → `<name>`）、Zod schema 校验、validate-bundle + inspect-bundle 质量检查。任何一步失败都会删除已创建目录并以非零退出码退出。
