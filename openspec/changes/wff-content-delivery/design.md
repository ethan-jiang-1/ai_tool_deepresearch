## Context

Workflow Foundation lifecycle 当前有完整的 10 阶段 skeleton，但最后 3 个阶段（HITL2、readiness、final）仍为 placeholder。同时 FSM 引擎（`transition-fsm.mjs`、`workflow-fsm.mjs`、`transitions.fsm.json`）是 dead code——gate CLI 全部默认 `transitions.chain.json`，lifecycle 从未实际查询 `.fsm.json`。

此 change 分两层：Phase 0 纯机械删除 FSM 引擎（无设计决策），Phase 1+ 按 `wff-research-waves` 建立的模式完成 delivery 尾部三阶段。

## Goals / Non-Goals

**Goals:**
- 彻底移除 FSM 引擎死代码，消除双引擎噪声
- 填满 `phase-hitl2.md`、`phase-readiness.md`、`phase-final.md` 的 9-section body
- 升级 `hitl2-recorded` 和 `readiness-passed` gate 从 placeholder 到 real rule set
- 升级对应 gate CLI 从 hardcoded pass 到 definition-driven
- 修复 `CurrentGate` enum 缺失值
- 创建 3 个实验 playbook 验证 happy path 和 boundary fail
- Governance 双 PASS

**Non-Goals:**
- Wave artifact 生产（已完成于 `wff-research-waves`）
- 完整 subagent 调度（Phase D，future）
- Real-environment E2E
- Full report UI customization
- Final 后的 standalone revision workflow

## Decisions

### D1: FSM 必须彻底清理，不留残余

`transition-fsm.mjs` + `workflow-fsm.mjs` + `transitions.fsm.json` 与 `transition-chain.mjs` + `transitions.chain.json` 是两套并行机制，做同一件事：查「下一步是谁」。chain 已经能满足所有 routing 需求（line 10 条，只编码 normal next 的 `passed` 分支），FSM 没有任何 chain 做不到的能力。

保留双引擎的真正危害不是维护成本——是 **AI coding agent 面对两套机制时的选择困惑**。agent 不知道哪个是真正的 source of truth，可能读 FSM 的实现、更新 FSM 的表、import FSM 的 loader、在 FSM 和 chain 之间来回跳——全是在浪费注意力。删干净后 agent 只有 chain 一条路，不会困惑。

Phase 0 不进入单独 change——太薄（纯机械删除，0 设计决策），折进 Change 6 的 Phase 0，在 content 工作之前作为 cleanup pass。同时满足「降噪发生在后续内容工作开始前」和「不多开 change」两个目标。

### D2: Phase body 遵循 9-section 标准结构

与 `phase-wave0.md` 等保持一致，9 个 section：Stage Goal → Required Inputs → Allowed Actions → Expected Artifacts → Gate Command → On Gate Pass → On Gate Fail → Stop Behavior → Anti-Cheating Rules。

### D3: Gate CLI 遵循 gate-helpers.mjs pipeline

不重复造轮子。使用已有的 `parseGateCliArgs` → `validateNodeGateBinding` → load definition → iterate rules → execute checks → `buildGateResult` → `emitGateResult` pipeline。与 wave0/1/2 gate CLI 一致。

### D4: 新增 check type 实现于 CLI 内（非 helpers）

`yaml_parse`、`jsonl_parse`、`trace_has_events`、`field_non_empty`（deep path）是此 change 新引入的 check type，实现于各自 gate CLI 的 rule iteration 中。等 ≥2 个 CLI 共用时再提取到 helpers——遵循 YAGNI。

### D5: Readiness gate 只做 deterministic check

Readiness gate 的 rule set 仅限于：`file_exists`（artifact 存在）、`yaml_parse`（profile 可解析）、`jsonl_parse`（trace 可解析）、`trace_has_events`（gate_attempt 计数）、`status_value`（status 一致性）。**绝不**包含 `pattern_match` 或任何内容质量判断。这是 breakdown R06-1 的核心要求。

### D6: Final 无 gate，terminal node

