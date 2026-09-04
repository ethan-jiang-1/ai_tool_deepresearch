# Design: run-scoped-tmp-inside-bundle

## Context

见 proposal.md - Why：`_scripts/*.mjs` 把中间产物硬编码写进系统 `/tmp/`，不随 bundle 归档、
跨环境丢失、provenance 断链，且本 bundle 已造成 source.yaml 前缀 drift 不可逆。现有规则只约束
脚本本身落点（`_scripts/`），未约束脚本产生的数据文件落点。用户决策：bundle 自带 `_tmp/`，
所有"用临时目录"的场景一律指向它。

现状约束（调研确认）：
- `instantiate-run-bundle.mjs` 的 `dirs` 数组含 `_logs/_cache/_scripts/final/_work_units` 等，
  templates 映射含各 `README.md.tmpl`；成功报告硬编码"10 data directories / 6 scaffolds"。
- `inspect-bundle.mjs` 的 `REQUIRED` 不含 `_scripts/`（non-authority 不进 required shape）；
  已有 `cross-bundle-reference-scan.mjs` 接入 inspect 输出诊断（BUI-003 先例）。
- `rb_templates/_scripts/README.md.tmpl` 是 instantiation 时写入 bundle 的脚本区说明。
- `openspec/specs/bundle/bundle-data-isolation` BUI-002 的 "including" 路径列表为示例性列举，
  `_tmp/` 语义由本 change 新 capability 直接拥有，不改 BUI requirement。

## Goals / Non-Goals

Goals:
- 每个 run bundle 拥有 `_tmp/`（instantiation scaffold + README），作为 run-scoped 中间产物
  唯一合法落点；规则/playbook/README 统一指向它。
- 提供 `stagingFile(slug, kind)` helper，脚本用它计算 bundle 内 staging 路径。
- inspect-bundle 只读扫描 `_scripts/*.mjs` 硬编码 `/tmp/` 写路径并报告诊断。
- 本 change 的框架代码、模板、规则、测试同步落地。

Non-Goals:
- 不迁移/重建既有 bundle（如现场 bundle 的 `_cache/run-staging/` 与 `/tmp/` 残留）——那是
  run 内 recovery 决策，不是框架 change 的范围。
- 不把 `_tmp/` 加入 inspect required shape 或任何 gate——它是 non-authority 运行时区域。
- 不新增状态机、不新增 gate、不新增 CLI 命令（扫描复用 inspect-bundle 输出面）。

## Decisions

### D1: `_tmp/` 位于 bundle root，instantiation 时 scaffold

`_tmp/` 与 `_scripts/`、`_logs/`、`_cache/` 平级，随 bundle 归档。instantiation 的 `dirs` 数组
加 `_tmp`，templates 映射加 `{ tmpl: '_tmp/README.md.tmpl', dest: '_tmp/README.md' }`，成功报告
行更新为 11 data directories / 7 scaffolds（与现状文案一致地递增）。

- 备选：`_cache/run-staging/`（bug 文件原始建议）——被用户否决：`_cache/` 语义是"可清理的网络
  原始内容缓存"，`_tmp/` 语义更直白、目录名一眼即知临时、与 `_scripts/` 平级更醒目。
- 备选：`_scripts/_staging/`——混在脚本目录里不够醒目，且 `_scripts/` 是"脚本"不是"数据"。
- 决定：bundle root `_tmp/`。直接 Source of Record：bundle 自身文件系统；最短合法闭环：脚本把
  中间产物直接写进 bundle `_tmp/`，无需额外登记。

### D2: staging helper 为纯函数，独立于脚本存放位置

`DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs` 导出：
- `stagingFile(bundleRoot, slug, kind)`：返回 `join(bundleRoot, '_tmp', `${kind}-${slug}.json`)`；
  对 slug/kind 做 sanitize（拒绝/中和路径分隔符与 traversal，保证结果停留在 `_tmp/` 内）。
- `scanHardcodedSystemTmpWrites(bundleRoot)`：只读遍历 `_scripts/*.mjs`，匹配写目标形态的
  `/tmp/` 字符串字面量（如 `'/tmp/enrich-'`、`"/tmp/wave0-..."`），返回 `{file, literal, line}`
  列表。纯函数，无副作用，可单测。

- 备选：把 helper 塞进每份 executor 模板——重复、难维护、无单测面。
- 决定：engine/helpers 纯函数，脚本 `import` 使用；helper 本身属于框架（reusable asset），
  脚本仍放 bundle `_scripts/`（符合既有边界）。

