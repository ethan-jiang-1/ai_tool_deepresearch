## 1. Phase-wave0.md body 重写

- [ ] 1.1 @impl RWP-001: 重写 `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` §3 Allowed Actions — 从自由文本变为三阶段 queue-driven 模式（§3.1 灌料、§3.2 执行循环、§3.3 收尾+gate）
- [ ] 1.2 @impl AGQ-007: §3.1 灌料步骤中明确 task card 模板：一个 topic 一个 task，`producer_rule: source_intake_fan_in`，`target: sub-agent`，一次性灌满
- [ ] 1.3 §3.2 执行循环中包含上下文管理指令：sub-agent 执行搜索写入 `_cache/search-results/`，main-agent 只读 render projection 确认 done-condition
- [ ] 1.4 §3.3 收尾步骤明确：queue 空后检查 reference/index.md → 跑 gate CLI → 按 §5–§7 处理 pass/fail

## 2. Spec 层变更 (delta → main sync 前的准备)

- [ ] 2.1 验证 delta spec `agentic-queue/spec.md` 的 AGQ-007 producer_rule 定义与 queue-manager.mjs 现有 Zod schema 兼容（不新增 JS 代码，仅约束 Agent 行为）
- [ ] 2.2 验证 delta spec `research-wave-phase-content/spec.md` 的 RWP-001 MODIFIED 内容覆盖当前 main spec 的完整 requirement（含所有 scenario 的更新）

## 3. 回归测试验证

- [ ] 3.1 运行 `node --test tests/engine/queue-manager.test.mjs` — 必须 PASS（queue engine 行为无退化）
- [ ] 3.2 运行 `node --test tests/integration/cli/operate-queue.test.mjs` — 必须 PASS（queue CLI 行为无退化）
- [ ] 3.3 运行 `node --test tests/` — 全量回归必须 PASS

## 4. Requirement registry 与 governance

- [ ] 4.1 在 `openspec/governance/req-registry.yaml` 注册 AGQ-007（agentic-queue — producer_rule source_intake_fan_in）
- [ ] 4.2 在 `openspec/governance/req-registry.yaml` 注册 RWP-008（research-wave-phase-content — wave0 queue-driven execution mode）
- [ ] 4.3 运行 `node openspec/governance/check-project-reqs.mjs` — 必须 PASS
- [ ] 4.4 运行 `node openspec/governance/check-project-specs.mjs` — 必须 PASS
