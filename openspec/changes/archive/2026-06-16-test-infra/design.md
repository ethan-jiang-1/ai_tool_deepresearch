# Design: test-infra

## Context

实验和回归测试要物理隔离。实验是探索性的、理想化的、冻结的。回归测试是持续运行的保险网，随生产代码演进。

## Goals / Non-Goals

**Goals:**
- 建立 `experiments/` 和 `tests/` 根目录
- 创建 `tests/fixtures/` 最小 DPT_FRAMEWORK/ 测试框架
- 集成测试覆盖 check.mjs + inspect.mjs 的 JS↔MD 交互 (单元测试已在 schema-core 自测)

**Non-Goals:**
- 不写端到端测试
- 不迁移已有 prototype 到 experiments/（prototype 自己搞）
- 不建立 CI pipeline

## Decisions

### 1. 根目录结构

```
project-root/
  DPT_FRAMEWORK/                     ← 生产代码
  experiments/                       ← 原型实验 (冻结)
    prototype-gate-loop/
    prototype-gate-fork/
    prototype-start-from-here/
  tests/                             ← 回归测试 (演进)
    unit/                            ← (预留, 单元测试在 schema-core 自测)
    integration/                     ← JS+MD 交互, 真实 I/O
    fixtures/                        ← 测试用 mini framework
  dpt_rb_*/                          ← 运行时 bundle
```

### 2. 测试框架 (fixtures)

```
tests/fixtures/
  DPT_FRAMEWORK/
    schema/
      index.mjs                      ← barrel 导出 CONTROL_FILE_SCHEMAS
      enums.mjs                      ← 6 个 z.enum
      contracts/
        status.mjs                   ← StatusSchema
        queue.mjs                    ← QueueSchema
        profile.mjs                  ← ProfileSchema
        plan.mjs                     ← PlanSchema
        trace.mjs                    ← TraceSchema
        gate.mjs                     ← GateTransitionTable
    rb_templates/
      START_FROM_HERE.md.tmpl
      rb_plan.md.tmpl
      rb_profile.yaml.tmpl
      rb_status.json.tmpl
      rb_queue.json.tmpl
      rb_trace.jsonl                ← 空
    cli/
      check.mjs                      ← Zod 校验
      inspect.mjs                    ← 结构检查
```

### 3. 集成测试 (首批)

```
tests/integration/
  cli/
    check.test.mjs    ← 真实跑 node check.mjs <tempDir>
    inspect.test.mjs  ← 真实跑 node inspect.mjs <tempDir>
```

集成测试规则：
- 使用 `node:test` + `node:assert`
- 每个 test case 在 `fs.mkdtemp()` 创建独立临时目录
- 将 `tests/fixtures/DPT_FRAMEWORK/` 的 schema + cli 拷贝或 symlink 到临时目录
- 调用 `node check.mjs` / `node inspect.mjs`，断言退出码和输出
- 测试结束后自动清理临时目录

### 4. 运行方式

```bash
# 将 DPT_FRAMEWORK/ 下的 schema + cli + rb_templates symlink 到 fixtures
ln -s ../../../DPT_FRAMEWORK/schema tests/fixtures/DPT_FRAMEWORK/schema
ln -s ../../../DPT_FRAMEWORK/cli tests/fixtures/DPT_FRAMEWORK/cli
ln -s ../../../DPT_FRAMEWORK/rb_templates tests/fixtures/DPT_FRAMEWORK/rb_templates

# 跑集成测试
node --test tests/integration/**/*.test.mjs
# (单元测试已在 schema-core: node --test tests/schema/)
```

## Risks

- **[Risk] fixtures 和 DPT_FRAMEWORK/ 不同步** → Mitigation: 集成测试跑在 CI 里，不同步会立即暴露
- **[Risk] 临时目录清理失败** → Mitigation: 用 `fs.mkdtemp()` 系统级 temp，进程退出自动清
