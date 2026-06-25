# experiments_env

真实但隔离的实验环境。这里的代码跑在真实文件系统、真实 Engine、真实 trace 上——**不是 mock**。

## 规则

### 不允许 Mock

一切必须真实执行。不伪造 trace、不手写假 result、不用 console.log 代替 gate 裁决。即使是 prototype 也要产出可验证的证据。

### 不鼓励长期停留

这里的 prototype 验证思路后应迁入 `DPT_FRAMEWORK/`。`experiments_env` 是试验田，不是永久住所。

### 但必要时容许

紧急验证、快速原型、还不想污染 framework 的探索——可以在这里临时落地。但不以此为例外常态。每次临时方案都需要明确写清楚为什么不能放在 `DPT_FRAMEWORK/` 或 `tests/`。

## 目录约定

```
experiments_env/
  shared/                  # playbook 共享工具（new-disposable-bundle、wff-utils 等）
  prototype-*/             # 各模块的原型实现（验证通过后迁入 DPT_FRAMEWORK/engine/）
    EXPERIMENT.md          # 每个 prototype 必须有的说明文件
```

## 跟其他目录的关系

```
DPT_FRAMEWORK/       ← 迁入目标：经过验证的 engine、schema、cli
experiments_env/     ← 试验田：原型、临时工具、共享脚本
experiments_playbook/ ← E2E 流程：用 disposable bundle 跑真实验
tests/               ← 回归测试：framework 的 unit + integration 测试
```
