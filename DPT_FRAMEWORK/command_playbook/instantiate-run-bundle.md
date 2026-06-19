# instantiate-run-bundle

Agent 命令：从 DPT_FRAMEWORK 生产一个新的 Runtime Bundle。

## 前置条件
- `DPT_FRAMEWORK/schema/` 存在
- `DPT_FRAMEWORK/rb_templates/` 存在
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` 存在
- npm 依赖已安装 (zod, yaml)

## 步骤

### 1. 定名
用户提供 bundle 名称 (kebab-case, 如 `ai-safety`)。目标目录: `dpt_rb_<name>/`。

### 2. 创建 Bundle
```bash
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>)
```
若目录已存在，报错退出。Production run bundle 不允许覆盖；换一个新的 bundle 名称。

### 3. 报告
```bash
echo "Bundle created: $B"
```

JS 脚本内部已完成：目录创建、模板替换（`{{name}}` → `<name>`）、Zod schema 校验、validate-bundle + inspect-bundle 质量检查。任何一步失败都会删除已创建目录并以非零退出码退出。
