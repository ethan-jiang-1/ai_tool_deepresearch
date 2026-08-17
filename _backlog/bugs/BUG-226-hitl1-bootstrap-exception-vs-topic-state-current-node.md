# BUG-226: HITL1 topic-state apply 硬性要求 `current_node=phases/phase-hitl1.md`，但 instantiation/HITL1 phase 文档声称「不执行 enter-phase/advance-status handoff」——文档与 Engine 契约矛盾

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，HITL1）

## Why（完整上下文）

新 bundle 的 HITL1 流程要求 Agent 在用户确认话题后，通过
`operate-topic-state.mjs apply --context hitl1` 提交 approved topic registry。
该 apply 的授权检查（`engine/helpers/canonical-topic-state.mjs#lifecycleAuthorization`）
硬性要求：

```js
status.current_node === 'phases/phase-hitl1.md' &&
status.current_gate === 'hitl1_recorded' &&
status.next_gate === 'setup_ready'
```

但两份 phase 文档（`phase-instantiation.md` §6 与 `phase-hitl1.md` §6，均标注
「兼容例外 WNC-010」）明确写：

> 「instantiation/HITL1 为 bootstrap status shape 例外，本 phase 不执行
> enter-phase/advance-status handoff；自 setup 起的后续 phase 按其 §6 常规
> handoff 执行。」

而 `rb_status.json` 的 `current_node` 在 instantiation 后为 `null`，且
`enter-phase.mjs` 是唯一被授权的 `current_node` 写入者。结果形成死锁：
按文档走（跳过 enter-phase）→ `current_node` 恒为 null → topic-state apply 永远
`blocked: hitl1_not_authorized`；要解锁只能违背文档，自行推断「这里其实要先跑
`enter-phase --node phases/phase-hitl1.md`」。

## 复现

1. 新 bundle：`node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>`
2. 按文档跑 instantiation gate pass（`current_node` 保持 `null`）
3. 完成 HITL1 用户决定（写 profile、`advance-status --to hitl1_recorded`）后，
   构造 hitl1 topic-state input 并运行：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle> --input <input.json>
   ```
4. 返回：
   ```json
   { "verdict": "blocked", "reason_code": "hitl1_not_authorized",
     "reason": "HITL1 apply requires current_node phase-hitl1 and hitl1_recorded→setup_ready window" }
   ```
5. 唯一合法解锁路径（不在任何文档里）：先
   `enter-phase --bundle <bundle> --node phases/phase-hitl1.md`，再重跑 apply。

## 影响（本 run 实账）

- HITL1 阶段卡住一次；Agent 需要读 `canonical-topic-state.mjs` 源码、再结合
  `enter-phase.mjs` 的授权逻辑才推断出正确顺序。耗时约 10 分钟。
- 对不熟悉该引擎的 Agent（或按文档严格执行的 Agent）这是**不可通过的障碍**：
  文档说不要跑 enter-phase，Engine 说必须跑，中间没有任何提示指向正确路径。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 文档（phase 节点）与 Engine 确定性契约（lifecycleAuthorization）直接矛盾；
  两者都是当前 head 的权威表面，Agent 无法同时满足。
- 「bootstrap 例外」本意应只放宽 advance-status 的 trace 校验（
  `advance-status.mjs` 的 bootstrap-compatible 分支确实如此），却被 phase 文档
  泛化成「连 enter-phase 都不执行」——而 enter-phase 是 current_node 的唯一写入者，
  取消它必然破坏所有依赖 current_node 的 Engine 授权。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-instantiation.md` 与
  `phase-hitl1.md` 的 §6 措辞（或 `canonical-topic-state.mjs` 的授权窗口）。
- 最小修复方向（二选一）：
  1. 文档修正：把例外措辞收敛为「不执行 *advance-status* source-gate 同步（
     bootstrap 兼容），但 `enter-phase` 仍是加载 target phase 并写入
     `current_node` 的合法 loader」；在 instantiation gate pass 后明确要求
     `enter-phase --node phases/phase-hitl1.md`。
  2. 或 Engine 修正：`lifecycleAuthorization` 对 `hitl1` context 放宽
     `current_node` 要求（当 trace 证明处于 bootstrap 窗口时），与文档现有
     例外保持一致——但文档仍应写明实际顺序。
- 回归测试建议：构造 fresh bundle 的完整 HITL1 路径（instantiation gate →
  topic-state apply），断言按文档步骤执行时不再 blocked。
