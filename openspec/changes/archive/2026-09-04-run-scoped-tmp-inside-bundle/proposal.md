# Proposal: run-scoped-tmp-inside-bundle

## Why

来源：`_backlog/bugs/BUG-254-run-scoped-tmp-artifacts-outside-bundle.md`（2026-09-04 取证自
`dpt_rb_glm-5-3-deepseek-v4-domestic-chips`）。

run-scoped 辅助脚本（`_scripts/*.mjs`）执行时把中间产物——enrich 输入、queue/task 卡、投影
packet、source 草稿、result 草稿——硬编码写进系统 `/tmp/`（现场遗留 114 个相关文件）。后果：

1. 不随 bundle 归档：bundle 交付/迁移后接收方看不到"这个 run 当时用了什么输入、产出过什么中间态"；
2. 跨环境/重开会话即丢失：`/tmp` 是机器临时区，系统清理或换机后中间产物不可重建；
3. provenance 断链：queue 卡、投影 packet 是 Engine 操作的一手输入证据，落 `/tmp/` 后
   gate/reentry/provenance 检查只能看到 bundle 内最终态；
4. 已造成实际数据损失：`08_haiguang-shensuan4-dcu/source.yaml` 提交时的原始 10 条被后续脚本
   改写后，唯一可能保存原始内容的中间产物在 `/tmp/`（`wave0-source-08…json` 等），不在 bundle
   内 → 前缀 drift 不可逆，连带 4 个 `00-shared-*` reference 的 backing 解析失败（reentry
   `ledger_coverage` blocker）。

根因：规则只约束了**脚本本身**的存放位置（bundle `_scripts/`），没有约束**脚本产生的中间/临时
数据文件**的位置，也没有校验工具检测"run 期间向 bundle 外写文件"。

用户决策（2026-09-04 会话）：每个 run bundle 自带一个 `_tmp/` 目录（bundle root 下、随 bundle
归档），并让所有需要临时目录的场景（规则、playbook、`_scripts/README.md`、executor/生成器
helper、扫描校验、recovery）都明确指向这个目录——临时数据留在 run bundle 范围内，不因系统
`/tmp/` 把多个 run 的信息串起来。

## What Changes

- **bundle 自带 `_tmp/` 临时目录（新 capability `bundle/run-scoped-tmp-artifacts`）**：
  - 每个 run bundle SHALL 在 bundle root 下拥有 `_tmp/`，作为 run-scoped 脚本中间/临时产物的
    唯一合法落点；`_tmp/` 是 non-authority 运行时区域（与 `_scripts/`、`_logs/`、`_cache/`
    同类），随 bundle 归档，可删除、可重建，不建立 gate/evidence/provenance/receipt 语义，
    不进入 inspect-bundle required shape。
  - run-scoped 脚本的中间产物（queue 卡、enrich 输入、投影 packet、source 草稿、result 草稿
    等）SHALL 写入 current run bundle root 的 `_tmp/`，SHALL NOT 写入系统 `/tmp/`、repo 根或
    `DEEP_RESEARCH_HARNESS/`。
  - 提供统一 `stagingFile(slug, kind)` helper（`DEEP_RESEARCH_HARNESS/engine/helpers/`），把
    中间产物落到 bundle `_tmp/` 下可归档、可追溯的路径。
  - 只读扫描：inspect-bundle SHALL 扫描 `_scripts/*.mjs` 中硬编码 `/tmp/` 写路径，并报告
    bundle-scoped 诊断（关联当前 bundle 时为 blocker），与 BUI-003 同型接入。
  - recovery 出路：若已在 `/tmp/` 发现可归属到本 bundle 的中间产物，允许以 `_tmp/` 恢复路径
    采纳（文档化在 `_tmp/README.md.tmpl`）。
- **instantiation 创建 `_tmp/` scaffold（MODIFIED `bundle/cmd-bundle-instantiation`）**：
  - `instantiate-run-bundle.mjs` 的目录 scaffold 加入 `_tmp/`，新增 `_tmp/README.md.tmpl`
    模板（声明"这是临时目录、non-authority、随 bundle 归档、请把中间产物写这里"）；
  - playbook `instantiate-run-bundle.md` 描述 `_tmp/` 为 run-scoped 临时产物落点。
- **规则/文档同步**：repo 根 `AGENTS.md` Hard Rules、`DEEP_RESEARCH_HARNESS/README.md`
  目录性质、`rb_templates/_scripts/README.md.tmpl` 统一补充"中间产物写 bundle `_tmp/`，
  禁止写系统 `/tmp/`"的正例与反例。
- 不迁移既有 bundle 的运行时状态（如现场 bundle 已存在的 `_cache/run-staging/`）；本 change
  确立的是此后所有 run 的契约。

## Capabilities

### New Capabilities

