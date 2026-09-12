# Design — Run Bundle 归档区（dpt_archive/）

## Context

见 proposal.md 的 Why 与 What Changes。关键既成事实（本 session 已完成或已核对）：

- 物理平移已执行：5 个已完成 bundle 已在 `dpt_archive/` 下，2 个活 bundle 留在根目录；git 零影响（bundle 全部被 `.gitignore` 的 `dpt_rb_*/` 覆盖，该规则无前导锚点、任意深度匹配）。
- 引擎安全性已核对：bundle canonical identity 是目录 basename（`DEEP_RESEARCH_HARNESS/engine/helpers/bundle-identity.mjs`、gate 命名校验、`cross-bundle-reference-scan.mjs`、`inspect-bundle.mjs` 的 isolation 诊断均 basename-based）；裸 runtime path 全部相对 current run bundle root，不相对 repo root（`DEEP_RESEARCH_HARNESS/README.md`「目录性质」既有条款）。
- Entry Selection (canonical) 在 `continue-run-bundle.md` 中路径无关；`cmd-bundle-instantiation` 的 sibling preflight 只扫描 instantiate 目标目录。
- 因此本 change 的实现面**只有指导文本**，无任何代码改动。

## Goals / Non-Goals

**Goals:**

- "根目录 = 活区 / `dpt_archive/` = 归档区"成为一条从目录结构直接可读的不变量，写入全部相关指导面。
- 归档与复活的操作语义（平移不改名、复活 = 移回根目录）在指导中有唯一、无歧义的表述。
- 明确归档 ≠ disposable（`dpt_archive/dpt_rb_*` 与 `dpt_disp_*` 是两个概念）。

**Non-Goals:**

- 不改 Engine/JS、schema、gate、trace；不新增 control file、登记表、校验工具或 trace 事件。
- 不改 Entry Selection 的 canonical 判定逻辑，也不改 sibling preflight 行为。
- 不回填改写任何已归档 bundle 的内容（包括其 BUNDLE_MAP/BUNDLE_ENTRY 中的任何引用）。
- 不为 `dpt_archive/` 建立 gate 或生命周期状态——目录位置即归档事实，无 second truth。

## Decisions

### D1. 归档身份 = 目录位置，单一只读不变量

**选择**：归档状态完全由"bundle 是否位于 `dpt_archive/` 下"表达；活区 = repo 根。

**备选与弃用理由**：
- *登记表 / manifest 文件*：引入第二个 Source of Record，与目录位置产生漂移可能，违背 simple-reliable-control 的"直接 Source of Record、最短合法闭环"。
- *bundle 内加归档状态字段（如改 rb_status.json）*：runtime truth 被归档这一仓库布局事实污染，且复活时要回写，多一个可漂移点。

### D2. 平移不改名

**选择**：`mv dpt_rb_x dpt_archive/`，basename 严格保留。

**理由**：basename 是全部引擎判定的 identity 锚（gate、preflight、isolation、cross-bundle citation token `dpt_rb_<name>`）。改名 = 身份断裂，历史 trace、citation、BUNDLE_MAP 全部失配。备选"归档时重命名为 `dpt_rb_x.archived`"直接弃用。

### D3. 复活 = 移回根目录，Entry Selection 零改动

**选择**：用户指名归档 bundle 续跑时，Agent 先把 bundle 平移回 repo 根，再按既有 Entry Selection (canonical) 走。

**备选与弃用理由**：*"原地续跑"（归档位置直接作为 current run bundle root）*——技术上 Entry Selection 的"用户给可达 bundle"规则本可兼容，但它制造两个合法工作位置（根/归档），活区不变量从一条变两条，且 sibling preflight 视野、AGENTS.md 措辞都要跟着复杂化。移回根目录是更短的合法闭环。**该决策已由用户确认**（本 session `ask_user_question` 回答）。

### D4. 指导文本的落点与措辞边界

| 文件 | 增补内容 | 措辞边界 |
|---|---|---|
| `DEEP_RESEARCH_HARNESS/README.md`（目录性质） | `dpt_archive/` 定位段：活区 vs 归档区、平移不改名、复活 = 移回根目录、归档 ≠ disposable | 叙述性，不引入新 requirement 语汇 |
| `command_playbook/instantiate-run-bundle.md` | 目标目录处一句：新 bundle 一律创建在 repo 根活区 | 不改既有 sibling preflight 描述 |
| `command_playbook/start-research.md` | 同上落点政策一句 | 同上 |
| `command_playbook/continue-run-bundle.md`（Entry Selection 附近） | 复活路径说明：用户指名 `dpt_archive/` 内 bundle → 先移回根目录再按既有规则选择 | **不触碰** canonical 选择判定本身；`unsupported_current_entry_contract` stop 定义不动 |
| 根 `AGENTS.md`（Do-Not-Read） | 显式点名 `dpt_archive/` 内 run-bundle 目录适用既有规则 | 现有 "anywhere in the repository" 已覆盖，此为消歧义点名，不扩权不缩权 |

**理由**：指导变更落在指导被消费的每个入口（框架 README、两个创建入口 playbook、续跑手册、仓库根行为文件），避免"某处指导仍假设所有 bundle 都在根目录"的残留。`repair-run-bundle.md` 不需要单独改——它的定位规则引用 continue-run-bundle.md 的 Entry Selection（同一复活路径自动生效）。

### D5. 用户决定活区名单，Agent 只执行

活区/归档名单的每次变动（归档或复活）都是 user decision，Agent 执行 `mv` 与指导文本；Engine 不参与。本次名单已由用户决定并执行完毕。

## Risks / Trade-offs

- **[Agent 仍按旧习惯把归档 bundle 当不可达]** → Entry Selection 增补复活路径后，该假设有唯一书面出口；AGENTS.md 点名进一步降低漏读概率。
- **[归档区被误当 disposable 而删除/重建]** → README 增补段与 semantic-precision reflection 中显式对比"归档 ≠ `dpt_disp_*`"；`dpt_archive/` 命名与 `dpt_disp_` 前缀家族区分明显。
- **[`.gitignore` 未来被收紧为锚定规则 `^dpt_rb_*/`]** → 会使归档区内容进入 git 视野；缓解：`.gitignore` 显式加入 `dpt_archive/` 一行（本 session 已写入工作区，随本 change 提交），tasks 中加一条 verify：`git check-ignore dpt_archive/dpt_rb_ai-coding-evolution/rb_status.json` 非空。
- **[用户未来想归档"从未 Final 但长期搁置"的 bundle]** → 本 change 不限制归档对象；名单永远是用户决定，指导不写死"只有 Final 才可归档"。
- **[多机/多人协作时根目录与归档区各有一份同名 bundle]** → 平移语义天然防重名（同一 basename 不可能在两处）；`mv` 遇同名目标会失败并报错，无需新检查。

## Migration Plan

1. Apply 阶段按 tasks.md 编辑 5 个指导文件（物理平移已完成，无需迁移动作）。
2. 回滚策略：指导文本按 git revert 恢复；目录布局回滚 = `mv` 回根目录（bundle 不进 git，无 git 层回滚负担）。

## Open Questions

无——三项关键决策（活区名单、归档方式、复活政策）均已由用户在本 session 确认。
