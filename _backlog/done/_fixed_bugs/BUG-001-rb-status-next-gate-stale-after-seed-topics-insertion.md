---
> 状态: 待修复（发现即阻塞 — 每个新建 bundle 在 setup-ready gate 必死）
> 严重度: 🔴 Critical（launch blocker — 框架无法端到端跑通任何新研究）
> 分类: transition/状态机漂移（FSM dispatch bug 同类）
> 发现于: 2026-06-26，真跑一次完整 research 时（bundle: dpt_rb_meal-timing-chrononutrition）
> 阻塞: phase-setup（及之后所有 phase）
> 报告人: Claude Code（执行 RUN.md 启动流程时触发）
---

# Bug：新建 bundle 的 `rb_status.json#/next_gate` 用旧链值，setup-ready gate 必然失败

## TL;DR

新建 bundle 一律死在 **`setup-ready` gate**：模板把 `rb_status.json#/next_gate` 写成 `"wave0_complete"`，而 `setup-ready` gate 要求它是 `"seed_topics_ready"`。两者之间（instantiation→hitl1→setup）**没有任何阶段/gate 改写 `next_gate`**，所以这个矛盾无人协调，每个 fresh bundle 都是 dead-on-arrival。

根因不是单纯模板手滑，而是 **seed-topics（和 hitl1）阶段被插进 lifecycle 后，一套工件更新了、另一套没更新**，导致同一字段 `next_gate` 在相邻两个 gate 里被要求互斥的值。这和 `_backlog/_trainsistion/cc_transition_systemic_analysis.md` 记录的 "🔴 Critical FSM dispatch bug" 是**同一类**问题（三种标识符 + 两套链模型并存）。

---

## 1. 权威链路（修复以此为准）

`DPT_FRAMEWORK/workflows/transitions.chain.json`（这是 gate CLI `check.next` 路由的真相源）：

```jsonc
"phases/phase-instantiation.md": { "passed": "phases/phase-hitl1.md" },        // line 2
"phases/phase-hitl1.md":        { "passed": "phases/phase-setup.md" },          // line 3
"phases/phase-setup.md":        { "passed": "phases/phase-seed-topics.md" },    // line 4 ← setup 之后是 seed-topics
"phases/phase-seed-topics.md":  { "passed": "phases/phase-wave0.md" },          // line 5
...
```

**结论：真实链是 `instantiation → hitl1 → setup → seed-topics → wave0 → …`。setup 的下一站是 seed-topics，不是 wave0。**

---

## 2. 精确复现（从零，任何人都能跑）

```bash
# 1) 建一个全新 bundle
node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs meal-timing-chrononutrition
# → 创建成功；rb_status.json 里 next_gate = "wave0_complete"（来自模板，见 §4）

# 2) 走正常 phase 流程
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs \
  --bundle dpt_rb_meal-timing-chrononutrition --current-node phases/phase-instantiation.md
# → passed: true ✓   （instantiation gate 要求 next_gate=wave0_complete，正好匹配 → 放行）

# … 中间 hitl1 phase 写 rb_profile.yaml、过 hitl1-recorded gate（passed: true，不碰 next_gate）

# 3) 到 setup —— 死
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs \
  --bundle dpt_rb_meal-timing-chrononutrition --current-node phases/phase-setup.md
# → passed: false ✗
```

实际输出（逐字）：

```json
{
  "check": { "passed": false, "gate": "setup-ready", "currentNodeRef": "phases/phase-setup.md", "next": null },
  "routing": { "kind": "no_transition", "next": null,
    "detail": "No transition for \"phases/phase-setup.md\" with outcome \"failed\" in chain table" },
  "inspect": [ "rb_status.json#/next_gate: expected \"seed_topics_ready\", got \"wave0_complete\"" ],
  "advice": [ "rb_status.json next_gate must be 'seed_topics_ready'. Status may have drifted — restore the correct value." ]
}
```

---

## 3. 核心矛盾：两个相邻 gate 对 `next_gate` 要求互斥，中间无协调者

| gate（按运行顺序） | 对 `rb_status.json#/next_gate` 的要求 | 来源 file:line | 模板值是否满足 |
|---|---|---|---|
| `instantiation-complete` | 必须 = `"wave0_complete"` | `schema/gate_definitions/gate-instantiation-complete.definition.json:99-103`（`expected: "wave0_complete"`） | ✅ 满足（所以 instantiation 放行） |
| `setup-ready` | 必须 = `"seed_topics_ready"` | `schema/gate_definitions/gate-setup-ready.definition.json:109-113`（rule `status_next_gate`, `expected: "seed_topics_ready"`） | ❌ 不满足（所以 setup 必死） |

