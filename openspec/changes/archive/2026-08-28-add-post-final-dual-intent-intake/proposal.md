# add-post-final-dual-intent-intake

## Why

一个已完成 Final 交付的 run bundle 上的两类迭代诉求——「再挖一轮」（evidence-expanding rerun）与「整理/重写 final」（presentation refinement）——机械路径都完整存在（`command_playbook/post-final-recovery.md` 的 copyable 链；`workflows/nodes/phases/phase-final.md` 的 Deliver-And-Refine-In-Place）。缺的是**从用户措辞到正确路由的可发现性**：`COMMANDS.md` 只有工具名指针行，分类语义埋在 ACS-001 要求的超长受众声明段落里；`rb_templates/BUNDLE_ENTRY.md.tmpl` 的 Final 段对两类意图均零提示。真实成本见来源 plan 的 canonical 样本（`dpt_rb_chinese-ai-inference-chips-vs-nvidia`，3 天内 4 轮 rerun + 2 次整理 + 1 次落地反馈深挖）：用户必须记住并贴出 `_diagnostics/next-dig-list-*.md` 路径，Agent 每轮花整段上下文重建理解与路径。

同时该 bundle 已形成事实上的 dig-list 接力实践（`next-dig-list-v4-landing-feedback.md` → rerun#4 的 rationale 逐条引用其 A/B/C 条目 id → 产出 `next-dig-list-v5-final.md`），但 playbook 没有 intake 指引：每轮 scope 从 100+ 行清单到一行 `requested_scope` 的压缩全靠即兴，跨轮「已宣布证据不存在」的死坑知识无固定继承位置。

来源：`_backlog/plans/post-final-rerun-dig-list-intake.md` C1 工作项（2026-08-28 scope 扩大版，含完整迭代史解剖）；用户原话「先把 C1 提成 OpenSpec change……这样今后的挖掘和整理之类的都变得简单」。

## What Changes

- `DEEP_RESEARCH_HARNESS/COMMANDS.md`：在 Post-Final 相关索引区增加一个**意图→路由映射**：evidence-expanding 措辞族（「继续挖/再挖一轮/rerun」）→ `command_playbook/post-final-recovery.md`；presentation 措辞族（「整理/重写/自包含版/换个读者版本」）→ `phases/phase-final.md` 就地 refinement + `persist-artifact`；混合/含混请求先按既有语义边界分类（POF-001 已有的 Agent-owned 分类，不新设分类器）。纯导航文本，不改变 ACS-001 的受众声明与责任边界。
- `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`：新增 "Intake from a dig list" 指引小节：bundle 的 `_diagnostics/` 存在 next-dig-list 时，Agent 先读最新一份，按其自身优先级层提出 bounded scope 建议，用户修正后，把选中条目 id（如 `A1–A3 + AMD§1–2`）写进**现有** `requested_scope`/`reason` 字符串；死坑条目（已宣布证据不存在）不进入 scope。无清单时保持既有普通请求契约。
- 明确不产出：不加 request schema 字段、不加 label parser、不动 Engine/CLI/gate/模板（plan C2 的 BUNDLE_ENTRY/BUNDLE_MAP 指针、C3 的 dig-list 命名成文、C5 的 README 同步义务均不在本 change；其中 README 同步义务已由 CDP「Final guidance SHALL … maintain the series index」拥有，属执行缺口非 spec 缺口）。

## Capabilities

### New Capabilities

（无——两个目标行为都落在既有 capability 的 Agent-facing 操作面上。）

### Modified Capabilities

- `agent/agent-command-surface`：ADDED `ACS-006` —— 命令索引 SHALL 为 post-final 两族迭代意图提供可发现路由映射（指向既有路由，不创设第二条路由或新分类权威）。
- `research/post-final-recovery`：ADDED `POF-005` —— post-final-recovery playbook SHALL 提供 diagnostics dig-list 的 intake 指引（non-authority 输入 → 结构化 scope 提议 → 用户修正 → 条目 id 引用进现有字段）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/agent-command-surface` | main spec 全文（ACS-001..005） | Modify | COMMANDS.md 索引内容是 ACS-001 受众声明与 ACS-003 静态校验的对象；「意图→路由映射」是新的文档级可观察行为，无既有 requirement 拥有它，需要 ADDED ACS-006 |
| `research/post-final-recovery` | main spec 全文 L1-620（registry 仅 POF-001..004；正文另有 2 个 requirement 未入 registry） | Modify | playbook 是该 capability 的 Agent-facing 操作面；dig-list intake 指引是新行为，需要 ADDED POF-005 |
| `research/content-delivery-phase-content` | main spec 全文 L1-826（CDP-001..008） | Verify-only | presentation-refinement 路由（Post-final feedback routing 场景）、Deliver-First-Then-Refine、`final/README.md` 维护义务均已被 CDP 拥有；本 change 的映射仅指向它，不改其 requirement |
| `bundle/bundle-map` | 未读（plan C2 边界外） | Excluded | BUNDLE_ENTRY/BUNDLE_MAP 模板指针属 plan C2 的独立后续 change |
| `workflow/rerun-incremental-node` | 未读（边界外） | Excluded | intake 发生在 phase-rerun 进入之前；rerun phase 体内容不变 |
| `workflow/rerun-topic-integration` | 未读（边界外） | Excluded | 同上：topic 集成管线属 rerun 进入后的既有 owner，本 change 不触碰 |

## Impact

- 目标文件（apply 阶段才可改）：`DEEP_RESEARCH_HARNESS/COMMANDS.md`、`DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`。
- 无代码/CLI/测试行为变化；但两文件都在 ACS-003 静态校验扫描面内（`command_playbook/*.md`、`COMMANDS.md`），新增文本必须维持既有 drift-phrase 禁令与可复制命令全前缀契约。
- Source of Record 不变：两类路由的 authority 仍是既有 accepted spec（POF/CDP）与 CLI；映射与 intake 指引是导航/操作指引，不创设 permission、checkpoint、路由或事实。net simplification：零新增状态/检查器/恢复路径，删除的是每个 session 的路径翻找与 scope 即兴压缩成本；最短合法闭环 = 用户一次 scope 修正 → 既有 retained request → apply。
- 责任边界：用户拥有 scope/risk 决定（修正 Agent 提议）；Agent 拥有读清单、提 scope、全部机械步；Engine 不新增任何裁决（继续只验证既有 request 形状/lineage）。
- Semantic-precision reflection（新增具名概念「post-final 意图族路由映射」「dig-list intake」）：读者 = 在 Final 收到用户迭代请求的 Agent；有界问题 = 「这族措辞走哪条既有合法路由；有 dig-list 时 scope 怎么结构化成形」；必须保留的区别 = dig-list 是 non-authority 选题输入而非 scope/coverage authority，分类仍是 Agent 语义判断；正常推理停止点 = 路由选定且 scope 经用户修正后，既有 POF/CDP 契约接管，指引不再延伸。
- 附带发现（不在本 change 修复）：`research/post-final-recovery` main spec 正文有 2 个 requirement 未入 `openspec/governance/req-registry.yaml`（registry 仅 POF-001..004）；本 change 的 ACS-006/POF-005 按 SUD-008 先例在 apply 阶段走 registry 直注册，不使用 reservation 文件。
