# Proposal: restructure-control-surface-prose-walls

## Why

控制面两份 entry 文档的决策最密段落是 460–1463 chars 的单段散文墙（`_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §2，2026-08-31 复核实测：`RUN.md` L34=1114 / L36=953 / L40=954 / L55=730；`COMMANDS.md` L17=1463 / L33=659 / L11=460）。单段内压 4–6 条规则 + 多个否定式边界，对 Agent 读者的部分遵从概率随段落长度上升，且这些段落恰是 authority 边界最密处——密度直接转化为正确性风险。承接该 plan C2 finding：在**语义零变化**约束下做结构化重构（表格化/原子化 + canonical home 指针化）。

## What Changes

全部为 `DEEP_RESEARCH_HARNESS/RUN.md` 与 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 的 markdown 结构校准。零 `.mjs` / schema / gate definition / 枚举 / CLI 动词 / 退出码改动。

- 七个首批目标段落（各为单行）重构为「原子规则表」：每条规则一行的表格（触发/主题 | 规则 | Owner canonical home），保留全部精确 token（枚举值、命令拼写、文件坐标原样保留在规则单元内）。
- **canonical home 纪律**：每条原子规则标注 owner；owner 在 accepted spec / executable contract 的规则，降为「owner 指针 + 一行摘要」，消除第二真相源。apply 时逐条 grep owner spec 验证归属后才允许降级；无法验证归属的规则一律原样保留在本文件。
- 明确**不做**：不改任何语义、不合并语义、不新增语义、不改任何 closed enum；不改 L40/L55 下方 test-locked 决策表（L42–53）；次级段落（`RUN.md` L57/L59、`COMMANDS.md` L13/L15/L19，290–500 chars）按 plan 明示留待下一轮。
- **行数预算的诚实口径**：plan 的「净 ≤ 0」与「单行段落表格化」存在数学张力（7 个单行 → ≥7 个表块必然增行）。本 change 以语义保持与 token 全保留为第一不变量，行数差如实测量并在 closeout 呈报；不为凑预算删除任何规则内容。

无 **BREAKING**：无行为面变化；两文档的读者契约（决策所需规则 + owner 指针）保持完整。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无——本 change 为纯文档结构重构，不改任何 requirement；`.openspec.yaml` 声明 `skip_specs: true`。delta-spec 不适用的原因：七个段落均为 guidance/entry 投影面（RUN.md=run-entry 文档面、COMMANDS.md=command-surface 文档面），其行为 authority 在各自 owner spec 且本 change 不触碰这些 spec 的任何 requirement；重构不产生新的 observable behavior。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | catalog 行（RUN.md current-entry contract、aligned Agent files） | Verify-only | RUN.md 是该 capability 的文档投影面；重构不改变 entry 契约与任何 requirement |
| `agent/agent-command-surface` | catalog 行（Agent-facing command responsibility；COMMANDS.md 文档面） | Verify-only | COMMANDS.md 段落是其投影；重构保持命令责任边界措辞的 token 不变 |
| `agent/hitl-ux` | catalog 行（HITL conversational alignment） | Verify-only | HITL1/HITL2 语义的 canonical home；RUN/COMMANDS 中相应规则降级为其指针 |
| `workflow/silent-wave-execution` | catalog 行（用户缺席自律、escalation） | Verify-only | 静默自主推进与用户主动消息边界的 canonical home |
| `agent/delegated-work-units` | catalog 行（production delegated path、submit transaction） | Verify-only | work-unit 路径/submit 语义 canonical home |
| `engine/check-inspect-feedback` | catalog 行 + `spec.md`（CHI-004 决策表锁定） | Verify-only | attempt_disposition/next 形状与决策表的 authority；RUN.md L40/L55 是其投影 |
| `research/post-final-recovery` | catalog 行（post-Final rerun handoff） | Verify-only | `post_final_rerun` recovery 语义 canonical home |
| `verification/verification-routing` | accepted 四类 taxonomy | Verify-only | 选定证据全部落在既有 test 资产与 governance checker |
| `engine/gate-state-machine` | catalog 行（gate 状态转换语义） | Excluded | 不触及 gate 判定、转换与枚举语义 |

## Impact

- 修改：`DEEP_RESEARCH_HARNESS/RUN.md`（4 个段落块）、`DEEP_RESEARCH_HARNESS/COMMANDS.md`（3 个段落块）。
- 新增 owner 指针引用的 spec 路径均为既有文件（content-drift / pointer-targets checker 会机器校验可解析性）。
- 无依赖、无引擎、无测试行为变化；既有锁定测试（`tests/engine/work-unit-recovery-decision-table.test.mjs` 等）必须零改动全绿。

## 简化与责任边界

- **Direct Source of Record**：每条原子规则的 truth 归位其 canonical home（accepted spec / executable contract）；RUN.md/COMMANDS.md 只保留「决策所需最小规则 + owner 指针」，删除散文墙这份重复表述。
- **Net simplification**：7 段高密度散文（≈6.3k chars 单行）收敛为原子规则表 + owner 指针；规则的第二真相表述被指针替代。行数差如实测量呈报（见 What Changes 的诚实口径）。
- **Semantic-precision reflection**：不新增 state/概念。读者（run 中的 Phase Agent / 查命令的 Agent）的有界问题不变：「此刻这条边界规则是什么、谁拥有它」；必须保留的区别：**本文件保留的决策最小规则** vs **owner spec 拥有的完整语义**——表格 Owner 列即这条界线；正常推理停止点：读到规则行即可行动，需要完整语义时按 Owner 列下钻。
- **责任边界**：用户决策点（HITL、scope/risk）措辞不变；Agent 执行边界措辞不变；Engine verdict/authority 零触碰。重构是 Agent 的 authorized mechanical repair（reversible、纯 markdown）。
