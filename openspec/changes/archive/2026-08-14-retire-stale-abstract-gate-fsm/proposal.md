## Why

`DEEP_RESEARCH_HARNESS/schema/contracts/gate.mjs` 保留了一套八状态抽象
Gate FSM；它遗漏当前 HITL1、seed-topic、rerun 路径，且文件自身已声明当前路由实际由
`workflows/transitions.chain.json` 与 `resolveNodeTransitionDetailed()` 拥有。用户已批准
退役这五个无当前 caller 的内部 API，而不是继续以“兼容”为由保留错误的 current contract。

## What Changes

- **BREAKING（内部 API）**：删除 `schema/contracts/gate.mjs`、它在
  `schema/index.mjs` 的五个 re-export，以及只断言该 stale FSM 的两份 tests。不会提供
  adapter、alias、版本 fallback 或第二个 transition owner。
- 退役 `engine/schema-core` 的 `SCO-003` 与 `engine/transition-table` 的
  `TRT-011`：它们当前要求保留这个过时 FSM 和 export；同时从保留的 `TRT-012`
  requirement 移除对已删除 module 的 current wording。历史 requirement ID 保留为
  deprecated registry history，不能复用。
- 改正 `workflow/workflow-directory-contract`、Harness README、shared schema
  guidance 和 framework-runtime model：当前 Gate transition authority 是
  `transitions.chain.json` + `resolveNodeTransitionDetailed()`，不是已删除的 schema
  module。
- 保持 current chain/router、Gate-definition JSON、Gate CLI、bundle state 和 Agent
  Flow 不变；本 change 不改变任何 Gate verdict、phase transition 或 run-bundle format。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` 的 `SCO-003`；`schema/contracts/gate.mjs`；schema barrel 和 stale tests | Modify | `SCO-003` 仍把已删除模块描述为必须为 backward compatibility 保留的 contract。 |
| `engine/transition-table` | `openspec/specs/engine/transition-table/spec.md` 的 `TRT-011`/`TRT-012`；`engine/ask-next.mjs`；`tests/engine/ask-next.test.mjs` | Modify | `TRT-011` 仍要求保留五个 stale export，且 `TRT-012` 的 current wording 仍指向将被删除的 module；实际 current router 已独立拥有 chain 行为。 |
| `workflow/workflow-directory-contract` | `openspec/specs/workflow/workflow-directory-contract/spec.md` 的 current Gate transition wording；Gate CLI/helper imports | Modify | 它错误地把 stale module 写为 current transition contract，必须改回真实的 direct owner。 |
| `engine/gate-state-machine` | capability catalog 与 current chain/router evidence | Verify-only | 本 change 不改变 Gate lifecycle semantics、verdict 或 current routing behavior。 |
| `verification/verification-routing` | accepted routing contract 与现有 `tests/engine/ask-next.test.mjs`、`tests/integration/md/*` | Verify-only | 只选择现有 current-path proof，不修改 verification taxonomy。 |

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/schema-core`: 退役要求保留 stale abstract Gate FSM 的 `SCO-003`。
- `engine/transition-table`: 退役要求保留 stale module/export 的 `TRT-011`，并将 `TRT-012` 收敛为只描述 chain/router 的 current owner 边界。
- `workflow/workflow-directory-contract`: 将 current Gate transition contract 从被删除的 module 改正为既有 chain/router source of record。

## Impact

- 受影响实现：`DEEP_RESEARCH_HARNESS/schema/contracts/gate.mjs`、
  `DEEP_RESEARCH_HARNESS/schema/index.mjs`、两份 stale unit tests，以及列出的 guidance
  surfaces 和 requirement registry。
- 有界读者问题是：“当前 Harness 是否提供 abstract Gate FSM 或这五个 export？”完成后答案为否；
  需要 current transition behavior 的读者使用已存在的 chain/router contract，这就是正常推理停止点。
- 已知副作用是任何未知直接 internal import 会失败；当前 Harness runtime、动态 import、package
  distribution 和已识别 consumers 均未使用这些 export，因此这不是兼容目标。
- 用户决定退役该内部 API；Agent 执行受控删除和规格清理；Engine 不获得新 state、verdict 或
  workflow authority。
