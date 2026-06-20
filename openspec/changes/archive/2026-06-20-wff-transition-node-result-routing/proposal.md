## Why

当前 transition 层仍然同时存在两套心智模型：一套是 legacy gate-key + `askNext(path, gate, state)`，另一套是 node-based lifecycle。这个分裂把路由知识继续压回 MD Controller，也让 chain、FSM、gate CLI、node metadata 和 loader 在同一件事上说不同语言。

`_backlog/trainsistion/review_and_suggestion.md` 已经把问题说得很清楚：这不是单点 bug，而是 transition abstraction 的契约没有定稳。现在需要把公共输入和结果语义一次收口到 `currentNodeRef + outcome -> nextNodeRef`，避免后续 WFF 内容 change 继续建立在摇摆的路由模型上。

## What Changes

- **BREAKING** transition query 的公共输入从 `gate + state` 收敛为 `currentNodeRef + outcome`
- **BREAKING** `askNext(path, gate, state)` 不再是 accepted transition-table contract，改为详细 transition result contract
- chain 和 FSM 统一为 node-keyed backend，并共享 `passed` / `failed` 的公共 outcome vocabulary
- transition result 细分为 `next`、`terminal`、`no_transition`、`invalid_input`、`config_error`
- gate CLI 保留详细 route 诊断结果，`check.next` 只是便捷镜像，不再把所有路由状态压扁成 `string | null`
- gate CLI 直接接收 `--current-node`，先校验 node/gate binding，再回填 `check.next`，并把 routing contract / config failures 明确区分为错误态
- chain backend 退回纯查表 contract，`createChain(pathOrDef, trace?)` 这类 stateful tracker 接口不再是 accepted transition-table contract
- node fileRef 成为 canonical routing identity；frontmatter `id` 只保留为诊断标签，`gate` 保留为 checker binding
- loader 保留完整 metadata，并把解析结果缓存起来供 Agent/Engine 和一致性校验消费
- FSM definition / transition / runtime 的状态语义与 transition-table 对齐
- 增加 workflow package consistency validation，覆盖 manifest、frontmatter、gate definitions、transition tables 和 loader runtime cache / dependency plan
- 清理或改写现有 tests 和文档中 gate-key routing、`success` / `passed` 混用、以及旧 `askNext()` 路径

## Capabilities

### Modified Capabilities
- `transition-table`: public query 变成 `currentNodeRef + outcome -> nextNodeRef`，chain/FSM 作为同一抽象的 backend，并引入更细的结果分类
- `gate-state-machine`: Gate 继续只做 deterministic checkpoint，但 next-node feedback 必须来自新的 node-result transition contract
- `gate-skeleton`: Gate CLI 改为以 `--current-node` 驱动，验证 node/gate 一致性，并保留详细 route 诊断、`check.next` 和稳定 JSON 输出
- `workflow-node-contract`: phase/shared node 的 canonical identity、frontmatter 约束、manifest 语义和一致性检查收口到 node-fileRef 模型
- `dynamic-node-loading`: loader 继续按显式 fileRef 读取，但必须保留 full metadata 并支持一致性验证需要的返回形状
- `workflow-fsm-definition`: FSM definition 的状态域与终态语义对齐新的 node-result 模型
- `workflow-fsm-transition`: pure transition lookup / tracker contract 对齐新的 outcome 词汇与结果分类
- `workflow-fsm-runtime`: runtime tracker 的 advance / halt / complete 语义对齐新的 transition result contract
- `framework-engine`: workflow-fsm.mjs 的 runtime wrapper 边界与 transition-fsm.mjs 的纯查表职责对齐，避免主规格继续把 FSM runtime 描述成 standalone pure resolver

## Impact

- `DPT_FRAMEWORK/engine/ask-next.mjs`, `transition-chain.mjs`, `transition-fsm.mjs`, `workflow-chain.mjs`, `workflow-fsm.mjs`
- `DPT_FRAMEWORK/cli/gates/` 下的 gate CLI wrappers
- `DPT_FRAMEWORK/workflows/manifest.json`、phase/shared node frontmatter、transition tables
- `tests/engine/*transition*`、`tests/engine/ask-next.test.mjs`、相关 gate / workflow regression tests
- OpenSpec main specs / delta specs，以及后续需要同步的 playbooks / docs
