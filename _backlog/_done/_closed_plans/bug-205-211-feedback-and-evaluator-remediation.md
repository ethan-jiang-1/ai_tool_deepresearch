# Plan: BUG-205--211 Feedback & Evaluator Remediation

> 完整 real-actor Deep Research run 暴露的 7 个确定性摩擦点的收敛计划。
> 状态: **closed (CLS-055)** | 创建: 2026-08-08 | closed: 2026-08-08 | source: CCDS4 (Claude Code + DeepSeek v4)
>
> 两个 OpenSpec change 均已归档：`make-feedback-name-contract-roots`（v0.77，BUG-206/207/208/210/211）
> + `make-evaluator-and-cli-behavior-direct`（v0.78，BUG-205/209）。7 个 bug 全部 fixed。

## 背景

一次端到端 real-actor run（`dpt_rb_enterprise-ai-harness-platforms`，
HITL1→Wave0→Wave1→Wave2→HITL2→Final）中，Phase Agent 实际遇到、必须修复才能
继续的确定性摩擦点共 7 个（BUG-205..211，见 `_backlog/bugs/`）。分两类契约问题：

- **A. Engine feedback / Agent 指引点名不了确定性契约根**（5 个）：规则存在但 Agent
  看不见——错误信息泛化、schema 显示不全、指引/模板漏规则。
- **B. 确定性 evaluator/CLI 行为拒绝合法状态**（2 个）：parser/CLI 输出语义与
  合理书写/健康状态矛盾。

按项目"bug 是 contract-class probe、避免 mega-change"纪律，拆为两个有界 OpenSpec
change。

## Change 1 — 让 feedback 与指引点名确定性契约根

**契约类**: Agent-facing feedback / guidance 必须让 Agent 知道"缺哪个事实、写去哪、
重跑哪个 checkpoint"（`contract-lineage-aware-feedback`）。

| Bug | 根因 | 修复面 |
|-----|------|--------|
| BUG-206 | `acceptance_status: accepted :warning:` 未加引号是非法 YAML；模板文档化成裸值，失败以泛化 frontmatter/index 错误浮现 | `shared-reference-template.md` 文档 + reference frontmatter 错误信息点名 key/value；或接受引号变体 |
| BUG-207 | `operate-topic-state schema --context wave_projection` 只显示 `source_identity.kind: submitted_work`，wave2_judgment 实际需要 `{kind: finding, finding_id}` | schema 输出按 wave/slot 展开允许的 source_identity forms；改进 cross-field 错误 |
| BUG-208 | Wave2 finding 需 3 位 `W2F-xxx` id + `created_in_rerun_count`，反馈只有裸 `wave2_finding_not_current` | `shared-schemas.md` finding-index 契约补两字段；apply 错误点名缺失事实 |
| BUG-210 | supplementary Wave1 work unit 不自动进 depth-review `reviewed_work_unit_refs`；floor-deficit 反馈不指向该编辑 | `wave1-reference-convergence.mjs`/inspect 反馈点名 depth-review 更新，或自动从 submitted rows 推导 reviewed refs |
| BUG-211 | Wave1 reference canonical 文件名（`{slug}-{host+path token}-{12-hex}`）是隐藏契约 | `phase-wave1.md` §3.2.2 / `shared-reference-template.md` 文档化；inspect 每 candidate 发一行 canonical 名 |

**验证**: feedback 断言单测（错误文本点名缺失事实）、schema 输出断言、docs 更新 diff。
不改变 evaluator 接受/拒绝的合法集合（除 206 引号变体的设计选择）。

## Change 2 — 确定性 evaluator/CLI 行为修正

**契约类**: deterministic evaluator/CLI 必须接受合理书写、健康状态给出明确结论。

| Bug | 根因 | 修复面 |
|-----|------|--------|
| BUG-205 | `parseMarkdownSemanticSections` 把 `###` 子节当 section 边界，`## Key Findings` 下只有 `###` 子节时被判空 → `key_findings_missing_or_empty` | `markdown-semantic-sections.mjs` 把嵌套子节内容并入父 section body（或评估器改为接受 descendant 内容）；`direct-output-contract.mjs` 受影响 |
| BUG-209 | `operate-queue check` 在 queue 已 drain（active_window/refill/in-flight 全空）时返回 `passed:false`，与 gate `phase_queue_drained` 矛盾 | queue CLI 对 drain 态给出明确 `drained` 结论（新 verdict 字段），不再 `passed:false` |

**验证**: evaluator/CLI 单测（nested-heading Key Findings 通过、drained queue 返回
`drained`）+ 现有 regression 不回归。

## 顺序与依赖

1. Change 1 先 propose/apply/archive（feedback/doc 面更独立，风险低）。
2. Change 2 后 propose/apply/archive（行为修正，验证面明确）。
3. 二者无硬依赖，可并行 propose；归档时各自独立闭合对应 BUG。

## 明确不做（anti-mega-change 边界）

- 不把 7 个 bug 合并成一个 change。
- 不把本次 run 的 weak-model 执行产物（如 evidence-summary 的 `###` 子节写法）当作
  framework bug 之外的新行为；只修确定性锚点。
- 不改变 `exploratory_map` 质量阈值（BUG-175 政策残余独立保留）。
- 不新增 HITL/controller/lifecycle；只在现有 feedback/schema/docs/parser 面收敛。

## 交付物

- `openspec/changes/<change-1-name>/`：proposal + delta spec + design + tasks
- `openspec/changes/<change-2-name>/`：同上
- 归档后 BUG-205..211 移入 `_backlog/_done/_fixed_bugs/`
- 本 plan 完成后移入 `_backlog/_done/_closed_plans/`