中间的 `hitl1` 阶段/gate **完全不改写 `next_gate`**：
- `phase-hitl1.md` 的 Allowed Actions 只写 `rb_profile.yaml`（已读全文确认）；
- `check-gate-hitl1-recorded.mjs` / `gate-hitl1-recorded.definition.json` 对 `next_gate` / `rb_status.json` 零引用（grep 无命中）。

**因此：bundle 创建时 `next_gate` 被模板钉死成 `wave0_complete`，instantiation gate 据此放行，hitl1 不动它，setup gate 因它不是 `seed_topics_ready` 而失败。没有第三者能调和。** 同一个 `next_gate` 值无法同时让两个相邻 gate 都过。

> 语义说明：`current_gate` 在 instantiation 与 setup 两个 gate 里都被要求 = `setup_ready`（一致，无矛盾）。矛盾**仅**落在 `next_gate` 上 —— 它表示「`current_gate`（=setup）的下一站」，而「setup 的下一站」在旧链（wave0）与新链（seed-topics）里不同。instantiation gate 用旧链算，setup gate 用新链算。

---

## 4. 两套模型并存 —— 哪些工件新了、哪些还旧

seed-topics（及 hitl1）阶段被插入 lifecycle 后，**只有一部分工件跟着更新**：

### ✅ 已更新为新链（Model B：setup → seed-topics）
| 工件 | 证据 |
|---|---|
| `workflows/transitions.chain.json` | line 4：`phase-setup.md → phase-seed-topics.md` |
| `schema/gate_definitions/gate-setup-ready.definition.json` | line 112：`expected: "seed_topics_ready"` |
| `phase-seed-topics.md` + `check-gate-seed-topics-ready.mjs` + `gate-seed-topics-ready.definition.json` | seed-topics 阶段确实存在并接入链（chain.json line 5） |
| `schema/enums.mjs` | `CurrentGate` 枚举含 `seed_topics_ready` / `hitl1_recorded`（line 4-16） |

### ❌ 仍是旧链（Model A：setup → wave0，无 seed-topics / 无 hitl1）—— 这些是 bug 源
| 工件 | file:line | 旧值 |
|---|---|---|
| **`rb_templates/rb_status.json.tmpl`**（罪魁——被复制进每个新 bundle） | line 6 | `"next_gate": "wave0_complete"` |
| **`gate-instantiation-complete.definition.json`**（用旧链「祝福」了模板的错值） | line 99-103 | `expected: "wave0_complete"` |
| `workflows/nodes/phases/phase-setup.md`（文档文字也错，会误导排障） | line 37 & 64 | 文档称 setup 后 `next_gate: wave0_complete` |
| `schema/contracts/gate.mjs`（`GATE_TRANSITIONS` 抽象 FSM） | line 30-31 | `setup_ready → wave0_complete`；`GATE_MACHINE_STATES`（line 2-11）压根没有 `seed_topics_ready` / `hitl1_recorded` 状态 |

模板与 instantiation gate（前两行）是**直接致病的最小集**：模板写错值，instantiation gate 又把它「合法化」，于是错误值一路活到 setup 才被揭穿。

---

## 5. 影响范围（Blast radius）

- **每个**通过 `instantiate-run-bundle.mjs` 新建的 bundle 都带 `next_gate: wave0_complete`（同一模板）→ **都**死在 setup-ready gate。
- 即 **框架当前无法端到端跑通任何从零开始的真实研究**（RUN.md / start-research 入口直接被堵）。这是 launch blocker。
- 本报告即触发于此：用户照 `DPT_FRAMEWORK/RUN.md` 走 standard 入口，建 `dpt_rb_meal-timing-chrononutrition`，过完 instantiation + hitl1，在 setup 卡死。

> 待 fixer 确认的疑点：现有 E2E（`experiments_playbook/exp_*`、README 称「queue-loop 接入 3 个 playbook 验证通过」）为何没暴露此 bug？猜测：(a) playbook 跑的是 `dpt_disp_*` 实验 bundle，可能走了不同的 fixture/status 路径；(b) playbook 在 seed-topics 插入前跑过、之后没回归；(c) playbook 手动 set 了 status。建议 fixer 顺带查 —— 若实验路径与生产路径分叉，说明实验覆盖有盲区。

---

## 6. 与已知 `_trainsistion` critical FSM bug 的关系

`_backlog/_trainsistion/cc_transition_systemic_analysis.md` 已记录同类系统性问题，本 bug 是它的**又一实例**：

