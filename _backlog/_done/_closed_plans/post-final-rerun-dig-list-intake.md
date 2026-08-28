# Post-Final 迭代场景舒适化：rerun 挖掘接力 + final 内容整理

> 2026-08-28 · 触发：`dpt_rb_chinese-ai-inference-chips-vs-nvidia` 的高强度迭代使用——3 天（08-25 HITL1 → 08-28）内 4 轮 evidence rerun、2 次 presentation 整理、1 次落地反馈深挖，交付 6 个主版本 + 1 个自包含整理版。
> 2026-08-28 scope 扩大：用户确认「对 final 内容的整理」与 rerun 是同一族诉求（都是 COMMANDS.md 该帮上忙的事），并入本 plan。
> 性质：plan（`_backlog/plans/`，非 authority）。任何框架改动须经 OpenSpec change lifecycle；本 plan 只立项，不改 `DEEP_RESEARCH_HARNESS/`。

## 1. 使用场景解剖：一个 bundle 的三天迭代史（canonical 样本）

| 步 | 用户诉求（原话要点） | 走的路径 | 交付 | 选题输入 |
|---|---|---|---|---|
| rerun#1 | "920 官方规格待核验、统一基准缺失……深挖" | HITL2 rerun | 并入 base 交付（README V0 行"华为昇腾重点新增"；映射以 trace 为准） | 报告 limitations |
| base | — | waves → HITL2 交付 | `final.md` + `final_v0/`（9 篇） | — |
| rerun#2 | "落地证据、吞吐、成本、技术支持投入" | HITL2 rerun | `final_v1.md` + `final_v1/`（12 篇） | 用户原话 |
| rerun#3 | "加一个 chipmaker AMD" | HITL2 rerun + add_topic | `final_v2.md` + `final_v2/`（13 篇） | 用户原话 |
| 整理#1 | V2 叙述化重写 | presentation refinement（phase-final 就地） | `final_v3.md` + `final_v3/`（13 篇） | 用户原话 |
| 落地反馈深挖 | "所有芯片落地实际情况信息是否足够" | 反馈评估深挖交付（无 rerun intent revision；引擎 feature 名） | `final_V4_landing_deep_dive_h200_anchor.md` + `final_landing_deep_dive_h200_anchor_v4/`（14 篇） | V4 交付反馈评估 |
| rerun#4 | "按 next-dig-list-v4 的要求挖" | HITL2 rerun（全 10 topic digest） | `final_v5.md` + `final_v5/`（14 篇） | **next-dig-list-v4-landing-feedback.md** |
| 整理#2 | V5 自包含专业重整理 | presentation refinement（non-primary） | `final_v5_self_contained.md` | 用户原话 |
| rerun#5（待启） | "再挖一轮" | post-final-recovery | — | **next-dig-list-v5-final.md** |

**历史给出的三个关键判断：**

1. **四类合法路径全部被真实用过**：base 首交付、HITL2 rerun ×4、presentation 整理 ×2、落地反馈深挖 ×1。这不是假想场景，是本仓库最高频的 post-Final 使用模式；任何一条路径找起来费劲都会反复付成本。
2. **dig-list 接力链已经 de facto 成立且稳定**：v4 清单（86 行，带 Evidence Map `DIAG-V4-DIG`）→ rerun#4 的 HITL2 rationale 与 intent revision 逐条引用其 A/B/C id → V5 → 产出 v5 清单（108 行，新增 AMD 专题）。A/B/C/D 分层与条目 id 语义跨轮未变。**C3 是把已经在用的约定成文，不是发明新东西，风险低于从零立约。**
3. **负面知识已经在接力且有真实价值**：v4 的 B2（深算四号 HBM 规格）→ v5 升级为"反复检索=证据不存在，不再重复投入"的死坑声明。没有固定继承位置，这条纪律每轮都要靠人肉记忆。

## 2. 现状事实（已存在、不重复建设）

