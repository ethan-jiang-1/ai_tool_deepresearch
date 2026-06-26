# 00 — 系统概览

## Deep Research V12 是什么

一个 **Markdown 治理的渐进式深度研究系统**（Deep Research Progressive Plan Template V12）。

**核心流程：**

```
用户提出宽泛研究问题
  │
  ▼
HITL1: 选研究模式 + 定义"最终必须回答什么"
  │
  ▼
实例化 (Instantiation): 创建 Run Bundle
  ├── 5 个 Markdown 根控制文件 (PROFILE / PLAN / STATUS / QUEUE / TRACE)
  ├── 只读框架快照 (_framework/)
  └── 目录结构 (seed_topics/, _reference/, _artifacts/)
  │
  ▼
setup_ready → Wave 0 (共享基础) → Wave 1 (逐题深挖) → Wave 2 (跨题综合)
  │
  ▼
HITL2: 评估可回答性 → 选最终报告视角
  │
  ▼
Readiness Check → Final Delivery
```

## 设计哲学

1. **证据优先**（Evidence-First）：深度研究靠可复用的本地证据推进，不靠聊天记忆
2. **Markdown 治理**：所有规则、状态、审计都写在 Markdown 文件中，Agent 通过读写文件执行
3. **自主执行**：Wave 0/1/2 期间默认静默自主运行，不打断用户
4. **两人工确认点**：仅 HITL1（开始前）和 HITL2（综合后）需要用户决策
5. **Gate 机制**：每个阶段有硬性审计门，必须通过才能进入下一阶段
6. **Queue 驱动**：所有工作通过队列系统调度，有明确的谱系和凭证

## 核心术语

| 术语 | 含义 |
|------|------|
| Run Bundle | 一次完整研究的工作目录及其所有文件 |
| Source of Record | 某类信息的唯一权威位置 |
| Read-Only Framework | `_framework/` 目录，只读框架快照 |
| Instantiated Control Files | 5 个可变根文件 (profile/plan/status/queue/trace) |
| Output Templates | `_framework/output_templates/` 下的骨架文件 |
| seed_topics | 唯一正式话题根目录 |
| Wave | 研究的一个阶段 (Wave 0/1/2) |
| Gate | 阶段转换的硬性检查点 |
| HITL | Human-in-the-Loop，人工确认 |
| Queue | 5 槽位滚动执行窗口 + Refill Pool |
| Receipt | 持久化本地凭证，证明某工作已完成 |
| Boundary Hook | 生命周期边界的前置检查 |
