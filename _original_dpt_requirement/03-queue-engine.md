# 03 — Queue 驱动的执行引擎

## Queue 对象契约

### Queue 权威边界

**QUEUE_PATH 拥有：**
- 可执行工作单元
- 5 槽位顺序滚动窗口
- Refill Pool 候选池
- 用户可见停止授权字段
- Native todo/task/plan 投影状态
- 验证失败/gate 审计失败/拓扑漂移/artifact 过时后产生的修复工作

**QUEUE_PATH 不能拥有或发明：**
- PLAN 目标、话题身份、配置地板、profile 配置
- STATUS 差距、gate 审计真相、计数器、清单、阻塞项、运行状态
- REFERENCE 证据体或计数来源权威
- ARTIFACT 合成真相
- TRACE 诊断历史

---

## Queue 工作单元契约

### 活跃槽位必填字段

| 字段 | 含义 |
|------|------|
| `work_id` | 当前 Queue 单元的稳定本地 ID |
| `action` | 要执行的具体工具/文件/搜索/检查/回填/推广动作 |
| `producer_rule` | 创建此工作单元的规则或事件（14 种合法来源） |
| `source_gap` / `status_gap` / `gate_gap` / `plan_target` / `trigger` | **谱系字段**（五选一）：为什么这个任务存在 |
| `why_this_matters` | 为什么这项工作改变运行质量或防止漂移 |
| `impact_scope` | 受影响的文件、话题、gate、artifact、参考或停止状态 |
| `required_receipts` | 工作开始前必须存在的前置条件 |
| `done_condition` | 工作完成时必须为真的条件 |
| `verification` | Agent 或 CLI 如何检查工作确实完成 |
| `writes_to` | 具体本地写入目标 |
| `status_sync` | 必须同步的 STATUS/QUEUE 字段 |
| `completion_receipt` | 此工作留给后续工作或 gate 的持久化凭证 |
| `failure_route` | 在哪里记录失败，以及排什么修复工作 |

### Refill Pool 候选额外字段

- `priority_class`
- `prerequisite`
- `promotion_trigger`
- `preempted_from_slot`
- `restore_priority`

---

## 合法 Producer Rule（14 种）

Queue 工作只能由以下规则创建：

| Rule | 触发场景 |
|------|---------|
| `initial_window_render` | 实例化后初始填充 |
| `setup_repair` | 修复设置问题 |
| `slot_completion_refill` | 槽位完成后正常推进 |
| `queue_thin_refill` | 队列变薄需要补充 |
| `urgent_preemption` | 紧急抢占 |
| `failed_gate_audit` | Gate 审计失败 |
| `gate_reopen` | Gate 被重新打开 |
| `topology_delta` | 拓扑变更 |
| `reference_landed` | 新参考落地 |
| `topic_ref_count_changed` | 话题参考计数变更（触发 artifact 生产/刷新） |
| `source_intake_fan_in` | 源获取完成，主 Agent fan-in |
| `hitl2_readiness_path` | HITL2/Readiness 路径 |
| `blocker_path` | 决策阻塞 |
| `boundary_hook` | 生命周期边界钩子 |

---

## 非法 Queue 工作（明确禁止）

以下**不是**有效的 Queue 工作单元：

- `report progress`
- `progress recap`
- `summarize and wait`
- `ask user to continue`
- `continue or adjust direction?`
- `await user review`
- `tell user next task`
- generic `continue research`
- generic `advance wave`
- generic `update status`
- `/goal` 或其他斜杠命令作为框架控制工作

**规则：如果下一个任务是已知的，执行它。不要排队一个关于"知道它"的聊天消息。**

---

## 固定执行循环

```
1. reload 五个控制文件 (PROFILE/PLAN/STATUS/QUEUE/TRACE)
2. checkpoint receipt preflight (检查 slot_1_current 的 required_receipts)
3. 执行 slot_1_current 声明的动作
4. 写入声明的文件
5. 同步 STATUS/QUEUE
6. 验证结果 + completion_receipt
7. refill/promote Queue (5槽位滚动)
8. 同步 native projection (如果有)
9. Pre-Response Gate (用户可见输出授权检查)
```

**顺序执行**：只有 `slot_1_current` 执行。`slot_2_next`、`slot_3_pending`、`slot_4_pending`、`slot_5_tail` 和 Refill Pool 候选**都不执行隐藏工作**。

---

## 5 槽位滚动窗口

