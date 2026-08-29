## Context

参见 `proposal.md`。本项目在历史迭代中积累了 `C1` ~ `C5` 五个开发阶段里程碑代号。这些代号原本指代具体的恢复、样式锁定、主题突变、智能体降级和终态重入机制，但由于缺乏自解释性，在规范（OpenSpec）、控制面（Harness playbooks）、引擎诊断提示和测试用例中造成了显著的认知摩擦。

## Goals / Non-Goals

**Goals:**
- 将活跃的 `C1`~`C5` 代号全面替换为自解释的领域驱动设计（DDD）命名：
  - `C1` → `StateHealthCheck` / 状态健康巡检
  - `C2` → `ResearchConfigLock` / 调研配置定稿单
  - `C3` (含 `C3A`/`C3B`) → `TopicTreeEvolution` / 课题大纲演进管线
  - `C4` → `WorkerFallback` / 智能体降级容灾
  - `C5` → `ReopenResearchPass` / 终态重开通行证
- 保持所有运行时的确定性契约、哈希比对、状态转换与门控规则 100% 行为等价。
- 确保 `npm run governance:check` 和全量测试套件 100% 通过。

**Non-Goals:**
- 不重写历史归档（`_backlog/`、`openspec/changes/archive/` 等已冻结历史包）。
- 不改变底层数据结构字段名称（如 `post_final_reentry` trace event 依然由其 accepted schema 约束）。

## Decisions

### 1. 概念与命名精确对应 (Semantic Precision Triad)
- **C2 → `ResearchConfigLock` (研究风格锁定契约 / 样式鲜度检查点)**：
  - *Rationale*：其本质是 HITL1 和 Rerun 阶段锁定 `research_style_params` 的防篡改契约。
- **C3 → `TopicTreeEvolution` (课题大纲演进管线)**：
  - *Rationale*：其职责是在中期审阅时提供规范化主题的增删改排（`add_topic` / `update_intent` / `mutate_layout`）。
- **C5 → `ReopenResearchPass` (终态重开通行证 / 后交付重入血统凭证)**：
  - *Rationale*：其物理意义是 Final 报告交付后，因新增一手证据需求而合法重开 Rerun 的审计血统。

### 2. 渐进式全局替换策略 (Simple & Reliable Control)
- 一次性在所有活跃控制面（`CONTEXT.md`、`RUN.md`、`COMMANDS.md`、`phase-*.md`、`openspec/specs/`）中消除 `C1~C5`，避免新旧术语混用造成第二层混淆。

## Risks / Trade-offs

- [Risk] 测试用例中对 `C2` / `C3` / `C5` 字符串的静态回归锁（如 `guidance-terminology-pointer-consistency.test.mjs`）可能因文本替换而报错。
  - → *Mitigation*：同步更新测试中的断言目标，使其校验全新的具名术语。