`phase-final.md` 的 frontmatter 中 `gate: none`、`next: none`。`transitions.chain.json` 不包含 `phases/phase-final.md` 的条目。Final 后用户反馈入口是 HITL2 repair/rerun（写入 `rb_profile.yaml` 的 HITL2/user feedback），不是 final hidden loop。

### D6a: HITL2 路由模型 — chain 只管 default next，Agent 管 branch

`transitions.chain.json` 对 HITL2 只有一条 entry：`"phases/phase-hitl2.md": { "passed": "phases/phase-readiness.md" }`。这是「正常下一步」——与所有其他 phase 一致（chain 整表只有 `passed` 分支，没有 `failed` 分支，没有 user-decision 分支）。

HITL2 有四个 user_decision：

| user_decision | Authority | 行为 |
|---|---|---|
| `proceed_to_readiness` | chain | 正常进 readiness，Agent 跟随 chain |
| `request_view_revision` | Agent | Agent 读 profile，决定回到哪个 phase 修改 view |
| `repair_and_rerun` | Agent | Agent 重启 lifecycle（从 instantiation 开始），profile 带新要求 |
| `stop_blocked` | Agent | lifecycle 终止，记录原因 |

后三个 branch **不编码进 chain**。这是故意的——chain 只做 deterministic normal next，branch 归 Agent。FSM 被删除的深层理由就是：FSM 的存在暗示「所有分支都应该进状态表」，这会把 Agent 决策偷到 Engine 里，违反 charter。chain 没有 `repair_and_rerun` 分支不是缺失，是正确的 authority 边界。

### D7: CurrentGate enum 补充

`CurrentGate` 缺少 `hitl1_recorded`、`hitl2_recorded` 和 `none`。

- `hitl1_recorded` / `hitl2_recorded`：HITL node 是 `stop: yes`，但 gate CLI 仍会写 `rb_status.json` 的 `current_gate`/`next_gate` 字段，Zod 校验需要这两个值。
- `none`：`phase-final.md` 的 frontmatter 声明 `gate: none`。readiness gate pass 后 `next_gate` 应设为 `none`（无下一道 gate）。`StatusSchema` 要求 `next_gate: CurrentGate`（不可选、不可 null），必须有合法值。`none` 与 manifest 里 `"gate": null` 的语义一致——只是 JSON null 在 Zod enum 里用字符串 `"none"` 表示。

按已有命名惯例（snake_case）插入到正确位置：`hitl1_recorded` 在 `instantiation_complete` 和 `setup_ready` 之间，`hitl2_recorded` 在 `wave2_complete` 和 `readiness_passed` 之间，`none` 在末尾。

### D8: FSM spec 删除策略

3 个 FSM spec 目录（`workflow-fsm-definition`、`workflow-fsm-runtime`、`workflow-fsm-transition`）整体删除。对应的 registry entry（WFS-001/002/003）标记为 retired。`framework-engine` 的 FRE-002 同样 retire。

## Risks / Trade-offs

- **R06-1: Readiness 膨胀为 quality judge** → Gate rule set 只用 structural check type，phase body Anti-Cheating 明确禁止。Design-level 防范，非 code-level。
- **R06-2: Final hidden loop** → manifest 有 `gate: null`，transition chain 无 final entry，phase body Section 9 明确禁止。多层 enforce。
- **R06-3: HITL2 decision 留 chat memory** → Gate 检查 `rb_profile.yaml` 的 `hitl2.status: recorded` 和 `user_decision` 非空。Agent 不过 gate 就不能 advance。
- **R06-4: Final 从 chat memory 生成** → Phase body Section 9 要求从 verified bundle state 生成。Final 无 gate，由 MD instruction 约束。
- **Enum gap** → `hitl1_recorded`/`hitl2_recorded` 加入 `CurrentGate` enum，确保 Zod schema 不 reject。
- **FSM 删除遗漏** → Phase 0 验收用 `git grep` 扫描，确认零引用后再进入 Phase 1+。

## Open Questions

无。Phase 0 是纯机械删除，Phase 1+ 完全遵循 `wff-research-waves` 建立的成熟模式。所有设计决策已在 breakdown 和已有 precedent 中明确。
