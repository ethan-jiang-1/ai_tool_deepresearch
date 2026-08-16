# Proposal: add-doc-code-drift-guards

## Why

证据文件 Part I §6 的结论:FM-1(spec/指引内容漂移)的**格式**已被机器检查,但**内容**(散文里的路径、CLI 名、exit code、gate 规则清单)只靠一次性人工审计(spec-reality-sync),下一次 rename/layout 变更可以再次静默漂移而无 checker 兜底;所有 governance checkers 只在 OpenSpec 流程内被调用,无任何自动接线。本 change(C3)把"人肉审计"变成**永久检查**:新增内容漂移 checker、propose 链减税(`--check-prefix` 前缀查询,免通读 963 行 req-registry)、静态扩展 exit-code inventory。**用户已拍板:不做 pre-commit hook**(远程 CI 沿用既有边界也不做),接线决定项闭环为"不接线,只交付 checker"。

## What Changes

- **内容漂移检查器**(新 `openspec/governance/check-content-drift.mjs`,确定性、Node 内置依赖):
  1. **路径漂移**:扫描 guidance/spec/harness 文档散文中的反引号相对路径(`openspec/`、`docs/`、`tests/`、`DEEP_RESEARCH_HARNESS/`、以及 harness 内相对坐标 `command_playbook/`/`cli/`/`engine/`/`workflows/`),断言目标存在;跳过 bundle-runtime 路径(`rb_*`、`_work_units/`、`_cache/`、`_logs/`、`final/`、`reference/`、`artifacts/`、`dpt_*`)、模板占位符(`<...>`)与 `@deprecated`/历史锚点标注。
  2. **CLI 名漂移**:prose 中 `cli/<tool>.mjs` 引用必须存在(路径检查覆盖);`COMMANDS.md` 命令索引的动词与工具的 dispatch 保持一致(动词词面必须出现在工具源码)。
  3. **gate 清单漂移(H8)**:`shared-gate-rules.md` 的 gate 表行与 `schema/gate_definitions/gate-*.definition.json` 的 gate 集合双向覆盖——任一方向缺失即失败。
- **exit-code inventory 静态扩展**:`tests/integration/cli/exit-code-convention.test.mjs` 增加静态扫描——对每个 inventoried CLI 提取源码 `process.exit(N)` 字面量,断言与文档 class(二进制 0/1 vs tri-state 含 2)一致(embryo 扩展)。
- **propose 链减税(H2)**:`check-project-reqs.mjs` 新增 `--check-prefix <ABC>`——按前缀查询 live 映射(capability path)、该前缀全部 requirement ID 与三态(alive/pending/retired),不再要求通读 963 行 registry。
- **finalizer 接线**:`finalize-change-archive.mjs` 在 semantic-closure 之后、native archive 之前串入 `check-content-drift`(与既有 checker 并列,失败即 block)。
- **pre-commit hook:不做**(用户拍板,记录为 closed decision item;不写脚本、不设 core.hooksPath)。

## Capabilities

### New Capabilities

无。全部为既有 capability 的 MODIFIED requirement(仓库先例:不建 requirement-reservation)。

### Modified Capabilities

- `governance/requirement-traceability`:MODIFY RET-001(`--check-prefix` 前缀查询接口);MODIFY RET-006(hard-gate 清单加入内容漂移 checker + finalizer 接线;pre-commit hook 决定项记录为不接线)。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `governance/requirement-traceability` | RET-001 现文(prefixes 映射与 check-project-reqs 模式);RET-006 现文(hard-gate checker 清单);H2(963 行 registry) | Modify | registry 查询接口与 hard-gate checker 清单的 owner;`--check-prefix` 与内容漂移 checker 均落此 |
| `verification/verification-routing` | VER-005(:209 知识面引用不复制);H8 | Excluded | 知识面"引用而非复制"契约已由 VER-005 + `verification-routing-knowledge-surfaces.test.mjs` 锁定;C3 只加 gate 清单覆盖检查(改 checker,不改该 spec) |
| `engine/cli-exit-code-conventions` | CLE-004 现文;exit-code inventory 测试 | Excluded | exit-code 静态扫描是既有回归的扩展(apply 侧),CLE-004 已拥有 inventory 契约,无需 spec 变化 |
| `governance/change-feedback-loop` | finalizer 接线点 | Excluded | finalizer 接线是 RET-006 的机制细节,不需要 change-feedback-loop spec 变化 |
| `governance/semantic-fact-closure` | finalizer 接线点 | Excluded | finalizer 接线是 RET-006 的机制细节,不需要 semantic-fact-closure spec 变化 |

## Impact

- **新增**:`openspec/governance/check-content-drift.mjs`、`tests/governance/check-content-drift.test.mjs`、`tests/integration/governance/check-content-drift.test.mjs`(对真实文档跑)。
- **修改**:`openspec/governance/check-project-reqs.mjs`(`--check-prefix`)、`openspec/governance/finalize-change-archive.mjs`(串入新 checker)、`tests/integration/cli/exit-code-convention.test.mjs`(静态扫描扩展)。
- **spec**:1 个 delta(`governance/requirement-traceability`,RET-001 + RET-006 两个 MODIFIED requirement)。
- **无影响**:不改 Engine 行为、不改 schema、不新增 hook/CI、不新增 lifecycle state。

## 语义反思(semantic-precision)

- **内容漂移 checker**:读者 = 维护者/OpenSpec 流程;有界问题 = "散文里写的路径/CLI/gate 清单是否与当前树一致";停止点 = 确定性失败点名文件与引用,不再需要人肉 grep 对比。
- **`--check-prefix`**:读者 = propose 阶段 Agent;有界问题 = "前缀 ABC 对应哪个 capability、哪些 ID、什么状态";停止点 = 输出该前缀的完整注册事实,不输出无关 900+ 行。

## 简洁准入两问(simple-reliable-control)

1. **direct Source of Record**:散文路径的真相 = 文件系统;CLI 名的真相 = `cli/` 目录 + 工具源码;gate 清单的真相 = `gate_definitions/*.definition.json`;exit code 的真相 = 源码 `process.exit` 字面量。每项检查都是"散文 ↔ 单一真相"一步对照。
2. **最短合法闭环 + net simplification**:一个 checker 覆盖四类漂移(路径/CLI/gate/exit-code 静态部分),复用既有 inventory 测试胚胎;`--check-prefix` 把 propose 预读从 963 行降到一行查询。未新增 hook、CI、controller 或并行流程。

## 责任边界(user decision / Agent execution / Engine verdict)

- **User decision(已拍板,记录于本 proposal)**:pre-commit hook = 不做(只交付 checker;远程 CI 沿用 `semantic-fact-closure-openspec-governance` 的"不在范围"边界)。
- **Agent execution**:按 checker 输出修复漂移(apply 时若 checker 对现存文档报错,以树为准修复散文或修正 checker 规则,升级用户当冲突无法判定)。
- **Engine verdict**:checker 的路径/CLI/gate/exit-code 判定全部确定性;finalizer 把它作为 hard gate。
