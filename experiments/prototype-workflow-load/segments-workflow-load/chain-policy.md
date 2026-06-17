---
{
  "requires": [],
  "req": "WMD-001"
}
---

# Chain Policy

Leaf node in the chain dependency. No dependencies of its own.

## Role in Experiment
验证 chain 中最深依赖最先执行。

```js
state.executionOrder.push('chain-policy.md');
state.counters.chainPolicy = (state.counters.chainPolicy || 0) + 1;
```