- **rerun 机械链路完整且 copyable**：`COMMANDS.md`「Post-Final Rerun Recovery」表 → `command_playbook/post-final-recovery.md`（inspect → retained request 两段式 reason + requested_scope → apply/recover → enter-phase phase-rerun → advance-status/check-reentry → `phase-rerun.md` 七 label revision + topic-state + rerun_count → rerun-ready gate → seed-topics delta 模式）。
- **整理机械链路同样完整**：`workflows/nodes/phases/phase-final.md` 标题即 "Deliver And Refine In Place"（§3a Composition And Revision Discipline、§8 Deliver First, Then Refine）+ `persist-artifact` playbook（`persist-final-report` non-primary / `publish-final-report` primary 版本分配）。
- **版本分配**：引擎 `allocateFinalReportTarget` 自动分配 vN；本 bundle 6 个主版本全走此路。

## 3. 缺口（按诉求分组，全部有实证）

### 诉求 A：rerun 挖掘接力

- **G1 意图→路由不可发现**。用户说"继续挖一轮/rerun/再挖"；`COMMANDS.md` 只有工具名行，语义埋在超长段落；`rb_templates/BUNDLE_ENTRY.md.tmpl` Final 段只讲 presentation/owner 消歧，对 evidence-expanding rerun 零提示。
- **G2 dig-list 无契约，且两轮间已漂移**。实证：命名后缀语义不一致（`v4-landing-feedback`=触发式 vs `v5-final`=版本式）；Evidence Map 有→无（v4 带 `DIAG-V4-DIG`，v5 没有）；README 版本表 V4 行链接了 dig-list、V5 行没链。`rb_templates/BUNDLE_MAP.md.tmpl` 把 `_diagnostics/` 描述为 "emitted by framework commands"，Agent 手写选题清单不在被承认形态里。
- **G3 scope 提炼无结构**。100+ 行分层清单 → `requested_scope` 一行自由文本；条目 id 与 retained request/revision 之间无引用约定（rerun#4 的 rationale 其实已经自发引用了 id——约定事实上存在，只差成文）。

### 诉求 B：final 内容整理

- **G4 整理意图→路由同样不可发现**。phase-final 的 refine-in-place 路径完备，但用户说"整理一下/重写/自包含版"，从 `COMMANDS.md` / `BUNDLE_ENTRY` 同样找不到措辞映射——和 G1 是同一个病。
- **G5 final/ 目录整理无同步义务（结构性漂移）**。`final/README.md` 纯手工维护（`rb_templates/` 无 final README 模板），已漂移两处：① README 树写 `final_landing_deep_dive_h200_anchor_v4.md`，实际主报告是 `final_V4_landing_deep_dive_h200_anchor.md`，辅助目录又是 `final_landing_deep_dive_h200_anchor_v4/`——**主报告与辅助目录不同名，违反 README 自己的核心规则 1，且 README 记录了不存在的文件名**；② `final_v5_self_contained.md` 完全未收录（目录树和版本表都没有）。
- **G6 整理版与证据面的关系无约定**。整理不新增证据，但整理版是否继承/重链 limitations→dig-list、是否入版本表、命名后缀（`_self_contained`）是否合法形态，无规则可依。

## 4. 候选工作分解（各有界；doc/template 优先，默认不动 Engine）

- **C1（doc-only，最小，ready to propose）——双意图 intake**
  - `command_playbook/post-final-recovery.md` 增加 "Intake from a dig list" 小节：存在 `_diagnostics/next-dig-list*.md` 时，Agent 先读最新一份，按其优先级层提出 bounded scope 建议，用户修正后把选中条目 id（如 `A1–A3 + AMD§1–2`）写进现有 `requested_scope`/`reason` 字符串。**不加 schema 字段、不加 label parser**。
  - `COMMANDS.md` 补用户措辞→路径映射：「继续挖/再挖一轮」→ post-final-recovery playbook；「整理/重写/自包含版/换个读者版本」→ phase-final refine-in-place + `persist-artifact`；混合请求先分类再走对应路径（分类语义 post-final-recovery.md Boundary 已有，缺的只是"被找到"）。
