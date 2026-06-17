---
{
  "requires": ["chain-policy.dep.md"],
  "req": "WFS-003"
}
---

# Chain Context

Middle node in chain. Requires chain-policy.md.

```js
state.executionOrder.push('chain-context.dep.md');
state.counters.chainContext = (state.counters.chainContext || 0) + 1;
traceEntry('md:executed', { node: 'chain-context.dep.md' });
```
