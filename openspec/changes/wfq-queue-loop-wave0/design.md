## Context

Agentic Queue engine (`queue-manager.mjs`, 619行) + CLI (`operate-queue.mjs`, 7子命令) + spec (AGQ-001~006) + 3 playbook 全部存在且验证通过。但 workflow phase 没有使用它——当前 wave0 的 source intake 靠一段自由文本 "Allowed Actions" 描述，Agent 需要自己记住"每个 topic → 搜 source → 写 source.yaml → 跑 schema check"的流程。

`guidelines/agentic-queue-mechanism.md` 定了两层嵌套 loop 的架构方向。`_backlog/queue/agentic-queue-landing-analysis.md` 定了最小路径 (Path A)：只改 phase node MD，零新 JS 代码。本 change 执行 Path A。

本 change 是整个 queue-loop 落地序列的第一步。后续 wave1/wave2 推广（Change 2）和 experiment playbook（Change 3）依赖 wave0 试点的实战反馈。

## Goals / Non-Goals

**Goals:**
- 重写 `phase-wave0.md` §3，让 wave0 成为第一个 queue-driven phase
- 正规定义 `producer_rule: source_intake_fan_in`——wave0 source intake 的 task card 模板
- 验证 Path A 的可行性：Agent 能否可靠地根据 topic_registry 批量生成 enqueue 命令并执行 claim→execute→complete 循环

**Non-Goals:**
- 不写新 JS 代码——不碰 `queue-manager.mjs`、`operate-queue.mjs`、gate CLI
- 不实现 stop authorization 强制执行（那是 Path B 的内容）
- 不改其他 phase node MD（wave1/wave2 留给 Change 2）
- 不建 experiment playbook（留给 Change 3）
- 不定义完整的 producer rules enum（留给 Change 2）

## Decisions

### D1: 灌料方式 — Agent 模板化生成

**选择**: Agent 模板化生成。MD 给 Agent 一个 task card 模板，Agent 根据 `rb_plan.md` frontmatter `topic_registry` 为每个 topic 生成一条 `operate-queue enqueue` CLI 命令。

**替代方案**: JS helper `deriveWave0Tasks(topicRegistry)`。

**理由**: Path A 的承诺是零新 JS 代码。模板化生成虽然依赖 Agent 自律（Agent 可能填错字段），但 wave0 topic 数量通常 ≤10，Agent 按模板填写的出错率低。Phase 1 试点后如果发现 Agent 频繁填错，Change 2 再加 JS helper 也不迟。

### D2: 灌料粒度 — 一个 topic 一个 task

**选择**: 每个 topic_registry 条目生成一个 source-intake task。

**理由**: 
- 太细（每条 source 一个 task）：灌料成本高，一个 topic 可能搜到多条 source，动态粒度难模板化
- 太粗（整个 wave0 一个 task）：等于退化回自由文本，queue 失去意义
- 一个 topic 一个 task：task card 的 action 够具体（"搜索 topic X 的 foundation reference"）、done_condition 够明确（"source.yaml 存在且 schema 通过"）、claim→complete 能在一两轮内完成

### D3: 灌料时机 — 一次性灌满

**选择**: phase 进入时一次性把全部 topic 的 task enqueue 完。

**理由**: wave0 topic 数量通常 ≤10（HITL1 产出），一次性灌满适合小规模场景。分批灌的复杂度留给 topic >10 的场景（Change 2 再考虑）。

### D4: phase-wave0.md 改动范围 — 只改 §3

**选择**: §3 Allowed Actions 从自由文本变为三阶段 queue-driven 模式（§3.1 灌料、§3.2 执行循环、§3.3 收尾+gate）。其余 §1/§2/§4–§9 不变。

**理由**: §3 是 phase body 里唯一描述"Agent 可以做什么"的节。其余节（goal、inputs、artifacts、gate cmd、on pass、on fail、stop behavior、anti-cheating）与 queue 的交互方式无关，不需要改。

### D5: sub-agent 执行 search task

**选择**: task card 的 `target` 设为 `sub-agent`。sub-agent 执行搜索/抓取，bounded 输出写 `_cache/search-results/`，main-agent 在 complete 后只读 render projection（`_cache/agentic-queue/current-task.md`）确认 done-condition。

**理由**: 这是 `agentic-queue-landing-analysis.md` §7.5 target separation 的指导——高 I/O 密度的工作给 sub-agent，main-agent 只读投影。减少 main-agent 上下文膨胀，为 Change 3 的上下文可持续性测量提供数据。

## Risks / Trade-offs

- **[Agent 填错 task card 字段]** → 概率低（模板明确、字段少、topic ≤10）；发生时 queue-manager 的 Zod validation 会在 enqueue 时拒绝，inspect 反馈让 Agent 修正
- **[Agent 跳过 queue loop 直接跑 gate]** → Path A 下无法强制执行，依赖 MD 指令的清晰度和 Agent 自律。Path B 的 stop authorization 强制执行会解决
- **[Claim 后 crash，task 停在 running]** → 当前无 stale claim 检测（已知 gap，见 landing analysis §7.4）。wave0 试点会暴露这个问题，Change 2 或 Change 4 解决
- **[灌料手写 enqueue CLI 太繁琐]** → 如果 Phase 1 试点发现 topic 多、Agent 出错率高，Change 2 加 JS helper `deriveWave0Tasks`