- `bundle/run-scoped-tmp-artifacts`: run-scoped 脚本中间/临时产物落点契约——bundle 自带
  `_tmp/`、脚本中间产物只写 bundle `_tmp/`、统一 staging helper、硬编码 `/tmp/` 写路径的
  只读扫描与 recovery 采纳路径。

### Modified Capabilities

- `bundle/cmd-bundle-instantiation`: instantiation 目录结构新增 `_tmp/` scaffold（目录 +
  `_tmp/README.md` 模板），playbook 描述 `_tmp/` 为 run-scoped 临时产物落点。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/run-scoped-tmp-artifacts` | `openspec/specs/bundle/bundle-data-isolation/spec.md`（BUI-002 列 runtime output paths，不含 `_tmp/`，不约束脚本中间产物）、`openspec/specs/bundle/cmd-bundle-instantiation/spec.md`（CMI-001 列目录，不含 `_tmp/`）、`rb_templates/_scripts/README.md.tmpl`（只约束脚本本身落点）、BUG-254 | New | 现有 contract 均未拥有"run-scoped 脚本中间/临时数据文件写哪 + 禁止系统 `/tmp/`"这一 observable behavior；独立 gate 检查（只读扫描）与独立 Engine 模块（staging helper + scan）满足 capability 边界测试。 |
| `bundle/cmd-bundle-instantiation` | 上述 CMI-001、`cli/instantiate-run-bundle.mjs`（dirs 数组、templates 映射、报告行）、`command_playbook/instantiate-run-bundle.md` | Modify | instantiation 目录结构新增 `_tmp/` scaffold 属于该 capability 已有行为（创建目录 + 模板 + playbook 描述）。 |
| `bundle/bundle-data-isolation` | BUI-002 场景（runtime output paths、repo-root leak 诊断） | Verify-only | `_tmp/` 的"在 bundle 内、不越界"语义由新 capability RUS 的 location 契约直接拥有；BUI-002 的 "including" 列表为示例性列举，`_tmp/` 的加入不改变 BUI 的隔离判定行为，无需改动 BUI requirement。 |

## Impact

- `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`：dirs 数组加 `_tmp`、templates 映射加
  `_tmp/README.md.tmpl`、报告行更新（目录数/ scaffold 数）。
- `DEEP_RESEARCH_HARNESS/rb_templates/_tmp/README.md.tmpl`：新增。
- `DEEP_RESEARCH_HARNESS/rb_templates/_scripts/README.md.tmpl`：补充中间产物落点规则。
- `DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs`：新增（stagingFile + scan）。
- `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs`：接入硬编码 `/tmp/` 写路径扫描诊断。
- `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`、repo 根 `AGENTS.md`、
  `DEEP_RESEARCH_HARNESS/README.md`：规则/描述同步。
- 测试：`tests/engine/helpers/run-scoped-tmp.test.mjs`（unit）、
  `tests/integration/cli/instantiate-run-bundle.test.mjs` 与新增
  `tests/integration/cli/inspect-bundle-tmp-diagnostic.test.mjs`（integration）。
- 依赖：无新增（Node 内置 + 既有 zod/yaml）。

## Governance 论证（Source of Record / 语义边界 / 责任边界）

- **direct Source of Record**：`_tmp/` 目录本身（bundle 文件系统）是 run-scoped 脚本中间产物的
  source of record——产物落在哪、是否存在、内容是什么都以 bundle 内 `_tmp/` 为准，不依赖 chat
  memory、系统 `/tmp/` 或框架资产。最短合法闭环：脚本把中间产物直接写进 bundle `_tmp/`，无需
  额外登记或状态机。
- **net simplification**：用"一个 sanctioned 目录 + 一个 staging helper + 一个只读扫描"替代
  现在脚本各自硬编码 `/tmp/` 的无约束局面；删除/避免的是"中间产物写哪"这一漂移自由度，不新增
  状态、不新增 gate、不新增 CLI 命令（扫描复用 inspect 输出面）。
- **semantic-precision 反射**：本 change 引入的具名概念是 `_tmp/`（bundle root 下的 run-scoped
  临时产物目录）。必须保留的区别：(a) `_scripts/` = 脚本文件本身，`_tmp/` = 脚本产生的数据文件；
  (b) `_cache/` = sub-agent 网络原始内容缓存（有 wave 结构契约），`_tmp/` = 自由 staging；
  (c) `_tmp/`（bundle 内、归档）≠ 系统 `/tmp/`（bundle 外、不归档、跨 run 串信息）。正常推理
  停止点：`_tmp/` 是"临时产物落点"概念，不扩大到"运行时状态 authority"（那仍是 Engine
  schema/ledger），也不创造新的 lifecycle view。
- **责任边界**：Engine 提供确定性事实（scaffold `_tmp/`、stagingFile 路径解析、inspect 扫描
  诊断）；Agent 执行语义义务（脚本把中间产物写 `_tmp/`，按扫描诊断修复）；User 无新增
  permission（位置约定是机械事实，不由 human-directed 创造 capability）。
