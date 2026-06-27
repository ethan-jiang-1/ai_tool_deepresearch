> **实现依赖关系**：1（HITL UX guidance）、2（silent execution）和 3（brief 文案）可并行起草（环的概念已在 spec 中定义）；4（hitl1）和 5（hitl2）依赖 1、2、3；6（wave MDs）和 6bis（seed-topics）依赖 2；7（drift + manifest）依赖 4、5、6；8（registry）独立于 1-7，仅 HIU-*/SWE-* 注册依赖 spec 完成后执行。
>
> **并行组**：{1, 2, 3} → {4, 5, 6, 6bis} → 7 ‖ 8

## 1. 创建 shared-agent-ux-guidance.md（环的规则 + HITL 对话约定）

- [x] 1.1 创建 `DPT_FRAMEWORK/workflows/nodes/shared/shared-agent-ux-guidance.md`，定义环的四阶段模型 @impl HIU-001, HIU-006
  - 入口：Agent 一次性展示内容 + 选项 + "可以直接选，也可以问问题"
  - 环内：用户行为分类表（直接选/对比询问/BTW 问题/改变主意）及 Agent 对应反应
  - 出口：用户显式确认 → 写 profile → run gate；出口条件是确认而非所有问题被回答
  - 防无限环：两级轻推策略——第 3 轮左右开始温和引导（"目前为止我们讨论了 X 和 Y，你觉得哪个方向更适合？"）；5+ 轮时主动总结已讨论 + 给明确建议 + 重申出口方式。不设硬上限
- [x] 1.2 在 `shared-agent-ux-guidance.md` 中写入中文优先约定 @impl HIU-004
  - 用户可见交互使用中文，内部 enum/路径/字段名保持英文
- [x] 1.3 在 `shared-agent-ux-guidance.md` 中写入 "我不确定" 优雅降级路径 @impl HIU-005
  - must-answer 不确定时记录 `gap_queue_backed`，不阻塞流程
  - 可选偏好的处理：不写就 `not_specified_use_profile_defaults`，不追问

## 2. 创建 shared-silent-execution.md（静默阶段纪律 + 降级规则 + 冲突覆盖）

- [x] 2.1 在 `shared-silent-execution.md` 中写入静默阶段核心行为纪律 @impl SWE-001
  - Agent 在 wave0/1/2 期间 SHALL NOT 浮出水面（不展示内容、不提问、不确认、不报告进度）
  - 遇错自行处理：按降级优先级链（重试 → 换源 → 降级方法 → 标记 gap），记录 `gap_impact` 评估
  - 阻塞条件消除后自动恢复，不报告用户
  - "继续吗？" 类消息在静默阶段完全禁止
  - setup 和 seed-topics 同属静默阶段（`stop: no`），因执行时间短，实践中几乎不会触发降级——但静默纪律同样适用
- [x] 2.2 在 `shared-silent-execution.md` 中写入 repair escalation 冲突覆盖规则 @impl SWE-001
  - 当 `shared-repair-guidance.md` 的 escalation 条件触发（repair 3 次 fail、"需要用户 decision"等）时，静默合约优先——改 escalation 为降级（按降级优先级链选择 + trace 完整记录 + 继续执行）
  - 显式覆盖 `shared-anti-cheating-rules.md` 规则 3（"不能在 escalation 条件触发后继续假装一切正常"）——在静默阶段，降级 + trace + 继续本身就是正确的静默行为，不是"假装正常"
- [x] 2.3 在 `shared-silent-execution.md` 中写入降级期间 state 规则 @impl SWE-001
  - Agent SHALL NOT 将 `rb_status.json` state 设为 `blocked`——保持 `in_progress`，降级信息通过 `rb_trace.jsonl` 的 `silent_degradation` event 记录
  - 到达 HITL2 时汇总报告静默期积累的降级和未解决阻塞（按 `gap_impact` 严重程度分布 + 每个 `blocks_must_answer` 的详细描述）
- [x] 2.4 在 `shared-silent-execution.md` 中写入用户主动消息的处理规则 @impl SWE-001
  - 用户在静默阶段主动发送消息时（如 "怎么样了？"、"还要多久？"），Agent MAY 以单轮、陈述式状态回复——回复 SHALL 以句号结尾（不以问号结尾）、SHALL NOT 邀请进一步对话、SHALL NOT 提供选项
  - Agent SHALL NOT 因用户消息而停止等待——回复后继续执行
  - Agent SHALL NOT 将用户消息当作 HITL 交互——不进入环模型，不询问决策
  - 即使用户连续发送多条消息，Agent SHALL 仅做单轮状态告知（不展开对话环）
  - 如果用户消息包含研究相关的补充信息（如 "对了，也帮我看看 X"），Agent SHALL 记录到 `rb_trace.jsonl` 但不立即处理——在 HITL2 时提醒用户该补充信息尚未纳入当前研究

