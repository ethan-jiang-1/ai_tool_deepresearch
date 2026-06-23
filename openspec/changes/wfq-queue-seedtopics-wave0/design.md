## Context

Agentic Queue engine (`queue-manager.mjs`, 619行) + CLI (`operate-queue.mjs`, 7子命令) + spec (AGQ-001~006) + 3 playbook 全部存在且验证通过。但 workflow phase 没有使用它——当前 wave0 的 source intake 靠一段自由文本 "Allowed Actions" 描述，Agent 需要自己记住"每个 topic → 搜 source → 写 source.yaml → 跑 schema check"的流程。

`guidelines/agentic-queue-mechanism.md` 定了两层嵌套 loop 的架构方向。`_backlog/queue/agentic-queue-landing-analysis.md` 定了最小路径 (Path A)：只改 phase node MD，零新 JS 代码。本 change 执行 Path A。

本 change 是整个 queue-loop 落地序列的第一步，覆盖 sequence-topics + wave0 两个上下游 phase。后续 wave1 推广和跨-wave experiment 留给后续 change。Wave2 是单一 synthesis 大任务，不纳入 queue 范围。

## Goals / Non-Goals

**Goals:**
- 重写 `phase-seed-topics.md` §2-§3：queue-driven 物化 + seed topic 文件内容对齐 V12 深度（must_answer/hypothesis/scope/search_guardrails/evidence_route + 原始语境约束 block）
- 重写 `phase-wave0.md` §2-§3：queue-driven source intake + 真实 WebSearch/WebFetch sub-agent 搜索
- 正规定义 2 个 producer_rule：`seed_topic_materialize`（seed-topics）+ `source_intake_fan_in`（wave0）
- 验证 Path A 的可行性：两个上下游 phase 共用 queue 模式，打通"topic 定义 → source evidence"链路

**Non-Goals:**
- 不写新 JS 代码
- 不实现 stop authorization 强制执行（Path B）
- 不改 wave1/wave2（留给后续 change）
- 不建 medium/complex experiment playbook（留给后续 change）
- 不定义完整的 producer rules enum（留给后续 change）

## Decisions

### D0: 范围 — seed-topics + wave0 一起接入

**选择**: 一个 change 同时覆盖 seed-topics 和 wave0 两个 phase。

**理由**: 两者是上下游（seed-topics 产出 seed_topics/ → wave0 消费它做 search），共享同一个"一个 topic 一个 task"的 queue-driven 模式。分两个 change 增加跟踪负担且没有独立价值——wave0 的 queue loop 需要 seed_topics/ 目录来证明端到端闭环。差异只在 target（seed-topics 用 main-agent 写 MD，wave0 用 sub-agent 做 search）。

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

### D4: phase MD 改动范围 — §2 + §3

**选择**: 两个 phase 的 §2 Required Inputs（新增 `operate-queue.mjs` 依赖）和 §3 Allowed Actions（从自由文本变为 queue-driven 三阶段）改动。其余 §1/§4–§9 不变。

**理由**: §2 需要声明 queue CLI 和搜索工具（WebSearch/WebFetch）的可用性，否则 §3 的指令引用了不存在的工具。§3 是核心改动。其余节（goal、artifacts、gate cmd、on pass/fail、stop、anti-cheating）与 queue 的交互方式无关。

### D5: sub-agent 执行 search task

**选择**: task card 的 `target` 设为 `sub-agent`。sub-agent 执行搜索/抓取，bounded 输出写 `_cache/search-results/`，main-agent 在 complete 后只读 render projection（`_cache/agentic-queue/current-task.md`）确认 done-condition。

**理由**: 这是 `agentic-queue-landing-analysis.md` §7.5 target separation 的指导——高 I/O 密度的工作给 sub-agent，main-agent 只读投影。减少 main-agent 上下文膨胀，为 Change 3 的上下文可持续性测量提供数据。

### D6: 测试策略 — 结构 regression + experiment playbook

**选择**: 本 change 自带两层验证——regression test（防 MD 结构退化）+ simple experiment playbook（证 queue-loop 闭环可跑）。

**替代方案**: 测试全推给 Change 3。

**理由**: "步步为营"原则要求每个 change 自验证。如果 phase-wave0.md 的 queue 指令有问题（CLI flag 路径错误、灌料步骤 Agent 执行不起来），要到 Change 3 才发现代价太大。结构 regression test 保证 MD contract 未退化；simple playbook 在 disposable bundle 上跑通最小闭环——灌料→claim→execute→complete→gate pass——作为 Change 1 的 done-condition。Change 3 保留 medium/complex playbook + 上下文可持续性测量。

## Risks / Trade-offs

- **[Agent 填错 task card 字段]** → 概率低（模板明确、字段少、topic ≤10）；发生时 queue-manager 的 Zod validation 会在 enqueue 时拒绝，inspect 反馈让 Agent 修正
- **[Agent 跳过 queue loop 直接跑 gate]** → Path A 下无法强制执行，依赖 MD 指令的清晰度和 Agent 自律。Path B 的 stop authorization 强制执行会解决
- **[Claim 后 crash，task 停在 running]** → 当前无 stale claim 检测（已知 gap，见 landing analysis §7.4）。本 change 的两个 playbook 不包含 crash→stale running 场景——这一验证显式留给后续 change。wave0 试点中若自然遇到此现象，记录 trace 现象即可，不要求本 change 解决。
- **[灌料手写 enqueue CLI 太繁琐]** → 如果试点发现 topic 多、Agent 出错率高，后续 change 加 JS helper `deriveTasks`
- **[D5 上下文释放假设未经验证]** → "main-agent 只读投影 → 上下文不膨胀"是 D5 的核心假设，当前无实测数据支持。本 change 的实验不测量上下文 token 曲线——上下文可持续性的正式测量按 §7.3 实验协议留给后续 change（`wfq-queue-loop-experiments`）。试点中 Agent 应自觉遵守"只读投影、不读回完整搜索结果"的约束，但这是 Agent 自律范畴（Path A 的固有限制）。
