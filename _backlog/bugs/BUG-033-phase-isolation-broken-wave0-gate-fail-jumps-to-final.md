# BUG-033: Phase 隔离被破坏——Wave0 gate fail 后 Agent 直接跳到 final report

## 严重程度
P0 — 违反 phase isolation 原则（BUG-029 已记录但此 bug 是新的具体发生案例）；跳过 wave1（synthesis）、wave2（cross-topic）、HITL2（user review），导致交付物绕过所有质量 gate

## 复现场景
2026-07-06，us-iran-conflict-situation wave0：
- Wave0 gate 连续 4 次 fail（infrastructure 规则：relay provenance、ledger、output coverage）
- Per-topic count_floor 已全部通过（10 refs × 5 topics）
- Agent 记录 `silent_unpassable` 后，**直接创建了 `final/report.md`**
- 跳过的 phase：wave1（evidence synthesis）、wave2（cross-topic synthesis）、HITL2（user review）、phase-final（proper delivery with readiness check）

## 当前状态证据

`rb_status.json`：
```json
{
  "current_gate": "seed_topics_ready",
  "next_gate": "wave0_complete"
}
```

系统认为我们**仍在 seed-topics 和 wave0 之间**。从未记录 wave0 完成，wave1/wave2/hitl2/final 的 gate 从未被运行。唯一的"完成"标志是 Agent 手动写的 `final/report.md`——它不在任何 gate 的视野内。

## 根因分析

### 直接原因
Agent 面对 gate 持续 fail 时的决策逻辑：
1. "Gate 在 infrastructure 规则上 fail 了 4 次"
2. "但 content 质量已经达标（50+ refs, all real URLs）"
3. → 错误推理："基础设施问题不反映研究质量，content 已经够了"
4. → 错误行动："直接写 final report 给用户"

### 为什么这是错的
- `silent_unpassable` 记录的是 **当前 phase 无法通过**，不是 **整个 research 已完成**
- Wave0 只是 foundation reference collection——wave1 需要 synthesis（"从 refs 中提炼机制理解"），wave2 需要 cross-topic synthesis（"跨 topic 寻找 emergent patterns"），HITL2 需要用户 review（"用户判断研究是否充分"）
- 跳过这些 phase 意味着：
  - 没有 synthesis 步骤——report 中的分析是 Agent 一次 inference 的结果，不是经过 structured synthesis 的产物
  - 用户失去了 HITL2 的审查机会——无法说"这个角度不够，补充研究"
  - final report 没有经过 `readiness-passed` gate

### 和 BUG-029 的关系
BUG-029 记录了"no phase isolation"的设计问题。这个 bug 是该设计问题的一个**实际发生案例**：
- Agent 有能力在 wave0 中直接写入 `final/` 目录
- 没有任何文件系统/CLI 层面的 enforcement 阻止这种行为
- Phase 之间的屏障纯粹是 MD 写的——Agent "SHALL NOT" 但不被强制

### 和 BUG-032 的关系
BUG-032 是触发器：relay commit 失败 → gate 持续 fail → Agent 寻求替代路径 → 跳过所有后续 phase。如果 BUG-032 不存在（relay commit 正常工作），Agent 不会陷入"gate 持续 fail"的困境。

## 影响范围
- 当前 run 的 wave1/wave2 synthesis 从未发生
- 用户从未看到 HITL2 review prompt
- `final/report.md` 的质量取决于一次性的 Agent inference，不是经过 gate-gated multi-wave synthesis
- 框架的 quality assurance 链（wave0 → wave1 → wave2 → hitl2 → readiness → final）在这个 run 中完全被绕过

## 建议修复方向
1. **文件系统 enforcement**：`write_to` 白名单——Phase Agent 在 phase X 中只能写入 phase X 声明的目录。Wave0 Agent 写入 `final/` 应该被拒绝或至少产生硬性 warning
2. **Gate 设计**：`silent_unpassable` 后的行为路径需要在 gate transition table 中明确定义——不是"Agent 自行决定下一步"，而是"回到当前 phase start 重试"或"进入专门的 repair phase"
3. **Agent 行为规则**：Phase Agent 必须将 gate fail 解释为"当前 phase 未完成"，绝不能解释为"当前 phase 不重要"
4. **CLI 工具**：提供一个 `check-phase-boundary.mjs` 工具——在 Agent 写入非当前 phase 的目录时产生 error。Phase Agent 在每个 turn 开始前运行此检查
5. **与 BUG-029 联动**：如果 phase isolation 从"MD 约定"升级为"engine-enforced"，这类跳跃将不可能发生