## 3. 创建 brief/ 目录（HITL1/HITL2 用户可见文案）

- [x] 3.1 创建 `DPT_FRAMEWORK/workflows/nodes/brief/hitl1.md`，包含 HITL1 入口 prompt + 出口语 @impl HIU-002, SWE-001
  - A/B/C 字母菜单：中文描述 + 英文 canonical name 在括号中
  - must-answer 一句话输入 + "我不确定" 示例 + 可选搜索偏好
  - 模板文字用 `<!-- TEMPLATE START -->...<!-- TEMPLATE END -->` 包裹，动态填入部分用 `{DYNAMIC: variable_name}` 占位符
  - 出口语：Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2，不估时，可关终端，下次 HITL2
- [x] 3.2 创建 `DPT_FRAMEWORK/workflows/nodes/brief/hitl2.md`，包含 HITL2 入口 prompt + 出口语（A/B/C/D/E 五路径）@impl HIU-003, SWE-001
  - 语境叙事模板（三个动态填入：能回答/不足/优先补）
  - A/B/C/D/E 字母决策菜单
  - 出口语：proceed_to_readiness + view_revision/rerun/repair/stop_blocked 各 1-2 句

## 4. 更新 phase-hitl1.md

- [x] 4.1 更新 `phase-hitl1.md` requires：添加 `shared/shared-agent-ux-guidance` 和 `shared/shared-hitl-prompt-templates` @impl HIU-001, HIU-002
- [x] 4.2 在 phase-hitl1.md §3b 替换 "见下方 checklist" 为引用 prompt 模板的明确指令：
  - Agent 读取 `shared-hitl-prompt-templates.md` 获取 HITL1 精确 prompt 文本
  - Agent 填入动态部分（topic rewrite 结果 + seed topics 预览）
  - Agent 遵循 `shared-agent-ux-guidance.md` 的环内行为规则
- [x] 4.3 在 phase-hitl1.md 中加入搜索偏好收集指引（可选，不写就过，不追问）
- [x] 4.4 在 phase-hitl1.md 中加入 HITL1 出口指引：gate pass 后 → 发送出口语（引用 `shared-hitl-prompt-templates.md` 中的 HITL1 出口语模板）→ 推进到 setup @impl SWE-001
- [x] 4.5 修正 phase-hitl1.md §4 Payload Checklist 中 `research_style_params` 行的描述：当前写"从 `<profile>.yaml` 逐字段抄入，不得跳过任何字段"——与 §3c 的 CLI 指令矛盾（§3c 说 CLI 是唯一权威，Agent 不手写）。改为"由 `apply-research-style.mjs` CLI 写入（见 §3c 步骤 1-3），Agent 不手写参数。CLI 后验证 stdout 中的 `applied`、`topic_count`、`wave0_shared_ref_total` 值"
- [x] 4.6 修正 phase-hitl1.md §7 On Gate Fail 表格中 `research_style_params` 的修复方向：当前写"按 §3c 步骤重新从 YAML 抄入"——改为"重新运行 `apply-research-style.mjs` CLI"

## 5. 更新 phase-hitl2.md

- [x] 5.1 更新 `phase-hitl2.md` requires：添加 `shared/shared-agent-ux-guidance` 和 `shared/shared-hitl-prompt-templates` @impl HIU-003
- [x] 5.2 在 phase-hitl2.md 中加入语境叙事生成指引：
  - Agent 从 Wave0/1/2 artifacts 中提取三个动态填入内容
  - 展示 prompt 前先写 decision-brief.md + 设 hitl2.status = pending_user
- [x] 5.3 在 phase-hitl2.md 中加入 A/B/C/D/E 字母映射表 @impl HIU-003
  - 映射表的值是写入 `rb_profile.yaml` 的 canonical enum 值
  - 用户 prompt 括号中的英文是用户友好描述（如 "change final report view"），不是 enum 值——Agent 必须用此映射表翻译，不能直接抄 prompt 括号内容
  - A → proceed_to_readiness
  - B → request_view_revision
  - C → rerun
  - D → repair
  - E → stop_blocked
- [x] 5.4 修正 phase-hitl2.md 中 "4 个选项" → "5 个选项" 的计数错误（搜索 "4 个" 定位：§3 Allowed Actions 中 "4 个 user_decision 选项" 和 §7 On Gate Fail 表格中 "修正为 4 个合法值之一"）
- [x] 5.5 在 phase-hitl2.md 中加入 HITL2 出口指引（proceed_to_readiness 路径）：gate pass 后 → 发送出口语（引用 `shared-hitl-prompt-templates.md` 中的 HITL2 出口语模板）→ 推进到 readiness @impl SWE-001

