# Design: repair-doc-and-governance-drift-and-machine-gaps

## Goals

让文档/治理面重新与机器事实对齐，并把残余的"文档纪律"缝补成"机器纪律"：修 15 处 findings（F-01、F-02、F-04~F-08、F-12~F-19），全部为文档措辞、spec 指针与只读检查脚本；不改变任何 Engine/CLI/gate/runtime 行为。

## Non-Goals

- 不改 `transitions.chain.json` 数据、不改任何 CLI/gate/schema 行为。
- 不做 P2（CLI exit helper 统一、god module 拆分、spec 长度治理）。
- 不迁移 playbook 语言（只加约定声明 + 单点归一）。

## Decisions

### D1 — workflows/README.md chain 表述（F-01）

`workflows/README.md:38` 原文：

> Chain 只编码 `passed` 分支的 normal next。`failed`、`rerun` 等 branch 路由归 Agent decision authority，不编码进 chain。

替换为：

> Chain 是故意稀疏的静态映射表：编码 `passed` 与已声明的 `rerun` 分支的 normal next（当前仅 `phases/phase-hitl2.md` 编码 `rerun` → `phases/phase-rerun.md`）。未编码的分支（`failed`、未知 state、未列出的 node）归 Agent decision authority，查表返回 `found: false`，不新增 chain 语义。

配套：`engine/transition-table` delta（已写）同步 key/state 语义；新增 drift 测试断言 README 不再含「只编码 `passed` 分支」过期句且含新表述，并断言 chain 文件中的每个 state 值 ∈ {passed, rerun}。

### D2 — RUN.md 注解与反 fallback 句（F-02/F-04）

`RUN.md:38` 把「CLI-verb spelling」括号注解替换为：

> （work-unit 面 closed enum，部分值即 CLI 动词拼写；值→动词映射以 `engine/work-unit-repair-vocabulary.mjs` 的 `REPAIR_KIND_CLI_VERB` 与下方决策表为准）

`RUN.md:59` 在「…即报告 `unsupported_current_entry_contract` 并停止。」之后插入：

> preflight 失败不等于「没有 explicit candidate」——禁止因此 fallback 读 `RUN.md`、新建或另选 bundle；只有用户从一开始就没有提供任何 existing candidate 时才读 `RUN.md`。

### D3 — harness README.md 入口指针消歧（F-04）

`DEEP_RESEARCH_HARNESS/README.md:31` 在「显式 candidate 缺少任一文件即以 `unsupported_current_entry_contract` 停止。」之后插入与 D2 相同的反 fallback 句。

### D4 — retire 孤儿 playbook（F-05）

删除 `DEEP_RESEARCH_HARNESS/command_playbook/plan-hostfile-sections.md`。已核实：全仓库无指针指向它；renderer 指引已由 `COMMANDS.md:69`（HITL1 controls renderer 行）与 `phase-hitl1.md` 内联命令覆盖。`COMMANDS.md` 不引用该 playbook 行，无索引更新。

### D5 — persist-artifact.md 两个完整形态（F-06）

