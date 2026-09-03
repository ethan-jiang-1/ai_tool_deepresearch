# Proposal: bundle-isolation-and-creation-consent

## Why

2026-09-02/03 的 run bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 暴露了两个未被任何 accepted contract 覆盖的边界违反：

1. **跨 bundle 信息污染**。该 bundle 把另一个方向不同的 bundle
   `dpt_rb_chinese-ai-inference-chips-vs-nvidia/final/final_v7.md` 当作"历史报告"证据基线，
   污染贯穿 `rb_plan.md`（以"与历史报告判定的差异"为研究框架）、
   `artifacts/wave1/*/evidence-summary.md`（把"历史报告"列为 wave1 证据来源）、
   `final/references/03_hybrid-deployment.md`（来源栏直接写"历史报告 V7"）与
   `_scripts/generate-final-report.mjs`（证据索引引用另一 bundle 路径）。run 继续时信息混乱，
   因为证据 provenance 指向 bundle 之外。现有 `bundle/bundle-data-isolation`（BUI-001/002）
   只约束文件系统级隔离（路径/写入不越界），对**语义级引用**零约束。
2. **未经用户同意新建 bundle**。`dpt_rb_glm-5-3-deepseek-v4-domestic-chips-v2`
   于 2026-09-02T18:54:58Z 由 Agent 会话静默 instantiate
   （`_logs/run.log` 第一行 `run_start {"source":"instantiate-run-bundle"}`），
   当时主 bundle 仍在运行（引擎状态停在 `phase-wave1`，`final/` 持续写到 03:15）。
   v2 出生即带 profile schema 错误，卡死在 `seed_topics_ready`，成为废 bundle，
   与主 bundle 各自承载同一份重定 scope 的内容，没有权威状态。这不是实现 bug，
   而是 spec 明文的反模式：`cmd-bundle-instantiation` CMI-005 与
   `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`
   明确指示"不要在 autonomous execution 中要求用户提供名称"、碰撞时"Agent 派生新的
   collision-safe 名称后重试"——框架主动教会 Agent 静默造出 `-v2`。

Charter 已声明正确原则（"structured runtime facts belong to the explicitly selected
current run bundle"，Helper-Oriented Agent 把语义/风险/权限决定留给用户），
但两条边界都没有可执行契约落地。用户原始反馈（2026-09-03 会话）：新 bundle 的产生
一定要让用户知道，是用户的权利；一旦在一个 run bundle 里，所有信息都只属于这一个
bundle，不看任何别的，哪怕名字接近。

## What Changes

- **信息自包含（BUI-003，ADDED 到 `bundle/bundle-data-isolation`）**：一个 run 进行中，
  其 plan、evidence、reference、final 的内容 SHALL 只来自本 bundle 自产证据
  （work-unit submit 产物、wave source、本 bundle cache）与用户显式提供的输入。
  禁止引用、导入或作为基线使用任何其他 run bundle 的内容（无论名字是否接近）。
  用户显式提供的先前研究发现 SHALL 在 bundle 内物化（带 user-supplied provenance 标记），
  且在被引用为 evidence 前 SHALL 重新溯源到一手来源。
- **跨 bundle 引用机器诊断（BUI-003 场景）**：inspect/audit SHALL 扫描 bundle 内容文件
  （`rb_plan.md`、`artifacts/`、`reference/`、`final/`、`seed_topics/`）中的
  其他 `dpt_rb_*` 路径引用，作为 isolation 诊断报告；关联到当前 run surface 时为 blocker。
- **新建 bundle 需用户知情（CMI-010，ADDED 到 `bundle/cmd-bundle-instantiation`）**：
  对已存在 bundle 的 collision、run 中途重启、重定 scope 再开新 bundle 等一切
  **追加性** bundle 创建，Agent SHALL 先向用户说明并取得明确同意后才能 instantiate。
  命名本身继续 Agent 派生（CMI-005 的命名自主性不变）。
- **创建器 sibling 预检（CMI-010 场景）**：`instantiate-run-bundle.mjs` 在创建前 SHALL
  扫描目标目录下已存在的 `dpt_rb_*` sibling；存在同前缀/名字接近或非 Final 状态的
  sibling 时 SHALL 拒绝创建并给出要求用户同意的诊断，除非显式携带
  `--acknowledge-existing-bundle <name>` 确认参数。
- **playbook 文本改写**：`instantiate-run-bundle.md` 的"collision-safe 名称后重试"
  条款替换为"stop and ask user"；`continue-run-bundle.md` Entry Selection 增加同向指针。

**非目标（Excluded）**：不修复已污染的两个现存 bundle（补救是单独的 run 决策，
走 accepted rerun/recovery 路径）；不覆盖 wave1 证据伪造与 trace 伪造
（由 active change `harden-wave1-evidence-and-trace-integrity` 拥有，BUG-250/251）；
不新增第三个 HITL checkpoint（创建同意是 entry/边界规则，不是 in-run checkpoint，
HITL1/HITL2 仍是仅有的 interactive in-run 检查点）；不改变 entry selection 的
用户显式提供原则（`bundle/run-entry` 不动）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `bundle/bundle-data-isolation`：ADDED requirement BUI-003 —— run 内容信息自包含与
  跨 bundle 引用诊断（现有 BUI-001/002 只管文件系统隔离）。
