## Context

- 七个目标段落均为**单行**高密度散文（实测 chars：RUN L34=1114 / L36=953 / L40=954 / L55=730；COMMANDS L17=1463 / L33=659 / L11=460），合计 ≈6.3k chars。
- 其下方既有结构参照：`RUN.md` L42–53 的 recovery 决策表已是表格形态且被 `tests/engine/work-unit-recovery-decision-table.test.mjs` 锁定（行集从 `engine/work-unit-repair-vocabulary.mjs` 派生）——本 change **不触碰该表**。
- C1 已合入 `check-gate-chain-prose.mjs`（gate 枚举链不进 prose 的 guard）与既有 `check-content-drift.mjs`（repo-relative 路径可解析）/ `check-guidance-pointer-targets.mjs`（指针目标存在）——新引入的 owner 指针会被它们机器校验。
- 段落内容与 owner specs 高度重叠（这正是 plan 要求 owner 标注 + 降级纪律的原因）：HITL 语义→`agent/hitl-ux`；静默自律与用户消息边界→`workflow/silent-wave-execution`；work-unit 路径/submit→`agent/delegated-work-units`；attempt_disposition/next 形状→`engine/check-inspect-feedback`（CHI-004）；post-final rerun→`research/post-final-recovery`；bare path 坐标→`workflow/workflow-directory-contract`；命令责任/受众边界→`agent/agent-command-surface`。

## Goals / Non-Goals

**Goals:**

- 七段全部变为「一规则一行」的原子结构（优先表格：触发/主题 | 规则 | Owner），所有 backtick token（枚举、命令、坐标）原样保留。
- 每条规则标注 owner；经 grep 验证归属后，owner-spec 拥有的规则降为「指针 + 一行摘要」。
- 既有锁定测试、governance checker（content-drift / pointer-targets / gate-chain-prose）、全量 `npm test` 全绿且测试零改动。

**Non-Goals:**

- 不改 L42–53 决策表；不触碰次级段落（RUN L57/L59、COMMANDS L13/L15/L19）。
- 不新增/合并/改写任何语义、枚举、命令、坐标；不改任何 `.mjs`。
- 不追求以删除规则内容为代价满足行数预算（见 Risks）。

## Decisions