## 6. 更新 wave phase MDs（requires 链 + search_preference 下游使用）

- [x] 6.1 更新 `phase-wave0.md` requires：添加 `shared/shared-silent-execution` @impl SWE-001
  - 确保 Agent 在 wave0 执行时加载静默阶段行为纪律
  - 同时在 phase-wave0.md 的 §8 Stop Behavior 或 §9 Anti-Cheating Rules 中加一行显式的静默提醒（如 "本 phase 在静默自主阶段。遇错按 shared-silent-execution.md 的降级优先级链处理，绝不浮出水面。"）——避免静默纪律在大量 requires 文件中被淹没
- [x] 6.2 更新 `phase-wave1.md` requires：添加 `shared/shared-silent-execution` @impl SWE-001
  - 同时在 phase-wave1.md 正文中加入与 6.1 相同的显式静默提醒
- [x] 6.3 更新 `phase-wave2.md` requires：添加 `shared/shared-silent-execution` @impl SWE-001
  - 同时在 phase-wave2.md 正文中加入与 6.1 相同的显式静默提醒
- [x] 6.4 在 phase-wave0.md、phase-wave1.md、phase-wave2.md 的 Actions 节中加入 `search_preference` 下游使用指引 @impl HIU-002
  - Agent SHALL 在 wave 执行期间读取 `rb_profile.yaml` 的 `search_preference` 字段
  - 将用户的自然语言偏好作为搜索策略的软约束（如 "优先找中文资料" → 优先搜索中文源；"关注 2024 年后" → 优先检索近期文献）
  - `search_preference` 不替代 `research_style_params` 的硬参数（如 source quality tier），而是在硬参数框架内的搜索策略倾斜

> **注意：subagent variant 文件不更新。** `phase-wave0-subagent.md`、`phase-wave1-subagent.md`、`phase-wave2-subagent.md` 不需要在 `requires` 中添加静默纪律——subagent 返回 structured JSON 给 Phase Agent，没有直接用户交互通道。静默纪律由父 phase MD 的 `requires` 加载，Phase Agent 在 orchestrating subagent 调用时遵守。

### 6bis. 更新 phase-seed-topics.md（gap_queue_backed 处理）@impl HIU-005

- [x] 6bis.1 在 `phase-seed-topics.md` 的 Actions 节中加入 `gap_queue_backed` 处理指引
  - Agent SHALL 读取 `root_must_answer_set`，通过文本模式识别标记为 `gap_queue_backed` 的条目（包含 "不确定"/"先帮我拆"/"不知道具体该问什么" 等不确定性语义标记）
  - 对每个 `gap_queue_backed` 条目，Agent SHALL 在 seed-topics 阶段生成对应的 question decomposition task card——将用户的不确定问题拆解为具体的澄清/探索子问题
  - Agent SHALL NOT 阻塞流程或要求用户澄清——gap_queue_backed 是正常的输入状态，不是错误

## 7. 修正 drift + 更新 manifest

> **`search_preference` schema 注意事项**：`search_preference` 在 `rb_profile.yaml` 中作为 informal YAML key 存储（不经过 Zod 校验）。ProfileSchema 暂不新增此字段——当前 scope 下 DPT_FRAMEWORK/ 不动。Agent 直接读写 YAML 中的 `search_preference` key，gate 不检查此字段。正式的 schema 支持留待后续 change。

- [x] 7.1 修正 `shared-profile.md` 中的字段名 drift：对比 `DPT_FRAMEWORK/schema/contracts/profile.mjs` 中的实际 Zod schema 字段名（`ResearchStyleParamsSchema`，共 12 个字段），逐字段对照修正 shared-profile.md 的 `research_style_params` 子字段表。完整的 drift 清单：
			  - **名称错误**：`wave0_shared_ref_floor` → 应为 `wave0_per_topic_source_floor`（`profile.mjs:9`）
			  - **缺失字段 1**：`wave0_shared_ref_total`（`profile.mjs:10`，integer，CLI 计算的全局总量，需标注 "computed by apply-research-style.mjs"）
			  - **缺失字段 2**：`wave2_cross_topic_depth`（`profile.mjs:21`，integer，wave2 跨 topic 深度，Agent guidance）
			  - **缺失字段 3**：`wave2_emergent_search_rounds`（`profile.mjs:22`，integer，wave2 emergent search 轮数，Agent guidance）
			  - **描述过时**：`research_style_params` 的填写时机描述（"Agent 从 `<profile>.yaml` 逐字段抄入"）已过时——实际流程是运行 `apply-research-style.mjs` CLI 写入。修改为"由 `apply-research-style.mjs` CLI 写入，Agent 不手写参数"
			  - **gate 行为描述补充**：`research_style_params` 的 gate 行为行（"hitl1-recorded gate 不检查此字段"）需补充"但下游 gate CLI（wave0/wave1）通过 `threshold_source` → `resolveThreshold()` 从此字段读取动态 count_floor 阈值"
			  - **示例 YAML 修正**：示例中的 `wave0_shared_ref_floor: 12` → `wave0_per_topic_source_floor: 12`，并补充缺失的三个字段（`wave0_shared_ref_total`、`wave2_cross_topic_depth`、`wave2_emergent_search_rounds`）
