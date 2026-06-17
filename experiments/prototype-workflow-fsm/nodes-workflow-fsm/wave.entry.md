---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Wave Entry (simple FSM step, no dependencies)

First step in the FSM workflow. No dependencies. Validates that FSM initial state loads and executes correctly.

## Role in Experiment
验证 FSM 从 initial 状态启动，traceEntry('md:executed', { node: 'success') 推进到下一节点。

```js
state.executionOrder.push('wave.entry.md');
state.counters.wave = (state.counters.wave || 0) + 1;

traceEntry('md:executed', { node: 'wave.entry.md', status: 'success' });
transition('wave.entry.md', 'success');
```
