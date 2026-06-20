## Context

当前 workflow transition 层同时存在两套心智模型：`gate + askNext(path, gate, state)` 和 node-based lifecycle。这个分裂把路由知识继续压回 MD controller，也让 chain、FSM、gate CLI、node metadata、loader 在同一件事上说不同语言。

本 change 影响面横跨：

- `transition-table`
- `gate-state-machine`
- `gate-skeleton`
- `workflow-node-contract`
- `dynamic-node-loading`
- `workflow-fsm-definition`
- `workflow-fsm-transition`
- `workflow-fsm-runtime`

核心目标是把公共路由契约收口到 `currentNodeRef + outcome -> nextNodeRef`，并把结果语义拆成明确分类，而不是继续用 `null` 承载所有失败。

## Goals / Non-Goals

**Goals:**

- 让 node fileRef 成为路由输入的 canonical identity
- 让 chain 和 FSM 共享同一公共 outcome 词汇：`passed` / `failed`
- 让 transition lookup 返回可诊断的结果分类，而不是只有 `string | null`
- 让 gate CLI 以 `--current-node` 驱动，并在路由前验证 node/gate binding
- 让 loader 保留完整 frontmatter metadata，并返回可直接消费的结构化对象
- 让 manifest、frontmatter、gate definition、transition table、loader runtime cache / dependency plan 能做一致性校验

**Non-Goals:**

- 不新增依赖
- 不改变 Markdown 作为 Agent Flow 控制面的定位
- 不引入兼容层来保留旧的 `askNext(path, gate, state)` 公共 contract
- 不改动研究内容语义，只改路由和 checkpoint 契约

## Decisions

1. **Canonical routing key is `currentNodeRef`**

   选择 node fileRef 而不是 gate key、phase key 或 frontmatter `id` 作为路由主键。原因是 loader 和 MD controller 天然知道当前 node ref，路由不需要额外映射，且 `assessNode(nextNodeRef, ...)` 可以直接消费结果。

   Alternatives considered: gate key、manifest index、frontmatter `id`。这些方案都需要多一跳映射，且会把 checker 绑定和 routing identity 混在一起。

2. **Public outcome vocabulary is `passed` / `failed`**

   gate checkpoint 语义天然是过/不过，因此公共 outcome 应统一为 `passed` / `failed`。更细的路由诊断由详细 router result 承担。

   Alternatives considered: `success` / `failure`、boolean、`string | null`。这些方案要么太含糊，要么无法区分 terminal / no_transition / invalid_input / config_error。

3. **Detailed router results are explicit**

   router result 需要区分 `next`、`terminal`、`no_transition`、`invalid_input`、`config_error`。这能把“真的终止了”和“调用方传错了”分开，避免 `null` 把所有失败吞掉。

   Alternatives considered: 只返回 next node、只返回 `null`、返回单一 error string。它们都会削弱可诊断性。

4. **`askNext(path, gate, state)` is removed, not wrapped**

   这次 change 没有外部兼容义务，保留 wrapper 只会把旧心智模型继续存活。正确做法是直接切换到 node-keyed router contract。

   Alternatives considered: compatibility shim、双入口并行。两者都会延长迁移期并增加维护分叉。

5. **Gate CLI validates binding before asking the router**

   CLI 先用 `--current-node` 校验 node/gate binding，再做 deterministic check，再向 router 要 next。这样 `check.next` 才能可靠地回给 MD controller。binding / 参数 / router contract 问题必须保留成错误态，不伪装成普通 gate fail。

   Alternatives considered: 从 gate key 反推 current node、直接按 manifest 顺序跳转。前者会继续混淆职责，后者会把路由权威错放到 manifest。

6. **Loader preserves full metadata in runtime cache**

   loader 不再只回传窄化后的内容，而是保留完整 frontmatter，并把 `{ fileRef, md, frontmatter }` 缓存在 runtime 中。这样 consistency validation 和后续诊断都能使用同一份 Source of Truth，而 `assessNode()` 只负责返回执行 plan 和 runtime result。

   Alternatives considered: 只回 Markdown body、只回筛选后的 frontmatter 字段。它们都会丢失诊断所需信息。

