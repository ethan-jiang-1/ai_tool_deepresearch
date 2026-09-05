# Design: Add Run-Bundle Repair Playbook

## Context

See proposal.md - Why for motivation. Framework facts shaping the approach:

- Entry Selection (canonical) in `command_playbook/continue-run-bundle.md` is the single canonical entry rule; root `AGENTS.md` "Deep Research Routing" states exactly one canonical statement, and all other entry surfaces carry pointers. It currently names continuation and inspection intent only.
- In-run repair is already an Engine first-class loop: `workflow/repair-loop` (REL-001), five work-unit feedback surfaces with `attempt_disposition` + `next.recovery_action`, `engine/work-unit-repair-vocabulary.mjs` with a test-locked decision table.
- `agent/agent-command-surface` owns entry docs and routing aids: ACS-005 (one canonical continuation playbook), ACS-006 (post-final iteration routing aid, navigation only).
- `tests/engine/command-contract-docs.test.mjs` statically scans `command_playbook/*.md` (dynamic directory list) plus `COMMANDS.md`, `RUN.md`, `README.md`, `cli/README.md`, and lifecycle/shared Markdown; PHRASE_CLASSES reject audience/HITL drift; allowlist entries require file/phraseClass/allowedContext/reason.
- Harness `README.md` already declares `command_playbook/` as home for "Agent-facing command instructions and diagnostic/maintenance playbooks"; `provenance-forensics-guide.md` is the precedent maintenance playbook.
- `_backlog/` is Do-Not-Read unless the user names a path, so it cannot be an entry target; only the framework surface can carry the repair entry.

## Goals / Non-Goals

**Goals:**
- 独立修理入口：repair intent 在 canonical entry selection 中成为定义好的 intent 族，路由到 repair playbook，不再被硬塞进研究/续跑流程。
- 诊断优先：playbook 的第一动作是基线诊断；合法结论包含"没坏 → 落回 continuation"，两车道由该落点连通。
- 泛化：playbook 对任意 `dpt_rb_*` / 任意 wave / 任意未来破损类别成立；场景映射以引擎 structured verdicts 为坐标，不写死任何 bundle 坐标。
- 导航自包含：bundle 坐标、命令全参、流程序、边界规则在 playbook 内；契约模板引用 `COMMANDS.md` Copyable Contract Templates 与 owner spec，不复制第二真相源。
- 边界：out-of-band maintenance 语义——用户修理请求是 human-directed 决策来源，Agent 执行合法机械修复并重跑同一 checkpoint，无引擎路径即 `missing_contract` 停边界，修 ≠ 改研究语义。

**Non-Goals:**
- 不改任何 Engine schema/verdict/transition/CLI 行为；不改 run 内修理循环（REL-001 不动）。
- 不新增 stop 名；不新增 capability；不新建第二份 canonical entry 表述。
- 引擎操作化候补（seed prune、reference locator、binding 投影、digest 对账，见 playbook §6.5 B–D）是后续独立 change，不在本 change 内。
- 不迁移 `_backlog/plans/run-bundle-repair-experience-playbook.md` 全文；历史沉淀留在 `_backlog/`，只迁移可执行知识到框架面。

## Decisions

### D1. 路由位置：扩 Entry Selection (canonical)，不另立 repair canonical 节，也不并入 continue-run-bundle

Entry 时的 intent 分流留在 `continue-run-bundle.md` 的 canonical 节（MODIFIED ACS-005），repair playbook 只做承接面。

- 备选 A：`repair-run-bundle.md` 自带 canonical 节 → 与根 AGENTS.md "完整入口规则只有一处 canonical 表述"的不变量冲突，制造第二份 entry 真相源。
- 备选 B：把 repair 全并进 `continue-run-bundle.md` → 撑爆 continuation playbook，稀释 ACS-005 的"唯一 continuation playbook"契约。
- 取中：一个 canonical 规则（entry 时分流），两个下游薄 playbook（continue / repair）。这同时满足用户的两个要求：修理有独立门（不与主线折腾），门后是同一引擎回路（内在逻辑一致）。

### D2. 落位 `command_playbook/repair-run-bundle.md`

`_backlog/` 是 Do-Not-Read 区，不能承载入口目标；`openspec/operations/` 是 governance 操作面而非 Agent-facing 执行面；Harness `README.md` 已把 `command_playbook/` 定义为 diagnostic/maintenance playbooks 的容身位，`provenance-forensics-guide.md` 是先例。内容来源是 `_backlog` 手册的可执行知识（导航部分），历史保留在原处。

### D3. 导航自包含 ≠ 契约复述（修正 §5 原案的"自包含"定义）

