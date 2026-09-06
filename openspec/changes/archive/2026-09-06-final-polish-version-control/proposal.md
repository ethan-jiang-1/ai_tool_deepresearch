# Final Polish Version Control

## Why

final 报告的打磨（presentation-only 修订：结构、篇幅、措辞、强调、现有证据的呈现方式）与 evidence-expanding 研究交付**共用同一个 `publish-final-report` 的 `latest+1` 全局版本分配**。实测后果（2026-09 实战）：v4→v5→v6→v7 连续四次发布全部是打磨/重写（无任何新研究证据），每次却递增全局版本号，导致：

1. **版本号失真**：控制者（用户）无法从版本号判断"内容是否变化、变化是否实质"——v4 到 v7 之间没有任何新证据，版本号却一路涨。
2. **控制者无纠错手段**：一旦 Agent 冒进产生大量打磨版本，immutable 契约只允许追加、不允许标记废弃——用户无法告诉系统"v6/v7 是打磨噪音，v5 才是权威交付"。
3. **自包含断裂**：Evidence Map 的 backing 指向 `../artifacts/` 与 `../reference/` 内部路径，对外交付（只公开 `final/final_vN.md` + `final/final_vN/` 目录）时读者无法核验——需要把证据细节物化进版本子目录。

既有裁决对照：`2026-08-16-iterate-final-delivery-in-place` 确立了 Final 是 terminal interactive refinement（首次交付后留同一 Final node、反馈驱动修订），但它把 **presentation revision 与 evidence-expanding 交付混在同一全局版本序列**（规定"后续 presentation revision 也全局单调追加 final_v<N>.md"，其 e2e 证明"两轮反馈各追加一个版本"）——**这是本 change 要修正的历史语义缺陷**：打磨不再追加版本，只在当前 latest 版本内 CAS 原地更新；只有 audited rerun 后的新研究交付才追加新版本。`2026-08-17-align-version-scheme-major-minor-build` 确立的是仓库版本 `MAJOR.MINOR.BUILD` 的 bump 边界（仓库/框架 CHANGELOG），与 bundle 内 final 报告版本无关，本 change 不触碰。本 change 补上 bundle 侧 final 报告的版本纪律，并显式修正 `iterate-final-delivery-in-place` 的"打磨也追加版本"语义。

## What Changes

