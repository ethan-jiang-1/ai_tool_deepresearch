# 05 — Gate 系统与状态机

## Gate 列表

| Gate | 类型 | CLI Gate 名 | 说明 |
|------|------|------------|------|
| `instantiation_complete` | 结构 | check-gate-instantiation-complete | 实例化结构完成 |
| `setup_ready` | 过渡 | check-gate-setup-ready | 执行工作空间就绪 |
| `wave0_complete` | 研究 | check-gate-wave0-complete | 共享基础完成 |
| `wave1_complete` | 研究 | check-gate-wave1-complete | 逐题证据完成 |
| `wave2_complete` | 研究 | check-gate-wave2-complete | 跨题综合完成 |
| `readiness_passed` | 最终 | check-gate-readiness-passed | 可交付 |

## 额外：Start Boundary Gates

这些不是 `current_gate` 枚举值，而是 hook 强制执行的门：

| 边界 | 执行 Hook | 依赖的先前 Gate |
|------|----------|----------------|
| `wave0_start` | hook_setup_to_wave0_start | setup_ready |
| `wave1_start` | hook_wave0_closeout_to_wave1_start | wave0_complete |
| `wave2_start` | hook_wave1_closeout_to_wave2_start | wave1_complete |

---

## 状态转换图

```
instantiation_complete ──→ setup_ready ──→ wave0_start (boundary)
                                                   │
                                                   ▼
                                            Wave 0 执行
                                                   │
                                                   ▼
                                            wave0_complete
                                                   │
                                      hook_wave0_closeout
                                                   │
                                                   ▼
                                            wave1_start (boundary)
                                                   │
                                                   ▼
                                            Wave 1 执行
                                                   │
                                          (每个 topic 循环)
                                                   │
                                                   ▼
                                            wave1_complete
                                                   │
                                      hook_wave1_closeout
                                                   │
                                                   ▼
                                            wave2_start (boundary)
                                                   │
                                                   ▼
                                            Wave 2 执行
                                                   │
                                                   ▼
                                            wave2_complete
                                                   │
                                      hook_wave2_closeout
                                                   │
                                                   ▼
                                            HITL2 (pending_user)
                                                   │
                                          (用户决策)
                                                   │
                                                   ▼
                                            readiness_passed
                                                   │
                                      hook_readiness_closeout
                                                   │
                                                   ▼
                                            final_delivery
```

---

## Gate 原则

1. **Gate 只能通过 STATUS 中的显式审计表面 + 本地证据文件**
   - 不能靠散文信心、松散摘要、artifact 计数、聊天记忆
2. **后一波不能在前一波 audit 有 `overall_result=pass` 前开始**
3. **Start boundary gates 由 hook 和 Queue receipts 强制执行**
4. **每个 gate 过渡必须写 TRACE checkpoint**
   - `wave0_complete`, `wave1_complete`, `wave2_complete`, `readiness_passed`
   - 必须是独立的、非纠正条目
   - `STATUS.Trace Pointer.last_trace_entry` 必须指向最新条目
5. **Gate 通过不是用户可见停止点**
   - 必须继续执行下一个非聊天延续动作
6. **研究模式可以设配置地板值，但不创建单独的 gate 逻辑**
   - Gate 审计总是比较 PROFILE 中记录的配置值
7. **`setup_ready` 不是研究波，不能满足任何证据地板**

---

## Gate Reopen（Gate 重开）

如果后续证据使已通过的 gate 失效：

1. 恢复 `current_gate` 到最后仍然有效的前一个 gate
2. 设置 `current_wave` 到必须重做的工作
3. 记录 `reopened_from_gate / reopen_reason / invalidated_claims`
4. 重填同波队列工作

触发场景：
- 运行时拓扑 formalization 添加/重定向了影响已通过 gate 的话题
- 新证据暴露之前 gate 审计的缺陷
- 实质性拓扑变更在 readiness_passed 后（重新打开相关更早的 wave）

---

## 每个 Gate 的关键审计项

### instantiation_complete
- 所有 `<...>` 实例化占位符已替换
- 五个根控制文件存在
- `research_profile` 是有效值
- `topic_root = seed_topics`
- `derived_topic_count = count(registry entries)`
- 无执行进度

### setup_ready
- 运行本地 `_framework` 存在且版本对齐
- Runtime Command Entrypoint 指向本地 `_framework`
- `TOPIC_ROOT`, `REFERENCE_DIR`, `ARTIFACT_DIR` 对齐
- 种子摄入为 `yes` 或有具体 `gap_queue_backed` 修复工作存在
- 零话题或摄入 gap 运行保持在分解/摄入修复，不做证据检索

### wave0_complete
- 接受的共享参考数 ≥ `wave0_shared_doc_floor`
- 高信任共享参考 > 50%
- 限制/风险参考 ≥ 1
- 比较/实践/失败分析 ≥ 1（或有记录的不可得例外）
- 每个话题有 Wave 1 起点
- 网页诊断字段完整

### wave1_complete
- 每个话题的接受参考 ≥ `wave1_doc_floor_per_topic`
- 一级来源 ≥ `primary_source_floor`
- 二级来源 ≥ `secondary_source_floor`
- 近期来源 ≥ `recent_source_floor`
- 限制来源 ≥ `limitation_source_floor`
- 话题调查目标覆盖
- 种子回填完成或延期
- Artifact 新鲜度在审计时同步
- 话题唯一性 ≥ 50%（或有稀缺例外）

### wave2_complete
- cross-topic-synthesis.md 存在且有实质内容
- 综合阶段 must-answer 条目被覆盖
- Cross-Topic Conclusion Matrix 已填充
- 每个判断有本地 backing refs（不能用短 ID 如 ref-060）
- P0/P1 判断有独立支撑或稀缺例外+置信度降级
- 冲突/张力已处理
- 单话题运行用 `not_applicable_single_topic` 仍需至少一个本地支撑的综合行

### readiness_passed
- 30 秒本地证据检索可行
- HITL2 决策已记录（`hitl2_checkpoint_status=recorded`）
- 运行时资格验证返回 PASS
- 反停滞预算在预算内
- topology 稳定
- STATUS.state=completed, next_gate=none
- Queue 关闭 (`queue_health=closed, closure_reason=readiness_passed`)

---

## Gate Rationale Note（Gate 理由注释）

每个 gate 审计附带一个简短的**叙事伴注释**，解释：
- 什么改变了 gate 状态
- 什么仍未解决
- 为什么未解决项不阻塞 gate
- 什么会重新打开 gate

注释**不是 gate 权威**——审计行和清单行才是。

---

## Post-Gate Continuation（Gate 后延续）

Gate 闭合必须在同一个 closeout 中**立即继续**：

| Gate 闭合后 | 必须开始 |
|------------|---------|
| wave0_complete | Wave 1 延续工作（话题证据摄入、artifact 生产或 Wave 1 审计准备） |
| wave1_complete | Wave 2 合成/动作 |
| wave2_complete | HITL2 简要准备 → pending_user 状态 → 用户停止或 recorded/resume 路径 |

如果无法继续，记录一个**真正的 decision_blocker**。不要问用户"继续？调整方向？"
