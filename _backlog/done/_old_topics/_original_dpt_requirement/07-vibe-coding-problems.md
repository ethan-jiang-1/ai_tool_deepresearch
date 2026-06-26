# 07 — Vibe Coding 导致的维护问题诊断

## 什么是 "Vibe Coding" 问题

原始 V12 系统以 **Markdown 作为"代码"**，LLM Agent 作为"运行时"。规范、状态管理、验证逻辑全部写在 Markdown 文件中，Agent 通过**阅读和遵守**这些文本来执行。这种方式在原型阶段可以快速迭代，但在长期维护中暴露了系统性问题。

---

## 问题 1：规范与执行脱节

**现象：**
- 系统有 ~22 条不变量、~200 个规范术语、~30 个规范文件
- CLI 工具 (`check_framework.mjs`) 只能做**只读诊断**，输出 `PASS/FAIL E###` 风格
- CLI 工具不能写修复、不能强制 gate 通过、不能阻止 Agent 违规
- Agent（Claude/Codex）被期望读取并遵守规范，但：
  - Agent 可能 drift（规范说"不要在 Wave 1 完成时停下"，但 Agent 可能仍然停下）
  - Agent 可能忘记检查某些字段（有 26 个参考字段，但 Agent 可能只填了 10 个）
  - Agent 可能跳过 gate 审计（规范说必须通过 STATUS 显式审计，但 Agent 可能散文式总结）

**根因：** 规范是 prose，执行是 agent，中间没有强制执行层。

---

## 问题 2：类型系统是"约定"而非"强制"

**现象：**
- `acceptance_status` 值必须是 `accepted / reviewed_uncounted / excluded / background`
- `tier` 值必须是 `tier_1 / tier_2 / tier_3 / tier_4`
- Queue 工作单元有 13 个必填字段 + Refill Pool 额外 5 个字段
- 但这些只是写在 Markdown 里的约定：
  - 没有类型检查
  - 没有编译时验证
  - Agent 写错字段名/值不会立即报错
  - 错误只在后续 gate 审计（甚至更晚的 Readiness）时才发现

**根因：** 系统定义了一套丰富的领域类型但没有用代码表达。CONSTANTS.md 列举了所有枚举值，但 Agent 不需要 import 它们——它只需要"读到并记住"。

---

## 问题 3：状态机隐藏在散文中

**现象：**
- `current_gate` 的合法转换分散在 10+ 个文件中：
  - `instantiation_complete → setup_ready → wave0_complete → wave1_complete → wave2_complete → readiness_passed`
  - Gate reopen 逻辑在 CHARTER.md
  - 拓扑变更影响在 METHODOLOGY.md
  - stop_authorization_state 的合法值在 CONSTANTS.md
  - 转换条件在 GATES.md + gates/*.md
  - 前置/后置条件在 QUEUE_CONTRACT.md
- 没有一个地方可以看到完整的状态机
- 没有转换验证——Agent 可以直接把 `current_gate` 从 `setup_ready` 改成 `wave2_complete`

**根因：** 状态机是系统的心跳，但没有被建模为代码。

---

## 问题 4：过度防御性设计——"Projection Map" 反模式

**现象：**
- 规范系统定义了 "Projection Map"：规则从权威文件（如 CHARTER.md）复制到生成文件（如 output_templates/PLAN.md）
- 理由是"生成的文件必须自包含以便执行"
- 但这意味着：
  - 修改一个规则需要同步 **5-10 个文件**
  - AGENT-GUIDE.md 说"更新规范权威 first，然后只更新必要的投影目标"
  - 实际上这很少发生——投影副本逐渐偏离权威
  - Projection Map 表本身有 18 行，每行列出了源→投影→验证表面的映射

**根因：** 系统知道自己在重复，但把重复变成了 feature（"投影"），而非 bug。在代码系统中，这可以通过 import/include 或代码生成解决。

---

## 问题 5：Markdown 作为"代码"的根本局限

| 问题 | 表现 |
|------|------|
| **无状态管理** | 状态存在于 5 个 Markdown 文件中。没有事务——Agent 可能更新 STATUS 但忘记更新 QUEUE |
| **无原子性** | "同步 PROFILE/STATUS/QUEUE 到 HITL2 pending_user 状态"需要写 3 个文件，没有事务保证 |
| **无引用完整性** | `backing_refs` 引用 `REFERENCE_DIR` 中的文件，但没有检查这些文件是否真的存在 |
| **验证是事后** | CLI 工具做 read-only 检查**事后**发现问题，而不是在写入时阻止问题 |
| **无 diff/merge** | git 可以跟踪 Markdown 变更，但 Agent 产生的微妙格式变化可能破坏解析 |
| **搜索脆弱** | "read the five root control files"——Agent 必须用 grep/find 定位文件，没有确定性的路径解析 |

**根因：** 系统要的是一个带验证的运行时，但只有一个 Agent + Markdown 文件。

---

## 问题 6：规范文件的规模失控

**统计数据：**
- `CHARTER.md`: ~323 行，定义 Source of Record 矩阵（50 行）、Projection Map（18 行）、规范术语（~70 个）
- `METHODOLOGY.md`: ~607 行，包含证据规则、探索/利用框架、artifact 生命周期、问题协议、trace 规范
- `execution-flow.md`: ~630 行，包含 Wave 0/1/2 协议、HITL 协议、拓扑 formalization、停止条件
- `instantiation-flow.md`: ~358 行，包含输入模型、参数推导、话题注册表推断、检查清单、拒绝 gate
- 总计 **~2500+ 行规范**，分散在 15+ 个文件中

**根因：** 规范向所有方向生长，没有模块边界。一个改动可能需要读 5 个文件才能理解影响。

---

## 问题 7：Agent 是单点故障

**现象：**
- 整个系统的"运行时"是 LLM Agent 阅读 Markdown + 手动执行
- Agent 的质量波动直接影响研究质量
- 没有 guardrail 阻止 Agent 偷懒（跳过网页诊断、不写 completion_receipt、不填满 5 个队列槽位）
- "不要做 X" 的规则有 50+ 条——Agent 不可能全部记住
- 系统设计了 "Anti-Stall Degradation" 来防止 Agent 在单个细节上卡住，这本身就说明 Agent 行为不可靠

**根因：** Agent 应该是"内容生产者"（搜索、阅读、写证据、综合），不应该同时是"规则执行者"。

---

## 总结：Vibe Coding → Spec Coding 的关键转变

| 维度 | Vibe Coding (V12) | Spec Coding (目标) |
|------|-------------------|-------------------|
| 规范 | Markdown prose | Code (types/schemas/validators) |
| 类型 | 约定（"值必须是 X"） | 强制（编译器/验证器拒绝非法值） |
| 状态机 | 隐含在散文中 | 显式建模，转换验证 |
| 验证 | 事后 CLI 检查 | 写入时验证 |
| 事务 | 无 | 原子更新 |
| Agent 角色 | 理解和执行规则 | 内容生产 + 框架调用的 API |
| 规则修改 | 同步 5-10 个文件 | 改代码，自动传播 |
| 测试 | 手动回归测试 (.mjs) | 单元测试 + 集成测试 |
