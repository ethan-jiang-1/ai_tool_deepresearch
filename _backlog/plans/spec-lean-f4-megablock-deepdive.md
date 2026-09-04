# F4 深挖：剩余巨无霸 requirement 逐块处置设计

> 日期: 2026-09-01 | 性质: 参照资料（非 plan，供 `spec-lean-pointerization-and-registry-hygiene` 的 R2 批次复核与执行引用）
> 方法: 与 C3a–C3e 同款单元解析（顶层块 + 松散列表/引用块并入前属；`#### Scenario:` 独立计数），对全库 ≥190 行 requirement 块逐块勘察。行号为勘察时点值，执行时以装配脚本实时重核为准。
> 同步: 2026-09-03 复核——§1 十块全部原样（行号 ±1），处置设计仍可用；但全库 ≥190 行块实测为 **11 块**：初版扫描还漏计一块（同此前 hitl-ux / artifact-persistence 两处漏计同类），补记见 §11。
> 处置图例: **分割**=按散文缝拆为多个 requirement（文本逐字节守恒）；**清理**=删除重复/漂移文本（语义不变）；**保留**=≤160 行或拆分收益不足。

---

## 总览：≥190 行块 11 块（初版勘察 10 块 + 2026-09-03 补记 1 块）

| # | spec | 位置 | 规模 | 构成 | 处置 |
|---|---|---|---|---|---|
| 1 | research/post-final-recovery | L11-368 | 358 | 14 散文段 + 27 场景 | **分割 ×4** |
| 2 | research/content-delivery-phase-content | L11-268 | 258 | 13 散文段 + 18 场景 | **分割 ×3** |
| 3 | engine/cli-phase-transition | L100-340 | 241 | 15 散文段 + 17 场景 | **分割 ×3** |
| 4 | research/research-wave-phase-content | L83-317 | 235 | 7 散文段 + 18 场景 | **分割 ×3** |
| 5 | workflow/workflow-directory-contract | L128-324 | 197 | 10 散文段 + 12 场景 | **分割 ×2** |
| 6 | research/seed-topic-materialization | L15-210 | 196 | 6 散文段 + 18 场景 | **分割 ×2** |
| 7 | agent/hitl-ux | L262-456 | 195 | 11 散文段 + 19 场景 | **分割 ×2 + 清理候选 1** |
| 8 | engine/runtime-reentry-debuggability | L363-555 | 193 | 7 散文段 + 20 场景 | **分割 ×2** |
| 9 | governance/semantic-fact-closure | L98-290 | 193 | 11 散文段 + 12 场景 | **分割 ×3** |
| 10 | bundle/artifact-persistence-recovery | L122-311 | 190 | 11 散文段 + 15 场景 | **分割 ×2** |
| 11 | workflow/rerun-incremental-node | L39-229 | 191 | 8 散文段 + 19 场景 | **分割 ×2**（2026-09-03 补记，见 §11） |

拆分后预期：15+3+2+2+2+3+2+2+2+2 = 新增子块全部 ≤ ~170 行；无一需要"删除语义"式清理——但有两处**清理候选**（见 §标记）。

---

## 逐块处置设计

### 1. post-final-recovery L11-368（358 行，14 散文段，27 场景）— 分割 ×4

散文段主题分界（行号为勘察值）：P1@13 CLI 与闭集动作词汇、P2@23 inspect 无副作用推导、P3@34 apply 校验、P4@40 `rerun_count_limit` 规则、P5@49 workspace 阻断、P6@57 ReopenResearchPass 外部权威、P7@64 三职责分立、P8@70 evaluator 解析 owner、P9@78 lineage 可识别、P10@93 rerun-ready 后复用、P11@115 Final inventory witness、P12@173 apply 请求契约、P13@182 闭集 verdict、P14@188 schema 版本兼容。

| 新 requirement | 承载散文 | 主题 |
|---|---|---|
| J1 "Post-final recovery CLI SHALL expose one direct eligibility inspection" | P1-P2 | CLI 面与 inspect 无副作用 |
| J2 "Post-final apply SHALL validate the closed action and rerun budget" | P3-P4 | 校验与 rerun 预算 |
| J3 "ReopenResearchPass SHALL own lineage authority across post-final boundaries" | P5-P11 | workspace/权威/lineage/witness |
| J4 "Post-final apply SHALL retain strict request and verdict contracts" | P12-P14 | 请求与结果契约 |

场景（27 个）按其所在行位落入相邻散文主题组；组内保持原相对顺序。**清理候选**：P2 与 P12-P14 对 `operate-post-final-recovery` 用法的复述与 `command_playbook/post-final-recovery.md` 有重叠——执行时按 §2.1 判定规则评估指针化（owner 存在 ✓）。

### 2. content-delivery-phase-content L11-268（258 行）— 分割 ×3

| 新 requirement | 散文 | 主题 |
|---|---|---|
| F1 | P1-P3 | HITL2 9-section body、decision brief、rerun 前置读取 |
| F2 | P4-P10 | 决策枚举、rerun focus、trace 事件、user_decision、human-directed |
| F3 | P11-P13 | delivery 推荐、ambiguity frontier、correction 语义 |

### 3. cli-phase-transition L100-340（241 行）— 分割 ×3

| 新 requirement | 散文 | 主题 |
|---|---|---|
| C1 | P1-P5 | route-bound witness、Final inventory admission |
| C2 | P6-P7 | `--help`、handoff 词汇闭集 |
| C3 | P8-P15 | stdout 形态、continuation 块（feedback projection 边界）、post-final handoff、action-core preflight |

### 4. research-wave-phase-content L83-317（235 行）— 分割 ×3

