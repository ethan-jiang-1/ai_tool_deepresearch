# Proposal: add-code-impl-registry-guard

## Why

代码 `@impl` 标注是项目级约定（`openspec/config.yaml` specs rules：「实现代码中用 `// @impl <REQ-ID>` 标注」），但仓库没有任何确定性覆盖校验代码面上的 requirement ID 是否解析到 `openspec/governance/req-registry.yaml`：RET-010（Requirement IDs in guidance prose resolve against the registry）只扫 `openspec/guidance/`、`openspec/operations/`、`openspec/constitution/` 三个 prose 面并显式排除其它面；`check-spec-req-ids.mjs` 只扫 main spec 的 `> req:` 头。实测（2026-08-31，propose 前只读测量）：三代码面合计 644 个 `.mjs`（`DEEP_RESEARCH_HARNESS/` 133、`openspec/governance/` 11、`tests/` 500），跨面去重后 404 个唯一 requirement-ID token；对照 registry 675 条注册 ID，未解析 token 仅 `BUG-018`（bug 命名空间，非 requirement ID，有 `_backlog/_done/_fixed_bugs/` 归属）。数据面今天干净，但没有守卫——一个 typo 或幽灵 ID 可以静默进入代码，CLS-080 C1（COMMANDS.md 手写 gate 链漂移、无 checker 能拦）是同型先例。

需求来源：coding-agent 全仓可读性评估会话（用户确认的困惑点 5「spec 与代码不是一一映射」）；既有修复谱系登记见 `_backlog/_done/_closed_plans/spec-semantic-drift-remediation.md` §4（元层面治理触发条件）与 `_backlog/_done/_closed_plans/control-surface-drift-density-and-module-boundaries.md` C1（防再发 guard 先例）。

## What Changes

- 新增 governance checker `openspec/governance/check-code-impl-ids.mjs`：扫描三个 first-party 代码面（`DEEP_RESEARCH_HARNESS/`、`openspec/governance/`、`tests/` 下全部 `*.mjs`）中含 `@impl` 标记的行，校验行内 `[A-Z]{3}-\d{3}` token（排除 `BUG-` 命名空间，与 `check-project-reqs.mjs` 的 `BUG_ID_RE` 排除一致）均解析到 registry（alive 或 `[DEPRECATED]` 条目均可解析）。违例输出 file + token + 最近修复路径，exit 1；clean 输出统计，exit 0；用法错误 exit 2（遵循 `engine/cli-exit-code-conventions`）。
- `check-all.mjs` 按既有 `check-*.mjs` 命名约定自动发现并纳入聚合治理健康入口，零注册改动。
- **Modify** `governance/requirement-traceability`：ADDED 一条 requirement「Requirement IDs in code implementation tags resolve against the registry」+ 3 个 scenario；新 ID `RET-011` 于 Apply 期同步进 registry（propose 期不预登记 live ID）。
- 新增 `tests/governance/code-impl-ids-guard.test.mjs`（真实树 green 基线 + 聚合入口发现）与 `tests/governance/code-impl-ids-fixture-contract.test.mjs`（fixture 化 red/green 契约：BUG- 排除、DEPRECATED 可解析、registry 缺失 fail-closed、unregistered 点名 file+token）；两文件拆分使每个 asset path 的 verification route identity 一致。

本 change **不产出**（防 scope creep）：

