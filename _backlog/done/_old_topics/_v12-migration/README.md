# V12 → Agentic DPT 迁移

从 V12 (Vibe Coding, Markdown 治理) 迁移到 Spec Coding (Engine 执行规则, Agent 生产内容)。

## 核心变化

| V12 | Agentic DPT |
|-----|-------------|
| Markdown 作为代码 | JavaScript 作为代码 |
| Agent 自治理 (读 prose, 自行判断) | Engine 强制执行 (Schema, Gate, Receipt) |
| 51 个 enum 全定义 | 按需引入, 目前 10 个 |
| 无测试 | 单元 + 集成回归测试 |
| `_framework/` 拷贝进 bundle | `DPT_FRAMEWORK/` 同级共享 |
| packages/ monorepo | 扁平目录 |

## 迁移策略

1. 先搭地基 (schema-core)
2. 再跑 prototype 验证核心机制 (boot, gate loop, gate fork)
3. 建测试基础设施 (test-infra)
4. prototyping 完成后再建生产代码

## 文档索引

- [enums-port.md](./enums-port.md) — V12 51 enum → 10, 选入/排除标准
- [hooks-deferral.md](./hooks-deferral.md) — Hooks 为什么后续再考虑
- [decisions.md](./decisions.md) — 关键架构决策
- [roadmap.md](./roadmap.md) — 依赖顺序和实现进度