- **D1 块形态：每段一个小节表格** `| 触发/主题 | 规则 | Owner |`，一规则一行；降级规则在规则列写一行摘要 + Owner 列给 canonical home 相对路径（RUN.md/COMMANDS.md 为 harness 面，用 `../openspec/specs/...` 形态，与 L55 既有 `../tests/...` 形态一致）。不引入新标题层级，避免改变文档大纲。
- **D2 降级须逐条验证归属**：apply 时对每条候选降级规则 grep 其 owner spec，确认该 spec 确实承载该语义才降级；验证不到的一律原样保留（保守方向：宁保留、不丢规则）。逐段分解与验证结论记录在 tasks 完成注记中。
- **D3 token 全保留机检**：apply 时以脚本对比「重构前段落（`git show HEAD:` 版本）」与「重构后对应块」的 backtick token 集合，断言原集合 ⊆ 新集合；枚举形态 token（如 `readiness_passed`、`timed_out`）单独核对。结果写回 tasks 注记。
- **D4 七段分解基线**（apply 时按 D2 微调）：
  - RUN L34 → 5 条：hitl1/hitl2 唯一 interactive checkpoints（`agent/hitl-ux`）；静默自主推进禁提问/确认/汇报/等待（`workflow/silent-wave-execution`）；用户主动消息回答边界（同上）；Final terminal delivery 序列（`research/final-delivery-backing` + publisher 面）；满意不写事实 + ReopenResearchPass 重入（`research/post-final-recovery`）。
  - RUN L36 → 5 条：work-unit 链条（`agent/delegated-work-units`/`agent/subagent-dispatch`）；submit claimed-only / same-hash 幂等 / 异内容拒绝（同前）；late-submit 唯一终态恢复例外（同前）；queue completion ≠ delegated success（`agent/agentic-queue`）；bare runtime paths 归属 bundle root（`workflow/workflow-directory-contract`）。
  - RUN L40 → 3 条：exact command/checkpoint 保持 + 读结构化 `attempt_disposition`/`next`；五反馈面同形（CHI-004：`engine/check-inspect-feedback`）；recovery 结果永非死路 + 成功/幂等后重跑同一 checkpoint；段尾保留对下方 test-locked 决策表的引入句（该表是唯一 disposition→recovery_action→动词→重跑映射）。
  - RUN L55 → 3 条：late-submit 三条件 + audited + 重跑（`agent/delegated-work-units`）；`timeout-preflight` 只读 + `recommended_action` 枚举 + `--force` 例外（executable contract）；表行集派生自 `WORK_UNIT_RECOVERY_ACTIONS` 且被测试锁定（CHI-004）。
  - COMMANDS L17 → 6 条：HITL1/HITL2 唯一 interactive + 推荐式；entry selection 只选入口；静默自律；用户主动消息边界；Final terminal delivery + `publish-final-report` + immutable revision + 非 checkpoint/Gate/confirmation loop；`post_final_rerun` 走 audited recovery + request metadata 非权限面；用户定 scope/risk 后机械步骤回 Agent（owner：`agent/agent-command-surface`、`agent/hitl-ux`、`workflow/silent-wave-execution`、`research/post-final-recovery`、`research/final-delivery-backing`、`bundle/run-entry`）。
  - COMMANDS L33 → 4 条：cue 是 decision-point projection + `interaction:` 词汇（`engine/check-inspect-feedback`/`engine/cli-inspect-output-conventions`）；`enter-phase` cue 呈现序；claim action-only；cue 非权限/状态字段/路由权威/完成证明/见证。
  - COMMANDS L11 → 3 条：ordinary authorized execution 与可逆机械修复 Agent-owned；有合法路径即修 + rerun 同一 checkpoint；无合法路径报 missing contract、不手写 authority（owner：`agent/agent-command-surface`）。
- **D5 与 C1 guard 的顺序约束已满足**：C1 的 gate-chain-prose guard 已归档合入，重构过程中若意外引入 gate 枚举箭头链会被 `governance:check` 当场拦截。

**Alternatives considered**：整段原样只加 owner 行（拒绝：未原子化，不满足 plan 方法）；把段落整体迁移进 specs（拒绝：RUN/COMMANDS 的 entry 投影职责要求决策最小规则就地可读，迁移属行为面变更）；为 token 机检新增永久测试（拒绝：会冻结未来文档编辑，采用 apply-time 脚本检查 + 注记记录，与先例「复测写回」一致）。

## Risks / Trade-offs

- [行数预算「净 ≤ 0」与单行段落表格化数学相悖：7 个单行 → ≥7 个表块必然增行；完全指针化（每段 ≤1 行）才可能达标，但那违背「表格化/原子化」] → 以语义保持 + token 全保留为第一不变量；行差如实测量，在 closeout 呈报实测值与成因，不为凑预算删规则。此为对 plan 内在张力的显式披露。
- [降级误判（spec 其实未承载该语义）造成规则丢失] → D2 保守方向：grep 验证不过即保留原文；逐条结论留痕。
- [owner 指针路径写错] → `check-content-drift.mjs` / `check-guidance-pointer-targets.mjs` 机器校验可解析性，`governance:check` 全绿为 done condition。
- [改写过程意外引入 gate 枚举箭头链] → C1 guard 红线拦截。

## Migration Plan

纯 markdown 原位重构，可逐段独立回滚（`git checkout -- <file>`）。无数据迁移、无兼容期。

## Open Questions

无——行数预算口径已按上述披露处理，不阻塞结构化与语义保持目标。