- **引入「打磨修订（presentation revision）」概念**：在 `final/final_v<N>.md` 的既有序列之上，定义同一大版本内的打磨修订——**打磨用既有 CAS 机制（expect-sha256 = 当前 digest）原地更新当前 latest primary 文件字节，版本号不变、不分配新版本、不创建修订文件**，并在版本绑定 auxiliary 目录的 `REVISIONS.md` 追加审计行（时间、摘要、更新前后 digest）。判定边界由 Final Agent 语义裁决（presentation-only vs evidence-expanding，与既有 post-final 路由的判定同源）：Evidence Map backing 集合与提交事实集不变、仅呈现变化 → 打磨（版本号不变）；任何新来源/新 Topic/新研究结论/研究 profile 变化 → 走既有 audited post-final rerun，届时才升新大版本。immutable 语义精确为「历史版本冻结、当前 latest 可打磨」：打磨目标只能是当前 latest，任何历史 primary 字节 SHALL NOT 被打磨更新。
- **版本号语义重定义**：`final_v<N>` 表示「一次合法研究交付（含首次 + 每次 audited rerun 后的新交付）」；同一 `N` 内的打磨修订 CAS 原地更新当前 latest primary 字节并在版本子目录 `REVISIONS.md` 记录，不进入 primary series 分配。首次进入 Final 写 `final/final.md`（v0 base）不变；audited rerun 后的新合法交付才分配新 `N`。
- **新增版本回调/废弃操作（human-controlled，控制者纠错出口）**：提供受控操作（`operate-artifact-persistence.mjs retire-final-version`）允许控制者显式将某个已发布版本标记为废弃（移动至 `final/attic/` 并记录 retired marker：retired_at、retired_by=user、原版本、原因），使 `latest` 回退到用户认定的权威版本。**只由用户显式触发**，Agent 不得自动废弃；不覆盖/删除 immutable 历史（retired 是标记 + 归档，不是改写）。此操作是「默认打磨不升版本」机制的兜底：若 Agent 冒进产生多余版本，用户可据此纠错。
- **强化 final 自包含契约（对外交付最小形态）**：每个 primary 版本必须携带配套版本子目录 `final_v<N>/`（auxiliary directory，既有契约已绑定版本），子目录内**物化证据明细**（每条关键结论的关键数字、口径、外部原始出处 URL，URL 必须可回溯到已提交 reference frontmatter，禁止编造），使对外交付（主 MD + 子目录）自包含——Evidence Map 的读者无需访问 `../artifacts/` 与 `../reference/` 内部路径即可核验。主报告的 Evidence Map 说明指向子目录内明细文件。
- **修改** `openspec/specs/bundle/artifact-persistence-recovery/spec.md`（ARP 系列：版本分配、immutable、auxiliary 目录）与 `openspec/specs/research/post-final-recovery/spec.md`（presentation-only 打磨路由）+ 对应 playbook（`command_playbook/persist-artifact.md`、`command_playbook/post-final-recovery.md`）。
- **边界**：不新增第三个 HITL、Final Gate、outgoing transition、报告质量 Engine verdict；不改变 evidence-expanding rerun 的 audited 路径；不改变 immutable 历史不可改写原则（retired = 标记 + 归档，非删除）；不改变仓库 CHANGELOG 版本（VEM 系列）——本 Change 只约束 bundle 内 final 报告版本纪律。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md`（ARP-004/005 版本分配、immutable、auxiliary 目录契约） | Modify | 打磨修订路径（--polish CAS 更新当前 latest）、retire-final-version、自包含明细校验都是该 capability 的版本/持久化行为扩展，不另立 capability |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md`（POF-001 presentation-only 打磨路由） | Modify | 打磨留 Final 不升版本、evidence-expanding 才走 audited rerun 是 POF-001 语义的修正 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md`（CDP-006/008 Final refinement 与辅助归档契约） | Modify | Final refinement 的版本语义（打磨在同一版本内 CAS 更新）与辅助目录自包含明细属于 CDP 契约 |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`（RUE-004 入口节奏） | Modify | 入口节奏的「presentation revisions」精确化为当前版本 CAS 更新 |
| `research/content-delivery-experiments` | `openspec/specs/research/content-delivery-experiments/spec.md`（CDE-003 case-138 e2e 契约） | Modify | e2e 契约从「两轮打磨追加两个版本」改为「两轮打磨 CAS 更新同一版本」 |
| `workflow/workflow-node-contract` | `openspec/specs/workflow/workflow-node-contract/spec.md`（WNC-005 Final node 语义） | Modify | Final node 的「publish immutable revisions」精确化为 CAS 更新当前版本 |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md`（VEM 系列） | Excluded | VEM 是仓库 CHANGELOG 版本（MAJOR.MINOR.BUILD），与 bundle 内 final 报告版本无关；本 change 不触碰 |
| `workflow/silent-wave-execution` | `openspec/specs/workflow/silent-wave-execution/spec.md`（SWE-003） | Excluded | 只要求「提前写 final 禁止」，不涉及版本追加语义，与本 change 无冲突 |

## Capabilities

### New Capabilities

无。既有 capability（artifact-persistence-recovery、post-final-recovery、content-delivery-phase-content）已覆盖版本分配、Final 修订路由与交付持久化；本 Change 是这些能力的行为修改，不制造平行 owner。

### Modified Capabilities

- `bundle/artifact-persistence-recovery`：MODIFY ARP 系列——引入打磨修订不升版本、版本回调/废弃操作、子目录自包含强化。
- `research/post-final-recovery`：MODIFY POF 系列——明确 presentation-only 打磨留在 Final 且不触发版本递增；evidence-expanding 才走 audited rerun 并升新版本。
- `research/content-delivery-phase-content`：MODIFY CDP 系列——Final refinement loop 的版本语义（打磨在同一版本内修订）。
- `bundle/run-entry`：MODIFY RUE-004——入口节奏中的「presentation revisions」精确化为当前版本 CAS 更新（版本号不变）。
- `research/content-delivery-experiments`：MODIFY CDE-003——case-138 e2e 契约重写：两轮 presentation 反馈 CAS 更新同一版本（不再追加 v1/v2），evidence-expanding 才追加版本。
- `workflow/workflow-node-contract`：MODIFY WNC-005——Final node 的「publish immutable revisions」精确化为 CAS 更新当前版本；evidence-expanding 才分配新版本。