- 该文件 §3e（line 296+）：**「🔴 Critical — `askNext` 的 FSM dispatch 在真实数据上静默失败」**。根因是三种标识符混用 —— short key（`wave0`）、file path（`phases/phase-wave0.md`）、gate name（`wave0-complete`）—— `askNext(gate, state)` 把 gate name 当 node path 传，查 `fsm.states['wave0-complete']` → undefined → 返回 null（line 300）。
- 该文件的链表快照（line 71、94）本身**也是旧链**：`"setup-ready": { "passed": "phases/phase-wave0.md" }`、`"phases/phase-setup.md": { success: "phases/phase-wave0.md" }` —— 即分析写就时 setup 直连 wave0、尚无 seed-topics/hitl1。说明 seed-topics 插入发生在该分析之后，且只更新了 chain.json 这一类工件。
- 该文件结论（line 351）：「FSM 文件存在、engine 存在、spec 存在、Zod schema 存在——但 dispatch bug 使其在真实数据上不可用。」`schema/contracts/gate.mjs`（Model A FSM）极可能是这套「存在但不可用 / 与真相源脱节」的遗物。

**一句话**：`gate.mjs`（抽象 FSM，Model A）与 `transitions.chain.json` + 各 gate def（真相源，Model B）是两套并存的链模型，本 bug 是「真相源已演进到 Model B、而若干 Model A 工件（模板 / instantiation gate / setup 文档 / gate.mjs）漏更新」的直接后果。

---

## 7. 建议修复

### 7a. 最小解锁修复（让框架立刻能跑）—— 改 3 个文件，全部对齐到真相源 Model B

| 文件 | 改动 |
|---|---|
| `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl` | line 6：`"next_gate": "wave0_complete"` → `"seed_topics_ready"` |
| `DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json` | line 102：`"expected": "wave0_complete"` → `"seed_topics_ready"`；line 103 message 同步改 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md` | line 37 & 64：`wave0_complete` → `seed_topics_ready` |

修复后：模板直接产出 `next_gate=seed_topics_ready`，instantiation gate 与 setup gate 对 `next_gate` 要求一致，bundle 能顺畅过 setup → seed-topics → wave0。

> 为什么是 instantiation gate 跟着模板改，而不是反过来？因为真相源（chain.json line 4 + setup gate def + 存在的 seed-topics 阶段）已铁定 setup→seed-topics；`next_gate` 语义是「setup 的下一站」= `seed_topics_ready`。`wave0_complete` 只在已废弃的旧链下成立。

### 7b. 深层修复（根治，归 `_trainsistion` 统一处理）

`schema/contracts/gate.mjs` 的 `GATE_MACHINE_STATES` / `GATE_TRANSITIONS`（Model A 抽象 FSM）与真相源脱节（缺 seed-topics、hitl1）。两条路：
- **退役** `gate.mjs`（若确认 gate CLI 实际走 `transitions.chain.json` + `gate-helpers.mjs`，而非这个 FSM）—— 与 `_trainsistion` §3e 的 dispatch bug 一并处理；
- **或同步** `gate.mjs` 到 Model B：补 `seed_topics_ready`、`hitl1_recorded` 状态与相应 transition，与 chain.json 逐行对齐。

建议归到 `_trainsistion/review_and_suggestion.md` 已规划但「未建 change」的 transition 层清理里统一做（README line 131 已挂账）。

### 7c. 补回归测试

在 `tests/` 加一条：fresh instantiate 一个 bundle → 跑 instantiation + setup 两个 gate 连续 pass，断言 `next_gate` 取值链路一致（防回归）。当前 `tests/` 似乎没有「instantiate→setup 连跑」的集成用例，这正是漏网原因。

---

## 8. Fixer 验证步骤（改完照此验）

```bash
# 1) 干净重建一个 bundle（换个名，避免与本报告的 bundle 冲突）
node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs verify-nextgate-fix
cat dpt_rb_verify-nextgate-fix/rb_status.json   # 应见 next_gate: "seed_topics_ready"

# 2) instantiation gate 仍过
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs \
  --bundle dpt_rb_verify-nextgate-fix --current-node phases/phase-instantiation.md
# → passed: true

# 3) 模拟 hitl1：把 rb_profile.yaml 的 hitl1.status 设 recorded + 写 root_must_answer_set（或直接跑现成 hitl1 流程）
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs \
  --bundle dpt_rb_verify-nextgate-fix --current-node phases/phase-hitl1.md
# → passed: true

# 4) setup gate —— 修复后应过，且 check.next = phases/phase-seed-topics.md
node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs \
  --bundle dpt_rb_verify-nextgate-fix --current-node phases/phase-setup.md