- 不建任何 capability→file 的永久静态投影目录或手写对照表（GSK-011 姿态：派生证据、不建永久目录；`simple-reliable-control` 纪律）。
- 不校验 `BUG-` 命名空间（归 `_backlog` bug 流程管，超出 requirement identity 边界）。
- 不扫 MD prose（RET-010 已有）与 spec `> req:` 头（`check-spec-req-ids.mjs` 已有）；不扫 `openspec/changes/`、`scripts/`、`experiments_env/`、`experiments_playbook/` 与任何 bundle/归档路径。
- 零运行时行为变更：不触碰 `DEEP_RESEARCH_HARNESS/` 既有引擎/CLI 代码，不改任何 accepted spec 的既有 requirement。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `governance/requirement-traceability` — 该 capability 拥有「requirement registry、ID 校验、discovery discipline；Node validates IDs, paths, catalog structure」边界。RET-010 已确立「ID token → registry 解析覆盖」这一 requirement 形态（guidance prose 面）；本 change 在同一 capability 内以同一形态新增代码 `@impl` 面覆盖。新 ID `RET-011`（RET 组内数字序递增，符合 RET-004）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `governance/requirement-traceability` | `openspec/specs/governance/requirement-traceability/spec.md` 全文（RET-001…RET-010）；RET-010 显式限定 prose 面并排除非 prose 面 | Modify | 新 requirement 与 RET-010 同构（ID token→registry 解析覆盖），surface 不同（代码 `@impl` 行 vs guidance prose）；spec Purpose 明确「check 脚本」属于本 capability 的可验证基础设施 |
| `governance/semantic-fact-closure` | `openspec/governance/semantic-fact-families.yaml` 全部 22 个 family 全读 | Excluded | 本 change 不触碰任何 cataloged family 的 resolver / establishing surface / verdict consumer；`semantic-closure.yaml` 记 `not_applicable`（理由见该 record） |
| `governance/change-feedback-loop` | `openspec/operations/change-feedback-loop.md`；先例 change 的 tasks §0 marker 结构 | Excluded | 本 change 使用 feedback lifecycle markers，但不修改该 capability 的任何行为 |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md` 存在性 + `check-spec-req-ids.mjs` 既有 exit 0/1/2 先例 | Verify-only | 新 checker 遵循既有 0/1/2 约定，不修改该契约本身 |

## 责任边界

- **Engine verdict**：checker 的确定性 pass/fail（violation 输出 file + token + 最近修复路径）；这是纯派生校验，registry 仍是 ID 的唯一 Source of Record，checker 不持有第二份 ID 清单。
- **Agent execution**：按输出修复 tag（typo → 改正）或走合法 lifecycle 路径注册 ID；repair 后 rerun 同一 check。
- **User decision**：本 change 不新增任何 user decision 点，不创造 permission 或 capability。

## Semantic-Precision Reflection

- **读者与有界问题**：读者是改动 first-party 代码的 coding agent；有界问题：「哪些 `@impl` 行引用了 registry 无法解析的 requirement ID？」输出点名 file + token + 修复路径后即停。
- **必须保留的区别**：(1) prose 覆盖（RET-010，MD 文件）≠ 代码 tag 覆盖（本 change，`.mjs` 文件）——两个 surface、同一解析事实；(2) spec `> req:` 头校验（`check-spec-req-ids.mjs`）≠ `@impl` 行校验；(3) `BUG-` 命名空间排除与 `check-project-reqs.mjs` `BUG_ID_RE` 完全一致；(4) `[DEPRECATED]` ID 在代码历史标注中保持可解析（镜像 RET-010 的 deprecated scenario），但 checker 不授予其任何 live authority。
- **正常推理停止点**：checker 报告违例坐标与修复方向后停止；修复语义（改 tag 还是注册 ID）由 Agent 按 lifecycle 判定，checker 不替 Agent 决定。
- **不引入新具名概念**：复用既有词汇（`@impl` 标注、req-registry、governance check、aggregated governance health entry），不发明新术语。

## Source of Record / 最短合法闭环 / Net Simplification

- **Direct Source of Record**：`req-registry.yaml` 仍是 requirement ID 唯一真相源；checker 从 registry + 代码现场派生违例，不维护任何 ID 副本（与 `COMMANDS.md`「文档不另立手写对照表」同一纪律）。
- **最短合法闭环**：violation 输出（file + token + repair hint）→ Agent 修复或注册 → rerun 同一 check → exit 0。
- **Net simplification impact**：新增 1 个 focused checker 文件（`check-all.mjs` 按命名约定自动发现，零注册成本）+ 1 个测试文件 + 1 条 requirement。换来的是把「幽灵 ID 静默进入代码」这条现实漂移路径关进确定性防护（CLS-080 C1 已证明这类 prose/token 漂移无 checker 时必然复发）。不新增目录、不新增注册流程、不新增依赖。
