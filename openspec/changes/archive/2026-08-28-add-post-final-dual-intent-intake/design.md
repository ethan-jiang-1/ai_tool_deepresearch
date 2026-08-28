# Design — add-post-final-dual-intent-intake

## Context

见 `proposal.md` Why。当前两个目标文件（`DEEP_RESEARCH_HARNESS/COMMANDS.md`、`DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`）的机械链路完整（POF-001..004、CDP-003/004、ACS-001..005），缺的只是意图→路由的可发现性与 dig-list 的 intake 指引。本 change 是纯 Agent-facing Markdown 指引增补，无代码、无 schema、无 Engine 变更。

宪法三 companion 应用记录（本 change 实际新增的层只有「Agent-facing 指引文本」一层，Engine/schema/状态机层未改变，不适用）：

- **语义边界（abstraction-semantic-precision）**：读者 = 在 Final 收到用户迭代请求的 Agent；有界问题 = 「这族措辞走哪条既有合法路由；有 `_diagnostics/` next-dig-list 时 scope 如何结构化成形」。必须保留的区别：dig-list 是 non-authority 选题输入（不是 scope/coverage authority）；证据扩展 vs presentation 的分类仍是 Agent 语义判断（POF-001 既有边界）。正常推理停止点：路由选定、scope 经用户修正后，既有 POF/CDP 契约接管，指引不再延伸。
- **direct Source of Record / 最短合法闭环（simple-reliable-control）**：两类路由的 SoR 仍是既有 accepted spec（ACS/POF/CDP）与 CLI；新增文本只是导航投影，不建第二真相源。最短合法闭环：Agent 读映射 →（有清单时）按层提 scope → 用户一次修正 → 既有 retained request → `apply`。net simplification：零新增状态/检查器/恢复路径，删除的是每 session 的路径翻找与 scope 即兴压缩成本。
- **helper-oriented responsibility**：用户拥有 scope/risk 决定（修正提议、重开死坑）；Agent 拥有读清单、提 scope、全部机械步；Engine 不新增裁决（继续只验证既有 request 形状/lineage）。

## Goals / Non-Goals

**Goals:**

- ACS-006：`COMMANDS.md` 的 Post-Final 索引区出现一个两族意图→既有路由的映射（含混合请求指向既有最小澄清规则）。
- POF-005：`post-final-recovery.md` 出现 "Intake from a dig list" 小节（读最新清单 → 按层提 scope → 用户修正 → 条目 id 写进现有字段 → 死坑默认排除）。
- 新增文本满足 ACS-003 静态校验面的既有契约（drift-phrase 禁令、可复制命令全前缀）。

**Non-Goals:**

- 不改 BUNDLE_ENTRY/BUNDLE_MAP 模板（plan C2）、不立 dig-list 命名/死坑节/Evidence-Map 成文约定（plan C3）、不加 final/README 同步义务（CDP 已拥有，属执行缺口）。
- 不加 request schema 字段、label parser、Engine/CLI/gate/测试行为变更。
- 不验证 Agent 实际行为改善（那是 plan §6 验收在下一个真实 rerun 周期做的事，不在本 change 的 proof 边界内）。

## Decisions

### D1. 映射放进 COMMANDS.md 的「Post-Final Rerun Recovery」节内，不新增顶层节

备选：新增独立「Post-Final 意图路由」顶层节。否决理由：COMMANDS.md 结构由 ACS-001（受众声明在表前）+ 现有分区约定约束，Post-Final 主题已有归属区；就地扩一节最小扰动、可发现性等价（Agent 从工具名行或意图映射任一入口都到达同一 playbook）。映射为纯文字 + 指针，不复制命令行（避免与 ACS-003 copyability 检查面不必要的交互）。

### D2. intake 小节放在 post-final-recovery.md 的 §2（Retain Request）之前，作为 §1.5 编号节

备选：并入 §2 或放 §1（Inspect）前。否决理由：intake 语义上发生在 inspect 之后、request 起草之前（先知道 eligible 与 bindings，再读清单成形 scope）；给独立编号便于 tasks 引用与后续校验定位。小节文本复用 POF-004 既有的两段式 reason 标签语境，明确「条目 id 写进现有 `requested_scope`/`reason` 字符串」，并显式声明 non-authority 与「无清单时契约不变」。

### D3. 意图措辞族用示例词列表（非穷举、非 enum）

映射里的措辞族（「再挖一轮/继续挖/rerun」vs「整理/重写/自包含版/换个读者版」）是导航示例，不是分类 enum；规格文本已用 for-example 语义限定。备选：正式措辞分类表。否决理由：会把 Agent 语义分类（POF-001 边界）伪形式化，诱发「按词路由」的错误自动化，违反 ACS-006 的 navigation-only 约束。

### D4. 验证策略：doc-lock 断言 + 既有 ACS-003 回归面（apply 期修正）

原案「不新增断言」在 apply 期被 governance 修正：`check-verification-routing` 要求 change 持有 `verification-plan.yaml` 且 selected class 至少一个 claim，纯「既有回归不红」无法承载 ACS-006/POF-005 的内容存在性主张。修正为新增一个静态 doc-lock 测试 `tests/engine/post-final-intent-intake-docs.test.mjs`（unit 边界、fixture: none、纯静态读文件），断言两处新增文本的存在与关键短语；ACS-003 既有回归继续作为「编辑不破坏既有契约」的第三 claim。不新建 checker 脚本、不加 marker 到 ACS-003 的 ALLOWLIST。

## Risks / Trade-offs

- [映射文本被读成自动路由规则] → 规格与文本都显式写「混合/含混请求先按既有 Agent-owned 分类边界 + 最小澄清」；ACS-006 场景 3 锁定不自动选路。
- [示例措辞随时间过时/不覆盖新说法] → 措辞族标注为示例；分类权威仍在 POF-001 语义边界，示例不承担分类义务。
- [intake 小节诱导把 dig-list 当 coverage/scope authority] → POF-005 场景 4 + 小节文本双重声明 non-authority；Engine 不解析清单。
- [死坑误判（清单声明过时）] → 死坑默认排除但显式用户决定可重开（POF-005 场景 2），语义决定留给用户。
- [静态校验面误伤新增文本] → 已预审 `tests/engine/command-contract-docs.test.mjs`（@impl ACS-003）的 7 个 PHRASE_CLASSES 与 ALLOWLIST：新增文本避开 `Agent/operator`、`是否继续`/`continue?`、`progress report/进度汇报`、`advance-status`+进入/加载/执行同现、`enter-phase`+complete-target 同现等模式（映射示例措辞「继续挖/再挖一轮」不命中 `是否继续` 正则）；apply 后跑该回归确认零新失败，失败即回改文本而非改 checker。

## Migration Plan

单方向文档增补，无迁移/回滚复杂度：apply = 编辑两文件 + registry 直注册 ACS-006/POF-005（既有 live capability 新增 ID，走 registry 直注册，不用 reservation 文件——SUD-008 先例）。回滚 = revert 两个文档 commit + registry 行。

## Open Questions

（无——两个 spec delta 的行为边界均由既有契约决定，无会改变 specs/approach/tasks 的可延迟未知。）
