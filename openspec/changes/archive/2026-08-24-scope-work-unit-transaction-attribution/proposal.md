# Scope Work-Unit Transaction Attribution

## Why

`_backlog/bugs/BUG-239-wave1-submit-suspect-on-concurrent-receipt-write.md`
（2026-08-24 真实 run `dpt_rb_ai-coding-evolution`）：Wave1 合法并行执行多个
delegated work unit，每个 actor 在自己的 `_work_units/<wave>/<work-id>/` 目录里
追加 `runtime-receipt.jsonl`、写 result/status。但 `withWorkUnitTransaction` 的
undeclared-mutation 比较把**整个** `_work_units/**` 的快照差异归因给当前事务，
于是 worker A 在自己的 receipt 上追加时，worker B 的 submit 事务看到
`_work_units/wave1/wu-w1-b000-deep-i0001/runtime-receipt.jsonl` 出现在
B 的 undeclared diff 里 → B 被错误标记 `suspect`，全局 inspect/ledger 校验被
阻塞，必须 recover-transaction 后重试。DEW-023 只把「surface 之外」（`_cache/`
等）排除，没考虑 surface **之内**的其他 work-unit 目录。

## What Changes

- `work-unit-transaction.mjs` 的 undeclared-mutation 归属收窄：比较面保持
  `_work_units/**` + 根 output-declaration ledger 快照不变，但**归属**排除
  其他 work-unit 的目录（`_work_units/<wave>/<work-id>/`，work-id ∉ 本事务
  `targetWorkIds`）——那些目录由并发 actor 生命周期拥有，其写入（含
  runtime-receipt 追加、result/status 写入）不是本事务 callback 的变更。
- 本事务**自身** target work-unit 目录与根 ledger 内未声明的写入仍
  fail-closed → `suspect`；recovery/rollback/proof 语义不变。
- DEW-023 契约文本同步（surface 定义 + 新场景「并发其他 work-unit 写入不标记
  suspect」+ fail-closed 场景措辞收窄到本事务自身归属面）。
- 确定性双 worker fixture：holder-child 模式在 B 事务打开窗口内追加 A 的
  receipt → B 正常 commit、非 suspect、A 的 receipt 原样保留；另加
  「本事务自身目录内未声明写入仍 suspect」回归。

不改变：全局锁/journal 完整性、`busy` 争用语义、真正 undeclared mutation 的
fail-closed 检测（本事务归属面内）、recover-transaction 证明边界、cache/scripts/
reference/artifacts 等 surface 外并发写入的既有排除。

## Capabilities

### New Capabilities

None。

### Modified Capabilities

- `agent/delegated-work-units`: MODIFIED DEW-023 —— undeclared-mutation 归属面
  收窄到本事务 target work-unit 目录 + 根 ledger；其他 work-unit 目录归并发
  actor，不归因、不标记 suspect。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` DEW-023（surface 定义与 fail-closed 场景）、`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`（`listBundleFiles`/`changedFiles`/undeclared 过滤）、`DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs`（mutationTargets 声明） | Modify | 事务归属契约在 DEW-023；本 change 收窄归属面并更新场景。 |
| `agent/work-unit-provenance-gate` | `openspec/specs/agent/work-unit-provenance-gate/spec.md` | Excluded | Gate 只消费 submitted 投影；不涉事务 diff。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 只用既有 unit/integration 分类。 |

## Semantic Precision Reflection

读者/有界问题：**B 的提交事务是否应为 A 在自己目录里的合法并发写入负责？**
答案是否定的 —— 归属必须以「该目录属于谁」为准，而不是「它在 `_work_units/**`
底下」。

必须保留的区别：

1. **本事务的 target work-unit 目录**（`_work_units/<wave>/<own-work-id>/`）：
   callback 未声明的写入 = 真实完整性事件 → fail-closed `suspect`。
2. **其他 work-unit 目录**（work-id ≠ 本事务 targets）：并发 actor 生命周期
   拥有；其 receipt 追加/result/status 写入不归因本事务。
3. **共享 authority 面**（`_work_units/_index.json`、根 output-declaration
   ledger、queue/index/cache 等声明面）：不变，未声明写入仍 fail-closed。
4. **surface 外路径**（`_cache/`、`_scripts/`、`reference/`、`artifacts/`）：
   既有排除不变（BUG-234）。

正常推理停止点：B 提交时，diff 里其他 work-unit 目录的变化被当作环境噪声忽略，
本事务归属面内的未声明写入仍终止并标 suspect；恢复路径不变。

## Authority And Control Boundary

- **direct Source of Record**：`_work_units/<wave>/<work-id>/` 目录归属（由
  `targetWorkIds` 声明）+ DEW-023 契约。目录归属是确定性事实，不引入新的
  语义判断。
- **最短合法闭环**：B 提交 → diff → 归属过滤（排除其他 work-unit 目录）→
  commit 或 fail-closed。无新 state、无新锁、无新 recovery。
- **net simplification**：把「并行执行的合法状态被误判为完整性事故」这一
  隐性摩擦消除；不新增控制层，只修正归属判定 + 一份确定性 fixture。
- **责任边界**：Engine 继续确定性判定归属与 fail-closed；Agent 无需新行为；
  User 无新 decision。本 change 不授予任何一方新 permission，不弱化本事务
  归属面内的完整性检测。

## Impact

- `DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`：undeclared 过滤新增
  其他-work-unit-目录归属谓词。
- `openspec/specs/agent/delegated-work-units/spec.md`（DEW-023）：surface 契约
  与场景更新（archive 时同步）。
- `tests/engine/work-unit-transaction.test.mjs`：holder 双 worker fixture +
  自身目录 fail-closed 回归。
- `tests/integration/cli/operate-work-unit.test.mjs`：真实 CLI 端到端（claim
  A+B、A 的 receipt 追加、B 真实 submit 成功、inspect 有效）。
