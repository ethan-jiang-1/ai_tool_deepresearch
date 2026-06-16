## Why

所有 prototype 和 test-infra 都依赖 `DPT_FRAMEWORK/schema/`——但 schema 还不存在。这是整个项目的地基。不需要 25 enum + 11 contract，先用最少 6+6 让后续 change 能跑起来，按需扩展。

## What Changes

- **新建** `DPT_FRAMEWORK/schema/enums.mjs`：6 个 Zod enum
- **新建** `DPT_FRAMEWORK/schema/contracts/`：6 个 Zod contract (.mjs)
- **新建** `DPT_FRAMEWORK/schema/index.mjs`：barrel 导出
- 纯 JavaScript (ESM)，`node` 直接 import，无需编译

## Capabilities

### New Capabilities

- `schema-core`: 6 个 Zod enum + 6 个 Zod contract + Gate 转换表，纯 JavaScript (.mjs)，仅 zod 依赖

### Modified Capabilities

（无）

## Impact

- 所有 4 个后续 change 解除阻塞：prototype-start-from-here, test-infra, prototype-gate-loop, prototype-gate-fork
- schema 文件位于 `DPT_FRAMEWORK/schema/` (手写 .mjs)，`node` 直接 import