- **C2（template）**：`rb_templates/BUNDLE_ENTRY.md.tmpl` Final 段补双指针（rerun 意图→post-final-recovery playbook；整理意图→phase-final §3a/§8）；`rb_templates/BUNDLE_MAP.md.tmpl` Diagnostics Map 承认 Agent 手写 dig-list 为 `_diagnostics/` 合法形态。仅影响新实例化 bundle。
- **C3（convention + Final 节点 doc）**：dig-list 成文约定——"最新一份"稳定名 `next-dig-list.md`（历史版本带轮次后缀归档）；固定「已宣布证据不存在/不再投入的死坑」节；**Evidence Map 必带**（统一 v4/v5 不一致）；`phase-final.md` 交付指引加"Final 收口时如产出/更新 dig-list，与报告 limitations 双向链接"。
- **C5（convention/doc，新增：final 目录管家义务）**：每次 `publish-final-report`/`persist-final-report` 后同步刷新 `final/README.md`（目录树、版本表、dig-list 链接、non-primary 整理版收录）；feature 名交付在 README 同时记录引擎名与 vN 对应关系；衍生整理版（`_self_contained` 类）的命名与收录规则成文。落点：`phase-final.md` §3a/§4 交付指引；可选加固：`rb_templates/` 增加 final README 骨架。
- **C4（defer，Engine 级）**：仅当 doc 级被真实证明不足才考虑（如 post-final-recovery `inspect` surfacing "latest dig-list present"）。默认不启动；启动须完整 OpenSpec change。

## 5. 非目标

- 不造第二条 rerun/整理路由、不加 HITL checkpoint、不动 HITL2/rerun semantics、不加 Engine schema 字段/parser。
- `_diagnostics/` 与 `final/README.md` 都保持 non-authority：dig-list 是选题输入不是 scope/coverage authority；final/ inventory（引擎扫描）仍是唯一真相源，README 是导航汇总——C5 修的是"同步义务"，不是升格 README。
- 不把本 plan 变成第二 glossary（CONTEXT.md 明令）。

## 6. 验收（下一个真实迭代周期，即本 bundle rerun#5 起）

- **rerun 侧**：用户不贴 dig-list 路径；scope 按清单优先级层结构化产出、一次修正定稿；`requested_scope` 引用条目 id；死坑节被读取且不重挖（如 B2）。
- **整理侧**：用户说"整理/自包含版"即达 phase-final 路径，零翻找；每次交付后 README 与 inventory 零漂移（文件名、收录齐全性抽查）。

## 7. 风险与协调

- **C5 与 `iterative-final-delivery-versioned-output` 强交叠**（版本化命名正是它的主题）：实现前必须互查；版本命名规则以该 plan 及其后续 change 为准，本 plan 只管"同步义务与收录"，不另立第二套命名语义。
- C2 模板改动对存量 bundle 无追溯效果——本 bundle 第 5 轮仍靠 C1/C3/C5 兜底。
- C3/C5 纯约定有 drift 风险；日后若 Engine 需要引用（C4），必须升格为 spec，不靠约定。
- 与 `topic-research-emphasis/`（P2）在 rerun guidance 上有轻微交叠：实现前互查。

## 8. 状态

closed 2026-08-28（CLS-076）— **C1 已完成并归档**（OpenSpec change `2026-08-28-add-post-final-dual-intent-intake`：ACS-006 意图路由 + POF-005 dig-list intake，含 doc-lock 回归 `tests/engine/post-final-intent-intake-docs.test.mjs`，finalizer 17/17 checks）。核心痛点（意图→路由不可发现 + dig-list 无 intake 指引）已由 C1 收口。C2（entry/map 模板指针）、C3（dig-list 命名/死坑节/Evidence-Map 成文）、C5（final/README 同步义务）**未随行实施**：C5 的 spec 义务已由 CDP-008 拥有（属执行缺口），C2/C3 若模板/约定层面摩擦再次可见，可按本文件 §4 原案重启；C4（Engine 级）维持不启动。
