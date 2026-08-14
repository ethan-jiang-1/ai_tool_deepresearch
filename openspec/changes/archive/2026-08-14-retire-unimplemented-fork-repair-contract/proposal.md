## Why

已接受的 `workflow/fork-repair-converge` 规范以 `FOR-001` 承诺
`convergeRepair()`、`sharedRepairStep`、多失败分支汇聚和停滞保护，但当前
Harness、测试和注册 playbook 没有这些 API 的实现或调用。用户已选择退役这项未实现
承诺，而不是把它保留成未来愿望或在清噪计划中扩张为新产品功能。

## What Changes

- **BREAKING（内部接受合同）**：删除
  `workflow/fork-repair-converge` 的 live main spec；将 registry prefix 从
  `FOR: workflow/fork-repair-converge` 改为
  `FOR: fork-repair-converge # all entries deprecated; no spec directory`，并保留
  `FOR-001`、在其描述末尾追加 `[DEPRECATED]`。这样当前 main specs 不再承诺不存在的
  fork-repair API，同时 requirement identity 不会被复用。
- 保留 `workflow/repair-loop`、`engine/gate-fork-router` 和
  `workflow/conditional-nodes` 的既有接受合同；本 change 只从它们的 catalog rows
  移除 `capability:workflow/fork-repair-converge` 关联，不实现、替换或重命名
  `convergeRepair()` / `sharedRepairStep`，也不改变现有 Gate、repair 或 rerun 行为。
- 不增加 migration、compatibility adapter、版本路由、恢复路径或新的 Engine state。
  历史 requirement identity 仅通过受控 registry retirement 保持可追溯。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `workflow/fork-repair-converge` | accepted `spec.md`, `FOR-001` registry entry, capability catalog row | Modify | 它是唯一把未实现 API 当作当前行为承诺的 capability；需要受控退役其 requirement。 |
| `workflow/repair-loop` | accepted `spec.md` | Verify-only | 它是当前被接受的 deterministic loopback/termination 合同；本 change 必须保持其 requirement 不变。 |
| `engine/gate-fork-router` | accepted `spec.md` | Verify-only | 它仍是当前 branch classification owner；不依赖被退役 API。 |
| `workflow/conditional-nodes` | accepted `spec.md` | Verify-only | 它保留当前 branch transform contract，不提供或替代 fork-repair convergence。 |
| `governance/requirement-traceability` | requirement registry and retirement governance route | Excluded | 使用其既有治理路径退役 `FOR-001`，不改变其 accepted behavior。 |

### New Capabilities

无。

### Modified Capabilities

- `workflow/fork-repair-converge`：退役未实现的 shared fork-repair convergence
  contract 与 `FOR-001`，并明确它不再是当前 capability。

## Impact

- 受影响的接受合同与导航：
  `openspec/specs/workflow/fork-repair-converge/spec.md`、
  `openspec/specs/README.md`、
  `openspec/governance/req-registry.yaml`。
- catalog 清理精确限于 retired capability 自身的 row，以及
  `engine/gate-fork-router`、`workflow/conditional-nodes`、`workflow/repair-loop`
  三个 row 中指向它的 Related entries link；这三份受保护 main spec 的 requirement
  text 不变。
- 没有当前运行时 API、run bundle 格式、Agent 任务、依赖或 Harness 源码会改变；对旧的
  直接内部 import 的不支持是有意边界，因为该 API 从未存在。
- 有界读者问题是：“当前系统是否承诺提供 shared fork-repair convergence API？”
  退役后答案明确为否；保留的 repair-loop 与 Gate-router 接受合同是正常推理停止点。
- 用户已经决定退役项目承诺；Agent 负责受控 spec/catalog/registry 清理和验证，Engine
  不新增 verdict、状态或 repair authority。
