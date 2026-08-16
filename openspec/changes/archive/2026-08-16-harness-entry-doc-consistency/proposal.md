# Proposal: harness-entry-doc-consistency

## Why

2026-08-16 的 coding-agent 视角审计（来源：`_backlog/plans/agent-guidance-conflict-drift-findings.md`，本 change 承接其 F-02/F-04/F-05/F-07/F-10）发现 `DEEP_RESEARCH_HARNESS/` 的 Agent-facing 文档存在五处与 accepted spec 或目录现实不一致的表述：name collision 三处文档三种说法、phase §6 未显式标注 WNC-010 的 bootstrap 例外、RUN.md「读到即选定」对非研究性阅读过度声明、「当前可执行 surface」清单严重过期、harness AGENTS/CLAUDE 入口指针存在分号歧义。执行 Agent 会在这些点上拿错信息（冲突指令、缺失步骤、过期能力边界、误触发的入口选择）。本 change 只修文档措辞使其与 accepted contract 对齐，不改变任何 Engine/CLI/gate 行为。

## What Changes

- `DEEP_RESEARCH_HARNESS/README.md`：collision 段落改为与 `openspec/specs/research/pre-research-phase-content/spec.md`（hex6 静默重试）一致的表述，删除「必须报错停止」「collision suffix 非当前行为」冲突句；「当前可执行 surface」清单改为核心工具名 + 「以 `cli/` 目录为准」指针；`cli/gates/`（当前 10 个 wrapper）从 workflow-foundation 节移入当前 surface 节并标注当前状态。
- `DEEP_RESEARCH_HARNESS/RUN.md`：§0 增加非研究性阅读 carve-out——Agent 主动的代码探索/上下文阅读不构成 entry 选择、不授权开始研究 flow（规范面为 RUE-002 MODIFIED）。
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-instantiation.md` 与 `phase-hitl1.md`：§6 显式标注 instantiation/HITL1 bootstrap 兼容例外（引 WNC-010），不静默补 enter-phase、不与其余 phase 的 §6 模式冲突。
- `DEEP_RESEARCH_HARNESS/command_playbook/start-research.md`：collision 措辞对齐 hex6 故事；「每个 phase node 是完整 instruction sheet」句补 bootstrap 例外说明。
- `DEEP_RESEARCH_HARNESS/AGENTS.md` 与 `CLAUDE.md`：入口选择指针 bullet 消除分号歧义（preflight 失败 ≠ 无 explicit candidate，禁 fallback 到 RUN.md），两份同步。
- 新增 `tests/integration/md/harness-entry-doc-consistency.test.mjs`：静态断言锁定上述新 canonical 表述与过期句移除。

无 **BREAKING** 变更。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `bundle/run-entry`: RUE-002「Entry point instructs agents not to use built-in research shortcuts」补充 selected-entry reading 与 proactive context reading 的区分（对应 F-05）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md:34-55`（RUE-002 块）、`req-registry.yaml:366` | Modify | F-05 的规范面：RUN.md §0 的「读到即选定」需要区分两种 reading，requirement 表述随之更新 |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md:196-208` | Verify-only | 已区分 human trigger 与 Agent 执行；carve-out 与之兼容，无 requirement 变化 |
| `research/pre-research-phase-content` | `spec.md:270`（hex6 派生行为） | Verify-only | spec 已锁 hex6 行为且与 phase 文档一致；本 change 只修 README 对齐，不改 spec |
| `bundle/cmd-bundle-instantiation` | `spec.md:17`（已存在目录场景） | Verify-only | CLI 报错行为不变 |
| `workflow/workflow-node-contract` | `spec.md:275-292`（WNC-010 + bootstrap 例外） | Verify-only | 例外已声明；文档显式标注即可，不改 spec |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md:71-77` | Verify-only | 新增一个 integration 静态断言测试，分类遵循现有 spec，无分类变更 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md`（CHI-004 归属） | Excluded | F-03 反馈词汇契约属后续 C3 change，不在本 change 范围 |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md`（CHI-004 归属） | Excluded | F-03 反馈词汇契约属后续 C3 change，不在本 change 范围 |

## Impact

- 修改文件：`DEEP_RESEARCH_HARNESS/README.md`、`RUN.md`、`AGENTS.md`、`CLAUDE.md`、`command_playbook/start-research.md`、`workflows/nodes/phases/phase-instantiation.md`、`phase-hitl1.md`；新增 `tests/integration/md/harness-entry-doc-consistency.test.mjs`；delta spec 在 `openspec/changes/harness-entry-doc-consistency/specs/bundle/run-entry/spec.md`。
- 无依赖、API、CLI、schema、Engine、gate 变更。

## 简化与责任边界

- **Direct Source of Record**：collision 行为以 `research/pre-research-phase-content` spec 为 owner；phase handoff 以 WNC-010 为 owner；入口选择以 `continue-run-bundle.md` canonical 节为 owner。本 change 只让文档指向 owner，不新增第二份重述。
- **Net simplification**：删除互相矛盾的表述（README collision 句）、删除过期清单枚举（改为目录指针）、消除一处分号歧义；不新增任何 state/概念/checkpoint。
- **Semantic-precision reflection**：不新增具名 state/概念；仅把「读到 RUN.md 即选定」sharp 成既有区分——selected-entry reading vs proactive context reading。读者（执行 Agent）的有界问题：「当前这次阅读是否构成 entry 选择」；必须保留的区别：用户研究意图/用户提供 entry 二者之一成立才选定，Agent 主动上下文阅读不选定；正常推理停止点：区分成立后按各自分支行动，不引入第三种状态。
- **责任边界**：全部改动为 guidance 文档措辞；用户决定（HITL1/HITL2 仍是唯一交互 checkpoint）不变；Agent 执行边界不变；Engine verdict 不变。
