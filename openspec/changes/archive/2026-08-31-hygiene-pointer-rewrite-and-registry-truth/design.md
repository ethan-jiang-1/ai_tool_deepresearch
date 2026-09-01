# Design: hygiene-pointer-rewrite-and-registry-truth

## Context

见 proposal.md。C1/C2 已完成漂移重同步与词汇锁；本 change 处理计划中的跨 spec 复述（D 类）与 registry 账本（C2 项）。指针化方向统一：**行为所有权让渡给 owner，指针对象保留教学义务**（保留 "phase 文档 SHALL 教学" 的义务句），与仓库 Source-of-Record 纪律一致。

## Goals / Non-Goals

- Goals：D4/D6/D9/D1 三处复述消除（RWP ×3、GSK-009）；RRM-008/CTS-012 注册；RWP-005/008 处置；D2 registry 口径对齐。
- Non-Goals：场景墙表格化（缓期，见下）；H5 IOC 收敛（复核后维持现状）；不改任何行为语义；不动 RRM-007/CTS-011 等既有 registry 条目正文。

## Decisions

| # | 决策 | 理由 |
|---|---|---|
| D1 | 指针化措辞模式："Wave phase docs SHALL teach … as a pointer to its single Source of Record: <owner requirement> (<ID>, <capability>) … SHALL NOT restate the field contract" | 保留教学义务（phase 文档的存在意义）同时把行为真相唯一化；与 :336/RUN.md:78 的 house 指针模式同构 |
| D2 | GSK-009 删除士气规则段 + 同名 scenario 正文改为 convention 归属（标题按 retention 模式保留）；gate 专属 0/1/2 映射与 handoff/advice 义务保留 | CLE-002 是 owner（`cli-exit-code-conventions`）；gate 侧保留的是"对齐声明+专属映射"，不是第二份禁令。备选：反向让 CLE 指向 GSK——CLE 是全仓约定，方向不能反 |
| D3 | RWP-005/008 处置 = `[DEPRECATED]` + 移出 header | 考古（2026-08-31）：`future expansion`/`gap-fill` 在 RWP/RWG/phase-wave1/phase-wave2 全部零命中——registry 两条目描述的内容已不存在于任何 accepted surface；check-spec-req-ids 规定 deprecated ID 不得留在 header。备选：恢复锚点=虚构从未落地的内容，违反 evidence honesty |
| D4 | RRM-008/CTS-012 注册而非 re-home：两条 heading 是真实存在的活跃 requirement，注册是纯增补；re-home 需要搬移 requirement 文本（更大的 delta + ID 迁移） | 最小 diff；registry 只增纪律不受影响 |
| D5 | AGO-006 registry 松散标题 "MUST be populated by Engine … not Agent claims" → 对齐 AGO 正文口径 | D2 已实际漂移：registry 行与 AGO 正文 "SHALL verify during operate-work-unit submit" 不一致；松散标题是注解不是 ID 身份，对齐是去漂移而非重写 |
| D6 | 场景墙表格化缓期（proposal What Changes 已述）；H5 维持现状 | 无 scenario 表格化 house 先例，逐例语义合并的自主执行风险高；H5 三处已是自带指针的特化表述，非逐字复述——计划里的 H5 定级基于抽查，执行期全文复核后推翻 |

## Open Questions

无——OQ3/OQ4（plan §7.3/7.4）在本 design D3/D4 裁定完毕；OQ1/OQ2 已在 C1/C2 落地。

## Risks / Trade-offs

- 指针化后 RWP 三个 requirement 的"教学义务"断言由文本锁测试锚定，防止未来又长回复述。
- registry 弃用是只增纪律的首次 ID 级弃用（此前 57 个 retired 均为能力级）——`check-project-reqs --mode archive` 与 `check-spec-req-ids` 的行为以实际运行为准，若 header 移除触发 orphan 判定需按 checker 输出修正（预期不会：deprecated ID 仍注册，只是不在 header）。
- RRM-008/CTS-012 新 ID 进入 header 后 `check-project-reqs` 的 unregistered 计数应在 registry 同步后清零（apply 期顺序：先 registry 后 header？反了——先改 spec header 会瞬时 unregistered；故 apply 顺序 = 同一提交内先 registry 后 header，检查在提交前跑）。
