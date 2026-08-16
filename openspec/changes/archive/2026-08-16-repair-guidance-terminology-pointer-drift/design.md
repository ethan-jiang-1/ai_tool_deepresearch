# Design: repair-guidance-terminology-pointer-drift

## Context

本 change 是根/openspec guidance 面的纯文档修复（动机见 proposal.md - Why）。关键约束：

- guidance 面（`openspec/guidance/models/`、根 CONTEXT/README/AGENTS/CLAUDE）非权威：改措辞不改变 accepted behavior，但必须保持「指向 owner、不重述」纪律（RUE-006 pointer 纪律适用于根行为文件的路由段）。
- `openspec/guidance/models/framework-runtime-boundary.md` 已有 "Gate Boundary" 七行表（transition 表 / definition / engine / CLI wrapper / runtime status / attempt history / output snapshot），CONTEXT 承诺的「五面表」即缺「五面」命名与精确指向——修复 = 给既有表正名 + 修过期 label，不是新造概念。
- `req-registry.yaml` 提供 requirement 标题：RUE-004（sync）、RUE-005（trigger handoff）、ACS-001（command responsibility）、RRD-008（reentry diagnostics）。invariants-brief #8/#15 的 `(RUE-004)` 经序数映射核对为错引用（HITL1/HITL2 节奏文本在 RUE-005 块内）。
- 根 AGENTS/CLAUDE 必须保持配对同步；`tests/integration/deep-research-harness-entry-contract.test.mjs:101` 要求两者含 `current run bundle root`。
- C1 已更新 harness README 的 CLI 清单为「核心名 + 目录指针」；本 change 让 guidance 模型与之一致。

## Goals / Non-Goals

**Goals:** 接上 F-01 断指针、补 C-series glossary（F-06）、拆 repair_kind 双枚举（F-03 术语行）、对齐 CLI 清单（F-07 guidance 侧）、统一 req-ID 引用格式并更正错引用（F-08）、统一归档命名（F-09）、补 runtime coordinate 命名（F-12），全部由新集成测试锁定。

**Non-Goals:** 不改任何 spec 文本（skip_specs）；不动 harness 文件；F-08 的一致性 checker 与 F-11 其余 checker 属 C3；不改 RUN.md 决策表（C3）。

## Decisions

### D1: F-01 Gate 五面正名（framework-runtime-boundary.md + CONTEXT）

`framework-runtime-boundary.md` "## Gate Boundary" 节引言改为：

> Gate 一词有五面含义（transition 表 / definition JSON / engine / CLI wrapper / runtime status），另有 attempt history 与 output snapshot 两个辅助面。五面与辅助面如下，不得混用：

七行表内 label 修正：
- `Gate definition target` → `Gate definition JSON`（`schema/gate_definitions/` 已存在，属当前 surface）
- `Gate engine target` → `Gate engine`（保留「目标位置」语义：`engine/gates/` 尚不存在，诚实标注）
- `Gate CLI wrapper target` → `Gate CLI wrapper`（`cli/gates/check-gate-*.mjs` 当前 10 个，改当前状态）

`CONTEXT.md` Gate 行末尾改为：

> Gate 一词有五面含义，完整五面表见 `openspec/guidance/models/framework-runtime-boundary.md`「Gate Boundary」节。注意区分：工作单元恢复语境的「五反馈面」（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）是另一概念，owner 见 `DEEP_RESEARCH_HARNESS/RUN.md` 决策表。

备选（新造独立五面表）被否决：文件里已有七行表，新造会产生两份 Gate 面定义。

### D2: F-06 C-series glossary（CONTEXT 新增三行）

全仓库无单一展开定义，按 owner spec 用法归纳为 compact distinction，并如实标注归纳性质：

| Term | Compact distinction |
|---|---|
| **C2（checkpoint 代号）** | HITL1/rerun 的 freshness checkpoint，授权 `research_style_params` 写入；owner `openspec/specs/research/research-styles/spec.md` |
| **C3（pipeline 代号）** | post-final rerun 阶段既有的 mutation/gate pipeline（canonical topic mutation、style CLI、rerun_count 推进）；owner `openspec/specs/research/post-final-recovery/spec.md` |
| **C5（event/lineage 代号）** | Final 之后 evidence-expanding reentry 的 accepted event/lineage，post-final recovery 所有权与资格判定的依据；owner `openspec/specs/research/post-final-recovery/spec.md` + `openspec/specs/research/content-delivery-phase-content/spec.md` |

并加一行注释：C2/C3/C5 无单一展开定义，本表为按 owner spec 用法归纳，具体判定以 owner spec 为准。

### D3: F-03 repair_kind 双枚举拆分（CONTEXT）

原 `hints[] / repair_kind` 行拆为两行：

