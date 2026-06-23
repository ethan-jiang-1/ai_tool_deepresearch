## Why

Agentic Queue (AGQ) 的 JS 底盘完整——`queue-manager.mjs` (619行) + `operate-queue.mjs` (7子命令) + AGQ-001~006 全部 accepted + 3 playbook 通过。但**没有任何 workflow phase 使用它**——没有一份 phase node MD 引用 `operate-queue`。

`_backlog/queue/agentic-queue-landing-analysis.md` 和 `guidelines/agentic-queue-mechanism.md` 定调的核心 gap：**queue engine 存在但没有接入 workflow loop**。

本 change 选两个天然适合 queue 的上下游 phase 一起接入——**seed-topics**（物化 topic 定义）和 **wave0**（source intake search）。两者都是"一个 topic 一个 task"的独立子任务模式，差别仅在生产内容：seed-topics 写结构化 MD（无 search），wave0 做真实 WebSearch + WebFetch。打通从"topic 定义"到"source evidence"的整条 queue-driven 链路。

同时修复 seed-topics 的内容深度——当前 seed topic 文件只有 `id/slug/title` 三个 frontmatter 字段 + 三段式笼统正文，对比 V12 的 `decompose-seed-topics.md`（含 must_answer、hypothesis、in_scope/out_of_scope、search_guardrails、evidence_route 等决策级字段），差距太大。seed topic 必须是 search-relevant decision document，否则 wave0 的 sub-agent 收到 task card 只能做泛泛搜索。

## What Changes

- **phase-seed-topics.md §2-§3 重写**：§3 从自由文本变为 queue-driven 三阶段 + §2 新增 queue CLI 依赖；seed topic 文件内容对齐 V12 深度（frontmatter 加 must_answer/hypothesis/scope/search_guardrails/evidence_route，正文扩展为两段结构——初始化区 + 轮次追加区预埋）
- **phase-wave0.md §2-§3 重写**：§3 从自由文本变为 queue-driven 三阶段（含完整 task card JSON 模板、ASCII 执行循环图、WebSearch+WebFetch sub-agent 搜索指令、receipt fail→repair 路径）
- **wave0 Required Inputs 上游 gate 修正**：`setup-ready` → `seed-topics-ready`。这是 gate 依赖链的关键正确性修正——seed-topics phase 插入到 setup 和 wave0 之间后，wave0 的上游 gate 必须翻转为 `seed-topics-ready`。若保持 `setup-ready`，Agent 可能跳过 seed-topics 阶段，带着空的 `seed_topics/` 进入 wave0，导致 gate 防线位置错误。
- **两个 phase MD 均已完成在磁盘上的重写**
- **新增 2 个 producer_rule**：`seed_topic_materialize`（seed-topics）+ `source_intake_fan_in`（wave0）
- **灌料统一模式**：两个 phase 都是 Agent 从 topic_registry 派生 task card → 写 JSON → `operate-queue enqueue --task <task.json>` → 一次性灌满
- **Markdown frontmatter 统一为 YAML 1.2**：gate-helpers.mjs 新增 `parseMdFrontmatter()` + `readBundlePlan()` 两个共享函数，消除 6 个文件（4 gate CLI + validate-bundle + instantiate-run-bundle）中重复的 `JSON.parse(m[1])` 手写 frontmatter 解析逻辑。YAML 1.2 是 JSON 的超集，`parseYaml()` 替代 `JSON.parse()` 完全向后兼容。phase-seed-topics.md 模板恢复 YAML 格式。新增防回归测试：grep 扫描发现 `JSON.parse` 用于 frontmatter 上下文直接 fail
- **Seed topic 文件两段结构**：初始化区（seed-topics 写入，含 YAML frontmatter + 主题定位/must_answer/why now/研究边界/证据锚点/交付价值/下游位置）+ 轮次追加区（预埋占位，wave0/wave1/wave2 各自回填证据、机制理解、趋势、判断、待验证问题）。对齐 V12 decompose-seed-topics 的"持续生长研究日志"模式
- **回归测试**：phase body 结构 regression test 覆盖 seed-topics 和 wave0 两个 MD
- **实验验证**：seed-topics queue-loop simple + wave0 queue-loop simple（wave0 含真实 search）
- **不产出**：无新 npm 依赖、无新 CLI、无新独立 JS 文件/模块

## Capabilities

### Modified Capabilities

- `seed-topic-materialization`: MODIFIED — STM-001 (phase-seed-topics.md body) 从自由文本变为 queue-driven + seed topic 文件内容对齐 V12 深度；frontmatter 格式统一为 YAML
- `research-wave-phase-content`: MODIFIED — RWP-001 (phase-wave0.md body) queue-driven 三阶段
- `agentic-queue`: MODIFIED — 新增 AGQ-007 `source_intake_fan_in`、AGQ-008 wave0 playbook、AGQ-009 `seed_topic_materialize`、AGQ-010 seed-topics playbook
- `framework-engine`: MODIFIED — gate-helpers.mjs 新增 `parseMdFrontmatter()` + `readBundlePlan()`；各 gate CLI 消除手写 JSON.parse 重复逻辑

## Impact

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`：§2-§3 重写 + V12 内容对齐 + frontmatter 模板恢复 YAML
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`："JSON frontmatter" → "YAML frontmatter"
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`：§2-§3 重写
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`：新增 `parseMdFrontmatter()` + `readBundlePlan()` 共享函数
- `DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs`：`getPlan()` + `getDiskSlugs()` 改用共享函数
- `DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs`：`getPlan()` 改用共享函数
- `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`：`getPlan()` 改用共享函数
- `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`：`getPlan()` 改用共享函数
- `DPT_FRAMEWORK/cli/validate-bundle.mjs`：`parseMdFrontmatter()` 改用共享函数
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`：frontmatter 解析改用共享函数
- `experiments_playbook/exp_agentic-queue-loop/test-simple-seedtopics-queue-loop.md`：新建
- `experiments_playbook/exp_agentic-queue-loop/test-simple-wave0-queue-loop.md`：新建
- `tests/integration/md/`：新增两个 phase body 结构 regression test
- `tests/integration/md/parse-md-frontmatter.test.mjs`：新增防回归扫描测试（grep JSON.parse 用于 frontmatter）
- `openspec/specs/seed-topic-materialization/spec.md`：STM-001 行为变更
- `openspec/specs/research-wave-phase-content/spec.md`：RWP-001 行为变更
- `openspec/specs/agentic-queue/spec.md`：新增 AGQ-007, AGQ-008, AGQ-009, AGQ-010
- `openspec/specs/framework-engine/spec.md`：FRE-003 gate-helpers 新增共享 frontmatter 解析函数
- `openspec/governance/req-registry.yaml`：新增 5 个 requirement ID
