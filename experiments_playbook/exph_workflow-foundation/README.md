# exph_workflow-foundation

`exph_` = exp + h(uman) — **需要人类介入的 workflow-foundation 实验。**

## 与 `exp_workflow-foundation/` 的关系

| 目录 | 前缀 | 运行方式 |
|------|------|---------|
| `exp_workflow-foundation/` | `exp_` | 纯 bash/JS thin driver 自动化跑 |
| `exph_workflow-foundation/` | `exph_` | 需要真实 LLM Agent + 人类审查，不能自动化 |

成对存在：同一个 mechanism（workflow-foundation），不同自动化 level。

## Convention

- `weight: heavy` + `agent_mode: real-agent`
- 每个 playbook 的 mechanism under test 是 **Agent 的语义判断能力**（不是 gate 的 deterministic check）
- Human review checklist 是 playbook 的一部分——gate pass 不代表 human pass

## 将来

当 Agent 手段（subagent spawn、Agent SDK、programmatic review）成熟到可以替代人类判断时，将对应 playbook 移回 `exp_workflow-foundation/`。本目录是"已知未自动化"的 backlog，不是"永远手动"。