- `bundle/cmd-bundle-instantiation`：ADDED requirement CMI-010 —— 追加性 bundle 创建
  需用户知情同意与创建器 sibling 预检（现有 CMI-005 的"命名不是 mid-pipeline 用户依赖"
  保持不变，本变更不动 CMI-005 的 requirement 文本，只在其邻域新增创建决定边界）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/bundle-data-isolation` | main spec（BUI-001/002：目录共存、路径归属、repo-root leak 诊断） | **Modify** | 只覆盖文件系统隔离；语义级引用（把别的 bundle 结论当证据/基线）无契约，正是本次污染形态 |
| `bundle/cmd-bundle-instantiation` | main spec（CMI-001..009）+ `command_playbook/instantiate-run-bundle.md` | **Modify** | CMI-005 与 playbook 明确禁止询问用户、指示 collision 静默改名重试；需新增创建同意边界与预检 |
| `bundle/run-entry` | main spec（entry selection：用户显式提供、不许 scan 选择） | Verify-only | 已禁止以扫描方式选择 bundle；本变更为其"creating a bundle"回退路径补同意门，不改其 requirement |
| `workflow/workflow-directory-contract` | main spec（bare path 归属 current bundle root） | Verify-only | 路径归属已正确；语义引用是新维度，由 BUI-003 拥有 |
| `agent/hitl-ux` | main spec（HITL1/HITL2 环模型） | Excluded | 创建同意不是 in-run checkpoint；把它做成第三个 checkpoint 会破坏"仅有的两个 interactive 检查点"契约 |
| `workflow/silent-wave-execution` | RUN.md 引用（静默自律） | Excluded | 静默自律管 phase 间推进；bundle 创建不是 phase transition，其同意门由 CMI-010 拥有，无需改此 spec |
| `engine/trace-writer` | active change harden-wave1 delta | Excluded | trace 伪造检测由 `harden-wave1-evidence-and-trace-integrity` 拥有（BUG-251），不重复立项 |
| `research/post-final-recovery` | RUN.md 引用（ReopenResearchPass） | Excluded | 重定 scope 的合法路径已有 accepted recovery 契约；本变更只在"另开新 bundle"入口加同意门，不改 recovery 语义 |
| `agent/agent-command-surface` | catalog 行 + spec 引用 | Excluded | entry 文档 trigger/execution 区分已有；本变更不新增命令面，只改一个既有 CLI 的参数集与两个 playbook 文本 |

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`（argv 解析扩展
  `--acknowledge-existing-bundle <name>`、sibling 扫描预检、拒绝诊断）；
  `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` 与 `audit-phase-status.mjs`
  （跨 bundle 引用内容扫描诊断）；`DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`
  与 `continue-run-bundle.md`（文本条款改写）。CLAUDE/AGENTS 面无需新命令。
- **测试**：`tests/engine/`（创建器预检 unit）、`tests/integration/cli/`
  （sibling 拒绝/ack 参数/内容扫描诊断）。
- **不涉及**：无新依赖；无 schema 破坏性变更；不改 gate 判定规则
  （诊断走 inspect/audit 既有 advisory/blocker 分级）。

## 设计边界声明

- **责任边界**：用户决定"是否再建一个 bundle"（语义/权利决定）；Agent 执行命名派生、
  预检、向用户呈现同意请求（普通授权工作）；Engine 判定 sibling 存在性/相似性/状态、
  拒绝与 ack 参数有效性、内容引用诊断（确定性 verdict）。
- **Source of Record**：跨 bundle 引用事实的 SoR 是 bundle 内容文件本身（机器扫描）；
  创建同意事实的 SoR 是用户当轮对话表达 + CLI ack 参数；两者都不落 chat memory。
- **最短合法闭环**：污染场景 = inspect/audit 一次扫描直接命名违规文件（无新状态机）；
  创建场景 = 创建器一次预检直接拒绝或放行（无新 lifecycle 状态）。
- **net simplification**：用两个确定性检查替换掉现在"Agent 自由裁量 + playbook
  反模式指引"的开放面；删除 collision-safe 静默改名条款（一个故障源）。
- **semantic-precision reflection**：新概念"追加性创建（additional bundle creation）"
  的有界问题是"本次 instantiate 是否是同一会话/workspace 里的第一个生产 bundle"；
  必须保留的区别是"首个由用户研究请求直接授权的创建"与"后续一切创建（碰撞/重启/重定
  scope）"；正常停止点是"用户明确同意或创建被拒绝"，没有第三态。"信息自包含"不引入
  新状态，只把 Charter 既有原则投影为可执行诊断。
