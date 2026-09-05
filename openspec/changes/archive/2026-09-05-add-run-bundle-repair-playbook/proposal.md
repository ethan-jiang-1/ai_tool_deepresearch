# Add Run-Bundle Repair Playbook

## Why

run bundle 的 rerun/修复链路非常复杂（wave0→wave1→wave2→hitl2→readiness→final，每层 gate 有独立 closeout 契约：reference materialize、depth-review、seed projection 回填、finding-index 维护等）。一旦出现"已提交产物被改写 / 残留 blocker / gate 契约不满足"，Agent 需要大量试错（2026-09 rerun 实战沉淀：supersede 机制、canonical 文件名 digest、macOS 大小写、supplementary 契约、seed upsert 局限等坑，见 `_backlog/plans/run-bundle-repair-experience-playbook.md`）。

契约缺口（文本事实）：`command_playbook/continue-run-bundle.md` 的 Entry Selection (canonical) 只定义了 **continuation 与 inspection** 两个 intent 族；supplied bundle + 修理意图（修好 / 恢复 / 卡住 / 残留 / 为什么 gate 不过）在 canonical 契约中**未定义**，修理任务因此被硬塞进续跑/研究流程，按研究姿势反复碰壁。项目里"run 内修理"（gate fail → structured hint → legal repair → 重跑同一 checkpoint）已是引擎一等公民，缺的只是**带外修理（out-of-band maintenance）的入口路由**。

设计定稿见 `_backlog/plans/run-bundle-repair-experience-playbook.md` §6（2026-09-05 二次审议）：修理入口 = **诊断优先**，不是第二条研究流程；与主线共享同一引擎回路（内在逻辑一致）；两个硬约束——**泛化**（框架级通用能力，不为单个 bundle 打补丁）与变更流程契约（propose → polish → apply → archive → commit）。

## What Changes

- **修改** `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`：Entry Selection (canonical) 的 intent 族扩为 continuation / inspection / **maintenance-repair**。修理意图走**同一 same-root preflight**（`BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`）与**同一 `unsupported_current_entry_contract` 停边界**（不新增 stop 名）；preflight 通过后路由到 `command_playbook/repair-run-bundle.md`，而不是研究/续跑流程。分类措辞标注为导航线索：Agent 拥有语义分类，混合/含混先最小澄清，不自动选路。
- **新增** `DEEP_RESEARCH_HARNESS/command_playbook/repair-run-bundle.md`：诊断优先的修理入口 playbook——定位 bundle → 基线三命令（`audit-phase-status` / `validate-bundle` / `inspect-bundle`）→ 消费引擎 structured verdicts（audit closed outcomes / `check-reentry.root_findings[]` / wave inspect `hints[]`）→ 合法修复操作（supersede / recover-* / apply / persist 等既有命令）→ 重跑同一 checkpoint；诊断合法结论包含"没坏 → 落回 continuation"。**导航自包含**（bundle 坐标、命令全参、流程序、边界规则），契约细节（packet 模板、canonical 文件名、supplementary receipt set 等）**引用** `COMMANDS.md` Copyable Contract Templates 与 owner spec，不复制第二真相源。**泛化**：对任意 `dpt_rb_*` / 任意 wave / 任意未来破损类别成立；场景映射以引擎 structured verdicts（`rule_id` / `repair_kind` / `write_to` / `near_matches`）为坐标，示例 bundle 的具体坐标仅为占位。
- **修改** `DEEP_RESEARCH_HARNESS/COMMANDS.md`：新增 Run-Bundle Repair 节（登记 repair playbook 行 + repair 意图路由 aid，navigation only，与 post-final 迭代路由 aid 同姿态）。
- **修改** 根 `AGENTS.md`：§0 Execution Brief 入口表加"修 bundle / 数据修复 / gate 修复 / 残留清理"一行（指向 repair playbook）；Deep Research Routing 节补 repair 入口指针。
- **边界**：不新增任何 stop 名；不改变任何 Engine schema/verdict/transition/CLI 行为；不改变 run 内修理循环；不触碰任何 run bundle 状态；引擎操作化候补（seed prune、reference locator、binding 投影、digest 对账等）是后续独立 change（§6.5 B–D），不在本 change 内。

## Capabilities

### Modified Capabilities

- `agent/agent-command-surface`：MODIFIED ACS-005（Entry Selection (canonical) 扩 maintenance/repair intent 族，同 preflight、同停边界）+ ADDED ACS-007（repair playbook 契约：诊断优先、边界、泛化、导航自包含）、ACS-008（命令索引 repair 路由 aid，navigation only）。

（本 change 不是 `skip_specs`：入口契约扩展与路由 aid 是 Agent-facing 行为契约，必须有 delta spec。）

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| agent/agent-command-surface | `openspec/specs/agent/agent-command-surface/spec.md`（ACS-005 唯一 continuation playbook 契约；ACS-006 post-final 路由 aid 先例） | Modify | Entry Selection canonical 由 ACS-005 背书；repair intent 族是该契约的扩展；repair 路由 aid 是 ACS-006 的兄弟形态。复用同一 audience/marker/校验面，不另立 capability |
| workflow/repair-loop | `openspec/specs/workflow/repair-loop/spec.md`（REL-001） | Excluded | REL 是 harness 级 run 内修理循环；本 change 只落地带外修理的入口路由与 playbook，不触碰 repair-loop 行为 |
| agent/agent-context-routing | `openspec/specs/agent/agent-context-routing/spec.md` | Verify-only | 入口行新增不改变 context routing 的 Engine 判定；verification 只需确认新入口文档存在 |
| workflow/playbook-runner | `openspec/governance/req-registry.yaml`（PLR） | Excluded | 只新增一份 playbook 文档，不新增执行器行为 |

## Impact

- **文件新增**：`DEEP_RESEARCH_HARNESS/command_playbook/repair-run-bundle.md`
- **文件修改**：`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`、`DEEP_RESEARCH_HARNESS/COMMANDS.md`、根 `AGENTS.md`
- **回归**：`tests/engine/command-contract-docs.test.mjs` 动态扫描 `command_playbook/*.md`，新 playbook 自动进入扫描面，措辞必须通过 PHRASE_CLASSES（默认不新增 allowlist）
- **内容来源**：`_backlog/plans/run-bundle-repair-experience-playbook.md`（2026-09 rerun 实战沉淀 + §6 设计定稿），迁移为正式 command_playbook；历史沉淀保留在 `_backlog/`
- **不触碰**：`DEEP_RESEARCH_HARNESS/engine/`、`schema/`、`cli/` 任何确定性行为；不触碰任何 run bundle authority 文件
