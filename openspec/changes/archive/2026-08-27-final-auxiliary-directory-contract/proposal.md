## Why

`final/` 是跨多轮交付的累积区。既有归档 change `iterate-final-delivery-in-place`（commit `860f65234`）只定案了**主报告**的版本化命名（`final/final.md`、`final/final_v<N>.md`、`final/final_<feature>_v<N>.md`，全局连续版本、主系列不可变），但没有定义主报告与其配套辅助详细档案目录的命名关系，也没有把 `final/README.md` 固化为命名/独立性约定的文档权威。触发案例与完整现状见 `_backlog/plans/final-report-aux-subdir-naming-and-readme-contract.md`：对 `chinese-ai-inference-chips-vs-nvidia` run bundle 做 V3 交付时反复出现「辅助目录叫 `chips/` 还是 `final_v1/`、主报告该引用哪个版本目录、后续版本如何不误改历史」的人工操心。把这些实践中已采用的约定（`final/final_vN.md` + `final/final_vN/` 同名辅助目录 + `final/README.md` 引导 + 版本独立自包含）固化为**可复用、可校验**的契约，交付才能稳定、可追溯。

## What Changes

- 在既有 canonical Final inventory 分类器（`DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs`，`@impl ARP-004`）里，把 `final/final_v<N>/`、`final/final_<feature>_v<N>/` 识别为**版本绑定辅助目录**：目录名 = 主报告文件名去 `.md`，绑定同一 version（与 feature）。
- 带版本语法、但无对应主报告文件的目录（例如只有 `final/final_v3/` 而没有 `final/final_v3.md`）→ 新增 `orphan_auxiliary_directory` blocker，镜像既有 `orphan_revision`，不按 mtime/目录顺序/内容猜测。
- 与版本脱钩的目录（`chips/`、`topics/`、`supplement/` 等）**保持 `supplementary`、不硬拒**——已有 accepted 契约允许 `final/` 下存在 non-primary non-reserved Markdown，硬拒会过度约束并破坏既有 bundle。
- 在 `phase-final.md` 的 Agent 面纪律（`research/content-delivery-phase-content`）固化：版本 N = `final/final_vN.md`（主报告）+ `final/final_vN/`（同名辅助目录）；版本完全自包含（主报告正文对辅助档案的交叉引用只进自身目录）；历史（更小 N）只读，新信息只进新版本目录。
- `final/README.md` 作为该 bundle 系列索引/命名与独立性约定的**唯一文档权威**，随每个新版本经非 primary `persist-final-report` 同步维护；它自身与辅助档案都是 Final Markdown，各自带 Evidence Map。
- **明确不做**：不新增全文链接扫描器（主报告 Evidence Map backing 已由 FDB 拒绝任何 `final/` 路径；跨版本正文引用是纪律不是机器扫描）；不改主报告命名语法/版本分配；不 Engine 强制 README 存在。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md`（ARP-004）；`DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs` | Modify | ARP-004 已拥有 canonical primary inventory 分类与 orphan/immutable/version-allocation；目录↔版本绑定是同一确定性 inventory 面的延伸，新增 ARP-005。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md`（CDP-001..007）；`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md` | Modify | CDP 拥有 `phase-final.md` body；辅助目录命名/自包含/README 权威是同一 Final phase 的 Agent 面纪律，新增 CDP-008。 |
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md`（FDB-001/002） | Verify-only | FDB 已拒绝 Evidence Map backing 指向 `final/` 路径；辅助档案/README 是非 primary Final Markdown，仍逐份走 Evidence Map admission。不新增全文链接扫描器。 |
| `workflow/workflow-node-contract` | `openspec/specs/workflow/workflow-node-contract/spec.md` | Excluded | `phase-final.md` 的 frontmatter/metadata 不变（`gate:null`、`stop:yes`、无 `next`），只改 body 纪律，不触碰 WNC 的 node 结构契约。 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Verify-only | 辅助目录不进入 primary series、不改变 C5 prior-inventory digest 的 primary-witness 语义；只读历史与 lineage 绑定不变。 |

## Capabilities

### New Capabilities

无。目录↔版本绑定属于既有 canonical Final inventory 分类面，命名/README 纪律属于既有 Final phase 面；新建 capability 会制造平行 owner。

### Modified Capabilities

- `bundle/artifact-persistence-recovery`: canonical Final inventory 分类器识别 `final/final_v<N>/`、`final/final_<feature>_v<N>/` 为版本绑定辅助目录，孤儿辅助目录（带版本语法但无对应主报告）成为 blocker；与版本脱钩的目录保持 `supplementary`；辅助目录不进入 primary version allocation。
- `research/content-delivery-phase-content`: `phase-final.md` 固化「版本 N = 主报告 + 同名辅助目录、版本自包含、历史只读、`final/README.md` 系列索引权威」的 Agent 面纪律。

## Semantic Precision

「版本绑定辅助目录」回答一个读者有界问题：**给定 safe direct-root Final inventory，哪个目录是一个已提交主报告版本的配套详细档案（按「主报告文件名去 `.md`」绑定），哪个目录是与版本脱钩的非 primary 内容？** 它保留必须区分的差异：`auxiliary`（版本绑定、非 primary、不进 version allocation）vs `supplementary`（版本脱钩、非 primary）vs primary revision 文件（进 allocation、不可变）；孤儿辅助目录（版本语法但无对应主报告）是一个直接 blocker 而非可修复内容。正常推理停止点是 inventory 分类结论（含 blocker），无需读取报告正文、mtime、目录顺序、chat 或 lifecycle 意图——它们不参与目录↔版本绑定判定。版本自包含、历史只读、README 权威属于 Agent 语义纪律，不进入这个确定性判定。

## Control And Responsibility

Direct Source of Record 是 canonical Final inventory 分类器（`final-report-series.mjs`）对 `final/` 每个直接子项的分类结论：它决定目录是 `auxiliary`（版本绑定）还是 `supplementary`（版本脱钩），以及是否存在 `orphan_auxiliary_directory`。命名/自包含/README 纪律的 Source of Record 是 `phase-final.md` + bundle 内的 `final/README.md`（文档权威，非机器事实）。

最短合法闭环：

```text
canonical inventory 分类（final-report-series.mjs）
  -> 目录名 = 主报告 revision 名去 .md  => auxiliary（绑定同一 version/feature）
  -> 目录名带版本语法但无对应主报告   => orphan_auxiliary_directory blocker
  -> 目录名不带版本语法               => supplementary（不变）
  -> 主报告与辅助档案都经 persist/publish 各自带 Evidence Map 提交
  -> 每个新版本：写 final/final_vN.md + final/final_vN/，并同步 final/README.md
