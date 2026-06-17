---
{
  "requires": ["chain-policy.dep.md"],
  "req": "WMD-001"
}
---

# Chain Context

Middle node in the chain. Requires chain-policy.md.

## Role in Experiment
验证传递依赖：context 依赖 policy，所以 policy 最先执行。

```js
state.executionOrder.push('chain-context.dep.md');
state.counters.chainContext = (state.counters.chainContext || 0) + 1;
traceEntry('md:executed', { node: 'chain-context.dep.md' });
```