7. **Consistency validation is explicit and reusable**

   manifest、frontmatter、gate definition、transition table、loader runtime cache / dependency plan 的一致性检查应当成为显式 validator，而不是散落在多个 CLI 里做 ad hoc 校验。

   Alternatives considered: 各 CLI 各自验证、依赖人工 review。它们都不能稳定地抓住跨文件漂移。

8. **Gate CLI should preserve route diagnostics, not collapse them**

   Gate CLI 的 JSON 输出需要保留 `routing.kind` 之类的详细诊断字段，让 `check.next` 只作为便捷镜像，而不是把 terminal / no_transition / invalid_input / config_error 全部压成一个 `next` 字段。

   Alternatives considered: 仅输出 `check.next`、仅输出 `passed`。这些方案都会让路由语义在消费层再次丢失。

9. **FSM layers should be split by responsibility**

   `workflow-fsm-definition` 只负责 definition schema 与文件加载，`workflow-fsm-transition` 只负责纯查表与 tracker 语义，`workflow-fsm-runtime` 只负责 Machine 工厂与运行时推进。避免三层都重复定义 loader 和 schema 语义。

   Alternatives considered: 让 transition 层重复承担 definition validation。那会继续扩大 capability 边界重叠。

10. **Consistency validation should be a reusable library with a thin CLI wrapper**

   workflow package consistency validation should be implemented once as a library entrypoint and reused by a thin CLI wrapper. That keeps the validator available to tests, governance checks, and future tooling without duplicating matching logic.

   Alternatives considered: CLI-only validation or ad hoc per-command checks. Both make reuse and testability worse.

11. **Router context is explicit and caller-owned**

   `context` is a plain caller-supplied object, not a hidden authority surface. It may carry normalized workflow node directory, manifest/binding data, and validator hints needed by the detailed router. The router reads only documented inputs and does not infer routing from process globals or Markdown prose.

12. **Exit codes distinguish gate failure from contract failure**

   `check.passed` describes deterministic gate evaluation, not CLI validity. A valid route with `passed=true` exits 0, a valid route with `passed=false` exits 1, terminal routing does not introduce a distinct exit code, and only `no_transition` / `invalid_input` / `config_error` exit 2 because the package or call site is not in a routable state.

13. **Chain backend is stateless**

   The chain backend is pure lookup only. It does not own `createChain(pathOrDef, trace?)` as a public tracker contract, and it does not keep progression state. If a caller needs progression, that state belongs in a higher-level runtime layer, not in transition-table lookup.

   Alternatives considered: preserve `createChain` as a stateful tracker. That keeps a second authority for progression and blurs the boundary between lookup and runtime.

## Risks / Trade-offs

- [Breakage] 旧的 askNext 调用者会全部失效 -> [Mitigation] 这次只改 spec/实现/测试，不保留兼容入口
- [Drift exposure] 更严格的一致性检查会暴露现有 metadata 漂移 -> [Mitigation] 用 validator 先报错，再逐步修复数据
- [Path normalization] node fileRef 统一后可能出现相对路径规范化问题 -> [Mitigation] 统一在 loader/router 边界 canonicalize
- [More verbose feedback] detailed results 会让 CLI 输出变长 -> [Mitigation] 让 detailed router 保持纯函数，CLI 只把结果映射成 check/inspect/advice
- [Surface area] 在 CLI JSON 里保留 route diagnostics 会让响应更大 -> [Mitigation] 通过稳定 `routing.kind` + `check.next` 约束输出，而不是丢失语义
- [Layer drift] FSM 三层如果继续重复定义 schema / loader 语义，会让实现很快漂移 -> [Mitigation] 把 definition / transition / runtime 职责分开写进 spec
- [Context drift] `context` 如果被做成 catch-all，会重新引入隐式 authority -> [Mitigation] 把 `context` 限定为显式、可校验的 caller-owned 输入

## Migration Plan

1. 先落地 spec 和 requirement registry 的更新，固定 router context / exit semantics
2. 再改 transition router、chain/FSM backend 和 gate CLI
3. 然后改 loader、manifest/frontmatter 验证和 workflow consistency validator
4. 最后更新 tests、playbooks、docs 中的 gate-key routing、`success`、`askNext()` 旧叙述

Rollback 只在本 change 范围内做代码/规格回退，不引入长期兼容层。

## Open Questions

None.
