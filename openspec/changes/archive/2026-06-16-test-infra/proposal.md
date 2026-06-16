## Why

Prototype 实验和正式回归测试混在一起会导致两个问题：(1) 原型是理想化的思想实验，冻结后不应随生产代码变化而 break；(2) 没有独立的回归测试基础设施，每次改代码无法自动验证已有功能。需要建立清晰的实验/测试分离结构。

## What Changes

- **新建** `experiments/` 根目录：存放 prototype 实验代码（冻结，不随生产变化）
- **新建** `tests/` 根目录：生产回归测试（随代码演进）
- **新建** `tests/fixtures/`：最小 DPT_FRAMEWORK/ 测试框架，供集成测试使用
- **新建** `tests/integration/`：JS+MD 交互集成测试（check.mjs, inspect.mjs）
(单元测试随 schema-core 自测)
- **更新** `config.yaml`：根目录约定补充 experiments/ 和 tests/，新增测试策略段

## Capabilities

### New Capabilities

- `test-fixtures`: 最小 DPT_FRAMEWORK/ 测试框架，可被所有集成测试复用
- `integration-tests`: JS+MD 交互回归测试（真实文件 I/O，临时目录隔离）
(单元测试已在 schema-core 自测中)

### Modified Capabilities

（无）

## Impact

- 根目录增加 `experiments/` 和 `tests/`
- config.yaml 新增测试策略段，明确三层测试分工
- 三个已有 prototype 的 experiments/ 引用路径需更新