`persist-artifact.md:76-80` 的 `(--expect-absent | --expect-sha256 <digest>)` 形态替换为两个完整命令：

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist-final-report --bundle <path> --source <file> --target <final/non-primary.md> --expect-absent
node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist-final-report --bundle <path> --source <file> --target <final/non-primary.md> --expect-sha256 <digest>
```

`COMMANDS.md:50` 的清单行保留紧凑记法（它是索引表不是复制面），设计如此，不展开。

### D6 — COMMANDS.md verb 清单 + operate-work-unit.mjs 头注释（F-07）

`COMMANDS.md:89` 的 verb 清单在 `` `timeout` `` 之后插入 `` `timeout-preflight` ``（命令已实现于 `cli/operate-work-unit.mjs:219-227`）。`cli/operate-work-unit.mjs:3` 头注释删除「terminal commands are added in later apply sections」过期句，改为对当前 verb 全集的准确描述（apply 时按文件实际第 3 行文本替换）。

### D7 — 语言约定全局声明（F-08）

根 `README.md` 「Start Here」节末尾加一条 bullet：

> - 语言约定（全仓库控制面）：精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文，同一控制面内不混用两套主语言。新写的推理正文用中文；已有英文控制面逐步归一，不强行一次全改。

`command_playbook/post-final-recovery.md:69` 句末中文句并入该文档主语言（英文），原文语义不变。

### D8 — model 文档去规范性 MUST（F-15）

`openspec/guidance/models/` 中全部 5 个含 MUST 的 model 文档（`agentic-execution-model.md` §8、`agentic-queue-mechanism.md` §8、`agentic-subagent-mechanism.md` §8、`agentic-workflow-mechanism.md`（内联 MUST bullets 与 MUST NOT 表）、`framework-runtime-boundary.md`（:226 及 :248-256 内联 MUST））改写：删除/改写规范性 MUST/MUST-NOT 表述为描述性约定句式，各文件保留原事实内容与路径引用，并在相关节注明「术语纪律；规范效力以 accepted spec 为准」（例如 execution-model 指向 `agent/delegated-work-units` 与 `engine/check-inspect-feedback`）。新增 `tests/integration/md/model-docs-normative-language.test.mjs`：扫描 `openspec/guidance/models/*.md`，出现 `MUST` 或 `MUST NOT` token 即失败（零例外，比 GCO-009 的 quoted-pointer 下限更严——实现取最严口径，消除正则吞并歧义）（GCO-009 的确定性覆盖）。

### D9 — RET-006 指针化 + 断句重排（F-12/F-16）

`governance/requirement-traceability` 的 RET-006 由 delta（已写）替换为 finalizer `CheckSchema` 指针版本；主 spec 同步后不再存在手抄 5 项清单。RET-001 块内的断句（`:77-93`）做纯重排：把 `--check-prefix` 段落与其 scenario 移到「silently broadening the selected archive scope.」句子完成之后，无任何 requirement 语义变化（结构性 repair task，不进 delta）。

### D10 — check-all.mjs（F-14）

`openspec/governance/check-all.mjs`：枚举 `openspec/governance/check-*.mjs`，逐个 spawn。无 `--change` 时只跑无需 per-change 输入的检查（含新增的 check-guidance-requirement-ids）；带 `--change <name>` 时对需要 change 的检查（`check-capability-discovery`、`check-semantic-closure`、`check-verification-routing`）透传该参数并以 plan 模式运行。每行输出 `PASS|FAIL|SKIPPED(requires --change) <script>`，聚合 exit：任一 FAIL → 1，全部 PASS/SKIPPED → 0。只读：绝不 spawn finalizer、不写文件。`package.json` 加 `"governance:check": "node openspec/governance/check-all.mjs"`。RET-007 的场景由 `tests/governance/check-all.test.mjs` 覆盖（假 FAIL 注入与只读断言）。

### D11 — check-guidance-requirement-ids.mjs（F-13）

新 checker：扫描 `openspec/guidance/`、`openspec/operations/`、`openspec/constitution/` 的 `.md`，提取 `[A-Z]{3}-\d{3}` token（跳过 code fence 内 registry 自引？不——宪法/operations 无 registry 自引；跳过 `req-registry.yaml` 本身与 `openspec/changes/`），对照 `req-registry.yaml` 全部注册 ID（alive + DEPRECATED），未注册即 FAIL 并报 `file:token`。注册进 finalizer `CheckSchema`（新的一步，位于 check-spec-req-ids 之后）。`tests/governance/` 覆盖真实树 PASS + 注入单处违规 FAIL。

### D12 — check-project-specs.mjs H1 检查（F-18）

在现有四检查基础上加 `missingH1`/`duplicateH1`：main spec 文件第一行非 `# ` 开头 → `missingH1`；多于一个 H1 → `duplicateH1`。结果词汇并入该 checker 现有输出与 `tests/governance` 覆盖。

### D13 — root hard-rule 三面一致性测试（F-19）

`tests/integration/md/root-hard-rule-surface-sync.test.mjs`：断言根 `README.md`（Rules In One Screen）、`AGENTS.md`、`CLAUDE.md` 三面在机器可查关键事实上一致：`Node.js >=20`、ESM/`.mjs`、无 TypeScript/无 Python、`zod`/`yaml`、`node:test`/`node:assert`、`tests/` 放置、`_old_topics` 勿读。当前根 README 缺「No TypeScript / No Python」事实——修复 = 在 README Rules In One Screen 补该行（三面一致而非删测试）。GCO-008 新增 scenario 的覆盖实现。

### D14 — catalog 声明（F-17）

`openspec/specs/README.md` 头部（`# Capability Catalog` 之后）加一段：

> 本 catalog 列出的 capability 行即当前 **accepted** capabilities；历史或废弃 capability 不在此列出——历史 change 记录在 `openspec/changes/archive/`，废弃 requirement ID 保留在 `openspec/governance/req-registry.yaml` 的 `[DEPRECATED]` 组。Catalog 只用于导航，main spec 仍是 behavior authority。

### D15 — main spec 结构卫生（F-16）

- `openspec/specs/bundle/run-entry/spec.md` 首行前加 `# run-entry`（capability 名作 H1，与 `requirement-traceability` 主 spec 的现有惯例一致）。
- `openspec/specs/governance/version-management/spec.md` 首行前加 `# version-management`。
- RET-001 断句重排（见 D9）。
以上均为结构性 repair，无 requirement 语义变化，在 apply 的 spec-sync task 组内完成。

## Requirement → 实现映射

| Delta requirement | 实现 surface |
|---|---|
| TRT-002 MODIFIED | `openspec/specs/engine/transition-table/spec.md`（sync）+ `workflows/README.md` D1 + drift 测试 |
| RET-006 MODIFIED | `requirement-traceability` 主 spec（sync）；finalizer 不另改（指针指向它） |
| RET-007 ADDED（check-all） | `openspec/governance/check-all.mjs` + `package.json` + `tests/governance/check-all.test.mjs` |
| RET-008 ADDED（catalog 声明） | `openspec/specs/README.md` D14 + 断言测试 |
| RET-009 ADDED（H1） | `check-project-specs.mjs` 扩展 + D15 补 H1 + `tests/governance` 覆盖 |
| RET-010 ADDED（guidance ID 校验） | `check-guidance-requirement-ids.mjs` + finalizer 注册 + `tests/governance` 覆盖 |
| GCO-008 MODIFIED（hard-rule sync） | `tests/integration/md/root-hard-rule-surface-sync.test.mjs` D13 |
| GCO-009 ADDED（model 无 MUST） | `agentic-execution-model.md` D8 + `model-docs-normative-language.test.mjs` |

## 简化与语义反思

- 唯一新具名 surface：`check-all.mjs` 与 `check-guidance-requirement-ids.mjs`——都是只读诊断，读者是有界问题（治理健康是否全绿 / guidance 是否引用幽灵 ID），停止点 = 逐项 verdict + repair 坐标，不自动修复、不授 authority。
- Net simplification：删手抄清单、删过期句、删孤儿 playbook、删 model 规范性节；新增 5 个只读检查面，全部有确定修复坐标。
- 责任边界：检查器不改变 finalizer 的 archive 权威；`check-all` 明确不是归档入口；Agent 承担文档机械修复，user decision 面零变化。
