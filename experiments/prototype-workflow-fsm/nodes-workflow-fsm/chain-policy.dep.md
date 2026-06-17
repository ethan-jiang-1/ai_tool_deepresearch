---
{
  "requires": [],
  "req": "WFS-003"
}
---

# Chain Policy

Leaf node in dependency chain. No dependencies of its own.

```js
state.executionOrder.push('chain-policy.dep.md');
state.counters.chainPolicy = (state.counters.chainPolicy || 0) + 1;
traceEntry('md:executed', { node: 'chain-policy.dep.md' });
```
