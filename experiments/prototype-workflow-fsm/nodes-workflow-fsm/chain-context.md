---
{
  "requires": ["chain-policy.md"],
  "req": "WFS-003"
}
---

# Chain Context

Middle node in chain. Requires chain-policy.md.

```js
state.executionOrder.push('chain-context.md');
state.counters.chainContext = (state.counters.chainContext || 0) + 1;
```
