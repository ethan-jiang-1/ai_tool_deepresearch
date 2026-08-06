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
若目录已存在，报错退出。Production run bundle 不允许覆盖；Agent 派生新的 collision-safe 名称后重试，或使用 entry 前已提供的替代名称。

新 bundle 会包含 `BUNDLE_ENTRY.md`、`BUNDLE_MAP.md` passive bundle map、5 个 `rb_*` control files、canonical scaffold directories、reference/cache/log scaffolds。`BUNDLE_ENTRY.md` 只提供 creation-time Harness navigation；`BUNDLE_MAP.md` 只用于 reload/navigation；两者都不是 lifecycle phase node、`RUN.md` 替代品、command playbook 或 Gate authority。stdout 给出本次操作的 canonical absolute current run bundle root。

### 3. 报告
```bash
echo "Bundle created: $B"
```

JS 脚本内部已完成：目录创建、模板替换（`{{name}}` → `<name>`）、Zod schema 校验、validate-bundle + inspect-bundle 质量检查。任何一步失败都会删除已创建目录并以非零退出码退出。
