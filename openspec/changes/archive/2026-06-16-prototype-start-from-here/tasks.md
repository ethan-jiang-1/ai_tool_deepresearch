# Tasks: prototype-start-from-here

## 1. 依赖和目录

- [x] 1.1 `npm install yaml` (profile.yaml 解析需要)
- [x] 1.2 确认 schema-core 已就绪 (`DPT_FRAMEWORK/schema/` 存在)

## 2. 模板文件

- [x] 2.1 创建 `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl` (含 {{name}})
- [x] 2.2 创建 `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` (MD + JSON frontmatter, 含 {{name}})
- [x] 2.3 创建 `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` (含 {{name}})
- [x] 2.4 创建 `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl`
- [x] 2.5 创建 `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl`
- [x] 2.6 创建 `DPT_FRAMEWORK/rb_templates/rb_trace.jsonl` (空文件)

## 3. 命令 playbook

- [x] 3.1 创建 `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md`

## 4. JS helper — check.mjs + inspect.mjs

- [x] 4.1 实现 `DPT_FRAMEWORK/cli/check.mjs`：逐文件 Zod safeParse，退出码 0/1
- [x] 4.2 实现 `DPT_FRAMEWORK/cli/inspect.mjs`：检查必需文件/目录，退出码 0/1
- [x] 4.3 手动验证 check.mjs 对合法 bundle 返回 0，对无效 bundle 返回 1
- [x] 4.4 手动验证 inspect.mjs 对完整目录返回 0，对缺失目录返回 1

## 5. Agent 入口文件

- [x] 5.1 创建 `DPT_FRAMEWORK/AGENT_GUIDE.md` (Agent 守则)
- [x] 5.2 创建 `DPT_FRAMEWORK/COMMANDS.md` (命令索引)

## 6. 手动验证（Claude 在 session 里跑，无需测试框架）

- [x] 6.1 Agent 按 playbook 创建 `dpt_rb_test/` → 目录存在，6 文件 + 6 目录
- [x] 6.2 Agent 再创建同名 bundle → playbook 指示报错 "already exists"
- [x] 6.3 Agent 篡改 rb_status.json 模板 → `node check.mjs` → FAIL (退出码 1)
- [x] 6.4 Agent 删掉 final/ → `node inspect.mjs` → FAIL (退出码 1)
- [x] 6.5 Agent 验证 `START_FROM_HERE.md` 内容正确 (framework path, rb_*, rules)
- [x] 6.6 Agent 验证隔离：dpt_rb_a 和 dpt_rb_b 互不影响
- [x] 6.7 `EXPERIMENT.md` 记录结论