### D3: inspect-bundle 接入扫描，诊断分级沿用 BUI-003 先例

`inspect-bundle.mjs` 在默认结构输出路径调用 `scanHardcodedSystemTmpWrites(bundleDir)`，把命中
作为 `run-scoped-tmp diagnostic` 打印（命名文件与 offending literal）。命中位于当前选中 bundle
的 `_scripts/` → active-bundle diagnostic（当前 run surface）；无法关联当前 run 的命中（本 change
不存在该路径，保留分级接口）→ cleanup。扫描是只读诊断：不改写脚本、不改变无关 surface 的
exit 语义。

- 备选：新独立 CLI（如 `validate-run-tmp.mjs`）——引入新命令面，违反"最短合法闭环"；
  inspect 已有诊断输出面与 BUI-003 先例，复用。
- 决定：inspect 接入，复用 `cross-bundle-reference-scan` 的接入模式。
- 边界说明：RUS-002 的禁止面是"系统 `/tmp/`、repo 根、`DEEP_RESEARCH_HARNESS/`"三条规则文本
  （Agent 义务，写入 playbook/README/AGENTS.md）；本 change 的机器扫描（RUS-004）只聚焦
  系统 `/tmp/` 写路径——这是 bug 现场的实际形态（114 个 `/tmp/` 文件）。repo-root 的
  runtime-looking 泄漏诊断已由 BUI-002 的 `repoRootRuntimeLeakDiagnostics` 覆盖，本 change
  不重复实现；repo-root 非 runtime 形态的脚本中间产物写路径由规则文本约束，无机器诊断，
  与 BUI-003 的"语义引用扫描看不到的内容仍是 Agent 义务"同型。

### D4: 文档同步面

- `rb_templates/_tmp/README.md.tmpl`（新）：声明"这是本 run 的临时目录；run-scoped 脚本的中间
  产物写这里；随 bundle 归档；禁止用系统 `/tmp/`（不归档、跨 run 串信息）"。
- `rb_templates/_scripts/README.md.tmpl`：补"中间产物写 bundle `_tmp/`，禁止 `/tmp/`"规则。
- `command_playbook/instantiate-run-bundle.md`：描述 `_tmp/` 为 run-scoped 临时产物落点。
- repo 根 `AGENTS.md` Hard Rules 与 `DEEP_RESEARCH_HARNESS/README.md` 目录性质段：补同向规则，
  不重述 spec（规则指向 capability，行为由 spec 拥有）。

### D5: 责任边界（helper-oriented）

- Engine（确定性）：scaffold `_tmp/`、提供 stagingFile、inspect 扫描诊断。是 Engine verdict
  面（诊断事实），不 orchestrate 语义工作。
- Agent（执行）：run-scoped 脚本把中间产物写 bundle `_tmp/`，遵循 README/playbook；扫描命中时
  按诊断修复（改路径或迁移），属 authorized Agent repair。
- User：无新 permission；位置约定是机械事实，由 Engine 文档化与诊断，不创造 human-directed
  capability。

## Risks / Trade-offs

- [既有 bundle 脚本仍含 `/tmp/` 写路径，inspect 会报 active diagnostic] → 本 change 只确立
  契约与诊断，不自动改写现场；recovery/修复是 run 内 Agent 决策（bug 文件已建议 `_tmp/` 采纳
  路径）。诊断只读，不阻塞无关 surface。
- [扫描是静态文本匹配，可能漏掉拼接/变量形式] → 匹配写目标形态的字面量（含引号包裹、拼接
  语境），并把它定位为"diagnostic 而非 gate"：漏报不破坏正确行为，命中即告警。
- [`_tmp/` 与 `_cache/` 语义重叠风险] → README 明确区分：`_cache/` 是 sub-agent 网络原始内容
  缓存（有 wave 结构契约），`_tmp/` 是脚本中间产物（自由 staging）；两者都是 non-authority。

## Migration Plan

- 框架代码即时生效：新 bundle 自动带 `_tmp/`；inspect 对新老 bundle 均跑扫描。
- 既有 bundle 不迁移（Non-Goal）；后续 run 若需采纳 `/tmp/` 残留，按 recovery 路径与
  `_tmp/` README 指引执行。
- 回滚：本 change 无状态迁移，撤销提交即可恢复；`_tmp/` 缺失不影响 inspect required shape，
  老 bundle 不因缺 `_tmp/` 失败。

## Open Questions

无（位置约定、helper 形态、扫描接入点均由用户决策与既有先例确定）。
