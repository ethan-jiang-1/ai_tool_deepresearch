# Design: prototype-start-from-here

## Context

DPT_FRAMEWORK/ 是已有的框架。当 `dpt_rb_{name}/` 不存在时，Agent 读取 `command_playbook/instantiate-run-bundle.md` 命令 playbook，按步骤生产 bundle。JS helper 脚本负责 Check (Zod) 和 Inspect (结构)。生产完成后，START_FROM_HERE.md 作为 Agent 入口。

## Goals / Non-Goals

**Goals:**
- 验证 Agent 通过 Markdown 命令 playbook 生产 `dpt_rb_{name}/`
- 验证 JS helper (check.mjs + inspect.mjs) 可被 Agent 调用做质量保障
- 验证 START_FROM_HERE.md 正确引用 DPT_FRAMEWORK/ 和 bundle 内控制文件
- 验证多 bundle 数据隔离

**Non-Goals:**
- 不实现传统 CLI
- 不连接 engine 逻辑

## Decisions

### 1. 根目录结构

```
project-root/
  DPT_FRAMEWORK/
    command_playbook/
      instantiate-run-bundle.md    ← Agent 读这个
    cli/
      check.mjs                    ← JS helper: Zod 校验
      inspect.mjs                  ← JS helper: 结构检查
    schema/
    rb_templates/
    COMMANDS.md
    AGENT_GUIDE.md
  dpt_rb_ai-safety/
  dpt_rb_supply-chain/
```

### 2. Bundle 内部结构

```
dpt_rb_{name}/
  START_FROM_HERE.md
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl
  seed_topics/
  reference/
  artifacts/
    wave1/
    wave2/
    README.md
  _cache/
  final/
  original_topic/           ← 可选
```

### 3. 生产流程：Agent 读 playbook → 调用 JS helper

Agent 打开 `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md`，照做：

```
1. 定名: name = "ai-safety" (用户提供)
2. 创建 dpt_rb_{name}/ 目录
3. 读 rb_templates/*.tmpl，替换 {{name}} → 写入 bundle
4. 创建 seed_topics/, reference/, artifacts/wave1/, artifacts/wave2/, _cache/, final/
5. 调用: node DPT_FRAMEWORK/cli/check.mjs dpt_rb_{name}/
   → PASS: 继续 / FAIL: 报错并 rm -rf
6. 调用: node DPT_FRAMEWORK/cli/inspect.mjs dpt_rb_{name}/
   → PASS: 继续 / FAIL: 报错并 rm -rf
7. 报告: "Bundle dpt_rb_{name}/ created"
```

### 4. JS helper: check.mjs

```javascript
// DPT_FRAMEWORK/cli/check.mjs
// 用法: node check.mjs <bundleDir>
//
// 逐个文件读取 → Zod safeParse → 输出 PASS 或 FAIL + 错误详情
//
// 退出码 0 = PASS, 1 = FAIL

import { CONTROL_FILE_SCHEMAS } from '../schema/index.mjs';

const bundleDir = process.argv[2];
let passed = 0, failed = 0;

for (const [file, spec] of CONTROL_FILE_SCHEMAS) {
  const raw = fs.readFileSync(path.join(bundleDir, file), 'utf-8');
  const parsed = spec.parse(raw);
  const result = spec.schema.safeParse(parsed);
  if (result.success) {
    console.log(`  ✓ ${file}`);
    passed++;
  } else {
    console.log(`  ✗ ${file}: ${result.error.issues.map(i => i.message).join(', ')}`);
    failed++;
  }
}
console.log(`Check: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

### 5. JS helper: inspect.mjs

```javascript
// DPT_FRAMEWORK/cli/inspect.mjs
// 用法: node inspect.mjs <bundleDir>
//
// 检查目录结构完整性 → 输出 PASS 或 FAIL + 缺失项
//
// 退出码 0 = PASS, 1 = FAIL

const REQUIRED = [
  'START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml',
  'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl',
  'seed_topics/', 'reference/', 'artifacts/wave1/', 'artifacts/wave2/',
  '_cache/', 'final/',
];

const bundleDir = process.argv[2];
const missing = REQUIRED.filter(f => !fs.existsSync(path.join(bundleDir, f)));
if (missing.length > 0) {
  console.log(`Inspect: missing ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Inspect: directory structure complete');
```

### 6. CONTROL_FILE_SCHEMAS

```javascript
const CONTROL_FILE_SCHEMAS = new Map([
  ['rb_status.json',  { schema: StatusSchema,  parse: JSON.parse }],
  ['rb_queue.json',   { schema: QueueSchema,   parse: JSON.parse }],
  ['rb_profile.yaml', { schema: ProfileSchema, parse: yaml.parse }],
  ['rb_plan.md',      { schema: PlanSchema,    parse: parseMdFrontmatter }],
  ['rb_trace.jsonl',  { schema: TraceSchema,   parse: (s) => s.trim() === '' ? [] : s.trim().split('\n').map(JSON.parse) }],
]);
```

### 7. 启动入口：START_FROM_HERE.md

```markdown
# Start from here

本目录是一个 Deep Research Runtime Bundle。
框架位于 `../DPT_FRAMEWORK/` (共享, 只读, 不修改)。

## 控制文件
- rb_plan.md       — 话题设计 (Markdown + JSON frontmatter)
- rb_profile.yaml  — 用户意图 (YAML)
- rb_status.json   — 运行时状态 (JSON)
- rb_queue.json    — 执行队列 (JSON)
- rb_trace.jsonl   — 诊断日志 (JSON Lines, 追加式)

## 数据目录
- seed_topics/  reference/  artifacts/  _cache/  final/

## 规则
- 不要修改 ../DPT_FRAMEWORK/ 中的任何文件
- 停止授权: 仅 final_delivery / decision_blocker / empty_queue_after_refill
- Gate 过渡前 reload 所有控制文件
```

### 8. 多 Bundle 隔离

```javascript
const bundleA = await loadBundle('dpt_rb_ai-safety');
const bundleB = await loadBundle('dpt_rb_supply-chain');
// 各自独立，共享同一份 ../DPT_FRAMEWORK/
```

## Risks

- **[Risk] Agent 误写 Framework** → Mitigation: playbook 和 START_FROM_HERE.md 双重声明只读
- **[Risk] Schema 与 check.mjs 不同步** → Mitigation: 同一份 schema/index.mjs 被 templates 和 check.mjs 共享引用
