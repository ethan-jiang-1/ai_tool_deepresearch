# Proposal: harden-test-lane-signal-hygiene

## Why

全量回归套件在受限/满载环境下会产生误导性失败信号，且无成文处置规则：2026-08-31 实测同一工作树两次全量 `npm test`，一次受压跑出 2880 tests / **16 fail / 4 cancelled / ~2h04m**，干净复跑 **2879 pass / 1 fail / ~155s**（与 `tests/README.md` 既有 ~139s 基线吻合）；唯一失败 `tests/integration/governance/check-all.test.mjs` 的 "check-all aggregation entry (RET-007)"（`subtestsFailed`）在**孤立重跑时 3/3 pass**——是负载敏感伪影，不是回归。coding agent（或人）见到满载红套件时，当前没有任何 owner 文档告诉它"先孤立复跑再定性"，存在把伪影当回归去"修"、或把真回归当伪影漏掉的双向风险。另外 `tests/.test-tmp/`、`tests/.test-bundles/` 一次性产物（gitignored、~3900 文件）持续堆积，干扰文件发现工具且无清理入口。

需求来源：`_backlog/plans/test-signal-and-guidance-wording-hygiene.md` C1（2026-08-31 coding-agent 可读性评估会话，用户确认的摩擦点 #6 与 #5b）；失败测量数据来自该会话两次全量套件运行与孤立复跑。

## What Changes

- `tests/README.md` 新增「满载失败 triage」小节：subprocess 密集套件（如 check-all aggregation）在满载并行下可能超时级联；失败文件**必须先孤立复跑**（`node --test tests/path/to/file.test.mjs`）再定性——孤立通过 = 资源竞争伪影，不据此判回归、不据此修改被锁行为；孤立仍红 = 真回归信号。该文件是 `verification-routing-knowledge-surfaces` 锁清单成员，本变更为纯增量，不触碰既有 verification-routing 指针行。
- `tests/integration/governance/check-all.test.mjs` deflake：降低其对满载环境的敏感度（提高内部耗时容忍 / 减少重复 subprocess 开销，方案在 design 期按实测选定）。**硬边界：该文件对 RET-007 行为的锁定断言不得弱化或删除**——只动耗时容忍与进程开销，不动锁了什么。
- `package.json` 新增 `test:clean` script：删除 `tests/.test-tmp/`、`tests/.test-bundles/` 等 `.gitignore` 已声明的一次性 `.test*` 产物目录；纯删除已忽略产物，不触碰 `tests/fixtures/` 与任何版本库文件。`tests/README.md` 同步一行用法。

### 不产出（防 scope creep）

- 不改 `check-all.mjs` 及任何 governance checker 的行为或输出。
- 不改任何被锁定的测试断言对象（RET-007 聚合断言的语义保持原样）。
- 不做测试并行度/分片策略调整（`test:shard` 已有，不在本 change 范围）。
- 不引入新依赖（Node 内置 `node:fs` 即可）。
- 不动 `verification-routing` 四类测试分类语义。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——本 change 无 spec-level 行为变更，故 `.openspec.yaml` 声明 `skip_specs: true`；delta-spec 不适用的原因：全部产出为测试内码耗时容忍、包管理 script 与 `tests/README.md` 操作文档，不新增、不修改、不移除任何 accepted requirement 的 observable behavior。）

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md`（INT-001，仅拥有 validate-bundle/inspect-bundle 集成测试行为） | Excluded | 本 change 不触碰这两个 CLI 的集成测试；回归套件运行特性不在该 capability 契约内 |
| `governance/requirement-traceability` | `openspec/specs/governance/requirement-traceability/spec.md`（RET-007 check-all 聚合）+ 其验证资产 `tests/integration/governance/check-all.test.mjs` | Verify-only | 本 change 修改该 capability 验证资产的内码（耗时容忍），不改变其锁定的 RET-007 断言语义；以治理套件仍全绿作 verify 证据，无需 delta |
| `verification/verification-routing` | `tests/integration/md/verification-routing-knowledge-surfaces.test.mjs`（`tests/README.md` 为 POINTER_SURFACES 成员） | Excluded | tests/README 纯增量编辑，"必须指向 verification-routing"断言保持满足；不改变任何测试分类或 proof permission |

## Source of Record 与责任边界

- **Direct Source of Record**：测试失败定性规则落 `tests/README.md`（测试层运行文档的 owner）；`test:clean` 的可删产物口径以 `.gitignore` 的 `tests/**/.test*` 段为唯一参照，不在文档里另立第二清单。
- **最短合法闭环**：满载红 → 孤立复跑同一文件 → 红/绿直接定性，无新增检查器、无新增状态、无第二 verdict。
- **Net simplification**：删除一条歧义（满载红如何定性）并把既有散落事实（gitignore 产物口径）收敛为一个 script；不新增任何控制层。
- **责任边界**：Engine/`node:test` 仍拥有全部 deterministic verdict；`test:clean` 是 Agent/人执行的普通 mechanical script，不做语义判断；triage 规则是给 Agent 的操作指引，不创设新 lifecycle 状态或权限。
- **Semantic-precision reflection（`test:clean` 为新增具名 command）**：读者（coding-agent/人）的有界问题 = "哪些盘上产物可以安全删除"；必须保留的区别 = 一次性测试产物（`.gitignore` 已声明）vs fixtures vs 版本库文件；正常推理停止点 = script 只删除与 `.gitignore` `tests/**/.test*` 口径一致的目录，其余一律不动。

## Impact

- 受影响文件：`tests/README.md`、`tests/integration/governance/check-all.test.mjs`、`package.json`、新增 `tests/engine/test-clean-script-contract.test.mjs`（`test:clean` 的静态口径契约，见 design D3；不新增独立清理脚本文件）。
- 不影响 `DEEP_RESEARCH_HARNESS/`（框架零改动）、不影响任何 CLI/schema/engine 契约。
- 全量 `npm test` 与 `npm run governance:check` 为本 change 验收面；满载下的失败定性按新 triage 规则执行。
