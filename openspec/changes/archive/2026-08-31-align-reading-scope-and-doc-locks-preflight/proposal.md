# Proposal: align-reading-scope-and-doc-locks-preflight

## Why

两处 agent-facing 指令面存在已确认的措辞/指令缺口（来源：`_backlog/plans/test-signal-and-guidance-wording-hygiene.md` C2；2026-08-31 coding-agent 可读性评估会话，用户确认摩擦点 #5a 与 #4 便宜变体；语义已由用户拍板）：

1. **Do-Not-Read 范围张力**：根 `AGENTS.md` 与 `README.md` 写 "`.exp-bundles/`, including lowercase `dpt_rb_*/` run-bundle directories"，而 `DEEP_RESEARCH_HARNESS/README.md`「Run Bundle 外形」明确 production run bundle 位于 repo root（根目录实际存在 4 个 `dpt_rb_*`，gitignored、~1.2 万文件）。严格读 Do-Not-Read 只覆盖 `.exp-bundles/` 之下，coding agent 做全仓扫描时会把根目录 run bundle 当任务上下文计入（评估会话实测发生），既产生噪音又有误读运行时事实的风险。
2. **doc-locks preflight 是隐性流程**：`tests/README.md` 已有"reword governed document 前先跑 `node scripts/list-doc-locks.mjs`"的纪律，但它只是测试层文档建议，不在 OpenSpec apply-phase 指令（`openspec/config.yaml` `operations.apply.guidance`）里——每次改 governed doc 都靠 agent 自己记得，漏掉就只能在 archive gate 发现红锁。

## What Changes

- 根 `AGENTS.md` 与 `README.md` 的 Do-Not-Read 列表对应行改写为：`.exp-bundles/` **以及仓库任意位置**的小写 `dpt_rb_*/` / `dpt_disp_*/` run-bundle 目录都不得作为 task context 读取；"用户显式指名具体路径"的既有豁免条款原文保留（与 entry selection 的 "explicitly supplied" 语义一致）。两文件使用同一句英文措辞。
- `openspec/config.yaml` `operations.apply.guidance` 追加一条 doc-locks preflight 指令：change 若修改任何 governed document，首次 target edit 前运行 `node scripts/list-doc-locks.mjs <repo-relative-doc-path>`，受影响锁在同一 change 内更新；并声明该 guidance 不是审查完成或归档许可。

### 不产出（防 scope creep）

- 不新增 governance checker、不新增任何确定性检查（#4 的 checker 版是 plan 明确非目标）。
- 不改 `list-doc-locks.mjs` 脚本本身。
- 不动 `DEEP_RESEARCH_HARNESS/` 与任何 main spec；不改变 entry selection 语义（豁免条款原文保留）。
- 不改 `.gitignore`、不动 run bundle 数据。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——本 change 无 spec-level 行为变更，故 `.openspec.yaml` 声明 `skip_specs: true`；delta-spec 不适用的原因：全部产出为 entry-guidance 措辞改写与 lifecycle 指令行追加，不新增、不修改、不移除任何 accepted requirement 的 observable behavior；Do-Not-Read 措辞与 doc-locks 纪律均无 spec owner（2026-08-31 grep `openspec/specs/` 实测）。）

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md` 4 条 requirement（glossary 边界 / entry routes / ADR / routing regression-protected） | Excluded | 该 capability 拥有 CONTEXT.md 词汇路由纪律；Do-Not-Read 阅读范围措辞不被其任何 requirement 覆盖，本 change 不改其 requirement 文本 |
| `governance/change-feedback-loop` | `openspec/specs/governance/change-feedback-loop/spec.md` 4 条 requirement + `tests/integration/governance/change-feedback-finalizer.test.mjs`（apply guidance 按前缀查找断言、不锁条目数） | Verify-only | 本 change 在其 apply-guidance 交付机制内追加一条内容，requirement 文本零变更；以 change-feedback-finalizer 套件全绿作 verify 证据，无需 delta |
| `verification/verification-routing` | `tests/integration/md/verification-routing-knowledge-surfaces.test.mjs`（AGENTS/README/config.yaml 为 POINTER_SURFACES，断言 verification-routing 指针 + 四分类词在场） | Excluded | 三处编辑均为增量/改写非指针行，断言保持满足；不改变测试分类或 proof permission |
| `governance/requirement-traceability` | grep `openspec/specs/` 无 list-doc-locks/doc-lock owner（2026-08-31 实测） | Excluded | doc-locks 纪律无 spec owner；本 change 不新增 requirement |

## Source of Record 与责任边界

- **Direct Source of Record**：Do-Not-Read 措辞的 owner 是根 `AGENTS.md` / `README.md`（entry guidance，无 spec owner，两文件同句保持一致）；`CLAUDE.md` 是 `AGENTS.md` 的 symlink，自动一致。doc-locks preflight 指令的 owner 是 `openspec/config.yaml` `operations.apply.guidance`；可删产物/锁清单的事实仍归 `scripts/list-doc-locks.mjs` 与 `.gitignore` 现有 owner，不另立第二清单。
- **最短合法闭环**：reword governed doc → 跑 `list-doc-locks` → 同 change 内更新锁；两个落点都是一行级编辑，无新 checker、无新状态、无第二 verdict。
- **Net simplification**：删除一条范围歧义（run bundle 算不算任务上下文）并把一条隐性纪律升格为 apply-phase 显式指令；不新增控制层。
- **责任边界**：两处编辑都是给 Agent 的操作指引；preflight 是 Agent 的普通 mechanical work；Engine 不解读 guidance 语义；不创设权限、checkpoint 或 lifecycle 状态。
- **Semantic-precision reflection（改写 reader-facing 措辞）**：读者的有界问题 = "这条路径能不能当任务上下文读"；必须保留的区别 = run bundle（runtime truth，永非任务上下文）vs 用户显式指名的具体路径（豁免）；正常推理停止点 = 列表行语义自足，无需读者再去比对 `.exp-bundles/` 与 repo root 的位置关系。

## Impact

- 受影响文件：`AGENTS.md`、`README.md`、`openspec/config.yaml`（各一处小编辑）。
- 锁面：`verification-routing-knowledge-surfaces`（指针断言保持满足）、`run-contract-surfaces-doc-lock`（AGENTS/CLAUDE 硬规则行不碰）、`change-feedback-finalizer`（前缀/片段断言兼容新增行）。
- 不影响 `DEEP_RESEARCH_HARNESS/`、CLI/schema/engine 契约与任何 run bundle 数据；`config.yaml` 被 openspec CLI 解析，YAML 合法性由 validate 与全量套件兜底。
