# Tasks: prototype-start-from-here

## 1. 实验目录和 DPT_FRAMEWORK/ 骨架

- [ ] 1.1 创建 `experiments/prototype-start-from-here/` 目录结构
- [ ] 1.2 创建 `DPT_FRAMEWORK/schema/enums.mjs`：CurrentGate, StopAuthorizationState, QueueHealth, RunState, ResearchProfile（5 个 z.enum）
- [ ] 1.3 创建 `DPT_FRAMEWORK/schema/contracts/status.mjs`：rb_status.json 的 Zod schema
- [ ] 1.4 创建 `DPT_FRAMEWORK/schema/contracts/queue.mjs`：rb_queue.json 的 Zod schema
- [ ] 1.5 创建 `DPT_FRAMEWORK/schema/contracts/profile.mjs`：rb_profile.yaml 的 Zod schema
- [ ] 1.6 创建 `DPT_FRAMEWORK/rb_templates/` 下 6 个模板文件（含 {{name}} 占位符）：START_FROM_HERE.md.tmpl, rb_plan.md.tmpl, rb_profile.yaml.tmpl, rb_status.json.tmpl, rb_queue.json.tmpl, rb_trace.jsonl（空）
- [ ] 1.7 创建 `DPT_FRAMEWORK/COMMANDS.md` 和 `DPT_FRAMEWORK/AGENT_GUIDE.md`

## 2. 命令 playbook

- [ ] 2.1 创建 `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md`：Agent 读的 Markdown 操作步骤

## 3. JS helper — check.mjs

- [ ] 3.1 创建 `DPT_FRAMEWORK/schema/index.mjs`：barrel 导出 CONTROL_FILE_SCHEMAS
- [ ] 3.2 实现 `DPT_FRAMEWORK/cli/check.mjs`：逐文件 Zod safeParse，退出码 0/1

## 4. JS helper — inspect.mjs

- [ ] 4.1 实现 `DPT_FRAMEWORK/cli/inspect.mjs`：检查必需文件/目录存在，退出码 0/1

## 5. Templates + Bundle 生产

- [ ] 5.1 创建 `DPT_FRAMEWORK/rb_templates/` 下 6 个模板文件（含 {{name}} 占位符）
- [ ] 5.2 Agent 按 playbook 读取模板、替换 {{name}}、写入 `dpt_rb_{name}/`
- [ ] 5.3 生成 rb_plan.md（MD+JSON frontmatter）、rb_profile.yaml、rb_status.json、rb_queue.json、rb_trace.jsonl（空）、START_FROM_HERE.md
- [ ] 5.4 创建数据目录：`seed_topics/`, `reference/`, `artifacts/wave1/`, `artifacts/wave2/`, `_cache/`, `final/`

## 6. 多 Bundle 隔离

- [ ] 6.1 Agent 按 playbook 创建两个 bundle：`dpt_rb_a` 和 `dpt_rb_b`
- [ ] 6.2 Agent 修改 `dpt_rb_a/rb_status.json` → 验证 `dpt_rb_b` 不受影响

## 7. 手动验证（Claude 在 session 里跑）

- [ ] 7.1 Agent 按 playbook 创建 `dpt_rb_test-bundle/` → 目录存在，6 文件 + 6 目录
- [ ] 7.2 Agent 再创建同名 bundle → playbook 指示报错 "already exists"
- [ ] 7.3 Agent 篡改模板 → 跑 `node check.mjs` → FAIL (退出码 1)
- [ ] 7.4 Agent 删掉 final/ → 跑 `node inspect.mjs` → FAIL (退出码 1)
- [ ] 7.5 Agent 验证 `START_FROM_HERE.md` 含 correct refs (framework path, rb_* files, rules)
- [ ] 7.6 Agent 验证隔离：a 和 b 互不影响
- [ ] 7.7 `EXPERIMENT.md` 记录结论
