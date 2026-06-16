## Why

Deep Research 的引擎（framework）和数据（runtime bundle）必须物理隔离——同一份框架可以被多个 bundle 复用，每个 bundle 的运行数据互不污染。V12 用 "Instantiation" 实现这个模式。本 prototype 验证用 JavaScript + Markdown/JSON/YAML 实现这套隔离机制。

## What Changes

- **新建** Agent 命令 playbook：`command_playbook/instantiate-run-bundle.md` 指导 Agent 生产 `dpt_rb_{name}/`
- **新建** JS helper：`check.mjs` (Zod 校验) + `inspect.mjs` (结构检查)，Agent 通过 `node` 调用
- **新建** 启动入口：`START_FROM_HERE.md` 引用 `../DPT_FRAMEWORK/` 和 bundle 内的 `rb_*` 控制文件
- **新建** 多 bundle 隔离验证：同一份 DPT_FRAMEWORK/ 服务多个 dpt_rb_{name}/
- 纯 JavaScript (Node.js)，使用批准的依赖：zod + yaml

## Capabilities

### New Capabilities

- `cmd-bundle-instantiation`: Agent 通过命令 playbook + JS helper 生成 `dpt_rb_{name}/`
- `bundle-data-isolation`: 多个 bundle 并行，数据互不污染，共享同一份 DPT_FRAMEWORK/
- `bundle-start-from-here`: `START_FROM_HERE.md` 作为 Agent 入口，引用 framework 和 rb_* 控制文件

### Modified Capabilities

（无）

## Impact

- 验证了 framework ↔ bundle 分离模式在 Node.js/JavaScript 下的可行性
- 为后续 engine 包的 State Manager 提供参考（load 时需要定位 bundle 路径）
- 与 gate-loop/gate-fork 组合后形成完整的原型链：boot → gate → repair → fork
