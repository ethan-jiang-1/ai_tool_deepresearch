# Current-Contract Signal Cleanup: Change Cards

本目录是 [`../current-contract-signal-cleanup.md`](../current-contract-signal-cleanup.md) 的解释层。总计划回答“按什么顺序推进”；本目录回答“这一项实际改什么、影响谁、哪里会出事、什么证据不足时不能动”。

它不是 OpenSpec change，也不授权 target edit。每张卡片在对应 change `proposal.md` 创建后，必须把已确认的结论转入该 change 的 proposal/design/tasks；这里保留跨 change 的审计判断和推进记录。

## 读法

| 字段 | 含义 |
|---|---|
| 状态 | `ready to propose`、`needs decision`、`blocked by evidence` 或 `deferred`；不是 implementation status。 |
| 风险 | 对当前可执行行为的删除风险，不是文件大小。 |
| 影响面 | 会受影响的 Engine/CLI、Agent guidance、run artifact、tests 和 accepted specs。 |
| Go / No-go | proposal 前必须满足的证据门；任何一项 No-go 都不能进入 Apply。 |
| 保留项 | 容易被“版本/兼容”关键词误伤的当前语义。 |

## 风险标尺

| 等级 | 含义 | 进入 Apply 的最低条件 |
|---|---|---|
| L1 | 文档、catalog 或无运行时 consumer 的死面 | current-surface scan + focused doc/spec validation |
| L2 | 单一 writer/reader 或 entry path | current writer/reader mapping + rejection boundary test |
| L3 | 多个 CLI/guidance/fixture 共同使用的 artifact contract | producer-reader-call graph + current-path characterization tests |
| L4 | 状态、恢复、provenance、并发或 retained artifact reader | 分阶段证明 + current recovery/e2e coverage + 明确人为决策 |

## 卡片索引

| ID | 候选 OpenSpec change | 当前判断 | 风险 | 解释卡 |
|---|---|---|---|---|
| C1 | `retire-inactive-contract-surfaces` | 应拆成“安全 tombstone 清理”与“仍有活跃实验 consumer 的 gate utilities”两个判断 | L1-L3 | [C1](changes/C1-retire-inactive-contract-surfaces.md) |
| C2 | `remove-internal-versioning-and-slim-entry` | C2a/C2b/C2c 均已 governed-archived；下一项是 C3 的单项 policy decision | L2-L3 | [C2](changes/C2-remove-internal-versioning-and-slim-entry.md) |
| C3 | `drop-legacy-bundle-entry-compatibility` | current guidance/CLI 仍显式接受旧入口；唯一未决点是 old-only bundle 的 inspect policy | L3 | [C3](changes/C3-drop-legacy-bundle-entry-compatibility.md) |
| C4 | `drop-legacy-profile-and-topic-compatibility` | C4a profile access 为 L3；C4b 仅指 LegacyPlan migration，`previous_layouts` 是 current lineage，必须保留 | L3-L4 | [C4](changes/C4-drop-legacy-profile-and-topic-compatibility.md) |
| C5 | `drop-legacy-reference-and-experiment-formats` | C5a 先改 current authoring 为 UID-only，再决定 historic reader；C5b 是 retained-history selection policy | L3-L4 | [C5](changes/C5-drop-legacy-reference-and-experiment-formats.md) |
| C6 | `drop-legacy-work-unit-contracts` | 当前 accepted contract 明确保留 legacy read-only branch；最高风险，尚不能假定删除 | L4 | [C6](changes/C6-drop-legacy-work-unit-contracts.md) |
| C7 | `rewrite-main-specs-as-current-state` | 需要在运行面收敛后做，避免用纯文案掩盖仍存在的兼容分支 | L2-L3 | [C7](changes/C7-rewrite-main-specs-as-current-state.md) |
| C8 | `sharpen-context-and-routing` | 最后做，主要是 Agent 阅读路径和脆弱文案测试降噪 | L1-L2 | [C8](changes/C8-sharpen-context-and-routing.md) |

## 当前依赖图

```text
C1 (先分辨 dead surface / current experiment surface)
 |
 +--> C2 (RUN.md + internal versioning) --> C3 (bundle entry)
 |                                      \
 |                                       +--> C6 (work-unit; only after explicit decision)
 +--> C7 (main specs current-state rewrite) --> C8 (context/routing)

C2c policy approved --> C2b archive --> C2c archive --> C3 policy decision (bundle entry)

C4a (profile access)                  [L3, independent decision gate]
C4b (legacy plan migration) ---> C5a / C6  [L4, independent decision gates]
C5a-1 (UID-only authoring) --> C5a-2 (historic reference reader) [L3 -> L4]
C5b (experiment retained history)     [L4, independent of reference]
```

`C2b/C2c`、`C4a/C4b`、`C5a-1/C5a-2` 与 `C5b` 都是 proposal 时应拆出的 bounded changes，不是已经创建的 OpenSpec changes。C2-C5 的完整调查地图已先完成；某一张卡只有在用户批准其 policy 且自身 Go / No-go 完整后，才可单独 proposal，不必等待其他未决卡。

## 维护规则

- [ ] 每次开始一个 proposal 前，更新对应卡片的 “已验证事实” 和 “待补证据”。
- [ ] 每次 proposal 发现 current consumer，记录具体路径、调用/读取角色和结论；不只写“仍被使用”。
- [ ] 每次 archive 后，把实际 scope、验证和残余风险回填到该卡片及总计划 metrics ledger。
- [ ] 任何一个 C4/L4 卡进入 Apply 前，必须得到明确用户决策：保留历史 artifact 的人工可读性不等于继续给 Engine compatibility reader。