| 新 requirement | 散文 | 主题 |
|---|---|---|
| I1 | P1-P4 | Wave1 controller、closeout 物化、index-sync 窄修复、depth-review |
| I2 | P5-P6 | dry-submit 先行、共享模板加载、失败引导 |
| I3 | P7-P8 | focus context → 补充工作、用户措辞解释边界 |

### 5. workflow-directory-contract L128-324（197 行）— 分割 ×2

| 新 requirement | 散文 | 主题 |
|---|---|---|
| G1 | P1-P5 | 三坐标词汇、control files、CLI 路径语义 |
| G2 | P6-P12 | harness 根规则、runtime surfaces、`_scripts`、ENTRY+MAP 规范 |

### 6. seed-topic-materialization L15-210（196 行）— 分割 ×2

| 新 requirement | 散文 | 主题 |
|---|---|---|
| H1 | P1-P4 | 9-section body、模板加载、双卡渲染契约 |
| H2 | P5-P6 | wave0 卡 ordinal 细节、`rb_plan` registry 权威 |

### 7. hitl-ux L262-456（195 行）— 分割 ×2 + 清理候选

| 新 requirement | 散文 | 主题 |
|---|---|---|
| H1 | P1-P3 | research review 撰写、推荐语义、rerun 前置读取 |
| H2 | P4-P11 | 五快捷选项、确认语义、候选形成、delivery/custom |

**清理候选 HITL2-CONFIRM**：P5（"用户的清楚决定本身 SHALL 视为确认"）与 P9（"Clear acceptance, correction, or delegation SHALL itself confirm…"）疑似同一确认语义的两处陈述。执行时逐字比对：若同义则合并为一处（另一处改指针）；若语义不同（一个针对五选项、一个针对 candidate 流）则保留并加交叉引用。**不做无证据的删除。**

### 8. runtime-reentry-debuggability L363-555（193 行）— 分割 ×2

| 新 requirement | 散文 | 主题 |
|---|---|---|
| D1 | P1-P3 | check-reentry 组成、schema action 要求、阻断 finding |
| D2 | P4-P7 | Final 边界所有权、post-final 投影、refinement、pass lineage |

### 9. semantic-fact-closure L98-290（193 行）— 分割 ×3

| 新 requirement | 散文 | 主题 |
|---|---|---|
| E1 | P1-P4 | 变更声明义务、proposal 指引、记录坐标、affected 字段 |
| E2 | P5, P6, P9 | roles 分类、catalog addition 审批、overlap 非空 |
| E3 | P7, P8, P10, P11 | checker 只验结构、声明非裁决、两分支闭合 |

### 10. artifact-persistence-recovery L122-311（190 行）— 分割 ×2

| 新 requirement | 散文 | 主题 |
|---|---|---|
| A1 | P1-P4, P6-P8 | persist/publish 命令参数、canonical inventory、分配与序列化 |
| A2 | P5, P9-P11 | 严格结果、`final/final*.md` 保留命名空间、路径分类前置 |

### 11. rerun-incremental-node L39-229（191 行，8 散文段，19 场景）— 分割 ×2（2026-09-03 补记）

`### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan`（workflow/rerun-incremental-node）。该文件自 2026-08-29（terminology purge）后未再改动——属初版全库扫描漏计，非新增吸积。散段分界（勘察值）：P1@41 语义调整计划的输入与构成、P2@49 labelled focus 只作用于受影响 Topic、P3@58 恰一个 topic-state apply form、P4@67 UID-bound `## 本轮重跑方向` 段内容、P5@75 apply 先行 / blocker 修复 / rerun_count / style owner / rerun-ready gate、P6@86 机械 blocker 不上抛、P7@92 布局只用 canonical apply + 历史路径不动 + remove 需 Engine 证明、P8@100 route-bound witness 授权（normal HITL2 / post-final reentry）。

| 新 requirement | 承载散文 | 场景 | 主题 |
|---|---|---|---|
| K1 | P1-P4, P7 | S1@113、S7@148、S8@152、S9@156、S10@163、S11@171、S17@210、S18@216、S19@225（9 个） | 调整计划与 apply 形态：focus 作用域、add/refine/direction/layout 形式、seed 方向段、历史保全、Engine 证明的 remove |
| K2 | P5, P6, P8 | S2@121、S3@126、S4@130、S5@135、S6@143、S12@177、S13@182、S14@188、S15@194、S16@202（10 个） | 授权与执行：route-bound witness、状态窗与 rerun-ready gate、rerun_count 循环保护、style projection、机械 blocker |

**初稿性质**：K1/K2 主题分界与场景归组为 2026-09-03 人工勘察初稿，执行时按执行注记 1 的同款单元解析重核（declared==actual 断言）；两子块预期均 ≤160 行（勘察初估 ~130）。注意 CTS 的 mutate_layout 授权（BUG-248，commit bb145ccab）与本块 P3/S9 语义联动——若届时 canonical-topic-state 再动 layout 契约，先对齐再拆。

---

## 执行注记（对 R2 批次的约束）

1. 场景主题归组以"场景块物理位置落入哪两个散文分界之间"为主判据（CTS/RWG 先例），逐块 declared==actual 断言强制。
2. 每块拆分前后跑内容多重集合守恒（脚本内置）；新增标题行是唯一允许的净增。
3. 既有 doc-lock：`content-delivery-phase-content` 的 CDP pair 在 `residual-spec-drift-text-locks` 中——若本批触及 CDP-locked 块须同 change 更新（C3e 的 DEW pair 退休先例）。
4. 清理候选 HITL2-CONFIRM 必须先逐字比对再动；不同义不合并。
5. 指针化候选（post-final-recovery 的 CLI 复述段）按主 plan §2.1 判定规则执行，owner = `command_playbook/post-final-recovery.md`。