```

net simplification：删除四类复杂度——不新增全文链接扫描器（沿用 FDB 的「非 scanner」边界），不新增 profile counter/current pointer，不为 README 开 FDB 特例，不硬拒版本脱钩目录（避免破坏已 accepted 的 supplementary 内容）。责任边界：用户决定报告是否满意及新呈现语义；Agent 负责写作、命名纪律、最小澄清与合法命令；Engine 只负责目录↔版本绑定的确定性分类与 orphan blocker、primary version allocation/immutability、backing admission。Engine 不裁决「辅助档案该写什么内容」或报告质量。

## Impact

- Engine：`DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs` 的分类 enum 新增 `auxiliary`、blocker code 新增 `orphan_auxiliary_directory`；消费方（`artifact-persistence.mjs`、`enter-phase`、recovery/check-reentry）无需改参数或流程，只多识别一类非 primary 目录。无新增依赖、无新 CLI 参数。
- Markdown：`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md` 增补 §3/§4 的辅助目录/README 纪律。
- Runtime outputs：每个版本 `final/final_vN.md` + `final/final_vN/`（各自带 Evidence Map），`final/README.md` 随版本演进；旧版本与 submitted evidence 不删除、不改写。
- Verification：`tests/engine/helpers/final-report-series.test.mjs`（unit truth table）+ `tests/integration/md/final-report-composition-contract.test.mjs`（md parity）。确定性分类无需 deterministic_e2e/agent_flow_e2e；命名纪律由 md parity 证明，不由 Node fixture 断言报告质量或用户满意度。
- Compatibility：已存在且「主报告 + 同名辅助目录」成对的 bundle 分类不变（合法绑定）；带版本语法但无主报告的目录从「无害 supplementary」变为 blocker（这是本 change 有意收紧的确定性结构判定）；与版本脱钩的目录行为不变。