1. gate/phase 反馈面：`hints[]` 带一个直接 repair/owner 边界；`repair_kind` ∈ {`agent_action`, `engine_operation`, `user_decision`, `external_action`, `missing_contract`}；反馈形状以所属 accepted spec / model 为准。
2. work-unit 反馈面：五个反馈面（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）统一发出 `attempt_disposition` + `next`；`repair_kind` 为另一套枚举（如 `wait` / `recover-transaction` / `supersede` / `missing_contract` 等），完整词汇与 CLI 动词映射以 `DEEP_RESEARCH_HARNESS/RUN.md` 决策表 + `tests/engine/work-unit-recovery-decision-table.test.mjs` 为准。**与 gate/phase 面的 `repair_kind` 同名不同枚举。**

### D4: F-07 guidance 侧清单对齐（framework-runtime-boundary.md）

- "Current executable framework surfaces" 块（:82-97）的 cli/ 节改为：

```text
  cli/
    instantiate-run-bundle.mjs
    validate-bundle.mjs
    inspect-bundle.mjs
    operate-queue.mjs
    operate-work-unit.mjs
    enter-phase.mjs
    advance-status.mjs
    check-reentry.mjs
    audit-phase-status.mjs
    log-event.mjs
    gates/
      check-gate-*.mjs（当前 10 个）
```

并加一行注释：完整 CLI 清单以 `cli/` 目录为准（与 harness README 同一事实面）。

- "Workflow-foundation route map" 块（:99-125）的 cli/ 节删除过期四工具枚举，保留 `gates/check-gate-*.mjs` 形状行。
- 散文句 "Gate-specific wrappers target `DEEP_RESEARCH_HARNESS/cli/gates/`." → "Gate-specific wrappers live at `DEEP_RESEARCH_HARNESS/cli/gates/`（当前 10 个）。"

### D5: F-08 引用格式统一（invariants-brief.md）

格式：`→ 真相源：<path> requirement「<stable title>」（registry: <ID>）`——标题可在 spec 正文检索，ID 经 `req-registry.yaml` 解析，不再依赖 front-matter 序数。改动条目：

- #8：`（RUE-004）` → requirement「Entry trigger hands control to Agent-run Harness execution」（registry: RUE-005）——**更正错引用**（HITL1/HITL2 节奏文本在 RUE-005 块内，不在 RUE-004 sync 块内）。
- #15：同 #8 的 run-entry 引用改为 RUE-005 格式；agent-command-surface 引用改为 requirement「Agent-facing command responsibility distinguishes autonomous execution, HITL/out-of-band human direction, legal repair, permission, and Engine authority」（registry: ACS-001）。
- #13：`（RRD-008）` → requirement「Reentry diagnostics summarize incident-shaped recovery truth」（registry: RRD-008）。
- 维护规则节补一行引用格式约定说明。

### D6: F-09 归档命名统一（根 README/AGENTS/CLAUDE）

三处统一为同一 canonical 表述：

> `_old_topics` 归档（位于 `_backlog/_done/`，含 `_original_*` 子目录）除非显式要求否则不读。

- 根 AGENTS.md Hard Rules 原句「Do not read `_old_topics` archives unless explicitly asked.」改为上述表述。
- 根 CLAUDE.md 同步。
- 根 README "Rules In One Screen" 原句「`_original_*` directories are archives; read them only when explicitly requested.」改为上述表述。

### D7: F-12 runtime coordinate 命名（根 AGENTS/CLAUDE）

Deep Research Routing 段末尾追加一句（pointer 纪律兼容：只点名坐标、不重述选择流程）：

> A verified bundle candidate directory resolves to the operation's canonical absolute current run bundle root; bare runtime paths always resolve under that root.

两份同步。转绿 `deep-research-harness-entry-contract.test.mjs` 的 `/current run bundle root/i` 断言。

### D8: 验证方式

新增 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`：静态断言 D1-D7 各 canonical 短语存在、过期表述移除（旧四工具封闭清单、`Gate CLI wrapper target` 措辞、`(RUE-004)` 错引用）。不断言整段文本。integration 分类（跨文件确定性事实、真实仓库文件、无网络/Agent）。

## Risks / Trade-offs

- [五面表正名反而制造「第三个 Gate 面清单」] → 只改既有七行表的引言与 label，不新造表；CONTEXT 指向该节。
- [C-series 归纳不准确误导 Final 判断] → 明确标注「按 owner spec 用法归纳」，判定以 owner spec 为准；glossary 只做术语对齐（CONTEXT 的既定角色）。
- [repair_kind 双枚举行与 C3 后续改动冲突] → work-unit 行只举例如上「等」并指向 RUN.md 决策表为唯一 owner，C3 改表后本行无需再动。
- [RUE-004→RUE-005 更正是否成立] → 已按 front-matter 序数 + registry 双向核对（正文第 4 个 requirement = RUE-005）；apply 时再跑一次 grep 复核。
- [根行为文件改动破坏配对同步/pointer 纪律] → 两份同步改；新增句只点名坐标；apply 时跑 pair-sync guard 与 entry-contract 测试。
