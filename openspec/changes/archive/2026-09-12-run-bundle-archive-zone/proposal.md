# Run Bundle 归档区（dpt_archive/）

## Why

repo 根目录目前并排堆放多个 `dpt_rb_*` run bundle，活区与已完成 run 混在一起，"根目录下有哪些活着的 bundle" 无法从目录结构直接读出；Agent 与人都需要额外信息才能判断某个 `dpt_*` 目录是否属于当前工作面。原始需求来自本 session 用户的直接请求（对话记录）："活着的、还要用的停留在根目录底下，其他的放到一个 archive 里头（比如 `dpt_archive/`），并且这个目录结构设计要反映到整个项目指导里"。

用户已在本次对话中确认三项决策（`ask_user_question` 回答记录）：

1. 活区名单：`dpt_rb_enterprise-ai-org-reform`、`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 留在根目录；
2. 其余 5 个 bundle 移入 `dpt_archive/`（**此物理平移已在本 session 执行完毕**，纯 `mv` 不改名，git 零影响——所有 `dpt_*` bundle 均被 `.gitignore` 的 `dpt_rb_*/` 覆盖）；
3. 复活政策：归档 bundle 要续跑时**移回根目录再用**，保持"根目录 = 活区"单一不变量。

## What Changes

- **新增指导概念：`dpt_archive/` 归档区**——repo 根目录下与 `dpt_rb_*` 平级的一个固定目录，专门存放不再处于活跃工作面的 run bundle；归档 = 平移不改名。
- **`DEEP_RESEARCH_HARNESS/README.md`**「目录性质」增补一段：说明 `dpt_archive/` 的定位（活区 vs 归档区）、归档不改名、复活 = 移回根目录。
- **`DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` 与 `start-research.md`**：在"目标目录"处增补一句落点政策（新 bundle 一律创建在 repo 根活区；已归档 bundle 不参与 sibling preflight 视野）。
- **`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` 的 Entry Selection (canonical)**：增补复活路径说明——用户指名归档区内的可达 bundle 时，先把该 bundle 移回根目录再按既有规则选择（不改变既有 canonical 选择规则本身）。
- **根 `AGENTS.md`** Do-Not-Read 段落提及 `dpt_archive/` 内的 run-bundle 目录同样适用既有规则（现有 "anywhere in the repository" 措辞已覆盖，此处仅显式点名，消除歧义）。

**不产出**：不改任何 Engine/JS 代码、schema、gate、trace；不改 Entry Selection 的 canonical 判定逻辑；不新增 control file、登记表或检查工具；不回填改写任何已归档 bundle 的内容。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`（Entry Selection 相关 requirement：explicitly supplied reachable bundle 路径无关） | Excluded | 复活政策 = 移回根目录，Entry Selection 的可达性判定逻辑零改动；本 change 只在该手册增补复活路径的叙述性说明 |
| `bundle/cmd-bundle-instantiation` | `openspec/specs/bundle/cmd-bundle-instantiation/spec.md`（sibling preflight / 目标目录 requirement） | Excluded | preflight 扫描的是 instantiate 目标目录（repo 根），归档后旧 bundle 不在其视野是自然结果而非行为变化；playbook 增补的是落点政策一句话，不改变任何 requirement |
| `bundle/bundle-data-isolation` | `openspec/list --specs` + 引擎核对（`bundle-identity.mjs` 等 basename-based identity） | Excluded | bundle canonical identity 是目录 basename，平移不改名 → isolation 与 identity 契约不受影响 |
| `governance/guidance-constitution` | `openspec list --specs`（guidance 文档治理归属） | Excluded | 本 change 增补的均为叙述性指导文本，不触碰 guidance-constitution 拥有的 requirement 级条款 |

**`skip_specs: true` 理由**：本 change 不产生任何 requirement 级行为变化（见 `.openspec.yaml` 内 `skip_specs_reason`），不创建 delta spec。

## Source of Record 与最短合法闭环

- **"哪些 bundle 是活的"的 Source of Record 是用户决定 + bundle 所在位置本身**：根目录 = 活区，`dpt_archive/` = 归档区。不引入新的登记文件、状态字段或 gate 来记录归档状态——目录位置就是唯一的归档事实。
- **Net simplification**：删除了"根目录下所有 `dpt_rb_*` 都需要逐一判断活性"这一隐性负担；instantiate sibling preflight 天然只看活区，无需任何新 check、新状态或 fallback。明确**避免**的复杂度：归档登记表、归档 gate、归档/复活 trace 事件、`dpt_archive/` 专用校验工具。
- **复活闭环 = 最短路径**：`mv dpt_archive/dpt_rb_x .` 一步完成，之后按既有 Entry Selection / continue 规则走，无新增流程节点。

## Semantic-precision reflection（新具名概念：`dpt_archive/`）

- **读者与有界问题**：coding Agent 与人面对 repo 根的 `dpt_*` 目录时问："这是活区还是归档区？" `dpt_archive/` 让该问题由目录位置直接回答。
- **必须保留的区别**：归档 ≠ disposable。`dpt_archive/dpt_rb_*` 仍是完整、可复活的 runtime truth root（裸 runtime path 全部相对 bundle root，不受父目录影响）；这与 `dpt_disp_*` disposable experiment bundle（不修、直接重建）是两个不同概念，指导文本中不得混用。
- **正常推理停止点**：看到 bundle 在 `dpt_archive/` 下即知其归档身份，无需读 bundle 内容推断；复活动作 = 平移回根目录，无需进一步判定。

## 责任边界

- **User decision**：活区/归档名单、复活时机（本次已由用户决定名单；未来归档/复活由用户发起）。
- **Agent execution**：执行 `mv` 平移（不改名）、编辑指导文本；不创造新权限，不自行判定 bundle 死活。
- **Engine verdict**：不新增任何 Engine 判定；既有 gate/trace/identity 行为全部保持不变。

## Impact

- **受影响文件**（apply 阶段编辑）：`DEEP_RESEARCH_HARNESS/README.md`、`DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`、`DEEP_RESEARCH_HARNESS/command_playbook/start-research.md`、`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`、根 `AGENTS.md`。
- **不受影响**：全部 Engine/JS 代码（`engine/`、`cli/`、`host_tools/`、`schema/`）、全部已接受 spec、`tests/`。
- **`.gitignore` 一行防御性增补**（随本 change 一并提交）：显式加入 `dpt_archive/`。`dpt_rb_*/` 无锚点规则本已覆盖任意深度，该行是冗余但刻意的防御——若未来 `dpt_rb_*/` 被收紧为锚定规则，归档区不会因此进入 git 视野（对应 design.md 风险项）。该行已在本 session 写入工作区。
- **运行时状态**：物理平移已完成（本 session），apply 阶段无需再移动任何目录，只做指导文本同步。
