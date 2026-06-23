# Agentic Workflow & OpenSpec

这份文档系列基于 Deep Research Tool 项目的实践，回答四个核心问题：

1. **[什么是 Agentic Workflow？它跟传统 Workflow（如 Dify）的区别](01-what-is-agentic-workflow.md)**
2. **[Agentic Workflow 和传统软件开发的本质差异](02-vs-traditional-software-development.md)**
3. **[如何充分发挥 LLM 的能力：容错与纠错](03-llm-error-correction-loop.md)**
4. **[OpenSpec：一套优美的 SDD 系统](04-openspec-sdd.md)**

建议按顺序阅读 —— 每篇结尾有指向下一篇的衔接，合在一起构成一个从"是什么"到"怎么建"到"怎么治理"的完整论证。

## 核心思想速览

这个项目有一条贯穿始终的主线 —— **Agent 开车，引擎刹车**：

```
LLM Agent（驾驶员）        Markdown（导航地图）       JS/CLI Engine（刹车+仪表盘）
─────────────────       ─────────────────       ──────────────────────────
搜索、阅读、判断、        告诉 Agent 每一个阶段       **纯传统确定性代码**
写作、修复               的目标、动作、gate 命令、   schema 校验、gate 规则、
                         失败处理                  receipt 检查、trace 写入
                                                  返回 Check/Inspect/Advice
                                                  （不含 AI，不含概率判断）

                         OpenSpec（交通规则）
                         ─────────────────
                         从 idea 到 delta spec 到实现到 archive
                         自动化合规检查强制执行
```

这引出了项目的根本定义：

> "You are designing a system with LLM as the capability source, Markdown as the Agent Flow control surface, and JS/CLI as the deterministic checkpoint/feedback layer. You are not writing a purely deterministic program."

后面四篇会反复回到这个定义，从不同角度拆解它。
