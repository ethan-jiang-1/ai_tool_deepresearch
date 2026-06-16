# instantiate-run-bundle

Agent 命令：从 DPT_FRAMEWORK 生产一个新的 Runtime Bundle。

## 前置条件
- `DPT_FRAMEWORK/schema/` 存在
- `DPT_FRAMEWORK/rb_templates/` 存在
- npm 依赖已安装 (zod, yaml)

## 步骤

### 1. 定名
用户提供 bundle 名称 (kebab-case, 如 `ai-safety`)。目标目录: `dpt_rb_<name>/`。
若目录已存在，报错退出，不覆盖。

### 2. 创建目录
```bash
mkdir -p dpt_rb_<name>/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}
```

### 3. 从模板生成控制文件
读取 `DPT_FRAMEWORK/rb_templates/*.tmpl`，将 `{{name}}` 替换为 bundle 名称，写入 `dpt_rb_<name>/`：
- `START_FROM_HERE.md.tmpl` → `dpt_rb_<name>/START_FROM_HERE.md`
- `rb_plan.md.tmpl` → `dpt_rb_<name>/rb_plan.md`
- `rb_profile.yaml.tmpl` → `dpt_rb_<name>/rb_profile.yaml`
- `rb_status.json.tmpl` → `dpt_rb_<name>/rb_status.json`
- `rb_queue.json.tmpl` → `dpt_rb_<name>/rb_queue.json`
- `rb_trace.jsonl` → `dpt_rb_<name>/rb_trace.jsonl` (copy as-is, empty)

### 4. 质量检查 — Check
```bash
node DPT_FRAMEWORK/cli/check.mjs dpt_rb_<name>/
```
退出码 0 = PASS。非 0 = FAIL，删除 bundle 目录 (`rm -rf dpt_rb_<name>/`)，报告错误。

### 5. 质量检查 — Inspect
```bash
node DPT_FRAMEWORK/cli/inspect.mjs dpt_rb_<name>/
```
退出码 0 = PASS。非 0 = FAIL，删除 bundle 目录，报告缺失项。

### 6. 报告
```
Bundle dpt_rb_<name>/ created.
  ✓ 6 control files (plan, profile, status, queue, trace, START_FROM_HERE)
  ✓ 6 data directories (seed_topics, reference, artifacts, _cache, final)
  Check: all files passed Zod validation
  Inspect: directory structure complete
```
