# exph_workflow-foundation

`exph_` = exp + h(uman) — **需要人类介入的 workflow-foundation 实验。**

## 核心规则：每个真人 case 必有 AI 自动跑的对偶

**本目录下每一个人跑的 case，都对应一个 AI 自动跑的、一模一样的对偶 case**——区别只在"谁来回答人类那部分"：真人 case 由人回答，对偶 case 由 **AI 替人回答**。

- 编号用 **9NN** 段，**+50 配对**：真人版 `90X` ↔ AI 版 `9(5)X`。
  - `case-901`（真人审查 Agent rewrite 质量）↔ `case-951`（AI 替人审查，同一份 rewrite）
- 两者**同目录**（都在 `exph_workflow-foundation/`），机制、输入、步骤完全相同，只换"谁扮演人类"。
- runner **按编号段**决定跳过/自动：`901–949`（真人）跳过、`950–999`（AI 替人）自动可跑——不因 `exph_` 目录一刀切。
- AI 替人给出的 verdict 在 trace 标 `source: ai-judge`，**不是真人 verdict**。两个 verdict 对比即可验证"AI 能否替人"。

> 权威约定见 `experiments_playbook/README.md` § 编号约定：9NN 对偶。

## Convention

- `weight: heavy` + `agent_mode: real-agent`
- 每个 playbook 的 mechanism under test 是 **Agent 的语义判断能力**（不是 gate 的 deterministic check）
- Human review checklist 是 playbook 的一部分——gate pass 不代表 human pass
- 真人 case（90X）的人工裁决写入 trace（`gate: human-review`, `source: human`）；AI 对偶（95X）写 `source: ai-judge`

## 将来

当 Agent 手段（subagent spawn、Agent SDK、programmatic review）成熟到可以替代人类判断时，真人 case（90X）即可退役——其 AI 对偶（95X）已经证明 AI 能替人。本目录是"机制含人类判断"的家，9NN 对偶让它在自动化管线里不阻塞。
