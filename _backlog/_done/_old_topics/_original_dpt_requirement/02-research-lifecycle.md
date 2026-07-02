# 02 — 研究生命周期：三波 + 两个人工确认点

## 三种研究模式（互斥，HITL1 时选择）

| 模式 | 中文名 | 意图 | Wave 1 闭合姿态 | Wave 2 综合姿态 |
|------|--------|------|----------------|----------------|
| `quick_factual` | 快速事实答案 | 低风险、窄范围事实回答 | 每个确认的 wave1_topic 目标被回答/降级/排队 | 简洁结论+置信度+限制 |
| `exploratory_map` | 探索地图 | 覆盖图：结构、未知区、优先级 | 话题级条目分类为已知/未知/空白/失败路径 | 覆盖图+未知区域+张力+优先级 |
| `claim_verification` | 说法验证 | 验证声明真假、支持度、边界 | 每个声明映射证据方向、支持度、反例、限制 | 声明判断账本 |

### 默认证据参数

| 参数 | quick_factual | exploratory_map | claim_verification |
|------|-------------|-----------------|-------------------|
| wave0_shared_doc_floor | max(5, min(12, 4+complexity/2+dependency/2)) | max(8, min(18, 6+complexity+dependency)) | max(10, min(24, 8+complexity+dependency)) |
| wave1_doc_floor_per_topic | 5 | 8 | 10 |
| primary_source_floor | 2 | 3 | 4 |
| secondary_source_floor | 1 | 2 | 2 |
| recent_source_floor | 1 | 1 | 1 |
| limitation_source_floor | 1 | 2 | 2 |

`quick_factual` 是快**相对于**更重的模式，但它仍然是反浅搜的。两话题跑最低也要 6 篇共享 + 5 篇/话题。

---

## 三波研究

### Wave 0 — 共享基础

**目的：** 建立共享基础事实、通用术语、可靠搜索起点。

**工作内容：**
- 先获取高信任共享参考（official/academic 来源）
- 定义术语、风险、来源桶、话题起点
- 不在此阶段深度解决每个话题

**Gate: Wave 0 Foundation Gate Audit**
- 接受的共享参考数 ≥ `wave0_shared_doc_floor`
- 高信任共享参考 > 50%
- 限制/风险参考 ≥ 1
- 比较/实践/失败分析 ≥ 1（或有记录的不可得例外）
- 每个话题有 Wave 1 起点、来源入口、核心术语
- 30 秒本地证据检索可用
- 网页诊断字段完整
- 排除的共享来源清单

### Wave 1 — 逐题深挖

**目的：** 为每个话题获取足够的独立证据以支撑后续综合。

**工作内容：**
- 每个话题收集 topic-unique 证据（至少一半来自独立来源）
- 证据回填到话题种子文件
- 触发 artifact 生产（达到首个 topic-unique ref 时）
- 探索/利用决策
- 问题对账 + 问题涌现

**Gate: Wave 1 Source Floor Audit**
- 每个话题的接受参考数 ≥ `wave1_doc_floor_per_topic`
- 一级来源地板 ≥ primary_source_floor
- 二级来源地板 ≥ secondary_source_floor
- 近期来源地板 ≥ recent_source_floor
- 限制/争议/失败模式地板 ≥ limitation_source_floor
- 话题调查目标覆盖
- 种子回填状态
- Artifact 完成且新鲜
- 网页诊断 + 来源族重复检查

### Wave 2 — 跨题综合

**目的：** 将话题证据综合为可辩护的判断。

**工作内容：**
- 产出跨话题综合 artifact
- 标记高杠杆判断（claim_type, confidence, backing_refs）
- 冲突/张力调解
- 区分硬事实 / 分析判断 / 趋势推测
- 准备 human-decision-brief

**Gate: Wave 2 Synthesis Gate Audit**
- cross-topic-synthesis.md 存在且有实质内容
- 综合阶段 must-answer 条目被覆盖
- Cross-Topic Conclusion Matrix 已填充
- 每个标记判断有本地 backing refs
- P0/P1 判断有独立支撑或稀缺例外
- 冲突处理已记录

### Readiness Check — 最终交付就绪

**目的：** 确认可交付性。

**通过条件：**
- 30 秒证据检索可行
- HITL2 人工决策已记录
- 运行时资格验证返回 PASS
- topology 稳定
- 无隐藏的 post-readiness 阶段
- Queue 关闭 (`closure_reason=readiness_passed`)
- STATUS.state=completed, current_gate=readiness_passed, next_gate=none

---

## 两个 HITL 检查点

### HITL1 — 执行前（profile + root must-answer）

**时机：** 实例化期间，执行开始前

**决策内容：**
1. 选择研究模式（A/B/C）
2. 写出"最终报告必须回答什么问题"
3. 可选：搜索偏好

**用户界面（中文优先）：**
```
开始前我需要确认这轮研究的目标。你更想要哪种结果？
A. 快速事实答案 — 适合低风险、范围很窄的问题
B. 探索地图 — 适合先摸清领域结构、空白和下一步重点
C. 说法验证 — 适合判断一个说法是否被证据支持

另外，请用一句话写下：最终报告必须回答什么问题？
```

**不确定处理：** 记录 `gap_queue_backed` 澄清任务，不暗中假设

### HITL2 — 综合后（answerability + final view）

**时机：** Wave 2 综合评估后，Readiness 闭合前

**Source of Record：** `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision`

**执行顺序：**
1. 内部分类可回答性：`ready_substantive` / `ready_insufficient_judgment` / `blocked_repair_required`
2. 写出 `human-decision-brief.md`
3. 同步 PROFILE/STATUS/QUEUE 到 HITL2 `pending_user` 状态
4. **只有这个状态写完后**才能停下问用户
5. 用户选择后记录决策

**用户界面（中文优先）：**
```
我已经完成综合。现在需要你确认下一步：

目前证据足够回答的是：{概括}
仍然不足或需要谨慎的地方是：{缺口}
如果继续补证据/重跑，我会优先补：{具体项}

请选择下一步：
A. 继续生成最终报告 — 用当前证据生成
B. 换一种报告视角 — 例如证据地图、结论简报、说法判断或技术深挖
C. 继续补证据/重跑 — 先补缺口再重新综合
D. 停止并保留阻塞原因 — 不生成最终报告
```

### HITL 不是什么

- **不是** Wave 0/1/2 完成后的进度汇报
- **不是** "继续？调整方向？"的中间询问
- **不是** 源获取批次完成后的检查点
- **不是** artifact 刷新后的停止点

---

## must_answer 的两阶段模型

每个 must_answer 条目有 `answer_phase`：

| phase | 含义 | 在哪里回答 |
|-------|------|-----------|
| `wave1_topic` | 单个话题证据包能回答 | Wave 1 内 |
| `wave2_synthesis` | 需要跨话题综合后才能回答 | Wave 2 |

Wave 1 不需要回答 `wave2_synthesis` 条目，但必须在 Topic Investigation Targets 中保留为 `synthesis_pending`，并提供具体的 Wave 2 合成路线。