§5 原案要求 playbook 完全自包含（命令全参、场景流程都在文件内）。按 charter authority 表，packet 模板、canonical 文件名规则、supplementary receipt set 等 deterministic 细节的 Source of Record 是 `COMMANDS.md` Copyable Contract Templates 与 owner spec/引擎；playbook 内联复述即第二真相源。因此 playbook 只自包含"导航"（坐标、命令全参、流程序、边界），契约细节一律引用。修理 Agent 无会话记忆的鲁棒性靠引用可达保证，不靠复制文本。

### D4. 泛化形态：场景映射键 = 引擎 structured verdicts

场景知识以"症状 → `rule_id` / `repair_kind` / `write_to` / `near_matches` → 合法操作"的通用形态沉淀；任何具体 bundle 坐标（work_id、topic slug、文件名）只作占位示例。把单 bundle 坐标 bake 进框架面会制造"只对这个 bundle 有效"的假通用性，违背用户硬约束（不为单项目打补丁）。

**记录的 scope 假设**：repair 入口不服务 `dpt_disp_*`（README 定义为 disposable experiment bundle，一次性；坏了重建不修）。该假设同时写入 ACS-007 delta（playbook SHALL NOT target `dpt_disp_*`）。若未来需要对 disposable bundle 提供修理，需单独决策，不在本 change 内。

### D5. 分类姿势：Agent-owned，示例词只是导航线索

沿用 ACS-006 post-final 路由 aid 的既有先例：示例词不是分类 enum，Agent 拥有语义分类，混合/含混先最小澄清，不自动选路。若做成关键词 enum，修理入口会退化成第二个分类器权威，且把语义判断错误地交给规则。

### D6. 本 change 不动引擎

Change A 只做路由与文档契约。playbook 只引用既有合法操作（supersede / recover-* / apply / persist / inspect / audit）。seed 手工清理等权宜步骤按 §6.4 短期合法条件撰写（用户明示 + `_tmp/` 备份 + `log-event` 审计）并标注 interim + verb 候补；verb 落地是后续 change B–D。避免 scope creep 且保持 Simple Reliable Control 的最短合法闭环。

## Constitutional Review Notes

- **Abstraction as semantic precision**：新语义层 = "maintenance/repair intent family at entry"。读者：任意持 bundle + 修理意图的 Agent。有界问题：这是不是 repair 请求、该走哪条合法 surface。保留的区别：repair vs continuation vs research；诊断结论"没坏"与"有坏"；bundle preflight 与 intent 正交。停止点：canonical 节完成路由，playbook 给出一个下一动作（基线诊断）。不需要新状态/新字段——意图族是 Agent-facing 分类，不是 runtime fact。
- **Simple reliable control**：最短合法闭环 = 同 preflight → 基线三命令 → 引擎 verdicts → 合法修复 → 重跑同一 checkpoint；无新状态、无新 checkpoint、无新 CLI，复用 REL-001 回路。净简化 = 消除修理任务被误路由后的反复试错成本。One truth path：修理判定只读引擎 structured verdicts（audit closed outcomes / root_findings / hints），playbook 不立并行 prose verdict。不新增 blocking rule/state/validator——唯一新增是一份导航 playbook + 两个 spec requirement。
- **Helper-oriented**：用户拥有修理请求的 decision source（human-directed maintenance instruction）；Agent 执行合法机械修复并 rerun；Engine 裁决确定性 verdicts；无引擎路径 → 最小 blocker / `missing_contract` 停边界，不手写 authority；研究语义修正 → rerun（post-final recovery），不混入 repair。

## Risks / Trade-offs

- [playbook 措辞触发 ACS-003 静态校验（PHRASE_CLASSES 拒 Agent/operator、是否继续、advance-status 进入/加载 等）] → 起草时按 PHRASE_CLASSES 规避；task 4.1 跑 `command-contract-docs.test.mjs`；allowlist 只在必要时加且四要素齐全（默认不加）。
- [repair 入口退化成关键词分类器] → ACS-005/ACS-008 写死 Agent-owned 分类 + 最小澄清 + 不自动选路；示例词标注为导航线索。
- [seed 手工清理 reintroduce 带外改 authority] → playbook 只按 §6.4 短期合法条件写（用户明示 + 备份 + log-event 审计），标注 interim 与 verb 候补；prune verb 留 Change B。
- [MODIFIED ACS-005 在 archive 时丢细节] → delta 全量复制原文再扩展；archive 时 diff 检查。
- [scope creep 到引擎操作化] → Non-Goals + 独立 change B–D 显式切分。

## Migration Plan

纯文档 + 入口契约变更：git revert 即可回滚；发布前必须过 `openspec validate --strict`、`command-contract-docs.test.mjs` 回归与 governance 收尾双检查（check-project-reqs archive 模式 + check-project-specs）。archive 时同步 `openspec/governance/req-registry.yaml`（ACS-007/008 由预留 transition 为 live identity）。

## Open Questions

无阻塞项。引擎操作化候补（B–D）的设计细节属于各自 change，不改变本 change 的 specs/approach/task 分解。