# → passed: true, routing.next = "phases/phase-seed-topics.md"

# 5) 清理验证 bundle
rm -rf dpt_rb_verify-nextgate-fix
```

---

## 9. 待 fixer 决策的开放问题

1. `next_gate` 语义确认为「`current_gate` 的下一站 gate」？若是，则 instantiation-time `next_gate` 应随 setup→seed-topics 取 `seed_topics_ready`（本报告假设）。若语义另解（如「run 终态 gate」），需重新定调 —— 但 chain.json 是 phase 级真相源，gate 级 next_gate 应与之对齐，无歧义。
2. `gate.mjs`（Model A FSM）是否仍在任何运行时路径被读取？若否，直接退役最干净；若是，需评估改它的影响面（牵涉 `_trainsistion` dispatch bug）。
3. 现有 E2E playbook 为何没抓到？（见 §5 疑点）—— 决定是否需要补 fixture / 把 `dpt_disp_*` 实验路径与生产路径对齐。
4. 是否还有其它「旧链」残留（如其它 phase 文档、`START_FROM_HERE.md` 模板、inspect-bundle 的 status 检查）也写了 `wave0_complete` 当 setup 的下一站？建议 fixer 全仓 grep `wave0_complete` 与 setup 的配对，一次性清干净。

---

## 附录 A：本 bug 触发时的完整运行上下文（供 fixer 复盘）

- **触发场景**：用户执行 `/Users/bowhead/ai_tool_deepresearch/DPT_FRAMEWORK/RUN.md` 入口，要跑一次真实 research（题目：进餐时序 chrononutrition；profile: exploratory_map）。
- **bundle**：`/Users/bowhead/ai_tool_deepresearch/dpt_rb_meal-timing-chrononutrition`（已建，rb_plan.md / rb_profile.yaml 已填，停在 setup 卡死）。
- **我执行过的命令序列**（全部成功，直到 setup gate）：
  1. `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs meal-timing-chrononutrition` → 创建成功，validate-bundle + inspect-bundle pass。
  2. 写 `rb_plan.md`（Purpose / Research Questions / Scope / 5 个 seed topics 进 topic_registry）。
  3. `check-gate-instantiation-complete` → `passed: true`，`next: phases/phase-hitl1.md`。
  4. HITL1：`AskUserQuestion` 收集（profile / must-answer / 来源 / 读者）→ 写 `rb_profile.yaml`（research_profile=exploratory_map, root_must_answer_set 4 条, hitl1.status=recorded, recorded_at=2026-06-26T07:52:42Z）。
  5. `check-gate-hitl1-recorded` → `passed: true`，`next: phases/phase-setup.md`（**此 gate 未改 next_gate，仍是 wave0_complete**）。
  6. `check-gate-setup-ready` → **`passed: false`**（本 bug）。`rb_status.json` 当时为：
     ```json
     { "bundle": "meal-timing-chrononutrition", "current_mode": "execution",
       "state": "not_started", "current_gate": "setup_ready", "next_gate": "wave0_complete" }
     ```
- **对该 bundle 的临时解锁（若不想等框架修复、想立刻续跑本次研究）**：把 `rb_status.json#/next_gate` 手动改成 `"seed_topics_ready"` 再 rerun setup gate。这是 gate fail-fix 表里「Status drift → 恢复 next_gate」的合法就地修复（真相源以 chain.json 为准）；但**治标不治本**，模板不修则每个新 bundle 重蹈覆辙。是否对当前 bundle 做此临时修复，由用户决定（报告人未擅自动 bundle）。

## 附录 B：关键证据 file:line 速查

| 证据 | 位置 |
|---|---|
| 权威链 setup→seed-topics | `workflows/transitions.chain.json:4` |
| setup gate 要 seed_topics_ready | `schema/gate_definitions/gate-setup-ready.definition.json:109-113` |
| instantiation gate 要 wave0_complete（致病的「祝福」） | `schema/gate_definitions/gate-instantiation-complete.definition.json:99-103` |
| 模板错值来源 | `rb_templates/rb_status.json.tmpl:6` |
| setup 文档旧文字（误导） | `workflows/nodes/phases/phase-setup.md:37,64` |
| 旧链抽象 FSM（缺 seed-topics/hitl1） | `schema/contracts/gate.mjs:2-11,30-31` |
| 枚举含新值（证明新链是规范） | `schema/enums.mjs:4-16` |
| 已知同类 critical FSM bug | `_backlog/_trainsistion/cc_transition_systemic_analysis.md:296-351` |
