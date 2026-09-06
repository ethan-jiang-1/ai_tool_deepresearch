# Design: Final Polish Version Control

## Context

见 proposal.md — Why。现状要点：

- `publish-final-report` 每次调用分配全局 `latest + 1`（ARP：`every later publication uses latest + 1`），primary immutable（`Primary history is immutable`）。
- `iterate-final-delivery-in-place`（2026-08-16）已确立 Final 是 terminal interactive refinement：首次交付后留在同一 Final node，反馈驱动修订，每次修订追加 `final_v<N>.md`。
- 实测缺口：打磨与 evidence-expanding 共用版本分配 → 打磨期版本号一路涨（v4→v7 无新证据）；无回调/废弃手段；Evidence Map 内部路径不满足对外自包含。

## Goals / Non-Goals

**Goals:**

- 打磨（presentation-only 修订）不分配新全局版本号；同一大版本内用子目录修订记录表达。
- 控制者能显式回调/废弃冒进的版本号（retired = 标记 + 归档，非改写历史）。
- final 交付自包含：主 MD + 配套子目录物化证据明细（关键数字/口径/外部 URL），对外读者无需访问内部路径。
- 用确定性测试与既有验证路由锁住新契约行为。

**Non-Goals:**

- 不改变 evidence-expanding rerun 的 audited 路径（仍走 post-final-recovery，升新大版本）。
- 不新增第三个 HITL、Final Gate、outgoing transition、报告质量 Engine verdict。
- 不改仓库 CHANGELOG 版本（VEM 系列已裁决，本 Change 只约束 bundle 内 final 报告）。
- 不删除/改写 immutable 历史（retired 是标记 + 归档）。
- 不新增 requirement ID（ARP/POF/CDP 是 live prefix；本 Change 全部并入既有 modified requirement）。

## Decisions

### D1: 打磨修订的落点 — CAS 原地更新当前 primary 文件 + REVISIONS.md 审计

- **选择**（2026-09-06 用户体验复审后简化）：打磨修订 = 用既有 CAS 机制（`expect-sha256` = 当前文件 digest）**原地更新当前 latest primary 文件 `final/final_v<N>.md` 的字节**，版本号不变、不分配新版本、不创建修订文件。发布前校验：staging 的 Evidence Map backing 集合必须与当前 primary 一致（否则不构成打磨）；CAS 失败（文件已被他人更新）则拒绝。每次打磨在版本绑定 auxiliary 目录的 `REVISIONS.md` 追加一行（时间、摘要、更新前 digest、更新后 digest），提供审计轨迹。
- **理由**（用户体验优先）：用户视角「`final/final_v<N>.md` 打开就是当前内容，打磨后打开仍是最新」——原地更新保证单一真相源，不引入「主文件 + 修订文件」两个概念的认知负担。CAS + backing 校验 + REVISIONS 审计提供与 immutable 同等的防篡改与可追溯：历史版本一旦有更新的 primary 出现即冻结（不再成为打磨目标），打磨只允许作用于当前 latest。
- **immutable 边界**：ARP「Primary history is immutable」保留——打磨只更新**当前 latest** primary；任何非 latest 的历史 primary 字节 SHALL NOT 被打磨更新（打磨目标只能是 `latest`）。这使 immutable 的语义精确为「历史冻结、当前可打磨」，与用户「就在这一个版本一直打磨」一致。
- **替代**（已否）：`report-r<M>.md` 修订呈现文件——被否：用户体验割裂（读者需理解主文件+修订文件）、实现复杂，用户复审明确否决不采用。

### D2: 打磨 vs 新研究的判定边界 — Final Agent 语义裁决 + backing 集合事实

- **选择**：与既有 post-final 路由同源判定（COMMANDS 的 presentation 族 vs evidence-expanding 族）：Evidence Map backing 集合（28 项 finding 的 backing 文件路径集）与提交事实集不变、仅结构/篇幅/措辞/强调/呈现变化 → 打磨；出现新来源、新 Topic、新研究结论、研究 profile 变化、backing 集合变化 → evidence-expanding。
- **理由**：backing 集合是可机械检查的事实（Engine 可验证），语义归类由 Final Agent 裁决（与既有 route 判定一致），两者互补；不做 Engine 报告质量 verdict。
- **Engine 角色**：`publish-final-report` 在打磨模式（新 flag 或等价调用面）下**不分配新版本**，只提交到子目录修订区；普通模式（evidence-expanding 交付）维持 `latest+1`。调用面由 Agent 按语义裁决选择，Engine 只做机械分配。

### D3: 版本回调/废弃 — `retire-final-version` 操作

- **选择**：`operate-artifact-persistence.mjs` 新增 `retire-final-version`：控制者显式指定 `--version <N>`（与可选 `--feature`），Engine 将该版本 primary 文件移动至 `final/attic/final_v<N>.md`（或等价 retired 区域）并写 retired marker（记录 retired_at、retired_by=user、原版本、原因）；`latest` 回退到剩余最高版本。
- **理由**：immutable 历史不可改写原则保留（移动+标记 ≠ 删除/改写）；用户拥有纠错 Agent 冒进版本的唯一入口；Agent 不得自动调用（语义/风险决策归用户，符合 Helper-Oriented Agent）。
- **边界**：attic 内文件仍保留（可审计），但不进入 primary series 分配、不参与 `latest` 计算、不参与 witness digest；retired 后 `publish-final-report` 不得复用该版本号（序列不回退复用，与 ARP `not reuse 2 or maintain a second counter` 一致）。

### D4: 自包含强化 — 子目录证据明细

- **选择**：每个 primary 版本发布时，配套子目录必须含证据明细文件（如 `07-evidence-details.md`）：每条关键结论（W2F 级）的结论摘要、关键数字、口径标签、**外部原始出处 URL**。主报告 Evidence Map 说明指向该文件。
- **理由**：对外交付 = 主 MD + 子目录；读者在公开目录内即可核验全部结论（外部 URL 可点击），无需访问 `../artifacts/` 与 `../reference/` 内部路径——这是"自包含"的最小充分形态（用户 2026-09-05 明确要求）。
- **验证**：persist 前校验子目录明细文件的 URL 均可从已提交 reference 的 frontmatter source_url 集合解析（禁止编造链接）；backing 仍指向已提交 evidence-summary/reference（ARP 既有 admission 不变），但读者指引改为子目录明细。

### D5: 既有 v1–v7 的处理 — 不动历史，从当前版本起执行新纪律

- **选择**：已发布的 v1–v7 保持 immutable 原样（不 retroactively 重编号/删除）；新纪律从下一个新大版本（或当前最新版本的后续打磨）起生效。用户如对 v4–v7 的打磨噪音不满，可用 D3 的 `retire-final-version` 显式废弃多余版本。
- **理由**：immutable 原则禁止改写历史；回调手段（D3）就是为这种"已经冒进"的情况准备的用户出口；系统层默认不再因打磨产生新版本，从今往后版本号才有意义。

## Semantic Precision

版本号回答一个有界问题：**`final_v<N>` 是否代表一次合法研究交付（含首次与每次 audited rerun 后的新交付）？** 打磨修订不改变答案，因此不改变版本号——它们作为修订呈现文件发布在版本子目录内，并由 REVISIONS.md 记录（主文件 immutable 字节不受影响）。控制者通过 `retire-final-version` 纠正 Agent 冒进，通过子目录自包含明细核验内容。
