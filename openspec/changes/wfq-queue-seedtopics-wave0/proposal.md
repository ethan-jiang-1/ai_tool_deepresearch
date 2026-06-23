## Why

Agentic Queue (AGQ) 的 JS 底盘完整——`queue-manager.mjs` (619行) + `operate-queue.mjs` (7子命令) + AGQ-001~006 全部 accepted + 3 playbook 通过。但**没有任何 workflow phase 使用它**——没有一份 phase node MD 引用 `operate-queue`。

`_backlog/queue/agentic-queue-landing-analysis.md` 和 `guidelines/agentic-queue-mechanism.md` 定调的核心 gap：**queue engine 存在但没有接入 workflow loop**。

本 change 选两个天然适合 queue 的上下游 phase 一起接入——**seed-topics**（物化 topic 定义）和 **wave0**（source intake search）。两者都是"一个 topic 一个 task"的独立子任务模式，差别仅在生产内容：seed-topics 写结构化 MD（无 search），wave0 做真实 WebSearch + WebFetch。打通从"topic 定义"到"source evidence"的整条 queue-driven 链路。

同时修复 seed-topics 的内容深度——当前 seed topic 文件只有 `id/slug/title` 三个 frontmatter 字段 + 三段式笼统正文，对比 V12 的 `decompose-seed-topics.md`（含 must_answer、hypothesis、in_scope/out_of_scope、search_guardrails、evidence_route 等决策级字段），差距太大。seed topic 必须是 search-relevant decision document，否则 wave0 的 sub-agent 收到 task card 只能做泛泛搜索。

## What Changes

- **phase-seed-topics.md §2-§3 重写**：§3 从自由文本变为 queue-driven 三阶段 + §2 新增 queue CLI 依赖；seed topic 文件内容对齐 V12 深度（frontmatter 加 must_answer/hypothesis/scope/search_guardrails/evidence_route，正文加原始语境约束 block）
- **phase-wave0.md §2-§3 重写**：§3 从自由文本变为 queue-driven 三阶段（含完整 task card JSON 模板、ASCII 执行循环图、WebSearch+WebFetch sub-agent 搜索指令、receipt fail→repair 路径）
- **wave0 Required Inputs 上游 gate 修正**：`setup-ready` → `seed-topics-ready`（seed-topics phase 插入到 setup 和 wave0 之间后，wave0 的上游 gate 必须翻转——本 change 顺手修复这一主 spec 陈旧引用）
- **两个 phase MD 均已完成在磁盘上的重写**
- **新增 2 个 producer_rule**：`seed_topic_materialize`（seed-topics）+ `source_intake_fan_in`（wave0）
- **灌料统一模式**：两个 phase 都是 Agent 从 topic_registry 派生 task card → 写 JSON → `operate-queue enqueue --task <task.json>` → 一次性灌满
- **回归测试**：phase body 结构 regression test 覆盖 seed-topics 和 wave0 两个 MD
- **实验验证**：seed-topics queue-loop simple + wave0 queue-loop simple（wave0 含真实 search）
- **不产出**：无新 JS 代码、无新 engine、无新 CLI

## Capabilities

### Modified Capabilities

- `seed-topic-materialization`: MODIFIED — STM-001 (phase-seed-topics.md body) 从自由文本变为 queue-driven + seed topic 文件内容对齐 V12 深度
- `research-wave-phase-content`: MODIFIED — RWP-001 (phase-wave0.md body) queue-driven 三阶段
- `agentic-queue`: MODIFIED — 新增 AGQ-007 `source_intake_fan_in`、AGQ-008 wave0 playbook、AGQ-009 `seed_topic_materialize`、AGQ-010 seed-topics playbook

## Impact

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`：§2-§3 重写 + V12 内容对齐
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`：§2-§3 重写（已完成）
- `experiments_playbook/exp_agentic-queue-loop/test-simple-seedtopics-queue-loop.md`：新建
- `experiments_playbook/exp_agentic-queue-loop/test-simple-wave0-queue-loop.md`：新建
- `tests/integration/md/`：新增两个 phase body 结构 regression test
- `openspec/specs/seed-topic-materialization/spec.md`：STM-001 行为变更
- `openspec/specs/research-wave-phase-content/spec.md`：RWP-001 行为变更
- `openspec/specs/agentic-queue/spec.md`：新增 AGQ-007, AGQ-008, AGQ-009, AGQ-010
- `openspec/governance/req-registry.yaml`：新增 4 个 requirement ID
