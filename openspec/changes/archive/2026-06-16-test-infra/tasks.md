# Tasks: test-infra

## 1. 目录结构

- [x] 1.1 创建根目录 `experiments/`、`tests/unit/`、`tests/integration/`、`tests/fixtures/`
- [x] 1.2 更新 `config.yaml`：根目录约定补充 experiments/ 和 tests/，新增测试策略段

## 2. 测试框架 (fixtures)

- [x] 2.1 复制或 symlink `DPT_FRAMEWORK/schema/` → `tests/fixtures/DPT_FRAMEWORK/schema/`
- [x] 2.2 复制 `DPT_FRAMEWORK/rb_templates/` → `tests/fixtures/DPT_FRAMEWORK/rb_templates/`
- [x] 2.3 复制或 symlink `DPT_FRAMEWORK/cli/check.mjs` + `inspect.mjs` → `tests/fixtures/DPT_FRAMEWORK/cli/`

## 3. 集成测试 (依赖 schema-core + prototype-start-from-here)

- [x] 3.1 `tests/integration/cli/check.test.mjs`：合法 bundle → exit 0, 非法 → exit 1
- [x] 3.2 `tests/integration/cli/inspect.test.mjs`：完整目录 → exit 0, 缺目录 → exit 1

## 4. 验证

- [x] 4.1 `node --test tests/integration/**/*.test.mjs` 全部通过
- [x] 4.2 确认 schema-core 自测已通过 (`node --test tests/schema/`)
- [x] 4.3 `EXPERIMENT.md` 记录结论