- [x] 7.2 更新 `DPT_FRAMEWORK/workflows/manifest.json`：注册 `shared-agent-ux-guidance.md` 和 `shared-silent-execution.md`

## 8. Registry 治理改进 + 注册新 requirement ID

本 change 引入三个新 capability（`hitl-ux`、`silent-wave-execution`、`requirement-traceability`）。
前两个在已有 delta spec 中定义（HIU-001..006、SWE-001），本节注册其 ID；
第三个（RET-001..006）定义 `req-registry.yaml` 和 `config.yaml` 的治理契约，
在本 change 中同步实现（参见 design.md Decision 8）。

### 8a. config.yaml 固化 capability 边界约定 @impl RET-003

- [x] 8a.1 在 `openspec/config.yaml` `context:` 需求追踪节添加 Registry 组织约定
  - `# <capability-name>` 组头与 `openspec/specs/<capability-name>/` 一一对应，不存在合成组
  - `prefixes:` 映射块是缩写→全称的唯一自文档化来源
  - ID 按 capability 分组，组按字母序，组内按数字序
  - Delta 段不允许，废弃 ID 规则
- [x] 8a.2 在 `openspec/config.yaml` `rules.specs:` 添加 Capability 边界测试（4 条条件 + 反例）
  - 约束条件不同 / 独立 requires 链 / 独立 gate / 不同 Engine 模块 → 应为独立 capability
  - 反例：把"UX 相关"放一起——"UX"是主题标签不是能力边界

### 8b. req-registry.yaml 添加 prefixes: 自文档化映射 @impl RET-001

- [x] 8b.1 运行基线：`node openspec/governance/check-project-reqs.mjs` 确认当前 PASS
- [x] 8b.2 在 `req-registry.yaml` 头部注释后插入 `prefixes:` 映射块
  - 全部活跃前缀 + 废弃前缀（当前约 60 个前缀），按字母序
  - 每个前缀映射到 kebab-case capability 全称（如 `SCO: schema-core`）
  - sub-prefix 标注归属（如 `SOR: schema-core`）
  - 废弃 capability 标注 `# no spec directory`
  - 验证：`check-project-reqs.mjs` 仍 PASS（新 key 不匹配 `[A-Z]{3}-\d{3}`，自动忽略）

### 8c. req-registry.yaml 重组为单 capability 单组 @impl RET-002, RET-004, RET-005

- [x] 8c.1 标准化所有组头为 `# <kebab-case-capability-name>`（不改 ID 值，只改 `#` 注释行）
  - 解散合成/meta 组头（`wff-*`、`bundle-infrastructure`、`subagent-system`、`workflow-foundation — contracts`、`dedup-experiments-framework`、`wff-skeleton-validation`、`wff-state-chain` 等）
  - 吸收 delta 组头（`schema-core (delta)`、`research-wave-*-implementation (delta)`、`workflow-directory-contract (delta)`、`bundle-start-from-here (delta)` 等）
- [x] 8c.2 将 ID 归位到各自 capability 组下
  - GSK-004/005 从 `# logging-conventions` → `# gate-skeleton`
  - SCO-012 从 `# plan-hostfile-sections` → `# schema-core`
  - RWG-014 从 `# plan-hostfile-sections` → `# research-wave-gate-implementation`
  - LFW-001..004 从 `# logging-conventions` → `# lifecycle-walker — all entries deprecated; no spec directory`
  - SCO-009 从 `# dedup-experiments-framework` → `# schema-core`
- [x] 8c.3 注册新 ID：在 `# hitl-ux` 组添加 HIU-001 ~ HIU-006，在 `# silent-wave-execution` 组添加 SWE-001
- [x] 8c.4 组按字母序排列，组内 ID 按数字序
- [x] 8c.5 废弃 capability 组放在文件末尾（字母序），标 `— all entries deprecated; no spec directory`

### 8d. 合规验证 @impl RET-006

- [x] 8d.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
- [x] 8d.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS
- [x] 8d.3 `diff` 验证：重组前后 ID 集合完全一致（仅新增 HIU-001..006 和 SWE-001）