```
slot_1_current   ← 当前执行
slot_2_next      ← 即将执行
slot_3_pending   ← 等待中
slot_4_pending   ← 等待中
slot_5_tail      ← 队尾
Refill Pool      ← 候选池
```

**正常推进：**
1. slot_2 → slot_1
2. slot_3 → slot_2
3. slot_4 → slot_3
4. slot_5 → slot_4
5. Refill Pool 最高优先级候选 → slot_5

**紧急抢占：** 插入修复任务到最早有效待处理槽位。如果窗口满了，被挤掉的 slot_5_tail 放入 Refill Pool 顶部，`restore_priority=next_tail_opening`。

---

## 6 个 Boundary Hooks

| Hook | 调用点 | 检查的边界收据 |
|------|--------|---------------|
| `hook_setup_to_wave0_start` | setup_ready 后 | 框架快照、控制文件、命令入口、目录绑定、种子摄入状态 |
| `hook_wave0_closeout_to_wave1_start` | Wave 0 闭合后 | 共享参考清单、00-shared-* 溯源、话题起点行、过渡 TRACE (wave0_complete)、Wave 1 延续动作 |
| `hook_wave1_topic_fanin_steering` | 每次话题参考数变更后 | 接受清单、种子回填、artifact 生产/刷新状态、问题列表四段式 |
| `hook_wave1_closeout_to_wave2_start` | Wave 1 闭合后 | 每话题地板或例外、话题目标覆盖、artifact 新鲜度、过渡 TRACE (wave1_complete)、Wave 2 延续 |
| `hook_wave2_closeout_to_hitl2` | Wave 2 闭合后 | 综合 artifact、结论矩阵、冲突处理、过渡 TRACE (wave2_complete)、human-decision-brief |
| `hook_readiness_closeout_to_final_delivery` | Readiness 闭合后 | 资格验证 PASS、检索路线、完成状态、TRACE (readiness_passed)、关闭 Queue |

**每个 Hook 的执行协议：**
1. Reload 五个控制文件
2. 检查 hook 的边界收据
3. 从磁盘验证相关 artifact/参考/STATUS/TRACE/QUEUE 表面
4. 写入或同步声明的文件和字段
5. 写回后验证 completion receipt
6. 只有 receipt 通过后才 promote/refill Queue

---

## Receipt 协议

Receipt 是**持久化本地证据**，证明某个工作单元或阶段边界确实发生了。聊天记忆**不是** receipt。

### Receipt 值格式

```
file:<run-local path>
dir:<run-local path>
status:<field>=<value>
status:<field>>=<integer>
queue:<field>=<value>
trace:<entry label>
index:<path> contains <text>
artifact_steering_current:<topic-id>/<topic-slug>
artifact_refresh_not_due:<topic-id>/<topic-slug>
queued_artifact_repair:<topic-id>/<topic-slug>
direct_reference_exception
active_window_contract_complete
topology_delta_disposed
hitl2_pending_or_recorded_ready
```

### 关键边界收据速查

**setup_ready → Wave 0：**
- 运行本地 `_framework` 存在且版本对齐
- 根控制文件存在
- 种子摄入为 `yes` 或有 `gap_queue_backed` 修复工作存在

**Wave 0 → Wave 1：**
- 共享参考清单已更新
- Wave 0 过渡 TRACE checkpoint 存在 (gate_transition=wave0_complete)
- 非聊天 Wave 1 延续已排队

**Wave 1 topic fan-in：**
- 接受话题参考清单已更新
- 受影响话题种子回填为 current 或有明确队列延期
- artifact 转向通过 `artifact_steering_current` / `artifact_refresh_not_due` / `queued_artifact_repair`
- 问题列表记录四段式探索账本

**Wave 1 → Wave 2：**
- 每话题地板通过或有结构化例外
- Wave 1 过渡 TRACE checkpoint 存在 (gate_transition=wave1_complete)
- Artifact 新鲜度在 Wave 1 gate 审计时是最新的

**Wave 2 → HITL2/Readiness：**
- cross-topic-synthesis.md 存在
- Cross-Topic Conclusion Matrix 已填充
- Wave 2 过渡 TRACE checkpoint 存在 (gate_transition=wave2_complete)
- `hitl2_pending_or_recorded_ready` 分支 receipt 通过

**Readiness → Final Delivery：**
- 运行时资格验证 PASS
- 30 秒本地检索路线已记录
- STATUS.state=completed, current_gate=readiness_passed, next_gate=none
- Queue 关闭 (closure_reason=readiness_passed)
