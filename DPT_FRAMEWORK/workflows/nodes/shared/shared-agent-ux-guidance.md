---
node_type: shared
id: shared-agent-ux-guidance
shared_scope: agent-ux
authority: behavioral-contract
requires: []
suggested_context:
  - shared/shared-profile
  - brief/hitl1
  - brief/hitl2
---

# Shared: Agent UX Guidance（HITL 对话环的行为约定）

## Purpose

定义 HITL1 和 HITL2 阶段 Agent 与用户交互的行为契约——环的四阶段模型（入口 → 环内 → 出口 → 防无限环）、中文优先约定、以及 "我不确定" 优雅降级路径。

此文件是 **行为约定（behavioral contract）**——Agent 在执行 HITL phase 时 SHALL 遵守本文中的交互规则。具体用户可见的 prompt 文案在 `brief/hitl1.md` 和 `brief/hitl2.md` 中定义。

**Authority boundary**：此文件定义 Agent 行为规则，不替代 Engine 的 gate/schema 校验。环的出口后，gate CLI 检查 profile 的结构完整性——不参与环内行为判断。

---

## 1. HITL 环的四阶段模型

@impl HIU-001, HIU-006

HITL1 和 HITL2 的用户交互 SHALL 遵循**环（loop）**模型——用户进入 HITL 后可以探索、提问、获得帮助后再做出决定。HITL 不是线性问卷，Agent SHALL NOT 将用户逐问驱赶。

### 1.1 入口（Entry）

Agent SHALL 一次性展示准备好的内容：
- 字母菜单（来自 `brief/hitl1.md` 或 `brief/hitl2.md` 的入口 prompt 模板）
- 可选输入区域
- 明确的信号文本："可以直接选字母，也可以问我问题"

入口的具体 prompt 格式由 HIU-002（HITL1）和 HIU-003（HITL2）分别定义。

### 1.2 环内（In-Loop）

Agent SHALL 根据用户行为分类响应：

| 用户行为 | Agent 反应 |
|---------|-----------|
| **直接选择**（如 "A"、"选 quick_factual"） | 回显选择 + 显式二次确认 → 快出口 |
| **对比询问**（如 "A 和 C 有什么区别？"） | 解释差异后轻推回主路径："还有其他问题吗？还是可以选了？" |
| **BTW 问题**（如 "adversarial verification 是什么意思？"） | 回答 BTW 问题后轻推："还有其他问题吗？还是可以继续选？" |
| **改变主意**（如 "不对，我其实想选 B"） | 视为正常环内行为，重新讨论选项 |
| **无关输入**（如闲聊、不相关请求） | 简短回应后轻推回主路径；对于不相关请求，说明当前处于研究设置阶段，该请求可在研究完成后处理 |

### 1.3 出口（Exit）

出口条件是**用户显式确认**，不是"所有问题被回答"。

出口流程：
1. 用户做出选择（如 "OK 选 C"）
2. Agent 显式二次确认："确定选 C（claim_verification）？必须回答写'XX'？确认后我会写入 profile 并推进。"
3. 用户确认（如 "确定"）
4. Agent 写入 profile → run gate → 链推进

如果用户在选择确认后说 "不对，我其实想选 B"，Agent SHALL 视为改变主意，回到环内。

### 1.4 防无限环（Anti-Infinite-Loop Nudge）

Agent SHALL 追踪用户探索轮数。

**一轮的定义**：用户发送一条非直接选择的探索性消息（对比询问、BTW 问题、改变主意）算一轮；用户直接选字母（A/B/C/D/E）不算探索轮，立即进入出口流程。

**两级轻推策略**：
- **第 3 轮左右**：温和引导——"目前为止我们讨论了 X 和 Y，你觉得哪个方向更适合？"
- **5+ 轮**：升级轻推——主动总结已讨论内容 + 给明确建议 + 重申出口方式（"你随时可以说 A/B/C 选定"）

Agent SHALL NOT 设置硬性最大轮数导致强制退出。如果用户继续 productive exploration（而非 stuck），Agent SHALL 继续响应。

**子环规则**：如果 HITL 环内出现子环（如 HITL2 中用户选 B 进入视角选择子环），子环的轮数 SHALL 独立计数，不与外层环合并。子环内轻推策略与外层相同。

---

## 2. 中文优先约定

@impl HIU-004

所有用户可见的 HITL 交互 SHALL 使用中文：
- 选项描述和引导文字 SHALL 为中文
- 英文 canonical name SHALL 只在括号中作为辅助参考出现
- 内部 enum 值、文件路径、字段名、CLI 命令 SHALL 保持英文 canonical form

例：
- ✅ 用户看到："A: 快速事实核查（quick_factual）"
- ✅ 内部写入：`research_profile: quick_factual`
- ❌ 禁止：用户 prompt 中以英文为主、中文为辅助

---

## 3. "我不确定" 优雅降级路径

@impl HIU-005

当用户对 must-answer 问题不确定时，系统 SHALL 提供优雅降级路径。

**must-answer 不确定处理**：
- 用户可以写 "我不确定，先帮我拆问题" 或类似表达
- Agent SHALL 将该条目标记为 `gap_queue_backed` 状态——条目文本内容本身表达不确定性（如包含 "不确定"/"先帮我拆"/"不知道具体该问什么" 等语义标记），下游 phase 通过文本模式识别
- 不确定不是错误——Agent SHALL NOT 阻塞流程或要求用户必须给出具体问题

**可选偏好处理**：
- 搜索偏好等可选输入不写就过
- Agent SHALL 记录 `not_specified_use_profile_defaults`
- Agent SHALL NOT 追问或要求用户必须提供

**下游衔接**：
- `gap_queue_backed` 条目 SHALL 在 seed-topics 阶段被识别并排入 question decomposition task card
- HITL1 gate SHALL pass（`root_must_answer_set` 非空即满足）
